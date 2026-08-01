package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"

	"hackathon/backend/internal/db"
	"hackathon/backend/internal/handler"
	"hackathon/backend/internal/voicevox"
)

func main() {
	ctx := context.Background()

	pool, err := pgxpool.New(ctx, os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Fatalf("connect db: %v", err)
	}
	defer pool.Close()

	queries := db.New(pool)
	steps := handler.NewSteps(queries)

	// VOICEVOX クライアントの初期化
	vvClient, err := voicevox.NewClient()
	if err != nil {
		log.Fatalf("VOICEVOX クライアントの初期化に失敗しました: %v", err)
	}
	vvHandler := handler.NewVoicevoxHandler(vvClient)

	mux := http.NewServeMux()

	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	})

	mux.HandleFunc("POST /api/steps", steps.Post)
	mux.HandleFunc("DELETE /api/steps", steps.Delete)
	mux.HandleFunc("GET /api/steps/summary", steps.Summary)

	// /speech で音声合成
	mux.HandleFunc("/speech", vvHandler.HandleSynthesize)

	log.Println("listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", mux))
}
