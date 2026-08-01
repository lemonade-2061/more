import { useState } from 'react';
import { voicePlayer } from '../audio/player';

// よく使いそうなセリフのプリセット (seed の応援セリフから抜粋)
const PRESETS = [
  'さあスタート！まずはリラックスしていこう！',
  '順調順調！すごく良いペースで走れているよ！',
  '目標達成！本当におめでとう！最高だよ！',
];

export default function VoiceDebug() {
  const [text, setText] = useState('こんにちは、テストです');
  const [speaker, setSpeaker] = useState(3);
  const [status, setStatus] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const synthesizeAndPlay = async (t: string) => {
    setBusy(true);
    setStatus('合成中…');
    const startedAt = performance.now();
    try {
      // ボタンタップ直後 (ユーザー操作の文脈) に init しておくとスマホでもブロックされない
      voicePlayer.init();
      const params = new URLSearchParams({ text: t, speaker: String(speaker) });
      await voicePlayer.play(`/speech?${params}`);
      const sec = ((performance.now() - startedAt) / 1000).toFixed(1);
      setStatus(`再生開始まで ${sec} 秒`);
    } catch (err) {
      setStatus(`エラー: ${String(err)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: 16, fontFamily: 'sans-serif', maxWidth: 480 }}>
      <h2>ボイステスト</h2>

      <label>
        セリフ
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          style={{ width: '100%', fontSize: 16 }}
        />
      </label>

      <label>
        スピーカーID:{' '}
        <input
          type="number"
          value={speaker}
          onChange={(e) => setSpeaker(Number(e.target.value))}
          style={{ width: 80, fontSize: 16 }}
        />
      </label>

      <div style={{ margin: '16px 0' }}>
        <button
          onClick={() => void synthesizeAndPlay(text)}
          disabled={busy || text.trim() === ''}
          style={{ padding: '12px 32px', fontSize: 18 }}
        >
          {busy ? '合成中…' : '合成して再生'}
        </button>
      </div>

      <p style={{ color: status.startsWith('エラー') ? 'red' : '#555' }}>{status}</p>

      <h3>プリセット</h3>
      {PRESETS.map((p) => (
        <button
          key={p}
          onClick={() => {
            setText(p);
            void synthesizeAndPlay(p);
          }}
          disabled={busy}
          style={{ display: 'block', width: '100%', margin: '8px 0', padding: 8, textAlign: 'left' }}
        >
          {p}
        </button>
      ))}

      <p style={{ color: '#888', fontSize: 12 }}>
        「再生開始まで◯秒」が毎回数秒かかる場合は事前生成 (キャッシュ) が必要な証拠。
        キャッシュ済み音声なら1秒未満になるはず。
      </p>
    </div>
  );
}
