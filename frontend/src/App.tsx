import StepDebug from "./pages/StepDebug";

export default function App() {
  // 通常 URL では本番画面。?debug=1 を付けたときだけ歩数検出の調整画面を出す
  if (new URLSearchParams(window.location.search).has("debug")) {
    return <StepDebug />;
  }
  return <h1>Vite + React</h1>;
}
