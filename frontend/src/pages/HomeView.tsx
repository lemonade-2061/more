    import logoImage from '../assets/Vector_2.png';

    interface HomeViewProps {
    username: string;
    setUsername: (name: string) => void;
    onGoToSetup: () => void;
    }

    export default function HomeView({ username, setUsername, onGoToSetup }: HomeViewProps) {
    return (
        <div className="view">
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
        </div>
    );
    }