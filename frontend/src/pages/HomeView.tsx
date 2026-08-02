    import logoImage from '../assets/title.png';
    import CreditModal from '../components/CreditModal';
    import { useState } from 'react';

    interface HomeViewProps {
    username: string;
    setUsername: (name: string) => void;
    onGoToSetup: () => void;
    }

    export default function HomeView({ username, setUsername, onGoToSetup }: HomeViewProps) {
    const [isCreditOpen, setIsCreditOpen] = useState(false); 

    return (
        <div className="view" style={{ position: 'relative' }}>
        <div className="ribbon-container">
            {logoImage ? (
            <img src={logoImage} alt="MORE Logo" className="logo-img" />
            ) : (
            <div className="ribbon">MORE</div>
            )}
        </div>

        <input
            type="text"
            className="input-box"
            placeholder="名前を入力"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
        />

        <button className="btn-setup" onClick={onGoToSetup}>
            セットアップへ
        </button>

        {/* 小さなクレジットボタン（右下配置） */}
        <button
            type="button"
            onClick={() => setIsCreditOpen(true)}
            style={{
            position: 'fixed',
            bottom: '16px',
            right: '16px',
            padding: '4px 10px',
            fontSize: '11px',
            color: '#666',
            backgroundColor: '#f0f0f0',
            border: '1px solid #ccc',
            borderRadius: '12px',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
        >
            クレジット
        </button>

        {/* モーダル表示 */}
        <CreditModal
            isOpen={isCreditOpen}
            onClose={() => setIsCreditOpen(false)}
        />
        </div>
    );
    }