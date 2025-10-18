package models

import (
	"time"
)

// 数据源配置
type DataSource struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Type     string `json:"type"` // mysql, postgresql
	Host     string `json:"host"`
	Port     int    `json:"port"`
	Database string `json:"database"`
	Username string `json:"username"`
	Password string `json:"password"`
	Status   string `json:"status"` // connected, disconnected, checking
	Enabled  bool   `json:"enabled"` // 数据源启用状态
	CreateAt time.Time `json:"create_at"`
	UpdateAt time.Time `json:"update_at"`
}

// 过滤条件
type FilterCondition struct {
	Field    string `json:"field"`
	Operator string `json:"operator"` // =, !=, >, <, >=, <=, LIKE, IN
	Value    string `json:"value"`
	Logic    string `json:"logic"` // AND, OR
}

// 过滤模板
type FilterTemplate struct {
	ID          string            `json:"id"`
	Name        string            `json:"name"`
	Description string            `json:"description"`
	Conditions  []FilterCondition `json:"conditions"`
	Enabled     bool              `json:"enabled"`   // 模板启用状态
	CreateAt    time.Time         `json:"create_at"`
	UpdateAt    time.Time         `json:"update_at"`
}

// 脱敏规则
type MaskingRule struct {
	ID       string    `json:"id"`
	Name     string    `json:"name"`
	Type     string    `json:"type"`    // phone, email, idcard, custom
	Pattern  string    `json:"pattern"` // 正则表达式模式
	Replace  string    `json:"replace"` // 替换模式
	Enabled  bool      `json:"enabled"` // 规则启用状态
	CreateAt time.Time `json:"create_at"`
	UpdateAt time.Time `json:"update_at"`
}

// 脱敏模板
type MaskingTemplate struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Pattern     string `json:"pattern"`
	Replace     string `json:"replace"`
	Example     string `json:"example"`
}

// 脱敏类型
type MaskingType struct {
	ID          string            `json:"id"`
	Name        string            `json:"name"`
	Description string            `json:"description"`
	Icon        string            `json:"icon"`
	Category    string            `json:"category"`
	Enabled     bool              `json:"enabled"`
	Templates   []MaskingTemplate `json:"templates"`
	CreateAt    time.Time         `json:"create_at"`
	UpdateAt    time.Time         `json:"update_at"`
}

// 表迁移配置
type TableMigration struct {
	ID              string            `json:"id"`
	Name            string            `json:"name"`
	SourceTable     string            `json:"source_table"`
	TargetTable     string            `json:"target_table"`
	SourceDS        string            `json:"source_ds"`
	TargetDS        string            `json:"target_ds"`
	Conditions      []FilterCondition `json:"conditions"`
	TemplateRefs    []string          `json:"template_refs"` // 引用的过滤模板ID
	FieldMappings   []FieldMapping    `json:"field_mappings"`
	MaskingRules    map[string]string `json:"masking_rules"` // field -> masking_rule_id
	BatchSize       int               `json:"batch_size"`
	CreateAt        time.Time         `json:"create_at"`
	UpdateAt        time.Time         `json:"update_at"`
}

// 字段映射
type FieldMapping struct {
	SourceField string `json:"source_field"`
	TargetField string `json:"target_field"`
	DataType    string `json:"data_type"`
}

// 迁移配置（前端传递的配置）
type MigrationConfig struct {
	Name              string                 `json:"name"`
	SourceDatabase    string                 `json:"sourceDatabase"`
	TargetDatabase    string                 `json:"targetDatabase"`
	DuplicateStrategy string                 `json:"duplicateStrategy"` // ignore, replace, update, error
	TableStrategy     string                 `json:"tableStrategy"`     // use_existing, recreate, create_only
	Tables            []MigrationTableConfig `json:"tables"`
	CreatedAt         string                 `json:"createdAt"`
}

// 迁移表配置
type MigrationTableConfig struct {
	Name             string                    `json:"name"`
	FilterTemplates  []string                  `json:"filterTemplates"`
	CustomConditions []FilterCondition         `json:"customConditions"`
	MaskingRules     map[string]interface{}    `json:"maskingRules"`
}

// 旧版本迁移任务（用于数据兼容性）
type OldMigrationTask struct {
	ID               string     `json:"id"`
	Name             string     `json:"name"`
	SourceDatabase   string     `json:"source_database"`
	TargetDatabase   string     `json:"target_database"`
	Tables           []string   `json:"tables"` // 旧格式：字符串数组
	Status           string     `json:"status"`
	Progress         int        `json:"progress"`
	CurrentTable     string     `json:"current_table"`
	TotalRecords     int64      `json:"total_records"`
	ProcessedRecords int64      `json:"processed_records"`
	ErrorMessage     string     `json:"error_message"`
	CreateAt         time.Time  `json:"create_at"`
	UpdateAt         time.Time  `json:"update_at"`
	StartAt          time.Time  `json:"start_at"`
	EndAt            *time.Time `json:"end_at"`
}

// 迁移任务
type MigrationTask struct {
	ID               string                 `json:"id"`
	Name             string                 `json:"name"`
	SourceDatabase   string                 `json:"source_database"`
	TargetDatabase   string                 `json:"target_database"`
	DuplicateStrategy string                `json:"duplicate_strategy"`
	TableStrategy    string                 `json:"table_strategy"`
	Tables           []MigrationTableConfig `json:"tables"` // 直接存储表配置
	Status           string                 `json:"status"` // draft, initializing, running, paused, completed, failed, stopped
	Progress         int                    `json:"progress"`
	CurrentTable     string                 `json:"current_table"`
	TotalRecords     int64                  `json:"total_records"`
	ProcessedRecords int64                  `json:"processed_records"`
	ErrorMessage     string                 `json:"error_message"`
	CreateAt         time.Time              `json:"create_at"`
	UpdateAt         time.Time              `json:"update_at"`
	StartAt          time.Time              `json:"start_at"`
	EndAt            *time.Time             `json:"end_at"`
}

// 迁移记录
type MigrationRecord struct {
	ID        string    `json:"id"`
	TaskID    string    `json:"task_id"`
	TableID   string    `json:"table_id"`
	Status    string    `json:"status"`
	Records   int64     `json:"records"`
	Duration  int64     `json:"duration"` // 毫秒
	Error     string    `json:"error"`
	CreateAt  time.Time `json:"create_at"`
}