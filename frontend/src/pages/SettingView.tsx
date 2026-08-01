    import { useState } from 'react';

    interface SettingViewProps {
    onGoBack: () => void;
    onStartCountdown: () => void;
    }

    export default function SettingView({ onGoBack, onStartCountdown }: SettingViewProps) {
    const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
    const [selectedGoal, setSelectedGoal] = useState<string>('目標を選択してください');

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
            {selectedGoal}
            </button>
            
            {isDropdownOpen && (
            <div className="dropdown-menu">
                <button
                type="button"
                className="dropdown-item"
                onClick={() => {
                    setSelectedGoal('目標時間（分）');
                    setIsDropdownOpen(false);
                }}
                >
                目標時間（分）
                </button>

                <button
                type="button"
                className="dropdown-item"
                onClick={() => {
                    setSelectedGoal('目標距離（km）');
                    setIsDropdownOpen(false);
                }}
                >
                目標距離（km）
                </button>

                <button
                type="button"
                className="dropdown-item"
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

        {/* 操作ボタンエリア */}
        <div className="button-group">
            <button className="btn-back" onClick={onGoBack}>
            戻る
            </button>
            <button className="btn-start" onClick={onStartCountdown}>
            スタート
            </button>
        </div>
        </div>
    );
    }