package voicevox

import "context"

type Client interface {
    Synthesize(ctx context.Context, text string, speakerID int) ([]byte, error)
}
