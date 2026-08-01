package handler

import (
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"hackathon/backend/internal/store"
	"hackathon/backend/internal/voicevox"
)

type VoicevoxHandler struct {
	vvClient   voicevox.Client
	audioStore *store.S3AudioStore // ★ 追加
}

func NewVoicevoxHandler(vvClient voicevox.Client, audioStore *store.S3AudioStore) *VoicevoxHandler { // ★ 引数追加
	return &VoicevoxHandler{
		vvClient:   vvClient,
		audioStore: audioStore, // ★ 追加
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

	wavBytes, err := h.vvClient.Synthesize(ctx, text, speakerID)
	if err != nil {
		http.Error(w, "failed to synthesize speech: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// --------------------------------------------------
	// ★ S3への保存処理を追加
	// --------------------------------------------------
	if h.audioStore != nil {
		filename := fmt.Sprintf("speech_%d.wav", time.Now().Unix())
		if err := h.audioStore.Save(ctx, filename, wavBytes); err != nil {
			log.Printf("S3保存エラー: %v", err)
		} else {
			log.Printf("S3保存成功: %s (URL: %s)", filename, h.audioStore.URL(filename))
		}
	}

	w.Header().Set("Content-Type", "audio/wav")
	w.Header().Set("Content-Length", strconv.Itoa(len(wavBytes)))
	w.WriteHeader(http.StatusOK)
	w.Write(wavBytes)
}