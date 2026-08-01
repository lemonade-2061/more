-- 歩数イベント: 1歩 = 1行。集計はクエリ側で date_trunc する
CREATE TABLE step_events (
  id         BIGSERIAL PRIMARY KEY,
  user_id    TEXT        NOT NULL,
  stepped_at TIMESTAMPTZ NOT NULL,           -- 端末側の検出時刻
  magnitude  REAL        NOT NULL DEFAULT 0, -- 検出時のピーク強度 (閾値チューニング用)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_step_events_user_time ON step_events (user_id, stepped_at);
