// オーディオ再生を管理するクラス
class VoicePlayer {
  private audioCtx: AudioContext | null = null;

  /**
   * 【最重要】スタートボタンが押された時に呼び出す初期化処理
   */
  public init() {
    // 既に初期化済みの場合はスキップ
    if (this.audioCtx) return;

    // Web Audio API の Context を生成
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.audioCtx = new AudioContextClass();

    // サスペンド状態（ブロック状態）なら Resume（再開）させる
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    // iOS対策: 無音のバッファーを一瞬鳴らして完全にロックを解除する
    const buffer = this.audioCtx.createBuffer(1, 1, 22050);
    const source = this.audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioCtx.destination);
    source.start(0);

    console.log("🔊 AudioContext が正常に初期化・解放されました！");
  }

  /**
   * 任意のタイミングで指定したURLのWAV音声を再生する関数
   * @param url 例: "/storage/audio/1.wav" または バックエンドから返ってきたURL
   */
  public async play(url: string) {
    try {
      // 万が一 init が呼ばれていなければ実行してみる
      if (!this.audioCtx) {
        this.init();
      }

      // サスペンド状態なら再開を試みる
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      // 音声ファイルをフェッチしてデコード再生
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      
      if (!this.audioCtx) return;
      const audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);

      const source = this.audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioCtx.destination);
      source.start(0);

    } catch (error) {
      console.error("音声再生エラー:", error);
    }
  }
}

// アプリ全体で1つのインスタンスを使い回す（シングルトン）
export const voicePlayer = new VoicePlayer();