@echo off
chcp 65001 >nul
echo Building Data Migration Tool for Multiple Platforms...
echo 正在为多个平台构建数据迁移工具...

REM 版本信息
set VERSION=1.2.0
set BUILD_DATE=%date:~0,4%-%date:~5,2%-%date:~8,2%

REM 获取Git提交信息
set GIT_COMMIT=unknown
git rev-parse --short HEAD >nul 2>&1
if %errorlevel% == 0 (
    for /f %%i in ('git rev-parse --short HEAD') do set GIT_COMMIT=%%i
)

echo.
echo [INFO] Release build configuration:
echo [信息] 发布构建配置:
echo   Version: %VERSION%
echo   版本: %VERSION%
echo   Build Date: %BUILD_DATE%
echo   构建日期: %BUILD_DATE%
echo   Git Commit: %GIT_COMMIT%
echo   Git提交: %GIT_COMMIT%
echo.

REM 创建发布目录
if exist "releases" rmdir /s /q "releases"
mkdir releases

REM 设置通用构建参数
set CGO_ENABLED=0
set LDFLAGS=-w -s

echo [BUILD] Building for multiple platforms...
echo [构建] 正在为多个平台构建...
echo.

REM Windows x64
echo [1/5] Building Windows x64...
echo [1/5] 正在构建 Windows x64...
set GOOS=windows
set GOARCH=amd64
go build -ldflags "%LDFLAGS%" -o releases\data-migration-tool-windows-amd64.exe .
if %errorlevel% == 0 (
    echo   [OK] Windows x64 build completed
    echo   [完成] Windows x64 构建完成
) else (
    echo   [ERROR] Windows x64 build failed
    echo   [错误] Windows x64 构建失败
)

REM Linux x64
echo [2/5] Building Linux x64...
echo [2/5] 正在构建 Linux x64...
set GOOS=linux
set GOARCH=amd64
go build -ldflags "%LDFLAGS%" -o releases\data-migration-tool-linux-amd64 .
if %errorlevel% == 0 (
    echo   [OK] Linux x64 build completed
    echo   [完成] Linux x64 构建完成
) else (
    echo   [ERROR] Linux x64 build failed
    echo   [错误] Linux x64 构建失败
)

REM Linux ARM64
echo [3/5] Building Linux ARM64...
echo [3/5] 正在构建 Linux ARM64...
set GOOS=linux
set GOARCH=arm64
go build -ldflags "%LDFLAGS%" -o releases\data-migration-tool-linux-arm64 .
if %errorlevel% == 0 (
    echo   [OK] Linux ARM64 build completed
    echo   [完成] Linux ARM64 构建完成
) else (
    echo   [ERROR] Linux ARM64 build failed
    echo   [错误] Linux ARM64 构建失败
)

REM macOS x64
echo [4/5] Building macOS x64...
echo [4/5] 正在构建 macOS x64...
set GOOS=darwin
set GOARCH=amd64
go build -ldflags "%LDFLAGS%" -o releases\data-migration-tool-darwin-amd64 .
if %errorlevel% == 0 (
    echo   [OK] macOS x64 build completed
    echo   [完成] macOS x64 构建完成
) else (
    echo   [ERROR] macOS x64 build failed
    echo   [错误] macOS x64 构建失败
)

REM macOS ARM64 (Apple Silicon)
echo [5/5] Building macOS ARM64...
echo [5/5] 正在构建 macOS ARM64...
set GOOS=darwin
set GOARCH=arm64
go build -ldflags "%LDFLAGS%" -o releases\data-migration-tool-darwin-arm64 .
if %errorlevel% == 0 (
    echo   [OK] macOS ARM64 build completed
    echo   [完成] macOS ARM64 构建完成
) else (
    echo   [ERROR] macOS ARM64 build failed
    echo   [错误] macOS ARM64 构建失败
)

echo.
echo [PACKAGE] Creating release packages...
echo [打包] 正在创建发布包...

REM 创建Windows发布包
echo Creating Windows package...
echo 正在创建Windows包...
mkdir releases\windows-package
copy releases\data-migration-tool-windows-amd64.exe releases\windows-package\data-migration-tool.exe >nul
copy run.bat releases\windows-package\ >nul
copy run.ps1 releases\windows-package\ >nul
copy STANDALONE_README.md releases\windows-package\README.md >nul
if exist LICENSE copy LICENSE releases\windows-package\ >nul
if exist web xcopy web releases\windows-package\web\ /e /i /q >nul

REM 创建Linux发布包
echo Creating Linux package...
echo 正在创建Linux包...
mkdir releases\linux-package
copy releases\data-migration-tool-linux-amd64 releases\linux-package\data-migration-tool >nul
copy STANDALONE_README.md releases\linux-package\README.md >nul
if exist LICENSE copy LICENSE releases\linux-package\ >nul
if exist web xcopy web releases\linux-package\web\ /e /i /q >nul

REM 创建压缩包
echo Creating ZIP archives...
echo 正在创建ZIP压缩包...
powershell -command "Compress-Archive -Path 'releases\windows-package\*' -DestinationPath 'releases\data-migration-tool-v%VERSION%-windows-x64.zip' -Force"
powershell -command "Compress-Archive -Path 'releases\linux-package\*' -DestinationPath 'releases\data-migration-tool-v%VERSION%-linux-x64.zip' -Force"

REM 创建单独的二进制文件压缩包
powershell -command "Compress-Archive -Path 'releases\data-migration-tool-windows-amd64.exe' -DestinationPath 'releases\data-migration-tool-v%VERSION%-windows-amd64.zip' -Force"
powershell -command "Compress-Archive -Path 'releases\data-migration-tool-linux-amd64' -DestinationPath 'releases\data-migration-tool-v%VERSION%-linux-amd64.zip' -Force"
powershell -command "Compress-Archive -Path 'releases\data-migration-tool-linux-arm64' -DestinationPath 'releases\data-migration-tool-v%VERSION%-linux-arm64.zip' -Force"
powershell -command "Compress-Archive -Path 'releases\data-migration-tool-darwin-amd64' -DestinationPath 'releases\data-migration-tool-v%VERSION%-darwin-amd64.zip' -Force"
powershell -command "Compress-Archive -Path 'releases\data-migration-tool-darwin-arm64' -DestinationPath 'releases\data-migration-tool-v%VERSION%-darwin-arm64.zip' -Force"

echo.
echo [SUCCESS] Multi-platform build completed!
echo [成功] 多平台构建完成！
echo.
echo [FILES] Generated files:
echo [文件] 生成的文件:
echo.
echo Binary files (二进制文件):
dir releases\*.exe releases\data-migration-tool-* | findstr /v "Directory"
echo.
echo Package files (发布包):
dir releases\*.zip | findstr /v "Directory"
echo.
echo [GITHUB] Ready for GitHub Releases:
echo [GITHUB] 准备用于GitHub发布:
echo   1. Upload all ZIP files to GitHub Releases
echo      将所有ZIP文件上传到GitHub Releases
echo   2. Use the following release notes template:
echo      使用以下发布说明模板:
echo.
echo   Release Notes Template:
echo   ## 🚀 Data Migration Tool v%VERSION%
echo   ### 📦 Downloads
echo   - Windows x64: data-migration-tool-v%VERSION%-windows-x64.zip
echo   - Linux x64: data-migration-tool-v%VERSION%-linux-x64.zip  
echo   - Binary only: data-migration-tool-v%VERSION%-[platform].zip
echo.

pause