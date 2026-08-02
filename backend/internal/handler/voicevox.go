package handler

import (
	"crypto/sha1"
	"fmt"
	"log"
	"net/http"
	"strconv"

	"hackathon/backend/internal/store"
	"hackathon/backend/internal/voicevox"
)

type VoicevoxHandler struct {
	vvClient   voicevox.Client
	audioStore *store.S3AudioStore
}

func NewVoicevoxHandler(vvClient voicevox.Client, audioStore *store.S3AudioStore) *VoicevoxHandler {
	return &VoicevoxHandler{
		vvClient:   vvClient,
		audioStore: audioStore,
	}
}

func (h *VoicevoxHandler) HandleSynthesize(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	text := r.URL.Query().Get("text")
	if text == "" {
		http.Error(w, "text parameter is required", http.StatusBadRequest)
		return
	}

	speakerStr := r.URL.Query().Get("speaker")
	speakerID := 3
	if speakerStr != "" {
		id, err := strconv.Atoi(speakerStr)
		if err == nil {
			speakerID = id
		}
	}

	// --------------------------------------------------
	// ★ 1. セリフ + 話者ID から決定的なキャッシュキーを作成
	// --------------------------------------------------
	// 同じ text と speakerID であれば、常に同じキー名（例: cheer_a1b2c3d4...wav）になる
	hash := sha1.Sum([]byte(fmt.Sprintf("%s|%d", text, speakerID)))
	cacheKey := fmt.Sprintf("cheer_%x.wav", hash)

	// --------------------------------------------------
	// ★ 2. キャッシュの読み出し（HIT 時は即返却）
	// --------------------------------------------------
	if h.audioStore != nil {
		exists, err := h.audioStore.Exists(ctx, cacheKey)
		if err == nil && exists {
			// S3 から保存済みデータを取得
			wavBytes, err := h.audioStore.Load(ctx, cacheKey)
			if err == nil {
				log.Printf("⚡ キャッシュHIT (S3から即答): %s", cacheKey)

				w.Header().Set("Content-Type", "audio/wav")
				w.Header().Set("Content-Length", strconv.Itoa(len(wavBytes)))
				w.WriteHeader(http.StatusOK)
				w.Write(wavBytes)
				return // 👈 ここで終了（VOICEVOX を呼び出さない！）
			}
			log.Printf("⚠️ キャッシュ読み込み失敗のため、通常合成を行います: %v", err)
		}
	}

	// --------------------------------------------------
	// ★ 3. キャッシュMISS 時: VOICEVOX で音声合成
	// --------------------------------------------------
	log.Printf("🐢 キャッシュMISS (VOICEVOX合成開始): %s", cacheKey)
	wavBytes, err := h.vvClient.Synthesize(ctx, text, speakerID)
	if err != nil {
		http.Error(w, "failed to synthesize speech: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// --------------------------------------------------
	// ★ 4. 次回のために S3 へ保存（キャッシュ化）
	// --------------------------------------------------
	if h.audioStore != nil {
		if err := h.audioStore.Save(ctx, cacheKey, wavBytes); err != nil {
			log.Printf("❌ S3保存エラー: %v", err)
		} else {
			log.Printf("💾 S3保存成功(キャッシュ生成): %s", cacheKey)
		}
	}

	w.Header().Set("Content-Type", "audio/wav")
	w.Header().Set("Content-Length", strconv.Itoa(len(wavBytes)))
	w.WriteHeader(http.StatusOK)
	w.Write(wavBytes)
}