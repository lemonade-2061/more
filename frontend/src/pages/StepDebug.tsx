import { useEffect, useRef, useState } from "react";
import { fetchStepSummary, type StepSummary } from "../api/steps";
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
      <p style={{ color: "#888" }}>サーバー送信済み: {detector.sentCount} 歩</p>

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

      {detector.error && <p style={{ color: "red" }}>{detector.error}</p>}

      <h3>波形 (青: 信号 / 赤: 閾値)</h3>
      <canvas
        ref={canvasRef}
        width={440}
        height={160}
        style={{ border: "1px solid #ddd", width: "100%" }}
      />

      <div>
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
            max={600}
            step={50}
            value={detector.refractoryMs}
            onChange={(e) => detector.setRefractoryMs(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </label>
      </div>

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
