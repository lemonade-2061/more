import { useEffect, useRef, useState } from "react";
import { deleteSteps, fetchStepSummary, type StepSummary } from "../api/steps";
import { useStepDetector, type Sample } from "../steps/useStepDetector";

function getUserId(): string {
  let id = localStorage.getItem("step-user-id");
  if (!id) {
    id = "user-" + Math.random().toString(36).slice(2, 8);
    localStorage.setItem("step-user-id", id);
  }
  return id;
}

const SIGNAL_RANGE = 5; // 波形の縦軸 ±5 m/s²

function drawWave(
  canvas: HTMLCanvasElement,
  samples: Sample[],
  threshold: number,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { width, height } = canvas;
  const yOf = (signal: number) =>
    height / 2 - (signal / SIGNAL_RANGE) * (height / 2);

  ctx.clearRect(0, 0, width, height);

  // ゼロ線と閾値線
  ctx.strokeStyle = "#ccc";
  ctx.beginPath();
  ctx.moveTo(0, yOf(0));
  ctx.lineTo(width, yOf(0));
  ctx.stroke();
  ctx.strokeStyle = "tomato";
  ctx.beginPath();
  ctx.moveTo(0, yOf(threshold));
  ctx.lineTo(width, yOf(threshold));
  ctx.stroke();

  // 信号
  ctx.strokeStyle = "royalblue";
  ctx.beginPath();
  samples.forEach((s, i) => {
    const x = (i / (samples.length - 1 || 1)) * width;
    const y = yOf(s.signal);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

export default function StepDebug() {
  const [userId] = useState(getUserId);
  const detector = useStepDetector(userId);
  const [summary, setSummary] = useState<StepSummary | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 波形はセンサーが 60Hz で来るので state を経由せず rAF で直接描く
  useEffect(() => {
    let rafId = 0;
    const loop = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        drawWave(canvas, detector.samplesRef.current, detector.threshold);
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [detector.samplesRef, detector.threshold]);

  // 生ログの件数表示用 (60Hz の全サンプルを state に入れると重いので1秒ごとに数だけ拾う)
  const [logCount, setLogCount] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setLogCount(detector.logRef.current.length), 1000);
    return () => clearInterval(id);
  }, [detector.logRef]);

  const downloadLog = () => {
    const rows = detector.logRef.current;
    const csv =
      "t_ms,time,signal,step\n" +
      rows
        .map((r) => `${r.t},${new Date(r.t).toISOString()},${r.signal.toFixed(4)},${r.step}`)
        .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `steps-${userId}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadSummary = async () => {
    try {
      setSummary(await fetchStepSummary(userId));
      setSummaryError(null);
    } catch (err) {
      setSummaryError(String(err));
    }
  };

  return (
    <div style={{ padding: 16, fontFamily: "sans-serif", maxWidth: 480 }}>
      <h2>歩数検出デバッグ</h2>
      <p style={{ color: "#888" }}>user_id: {userId}</p>

      <div style={{ fontSize: 64, fontWeight: "bold" }}>
        {detector.stepCount}
        <span style={{ fontSize: 20, marginLeft: 8 }}>歩</span>
      </div>
      <p style={{ color: "#888" }}>
        サーバー送信済み: {detector.sentCount} 歩
        {detector.detecting && (
          <span style={{ marginLeft: 12, color: detector.inRhythm ? "green" : "#888" }}>
            {detector.inRhythm ? "歩行中" : "リズム待ち"}
          </span>
        )}
      </p>

      {detector.inWarmup && (
        <p style={{ color: "darkorange", fontWeight: "bold" }}>
          準備中… 3秒以内にポケットへ (この間はカウントしません)
        </p>
      )}
      {detector.detecting ? (
        <button onClick={detector.stop} style={{ padding: "12px 32px", fontSize: 18 }}>
          停止
        </button>
      ) : (
        <button
          onClick={() => void detector.start()}
          style={{ padding: "12px 32px", fontSize: 18 }}
        >
          計測開始
        </button>
      )}

      {" "}
      <button
        onClick={() => detector.reset()}
        style={{ padding: "12px 24px", fontSize: 18 }}
      >
        カウントを0に
      </button>{" "}
      <button
        onClick={() => {
          if (!window.confirm("サーバーに保存した歩数記録も全部消します。いい?")) return;
          detector.reset();
          deleteSteps(userId)
            .then(() => setSummary(null))
            .catch((err) => setSummaryError(String(err)));
        }}
      >
        サーバー記録ごと全消し
      </button>

      {detector.error && <p style={{ color: "red" }}>{detector.error}</p>}

      <h3>波形 (青: 信号 / 赤: 閾値)</h3>
      <canvas
        ref={canvasRef}
        width={440}
        height={160}
        style={{ border: "1px solid #ddd", width: "100%" }}
      />

      {/* 誤タップでパラメータが動くと検証がやり直しになるので、普段は畳んでおく */}
      <details>
        <summary>
          詳細設定 (閾値 {detector.threshold.toFixed(1)} m/s² / 不応期{" "}
          {detector.refractoryMs} ms)
        </summary>
        <label>
          閾値: {detector.threshold.toFixed(1)} m/s²
          <input
            type="range"
            min={0.5}
            max={4}
            step={0.1}
            value={detector.threshold}
            onChange={(e) => detector.setThreshold(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </label>
        <label>
          不応期: {detector.refractoryMs} ms
          <input
            type="range"
            min={150}
            max={900}
            step={50}
            value={detector.refractoryMs}
            onChange={(e) => detector.setRefractoryMs(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </label>
      </details>

      <h3>生ログ (閾値決め用)</h3>
      <p style={{ color: "#888" }}>{logCount} サンプル記録済み</p>
      <button onClick={downloadLog} disabled={logCount === 0}>
        CSVダウンロード
      </button>{" "}
      <button
        onClick={() => {
          detector.clearLog();
          setLogCount(0);
        }}
      >
        ログをクリア
      </button>

      <h3>サーバー集計 (直近24時間)</h3>
      <button onClick={() => void loadSummary()}>集計を取得</button>
      {summaryError && <p style={{ color: "red" }}>{summaryError}</p>}
      {summary && (
        <div>
          <p>合計: {summary.total} 歩</p>
          <ul>
            {summary.per_minute.map((m) => (
              <li key={m.minute}>
                {new Date(m.minute).toLocaleTimeString()} — {m.steps} 歩
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
