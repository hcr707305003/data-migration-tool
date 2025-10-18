@echo off
chcp 65001 >nul

REM Docker启动脚本 - Windows版本
REM 使用方法: docker-start.bat [up|down|logs|ps]

setlocal enabledelayedexpansion

REM 创建必要的目录
if not exist "data" mkdir data
if not exist "logs" mkdir logs

REM Windows下使用默认用户ID
set UID=1001
set GID=1001

echo 🐳 使用用户ID: %UID%, 组ID: %GID%

REM 根据参数执行不同操作
set ACTION=%1
if "%ACTION%"=="" set ACTION=up

if "%ACTION%"=="up" (
    echo 🚀 启动Docker容器...
    docker-compose up -d
) else if "%ACTION%"=="up-cn" (
    echo 🚀 启动Docker容器 ^(中国优化版^)...
    docker-compose -f docker-compose.cn.yml up -d
) else if "%ACTION%"=="down" (
    echo 🛑 停止Docker容器...
    docker-compose down
) else if "%ACTION%"=="logs" (
    echo 📋 查看日志...
    docker-compose logs -f
) else if "%ACTION%"=="ps" (
    echo 📊 查看容器状态...
    docker-compose ps
) else if "%ACTION%"=="restart" (
    echo 🔄 重启容器...
    docker-compose restart
) else if "%ACTION%"=="build" (
    echo 🔨 重新构建镜像...
    docker-compose build --no-cache
) else (
    echo 使用方法: %0 [up^|up-cn^|down^|logs^|ps^|restart^|build]
    echo.
    echo 命令说明:
    echo   up      - 启动容器 ^(国际版^)
    echo   up-cn   - 启动容器 ^(中国优化版^)
    echo   down    - 停止容器
    echo   logs    - 查看日志
    echo   ps      - 查看状态
    echo   restart - 重启容器
    echo   build   - 重新构建
    pause
    exit /b 1
)

echo ✅ 操作完成!
if "%ACTION%"=="up" (
    echo.
    echo 🌐 访问地址: http://localhost:8080
)
if "%ACTION%"=="up-cn" (
    echo.
    echo 🌐 访问地址: http://localhost:8080
)