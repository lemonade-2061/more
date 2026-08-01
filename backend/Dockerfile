# 開発用イメージ。air でホットリロードする
FROM golang:1.24

WORKDIR /app

# air (ホットリロード) と sqlc (SQL→Go コード生成) をイメージに焼いておく。
# sqlc を go run @latest で都度実行するとソースからのコンパイルで数分かかるため
RUN go install github.com/air-verse/air@v1.61.7 && \
    go install github.com/sqlc-dev/sqlc/cmd/sqlc@v1.29.0

COPY go.mod ./
RUN go mod download

COPY . .

EXPOSE 8080

CMD ["air", "-c", ".air.toml"]
