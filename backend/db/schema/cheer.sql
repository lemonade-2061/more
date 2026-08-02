-- 応援セリフのテンプレート (実データは seed.sql で投入する)
-- zone: start(0-30%) / middle(30-70%) / push(70-90%) / last(90-100%) / pause(停滞中)
CREATE TABLE cheer_templates (
    id SERIAL PRIMARY KEY,
    zone VARCHAR(20) NOT NULL,
    min_progress INT NOT NULL,
    max_progress INT NOT NULL,
    text TEXT NOT NULL
);
