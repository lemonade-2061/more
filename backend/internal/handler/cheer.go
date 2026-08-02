package handler

import (
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	"hackathon/backend/internal/db"
)

// 直近この時間に1歩も無ければ「停滞中 (pause)」のセリフを返す
const pauseWindow = 12 * time.Second

// Cheer は計測開始からの進捗に応じた応援セリフを返す。
// GET /api/cheer?user_id=...&goal=100&from=RFC3339
//   goal: 目標歩数
//   from: 計測開始時刻 (省略時は当日0時から)
// レスポンス: {steps, goal, progress, zone, text}
func (s *Steps) Cheer(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("user_id")
	if userID == "" {
		http.Error(w, "user_id is required", http.StatusBadRequest)
		return
	}
	goal, err := strconv.ParseInt(r.URL.Query().Get("goal"), 10, 64)
	if err != nil || goal <= 0 {
		http.Error(w, "goal must be a positive integer", http.StatusBadRequest)
		return
	}
	now := time.Now()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	from := parseTimeOr(r.URL.Query().Get("from"), todayStart)

	steps, err := s.q.CountSteps(r.Context(), db.CountStepsParams{
		UserID:      userID,
		SteppedAt:   pgtype.Timestamptz{Time: from, Valid: true},
		SteppedAt_2: pgtype.Timestamptz{Time: now, Valid: true},
	})
	if err != nil {
		log.Printf("count steps: %v", err)
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}

	progress := steps * 100 / goal
	if progress > 100 {
		progress = 100
	}

	// 直近に歩みが無ければ停滞ゾーン (達成後は除く)
	zone := zoneForProgress(progress)
	if progress < 100 && steps > 0 {
		recent, err := s.q.CountSteps(r.Context(), db.CountStepsParams{
			UserID:      userID,
			SteppedAt:   pgtype.Timestamptz{Time: now.Add(-pauseWindow), Valid: true},
			SteppedAt_2: pgtype.Timestamptz{Time: now, Valid: true},
		})
		if err == nil && recent == 0 {
			zone = "pause"
		}
	}

	text, err := s.q.RandomCheerByZone(r.Context(), zone)
	if err != nil {
		log.Printf("random cheer (zone=%s): %v", zone, err)
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}

	writeJSON(w, map[string]any{
		"steps":    steps,
		"goal":     goal,
		"progress": progress,
		"zone":     zone,
		"text":     text,
	})
}

func zoneForProgress(progress int64) string {
	switch {
	case progress < 30:
		return "start"
	case progress < 70:
		return "middle"
	case progress < 90:
		return "push"
	default:
		return "last"
	}
}
