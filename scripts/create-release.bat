@echo off
REM 创建Release的Windows批处理脚本
REM 使用方法: scripts\create-release.bat v1.0.0

setlocal enabledelayedexpansion

set VERSION=%1
if "%VERSION%"=="" set VERSION=v1.0.0

set REPO=hcr707305003/data-migration-tool

echo 🚀 Creating release %VERSION% for %REPO%

REM 检查是否有GitHub CLI
gh --version >nul 2>&1
if errorlevel 1 (
    echo ❌ GitHub CLI (gh) is not installed.
    echo 📝 Please create the release manually at:
    echo    https://github.com/%REPO%/releases/new
    echo    Tag: %VERSION%
    echo    Title: Data Migration Tool %VERSION%
    echo    Description: Copy content from RELEASE_NOTES.md
    pause
    exit /b 1
)

REM 使用GitHub CLI创建Release
echo 📝 Creating release with GitHub CLI...

gh release create "%VERSION%" ^
    --title "Data Migration Tool %VERSION%" ^
    --notes-file RELEASE_NOTES.md ^
    --repo "%REPO%"

if errorlevel 1 (
    echo ❌ Failed to create release
    pause
    exit /b 1
)

echo ✅ Release %VERSION% created successfully!
echo 🔗 View at: https://github.com/%REPO%/releases/tag/%VERSION%
pause