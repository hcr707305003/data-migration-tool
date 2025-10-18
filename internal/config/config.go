package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	Port                    string
	DataDir                 string
	LogDir                  string
	StatusCheckInterval     time.Duration
	StatusCheckIntervalSecs int
	
	// 并发配置
	MaxConcurrentTasks   int
	MaxConcurrentTables  int
	MaxConcurrentBatches int
	
	// 性能配置
	DefaultBatchSize   int
	ConnectionTimeout  int
	QueryTimeout       int
}

func New() *Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	
	dataDir := os.Getenv("DATA_DIR")
	if dataDir == "" {
		dataDir = "./data"
	}
	
	logDir := os.Getenv("LOG_DIR")
	if logDir == "" {
		logDir = "./logs"
	}
	
	// 状态检查间隔配置（秒）
	statusCheckIntervalSecs := 300 // 默认5分钟
	if intervalStr := os.Getenv("STATUS_CHECK_INTERVAL"); intervalStr != "" {
		if interval, err := strconv.Atoi(intervalStr); err == nil && interval > 0 {
			statusCheckIntervalSecs = interval
		}
	}
	
	// 并发配置
	maxConcurrentTasks := 3 // 默认3个并发任务
	if tasksStr := os.Getenv("MAX_CONCURRENT_TASKS"); tasksStr != "" {
		if tasks, err := strconv.Atoi(tasksStr); err == nil && tasks > 0 {
			maxConcurrentTasks = tasks
		}
	}
	
	maxConcurrentTables := 2 // 默认每任务2个并发表
	if tablesStr := os.Getenv("MAX_CONCURRENT_TABLES"); tablesStr != "" {
		if tables, err := strconv.Atoi(tablesStr); err == nil && tables > 0 {
			maxConcurrentTables = tables
		}
	}
	
	maxConcurrentBatches := 4 // 默认每表4个并发批次
	if batchesStr := os.Getenv("MAX_CONCURRENT_BATCHES"); batchesStr != "" {
		if batches, err := strconv.Atoi(batchesStr); err == nil && batches > 0 {
			maxConcurrentBatches = batches
		}
	}
	
	// 性能配置
	defaultBatchSize := 1000 // 默认批处理大小
	if batchSizeStr := os.Getenv("DEFAULT_BATCH_SIZE"); batchSizeStr != "" {
		if batchSize, err := strconv.Atoi(batchSizeStr); err == nil && batchSize > 0 {
			defaultBatchSize = batchSize
		}
	}
	
	connectionTimeout := 30 // 默认连接超时30秒
	if timeoutStr := os.Getenv("CONNECTION_TIMEOUT"); timeoutStr != "" {
		if timeout, err := strconv.Atoi(timeoutStr); err == nil && timeout > 0 {
			connectionTimeout = timeout
		}
	}
	
	queryTimeout := 300 // 默认查询超时300秒
	if timeoutStr := os.Getenv("QUERY_TIMEOUT"); timeoutStr != "" {
		if timeout, err := strconv.Atoi(timeoutStr); err == nil && timeout > 0 {
			queryTimeout = timeout
		}
	}
	
	// 确保数据目录和日志目录存在
	os.MkdirAll(dataDir, 0755)
	os.MkdirAll(logDir, 0755)
	
	return &Config{
		Port:                    port,
		DataDir:                 dataDir,
		LogDir:                  logDir,
		StatusCheckInterval:     time.Duration(statusCheckIntervalSecs) * time.Second,
		StatusCheckIntervalSecs: statusCheckIntervalSecs,
		
		// 并发配置
		MaxConcurrentTasks:   maxConcurrentTasks,
		MaxConcurrentTables:  maxConcurrentTables,
		MaxConcurrentBatches: maxConcurrentBatches,
		
		// 性能配置
		DefaultBatchSize:   defaultBatchSize,
		ConnectionTimeout:  connectionTimeout,
		QueryTimeout:       queryTimeout,
	}
}