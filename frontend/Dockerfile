# 開発用イメージ。Vite の dev サーバを動かす
FROM node:22-alpine

WORKDIR /app

# package-lock.json はコミット対象。メンバー間のバージョンずれ防止のため npm ci を使う
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]
