#!/bin/bash

# Docker启动脚本 - 处理权限问题
# 使用方法: ./docker-start.sh [up|down|logs|ps]

set -e

# 获取当前用户ID和组ID
export UID=$(id -u)
export GID=$(id -g)

# 创建必要的目录并设置权限
mkdir -p data logs
chmod 755 data logs

# 如果是root用户，给出警告
if [ "$UID" -eq 0 ]; then
    echo "⚠️  警告: 检测到root用户，建议使用非root用户运行Docker"
    echo "   为了安全考虑，容器内将使用非特权用户(1001:1001)"
    export UID=1001
    export GID=1001
fi

echo "🐳 使用用户ID: $UID, 组ID: $GID"

# 根据参数执行不同操作
case "${1:-up}" in
    "up")
        echo "🚀 启动Docker容器..."
        docker-compose up -d
        ;;
    "up-cn")
        echo "🚀 启动Docker容器 (中国优化版)..."
        docker-compose -f docker-compose.cn.yml up -d
        ;;
    "down")
        echo "🛑 停止Docker容器..."
        docker-compose down
        ;;
    "logs")
        echo "📋 查看日志..."
        docker-compose logs -f
        ;;
    "ps")
        echo "📊 查看容器状态..."
        docker-compose ps
        ;;
    "restart")
        echo "🔄 重启容器..."
        docker-compose restart
        ;;
    "build")
        echo "🔨 重新构建镜像..."
        docker-compose build --no-cache
        ;;
    *)
        echo "使用方法: $0 [up|up-cn|down|logs|ps|restart|build]"
        echo ""
        echo "命令说明:"
        echo "  up      - 启动容器 (国际版)"
        echo "  up-cn   - 启动容器 (中国优化版)"
        echo "  down    - 停止容器"
        echo "  logs    - 查看日志"
        echo "  ps      - 查看状态"
        echo "  restart - 重启容器"
        echo "  build   - 重新构建"
        exit 1
        ;;
esac

echo "✅ 操作完成!"