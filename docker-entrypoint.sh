#!/bin/sh

# Docker容器启动脚本 - 自动处理权限问题

set -e

# 获取挂载目录的所有者信息
DATA_DIR_UID=$(stat -c %u /app/data 2>/dev/null || echo "1001")
DATA_DIR_GID=$(stat -c %g /app/data 2>/dev/null || echo "1001")
LOGS_DIR_UID=$(stat -c %u /app/logs 2>/dev/null || echo "1001")
LOGS_DIR_GID=$(stat -c %g /app/logs 2>/dev/null || echo "1001")

echo "🐳 容器启动中..."
echo "📁 数据目录权限: UID=$DATA_DIR_UID, GID=$DATA_DIR_GID"
echo "📋 日志目录权限: UID=$LOGS_DIR_UID, GID=$LOGS_DIR_GID"

# 如果当前用户不是目录所有者，尝试调整权限
CURRENT_UID=$(id -u)
CURRENT_GID=$(id -g)

if [ "$CURRENT_UID" != "$DATA_DIR_UID" ] || [ "$CURRENT_GID" != "$DATA_DIR_GID" ]; then
    echo "⚠️  检测到权限不匹配，尝试调整..."
    
    # 确保目录存在且可写
    if [ -w /app/data ] && [ -w /app/logs ]; then
        echo "✅ 目录权限正常"
    else
        echo "❌ 目录权限不足，请检查挂载目录权限"
        echo "💡 建议在宿主机执行: sudo chown -R \$(id -u):\$(id -g) data logs"
    fi
fi

# 确保必要的目录存在
mkdir -p /app/data /app/logs

# 设置合理的权限（需要在切换用户前执行）
if [ "$(id -u)" = "0" ]; then
    # 如果是root用户，设置权限后切换到appuser
    chmod 755 /app/data /app/logs
    chown -R appuser:appgroup /app/data /app/logs
    echo "🔧 已设置目录权限为appuser用户"
    # 切换到appuser执行主程序
    exec su-exec appuser "$@"
else
    # 非root用户，尝试设置权限
    chmod 755 /app/data /app/logs 2>/dev/null || echo "⚠️  无法设置目录权限，使用现有权限"
fi

echo "🚀 启动应用程序..."
echo "🌐 访问地址: http://localhost:8080"

# 启动主程序
exec "$@"