package main

import (
	"log"
	"net/http"

	// 自分のプロジェクトのモジュール名に合わせて変更してください
	"hackathon/backend/internal/handler"
	"hackathon/backend/internal/voicevox"
)

func main() {
	// 1. VOICEVOX クライアントの初期化
	vvClient, err := voicevox.NewClient()
	if err != nil {
		log.Fatalf("VOICEVOX クライアントの初期化に失敗しました: %v", err)
	}

	// 2. ハンドラの初期化
	vvHandler := handler.NewVoicevoxHandler(vvClient)

	// 3. ルーティングの追加 (/speech で音声合成)
	http.HandleFunc("/speech", vvHandler.HandleSynthesize)

	log.Println("Listening on :8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatal(err)
	}
}