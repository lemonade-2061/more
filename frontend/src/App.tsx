import { useState } from 'react';
import './App.css';

export function App() {
  const [username, setUsername] = useState<string>('');
  const [currentView, setCurrentView] = useState<'home' | 'setup'>('home');

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

  return (
    <div className="app-screen">
      {/* 画面1: 名前入力画面 */}
      {currentView === 'home' && (
        <div className="view">
          {/* リボンロゴ */}
          <div className="ribbon-container">
            <div className="ribbon">MORE</div>
          </div>

          {/* 入力欄 */}
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

      {/* 画面2: セットアップ画面 */}
      {currentView === 'setup' && (
        <div className="view">
          <h2>セットアップ</h2>
          <p className="greeting-text"><span>{username}</span> さん、ようこそ！</p>
          <p className="description-text">ここで運動目標や初期設定を行ないます。</p>
          <button className="btn-back" onClick={handleGoBack}>
            戻る
          </button>
        </div>
      )}
    </div>
  );
}

export default App;