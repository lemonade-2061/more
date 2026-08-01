    import charIcon from '../assets/Vector (2).png';
    import homeIcon from '../assets/Rectangle 34.png';
    import retryIcon from '../assets/Ellipse 16.png';

    interface ResultViewProps {
    totalDistance: string;
    diffDistance: string;
    onGoHome: () => void;
    onRetry: () => void;
    }

    export default function ResultView({ totalDistance, diffDistance, onGoHome, onRetry }: ResultViewProps) {
    return (
        <div className="result-page-container">
        <div className="result-card-yellow">
            <span className="result-label">今回は</span>
            <span className="result-value">{totalDistance}!</span>
        </div>

        <div className="chat-section">
            <img src={charIcon} alt="Character" className="char-avatar" />
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