package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"hackathon/backend/internal/handler"
	"hackathon/backend/internal/store"
	"hackathon/backend/internal/voicevox"
)

func main() {
	ctx := context.Background()

	// 1. VOICEVOX クライアントの初期化
	vvClient, err := voicevox.NewClient()
	if err != nil {
		log.Fatalf("VOICEVOX クライアントの初期化に失敗しました: %v", err)
	}

	// 2. S3 (LocalStack) ストアの設定読み込み (空の場合はデフォルト値を使用)
	endpointURL := os.Getenv("S3_ENDPOINT")
	if endpointURL == "" {
		endpointURL = "http://localstack:4566"
	}

	region := os.Getenv("AWS_REGION")
	if region == "" {
		region = "us-east-1"
	}

	bucket := os.Getenv("S3_BUCKET")
	if bucket == "" {
		bucket = "audio-bucket"
	}

	log.Printf("S3設定: Endpoint=%s, Region=%s, Bucket=%s", endpointURL, region, bucket)

	// 3. S3AudioStore の初期化
	audioStore, err := store.NewS3AudioStore(ctx, endpointURL, region, bucket)
	if err != nil {
		log.Printf("エラー: S3AudioStoreの初期化に失敗しました: %v", err)
	}

	// 4. ハンドラの初期化 (audioStore を渡す)
	vvHandler := handler.NewVoicevoxHandler(vvClient, audioStore)

	// 5. ルーティングの設定 (/speech で音声合成＆S3保存)
	http.HandleFunc("/speech", vvHandler.HandleSynthesize)

	log.Println("Listening on :8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatal(err)
	}
}