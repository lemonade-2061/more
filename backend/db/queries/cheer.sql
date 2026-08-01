-- name: RandomCheerByZone :one
SELECT text FROM cheer_templates
WHERE zone = $1
ORDER BY random()
LIMIT 1;
