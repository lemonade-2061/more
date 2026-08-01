package handler

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	"hackathon/backend/internal/db"
)

type Steps struct {
	q *db.Queries
}

func NewSteps(q *db.Queries) *Steps {
	return &Steps{q: q}
}

type stepEventIn struct {
	SteppedAtMs int64   `json:"stepped_at_ms"`
	Magnitude   float32 `json:"magnitude"`
}

type postStepsIn struct {
	UserID string        `json:"user_id"`
	Events []stepEventIn `json:"events"`
}

// Post は端末側で検出した歩イベントのバッチを受け取って保存する。
// POST /api/steps {"user_id": "...", "events": [{"stepped_at_ms": 1722..., "magnitude": 1.8}]}
func (s *Steps) Post(w http.ResponseWriter, r *http.Request) {
	var in postStepsIn
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}
	if in.UserID == "" || len(in.Events) == 0 {
		http.Error(w, "user_id and events are required", http.StatusBadRequest)
		return
	}
	rows := make([]db.InsertStepEventsParams, len(in.Events))
	for i, e := range in.Events {
		rows[i] = db.InsertStepEventsParams{
			UserID:    in.UserID,
			SteppedAt: pgtype.Timestamptz{Time: time.UnixMilli(e.SteppedAtMs), Valid: true},
			Magnitude: e.Magnitude,
		}
	}
	n, err := s.q.InsertStepEvents(r.Context(), rows)
	if err != nil {
		log.Printf("insert step events: %v", err)
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	log.Printf("steps: user=%s inserted=%d", in.UserID, n)
	writeJSON(w, map[string]any{"inserted": n})
}

// Delete は指定ユーザーの歩数記録を全削除する (テスト・リセット用)。
// DELETE /api/steps?user_id=...
func (s *Steps) Delete(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("user_id")
	if userID == "" {
		http.Error(w, "user_id is required", http.StatusBadRequest)
		return
	}
	n, err := s.q.DeleteStepEvents(r.Context(), userID)
	if err != nil {
		log.Printf("delete step events: %v", err)
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	log.Printf("steps: user=%s deleted=%d", userID, n)
	writeJSON(w, map[string]any{"deleted": n})
}

// Summary は期間内の合計歩数と分単位の推移を返す。
// GET /api/steps/summary?user_id=...&from=RFC3339&to=RFC3339 (from/to 省略時は直近24時間)
func (s *Steps) Summary(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("user_id")
	if userID == "" {
		http.Error(w, "user_id is required", http.StatusBadRequest)
		return
	}
	now := time.Now()
	from := parseTimeOr(r.URL.Query().Get("from"), now.Add(-24*time.Hour))
	to := parseTimeOr(r.URL.Query().Get("to"), now)

	fromTz := pgtype.Timestamptz{Time: from, Valid: true}
	toTz := pgtype.Timestamptz{Time: to, Valid: true}

	total, err := s.q.CountSteps(r.Context(), db.CountStepsParams{
		UserID: userID, SteppedAt: fromTz, SteppedAt_2: toTz,
	})
	if err != nil {
		log.Printf("count steps: %v", err)
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	perMin, err := s.q.StepsPerMinute(r.Context(), db.StepsPerMinuteParams{
		UserID: userID, SteppedAt: fromTz, SteppedAt_2: toTz,
	})
	if err != nil {
		log.Printf("steps per minute: %v", err)
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}

	type minuteOut struct {
		Minute time.Time `json:"minute"`
		Steps  int64     `json:"steps"`
	}
	minutes := make([]minuteOut, len(perMin))
	for i, m := range perMin {
		minutes[i] = minuteOut{Minute: m.Minute.Time, Steps: m.Steps}
	}
	writeJSON(w, map[string]any{
		"user_id":    userID,
		"from":       from,
		"to":         to,
		"total":      total,
		"per_minute": minutes,
	})
}

func parseTimeOr(s string, fallback time.Time) time.Time {
	if s == "" {
		return fallback
	}
	t, err := time.Parse(time.RFC3339, s)
	if err != nil {
		return fallback
	}
	return t
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("write json: %v", err)
	}
}
