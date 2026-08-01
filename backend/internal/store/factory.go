// internal/store/factory.go
package store

import (
	"context"
	"fmt"
	"errors"

	"github.com/aws/aws-sdk-go-v2/service/s3/types"
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

		o.UsePathStyle = true
	})

  _, err = s3Client.CreateBucket(ctx, &s3.CreateBucketInput{
              Bucket: aws.String(bucket),
  })
  if err != nil {
     var owned *types.BucketAlreadyOwnedByYou
     var exists *types.BucketAlreadyExists
     if !errors.As(err, &owned) && !errors.As(err, &exists) {
        return nil, fmt.Errorf("バケット作成に失敗: %w", err)
     }
  }
	return &S3AudioStore{
		client: s3Client,
		bucket: bucket,
	}, nil
}
