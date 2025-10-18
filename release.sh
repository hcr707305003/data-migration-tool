#!/bin/bash

# 一键发布脚本 - Bash版本
# 使用方法: ./release.sh v1.0.1 "Bug fixes and improvements"

set -e

VERSION=${1}
MESSAGE=${2:-"Release $VERSION"}
REPO="hcr707305003/data-migration-tool"
BRANCH="main"

if [ -z "$VERSION" ]; then
    echo "❌ Usage: $0 <version> [message]"
    echo "   Example: $0 v1.0.1 'Bug fixes and improvements'"
    exit 1
fi

echo "🚀 Starting release process for $VERSION"

# 检查工作目录是否干净
echo "📋 Checking working directory..."
if [ -n "$(git status --porcelain)" ]; then
    echo "❌ Working directory is not clean. Please commit or stash changes first."
    echo "Uncommitted changes:"
    git status --short
    exit 1
fi
echo "✅ Working directory is clean"

# 确保在正确的分支上
echo "📋 Checking current branch..."
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "$BRANCH" ]; then
    echo "❌ Not on $BRANCH branch. Current branch: $CURRENT_BRANCH"
    read -p "Switch to $BRANCH branch? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git checkout $BRANCH
    else
        exit 1
    fi
fi
echo "✅ On $BRANCH branch"

# 拉取最新代码
echo "📋 Pulling latest changes..."
git pull origin $BRANCH
echo "✅ Latest changes pulled"

# 检查标签是否已存在
echo "📋 Checking if tag exists..."
if git tag -l | grep -q "^$VERSION$"; then
    echo "❌ Tag $VERSION already exists"
    read -p "Delete existing tag and continue? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # 删除本地标签
        git tag -d $VERSION
        # 删除远程标签
        git push --delete origin $VERSION 2>/dev/null || true
        echo "✅ Existing tag deleted"
    else
        exit 1
    fi
fi

# 创建标签
echo "📋 Creating tag $VERSION..."
git tag -a $VERSION -m "$MESSAGE"
echo "✅ Tag $VERSION created"

# 推送标签
echo "📋 Pushing tag to GitHub..."
git push origin $VERSION
echo "✅ Tag pushed to GitHub"

# 检查GitHub CLI
echo "📋 Checking GitHub CLI..."
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI not found. Please install GitHub CLI first."
    echo "📝 Manual steps:"
    echo "   1. Go to: https://github.com/$REPO/releases/new"
    echo "   2. Select tag: $VERSION"
    echo "   3. Title: Data Migration Tool $VERSION"
    echo "   4. Copy content from RELEASE_NOTES.md"
    echo "   5. Publish release"
    exit 1
fi
echo "✅ GitHub CLI found"

# 检查GitHub CLI认证
echo "📋 Checking GitHub authentication..."
if ! gh auth status &>/dev/null; then
    echo "❌ Not authenticated with GitHub CLI"
    echo "📝 Please run: gh auth login"
    exit 1
fi
echo "✅ GitHub CLI authenticated"

# 检查Release Notes
if [ ! -f "RELEASE_NOTES.md" ]; then
    echo "⚠️  RELEASE_NOTES.md not found, creating basic release notes..."
    cat > RELEASE_NOTES.md << EOF
# Data Migration Tool $VERSION

## Changes
$MESSAGE

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
EOF
fi

# 创建GitHub Release
echo "📋 Creating GitHub Release..."
if gh release create "$VERSION" \
    --title "Data Migration Tool $VERSION" \
    --notes-file RELEASE_NOTES.md \
    --repo "$REPO"; then
    
    echo "✅ GitHub Release created successfully!"
    echo "🔗 Release URL: https://github.com/$REPO/releases/tag/$VERSION"
    echo "⏳ CI/CD pipeline is now running..."
    echo "📦 Build artifacts will be automatically uploaded to the release"
    
    # 等待一下然后检查CI状态
    echo "📋 Checking CI/CD status..."
    sleep 10
    
    if command -v jq &> /dev/null; then
        LATEST_RUN=$(gh run list --repo "$REPO" --limit 1 --json status,conclusion,url 2>/dev/null | jq -r '.[0] // empty')
        if [ -n "$LATEST_RUN" ]; then
            STATUS=$(echo "$LATEST_RUN" | jq -r '.status // "unknown"')
            URL=$(echo "$LATEST_RUN" | jq -r '.url // ""')
            echo "📊 Latest CI/CD run status: $STATUS"
            [ -n "$URL" ] && echo "🔗 Monitor progress: $URL"
        fi
    else
        echo "ℹ️  Check CI/CD progress at: https://github.com/$REPO/actions"
    fi
    
    echo ""
    echo "🎉 Release process completed!"
    echo "📋 Next steps:"
    echo "   1. Monitor CI/CD pipeline completion"
    echo "   2. Verify build artifacts are uploaded to release"
    echo "   3. Test downloaded packages"
    
else
    echo "❌ Failed to create GitHub Release"
    exit 1
fi

echo ""
echo "✨ All done! Release $VERSION is live!"