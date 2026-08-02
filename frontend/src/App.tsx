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
import { useRouteTracker } from './steps/useRouteTracker';
import RouteMap from './map/RouteMap';
import { getUserId } from './steps/userId';
import { fetchCheer } from './api/cheer';
import { formatDistance } from './utils/format';
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
  const route = useRouteTracker(); // GPS 経路 (取れたらリザルトに地図を出すおまけ機能)
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
    voicePlayer.init();
    // 許可ダイアログは1つずつ順番に出す。同時にリクエストすると iOS が
    // 片方 (位置情報) を黙って握りつぶすことがある
    if (!(await detector.requestPermission())) {
      alert('モーションセンサーの許可が必要です。設定を確認してください。');
      return;
    }
    // モーションの決着後に GPS 開始 → ここで位置情報のダイアログが出る
    route.start();
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
    route.stop();
    releaseWakeLock();
    const dist = Math.round(detector.stepCount * STRIDE_M);
    setTotalDistance(formatDistance(dist));
    const last = Number(localStorage.getItem('last-distance-m') ?? '0');
    const diff = dist - last;
    setDiffDistance(`${diff >= 0 ? '+' : ''}${formatDistance(diff)}`);
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

  // Wake Lock
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

  // 応援メッセージ
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

  // ギブアップ処理
  const handleGiveUp = () => {
    finishSession(false);
  };

  // デバッグ判定
  const debugMode = new URLSearchParams(window.location.search).get('debug');
  if (debugMode === 'voice') {
    return <VoiceDebug />;
  }
  if (debugMode !== null) {
    return <StepDebug />;
  }

  // 残り距離 (m)
  const remainingM = Math.max(0, Math.round((goalSteps - detector.stepCount) * STRIDE_M));

  return (
    <>
      {/* ★ 画面幅の制限を受けずに全体へ降らせる背景アニメーション */}
      <div className="bg-rain-container">
        {/* 左側〜中央エリア */}
        <div className="line bright" style={{ width: '12px', height: '100px', left: '-20%', animationDuration: '4.2s', animationDelay: '0s' }}></div>
        <div className="line dim"    style={{ width: '10px', height: '140px', left: '-5%',  animationDuration: '5.1s', animationDelay: '1.2s' }}></div>
        <div className="line medium" style={{ width: '8px',  height: '90px',  left: '10%',  animationDuration: '4.6s', animationDelay: '0.4s' }}></div>
        <div className="line dim"    style={{ width: '10px', height: '130px', left: '25%',  animationDuration: '5.4s', animationDelay: '2.8s' }}></div>
        <div className="line bright" style={{ width: '14px', height: '180px', left: '38%',  animationDuration: '3.8s', animationDelay: '0.2s' }}></div>

        {/* 中央〜右側エリア */}
        <div className="line medium" style={{ width: '8px',  height: '80px',  left: '50%',  animationDuration: '4.8s', animationDelay: '1.0s' }}></div>
        <div className="line medium" style={{ width: '12px', height: '110px', left: '62%',  animationDuration: '4.9s', animationDelay: '3.1s' }}></div>
        <div className="line bright" style={{ width: '16px', height: '200px', left: '75%',  animationDuration: '4.0s', animationDelay: '0.6s' }}></div>
        <div className="line dim"    style={{ width: '10px', height: '100px', left: '88%',  animationDuration: '5.5s', animationDelay: '1.4s' }}></div>

        {/* 右下に流れ込んで降ってくる右側外枠エリア */}
        <div className="line bright" style={{ width: '14px', height: '110px', left: '100%', animationDuration: '3.9s', animationDelay: '0.9s' }}></div>
        <div className="line dim"    style={{ width: '8px',  height: '130px', left: '115%', animationDuration: '5.3s', animationDelay: '0.3s' }}></div>
        <div className="line medium" style={{ width: '10px', height: '90px',  left: '130%', animationDuration: '4.7s', animationDelay: '2.5s' }}></div>
        <div className="line bright" style={{ width: '12px', height: '120px', left: '145%', animationDuration: '4.2s', animationDelay: '1.7s' }}></div>
        <div className="line dim"    style={{ width: '10px', height: '150px', left: '160%', animationDuration: '5.0s', animationDelay: '0.5s' }}></div>
      </div>

      {/* アプリ画面コンテンツ */}
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
            speakerId={speakerId}
          />
        )}

        {/* 画面5: リザルト画面 (GPSが取れていれば下にルート地図も出す) */}
        {currentView === 'result' && (
          <>
            <ResultView
              totalDistance={totalDistance}
              diffDistance={diffDistance}
              onGoHome={() => setCurrentView('home')}
              onRetry={() => setCurrentView('setting')} /* ★ 再トライで設定画面('setting')に遷移させる */
              speakerId={speakerId}
            />
            <RouteMap points={route.points} />
          </>
        )}

        {/* カウントダウンオーバーレイ */}
        <CountdownOverlay countdown={countdown} />
      </div>
    </>
  );
}

export default App;