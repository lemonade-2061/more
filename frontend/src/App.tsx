import { useState, useEffect } from 'react';
import './App.css';
import StepDebug from './pages/StepDebug';

// --- 画像ファイルのインポート ---
import logoImage from './assets/Vector_2.png';
import img1 from './assets/1.png';
import img2 from './assets/2.png';
import img3 from './assets/3.png';
import charIcon from './assets/Vector (2).png';  // キャラクター顔画像
import handIcon from './assets/Rectangle 33.png'; // 手のアイコン画像

export function App() {
  // ユーザー名
  const [username, setUsername] = useState<string>('');

  // 画面表示ステート ('home' | 'setup' | 'setting' | 'count')
  const [currentView, setCurrentView] = useState<'home' | 'setup' | 'setting' | 'count'>('home');
  
  // カウントダウン用の状態 (3, 2, 1, 0, null)
  const [countdown, setCountdown] = useState<number | null>(null);

  // 計測画面のデータ
  const [distance, setDistance] = useState<number>(100);
  const [message, setMessage] = useState<string>('もうちょっとだ！');

  // ホーム画面からセットアップへの移動
  const handleGoToSetup = () => {
    if (username.trim() === '') {
      alert('名前を入力してください！');
      return;
    }
    setCurrentView('setup');
  };

  // ホームへ戻る処理
  const handleGoBack = () => {
    setCurrentView('home');
  };

  // スタートボタン押下時の処理（カウントダウン開始）
  const handleStartCountdown = () => {
    setCountdown(3);
  };

  // 3 -> 2 -> 1 -> START のカウントダウン処理
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
        setCurrentView('count'); // カウントダウン終了後に計測画面へ
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // ギブアップ処理
  const handleGiveUp = () => {
    alert('無理せず少し休憩しましょう！お疲れ様でした！');
  };

  // ?debug=1 をURLに付けたときだけ歩数検出の調整画面を表示
  if (new URLSearchParams(window.location.search).has('debug')) {
    return <StepDebug />;
  }

  return (
    <div className="app-screen">
      {/* --------------------------------------------------
          画面1: 名前入力画面 (home)
         -------------------------------------------------- */}
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

      {/* --------------------------------------------------
          画面2: セットアップ事前画面 (setup)
         -------------------------------------------------- */}
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

      {/* --------------------------------------------------
          画面3: 項目設定画面 (setting)
         -------------------------------------------------- */}
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

      {/* --------------------------------------------------
          画面4: カウント計測メイン画面 (count)
         -------------------------------------------------- */}
      {currentView === 'count' && (
        <div className="count-page-container">
          {/* オレンジ色の残り距離ボード */}
          <div className="distance-orange-card">
            後<span className="distance-num">{distance}</span>m
          </div>

          {/* キャラクターアイコンと吹き出し */}
          <div className="chat-section">
            <img src={charIcon} alt="Character" className="char-avatar" />
            <div className="speech-bubble">
              {message}
            </div>
          </div>

          {/* 右下の「もう無理」ボタン */}
          <div className="bottom-button-wrapper">
            <button className="btn-giveup-red" onClick={handleGiveUp}>
              もう無理
              <img src={handIcon} alt="Hand" className="hand-icon" />
            </button>
          </div>
        </div>
      )}

      {/* --------------------------------------------------
          ★ 全画面共通: カウントダウンオーバーレイ表示
         -------------------------------------------------- */}
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