import { useCallback, useEffect, useRef, useState } from "react";
import { postSteps, postStepsBeacon, type StepEvent } from "../api/steps";

export type Sample = { t: number; signal: number };

const FLUSH_INTERVAL_MS = 5000;
const SAMPLE_BUFFER_SIZE = 300; // 60Hz で約5秒ぶんの波形を保持 (デバッグ表示用)

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
  const [refractoryMs, setRefractoryMs] = useState(300);

  const gravityRef = useRef(9.8);
  const prevSignalRef = useRef(0);
  const lastStepAtRef = useRef(0);
  const pendingRef = useRef<StepEvent[]>([]);
  const samplesRef = useRef<Sample[]>([]);

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
    if (crossedUp && now - lastStepAtRef.current > refractoryRef.current) {
      lastStepAtRef.current = now;
      pendingRef.current.push({ stepped_at_ms: now, magnitude: signal });
      setStepCount((c) => c + 1);
    }
    prevSignalRef.current = signal;
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
    samplesRef, // デバッグ波形の描画用 (rAF ループから直接読む)
  };
}
