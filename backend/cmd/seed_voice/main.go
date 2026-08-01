package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"

	_ "github.com/lib/pq"
	"hackathon/backend/internal/voicevox"
)

type Template struct {
	ID   int
	Text string
}

func main() {
	fmt.Println("🎙️ 音声データの事前生成を開始します...")

	// 1. データベース接続
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://app:app@localhost:5432/app?sslmode=disable"
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("DB接続エラー: %v", err)
	}
	defer db.Close()

	// 2. セリフ（50件）を取得
	rows, err := db.Query("SELECT id, text FROM cheer_templates ORDER BY id ASC")
	if err != nil {
		log.Fatalf("データ取得エラー: %v", err)
	}
	defer rows.Close()

	var templates []Template
	for rows.Next() {
		var t Template
		if err := rows.Scan(&t.ID, &t.Text); err != nil {
			log.Fatalf("スキャンエラー: %v", err)
		}
		templates = append(templates, t)
	}

	// 3. 音声保存用フォルダ (storage/audio) の作成
	outputDir := filepath.Join(".", "storage", "audio")
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		log.Fatalf("フォルダ作成エラー: %v", err)
	}

	// 4. VOICEVOX クライアントの準備
	client, err := voicevox.NewClient()
	if err != nil {
		log.Fatalf("VOICEVOXクライアント初期化エラー: %v", err)
	}

	ctx := context.Background()
	speakerID := 3 // 3: ずんだもん(ノーマル)

	// 5. ループ処理で50個の音声を生成して保存
	for i, t := range templates {
		fmt.Printf("[%d/%d] ID: %d の音声生成中... (%s)\n", i+1, len(templates), t.ID, t.Text)

		// VOICEVOX で音声データ(WAV)を作成
		wavBytes, err := client.Synthesize(ctx, t.Text, speakerID)
		if err != nil {
			log.Printf("❌ ID %d の生成に失敗: %v\n", t.ID, err)
			continue
		}

		// ファイル名: 1.wav, 2.wav ... として保存
		filePath := filepath.Join(outputDir, fmt.Sprintf("%d.wav", t.ID))
		if err := os.WriteFile(filePath, wavBytes, 0644); err != nil {
			log.Printf("❌ ID %d の保存に失敗: %v\n", t.ID, err)
			continue
		}
	}

	fmt.Println("🎉 すべての音声ファイルの生成が完了しました！")
}