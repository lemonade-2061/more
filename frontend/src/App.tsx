import { useState, useEffect } from 'react';
import './App.css';

import StepDebug from './pages/StepDebug';
import HomeView from './pages/HomeView';
import SetupView from './pages/SetupView';
import SettingView from './pages/SettingView';
import CountView from './pages/CountView';
import ResultView from './pages/ResultView';
import CountdownOverlay from './pages/CountdownOverlay';

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
        <HomeView
          username={username}
          setUsername={setUsername}
          onGoToSetup={handleGoToSetup}
        />
      )}

      {/* 画面2: セットアップ事前 */}
      {currentView === 'setup' && (
        <SetupView
          username={username}
          onGoBack={handleGoBack}
          onGoNext={() => setCurrentView('setting')}
        />
      )}

      {/* 画面3: 項目設定画面 */}
      {currentView === 'setting' && (
        <SettingView
          onGoBack={() => setCurrentView('setup')}
          onStartCountdown={handleStartCountdown}
        />
      )}

      {/* 画面4: カウント計測 */}
      {currentView === 'count' && (
        <CountView
          distance={distance}
          message={message}
          onGiveUp={handleGiveUp}
        />
      )}

      {/* 画面5: リザルト画面 */}
      {currentView === 'result' && (
        <ResultView
          totalDistance={totalDistance}
          diffDistance={diffDistance}
          onGoHome={() => setCurrentView('home')}
          onRetry={handleStartCountdown}
        />
      )}

      {/* カウントダウンオーバーレイ */}
      <CountdownOverlay countdown={countdown} />
    </div>
  );
}

export default App;