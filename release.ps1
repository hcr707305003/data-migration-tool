# 一键发布脚本 - PowerShell版本
# 使用方法: .\release.ps1 -Version "v1.0.1" -Message "Bug fixes and improvements"

param(
    [Parameter(Mandatory=$true)]
    [string]$Version,
    
    [string]$Message = "Release $Version",
    [string]$Repo = "hcr707305003/data-migration-tool",
    [string]$Branch = "main"
)

Write-Host "🚀 Starting release process for $Version" -ForegroundColor Green

# 检查工作目录是否干净
Write-Host "📋 Checking working directory..." -ForegroundColor Yellow
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "❌ Working directory is not clean. Please commit or stash changes first." -ForegroundColor Red
    Write-Host "Uncommitted changes:" -ForegroundColor Red
    git status --short
    exit 1
}
Write-Host "✅ Working directory is clean" -ForegroundColor Green

# 确保在正确的分支上
Write-Host "📋 Checking current branch..." -ForegroundColor Yellow
$currentBranch = git branch --show-current
if ($currentBranch -ne $Branch) {
    Write-Host "❌ Not on $Branch branch. Current branch: $currentBranch" -ForegroundColor Red
    $switch = Read-Host "Switch to $Branch branch? (y/N)"
    if ($switch -eq 'y' -or $switch -eq 'Y') {
        git checkout $Branch
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Failed to switch to $Branch branch" -ForegroundColor Red
            exit 1
        }
    } else {
        exit 1
    }
}
Write-Host "✅ On $Branch branch" -ForegroundColor Green

# 拉取最新代码
Write-Host "📋 Pulling latest changes..." -ForegroundColor Yellow
git pull origin $Branch
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to pull latest changes" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Latest changes pulled" -ForegroundColor Green

# 检查标签是否已存在
Write-Host "📋 Checking if tag exists..." -ForegroundColor Yellow
$tagExists = git tag -l $Version
if ($tagExists) {
    Write-Host "❌ Tag $Version already exists" -ForegroundColor Red
    $overwrite = Read-Host "Delete existing tag and continue? (y/N)"
    if ($overwrite -eq 'y' -or $overwrite -eq 'Y') {
        # 删除本地标签
        git tag -d $Version
        # 删除远程标签
        git push --delete origin $Version 2>$null
        Write-Host "✅ Existing tag deleted" -ForegroundColor Green
    } else {
        exit 1
    }
}

# 创建标签
Write-Host "📋 Creating tag $Version..." -ForegroundColor Yellow
git tag -a $Version -m $Message
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to create tag" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Tag $Version created" -ForegroundColor Green

# 推送标签
Write-Host "📋 Pushing tag to GitHub..." -ForegroundColor Yellow
git push origin $Version
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to push tag" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Tag pushed to GitHub" -ForegroundColor Green

# 检查GitHub CLI
Write-Host "📋 Checking GitHub CLI..." -ForegroundColor Yellow
try {
    $ghVersion = gh --version 2>$null
    Write-Host "✅ GitHub CLI found" -ForegroundColor Green
} catch {
    Write-Host "❌ GitHub CLI not found. Please install GitHub CLI first." -ForegroundColor Red
    Write-Host "📝 Manual steps:" -ForegroundColor Yellow
    Write-Host "   1. Go to: https://github.com/$Repo/releases/new" -ForegroundColor Cyan
    Write-Host "   2. Select tag: $Version" -ForegroundColor Cyan
    Write-Host "   3. Title: Data Migration Tool $Version" -ForegroundColor Cyan
    Write-Host "   4. Copy content from RELEASE_NOTES.md" -ForegroundColor Cyan
    Write-Host "   5. Publish release" -ForegroundColor Cyan
    exit 1
}

# 检查GitHub CLI认证
Write-Host "📋 Checking GitHub authentication..." -ForegroundColor Yellow
$authStatus = gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Not authenticated with GitHub CLI" -ForegroundColor Red
    Write-Host "📝 Please run: gh auth login" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ GitHub CLI authenticated" -ForegroundColor Green

# 检查Release Notes
if (-not (Test-Path "RELEASE_NOTES.md")) {
    Write-Host "⚠️  RELEASE_NOTES.md not found, creating basic release notes..." -ForegroundColor Yellow
    $basicNotes = @"
# Data Migration Tool $Version

## Changes
$Message

## Download
Choose the appropriate version for your platform:
- Linux (AMD64): data-migration-tool-linux-amd64.tar.gz
- Linux (ARM64): data-migration-tool-linux-arm64.tar.gz  
- Windows (AMD64): data-migration-tool-windows-amd64.zip
- macOS (Intel): data-migration-tool-darwin-amd64.tar.gz
- macOS (Apple Silicon): data-migration-tool-darwin-arm64.tar.gz

## Quick Start
1. Download and extract the appropriate package
2. Run the executable or use the provided startup script
3. Open http://localhost:8080 in your browser
"@
    $basicNotes | Out-File -FilePath "RELEASE_NOTES.md" -Encoding UTF8
}

# 创建GitHub Release
Write-Host "📋 Creating GitHub Release..." -ForegroundColor Yellow
try {
    gh release create $Version `
        --title "Data Migration Tool $Version" `
        --notes-file RELEASE_NOTES.md `
        --repo $Repo
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ GitHub Release created successfully!" -ForegroundColor Green
        Write-Host "🔗 Release URL: https://github.com/$Repo/releases/tag/$Version" -ForegroundColor Cyan
        Write-Host "⏳ CI/CD pipeline is now running..." -ForegroundColor Yellow
        Write-Host "📦 Build artifacts will be automatically uploaded to the release" -ForegroundColor Yellow
        
        # 等待一下然后检查CI状态
        Write-Host "📋 Checking CI/CD status..." -ForegroundColor Yellow
        Start-Sleep -Seconds 10
        
        try {
            $runs = gh run list --repo $Repo --limit 1 --json status,conclusion,url
            $latestRun = $runs | ConvertFrom-Json | Select-Object -First 1
            
            if ($latestRun) {
                Write-Host "📊 Latest CI/CD run status: $($latestRun.status)" -ForegroundColor Cyan
                Write-Host "🔗 Monitor progress: $($latestRun.url)" -ForegroundColor Cyan
            }
        } catch {
            Write-Host "ℹ️  Check CI/CD progress at: https://github.com/$Repo/actions" -ForegroundColor Cyan
        }
        
        Write-Host ""
        Write-Host "🎉 Release process completed!" -ForegroundColor Green
        Write-Host "📋 Next steps:" -ForegroundColor Yellow
        Write-Host "   1. Monitor CI/CD pipeline completion" -ForegroundColor White
        Write-Host "   2. Verify build artifacts are uploaded to release" -ForegroundColor White
        Write-Host "   3. Test downloaded packages" -ForegroundColor White
        
    } else {
        Write-Host "❌ Failed to create GitHub Release" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error creating GitHub Release: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✨ All done! Release $Version is live!" -ForegroundColor Green