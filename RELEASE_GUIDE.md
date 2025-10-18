# 一键发布指南

本项目提供了自动化的发布脚本，可以一键完成：
1. 创建Git标签
2. 推送标签到GitHub
3. 创建GitHub Release
4. 触发CI/CD流水线
5. 自动构建并上传发布包

## 前置要求

### 1. 安装GitHub CLI
- **Windows**: 下载安装 https://cli.github.com/
- **macOS**: `brew install gh`
- **Linux**: 参考 https://github.com/cli/cli/blob/trunk/docs/install_linux.md

### 2. 认证GitHub CLI
```bash
gh auth login
```
按提示完成认证流程。

### 3. 确保工作目录干净
提交所有更改：
```bash
git add .
git commit -m "Prepare for release"
git push
```

## 使用方法

### Windows (PowerShell)
```powershell
# 基本用法
.\release.ps1 -Version "v1.0.1"

# 带自定义消息
.\release.ps1 -Version "v1.0.1" -Message "Bug fixes and performance improvements"

# 完整参数
.\release.ps1 -Version "v1.0.1" -Message "Release notes" -Repo "hcr707305003/data-migration-tool" -Branch "main"
```

### Linux/macOS (Bash)
```bash
# 设置执行权限（仅首次）
chmod +x release.sh

# 基本用法
./release.sh v1.0.1

# 带自定义消息
./release.sh v1.0.1 "Bug fixes and performance improvements"
```

## 脚本功能

### 自动检查
- ✅ 工作目录是否干净
- ✅ 当前分支是否正确
- ✅ 是否有未提交的更改
- ✅ GitHub CLI是否安装和认证
- ✅ 标签是否已存在

### 自动操作
- 🏷️ 创建Git标签
- 📤 推送标签到GitHub
- 📋 创建GitHub Release
- 🚀 触发CI/CD流水线
- 📦 等待构建完成并上传发布包

### 错误处理
- 🔍 详细的错误提示
- 🛡️ 安全检查防止意外操作
- 🔄 支持覆盖已存在的标签
- 📝 自动生成基础Release Notes

## 发布流程

1. **准备代码**
   ```bash
   git add .
   git commit -m "Prepare for v1.0.1 release"
   git push
   ```

2. **执行发布脚本**
   ```bash
   # Windows
   .\release.ps1 -Version "v1.0.1" -Message "New features and bug fixes"
   
   # Linux/macOS
   ./release.sh v1.0.1 "New features and bug fixes"
   ```

3. **监控CI/CD**
   - 脚本会显示CI/CD流水线链接
   - 等待构建完成（通常5-10分钟）
   - 验证发布包已上传到Release

4. **验证发布**
   - 访问 GitHub Release 页面
   - 下载并测试发布包
   - 确认所有平台的包都正常

## 发布包内容

每个Release会自动生成以下文件：
- `data-migration-tool-linux-amd64.tar.gz` - Linux AMD64
- `data-migration-tool-linux-arm64.tar.gz` - Linux ARM64
- `data-migration-tool-windows-amd64.zip` - Windows AMD64
- `data-migration-tool-darwin-amd64.tar.gz` - macOS Intel
- `data-migration-tool-darwin-arm64.tar.gz` - macOS Apple Silicon

## 故障排除

### GitHub CLI未认证
```bash
gh auth login
```

### 标签已存在
脚本会提示是否删除现有标签，选择 `y` 继续。

### CI/CD失败
1. 检查GitHub Actions页面
2. 查看构建日志
3. 修复问题后重新运行脚本

### 手动创建Release
如果脚本失败，可以手动操作：
1. 访问 https://github.com/hcr707305003/data-migration-tool/releases/new
2. 选择已推送的标签
3. 填写Release信息
4. 发布Release

## 版本号规范

建议使用语义化版本号：
- `v1.0.0` - 主要版本
- `v1.0.1` - 补丁版本
- `v1.1.0` - 次要版本
- `v2.0.0` - 重大更新

## 示例

```bash
# 发布补丁版本
./release.sh v1.0.1 "Fix database connection issues"

# 发布功能版本  
./release.sh v1.1.0 "Add PostgreSQL support and new UI features"

# 发布主要版本
./release.sh v2.0.0 "Major rewrite with breaking changes"
```

发布完成后，用户就可以从GitHub Release页面下载对应平台的可执行文件包了！