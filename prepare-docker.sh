#!/bin/bash

# Docker预启动脚本 - 确保目录权限正确

set -e

echo "🔧 准备Docker环境..."

# 创建必要的目录
mkdir -p data logs

# 获取当前用户信息
CURRENT_USER=$(id -u)
CURRENT_GROUP=$(id -g)

echo "👤 当前用户: $CURRENT_USER:$CURRENT_GROUP"

# 设置目录权限
echo "📁 设置目录权限..."
chmod 755 data logs

# 如果是root用户，给出提示
if [ "$CURRENT_USER" -eq 0 ]; then
    echo "⚠️  检测到root用户，建议使用非root用户运行Docker"
    echo "   容器将自动处理权限问题"
fi

# 检查Docker是否运行
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker未运行，请先启动Docker服务"
    exit 1
fi

# 检查docker compose是否可用
DOCKER_COMPOSE_CMD=""
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE_CMD="docker compose"
    echo "✅ 检测到 Docker Compose V2 (docker compose)"
elif command -v docker-compose >/dev/null 2>&1; then
    DOCKER_COMPOSE_CMD="docker-compose"
    echo "✅ 检测到 Docker Compose V1 (docker-compose)"
else
    echo "❌ Docker Compose未安装，请先安装Docker Compose"
    echo "   安装方法: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker环境准备完成"
echo ""
echo "🚀 现在可以运行以下命令启动服务:"
echo "   $DOCKER_COMPOSE_CMD up -d                    # 国际版"
echo "   $DOCKER_COMPOSE_CMD -f docker-compose.cn.yml up -d  # 中国优化版"
echo ""