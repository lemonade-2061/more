import { useState } from 'react';
import char1Icon from '../assets/man.png';
import char2Icon from '../assets/woman.png';
import char3Icon from '../assets/robot.png';

// 歩幅 (m)。距離・時間の目標を歩数に換算するのに使う
export const STRIDE_M = 0.7;
// 歩行ペースの目安 (歩/分)。時間目標の換算用
const STEPS_PER_MIN = 100;

type GoalType = 'steps' | 'distance' | 'time';

const GOAL_LABELS: Record<GoalType, string> = {
  steps: '目標歩数',
  distance: '目標距離（km）',
  time: '目標時間（分）',
};

// 応援キャラ (VOICEVOX のスタイルID)。増やしたら README のクレジット表記も追加すること
export const SPEAKERS = [
  { id: 3, name: '', icon: char1Icon },
  { id: 2, name: '', icon: char2Icon },
  { id: 8, name: '', icon: char3Icon },
] as const;

interface SettingViewProps {
  onGoBack: () => void;
  onStartCountdown: (goalSteps: number) => void;
  speakerId: number;
  onSelectSpeaker: (id: number) => void;
}

export default function SettingView({
  onGoBack,
  onStartCountdown,
  speakerId,
  onSelectSpeaker,
}: SettingViewProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [goalType, setGoalType] = useState<GoalType>('steps');
  const [goalValue, setGoalValue] = useState<string>('30');

  // どの目標タイプでも内部的には歩数に換算して扱う
  const toGoalSteps = (): number => {
    const v = Number(goalValue);
    if (!Number.isFinite(v) || v <= 0) return 0;
    switch (goalType) {
      case 'steps':
        return Math.round(v);
      case 'distance':
        return Math.round((v * 1000) / STRIDE_M);
      case 'time':
        return Math.round(v * STEPS_PER_MIN);
    }
  };

  const handleStart = () => {
    const goalSteps = toGoalSteps();
    if (goalSteps <= 0) {
      alert('目標の数値を入力してください！');
      return;
    }
    onStartCountdown(goalSteps);
  };

  return (
    <div className="view">
      <h2>項目設定画面</h2>
      <p className="description-text">運動目標を選択してスタートしましょう。</p>

      {/* ドロップダウンメニュー */}
      <div className="dropdown-container">
        <button
          type="button"
          className="dropdown-toggle"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        >
          {GOAL_LABELS[goalType]}
        </button>

        {isDropdownOpen && (
          <div className="dropdown-menu">
            {(Object.keys(GOAL_LABELS) as GoalType[]).map((type) => (
              <button
                key={type}
                type="button"
                className="dropdown-item"
                onClick={() => {
                  setGoalType(type);
                  setIsDropdownOpen(false);
                }}
              >
                {GOAL_LABELS[type]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 目標の数値入力 */}
      <input
        type="number"
        className="input-box"
        value={goalValue}
        onChange={(e) => setGoalValue(e.target.value)}
        min={1}
      />

      {/* 応援キャラ選択 */}
      <p className="description-text">応援してくれるキャラを選ぼう</p>
      <div className="button-group" style={{ gap: '10px',justifyContent: 'center' }}>
        {SPEAKERS.map((s) => (
          <button
            key={s.id}
            type="button"

            style={{
              border: s.id === speakerId ? '3px solid #ff6b00' : '3px solid #ccc',
              borderRadius: 16,
              padding: '10px',
              backgourndColor: s.id === speakerId ? '#fff3eb' : '#f9f9f9',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100px',
              fontWeight: s.id === speakerId ? 'bold' : 'normal',
            }}
            onClick={() => onSelectSpeaker(s.id)}
          >
          <img 
              src={s.icon} 
              alt={s.name} 
              style={{ 
                width: '60px', 
                height: '60px', 
                objectFit: 'contain',
                marginBottom: '8px'
              }} 
            />
            <span style={{ 
              fontWeight: s.id === speakerId ? 'bold' : 'normal',
              fontSize: '14px',
              color: '#333'
            }}></span>







            {s.name}
          </button>
        ))}
      </div>

      {/* 操作ボタンエリア */}
      <div className="button-group">
        <button className="btn-back" onClick={onGoBack}>
          戻る
        </button>
        <button className="btn-start" onClick={handleStart}>
          スタート
        </button>
      </div>
    </div>
  );
}
