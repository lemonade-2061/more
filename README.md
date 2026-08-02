# **more**

## 概要

ランニングやウォーキングのときに応援してくれるWebアプリ

## 主な機能

- 歩数検出
- 進捗に応じたボイス
- 目標設定(距離、歩数、時間)

## 使用技術

- フロント    : React + Vite + TypeScript / WebAPI (Device Motion, Web Audio, Wake Lock, sendBeacon)
- バック　    : Go(net/http) + sqlc + pgx/v5
- DB          : PostgreSQL 16
- 音声        : VOICEVOX ENGINE
- ストレージ  : MinIO (S3互換)
- 地図        : Leaflet + OpenStreetMap
- インフラ    : Docker Compose / Cloudflare Tunnel

## アーキテクチャ

### 全体構成

```mermaid
flowchart LR
  subgraph phone["📱 スマホブラウザ (React)"]
    sensor["加速度センサー<br/>(DeviceMotion 約60Hz)"] --> detect["歩数検出<br/>ローパス → ピーク検出 → リズム判定"]
    gps["GPS<br/>(Geolocation)"] --> route["経路記録<br/>(Leaflet で地図表示)"]
    player["音声再生<br/>(Web Audio)"]
  end
  subgraph server["🐳 Docker Compose"]
    api["backend (Go)"]
    db[("PostgreSQL<br/>step_events / cheer_templates")]
    vv["VOICEVOX ENGINE"]
    minio[("MinIO<br/>音声キャッシュ")]
    api --> db
    api --> vv
    api --> minio
  end
  detect -- "5秒ごとにバッチ送信<br/>POST /api/steps" --> api
  phone -- "15秒ごとに進捗確認<br/>GET /api/cheer" --> api
  api -- "セリフ + WAV" --> player
```

- スマホ側は**ブラウザだけ**で完結 (アプリのインストール不要)。センサー処理・歩数判定はすべてフロントで行い、確定した「歩イベント」だけをサーバーに送る
- サーバー側は歩数の記録と集計、進捗に応じたセリフ選択、音声合成+キャッシュを担当

### 応援ボイスが鳴るまでの流れ

```mermaid
sequenceDiagram
    participant P as 📱 計測画面
    participant B as backend (Go)
    participant D as PostgreSQL
    participant V as VOICEVOX
    participant M as MinIO
    loop 15秒ごと
        P->>B: GET /api/cheer (user_id, goal, from)
        B->>D: 計測開始からの歩数を集計
        Note over B: 進捗% → ゾーン判定<br/>(直近12秒歩いてなければ「休憩」)
        B->>D: ゾーンのセリフをランダムに1つ取得
        B-->>P: {text, progress, zone}
        P->>B: GET /speech (text, speaker)
        alt キャッシュあり (事前生成済み)
            B->>M: 保存済み WAV を取得 (約0.003秒)
        else キャッシュなし
            B->>V: 音声合成 (数秒)
            B->>M: WAV を保存 (次回から即答)
        end
        B-->>P: WAV → その場で再生
    end
```

### 歩数検出の仕組み

```
|加速度| → ローパスフィルタで重力除去 → 閾値(1.5m/s²)の上向きクロスでピーク検出
        → 不応期600ms (着地後の揺り戻しによる二重カウントを防止)
        → リズム判定: 1.5秒以内の間隔で3回続いたら「歩行中」と確定
          (ポケット出し入れや手ブレなど単発の衝撃は歩数にしない)
```

パラメータはすべて実機で歩いて取った波形データ (`?debug=1` の調整画面で採取) を分析して決定。

### API 一覧

| メソッド | パス | 役割 |
|---|---|---|
| POST | `/api/steps` | 歩イベントのバッチ登録 |
| GET | `/api/steps/summary` | 期間内の合計・分単位の推移 |
| GET | `/api/cheer` | 進捗に応じた応援セリフの取得 |
| GET | `/speech` | 音声合成 (キャッシュ付き) |
| DELETE | `/api/steps` | 歩数記録の削除 (テスト用) |

## ポイント

- 歩数検出は実測データでチューニング(揺り戻しの二重カウントを間隔分析で発見 → 不応期600ms。3DSと同じリズム判定方式)
- 停滞検知 (12秒歩いてないとカウントされないと休憩のセリフ)
- スマホの制約対応 (iOSの許可フロー、自動再生ブロック、画面スリープ)

## 起動方法

- `cp .env.example .env` → `docker compose up -d --build` → localhost:5173
- スマホは HTTPS 必須: `cloudflared tunnel --url http://localhost:5173`
- seed: `docker compose exec -T db psql -U app -d app < backend/db/seed.sql`

## クレジット

音声合成に [VOICEVOX](https://voicevox.hiroshiba.jp/) を使用しています。

- VOICEVOX:ずんだもん
- VOICEVOX:四国めたん
- VOICEVOX:春日部つむぎ

