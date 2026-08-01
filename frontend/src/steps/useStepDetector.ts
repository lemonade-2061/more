import { useCallback, useEffect, useRef, useState } from "react";
import { postSteps, postStepsBeacon, type StepEvent } from "../api/steps";

export type Sample = { t: number; signal: number };

const FLUSH_INTERVAL_MS = 5000;
const SAMPLE_BUFFER_SIZE = 300; // 60Hz で約5秒ぶんの波形を保持 (デバッグ表示用)
const MAX_LOG_SAMPLES = 200_000; // 60Hz で約55分。閾値チューニング用の生ログ上限
const WARMUP_MS = 3000; // 開始直後はポケットに入れる衝撃を拾うのでカウントしない
// リズム判定: ポケットからの取り出し等の単発の衝撃を弾くため、
// 妥当な間隔のピークが連続したときだけ「歩行中」とみなしてカウントする
const RHYTHM_MAX_MS = 1500; // これより間隔が空いたらリズムが途切れたとみなす
const RHYTHM_START_COUNT = 3; // この回数ピークが連続したら歩行開始 (保留分もさかのぼって計上)

export type LogSample = { t: number; signal: number; step: 0 | 1 };

// 加速度センサーから歩行を検出するフック。
// 仕組み: |加速度| からローパスフィルタで重力成分を除いた信号が
// threshold を上向きに横切ったら1歩。refractoryMs 以内の再検出は無視する
// (人間の歩行は最速でも ~3歩/秒なので、それより速いスパイクはノイズ)。
// 検出した歩イベントは溜めておき、5秒ごとに POST /api/steps でまとめ送信する。
export function useStepDetector(userId: string) {
  const [detecting, setDetecting] = useState(false);
  const [stepCount, setStepCount] = useState(0);
  const [sentCount, setSentCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(1.5); // m/s²
  // 実測で着地後400〜580msに揺り戻しの二次ピークが出て二重カウントしたため、
  // それを跨ぐ600msをデフォルトにする (歩行周期の実測は700〜1000msなので両立する)
  const [refractoryMs, setRefractoryMs] = useState(600);
  const [inWarmup, setInWarmup] = useState(false);

  const gravityRef = useRef(9.8);
  const prevSignalRef = useRef(0);
  const lastStepAtRef = useRef(0);
  const pendingRef = useRef<StepEvent[]>([]);
  const samplesRef = useRef<Sample[]>([]);
  const logRef = useRef<LogSample[]>([]); // 計測中の全サンプル (CSV ダウンロード用)
  const warmupUntilRef = useRef(0);
  const [inRhythm, setInRhythm] = useState(false);
  const inRhythmRef = useRef(false);
  const candidatesRef = useRef<StepEvent[]>([]); // 歩行開始と確定する前の保留ピーク

  // devicemotion ハンドラはリスナー登録し直し無しで最新値を読みたいので ref 経由にする
  const thresholdRef = useRef(threshold);
  thresholdRef.current = threshold;
  const refractoryRef = useRef(refractoryMs);
  refractoryRef.current = refractoryMs;

  const handleMotion = useCallback((e: DeviceMotionEvent) => {
    const a = e.accelerationIncludingGravity;
    if (!a || a.x == null || a.y == null || a.z == null) return;
    const now = Date.now();

    // 端末の向きに依存しないようベクトルの大きさを使う
    const mag = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
    // ローパスフィルタで重力(+ゆっくりした姿勢変化)を推定し、差分を歩行由来の信号とする
    gravityRef.current = gravityRef.current * 0.9 + mag * 0.1;
    const signal = mag - gravityRef.current;

    const samples = samplesRef.current;
    samples.push({ t: now, signal });
    if (samples.length > SAMPLE_BUFFER_SIZE) samples.shift();

    const crossedUp =
      prevSignalRef.current < thresholdRef.current && signal >= thresholdRef.current;
    const peaked =
      crossedUp &&
      now >= warmupUntilRef.current &&
      now - lastStepAtRef.current > refractoryRef.current;
    if (peaked) {
      const sincePrev = now - lastStepAtRef.current;
      lastStepAtRef.current = now;
      const commit = (e: StepEvent) => {
        pendingRef.current.push(e);
        setStepCount((c) => c + 1);
      };
      if (inRhythmRef.current) {
        if (sincePrev <= RHYTHM_MAX_MS) {
          commit({ stepped_at_ms: now, magnitude: signal });
        } else {
          // リズムが途切れた後の単発ピーク (取り出しの衝撃など) は保留に回す
          inRhythmRef.current = false;
          setInRhythm(false);
          candidatesRef.current = [{ stepped_at_ms: now, magnitude: signal }];
        }
      } else {
        const buf = candidatesRef.current;
        if (buf.length > 0 && sincePrev <= RHYTHM_MAX_MS) {
          buf.push({ stepped_at_ms: now, magnitude: signal });
          if (buf.length >= RHYTHM_START_COUNT) {
            // リズムが確立したので歩行開始。保留分もさかのぼって計上する
            inRhythmRef.current = true;
            setInRhythm(true);
            buf.forEach(commit);
            candidatesRef.current = [];
          }
        } else {
          candidatesRef.current = [{ stepped_at_ms: now, magnitude: signal }];
        }
      }
    }
    prevSignalRef.current = signal;

    // step=1 はリズム判定前の「ピーク検出」。画面のカウントとはずれることがある
    if (logRef.current.length < MAX_LOG_SAMPLES) {
      logRef.current.push({ t: now, signal, step: peaked ? 1 : 0 });
    }
  }, []);

  const flush = useCallback(async () => {
    const events = pendingRef.current;
    if (events.length === 0) return;
    pendingRef.current = [];
    try {
      const inserted = await postSteps(userId, events);
      setSentCount((c) => c + inserted);
      setError(null);
    } catch (err) {
      // 送信失敗ぶんは戻して次回のフラッシュで再送する
      pendingRef.current = events.concat(pendingRef.current);
      setError(String(err));
    }
  }, [userId]);

  const start = useCallback(async () => {
    // iOS Safari は明示的な許可が必要 (Android には requestPermission が存在しない)
    const dme = DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<string>;
    };
    if (typeof dme.requestPermission === "function") {
      const result = await dme.requestPermission();
      if (result !== "granted") {
        setError("モーションセンサーの利用が許可されませんでした");
        return;
      }
    }
    window.addEventListener("devicemotion", handleMotion);
    warmupUntilRef.current = Date.now() + WARMUP_MS;
    setInWarmup(true);
    setTimeout(() => setInWarmup(false), WARMUP_MS);
    setDetecting(true);
    setError(null);
  }, [handleMotion]);

  const stop = useCallback(() => {
    window.removeEventListener("devicemotion", handleMotion);
    setDetecting(false);
    void flush();
  }, [handleMotion, flush]);

  // 検出中は定期フラッシュ + 画面が裏に回ったら beacon で取りこぼし防止
  useEffect(() => {
    if (!detecting) return;
    const intervalId = setInterval(() => void flush(), FLUSH_INTERVAL_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden" && pendingRef.current.length > 0) {
        if (postStepsBeacon(userId, pendingRef.current)) {
          pendingRef.current = [];
        }
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [detecting, flush, userId]);

  // アンマウント時のリスナー掃除
  useEffect(() => {
    return () => window.removeEventListener("devicemotion", handleMotion);
  }, [handleMotion]);

  return {
    detecting,
    inWarmup,
    inRhythm,
    stepCount,
    sentCount,
    error,
    threshold,
    setThreshold,
    refractoryMs,
    setRefractoryMs,
    start,
    stop,
    flush,
    // 画面のカウンタと未送信バッファを0に戻す (サーバー側は消さない)
    reset: useCallback(() => {
      pendingRef.current = [];
      candidatesRef.current = [];
      lastStepAtRef.current = 0;
      inRhythmRef.current = false;
      setInRhythm(false);
      setStepCount(0);
      setSentCount(0);
    }, []),
    samplesRef, // デバッグ波形の描画用 (rAF ループから直接読む)
    logRef, // 生ログ (CSV ダウンロード用)
    clearLog: useCallback(() => {
      logRef.current = [];
    }, []),
  };
}
