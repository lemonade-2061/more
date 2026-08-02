import char1Icon from '../assets/man.png';
import char2Icon from '../assets/woman.png';
import char3Icon from '../assets/robot.png';
import handIcon from '../assets/hand.png';
import {SPEAKERS} from './SettingView';
interface CountViewProps {
  distance: number;
  message: string;
  onGiveUp: () => void;
  speakerId: number;
}

export default function CountView({ distance, message, onGiveUp, speakerId }: CountViewProps) {
  
  const currentSpeaker = SPEAKERS.find((s) => s.id === speakerId) || SPEAKERS[0];
  return (
    <div className="count-page-container">
      {/* 残り距離カード */}
      <div className="distance-orange-card">
        あと<span className="distance-num">{distance}</span>m
      </div>

      {/* キャラクターとフキダシ */}
      <div className="chat-section">
        {/* 4. currentSpeaker.icon を使用して動的に切り替える */}
        <img src={currentSpeaker.icon} alt={currentSpeaker.name} className="char-avatar"  />
        <div className="speech-bubble">{message}</div>
      </div>

      {/* ギブアップボタン */}
      <div className="bottom-button-wrapper">
        <button className="btn-giveup-red" onClick={onGiveUp}>
          <img src={handIcon} alt="Hand" className="btn-icon"/>
          <span>ギブアップ</span>
        </button>
      </div>
    </div>
  );
}
