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

// 応援セリフを取りに行く間隔。合成に数秒かかるので詰めすぎない
const CHEER_INTERVAL_MS = 15000;

export function App() {
  const [username, setUsername] = useState<string>('');

  // 画面表示ステート ('home' | 'setup' | 'setting' | 'count' | 'result')
  const [currentView, setCurrentView] = useState<'home' | 'setup' | 'setting' | 'count' | 'result'>('home');

  // カウントダウン用の状態
  const [countdown, setCountdown] = useState<number | null>(null);

  // 計測まわり
  const [userId] = useState(getUserId);
  const detector = useStepDetector(userId);
  const [goalSteps, setGoalSteps] = useState<number>(30);
  const [speakerId, setSpeakerId] = useState<number>(3); // 応援キャラ (既定: ずんだもん)
  const [message, setMessage] = useState<string>('がんばろう！');
  const sessionStartRef = useRef<Date | null>(null);
  const cheerBusyRef = useRef(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // 計測中に画面が自動ロックされると加速度センサーごと止まるので、スリープを抑止する
  const acquireWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      }
    } catch (err) {
      // 非対応ブラウザや省電力モードでは失敗するが、計測自体は続行できる
      console.warn('wake lock failed:', err);
    }
  };
  const releaseWakeLock = () => {
    void wakeLockRef.current?.release();
    wakeLockRef.current = null;
  };

  // リザルトデータ
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

  const handleStartCountdown = async (goal: number) => {
    setGoalSteps(goal);
    // ユーザー操作(タップ)の文脈で音声をアンロックしておく (スマホの自動再生対策)
    voicePlayer.init();
    // 同じくタップの文脈でモーションセンサーの許可を取る (iOS はここでしか出せない)
    if (!(await detector.requestPermission())) {
      alert('モーションセンサーの許可が必要です。設定を確認してください。');
      return;
    }
    setCountdown(3);
  };

  // カウントダウン処理: 0 になったら計測開始
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

  // 計測終了の共通処理: 検出を止めて距離を集計しリザルトへ
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
      void voicePlayer.play(
        `/speech?${new URLSearchParams({ text, speaker: String(speakerId) })}`,
      );
    }
  };

  // 目標歩数に到達したら自動でリザルトへ
  useEffect(() => {
    if (currentView !== 'count') return;
    if (detector.stepCount >= goalSteps) {
      finishSession(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detector.stepCount, currentView, goalSteps]);

  // Wake Lock は一度画面が裏に回ると自動解除されるので、計測中に表へ戻ったら取り直す
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

  // 計測中は定期的に応援セリフを取得して表示+読み上げ
  useEffect(() => {
    if (currentView !== 'count') return;
    const id = setInterval(async () => {
      if (cheerBusyRef.current || !sessionStartRef.current) return;
      cheerBusyRef.current = true;
      try {
        const cheer = await fetchCheer(userId, goalSteps, sessionStartRef.current);
        setMessage(cheer.text);
        await voicePlayer.play(
          `/speech?${new URLSearchParams({ text: cheer.text, speaker: String(speakerId) })}`,
        );
      } catch (err) {
        console.error('cheer error:', err);
      } finally {
        cheerBusyRef.current = false;
      }
    }, CHEER_INTERVAL_MS);
    return () => clearInterval(id);
  }, [currentView, userId, goalSteps, speakerId]);

  // ギブアップ処理でリザルト画面へ
  const handleGiveUp = () => {
    finishSession(false);
  };

  // デバッグ判定: ?debug=voice でボイステスト、それ以外の ?debug は歩数調整画面
  const debugMode = new URLSearchParams(window.location.search).get('debug');
  if (debugMode === 'voice') {
    return <VoiceDebug />;
  }
  if (debugMode !== null) {
    return <StepDebug />;
  }

  // 残り距離 (m): 目標歩数 - 現在歩数 を歩幅で換算
  const remainingM = Math.max(0, Math.round((goalSteps - detector.stepCount) * STRIDE_M));

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
          speakerId={speakerId}
          onSelectSpeaker={setSpeakerId}
        />
      )}

      {/* 画面4: カウント計測 */}
      {currentView === 'count' && (
        <CountView
          distance={remainingM}
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
          onRetry={() => handleStartCountdown(goalSteps)}
        />
      )}

      {/* カウントダウンオーバーレイ */}
      <CountdownOverlay countdown={countdown} />
    </div>
  );
}

export default App;
