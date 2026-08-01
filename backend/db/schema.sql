-- backend/db/schema.sql

CREATE TABLE IF NOT EXISTS cheer_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    zone VARCHAR(20) NOT NULL,
    min_progress INT NOT NULL,
    max_progress INT NOT NULL,
    text TEXT NOT NULL
);