package voicevox

type Client interface {
    Synthesize(ctx context.Context, text string, speakerID int) ([]byte, error)
}
