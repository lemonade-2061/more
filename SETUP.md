# hackathon

ハッカソン用のリポジトリです。中身（アプリの実装）は当日ゼロから書きます。
このリポジトリには「環境」だけが入っています。

## 必要なもの

**docker と git だけ**です。Go や Node.js をパソコンに入れる必要はありません。
すべて Docker のコンテナの中で動きます。

- Windows の人: [Docker Desktop](https://www.docker.com/products/docker-desktop/) を入れて、WSL2 (Ubuntu) をセットアップしてください
- Mac の人: Docker Desktop または OrbStack を入れてください

## 起動手順（3行）

```bash
git clone <このリポジトリのURL> && cd hackathon
cp .env.example .env
docker compose up --build
```

初回はイメージのダウンロードで数分かかります。起動したら:

- http://localhost:5173 — フロントエンド (Vite + React の画面が出ればOK)
- http://localhost:8080/health — バックエンド (`ok` と出ればOK)
- http://localhost:50021/docs — VOICEVOX エンジンの API ドキュメント

ソースコードを編集して保存すると、コンテナを再起動しなくても自動で反映されます
（backend は air、frontend は Vite の HMR）。

## ⚠️ Windows (WSL2) の人へ: clone する場所に注意

**必ず WSL 側のホームディレクトリ (`~/` の下) に clone してください。**

```bash
# ✅ よい (WSL の Ubuntu ターミナルで)
cd ~ && git clone <URL>

# ❌ だめ
cd /mnt/c/Users/xxx && git clone <URL>
```

理由: `/mnt/c` は Windows 側のディスクを WSL から覗いている場所で、
ファイルを保存しても「ファイルが変わったよ」という通知 (inotify) が Linux 側に届きません。
そのため Vite の HMR や air のホットリロードが**効かなくなります**。
おまけにファイルアクセスも非常に遅いです。

## ディレクトリ構成

```
.
├── SETUP.md               # このファイル（環境構築とトラブル対処）
├── CLAUDE.md              # 当日の開発ルール・分担・sqlc の使い方
├── docker-compose.yml     # 4つのコンテナ (db / voicevox / backend / frontend) の定義
├── .env.example           # 環境変数のひな形。cp .env.example .env して使う
│
├── backend/               # Go のサーバ (http://localhost:8080)
│   ├── Dockerfile
│   ├── go.mod
│   ├── sqlc.yaml          # SQL から Go コードを生成する sqlc の設定
│   ├── cmd/server/        # エントリポイント (main.go)。今は /health を返すだけ
│   ├── db/
│   │   ├── schema/        # ★当日ここにテーブル定義の SQL を書く
│   │   └── queries/       # ★当日ここにクエリの SQL を書く
│   └── internal/
│       ├── handler/       # ★当日ここに HTTP ハンドラを書く
│       ├── voicevox/      # ★当日ここに VOICEVOX 連携を書く
│       ├── store/         # ★当日ここに音声ファイル保存処理を書く
│       └── db/            # sqlc が自動生成する場所。手で書かない・編集しない
│
└── frontend/              # React の画面 (http://localhost:5173)
    ├── Dockerfile
    ├── package.json       # npm の依存一覧 (package-lock.json とセットでコミット)
    ├── vite.config.ts
    ├── index.html
    └── src/
        ├── main.tsx       # エントリポイント
        ├── App.tsx        # 今は初期画面を出すだけ
        ├── api/           # ★当日ここに backend への通信処理を書く
        ├── audio/         # ★当日ここに音声再生まわりを書く
        ├── pages/         # ★当日ここにページを書く
        └── components/    # ★当日ここに UI 部品を書く
```

★のディレクトリは今は空です（ハッカソンのルールで事前実装が禁止のため、
中身はすべて当日書きます）。空フォルダに入っている `.gitkeep` は
「空のままフォルダを git に残すためだけのファイル」なので気にしなくてOKです。

誰がどこを書くかの分担は CLAUDE.md を見てください。

## ライブラリ（依存）を追加するときの注意

コンテナの中で install するだけでは**イメージに残りません**。
`docker compose down -v` した人の環境で依存が消えて「自分だけ動かない」が起きます。
必ず次の3ステップで:

```bash
# 1. コンテナ内で追加 (例)
docker compose exec frontend npm install axios
docker compose exec backend go get github.com/jackc/pgx/v5

# 2. 直後にイメージを作り直す (これを忘れると事故る)
docker compose up -d --build

# 3. package.json / package-lock.json / go.mod / go.sum をコミット
```

pull した側も `docker compose up -d --build` すれば同じ環境になります。

## トラブルシューティング

### A. WSL に直接 Docker を入れている場合 (Docker Desktop なし)

**`'compose' is not a docker command` と言われる**
→ Compose プラグインが入っていません:

```bash
sudo apt install docker-compose-plugin
```

**`Cannot connect to the Docker daemon` と言われる**
→ Docker デーモンが起動していません。まず:

```bash
sudo service docker start
```

毎回打つのが面倒なら恒久対応として、WSL 内で `/etc/wsl.conf` に

```ini
[boot]
systemd=true
```

を書き、PowerShell から `wsl --shutdown` して WSL を開き直すと自動起動になります。

**`permission denied while trying to connect to the Docker daemon socket`**
→ 自分のユーザーが docker グループに入っていません:

```bash
sudo usermod -aG docker $USER
```

を実行してから、**WSL のターミナルを開き直す**（開き直さないと反映されません）。

### B. Docker Desktop を使っている場合

**`docker compose version` がエラーになる / `docker: command not found` (WSL)**
→ WSL の中から Docker Desktop が見えていません。

1. Docker Desktop を起動する（Windows 側で起動していないと WSL から使えません）
2. Docker Desktop の Settings → Resources → **WSL integration** を開き、
   使っている Ubuntu ディストリビューションのトグルを ON にする
3. WSL のターミナルを開き直して `docker compose version` を再確認

### ポートが使われていると言われる

5173 / 8080 / 5432 / 50021 を他のアプリが使っていないか確認してください。

### 全部作り直したいとき

```bash
docker compose down -v   # コンテナと DB のデータを消す
docker compose up --build
```
