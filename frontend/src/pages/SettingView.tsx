import { useState } from 'react';

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

interface SettingViewProps {
  onGoBack: () => void;
  onStartCountdown: (goalSteps: number) => void;
}

export default function SettingView({ onGoBack, onStartCountdown }: SettingViewProps) {
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
