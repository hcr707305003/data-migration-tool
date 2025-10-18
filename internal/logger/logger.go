package logger

import (
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"time"
)

// Logger 日志管理器
type Logger struct {
	infoLogger  *log.Logger
	errorLogger *log.Logger
	logFile     *os.File
}

// New 创建新的日志管理器
func New(logDir string) (*Logger, error) {
	// 确保日志目录存在
	if err := os.MkdirAll(logDir, 0755); err != nil {
		return nil, fmt.Errorf("创建日志目录失败: %v", err)
	}

	// 生成日志文件名（按日期）
	now := time.Now()
	logFileName := fmt.Sprintf("app-%s.log", now.Format("2006-01-02"))
	logFilePath := filepath.Join(logDir, logFileName)

	// 打开或创建日志文件
	logFile, err := os.OpenFile(logFilePath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err != nil {
		return nil, fmt.Errorf("创建日志文件失败: %v", err)
	}

	// 创建多重写入器（同时写入控制台和文件）
	multiWriter := io.MultiWriter(os.Stdout, logFile)
	errorWriter := io.MultiWriter(os.Stderr, logFile)

	// 创建日志记录器
	infoLogger := log.New(multiWriter, "", log.LstdFlags)
	errorLogger := log.New(errorWriter, "ERROR: ", log.LstdFlags|log.Lshortfile)

	return &Logger{
		infoLogger:  infoLogger,
		errorLogger: errorLogger,
		logFile:     logFile,
	}, nil
}

// Info 记录信息日志
func (l *Logger) Info(format string, v ...interface{}) {
	l.infoLogger.Printf(format, v...)
}

// Error 记录错误日志
func (l *Logger) Error(format string, v ...interface{}) {
	l.errorLogger.Printf(format, v...)
}

// Fatal 记录致命错误日志并退出程序
func (l *Logger) Fatal(format string, v ...interface{}) {
	l.errorLogger.Printf(format, v...)
	os.Exit(1)
}

// Close 关闭日志文件
func (l *Logger) Close() error {
	if l.logFile != nil {
		return l.logFile.Close()
	}
	return nil
}

// SetupGlobalLogger 设置全局日志记录器
func SetupGlobalLogger(logDir string) (*Logger, error) {
	logger, err := New(logDir)
	if err != nil {
		return nil, err
	}

	// 设置标准库的log输出到我们的日志文件
	log.SetOutput(io.MultiWriter(os.Stdout, logger.logFile))
	log.SetFlags(log.LstdFlags)

	return logger, nil
}
