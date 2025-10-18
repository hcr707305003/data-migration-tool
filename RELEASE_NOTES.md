# Data Migration Tool v1.0.2

## 🔧 修复版本

修复了CI/CD权限问题，现在可以正常自动构建和发布。

### 🐛 修复内容
- 修复GitHub Actions权限问题，解决"Resource not accessible by integration"错误
- 优化发布流程，确保构建产物能正确上传到Release
- 改进一键发布脚本的网络错误处理

## ✨ 主要特性

### 🚀 核心功能
- **多表并发迁移** - 支持同时迁移多个表，大幅提升迁移效率
- **实时进度跟踪** - 可视化迁移进度，实时监控任务状态
- **数据库支持** - 支持 MySQL 和 PostgreSQL 数据库
- **跨平台支持** - 提供 Linux、Windows、macOS 多平台构建版本

### 🛡️ 数据安全
- **数据脱敏** - 内置多种脱敏规则，保护敏感数据
- **过滤条件** - 灵活的数据过滤机制，精确控制迁移范围
- **重复数据处理** - 多种策略处理重复数据冲突

### 🎯 用户体验
- **Web管理界面** - 现代化的响应式Web界面
- **智能提示** - MySQL函数自动完成，支持模糊匹配和大小写不敏感
- **任务管理** - 完整的任务生命周期管理
- **配置模板** - 可重用的过滤和脱敏模板

### ⚡ 性能优化
- **并发控制** - 可配置的并发级别，平衡性能和资源使用
- **批量处理** - 智能批量数据处理，优化内存使用
- **连接池** - 高效的数据库连接管理

## 📦 下载

选择适合您操作系统的版本：

- **Linux (AMD64)**: `data-migration-tool-linux-amd64.tar.gz`
- **Linux (ARM64)**: `data-migration-tool-linux-arm64.tar.gz`
- **Windows (AMD64)**: `data-migration-tool-windows-amd64.zip`
- **macOS (Intel)**: `data-migration-tool-darwin-amd64.tar.gz`
- **macOS (Apple Silicon)**: `data-migration-tool-darwin-arm64.tar.gz`

## 🚀 快速开始

1. 下载对应平台的二进制文件
2. 解压到目标目录
3. 运行程序：`./data-migration-tool`
4. 打开浏览器访问：`http://localhost:8080`

## 📋 系统要求

- **操作系统**: Linux, Windows, macOS
- **内存**: 最小 512MB，推荐 2GB+
- **数据库**: MySQL 5.7+ 或 PostgreSQL 12+

## 🔧 配置

程序支持通过环境变量进行配置：

```bash
PORT=8080                    # Web服务端口
DEFAULT_BATCH_SIZE=1000      # 默认批处理大小
MAX_CONCURRENT_TASKS=3       # 最大并发任务数
MAX_CONCURRENT_TABLES=2      # 每任务最大并发表数
MAX_CONCURRENT_BATCH=4       # 每表最大并发批次数
```

## 📚 文档

- [用户手册](README.md)
- [构建指南](BUILD.md)
- [脱敏指南](MASKING_GUIDE.md)

## 🐛 问题反馈

如果您遇到任何问题或有功能建议，请在 [GitHub Issues](https://github.com/hcr707305003/data-migration-tool/issues) 中提交。

## 📄 许可证

本项目采用 MIT 许可证，详见 [LICENSE](LICENSE) 文件。

---

**感谢使用数据迁移工具！** 🙏