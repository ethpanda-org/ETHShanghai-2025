# 构建阶段
FROM golang:1.21-alpine AS builder

WORKDIR /app

# 复制依赖文件
COPY go.mod go.sum ./
RUN go mod download

# 复制源代码
COPY . .

# 构建
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/bin/server cmd/server/main.go

# 运行阶段
FROM alpine:latest

WORKDIR /app

# 安装 CA 证书
RUN apk --no-cache add ca-certificates

# 从构建阶段复制二进制文件
COPY --from=builder /app/bin/server .
COPY --from=builder /app/config.yaml .

EXPOSE 8080

CMD ["./server"]