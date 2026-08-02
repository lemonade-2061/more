package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"

	"hackathon/backend/internal/db"
	"hackathon/backend/internal/handler"
	"hackathon/backend/internal/store"
	"hackathon/backend/internal/voicevox"
)

func main() {
	ctx := context.Background()

	// 1. DB 接続プールの初期化
	pool, err := pgxpool.New(ctx, os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Fatalf("connect db: %v", err)
	}
	defer pool.Close()

	queries := db.New(pool)
	steps := handler.NewSteps(queries)

	// 2. VOICEVOX クライアントの初期化
	vvClient, err := voicevox.NewClient()
	if err != nil {
		log.Fatalf("VOICEVOX クライアントの初期化に失敗しました: %v", err)
	}

	// 3. S3 (LocalStack) ストアの設定読み込み (空の場合はデフォルト値を使用)
	endpointURL := os.Getenv("S3_ENDPOINT")
	if endpointURL == "" {
		endpointURL = "http://minio:9000"
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

	// 4. S3AudioStore の初期化
	// 失敗してもサーバーは落とさない (音声保存以外の機能は生かすため。ハンドラ側に nil チェックあり)
	audioStore, err := store.NewS3AudioStore(ctx, endpointURL, region, bucket)
	if err != nil {
		log.Printf("S3AudioStoreの初期化に失敗しました (音声保存なしで続行します): %v", err)
		audioStore = nil
	}

	// 5. ハンドラの初期化 (audioStore を渡す)
	vvHandler := handler.NewVoicevoxHandler(vvClient, audioStore)

	// 6. ルーティングの設定
	mux := http.NewServeMux()

	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	})

	mux.HandleFunc("POST /api/steps", steps.Post)
	mux.HandleFunc("DELETE /api/steps", steps.Delete)
	mux.HandleFunc("GET /api/steps/summary", steps.Summary)
	mux.HandleFunc("GET /api/cheer", steps.Cheer)

	// /speech で音声合成＆S3保存
	mux.HandleFunc("/speech", vvHandler.HandleSynthesize)

	log.Println("listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", mux))
}
