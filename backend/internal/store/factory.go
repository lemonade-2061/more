// internal/store/factory.go
package store

import (
	"context"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// NewS3AudioStore: 設定を受け取って S3AudioStore を使える状態にして返す関数
func NewS3AudioStore(ctx context.Context, endpointURL, region, bucket string) (*S3AudioStore, error) {
	// 1. AWS の基本設定を読み込む
	cfg, err := config.LoadDefaultConfig(ctx,
		config.WithRegion(region),
	)
	if err != nil {
		return nil, err
	}

	// 2. S3クライアントの詳細設定
	s3Client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		// LocalStack のURL（http://localhost:4566 など）が指定されていればセットする
		if endpointURL != "" {
			o.BaseEndpoint = aws.String(endpointURL)
		}

		// ⚠️【最重要ポイント】
		// LocalStackを使うときは、必ず URL の形式を「パス形式」にする！
		o.UsePathStyle = true
	})

	return &S3AudioStore{
		client: s3Client,
		bucket: bucket,
	}, nil
}