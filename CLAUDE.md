# CLAUDE.md

ハッカソン当日の作業用リポジトリ。事前実装禁止のため、現状は「起動するだけの骨組み」。
ビジネスロジックはすべて当日ここから書く。

## 技術構成

- **backend**: Go + net/http、ホットリロードは air。DB アクセスは sqlc + pgx/v5
- **frontend**: React + TypeScript + Vite
- **db**: PostgreSQL 16 (docker compose の named volume)
- **voicevox**: VOICEVOX ENGINE (http://voicevox:50021、コンテナ間はサービス名で到達)
- 全部 `docker compose up` で立ち上がる。ホストに Go / Node は入れない前提。
  コンテナ内でコマンドを打つときは `docker compose exec backend bash` など

## ディレクトリの役割

```
backend/
  cmd/server/        エントリポイント (main.go)
  internal/handler/  HTTP ハンドラ
  internal/voicevox/ VOICEVOX ENGINE クライアント (VOICEVOX_URL 環境変数を使う)
  internal/store/    音声ファイルの保存 (AUDIO_STORE=local|s3 で切り替え)
  internal/db/       ★ sqlc の生成物。手で編集しない ★
  db/                schema/ と queries/ に SQL を置く (sqlc の入力) + seed.sql
frontend/src/
  api/               backend への fetch まわり
  audio/             音声再生まわり
  pages/             ページ
  components/        UI コンポーネント
```

## sqlc の使い方

1. `backend/db/schema/` にスキーマ SQL、`backend/db/queries/` にクエリ SQL を書く
2. `docker compose exec backend sqlc generate` (sqlc はイメージに焼いてある)
3. `internal/db/` に Go コードが生成される。**生成物は絶対に手で編集しない。**
   直したいときは SQL を直して再生成する

## 依存の追加 (落とし穴あり・必読)

node_modules と /go/pkg/mod は匿名ボリュームで保護しているため、コンテナ内で
install しただけではイメージに反映されない。そのままだと `docker compose down -v`
した人の環境でイメージの内容から再生成され、**追加した依存が消える**。

1. コンテナ内で追加する
   - backend: `docker compose exec backend go get <pkg>`
   - frontend: `docker compose exec frontend npm install <pkg>`
2. **直後に必ず `docker compose up -d --build` でイメージを作り直す**
3. go.mod / go.sum / package.json / package-lock.json をコミットする
   (他のメンバーは pull 後に `docker compose up -d --build` すれば揃う)

## チームの分担

- 初心者担当: `backend/db/seed.sql` (サンプルデータ) と `frontend/src/components/` (UI 部品)
- それ以外 (handler / voicevox / store / api / pages) は経験者が書く
- 初心者の作業がコンフリクトしにくいよう、components/ は1人1ファイルで作る

## 注意

- 生成した WAV などの音声ファイルはコミットしない (.gitignore 済みだが注意)
- Makefile は無い (Windows 勢がいるため)。コマンドは SETUP.md か本ファイルに直接書く
- シェルスクリプトを書くときの shebang は `#!/usr/bin/env bash`
