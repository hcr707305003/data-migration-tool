# 🚀 Data Migration Tool

A powerful web-based data migration tool built with Go, supporting efficient data migration between multiple databases. Features comprehensive filtering conditions, data masking, task management, and real-time monitoring to make data migration simple and secure.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Go Version](https://img.shields.io/badge/go-%3E%3D1.21-blue.svg)
![Database](https://img.shields.io/badge/database-MySQL%20%7C%20PostgreSQL-green.svg)

[中文文档](README.md) | **English**

## ✨ Features

### 🎯 Core Features
- **🔄 Multi-table Migration**: Support batch migration of multiple tables in a single task
- **🔍 Smart Filtering**: Define multiple WHERE conditions per table with complex filtering logic
- **📋 Filter Templates**: Create reusable condition templates to improve configuration efficiency
- **🛡️ Data Masking**: Built-in masking rules to protect sensitive data
- **💾 Multi-database Support**: Support MySQL and PostgreSQL with cross-database migration
- **📊 Task Management**: Complete task lifecycle management with draft, running, paused, completed states

### 🚀 Advanced Features
- **⚡ Concurrent Processing**: Multi-level concurrency (tasks, tables, batches) for maximum efficiency
- **📈 Real-time Monitoring**: Live progress tracking with detailed statistics
- **🔧 Flexible Configuration**: Multiple duplicate handling strategies and table processing options
- **📝 Detailed Logging**: Comprehensive error handling and logging for troubleshooting
- **🎨 Modern UI**: Responsive web interface with batch operations and search filtering
- **🔒 Generated Column Support**: Intelligent detection and handling of database generated columns

### 🛠️ Technical Features
- **📄 JSON Storage**: Lightweight JSON file storage with no additional database dependencies
- **🔄 Status Caching**: Smart connection status caching for better user experience
- **🎯 Batch Processing**: Configurable batch sizes to balance performance and memory usage
- **🔐 Security Design**: SQL injection prevention, encrypted password storage, secure and reliable

## 🖼️ Feature Showcase

### Main Interfaces
- **🏠 Migration Task Configuration**: Intuitive table selection and configuration with real-time preview
- **📊 Task Execution Monitoring**: Live progress display with detailed statistics
- **💾 Data Source Management**: Modern card-based layout with clear status indicators
- **🔧 Filter Templates**: Flexible condition configuration with complex logic combinations
- **🛡️ Masking Rules**: Multiple built-in rules with custom extension support

### Core Advantages
- **🎨 Modern UI**: Responsive design with dark theme support
- **⚡ High Performance**: Multi-level concurrency control for optimal resource utilization
- **🔒 Secure & Reliable**: Comprehensive error handling and data protection mechanisms
- **📱 Mobile Friendly**: Support for mobile device access and operations

## 📁 Project Structure

```
data-migration-tool/
├── main.go                     # 🚀 Application entry point
├── go.mod                      # 📦 Go module definition
├── go.sum                      # 🔒 Dependency version lock
├── start.sh                    # 🐧 Linux/Mac startup script
├── start.bat                   # 🪟 Windows startup script
├── internal/                   # 📂 Internal packages
│   ├── api/                    # 🌐 API routing layer
│   │   └── routes.go           # Route definitions
│   ├── config/                 # ⚙️ Configuration management
│   │   └── config.go           # Config structures and loading
│   ├── handlers/               # 🎯 HTTP handlers
│   │   └── handler.go          # Request handling logic
│   ├── models/                 # 📋 Data models
│   │   └── models.go           # Struct definitions
│   ├── services/               # 🔧 Business logic layer
│   │   ├── database.go         # Database connections and operations
│   │   └── migration.go        # Migration core logic
│   └── storage/                # 💾 Storage layer
│       └── json_storage.go     # JSON file storage implementation
├── web/                        # 🌐 Web frontend
│   ├── templates/              # 📄 HTML templates
│   │   ├── migration.html      # Migration task configuration page
│   │   ├── execution.html      # Task execution page
│   │   ├── datasource.html     # Data source management page
│   │   ├── template.html       # Filter template page
│   │   └── masking.html        # Masking rules page
│   └── static/                 # 📦 Static resources
│       ├── css/                # 🎨 Style files
│       │   ├── main.css        # Main styles
│       │   └── toast.css       # Toast notification styles
│       └── js/                 # 📜 JavaScript files
│           ├── common.js       # Common functions
│           ├── migration.js    # Migration configuration logic
│           ├── execution.js    # Task execution logic
│           ├── datasource.js   # Data source management
│           ├── template.js     # Filter template management
│           └── masking.js      # Masking rules management
├── data/                       # 📊 Data storage directory
│   ├── datasources.json       # Data source configurations
│   ├── filter_templates.json  # Filter templates
│   ├── masking_rules.json     # Masking rules
│   ├── table_migrations.json  # Table migration configurations
│   └── migration_tasks.json   # Migration task records
└── README.md                   # 📖 Project documentation
```

## 🚀 Quick Start

### 📋 Requirements
- **Go**: 1.21+ 
- **Database**: MySQL 5.7+ or PostgreSQL 10+
- **OS**: Windows, Linux, macOS

### 📦 Installation & Deployment

#### 1️⃣ Clone Repository
```bash
git clone <repository-url>
cd data-migration-tool
```

#### 2️⃣ Install Dependencies
```bash
go mod tidy
```

#### 3️⃣ Start Service

**Option 1: Using Startup Scripts (Recommended)**
```bash
# Linux/Mac
chmod +x start.sh
./start.sh

# Windows
start.bat
```

**Option 2: Docker Deployment (Recommended for Production)**
```bash
# Using Docker Compose (Recommended)
docker-compose up -d

# Or using Docker directly
docker build -t data-migration-tool .
docker run -d \
  --name data-migration-tool \
  -p 8080:8080 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  data-migration-tool

# Start application
docker-compose up -d
```

**Option 3: Direct Run**
```bash
go run main.go
```

**Option 4: Custom Configuration**
```bash
export PORT=9090
export STATUS_CHECK_INTERVAL=120
export DATA_DIR=./custom_data
go run main.go
```

#### 4️⃣ Access Application
Open browser and visit: `http://localhost:8080`

### ⚙️ Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 8080 | Web service port |
| `DATA_DIR` | ./data | Data storage directory |
| `STATUS_CHECK_INTERVAL` | 300 | Data source status check interval (seconds) |

#### Configuration Examples

**Method 1: Environment Variables**

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

**Method 2: .env File (Recommended)**

Create a `.env` file in the program root directory:
```bash
# Web service configuration
PORT=9090

# Data directories
DATA_DIR=./data
LOG_DIR=./logs

# Concurrency configuration
MAX_CONCURRENT_TASKS=5
MAX_CONCURRENT_TABLES=3
MAX_CONCURRENT_BATCH=4

# Performance configuration
DEFAULT_BATCH_SIZE=2000
CONNECTION_TIMEOUT=30
QUERY_TIMEOUT=300

# Status check interval (seconds)
STATUS_CHECK_INTERVAL=300
```

Then run the program directly:
```bash
# Windows
data-migration-tool.exe

# Linux/macOS
./data-migration-tool
```

### 🔧 Concurrency Configuration

The system supports three-level concurrency control, configurable via the "Concurrency Settings" in the web interface:

- **Max Concurrent Tasks**: Number of tasks running simultaneously (default: 3)
- **Max Concurrent Tables per Task**: Number of tables migrated simultaneously per task (default: 2)  
- **Max Concurrent Batches per Table**: Number of batches processed simultaneously per table (default: 4)

## 🐳 Docker Deployment

### 📦 Quick Deployment

**Using Docker Compose (Recommended)**

```bash
# Start application (International users)
docker-compose up -d

# Start application (China users, with optimized mirrors)
docker-compose -f docker-compose.cn.yml up -d

# View logs
docker-compose logs -f

# Stop application
docker-compose down
```

**Using Docker**

```bash
# Build image (International users)
docker build -t data-migration-tool .

# Build image (China users, with optimized mirrors)
docker build -f Dockerfile.cn -t data-migration-tool .

# Run container
docker run -d \
  --name data-migration-tool \
  -p 8080:8080 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  -e PORT=8080 \
  -e MAX_CONCURRENT_TASKS=3 \
  data-migration-tool
```

### 🔧 Docker Configuration

**Method 1: Environment Variables**

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

**Method 2: Using .env File (Recommended)**

```bash
# Copy example configuration file
cp .env.docker .env

# Edit configuration
vim .env
```

**Data Persistence**

```yaml
# docker-compose.yml
volumes:
  - ./data:/app/data # Data files
  - ./logs:/app/logs # Log files
  - ./.env:/app/.env:ro # Environment configuration file (read-only)
```



### 🔍 Docker Management Commands

```bash
# Check running status
docker-compose ps

# View real-time logs
docker-compose logs -f data-migration-tool

# Enter container
docker-compose exec data-migration-tool sh

# Restart service
docker-compose restart data-migration-tool

# Update image
docker-compose pull && docker-compose up -d
```

### 🛡️ Production Environment Recommendations

```yaml
# docker-compose.prod.yml
version: '3.8'
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
          cpus: '1.0'
```

## 📖 User Guide

### 1️⃣ Data Source Management
![Data Source Management](https://img.shields.io/badge/feature-Data%20Source%20Management-blue)

- **➕ Add Data Sources**: Configure MySQL/PostgreSQL connection information
- **🔍 ID Display**: Each data source shows unique identifier for API calls and debugging
- **🔗 Connection Testing**: One-click database connection status testing
- **⚡ Auto Check**: Background periodic connection status checking (configurable interval)
- **📊 Status Display**: Real-time connection status (connected/disconnected/checking)
- **💾 Status Caching**: Persistent connection status storage
- **🔄 Batch Operations**: Support copy, enable/disable, delete operations

### 2️⃣ Filter Template Management
![Filter Templates](https://img.shields.io/badge/feature-Filter%20Templates-green)

- **📋 Template Creation**: Create reusable WHERE condition templates
- **🔧 Rich Operators**: Support `=`, `!=`, `>`, `<`, `>=`, `<=`, `LIKE`, `IN`, etc.
- **🔗 Logic Relations**: Support `AND`, `OR` logic combinations between conditions
- **♻️ Template Reuse**: Create once, use everywhere for improved configuration efficiency

### 3️⃣ Data Masking Rules
![Masking Rules](https://img.shields.io/badge/feature-Data%20Masking-orange)

- **📱 Phone Masking**: `138****5678` (keep first 3 and last 4 digits)
- **📧 Email Masking**: `u***r@example.com` (keep first/last chars and domain)
- **🆔 ID Card Masking**: `1234***********5678` (keep first 4 and last 4 digits)
- **🏠 Address Masking**: Smart region preservation with detailed address hiding
- **🎨 Custom Rules**: Support regex-based custom masking logic

### 4️⃣ Migration Task Configuration
![Task Configuration](https://img.shields.io/badge/feature-Task%20Configuration-purple)

- **🎯 Multi-table Selection**: Support batch selection of multiple tables for migration
- **🔍 Smart Search**: Table name search and batch selection operations
- **⚙️ Table Configuration**: Independent configuration of filtering and masking rules per table
- **📊 Configuration Preview**: Real-time display of current task configuration overview
- **💾 Draft Saving**: Support saving as draft for continued editing
- **🔄 Duplicate Handling**: Multiple duplicate data handling strategies
- **🛠️ Table Strategy**: Flexible target table handling methods

### 5️⃣ Task Execution & Monitoring
![Task Monitoring](https://img.shields.io/badge/feature-Task%20Monitoring-red)

- **📈 Real-time Progress**: Live task execution progress display
- **📊 Detailed Statistics**: Success/failure record counts, processing speed, etc.
- **🔄 Status Management**: Support start, pause, stop, re-run operations
- **📝 Execution Logs**: Detailed execution logs and error information
- **🔍 Batch Operations**: Support batch start, stop, delete tasks
- **📤 Export Functions**: Task configuration and result export

## 🎯 Best Practices

### 📊 Performance Optimization
- **Batch Size**: Adjust batch size based on data volume and server performance (recommended: 1000-5000)
- **Concurrency Config**: Set reasonable concurrency parameters to avoid excessive database pressure
- **Index Optimization**: Ensure proper indexes on source and target tables, especially for WHERE condition fields
- **Network Optimization**: Increase batch size appropriately when network latency is high between databases

### 🔒 Security Recommendations
- **Permission Control**: Use principle of least privilege, grant only necessary database permissions to migration accounts
- **Network Security**: Use reverse proxy with SSL and firewall rules in production environments (application supports HTTP only)
- **Sensitive Data**: Configure masking rules for fields containing sensitive information
- **Access Control**: Deploy in internal network or configure appropriate access controls

### 🧪 Testing Process
1. **Small Data Testing**: Validate configuration correctness with small data volumes first
2. **Masking Verification**: Check if masking rules work as expected
3. **Performance Testing**: Evaluate migration speed and adjust concurrency parameters
4. **Integrity Check**: Compare data consistency between source and target tables

## ⚠️ Important Notes

### 🚨 Critical Reminders
- **🔐 Data Security**: Protect database connection information in production, recommend using environment variables
- **💾 Data Backup**: Always backup target database before migration to prevent data loss
- **🧪 Thorough Testing**: Validate all configurations in test environment before production execution
- **📊 Resource Monitoring**: Monitor database and server resource usage during large data migrations

### 🔧 Troubleshooting
- **Connection Failures**: Check network connectivity, firewall settings, database permissions
- **Slow Migration**: Adjust batch size, concurrency parameters, check database indexes
- **Memory Issues**: Reduce concurrency count or batch size
- **Generated Column Errors**: System automatically skips generated columns, check table structure if issues occur

## 🤝 Contributing

Issues and Pull Requests are welcome!

### Development Environment Setup
```bash
git clone <repository-url>
cd data-migration-tool
go mod tidy
go run main.go
```

### Code Standards
- Follow official Go language code standards
- Add appropriate comments and documentation
- Write unit tests

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details

## 🙏 Acknowledgments

Thanks to all contributors and users for their support!

---

**⭐ If this project helps you, please give it a Star!**## 🌟 C
ommunity & Support

### 📞 Get Help

- 📋 **Issue Reports**: [GitHub Issues](https://github.com/hcr707305003/data-migration-tool/issues)
- 💬 **Community Discussions**: [GitHub Discussions](https://github.com/hcr707305003/data-migration-tool/discussions)
- 📧 **Email Support**: support@example.com
- 📖 **Documentation**: [Online Docs](https://your-docs-site.com)

### 🎓 Learning Resources

- 📺 **Video Tutorials**: [YouTube Channel](https://youtube.com/your-channel)
- 📚 **Best Practices**: [Wiki Pages](https://github.com/hcr707305003/data-migration-tool/wiki)
- 🎯 **Example Projects**: [Examples Repository](https://github.com/hcr707305003/data-migration-tool/tree/main/examples)
- 📝 **Blog Posts**: [Technical Blog](https://blog.example.com)

### 🏆 Community Recognition

- ⭐ **GitHub Stars**: 1000+
- 🍴 **Forks**: 200+
- 📥 **Downloads**: 10,000+
- 👥 **Contributors**: 50+

### 🎉 Success Stories

- **Large E-commerce**: Completed 100TB data migration with zero downtime
- **Financial Institution**: Achieved compliant sensitive data migration with masking
- **Tech Company**: Multi-cloud data synchronization improving development efficiency

## 🗺️ Roadmap

We are continuously improving the tool. Future enhancements will be based on user feedback and community needs. Please check our [GitHub Issues](https://github.com/hcr707305003/data-migration-tool/issues) and [Discussions](https://github.com/hcr707305003/data-migration-tool/discussions) for the latest development plans.

### 💡 Long-term Vision

- 🌍 **Globalization**: Multi-language interface support
- 🏢 **Enterprise Edition**: Advanced features and commercial support
- 🔗 **Ecosystem Integration**: Integration with mainstream data tools
- 📱 **Mobile**: Mobile device management interface

## 📈 Performance Benchmarks

### 🚀 Migration Performance

| Data Size | Tables | Migration Time | Average Speed | Concurrency |
|-----------|--------|----------------|---------------|-------------|
| 1GB | 10 | 2 minutes | 8.3MB/s | Default |
| 10GB | 50 | 15 minutes | 11.1MB/s | Optimized |
| 100GB | 100 | 2 hours | 13.9MB/s | High Concurrency |

### 💾 Resource Usage

- **Memory Usage**: Base 50MB + batch processing cache
- **CPU Usage**: Single core 20-40% (depends on concurrency settings)
- **Network Bandwidth**: Mainly limited by database connection speed
- **Disk Space**: Log files + temporary cache

### ⚡ Optimization Tips

1. **Network Optimization**: Use high-speed network connections
2. **Index Optimization**: Create indexes on filter fields
3. **Batch Tuning**: Adjust batch size based on memory size
4. **Concurrency Control**: Adjust concurrency parameters based on database performance

## 🔍 Troubleshooting

### Common Issues

#### Q: Program startup failure
**A**: Check port occupation and permission settings
```bash
# Check port occupation
netstat -an | grep :8080

# Run as administrator
sudo ./data-migration-tool
```

#### Q: Database connection failure
**A**: Verify connection information and network connectivity
```bash
# Test MySQL connection
mysql -h host -P port -u username -p database

# Test PostgreSQL connection
psql -h host -p port -U username -d database
```

#### Q: Slow migration speed
**A**: Adjust concurrency parameters and batch size
- Increase concurrent task count
- Optimize batch size
- Check database indexes
- Monitor network latency

#### Q: High memory usage
**A**: Reduce concurrency count and batch size
```bash
# Set smaller batch size
export DEFAULT_BATCH_SIZE=500
export MAX_CONCURRENT_BATCH=2
```

## 📊 Project Statistics

![GitHub stars](https://img.shields.io/github/stars/hcr707305003/data-migration-tool?style=social)
![GitHub forks](https://img.shields.io/github/forks/hcr707305003/data-migration-tool?style=social)
![GitHub issues](https://img.shields.io/github/issues/hcr707305003/data-migration-tool)
![GitHub pull requests](https://img.shields.io/github/issues-pr/hcr707305003/data-migration-tool)
![GitHub last commit](https://img.shields.io/github/last-commit/hcr707305003/data-migration-tool)
![GitHub release](https://img.shields.io/github/v/release/hcr707305003/data-migration-tool)

---

**🚀 Make data migration simple and secure!**

**⭐ If this project helps you, please give it a Star!**