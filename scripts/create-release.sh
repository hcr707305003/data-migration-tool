#!/bin/bash

# 创建Release的脚本
# 使用方法: ./scripts/create-release.sh v1.0.0

set -e

VERSION=${1:-v1.0.0}
REPO="hcr707305003/data-migration-tool"

echo "🚀 Creating release $VERSION for $REPO"

# 检查是否有GitHub CLI
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed."
    echo "📝 Please create the release manually at:"
    echo "   https://github.com/$REPO/releases/new"
    echo "   Tag: $VERSION"
    echo "   Title: Data Migration Tool $VERSION"
    echo "   Description: Copy content from RELEASE_NOTES.md"
    exit 1
fi

# 使用GitHub CLI创建Release
echo "📝 Creating release with GitHub CLI..."

gh release create "$VERSION" \
    --title "Data Migration Tool $VERSION" \
    --notes-file RELEASE_NOTES.md \
    --repo "$REPO"

echo "✅ Release $VERSION created successfully!"
echo "🔗 View at: https://github.com/$REPO/releases/tag/$VERSION"