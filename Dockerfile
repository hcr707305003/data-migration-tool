# 使用官方Go镜像作为构建环境
FROM golang:1.22-alpine AS builder

# 设置Alpine镜像源为国内镜像
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# 设置工作目录
WORKDIR /app

# 设置Go模块代理为国内镜像
ENV GOPROXY=https://goproxy.cn,direct
ENV GOSUMDB=sum.golang.google.cn

# 安装必要的包
RUN apk add --no-cache git ca-certificates tzdata

# 复制go mod文件
COPY go.mod go.sum ./

# 下载依赖（利用Docker缓存层）
RUN go mod download && go mod verify

# 复制源代码
COPY . .

# 构建应用
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s -X main.version=1.0.0 -X main.buildTime=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    -o data-migration-tool .

# 使用轻量级的alpine镜像作为运行环境
FROM alpine:latest

# 设置Alpine镜像源为国内镜像
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# 安装必要的包
RUN apk --no-cache add ca-certificates tzdata wget su-exec

# 设置时区
ENV TZ=Asia/Shanghai

# 创建非root用户
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

# 设置工作目录
WORKDIR /app

# 从构建阶段复制二进制文件
COPY --from=builder /app/data-migration-tool .

# 复制Web资源
COPY --from=builder /app/web ./web

# 复制环境配置文件
COPY .env.example .env

# 复制启动脚本（直接从构建上下文复制）
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# 创建数据和日志目录，设置权限
RUN mkdir -p data logs && \
    chmod 755 data logs && \
    chown -R appuser:appgroup /app

# 保持root用户，在entrypoint中切换
# USER appuser

# 暴露端口
EXPOSE 8080

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1

# 设置启动脚本
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["./data-migration-tool"]