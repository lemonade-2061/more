import { useState, useEffect } from 'react';
import './App.css';
import StepDebug from './pages/StepDebug';

// 画像の読み込み
import logoImage from './assets/Vector_2.png';
import img1 from './assets/1.png';
import img2 from './assets/2.png';
import img3 from './assets/3.png';
import charIcon from './assets/Vector (2).png';  // キャラクター顔画像
import handIcon from './assets/Rectangle 33.png'; // 手のアイコン
import homeIcon from './assets/Rectangle 34.png'; // 家アイコン（ホーム）
import retryIcon from './assets/Ellipse 16.png';  // 矢印アイコン（再トライ）

export function App() {
  const [username, setUsername] = useState<string>('');
  
  // 画面表示ステート ('home' | 'setup' | 'setting' | 'count' | 'result')
  const [currentView, setCurrentView] = useState<'home' | 'setup' | 'setting' | 'count' | 'result'>('home');
  
  // カウントダウン用の状態
  const [countdown, setCountdown] = useState<number | null>(null);

  // 計測データ
  const [distance, setDistance] = useState<number>(100);
  const [message, setMessage] = useState<string>('もうちょっとだ！');

  // リザルトデータ
  const [totalDistance, setTotalDistance] = useState<string>('2km');
  const [diffDistance, setDiffDistance] = useState<string>('+100m');

  const handleGoToSetup = () => {
    if (username.trim() === '') {
      alert('名前を入力してください！');
      return;
    }
    setCurrentView('setup');
  };

  const handleGoBack = () => {
    setCurrentView('home');
  };

  const handleStartCountdown = () => {
    setCountdown(3);
  };

  // カウントダウン処理
  useEffect(() => {
    if (countdown === null) return;

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      const timer = setTimeout(() => {
        setCountdown(null);
        setCurrentView('count');
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // ギブアップ処理でリザルト画面へ
  const handleGiveUp = () => {
    setCurrentView('result');
  };

  // デバッグ判定
  if (new URLSearchParams(window.location.search).has('debug')) {
    return <StepDebug />;
  }

  return (
    <div className="app-screen">
      {/* 画面1: ホーム */}
      {currentView === 'home' && (
        <div className="view">
          <div className="ribbon-container">
            {logoImage ? (
              <img src={logoImage} alt="MORE Logo" className="logo-img" />
            ) : (
              <div className="ribbon">MORE</div>
            )}
          </div>

          <input
            type="text"
            className="input-box"
            placeholder="名前を入力"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <button className="btn-setup" onClick={handleGoToSetup}>
            セットアップへ
          </button>
        </div>
      )}

      {/* 画面2: セットアップ事前 */}
      {currentView === 'setup' && (
        <div className="view">
          <h2>セットアップ</h2>
          <p className="greeting-text"><span>{username}</span> さん、ようこそ！</p>
          <p className="description-text">ここで運動目標や初期設定を行ないます。</p>
          
          <div className="button-group">
            <button className="btn-back" onClick={handleGoBack}>
              戻る
            </button>
            <button className="btn-setup" onClick={() => setCurrentView('setting')}>
              次へ
            </button>
          </div>
        </div>
      )}

      {/* 画面3: 項目設定 */}
      {currentView === 'setting' && (
        <div className="view">
          <h2>項目設定画面</h2>
          <p className="description-text">設定を完了してアプリを開始します。</p>

          <div className="button-group">
            <button className="btn-back" onClick={() => setCurrentView('setup')}>
              戻る
            </button>
            <button className="btn-start" onClick={handleStartCountdown}>
              スタート
            </button>
          </div>
        </div>
      )}

      {/* 画面4: カウント計測 */}
      {currentView === 'count' && (
        <div className="count-page-container">
          <div className="distance-orange-card">
            後<span className="distance-num">{distance}</span>m
          </div>

          <div className="chat-section">
            <img src={charIcon} alt="Character" className="char-avatar" />
            <div className="speech-bubble">
              {message}
            </div>
          </div>

          <div className="bottom-button-wrapper">
            <button className="btn-giveup-red" onClick={handleGiveUp}>
              もう無理
              <img src={handIcon} alt="Hand" className="hand-icon" />
            </button>
          </div>
        </div>
      )}

      {/* --------------------------------------------------
          画面5: リザルト画面 (画像デザイン完全再現)
         -------------------------------------------------- */}
      {currentView === 'result' && (
        <div className="result-page-container">
          {/* オレンジイエローの成果ボード */}
          <div className="result-card-yellow">
            <span className="result-label">今回は</span>
            <span className="result-value">{totalDistance}!</span>
          </div>

          {/* キャラクター ＋ 左三角つき吹き出し */}
          <div className="chat-section">
            <img src={charIcon} alt="Character" className="char-avatar" />
            <div className="result-speech-bubble">
              <div className="bubble-text">がんばった！</div>
              <div className="bubble-text">前回より {diffDistance}!</div>
            </div>
          </div>

          {/* ホーム＆再トライボタン */}
          <div className="result-action-group">
            <button className="btn-home-teal" onClick={() => setCurrentView('home')}>
              <img src={homeIcon} alt="Home" className="button-icon-white" />
              ホーム
            </button>
            <button className="btn-retry-terracotta" onClick={handleStartCountdown}>
              <img src={retryIcon} alt="Retry" className="button-icon-white" />
              再トライ
            </button>
          </div>
        </div>
      )}

      {/* カウントダウンオーバーレイ */}
      {countdown !== null && (
        <div className="countdown-overlay">
          {countdown === 3 && <img src={img3} alt="3" className="countdown-img" />}
          {countdown === 2 && <img src={img2} alt="2" className="countdown-img" />}
          {countdown === 1 && <img src={img1} alt="1" className="countdown-img" />}
          {countdown === 0 && <div className="start-text">START!</div>}
        </div>
      )}
    </div>
  );
}

export default App;
