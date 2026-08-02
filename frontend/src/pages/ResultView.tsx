    import { SPEAKERS } from './SettingView';
    import homeIcon from '../assets/home.png';
    import retryIcon from '../assets/retry.png';

    interface ResultViewProps {
    totalDistance: string;
    diffDistance: string;
    onGoHome: () => void;
    onRetry: () => void;
    speakerId: number;
    }

    export default function ResultView({ 
    totalDistance, 
    diffDistance, 
    onGoHome, 
    onRetry, 
    speakerId 
    }: ResultViewProps) {
    // 選択されたキャラのデータを取得（見つからなければ先頭のキャラ）
    const currentSpeaker = SPEAKERS.find((s) => s.id === speakerId) || SPEAKERS[0]; 

    return (
        <div className="result-page-container">
        <div className="result-card-yellow">
            <span className="result-label">今回は</span>
            <span className="result-value">{totalDistance}!</span>
        </div>

        <div className="chat-section">
            {/* 動的に選択されたキャラの画像・アバタ―名を表示 */}
            <img src={currentSpeaker.icon} alt={currentSpeaker.name} className="char-avatar" />
            <div className="result-speech-bubble">
            <div className="bubble-text">がんばった！</div>
            <div className="bubble-text">前回より {diffDistance}!</div>
            </div>
        </div>

        <div className="result-action-group">
            <button className="btn-home-teal" onClick={onGoHome}>
            <img src={homeIcon} alt="Home" className="button-icon-white" />
            ホーム
            </button>
            <button className="btn-retry-terracotta" onClick={onRetry}>
            <img src={retryIcon} alt="Retry" className="button-icon-white" />
            再トライ
            </button>
        </div>
        </div>
    );  
    }