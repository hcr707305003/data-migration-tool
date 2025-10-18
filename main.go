package main

import (
	"data-migration-tool/internal/api"
	"data-migration-tool/internal/config"
	"data-migration-tool/internal/logger"
	"data-migration-tool/internal/services"
	"data-migration-tool/internal/storage"
	"embed"
	"fmt"
	"html/template"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

//go:embed web/static/* web/templates/*
var embeddedFiles embed.FS

// 构建时注入的版本信息
var (
	Version   = "1.2.0"
	BuildTime = "unknown"
	GitCommit = "unknown"
)

func main() {
	// 显示版本信息
	showBanner()
	
	// 加载环境变量文件
	if err := godotenv.Load(); err != nil {
		log.Printf("警告: 无法加载.env文件: %v (将使用默认配置)", err)
	}
	
	// 初始化配置
	cfg := config.New()
	log.Printf("配置加载完成，数据目录: %s，日志目录: %s", cfg.DataDir, cfg.LogDir)
	
	// 检查并创建必要的目录结构
	if err := ensureDirectories(cfg); err != nil {
		log.Fatalf("创建目录结构失败: %v", err)
	}
	
	// 初始化日志系统
	appLogger, err := logger.SetupGlobalLogger(cfg.LogDir)
	if err != nil {
		log.Fatalf("初始化日志系统失败: %v", err)
	}
	defer appLogger.Close()
	
	log.Printf("日志系统初始化完成，日志文件: %s/app-%s.log", cfg.LogDir, getCurrentDate())
	
	// 显示配置信息
	log.Printf("并发配置 - 最大任务数: %d, 每任务最大表数: %d, 每表最大批次数: %d", 
		cfg.MaxConcurrentTasks, cfg.MaxConcurrentTables, cfg.MaxConcurrentBatches)
	log.Printf("性能配置 - 默认批处理大小: %d, 连接超时: %ds, 查询超时: %ds", 
		cfg.DefaultBatchSize, cfg.ConnectionTimeout, cfg.QueryTimeout)
	
	// 初始化存储（会自动创建数据文件）
	store := storage.NewJSONStorage(cfg.DataDir)
	log.Printf("存储层初始化完成")
	
	// 启动数据源状态检查器
	statusChecker := services.NewStatusChecker(store)
	statusChecker.Start(cfg.StatusCheckInterval)
	log.Printf("数据源状态检查器启动，检查间隔: %v (%d秒)", cfg.StatusCheckInterval, cfg.StatusCheckIntervalSecs)
	
	// 设置Gin模式
	gin.SetMode(gin.ReleaseMode)
	
	// 创建路由
	router := gin.Default()
	
	// 设置Web资源（优先使用嵌入式资源）
	setupWebAssets(router)
	
	// 初始化API路由
	api.SetupRoutes(router, store, cfg)
	
	// 显示启动信息
	showStartupInfo(cfg.Port)
	
	// 启动服务器
	log.Fatal(router.Run(":" + cfg.Port))
}

// showBanner 显示启动横幅
func showBanner() {
	fmt.Println("╔══════════════════════════════════════════════════════════════╗")
	fmt.Println("║                    🚀 数据迁移工具                           ║")
	fmt.Println("║                  Data Migration Tool                         ║")
	fmt.Println("╠══════════════════════════════════════════════════════════════╣")
	fmt.Printf("║ 版本 Version: %-43s ║\n", Version)
	fmt.Printf("║ 构建时间 Build Time: %-36s ║\n", BuildTime)
	fmt.Printf("║ Git提交 Git Commit: %-37s ║\n", GitCommit)
	fmt.Println("╚══════════════════════════════════════════════════════════════╝")
	fmt.Println()
}

// ensureDirectories 确保必要的目录存在
func ensureDirectories(cfg *config.Config) error {
	// 运行时必需的目录（使用配置中的路径）
	runtimeDirectories := []string{
		cfg.DataDir,
		cfg.LogDir,
	}
	
	// 开发模式下需要的额外目录
	if isLocalWebAssetsAvailable() {
		runtimeDirectories = append(runtimeDirectories, []string{
			"./web",
			"./web/static", 
			"./web/templates",
		}...)
	}
	
	for _, dir := range runtimeDirectories {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return fmt.Errorf("创建目录 %s 失败: %v", dir, err)
		}
	}
	
	log.Printf("目录结构检查完成")
	return nil
}

// setupWebAssets 设置Web资源（优先使用嵌入式资源）
func setupWebAssets(router *gin.Engine) {
	// 检查是否存在本地Web资源文件（开发模式）
	if isLocalWebAssetsAvailable() {
		log.Printf("使用本地Web资源文件")
		router.Static("/static", "./web/static")
		router.LoadHTMLGlob("web/templates/*")
		return
	}
	
	// 使用嵌入式资源（生产模式）
	log.Printf("使用嵌入式Web资源文件")
	
	// 设置静态文件服务
	staticFS, err := fs.Sub(embeddedFiles, "web/static")
	if err != nil {
		log.Fatalf("无法加载嵌入式静态文件: %v", err)
	}
	router.StaticFS("/static", http.FS(staticFS))
	
	// 设置模板
	templatesFS, err := fs.Sub(embeddedFiles, "web/templates")
	if err != nil {
		log.Fatalf("无法加载嵌入式模板文件: %v", err)
	}
	
	tmpl := template.Must(template.New("").ParseFS(templatesFS, "*.html"))
	router.SetHTMLTemplate(tmpl)
}

// isLocalWebAssetsAvailable 检查本地Web资源是否可用
func isLocalWebAssetsAvailable() bool {
	// 检查关键目录和文件是否存在
	requiredPaths := []string{
		"./web/templates",
		"./web/static",
		"./web/templates/layout.html",
		"./web/static/css/main.css",
		"./web/static/js/common.js",
	}
	
	for _, path := range requiredPaths {
		if _, err := os.Stat(path); os.IsNotExist(err) {
			return false
		}
	}
	
	return true
}

// showStartupInfo 显示启动信息
func showStartupInfo(port string) {
	fmt.Println("🎯 启动信息:")
	fmt.Printf("   • 服务端口: %s\n", port)
	fmt.Printf("   • 访问地址: http://localhost:%s\n", port)
	fmt.Printf("   • 数据目录: %s\n", getAbsPath("./data"))
	fmt.Printf("   • 日志目录: %s\n", getAbsPath("./logs"))
	fmt.Println()
	fmt.Println("📋 功能特性:")
	fmt.Println("   • 多表数据迁移 (MySQL ↔ PostgreSQL)")
	fmt.Println("   • 智能过滤条件和脱敏规则")
	fmt.Println("   • 实时任务监控和进度跟踪")
	fmt.Println("   • 并发处理和批量操作")
	fmt.Println()
	fmt.Println("🚀 服务启动中...")
	fmt.Println("   请打开浏览器访问上述地址开始使用")
	fmt.Println()
}

// getAbsPath 获取绝对路径
func getAbsPath(path string) string {
	absPath, err := filepath.Abs(path)
	if err != nil {
		return path
	}
	return absPath
}

// getCurrentDate 获取当前日期字符串
func getCurrentDate() string {
	return time.Now().Format("2006-01-02")
}