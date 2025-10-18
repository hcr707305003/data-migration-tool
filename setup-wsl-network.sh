#!/bin/bash

# WSL环境下Docker网络配置脚本

set -e

echo "🔧 配置WSL环境下的Docker网络..."

# 检查是否在WSL环境中
if ! grep -q microsoft /proc/version 2>/dev/null; then
    echo "⚠️  当前不在WSL环境中，此脚本专为WSL设计"
    read -p "是否继续？(y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 获取宿主机IP地址
echo "🔍 检测宿主机IP地址..."

# 方法1: 通过路由表获取
HOST_IP=$(ip route show default | awk '/default/ {print $3}' | head -1)

if [ -z "$HOST_IP" ]; then
    # 方法2: 通过DNS解析
    HOST_IP=$(nslookup host.docker.internal | grep 'Address:' | tail -1 | awk '{print $2}')
fi

if [ -z "$HOST_IP" ]; then
    # 方法3: 使用默认网关
    HOST_IP=$(route -n | grep '^0.0.0.0' | awk '{print $2}' | head -1)
fi

if [ -z "$HOST_IP" ]; then
    echo "❌ 无法自动检测宿主机IP地址"
    read -p "请手动输入宿主机IP地址: " HOST_IP
fi

echo "🌐 检测到宿主机IP: $HOST_IP"

# 测试宿主机连接
echo "🔍 测试宿主机连接..."
if ping -c 1 -W 3 "$HOST_IP" >/dev/null 2>&1; then
    echo "✅ 宿主机连接正常"
else
    echo "⚠️  无法ping通宿主机，但这可能是正常的（防火墙阻止ping）"
fi

# 测试常见数据库端口
echo "🔍 检测宿主机数据库服务..."

check_port() {
    local port=$1
    local service=$2
    if timeout 3 bash -c "</dev/tcp/$HOST_IP/$port" 2>/dev/null; then
        echo "✅ $service (端口 $port) 可访问"
        return 0
    else
        echo "❌ $service (端口 $port) 不可访问"
        return 1
    fi
}

# 检查MySQL
check_port 3306 "MySQL"
MYSQL_AVAILABLE=$?

# 检查PostgreSQL
check_port 5432 "PostgreSQL"
POSTGRES_AVAILABLE=$?

# 生成配置建议
echo ""
echo "📋 配置建议："
echo "=============="

if [ $MYSQL_AVAILABLE -eq 0 ]; then
    echo "✅ MySQL配置:"
    echo "   主机: $HOST_IP 或 host.docker.internal"
    echo "   端口: 3306"
    echo "   在应用中使用: host.docker.internal:3306"
fi

if [ $POSTGRES_AVAILABLE -eq 0 ]; then
    echo "✅ PostgreSQL配置:"
    echo "   主机: $HOST_IP 或 host.docker.internal"  
    echo "   端口: 5432"
    echo "   在应用中使用: host.docker.internal:5432"
fi

echo ""
echo "🐳 Docker Compose使用建议："
echo "================================"
echo "# WSL环境（推荐）"
echo "docker-compose -f docker-compose.wsl.yml up -d"
echo ""
echo "# 或者使用host网络模式"
echo "docker-compose up -d"
echo ""

# 创建.env配置示例
cat > .env.wsl << EOF
# WSL环境下的数据库连接配置

# Web服务配置
PORT=8080

# 数据目录
DATA_DIR=./data
LOG_DIR=./logs

# 并发配置
MAX_CONCURRENT_TASKS=3
MAX_CONCURRENT_TABLES=2
MAX_CONCURRENT_BATCH=4

# 性能配置
DEFAULT_BATCH_SIZE=1000
CONNECTION_TIMEOUT=30
QUERY_TIMEOUT=300

# 宿主机数据库连接（WSL环境）
# MySQL示例
MYSQL_HOST=host.docker.internal
MYSQL_PORT=3306

# PostgreSQL示例  
POSTGRES_HOST=host.docker.internal
POSTGRES_PORT=5432

# 检测到的宿主机IP（备用）
HOST_IP=$HOST_IP
EOF

echo "📄 已创建 .env.wsl 配置文件，包含WSL环境的数据库连接配置"
echo ""
echo "🚀 现在可以启动服务:"
echo "   cp .env.wsl .env"
echo "   docker-compose -f docker-compose.wsl.yml up -d"
echo ""
echo "✅ WSL网络配置完成!"