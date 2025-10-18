package config

import (
	"os"
	"testing"
)

func TestNewConfig(t *testing.T) {
	// 设置测试环境变量
	os.Setenv("PORT", "9090")
	os.Setenv("DEFAULT_BATCH_SIZE", "2000")

	config := New()

	if config.Port != "9090" {
		t.Errorf("Expected port 9090, got %s", config.Port)
	}

	if config.DefaultBatchSize != 2000 {
		t.Errorf("Expected batch size 2000, got %d", config.DefaultBatchSize)
	}

	// 清理环境变量
	os.Unsetenv("PORT")
	os.Unsetenv("DEFAULT_BATCH_SIZE")
}

func TestNewConfigDefaults(t *testing.T) {
	// 确保没有设置环境变量
	os.Unsetenv("PORT")
	os.Unsetenv("DEFAULT_BATCH_SIZE")

	config := New()

	if config.Port != "8080" {
		t.Errorf("Expected default port 8080, got %s", config.Port)
	}

	if config.DefaultBatchSize != 1000 {
		t.Errorf("Expected default batch size 1000, got %d", config.DefaultBatchSize)
	}
}
