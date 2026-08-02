import { useEffect, useRef, useState } from 'react';
import './App.css';

import StepDebug from './pages/StepDebug';
import VoiceDebug from './pages/VoiceDebug';
import HomeView from './pages/HomeView';
import SetupView from './pages/SetupView';
import SettingView, { STRIDE_M } from './pages/SettingView';
import CountView from './pages/CountView';
import ResultView from './pages/ResultView';
import CountdownOverlay from './pages/CountdownOverlay';

import { useStepDetector } from './steps/useStepDetector';
import { getUserId } from './steps/userId';
import { fetchCheer } from './api/cheer';
import { voicePlayer } from './audio/player';

// 初期キャラ画像
import defaultCharImg from './assets/Vector (2)_3.png';

const CHEER_INTERVAL_MS = 15000;

export function App() {
  const [username, setUsername] = useState<string>('');
  const [currentView, setCurrentView] = useState<'home' | 'setup' | 'setting' | 'count' | 'result'>('home');
  const [countdown, setCountdown] = useState<number | null>(null);

  // 選択中のキャラクター画像
  const [selectedChar, setSelectedChar] = useState<string>(defaultCharImg);

  const [userId] = useState(getUserId);
  const detector = useStepDetector(userId);
  const [goalSteps, setGoalSteps] = useState<number>(30);
  const [message, setMessage] = useState<string>('がんばろう！');
  const sessionStartRef = useRef<Date | null>(null);
  const cheerBusyRef = useRef(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const acquireWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      }
    } catch (err) {
      console.warn('wake lock failed:', err);
    }
  };
  const releaseWakeLock = () => {
    void wakeLockRef.current?.release();
    wakeLockRef.current = null;
  };

  const [totalDistance, setTotalDistance] = useState<string>('0m');
  const [diffDistance, setDiffDistance] = useState<string>('+0m');

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

  // カウントダウン開始
  const handleStartCountdown = (goal: number, charImg?: string) => {
    setGoalSteps(goal);
    if (charImg) {
      setSelectedChar(charImg);
    }
    voicePlayer.init();
    setCountdown(3);
  };

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
        sessionStartRef.current = new Date();
        detector.reset();
        void detector.start();
        void acquireWakeLock();
        setMessage('がんばろう！');
        setCurrentView('count');
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [countdown, detector]);

  const finishSession = (achieved: boolean) => {
    detector.stop();
    releaseWakeLock();
    const dist = Math.round(detector.stepCount * STRIDE_M);
    setTotalDistance(`${dist}m`);
    const last = Number(localStorage.getItem('last-distance-m') ?? '0');
    const diff = dist - last;
    setDiffDistance(`${diff >= 0 ? '+' : ''}${diff}m`);
    localStorage.setItem('last-distance-m', String(dist));
    setCurrentView('result');
    if (achieved) {
      const text = 'おめでとう！目標達成だよ！本当によくがんばったね！';
      void voicePlayer.play(`/speech?${new URLSearchParams({ text })}`);
    }
  };

  useEffect(() => {
    if (currentView !== 'count') return;
    if (detector.stepCount >= goalSteps) {
      finishSession(true);
    }
  }, [detector.stepCount, currentView, goalSteps]);

  useEffect(() => {
    if (currentView !== 'count') return;
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void acquireWakeLock();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [currentView]);

  useEffect(() => {
    if (currentView !== 'count') return;
    const id = setInterval(async () => {
      if (cheerBusyRef.current || !sessionStartRef.current) return;
      cheerBusyRef.current = true;
      try {
        const cheer = await fetchCheer(userId, goalSteps, sessionStartRef.current);
        setMessage(cheer.text);
        await voicePlayer.play(`/speech?${new URLSearchParams({ text: cheer.text })}`);
      } catch (err) {
        console.error('cheer error:', err);
      } finally {
        cheerBusyRef.current = false;
      }
    }, CHEER_INTERVAL_MS);
    return () => clearInterval(id);
  }, [currentView, userId, goalSteps]);

  const handleGiveUp = () => {
    finishSession(false);
  };

  const debugMode = new URLSearchParams(window.location.search).get('debug');
  if (debugMode === 'voice') {
    return <VoiceDebug />;
  }
  if (debugMode !== null) {
    return <StepDebug />;
  }

  const remainingM = Math.max(0, Math.round((goalSteps - detector.stepCount) * STRIDE_M));

  return (
    <div className="app-screen">
      {currentView === 'home' && (
        <HomeView
          username={username}
          setUsername={setUsername}
          onGoToSetup={handleGoToSetup}
        />
      )}

      {currentView === 'setup' && (
        <SetupView
          username={username}
          onGoBack={handleGoBack}
          onGoNext={() => setCurrentView('setting')}
        />
      )}

      {currentView === 'setting' && (
        <SettingView
          onGoBack={() => setCurrentView('setup')}
          onStartCountdown={handleStartCountdown}
        />
      )}

      {currentView === 'count' && (
        <CountView
          distance={remainingM}
          message={message}
          charImg={selectedChar}
          onGiveUp={handleGiveUp}
        />
      )}

      {currentView === 'result' && (
        <ResultView
          totalDistance={totalDistance}
          diffDistance={diffDistance}
          charImg={selectedChar}
          onGoHome={() => setCurrentView('home')}
          onRetry={() => handleStartCountdown(goalSteps, selectedChar)}
        />
      )}

      <CountdownOverlay countdown={countdown} />
    </div>
  );
}

export default App;=== 1 && <img src={img1} alt="1" className="countdown-img" />}
          {countdown === 0 && <div className="start-text">START!</div>}
        </div>
      )}
    </div>
  );
}

export default App;
=== 1 && <img src={img1} alt="1" className="countdown-img" />}
          {countdown === 0 && <div className="start-text">START!</div>}
        </div>
      )}
    </div>
  );
}

export default App;
}
