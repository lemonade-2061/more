package store

import "context"

type AudioStore interface {
    Save(ctx context.Context, key string, data []byte) error
    URL(key string) string
    Exists(ctx context.Context, key string) (bool, error)
}
