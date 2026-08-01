-- name: InsertStepEvents :copyfrom
INSERT INTO step_events (user_id, stepped_at, magnitude)
VALUES ($1, $2, $3);

-- name: CountSteps :one
SELECT count(*) FROM step_events
WHERE user_id = $1 AND stepped_at BETWEEN $2 AND $3;

-- name: DeleteStepEvents :execrows
DELETE FROM step_events WHERE user_id = $1;

-- name: StepsPerMinute :many
SELECT date_trunc('minute', stepped_at)::timestamptz AS minute, count(*) AS steps
FROM step_events
WHERE user_id = $1 AND stepped_at BETWEEN $2 AND $3
GROUP BY 1
ORDER BY 1;
