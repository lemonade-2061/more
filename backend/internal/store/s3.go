// internal/store/s3.go
package store

import (
	"bytes"
	"context"
	"errors"
	"fmt"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
)

// S3AudioStore 構造体：S3を操作するために必要な情報をまとめて持っておく場所
type S3AudioStore struct {
	client *s3.Client // S3操作用のクライアント本体
	bucket string    // 保存先のバケット名（フォルダーのようなもの）
}

// 1. Save: 音声データをS3に保存する処理
func (s *S3AudioStore) Save(ctx context.Context, key string, data []byte) error {
	_, err := s.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(s.bucket),
		Key:         aws.String(key),         // 保存するファイル名（例: "voice/sample.wav"）
		Body:        bytes.NewReader(data),   // 音声データ本体
		ContentType: aws.String("audio/wav"), // ファイルの種類がWAV音声であることを伝える
	})
	if err != nil {
		return fmt.Errorf("S3への保存に失敗しました: %w", err)
	}
	return nil
}

// 2. URL: 保存したファイルにアクセスするためのURLを作成する処理
func (s *S3AudioStore) URL(key string) string {
	// エンドポイント（接続先）とバケット名、ファイル名をガッチャンコしてURLを作る
	return fmt.Sprintf("%s/%s/%s", aws.ToString(s.client.Options().BaseEndpoint), s.bucket, key)
}

// 3. Exists: ファイルがすでに存在するかチェックする処理
func (s *S3AudioStore) Exists(ctx context.Context, key string) (bool, error) {
	_, err := s.client.HeadObject(ctx, &s3.HeadObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		// 「ファイルが見つからない」というエラーなら、エラーではなく「存在しない(false)」として返す
		var NotFound *types.NotFound
		if errors.As(err, &NotFound) {
			return false, nil 
		}
		// それ以外の通信エラーなどの場合はエラーを返す
		return false, fmt.Errorf("ファイル存在確認に失敗しました: %w", err)
	}
	// エラーが出なければ「存在する(true)」
	return true, nil
}
