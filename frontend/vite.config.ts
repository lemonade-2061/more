import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // Docker の外 (ホストのブラウザ) からアクセスできるように 0.0.0.0 で listen する
    host: true,
    port: 5173,
    // Vite 6 は未知のホスト名からのアクセスを既定でブロックする。
    // Cloudflare Tunnel (*.trycloudflare.com) や LAN の IP からスマホで開けるように全許可 (開発専用)
    allowedHosts: true,
    watch: {
      // バインドマウント越しだとファイル変更イベントが届かないことがあるためポーリングする
      usePolling: true,
      // 無指定だと高頻度で全ファイルを走査して CPU を食うので間隔を広げる
      interval: 300,
    },
    // トンネルで実機確認するときだけ有効化 (常時有効にすると PC のブラウザ側の HMR が壊れる)
    // hmr: { protocol: "wss", clientPort: 443 },
    // /api は backend コンテナへ転送する。フロントと同一オリジンになるので
    // トンネル経由のスマホからも CORS 無しでそのまま届く
    proxy: {
      "/api": {
        target: "http://backend:8080",
        changeOrigin: true,
      },
    },
  },
});
