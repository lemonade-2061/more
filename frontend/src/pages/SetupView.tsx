    interface SetupViewProps {
    username: string;
    onGoBack: () => void;
    onGoNext: () => void;
    }

    export default function SetupView({ username, onGoBack, onGoNext }: SetupViewProps) {
    return (
        <div className="view">
        <h2>セットアップ</h2>
        <p className="greeting-text"><span>{username}</span> さん、ようこそ！</p>
        <p className="description-text">ここで運動目標や初期設定を行ないます。</p>
        
        <div className="button-group">
            <button className="btn-back" onClick={onGoBack}>
            戻る
            </button>
            <button className="btn-setup" onClick={onGoNext}>
            次へ
            </button>
        </div>
        </div>
    );
    }