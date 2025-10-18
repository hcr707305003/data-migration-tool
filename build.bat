@echo off
chcp 65001 >nul
echo Building Data Migration Tool...
echo 正在构建数据迁移工具...

REM 设置构建参数
set GOOS=windows
set GOARCH=amd64
set CGO_ENABLED=0

echo.
echo [INFO] Build configuration:
echo [信息] 构建配置:
echo   Target: Windows x64
echo   目标: Windows x64
echo.

REM Create build directory
if not exist "build" mkdir build

REM Build exe file with basic optimization
echo [BUILD] Compiling...
echo [构建] 正在编译...
go build -ldflags "-w -s" -o build\data-migration-tool.exe .

if %errorlevel% == 0 (
    echo.
    echo [SUCCESS] Build completed successfully!
    echo [成功] 构建成功！
    echo Output file: build/data-migration-tool.exe
    echo 输出文件: build/data-migration-tool.exe
    echo.
    echo [FILE SIZE] File size:
    echo [文件大小] 文件大小:
    dir build\data-migration-tool.exe | findstr data-migration-tool.exe
    echo.
    echo [USAGE] How to use:
    echo [使用方法] 使用方法:
    echo    1. Copy build/data-migration-tool.exe to target directory
    echo       将 build/data-migration-tool.exe 复制到目标目录
    echo    2. Double-click to run or execute in command line
    echo       双击运行或在命令行中执行
    echo    3. Program will automatically create ./data directory and config files
    echo       程序会自动创建 ./data 目录和配置文件
    echo    4. Open browser and visit http://localhost:8080
    echo       打开浏览器访问 http://localhost:8080
    echo.
) else (
    echo.
    echo [ERROR] Build failed!
    echo [错误] 构建失败！
    echo Please check if Go environment and dependencies are correctly installed
    echo 请检查Go环境和依赖是否正确安装
    pause
    exit /b 1
)

pause