import { useState } from 'react';
import './App.css';
import StepDebug from './pages/StepDebug';

// 画像の読み込み（画像がない場合でもエラーにならないように記述）
import logoImage from './assets/Vector_2.png';

export function App() {
  const [username, setUsername] = useState<string>('');
  const [currentView, setCurrentView] = useState<'home' | 'setup' | 'setting'>('home');

  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [selectedGoal, setSelectedGoal]= useState<string>('目標を選択してください');
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

  // ?debug=1 を付けたときだけ歩数検出の調整画面を出す (デモ URL には影響しない)
  if (new URLSearchParams(window.location.search).has('debug')) {
    return <StepDebug />;
  }

  return (
    <div className="app-screen">
      {/* 画面1: 名前入力画面 */}
      {currentView === 'home' && (
        <div className="view">
          {/* ロゴ画像表示エリア */}
          <div className="ribbon-container">
            {logoImage ? (
              <img src={logoImage} alt="MORE Logo" className="logo-img" />
            ) : (
              <div className="ribbon">MORE</div>
            )}
          </div>

          {/* 名前入力欄 */}
          <input
            type="text"
            className="input-box"
            placeholder="名前を入力"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          {/* セットアップへ移動ボタン */}
          <button className="btn-setup" onClick={handleGoToSetup}>
            セットアップへ
          </button>
        </div>
      )}

      {/* 画面2: セットアップ事前画面 */}
      {currentView === 'setup' && (
        <div className="view">
          <h2>セットアップ</h2>
          <p className="greeting-text"><span>{username}</span> さん、ようこそ！</p>
          <p className="description-text">ここで運動目標や初期設定を行ないます。</p>
          
          {/* ボタンエリア */}
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

      {/* 画面3: セットアップ画面（設定・スタート画面） */}
      {currentView === 'setting' && (
        <div className="view">

          <div className = "dropdown-container">
            <button type="button" className = "dropdown-toggle" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
              {selectedGoal}
            </button>
            {isDropdownOpen && (
              <div className ="dropdown-menu">
                <button type="button" className="dropdown-item"
                onClick={() => {
                  setSelectedGoal("目標時間");
                  setIsDropdownOpen(false);
                }}
                >
                  目標時間（分）
                </button>

                <button type ="button" className="dropdown-item"
                onClick={() => {
                    setSelectedGoal('目標距離');
                    setIsDropdownOpen(false);
                  }}
                  >
                    目標距離（km）
                  </button>


                  <button type ="button" className="dropdown-item"
                onClick={() => {
                    setSelectedGoal('目標歩数');
                    setIsDropdownOpen(false);
                  }}
                  >
                    目標歩数
                  </button>

                  
                  </div>
            )}
          </div>

          {/*プルダウンおわり*/}

          <div className="button-group">
            <button className="btn-back" onClick={() => setCurrentView('setup')}>
              戻る
            </button>
            <button className="btn-start">
              スタート
            </button>
            <button className="set-goal">目標設定</button>
            </div>

        </div>
      )};

    </div>
  );
}

export default App;
