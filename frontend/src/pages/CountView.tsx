import charIcon from '../assets/Vector (2).png';

interface CountViewProps {
  distance: number;
  message: string;
  onGiveUp: () => void;
}

export default function CountView({ distance, message, onGiveUp }: CountViewProps) {
  return (
    <div className="count-page-container">
      {/* 残り距離カード */}
      <div className="distance-orange-card">
        あと<span className="distance-num">{distance}</span>m
      </div>

      {/* キャラクターとフキダシ */}
      <div className="chat-section">
        <img src={charIcon} alt="Character" className="char-avatar" />
        <div className="speech-bubble">{message}</div>
      </div>

      {/* ギブアップボタン */}
      <div className="bottom-button-wrapper">
        <button className="btn-giveup-red" onClick={onGiveUp}>
          ギブアップ
        </button>
      </div>
    </div>
  );
}
