import { useState } from 'react';
import './App.css';

export function App() {
  const [username, setUsername] = useState<string>('');
  const [currentView, setCurrentView] = useState<'home' | 'setup' | 'setting'>('home');

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
          <h2>項目設定画面</h2>
          <p className="description-text">設定を完了してアプリを開始します。</p>

          {/* ここに設定項目（入力欄など）を追加していく */}

          {/* ボタンエリア */}
          <div className="button-group">
            <button className="btn-back" onClick={() => setCurrentView('setup')}>
              戻る
            </button>
            <button className="btn-start">
              スタート
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;