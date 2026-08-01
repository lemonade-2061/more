package handler

import (
	"net/http"
	"strconv"

	// go.mod に記載のモジュール名に合わせて変更してください（例: backend/internal/voicevox）
	"hackathon/backend/internal/voicevox"
)

// VoicevoxHandler VOICEVOX用のHTTPハンドラ構造体
type VoicevoxHandler struct {
	vvClient voicevox.Client
}

// NewVoicevoxHandler ハンドラの初期化
func NewVoicevoxHandler(vvClient voicevox.Client) *VoicevoxHandler {
	return &VoicevoxHandler{
		vvClient: vvClient,
	}
}

// HandleSynthesize /speech へのリクエストを処理して WAV を返す
// リクエスト例: GET /speech?text=こんにちは&speaker=3
func (h *VoicevoxHandler) HandleSynthesize(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// 1. クエリパラメータから text と speaker を取得
	text := r.URL.Query().Get("text")
	if text == "" {
		http.Error(w, "text parameter is required", http.StatusBadRequest)
		return
	}

	speakerStr := r.URL.Query().Get("speaker")
	speakerID := 3 // 指定がない場合のデフォルト値（3: ずんだもん ノーマル）
	if speakerStr != "" {
		id, err := strconv.Atoi(speakerStr)
		if err == nil {
			speakerID = id
		}
	}

	// 2. VOICEVOX クライアントを使って音声合成を実行
	wavBytes, err := h.vvClient.Synthesize(ctx, text, speakerID)
	if err != nil {
		http.Error(w, "failed to synthesize speech: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// 3. ヘッダーに音声データ(WAV)であることを設定してクライアントに返す
	w.Header().Set("Content-Type", "audio/wav")
	w.Header().Set("Content-Length", strconv.Itoa(len(wavBytes)))
	w.WriteHeader(http.StatusOK)
	w.Write(wavBytes)
}