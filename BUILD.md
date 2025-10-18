# 🔨 构建指南 | Build Guide

## 📦 构建独立可执行文件

### Windows 构建

#### 🚀 快速构建
```cmd
# 使用构建脚本（推荐）
build.bat

# 手动构建
set GOOS=windows
set GOARCH=amd64
set CGO_ENABLED=0
go build -ldflags="-w -s" -o build/data-migration-tool.exe .
```

#### 📦 打包发布版本
```cmd
# 创建完整发布包
package.bat
```

### Linux 构建

#### 🚀 快速构建
```bash
# 使用构建脚本（推荐）
chmod +x build.sh
./build.sh

# 手动构建
export GOOS=linux
export GOARCH=amd64
export CGO_ENABLED=0
go build -ldflags="-w -s" -o build/data-migration-tool .
```

### macOS 构建

```bash
# Intel Mac
export GOOS=darwin
export GOARCH=amd64
export CGO_ENABLED=0
go build -ldflags="-w -s" -o build/data-migration-tool-darwin-amd64 .

# Apple Silicon Mac
export GOOS=darwin
export GOARCH=arm64
export CGO_ENABLED=0
go build -ldflags="-w -s" -o build/data-migration-tool-darwin-arm64 .
```

## 🔧 构建选项

### 编译标志说明
- `-ldflags="-w -s"`: 去除调试信息，减小文件大小
- `-o`: 指定输出文件名
- `CGO_ENABLED=0`: 禁用CGO，生成静态链接的二进制文件

### 版本信息注入
构建脚本会自动注入以下信息：
- **版本号**: 从构建脚本中读取
- **构建时间**: 当前时间戳
- **Git提交**: 当前Git提交哈希（如果可用）

### 自定义版本信息
```bash
# 手动指定版本信息
VERSION="1.2.0"
BUILD_TIME=$(date '+%Y-%m-%d %H:%M:%S')
GIT_COMMIT=$(git rev-parse --short HEAD)

LDFLAGS="-w -s -X 'main.Version=${VERSION}' -X 'main.BuildTime=${BUILD_TIME}' -X 'main.GitCommit=${GIT_COMMIT}'"

go build -ldflags="${LDFLAGS}" -o data-migration-tool .
```

## 📁 构建输出

### 文件结构
```
build/
├── data-migration-tool.exe           # Windows 可执行文件
├── data-migration-tool               # Linux 可执行文件
├── data-migration-tool-darwin-amd64  # macOS Intel 可执行文件
└── data-migration-tool-darwin-arm64  # macOS Apple Silicon 可执行文件
```

### 发布包结构
```
package/data-migration-tool-v1.2.0-windows-standalone/
├── data-migration-tool.exe    # 主程序
├── run.bat                    # 启动脚本
├── README.md                  # 使用说明
├── LICENSE                    # 许可证
├── VERSION.txt               # 版本信息
└── web/                      # Web资源
    ├── static/              # CSS、JS、图片
    └── templates/           # HTML模板
```

## 🧪 构建验证

### 验证构建结果
```bash
# 检查文件是否生成
ls -la build/

# 验证程序可以运行
./build/data-migration-tool --version

# 检查文件大小
du -h build/data-migration-tool*
```

### 功能测试
```bash
# 启动程序
./build/data-migration-tool

# 在另一个终端测试API
curl http://localhost:8080/api/datasources

# 测试Web界面
# 打开浏览器访问 http://localhost:8080
```

## 🔍 故障排除

### 常见构建问题

**1. Go版本不兼容**
```bash
# 检查Go版本
go version

# 需要Go 1.21或更高版本
```

**2. 依赖下载失败**
```bash
# 清理模块缓存
go clean -modcache

# 重新下载依赖
go mod download
go mod tidy
```

**3. 交叉编译失败**
```bash
# 确保设置了正确的环境变量
echo $GOOS $GOARCH $CGO_ENABLED

# 重新设置环境变量
export GOOS=linux
export GOARCH=amd64
export CGO_ENABLED=0
```

**4. 文件大小过大**
```bash
# 使用优化标志
go build -ldflags="-w -s" -o data-migration-tool .

# 使用UPX压缩（可选）
upx --best data-migration-tool
```

### 构建优化

**减小文件大小**
```bash
# 去除调试信息和符号表
go build -ldflags="-w -s" .

# 使用trimpath去除文件路径信息
go build -trimpath -ldflags="-w -s" .
```

**提高构建速度**
```bash
# 使用构建缓存
export GOCACHE=/path/to/cache

# 并行构建
go build -p 4 .
```

## 📋 构建清单

### 发布前检查
- [ ] 代码编译无错误
- [ ] 所有测试通过
- [ ] 版本号已更新
- [ ] 更新日志已更新
- [ ] Web资源文件完整
- [ ] 构建脚本测试通过
- [ ] 跨平台构建测试
- [ ] 功能验证测试

### 发布包检查
- [ ] 可执行文件正常运行
- [ ] Web界面可以访问
- [ ] 数据库连接功能正常
- [ ] 迁移功能测试通过
- [ ] 文档和说明文件完整
- [ ] 许可证文件包含
- [ ] 版本信息正确显示

---

**构建完成后，请进行充分测试确保功能正常！** ✅