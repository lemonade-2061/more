package voicevox

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
)

// Speaker スピーカー情報
type Speaker struct {
	Name string `json:"name"`
	UUID string `json:"speaker_uuid"`
}

// Client VOICEVOX クライアントのインターフェース
type Client interface {
	Synthesize(ctx context.Context, text string, speakerID int) ([]byte, error)
	Speakers(ctx context.Context) ([]Speaker, error)
}

type client struct {
	baseURL    string
	httpClient *http.Client
}

// NewClient クライアントを初期化（環境変数からURLを取得）
func NewClient() (Client, error) {
	baseURL := os.Getenv("VOICEVOX_URL")
	if baseURL == "" {
		baseURL = "http://voicevox:50021"
	}

	return &client{
		baseURL: strings.TrimRight(baseURL, "/"),
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}, nil
}

// Synthesize 2段階リクエストで音声データ(WAV)を取得する
func (c *client) Synthesize(ctx context.Context, text string, speakerID int) ([]byte, error) {
	// Step 1: /audio_query でクエリJSONを取得
	queryURL, err := url.Parse(c.baseURL + "/audio_query")
	if err != nil {
		return nil, fmt.Errorf("failed to parse url: %w", err)
	}

	q := queryURL.Query()
	q.Set("text", text)
	q.Set("speaker", strconv.Itoa(speakerID))
	queryURL.RawQuery = q.Encode()

	req1, err := http.NewRequestWithContext(ctx, http.MethodPost, queryURL.String(), nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create audio_query request: %w", err)
	}

	resp1, err := c.httpClient.Do(req1)
	if err != nil {
		return nil, fmt.Errorf("audio_query request failed: %w", err)
	}
	defer resp1.Body.Close()

	if resp1.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("audio_query returned status: %d", resp1.StatusCode)
	}

	audioQueryJSON, err := io.ReadAll(resp1.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read audio_query response: %w", err)
	}

	// Step 2: /synthesis にJSONを投げて WAV を作成
	synthURL, err := url.Parse(c.baseURL + "/synthesis")
	if err != nil {
		return nil, fmt.Errorf("failed to parse synthesis url: %w", err)
	}

	sq := synthURL.Query()
	sq.Set("speaker", strconv.Itoa(speakerID))
	synthURL.RawQuery = sq.Encode()

	req2, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		synthURL.String(),
		strings.NewReader(string(audioQueryJSON)),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create synthesis request: %w", err)
	}
	req2.Header.Set("Content-Type", "application/json")

	resp2, err := c.httpClient.Do(req2)
	if err != nil {
		return nil, fmt.Errorf("synthesis request failed: %w", err)
	}
	defer resp2.Body.Close()

	if resp2.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("synthesis returned status: %d", resp2.StatusCode)
	}

	wavBytes, err := io.ReadAll(resp2.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read synthesis response: %w", err)
	}

	return wavBytes, nil
}

// Speakers スピーカー一覧を取得する
func (c *client) Speakers(ctx context.Context) ([]Speaker, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/speakers", nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create speakers request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("speakers request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("speakers returned status: %d", resp.StatusCode)
	}

	var speakers []Speaker
	if err := json.NewDecoder(resp.Body).Decode(&speakers); err != nil {
		return nil, fmt.Errorf("failed to decode speakers response: %w", err)
	}

	return speakers, nil
}