# 🚀 数据迁移工具

一个功能强大的 Web 端数据迁移工具，基于 Go 语言开发，支持 MySQL 和 PostgreSQL 之间的高效数据迁移。具备完善的过滤条件、数据脱敏、任务管理和实时监控功能。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Go Version](https://img.shields.io/badge/go-%3E%3D1.21-blue.svg)
![Database](https://img.shields.io/badge/database-MySQL%20%7C%20PostgreSQL-green.svg)

**中文** | [English](README_EN.md)

## ✨ 功能特性

### 🎯 核心功能

- **🔄 多表迁移**: 支持选择多张表进行批量迁移，一次性完成复杂的数据迁移任务
- **🔍 智能过滤**: 每张表可定义多个 WHERE 条件，支持复杂的数据筛选逻辑
- **📋 过滤模板**: 创建可复用的条件模板，提高配置效率
- **🛡️ 数据脱敏**: 内置多种脱敏规则，保护敏感数据安全
- **💾 多数据库支持**: 支持 MySQL、PostgreSQL，轻松实现跨数据库迁移
- **📊 任务管理**: 完整的任务生命周期管理，支持草稿、运行、暂停、完成等状态

### 🚀 高级特性

- **⚡ 并发处理**: 支持多任务、多表、多批次并发执行，大幅提升迁移效率
- **📈 实时监控**: 任务执行进度实时显示，支持详细的统计信息
- **🔧 灵活配置**: 支持重复数据处理策略、表处理策略等多种配置选项
- **📝 详细日志**: 完善的错误处理和日志记录，便于问题排查
- **🎨 现代 UI**: 响应式 Web 界面，支持批量操作、搜索过滤等便捷功能
- **🔒 生成列支持**: 智能识别并跳过数据库生成列，避免插入错误

### 🛠️ 技术特性

- **📄 JSON 存储**: 轻量级 JSON 文件存储，无需额外数据库依赖
- **🔄 状态缓存**: 智能的连接状态缓存机制，提升用户体验
- **🎯 批量处理**: 可配置的批处理大小，平衡性能与内存使用
- **🔐 安全设计**: 防 SQL 注入，密码加密存储，安全可靠

## 📁 项目结构

```
data-migration-tool/
├── main.go                     # 程序入口
├── internal/                   # 内部包
│   ├── api/                    # API路由层
│   ├── config/                 # 配置管理
│   ├── models/                 # 数据模型
│   ├── services/               # 业务逻辑层
│   └── storage/                # 存储层
├── web/                        # Web前端资源
│   ├── templates/              # HTML模板
│   └── static/                 # 静态资源
└── data/                       # 数据存储目录
```

## 🚀 快速开始

### 📋 环境要求

- **Go**: 1.21+ （开发环境）
- **数据库**: MySQL 5.7+ 或 PostgreSQL 10+
- **操作系统**: Windows 10+, Linux (任意发行版), macOS 10.15+
- **内存**: 最少 512MB，推荐 2GB+
- **磁盘空间**: 100MB+
- **网络**: 能够访问源数据库和目标数据库

### 📦 获取程序

#### 方式一：下载预编译版本（推荐）

从 [GitHub Releases](https://github.com/hcr707305003/data-migration-tool/releases) 下载最新版本的压缩包，解压后直接运行。

#### 方式二：从源码构建

### 📦 安装部署

#### 1️⃣ 克隆项目

```bash
git clone <repository-url>
cd data-migration-tool
```

#### 2️⃣ 安装依赖

```bash
go mod tidy
```

#### 3️⃣ 启动服务

**方式一：使用启动脚本（推荐）**

```bash
# Linux/Mac
chmod +x start.sh
./start.sh

# Windows
start.bat
```

**方式二：Docker 部署（推荐生产环境）**

```bash
# 使用Docker Compose（推荐）
docker compose up -d
# 或使用旧版本命令: docker-compose up -d

# 或者直接使用Docker
docker build -t data-migration-tool .
docker run -d \
  --name data-migration-tool \
  -p 8080:8080 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  data-migration-tool

# 启动应用
docker compose up -d
```

**方式三：直接运行**

```bash
go run main.go
```

**方式四：自定义配置**

```bash
export PORT=9090
export STATUS_CHECK_INTERVAL=120
export DATA_DIR=./custom_data
go run main.go
```

#### 4️⃣ 访问应用

打开浏览器访问：`http://localhost:8080`

### 🔨 构建选项

项目提供多种构建脚本：

- **`build.bat`** - 快速构建（Windows）
- **`build-release.bat`** - 多平台发布构建（Windows）
- **`build-release.sh`** - 多平台发布构建（Linux/macOS）

```bash
# 快速构建
./build.bat

# 多平台发布构建
./build-release.bat
```

详见 [构建选项说明](BUILD_OPTIONS.md)

### ⚙️ 环境变量配置

#### 基础配置

| 变量名                  | 默认值 | 说明                     |
| ----------------------- | ------ | ------------------------ |
| `PORT`                  | 8080   | Web 服务端口             |
| `DATA_DIR`              | ./data | 数据存储目录             |
| `LOG_DIR`               | ./logs | 日志存储目录             |
| `STATUS_CHECK_INTERVAL` | 300    | 数据源状态检查间隔（秒） |

#### 并发配置

| 变量名                   | 默认值 | 说明               |
| ------------------------ | ------ | ------------------ |
| `MAX_CONCURRENT_TASKS`   | 3      | 最大并发任务数     |
| `MAX_CONCURRENT_TABLES`  | 2      | 每任务最大并发表数 |
| `MAX_CONCURRENT_BATCHES` | 4      | 每表最大并发批次数 |

#### 性能配置

| 变量名               | 默认值 | 说明               |
| -------------------- | ------ | ------------------ |
| `DEFAULT_BATCH_SIZE` | 1000   | 默认批处理大小     |
| `CONNECTION_TIMEOUT` | 30     | 连接超时时间（秒） |
| `QUERY_TIMEOUT`      | 300    | 查询超时时间（秒） |

#### 配置示例

**方法 1：环境变量**

**Windows:**

```cmd
set PORT=9090
set DATA_DIR=D:\migration-data
set MAX_CONCURRENT_TASKS=5
set MAX_CONCURRENT_TABLES=3
set DEFAULT_BATCH_SIZE=2000
data-migration-tool.exe
```

**Linux/macOS:**

```bash
export PORT=9090
export DATA_DIR=/opt/migration-data
export MAX_CONCURRENT_TASKS=5
export MAX_CONCURRENT_TABLES=3
export DEFAULT_BATCH_SIZE=2000
./data-migration-tool
```

**方法 2：.env 文件（推荐）**

在程序根目录创建 `.env` 文件：

```bash
# Web服务配置
PORT=9090

# 数据目录
DATA_DIR=./data
LOG_DIR=./logs

# 并发配置
MAX_CONCURRENT_TASKS=5
MAX_CONCURRENT_TABLES=3
MAX_CONCURRENT_BATCH=4

# 性能配置
DEFAULT_BATCH_SIZE=2000
CONNECTION_TIMEOUT=30
QUERY_TIMEOUT=300

# 状态检查间隔（秒）
STATUS_CHECK_INTERVAL=300
```

然后直接运行程序：

```bash
# Windows
data-migration-tool.exe

# Linux/macOS
./data-migration-tool
```

## 🐳 用 Docker 部署

### 📦 快速部署

**使用 Docker Compose（推荐）**

```bash
# 准备环境（首次运行）
chmod +x prepare-docker.sh
./prepare-docker.sh

# 启动应用（国际版）
docker compose up -d

# 启动应用（中国优化版）
docker compose -f docker-compose.cn.yml up -d

# 查看日志
docker compose logs -f

# 停止应用
docker compose down
```



**Windows 直接部署**

```cmd
REM 创建目录
mkdir data logs

REM 启动应用
docker compose -f docker-compose.cn.yml up -d
```

**使用 Docker**

```bash
# 构建镜像（国外用户）
docker build -t data-migration-tool .

# 构建镜像（国内用户，使用优化的镜像源）
docker build -f Dockerfile.cn -t data-migration-tool .

# 运行容器
docker run -d \
  --name data-migration-tool \
  -p 8080:8080 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  -e PORT=8080 \
  -e MAX_CONCURRENT_TASKS=3 \
  data-migration-tool
```

### 🔧 Docker 配置

**方法 1：环境变量配置**

```yaml
# docker-compose.yml
environment:
  - PORT=8080
  - DATA_DIR=/app/data
  - LOG_DIR=/app/logs
  - MAX_CONCURRENT_TASKS=3
  - MAX_CONCURRENT_TABLES=2
  - DEFAULT_BATCH_SIZE=1000
```

**方法 2：使用.env 文件（推荐）**

```bash
# 复制示例配置文件
cp .env.docker .env

# 编辑配置
vim .env
```

**数据持久化**

```yaml
# docker-compose.yml
volumes:
  - ./data:/app/data # 数据文件
  - ./logs:/app/logs # 日志文件
  - ./.env:/app/.env:ro # 环境配置文件（只读）
```

### 🔍 Docker 管理命令

```bash
# 查看运行状态
./docker-start.sh ps

# 查看实时日志
./docker-start.sh logs

# 重启服务
./docker-start.sh restart

# 重新构建镜像
./docker-start.sh build

# 手动命令
docker compose ps
docker compose logs -f data-migration-tool
docker compose exec data-migration-tool sh
```

### 🛠️ 常见问题解决

**权限问题：**
容器启动时会自动检测和处理权限问题，无需手动干预。

**网络访问问题：**

```bash
# 问题: 容器无法访问宿主机MySQL/PostgreSQL
# 解决方案: 手动配置宿主机访问
# 在数据源配置中使用: host.docker.internal
# MySQL: host.docker.internal:3306
# PostgreSQL: host.docker.internal:5432

# 问题3: 检查宿主机服务是否可访问
docker exec -it data-migration-tool ping host.docker.internal
docker exec -it data-migration-tool telnet host.docker.internal 3306
```

**其他问题：**

```bash
# 问题4: 数据目录权限不足
./prepare-docker.sh

# 问题5: SELinux权限问题（CentOS/RHEL）
sudo setsebool -P container_manage_cgroup on
sudo chcon -Rt svirt_sandbox_file_t data logs

# 问题6: 查看容器启动日志
docker compose logs data-migration-tool
```

### 🛡️ 生产环境建议

```yaml
# docker-compose.prod.yml
version: "3.8"
services:
  data-migration-tool:
    image: data-migration-tool:latest
    restart: always
    environment:
      - PORT=8080
      - MAX_CONCURRENT_TASKS=5
      - DEFAULT_BATCH_SIZE=2000
    volumes:
      - /opt/migration/data:/app/data
      - /opt/migration/logs:/app/logs
    networks:
      - internal
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: "1.0"
```

## 📖 使用指南

### 📋 使用流程

1. **配置数据源** - 添加 MySQL/PostgreSQL 连接
2. **创建过滤模板** - 设置数据筛选条件（可选）
3. **设置脱敏规则** - 配置敏感数据脱敏（可选）
4. **选择迁移表** - 选择要迁移的表并配置规则
5. **创建迁移任务** - 生成迁移任务
6. **执行任务** - 启动迁移并监控进度

### 主要功能

#### 1️⃣ 数据源管理

- 添加 MySQL/PostgreSQL 数据源
- 连接测试和状态监控
- 支持批量操作

#### 2️⃣ 过滤模板管理

- 创建可复用的 WHERE 条件模板
- 支持多种操作符和逻辑组合
- 提高配置效率

#### 3️⃣ 数据脱敏规则

- 内置多种脱敏规则（手机号、邮箱、身份证等）
- 支持自定义正则表达式脱敏
- 保护敏感数据安全

#### 4️⃣ 迁移任务配置

- 多表批量选择和配置
- 灵活的过滤条件和脱敏规则
- 支持草稿保存和预览

#### 5️⃣ 任务执行与监控

- 实时进度显示和统计信息
- 详细的执行日志
- 支持任务控制（启动、暂停、停止）

## 🎯 使用建议

### 📊 性能优化

- 根据数据量调整批处理大小
- 合理设置并发参数
- 确保相关字段有适当索引

### 🔒 安全建议

- 使用最小权限原则配置数据库账号
- 对敏感字段配置脱敏规则
- 建议在内网环境中部署

### 🧪 测试流程

1. 先用少量数据验证配置
2. 检查脱敏规则效果
3. 评估迁移性能
4. 验证数据完整性

## ⚠️ 注意事项

- **数据安全**: 妥善保护数据库连接信息，建议使用环境变量
- **数据备份**: 迁移前务必备份目标数据库
- **充分测试**: 在测试环境中验证配置后再在生产环境执行
- **资源监控**: 大数据量迁移时注意监控资源使用情况

## 🔧 故障排除

### 常见问题

- **连接失败**: 检查网络连通性、防火墙设置、数据库权限
- **迁移缓慢**: 调整批处理大小、并发参数，检查数据库索引
- **内存不足**: 减少并发数量或批处理大小

### 日志查看

```bash
# 查看应用日志
tail -f logs/app-2025-10-18.log

# 搜索错误信息
grep "ERROR" logs/*.log
```

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

---

**如果这个项目对你有帮助，请给个 ⭐ 支持一下！**

#### Q: 数据库连接失败

**A**: 验证连接信息和网络连通性

```bash
# 测试MySQL连接
mysql -h host -P port -u username -p database

# 测试PostgreSQL连接
psql -h host -p port -U username -d database
```

#### Q: 迁移速度慢

**A**: 调整并发参数和批处理大小

- 增加并发任务数
- 优化批处理大小
- 检查数据库索引
- 监控网络延迟

#### Q: 内存使用过高

**A**: 减少并发数量和批处理大小

```bash
# 设置较小的批处理大小
export DEFAULT_BATCH_SIZE=500
export MAX_CONCURRENT_BATCH=2
```

## 🤝 贡献指南

我们欢迎所有形式的贡献！

### 🎯 贡献方式

- 🐛 **报告 Bug**: 提交详细的问题报告
- 💡 **功能建议**: 提出新功能想法
- 📝 **文档改进**: 完善文档和示例
- 🔧 **代码贡献**: 提交代码修复和新功能
- 🌍 **国际化**: 添加多语言支持
- 🧪 **测试用例**: 编写和改进测试

### 🛠️ 开发环境搭建

```bash
# 1. Fork 并克隆仓库
git clone https://github.com/hcr707305003/data-migration-tool.git
cd data-migration-tool

# 2. 安装依赖
go mod tidy

# 3. 运行开发服务器
go run main.go
```

### 📋 代码规范

- **Go 代码**: 遵循 [Go Code Review Comments](https://github.com/golang/go/wiki/CodeReviewComments)
- **前端代码**: 使用 ESLint 和 Prettier
- **提交信息**: 遵循 [Conventional Commits](https://www.conventionalcommits.org/)
- **文档**: 中英文双语，Markdown 格式

### 🔄 提交流程

1. **创建分支**: `git checkout -b feature/your-feature`
2. **编写代码**: 实现功能并添加测试
3. **运行测试**: 确保所有测试通过
4. **提交代码**: 使用规范的提交信息
5. **创建 PR**: 详细描述变更内容
6. **代码审查**: 响应审查意见
7. **合并代码**: 通过审查后合并

详见 [贡献指南](CONTRIBUTING.md)

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 📈 性能基准

### 🚀 迁移性能

| 数据量 | 表数量 | 迁移时间 | 平均速度 | 并发设置 |
| ------ | ------ | -------- | -------- | -------- |
| 1GB    | 10     | 2 分钟   | 8.3MB/s  | 默认     |
| 10GB   | 50     | 15 分钟  | 11.1MB/s | 优化     |
| 100GB  | 100    | 2 小时   | 13.9MB/s | 高并发   |

### 💾 资源使用

- **内存使用**: 基础 50MB + 批处理缓存
- **CPU 使用**: 单核 20-40%（取决于并发设置）
- **网络带宽**: 主要受数据库连接速度限制
- **磁盘空间**: 日志文件 + 临时缓存

### ⚡ 优化建议

1. **网络优化**: 使用高速网络连接
2. **索引优化**: 在过滤字段上创建索引
3. **批处理调优**: 根据内存大小调整批处理大小
4. **并发控制**: 根据数据库性能调整并发参数

## 🔍 故障排除

### 常见问题

#### Q: 程序启动失败

**A**: 检查端口占用和权限设置

```bash
# 检查端口占用
netstat -an | grep :8080

# 以管理员身份运行
sudo ./data-migration-tool
```

#### Q: 数据库连接失败

**A**: 验证连接信息和网络连通性

```bash
# 测试MySQL连接
mysql -h host -P port -u username -p database

# 测试PostgreSQL连接
psql -h host -p port -U username -d database
```

#### Q: 迁移速度慢

**A**: 调整并发参数和批处理大小

- 增加并发任务数
- 优化批处理大小
- 检查数据库索引
- 监控网络延迟

#### Q: 内存使用过高

**A**: 减少并发数量和批处理大小

```bash
# 设置较小的批处理大小
export DEFAULT_BATCH_SIZE=500
export MAX_CONCURRENT_BATCH=2
```

## 📊 项目统计

![GitHub stars](https://img.shields.io/github/stars/hcr707305003/data-migration-tool?style=social)
![GitHub forks](https://img.shields.io/github/forks/hcr707305003/data-migration-tool?style=social)
![GitHub issues](https://img.shields.io/github/issues/hcr707305003/data-migration-tool)
![GitHub pull requests](https://img.shields.io/github/issues-pr/hcr707305003/data-migration-tool)
![GitHub last commit](https://img.shields.io/github/last-commit/hcr707305003/data-migration-tool)
![GitHub release](https://img.shields.io/github/v/release/hcr707305003/data-migration-tool)

---

**🚀 让数据迁移变得简单而安全！**

**⭐ 如果这个项目对你有帮助，请给个 Star 支持一下！**
