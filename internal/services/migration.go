package services

import (
	"data-migration-tool/internal/config"
	"data-migration-tool/internal/models"
	"data-migration-tool/internal/storage"
	"database/sql"
	"fmt"
	"log"
	"regexp"
	"strings"
	"sync"
	"time"
)

// 表迁移结果
type TableMigrationResult struct {
	TableName    string
	Success      bool
	RecordCount  int64
	ErrorMessage string
	Duration     time.Duration
}

// 批次处理结果
type BatchResult struct {
	BatchIndex   int
	Success      bool
	RecordCount  int
	ErrorMessage string
}

type MigrationService struct {
	store        *storage.JSONStorage
	config       *config.Config
	dbService    *DatabaseService
	runningTasks map[string]chan bool
	mutex        sync.RWMutex
	// 并发控制
	maxConcurrentTasks  int // 最大并发任务数
	maxConcurrentTables int // 每个任务最大并发表数
	maxConcurrentBatch  int // 每个表最大并发批次数
}

// quoteIdentifier 给MySQL标识符（表名、列名）添加反引号，避免保留字冲突
func quoteIdentifier(identifier string) string {
	// 如果已经有反引号，先去掉
	identifier = strings.Trim(identifier, "`")
	return fmt.Sprintf("`%s`", identifier)
}

// formatCondition 格式化过滤条件，正确处理IN和NOT IN操作符
func formatCondition(condition models.FilterCondition) string {
	operator := strings.ToUpper(condition.Operator)
	quotedField := quoteIdentifier(condition.Field)
	if operator == "IN" || operator == "NOT IN" {
		// IN和NOT IN操作符不需要给值加引号，值应该已经包含括号
		condStr := fmt.Sprintf("%s %s %s", quotedField, condition.Operator, condition.Value)
		log.Printf("DEBUG: IN操作符条件 - 字段: %s, 操作符: %s, 值: %s, 生成条件: %s",
			condition.Field, condition.Operator, condition.Value, condStr)
		return condStr
	} else {
		condStr := fmt.Sprintf("%s %s '%s'", quotedField, condition.Operator, condition.Value)
		log.Printf("DEBUG: 普通操作符条件 - 字段: %s, 操作符: %s, 值: %s, 生成条件: %s",
			condition.Field, condition.Operator, condition.Value, condStr)
		return condStr
	}
}

func NewMigrationService(store *storage.JSONStorage, cfg *config.Config) *MigrationService {
	return &MigrationService{
		store:        store,
		config:       cfg,
		dbService:    NewDatabaseService(),
		runningTasks: make(map[string]chan bool),
		// 从配置读取并发设置
		maxConcurrentTasks:  cfg.MaxConcurrentTasks,
		maxConcurrentTables: cfg.MaxConcurrentTables,
		maxConcurrentBatch:  cfg.MaxConcurrentBatches,
	}
}

func (s *MigrationService) StartTask(taskID string) error {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	// 检查任务是否已在运行
	if _, exists := s.runningTasks[taskID]; exists {
		return fmt.Errorf("任务已在运行中")
	}

	// 检查并发任务数限制
	if len(s.runningTasks) >= s.maxConcurrentTasks {
		return fmt.Errorf("已达到最大并发任务数限制 (%d)，请等待其他任务完成", s.maxConcurrentTasks)
	}

	// 获取任务信息
	tasks, err := s.store.GetMigrationTasks()
	if err != nil {
		return err
	}

	var task *models.MigrationTask
	for i, t := range tasks {
		if t.ID == taskID {
			task = &tasks[i]
			break
		}
	}

	if task == nil {
		return fmt.Errorf("任务不存在")
	}

	// 创建停止通道
	stopChan := make(chan bool, 1)
	s.runningTasks[taskID] = stopChan

	// 启动任务
	go s.executeTask(task, stopChan)

	return nil
}

func (s *MigrationService) StopTask(taskID string) error {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	stopChan, exists := s.runningTasks[taskID]
	if !exists {
		return fmt.Errorf("任务未在运行")
	}

	// 发送停止信号
	select {
	case stopChan <- true:
	default:
	}

	delete(s.runningTasks, taskID)
	return nil
}

func (s *MigrationService) PauseTask(taskID string) error {
	// 获取任务信息
	tasks, err := s.store.GetMigrationTasks()
	if err != nil {
		return err
	}

	var task *models.MigrationTask
	for i, t := range tasks {
		if t.ID == taskID {
			task = &tasks[i]
			break
		}
	}

	if task == nil {
		return fmt.Errorf("任务不存在")
	}

	// 更新任务状态为暂停
	task.Status = "paused"
	return s.store.SaveMigrationTask(*task)
}

// ExecuteMigration 执行迁移任务（基于前端配置）
func (s *MigrationService) ExecuteMigration(taskID string, config models.MigrationConfig) {
	defer func() {
		s.mutex.Lock()
		delete(s.runningTasks, taskID)
		s.mutex.Unlock()
	}()

	// 获取任务信息
	tasks, err := s.store.GetMigrationTasks()
	if err != nil {
		log.Printf("获取任务失败: %v", err)
		return
	}

	var task *models.MigrationTask
	for i, t := range tasks {
		if t.ID == taskID {
			task = &tasks[i]
			break
		}
	}

	if task == nil {
		log.Printf("任务不存在: %s", taskID)
		return
	}

	// 创建停止通道
	stopChan := make(chan bool, 1)
	s.mutex.Lock()
	s.runningTasks[taskID] = stopChan
	s.mutex.Unlock()

	// 更新任务状态为运行中，重置进度和处理记录数
	task.Status = "running"
	task.Progress = 0
	task.ProcessedRecords = 0
	task.TotalRecords = 0
	task.CurrentTable = ""
	task.ErrorMessage = ""
	s.store.SaveMigrationTask(*task)

	log.Printf("开始执行迁移任务: %s", task.Name)

	// 获取数据源信息
	dataSources, err := s.store.GetDataSources()
	if err != nil {
		s.finishTaskWithError(task, fmt.Errorf("获取数据源失败: %v", err))
		return
	}

	var sourceDS, targetDS *models.DataSource
	for i, ds := range dataSources {
		if ds.ID == task.SourceDatabase {
			sourceDS = &dataSources[i]
		}
		if ds.ID == task.TargetDatabase {
			targetDS = &dataSources[i]
		}
	}

	if sourceDS == nil {
		log.Printf("未找到源数据库，ID: %s", task.SourceDatabase)
	}

	if targetDS == nil {
		log.Printf("未找到目标数据库，ID: %s", task.TargetDatabase)
	}

	if sourceDS == nil || targetDS == nil {
		s.finishTaskWithError(task, fmt.Errorf("数据源不存在"))
		return
	}

	// 执行每个表的迁移
	totalTables := len(config.Tables)
	for i, tableConfig := range config.Tables {
		select {
		case <-stopChan:
			log.Printf("任务被停止: %s", task.Name)
			task.Status = "stopped"
			s.store.SaveMigrationTask(*task)
			return
		default:
		}

		log.Printf("迁移表 %s (%d/%d)", tableConfig.Name, i+1, totalTables)

		// 更新当前处理的表
		task.CurrentTable = tableConfig.Name
		s.store.SaveMigrationTask(*task)

		if err := s.migrateTableFromConfig(task, tableConfig, *sourceDS, *targetDS, task.DuplicateStrategy, task.TableStrategy); err != nil {
			log.Printf("表迁移失败 %s: %v", tableConfig.Name, err)
			// 记录错误但继续执行其他表
		}

		// 更新进度
		task.Progress = int((float64(i+1) / float64(totalTables)) * 100)
		s.store.SaveMigrationTask(*task)
	}

	// 完成任务
	task.Status = "completed"
	task.Progress = 100
	now := time.Now()
	task.EndAt = &now
	s.store.SaveMigrationTask(*task)

	log.Printf("迁移任务完成: %s", task.Name)
}

// migrateTableFromConfig 基于前端配置迁移表
func (s *MigrationService) migrateTableFromConfig(task *models.MigrationTask, tableConfig models.MigrationTableConfig, sourceDS, targetDS models.DataSource, duplicateStrategy, tableStrategy string) error {
	// 连接数据库
	sourceDB, err := s.dbService.GetConnection(sourceDS)
	if err != nil {
		return fmt.Errorf("连接源数据库失败: %v", err)
	}
	defer sourceDB.Close()

	targetDB, err := s.dbService.GetConnection(targetDS)
	if err != nil {
		return fmt.Errorf("连接目标数据库失败: %v", err)
	}
	defer targetDB.Close()

	// 调试信息：打印数据库信息
	log.Printf("源数据库: %s (%s), 目标数据库: %s (%s)", sourceDS.Name, sourceDS.Type, targetDS.Name, targetDS.Type)

	// 构建查询条件
	whereClause, err := s.buildWhereClauseFromConfig(tableConfig)
	if err != nil {
		return fmt.Errorf("构建查询条件失败: %v", err)
	}

	// 获取源表字段
	sourceColumns, err := s.dbService.GetColumns(sourceDS, tableConfig.Name)
	if err != nil {
		return fmt.Errorf("获取源表字段失败: %v", err)
	}

	// 检查并创建目标表
	if err := s.ensureTargetTableExists(sourceDB, targetDB, tableConfig.Name, sourceDS, targetDS, tableStrategy); err != nil {
		return fmt.Errorf("创建目标表失败: %v", err)
	}

	// 如果不需要同步数据，只创建表结构即可
	if !tableConfig.SyncData {
		log.Printf("表 %s 设置为仅同步结构，跳过数据迁移", tableConfig.Name)
		return nil
	}

	// 构建查询SQL
	selectFields := make([]string, 0, len(sourceColumns))
	for _, col := range sourceColumns {
		selectFields = append(selectFields, quoteIdentifier(col.Name))
	}

	query := fmt.Sprintf("SELECT %s FROM %s", strings.Join(selectFields, ", "), quoteIdentifier(tableConfig.Name))
	if whereClause != "" {
		query += " WHERE " + whereClause
	}

	// 执行查询
	rows, err := sourceDB.Query(query)
	if err != nil {
		return fmt.Errorf("查询源数据失败: %v", err)
	}
	defer rows.Close()

	// 获取脱敏规则
	maskingRules, err := s.getMaskingRulesFromConfig(tableConfig.MaskingRules)
	if err != nil {
		return fmt.Errorf("获取脱敏规则失败: %v", err)
	}

	// 批量插入数据
	recordCount := int64(0)
	batchSize := s.config.DefaultBatchSize

	var batch [][]interface{}
	for rows.Next() {
		// 创建扫描目标
		values := make([]interface{}, len(sourceColumns))
		valuePtrs := make([]interface{}, len(sourceColumns))
		for i := range values {
			valuePtrs[i] = &values[i]
		}

		if err := rows.Scan(valuePtrs...); err != nil {
			return fmt.Errorf("扫描数据失败: %v", err)
		}

		// 应用脱敏规则
		for i, col := range sourceColumns {
			if rule, exists := maskingRules[col.Name]; exists {
				values[i] = s.applyMaskingFromConfig(values[i], rule)
			}
		}

		batch = append(batch, values)

		// 批量插入
		if len(batch) >= batchSize {
			if err := s.insertBatchWithStrategy(targetDB, tableConfig.Name, sourceColumns, batch, duplicateStrategy); err != nil {
				return fmt.Errorf("批量插入失败: %v", err)
			}
			recordCount += int64(len(batch))
			// 使用锁保护任务状态更新
			s.mutex.Lock()
			task.ProcessedRecords += int64(len(batch))
			s.store.SaveMigrationTask(*task)
			s.mutex.Unlock()
			batch = batch[:0] // 清空批次
		}
	}

	// 插入剩余数据
	if len(batch) > 0 {
		if err := s.insertBatchWithStrategy(targetDB, tableConfig.Name, sourceColumns, batch, duplicateStrategy); err != nil {
			return fmt.Errorf("插入剩余数据失败: %v", err)
		}
		recordCount += int64(len(batch))
		// 使用锁保护任务状态更新
		s.mutex.Lock()
		task.ProcessedRecords += int64(len(batch))
		s.store.SaveMigrationTask(*task)
		s.mutex.Unlock()
	}

	log.Printf("表 %s 迁移完成，共处理 %d 条记录", tableConfig.Name, recordCount)
	return nil
}

// buildWhereClauseFromConfig 基于前端配置构建WHERE子句
func (s *MigrationService) buildWhereClauseFromConfig(tableConfig models.MigrationTableConfig) (string, error) {
	var conditions []string

	// 添加自定义条件
	for _, condition := range tableConfig.CustomConditions {
		condStr := formatCondition(condition)
		conditions = append(conditions, condStr)
	}

	// 添加模板条件
	if len(tableConfig.FilterTemplates) > 0 {
		templates, err := s.store.GetFilterTemplates()
		if err != nil {
			return "", err
		}

		for _, templateID := range tableConfig.FilterTemplates {
			for _, template := range templates {
				if template.ID == templateID {
					for _, condition := range template.Conditions {
						condStr := formatCondition(condition)
						conditions = append(conditions, condStr)
					}
					break
				}
			}
		}
	}

	if len(conditions) == 0 {
		return "", nil
	}

	return strings.Join(conditions, " AND "), nil
}

// getMaskingRulesFromConfig 基于前端配置获取脱敏规则
func (s *MigrationService) getMaskingRulesFromConfig(ruleMap map[string]interface{}) (map[string]map[string]interface{}, error) {
	if len(ruleMap) == 0 {
		return make(map[string]map[string]interface{}), nil
	}

	// 获取所有脱敏规则
	allRules, err := s.store.GetMaskingRules()
	if err != nil {
		return nil, err
	}

	result := make(map[string]map[string]interface{})

	for field, ruleConfig := range ruleMap {
		if configMap, ok := ruleConfig.(map[string]interface{}); ok {
			// 检查是否有ruleId（使用预定义规则）
			if ruleId, exists := configMap["ruleId"].(string); exists {
				// 根据ruleId查找实际的脱敏规则
				for _, rule := range allRules {
					if rule.ID == ruleId && rule.Enabled {
						result[field] = map[string]interface{}{
							"type":    rule.Type,
							"pattern": rule.Pattern,
							"replace": rule.Replace,
						}
						break
					}
				}
			} else if pattern, hasPattern := configMap["pattern"].(string); hasPattern {
				// 处理自定义脱敏规则（直接包含pattern和replace）
				if replace, hasReplace := configMap["replace"].(string); hasReplace {
					ruleType := "custom"
					if typeStr, hasType := configMap["type"].(string); hasType {
						ruleType = typeStr
					}

					result[field] = map[string]interface{}{
						"type":    ruleType,
						"pattern": pattern,
						"replace": replace,
					}
				}
			}
		}
	}
	return result, nil
}

// applyMaskingFromConfig 基于前端配置应用脱敏
func (s *MigrationService) applyMaskingFromConfig(value interface{}, ruleConfig map[string]interface{}) interface{} {
	if value == nil {
		return value
	}

	var str string
	switch v := value.(type) {
	case string:
		str = v
	case []byte:
		str = string(v)
	default:
		return value
	}

	ruleType, exists := ruleConfig["type"]
	if !exists {
		return value
	}

	var result interface{}
	switch ruleType {
	case "phone":
		result = s.maskPhone(str)
	case "email":
		result = s.maskEmail(str)
	case "idcard":
		result = s.maskIDCard(str)
	case "name", "chinese_name":
		// 姓名脱敏：优先使用配置的规则，否则使用默认姓名脱敏
		if pattern, ok := ruleConfig["pattern"].(string); ok && pattern != "" {
			if replace, ok := ruleConfig["replace"].(string); ok && replace != "" {
				result = s.maskCustom(str, pattern, replace)
			} else {
				result = s.maskName(str)
			}
		} else {
			result = s.maskName(str)
		}
	case "keep_head_tail":
		// 保留首尾脱敏
		if pattern, ok := ruleConfig["pattern"].(string); ok && pattern != "" {
			if replace, ok := ruleConfig["replace"].(string); ok && replace != "" {
				result = s.maskCustom(str, pattern, replace)
			} else {
				result = s.maskKeepHeadTail(str)
			}
		} else {
			result = s.maskKeepHeadTail(str)
		}
	case "keep_head":
		// 保留开头脱敏
		if pattern, ok := ruleConfig["pattern"].(string); ok && pattern != "" {
			if replace, ok := ruleConfig["replace"].(string); ok && replace != "" {
				result = s.maskCustom(str, pattern, replace)
			} else {
				result = s.maskKeepHead(str)
			}
		} else {
			result = s.maskKeepHead(str)
		}
	case "keep_tail":
		// 保留结尾脱敏
		if pattern, ok := ruleConfig["pattern"].(string); ok && pattern != "" {
			if replace, ok := ruleConfig["replace"].(string); ok && replace != "" {
				result = s.maskCustom(str, pattern, replace)
			} else {
				result = s.maskKeepTail(str)
			}
		} else {
			result = s.maskKeepTail(str)
		}
	case "bank_card":
		// 银行卡号脱敏
		if pattern, ok := ruleConfig["pattern"].(string); ok && pattern != "" {
			if replace, ok := ruleConfig["replace"].(string); ok && replace != "" {
				result = s.maskCustom(str, pattern, replace)
			} else {
				result = s.maskBankCard(str)
			}
		} else {
			result = s.maskBankCard(str)
		}
	case "address":
		// 地址脱敏
		if pattern, ok := ruleConfig["pattern"].(string); ok && pattern != "" {
			if replace, ok := ruleConfig["replace"].(string); ok && replace != "" {
				result = s.maskCustom(str, pattern, replace)
			} else {
				result = s.maskAddress(str)
			}
		} else {
			result = s.maskAddress(str)
		}
	case "full_mask":
		// 全部脱敏
		result = "****"
	case "custom":
		// 使用自定义规则
		if pattern, ok := ruleConfig["pattern"].(string); ok && pattern != "" {
			if replace, ok := ruleConfig["replace"].(string); ok && replace != "" {
				result = s.maskCustom(str, pattern, replace)
			} else {
				result = s.smartMask(str)
			}
		} else {
			result = s.smartMask(str)
		}
	default:
		result = s.smartMask(str)
	}
	return result
}

// insertBatchSimple 简化的批量插入
func (s *MigrationService) insertBatchSimple(db *sql.DB, tableName string, sourceColumns []ColumnInfo, batch [][]interface{}) error {
	if len(batch) == 0 {
		return nil
	}

	// 构建字段列表，跳过生成列
	var fields []string
	var validColumnIndexes []int
	for i, col := range sourceColumns {
		if !col.Generated {
			fields = append(fields, quoteIdentifier(col.Name))
			validColumnIndexes = append(validColumnIndexes, i)
		}
	}

	// 构建字段占位符
	placeholders := make([]string, len(fields))
	for i := range placeholders {
		placeholders[i] = "?"
	}

	// 使用 INSERT IGNORE 来跳过重复记录，或者使用 ON DUPLICATE KEY UPDATE
	insertSQL := fmt.Sprintf("INSERT IGNORE INTO %s (%s) VALUES (%s)",
		quoteIdentifier(tableName),
		strings.Join(fields, ", "),
		strings.Join(placeholders, ", "))

	// 准备语句
	stmt, err := db.Prepare(insertSQL)
	if err != nil {
		return err
	}
	defer stmt.Close()

	successCount := 0
	skipCount := 0

	// 批量执行
	for _, row := range batch {
		// 只传递非生成列的数据
		validRow := make([]interface{}, len(validColumnIndexes))
		for i, colIndex := range validColumnIndexes {
			validRow[i] = row[colIndex]
		}

		result, err := stmt.Exec(validRow...)
		if err != nil {
			log.Printf("插入数据失败: %v", err)
			continue
		}

		// 检查是否实际插入了数据
		if rowsAffected, err := result.RowsAffected(); err == nil {
			if rowsAffected > 0 {
				successCount++
			} else {
				skipCount++
			}
		}
	}

	if skipCount > 0 {
		log.Printf("表 %s: 成功插入 %d 条记录，跳过重复记录 %d 条", tableName, successCount, skipCount)
	}

	return nil
}

func (s *MigrationService) executeTask(task *models.MigrationTask, stopChan chan bool) {
	defer func() {
		s.mutex.Lock()
		delete(s.runningTasks, task.ID)
		s.mutex.Unlock()
	}()

	// 更新任务状态为运行中，重置所有计数器
	task.Status = "running"
	task.Progress = 0
	task.ProcessedRecords = 0
	task.TotalRecords = 0
	task.CurrentTable = ""
	task.ErrorMessage = ""
	task.StartAt = time.Now()
	s.store.SaveMigrationTask(*task)

	log.Printf("开始执行迁移任务: %s", task.Name)

	// 直接使用任务中的表配置
	selectedTables := task.Tables

	if len(selectedTables) == 0 {
		s.finishTaskWithError(task, fmt.Errorf("没有找到要迁移的表"))
		return
	}

	// 获取数据源信息
	dataSources, err := s.store.GetDataSources()
	if err != nil {
		s.finishTaskWithError(task, fmt.Errorf("获取数据源失败: %v", err))
		return
	}

	var sourceDS, targetDS *models.DataSource
	for i, ds := range dataSources {
		if ds.ID == task.SourceDatabase {
			sourceDS = &dataSources[i]
		}
		if ds.ID == task.TargetDatabase {
			targetDS = &dataSources[i]
		}
	}

	if sourceDS == nil {
		log.Printf("未找到源数据库，ID: %s", task.SourceDatabase)
	}

	if targetDS == nil {
		log.Printf("未找到目标数据库，ID: %s", task.TargetDatabase)
	}

	if sourceDS == nil || targetDS == nil {
		s.finishTaskWithError(task, fmt.Errorf("数据源不存在"))
		return
	}

	// 计算总记录数
	log.Printf("开始计算总记录数...")
	task.TotalRecords = 0
	sourceDB, err := s.dbService.GetConnection(*sourceDS)
	if err != nil {
		s.finishTaskWithError(task, fmt.Errorf("连接源数据库失败: %v", err))
		return
	}
	defer sourceDB.Close()

	for _, tableConfig := range selectedTables {
		// 构建查询条件
		whereClause, err := s.buildWhereClauseFromConfig(tableConfig)
		if err != nil {
			log.Printf("构建查询条件失败，跳过表 %s: %v", tableConfig.Name, err)
			continue
		}

		// 计算记录数
		countQuery := fmt.Sprintf("SELECT COUNT(*) FROM %s", quoteIdentifier(tableConfig.Name))
		if whereClause != "" {
			countQuery += " WHERE " + whereClause
		}

		var count int64
		if err := sourceDB.QueryRow(countQuery).Scan(&count); err != nil {
			log.Printf("计算表 %s 记录数失败: %v", tableConfig.Name, err)
			continue
		}

		task.TotalRecords += count
		log.Printf("表 %s 预计迁移 %d 条记录", tableConfig.Name, count)
	}

	log.Printf("总计预计迁移 %d 条记录", task.TotalRecords)
	s.store.SaveMigrationTask(*task)

	// 并发执行表迁移
	if err := s.executeTablesConcurrently(task, selectedTables, *sourceDS, *targetDS, stopChan); err != nil {
		log.Printf("并发迁移失败: %v", err)
		// 继续执行，不中断任务
	}

	// 完成任务
	task.Status = "completed"
	task.Progress = 100
	now := time.Now()
	task.EndAt = &now
	s.store.SaveMigrationTask(*task)

	log.Printf("迁移任务完成: %s", task.Name)
}

func (s *MigrationService) migrateTable(task *models.MigrationTask, tableMigration models.TableMigration) error {
	startTime := time.Now()

	// 获取数据源信息
	dataSources, err := s.store.GetDataSources()
	if err != nil {
		return err
	}

	var sourceDS, targetDS *models.DataSource
	for _, ds := range dataSources {
		if ds.ID == tableMigration.SourceDS {
			sourceDS = &ds
		}
		if ds.ID == tableMigration.TargetDS {
			targetDS = &ds
		}
	}

	if sourceDS == nil || targetDS == nil {
		return fmt.Errorf("数据源不存在")
	}

	// 连接数据库
	sourceDB, err := s.dbService.GetConnection(*sourceDS)
	if err != nil {
		return fmt.Errorf("连接源数据库失败: %v", err)
	}
	defer sourceDB.Close()

	targetDB, err := s.dbService.GetConnection(*targetDS)
	if err != nil {
		return fmt.Errorf("连接目标数据库失败: %v", err)
	}
	defer targetDB.Close()

	// 构建查询条件
	whereClause, err := s.buildWhereClause(tableMigration)
	if err != nil {
		return fmt.Errorf("构建查询条件失败: %v", err)
	}

	// 获取源表字段
	sourceColumns, err := s.dbService.GetColumns(*sourceDS, tableMigration.SourceTable)
	if err != nil {
		return fmt.Errorf("获取源表字段失败: %v", err)
	}

	// 构建查询SQL
	selectFields := make([]string, 0, len(sourceColumns))
	for _, col := range sourceColumns {
		selectFields = append(selectFields, quoteIdentifier(col.Name))
	}

	query := fmt.Sprintf("SELECT %s FROM %s", strings.Join(selectFields, ", "), quoteIdentifier(tableMigration.SourceTable))
	if whereClause != "" {
		query += " WHERE " + whereClause
	}

	// 执行查询
	rows, err := sourceDB.Query(query)
	if err != nil {
		return fmt.Errorf("查询源数据失败: %v", err)
	}
	defer rows.Close()

	// 获取脱敏规则
	maskingRules, err := s.getMaskingRules(tableMigration.MaskingRules)
	if err != nil {
		return fmt.Errorf("获取脱敏规则失败: %v", err)
	}

	// 批量插入数据
	recordCount := int64(0)
	batchSize := tableMigration.BatchSize
	if batchSize <= 0 {
		batchSize = s.config.DefaultBatchSize
	}

	var batch [][]interface{}
	for rows.Next() {
		// 创建扫描目标
		values := make([]interface{}, len(sourceColumns))
		valuePtrs := make([]interface{}, len(sourceColumns))
		for i := range values {
			valuePtrs[i] = &values[i]
		}

		if err := rows.Scan(valuePtrs...); err != nil {
			return fmt.Errorf("扫描数据失败: %v", err)
		}

		// 应用脱敏规则
		for i, col := range sourceColumns {
			if rule, exists := maskingRules[col.Name]; exists {
				values[i] = s.applyMasking(values[i], rule)
			}
		}

		batch = append(batch, values)

		// 批量插入
		if len(batch) >= batchSize {
			if err := s.insertBatch(targetDB, tableMigration.TargetTable, sourceColumns, tableMigration.FieldMappings, batch); err != nil {
				return fmt.Errorf("批量插入失败: %v", err)
			}
			recordCount += int64(len(batch))
			batch = batch[:0] // 清空批次
		}
	}

	// 插入剩余数据
	if len(batch) > 0 {
		if err := s.insertBatch(targetDB, tableMigration.TargetTable, sourceColumns, tableMigration.FieldMappings, batch); err != nil {
			return fmt.Errorf("插入剩余数据失败: %v", err)
		}
		recordCount += int64(len(batch))
	}

	// 记录迁移结果
	duration := time.Since(startTime).Milliseconds()
	record := models.MigrationRecord{
		ID:       generateUUID(),
		TaskID:   task.ID,
		TableID:  tableMigration.ID,
		Status:   "completed",
		Records:  recordCount,
		Duration: duration,
		CreateAt: time.Now(),
	}

	s.store.SaveMigrationRecord(record)

	return nil
}

func (s *MigrationService) buildWhereClause(tableMigration models.TableMigration) (string, error) {
	var conditions []string

	// 添加表级条件
	for _, condition := range tableMigration.Conditions {
		condStr := formatCondition(condition)
		conditions = append(conditions, condStr)
	}

	// 添加模板条件
	if len(tableMigration.TemplateRefs) > 0 {
		templates, err := s.store.GetFilterTemplates()
		if err != nil {
			return "", err
		}

		for _, templateID := range tableMigration.TemplateRefs {
			for _, template := range templates {
				if template.ID == templateID {
					for _, condition := range template.Conditions {
						condStr := formatCondition(condition)
						conditions = append(conditions, condStr)
					}
					break
				}
			}
		}
	}

	if len(conditions) == 0 {
		return "", nil
	}

	return strings.Join(conditions, " AND "), nil
}

func (s *MigrationService) getMaskingRules(ruleMap map[string]string) (map[string]models.MaskingRule, error) {
	if len(ruleMap) == 0 {
		return make(map[string]models.MaskingRule), nil
	}

	allRules, err := s.store.GetMaskingRules()
	if err != nil {
		return nil, err
	}

	result := make(map[string]models.MaskingRule)
	for field, ruleID := range ruleMap {
		for _, rule := range allRules {
			if rule.ID == ruleID {
				result[field] = rule
				break
			}
		}
	}

	return result, nil
}

func (s *MigrationService) applyMasking(value interface{}, rule models.MaskingRule) interface{} {
	if value == nil {
		return value
	}

	str, ok := value.(string)
	if !ok {
		return value
	}

	switch rule.Type {
	case "phone":
		return s.maskPhone(str)
	case "email":
		return s.maskEmail(str)
	case "idcard":
		return s.maskIDCard(str)
	case "custom":
		return s.maskCustom(str, rule.Pattern, rule.Replace)
	default:
		return value
	}
}

func (s *MigrationService) maskPhone(phone string) string {
	if len(phone) < 7 {
		return phone
	}
	return phone[:3] + "****" + phone[len(phone)-4:]
}

func (s *MigrationService) maskEmail(email string) string {
	parts := strings.Split(email, "@")
	if len(parts) != 2 {
		return email
	}

	username := parts[0]
	if len(username) <= 2 {
		return email
	}

	masked := username[:1] + "***" + username[len(username)-1:] + "@" + parts[1]
	return masked
}

func (s *MigrationService) maskIDCard(idcard string) string {
	if len(idcard) < 8 {
		return idcard
	}
	return idcard[:4] + "**********" + idcard[len(idcard)-4:]
}

func (s *MigrationService) maskName(name string) string {
	if len(name) == 0 {
		return name
	}

	// 对于中文姓名，保留首尾字符，中间用*替换
	runes := []rune(name)
	if len(runes) <= 1 {
		return name
	} else if len(runes) == 2 {
		return string(runes[0]) + "*"
	} else {
		// 保留第一个和最后一个字符，中间用*替换
		masked := string(runes[0])
		for i := 1; i < len(runes)-1; i++ {
			masked += "*"
		}
		masked += string(runes[len(runes)-1])
		return masked
	}
}

func (s *MigrationService) maskCustom(value, pattern, replace string) string {
	if pattern == "" {
		// 如果没有正则表达式，使用智能脱敏
		return s.smartMask(value)
	}

	// 尝试使用配置的正则表达式
	result := s.tryRegexMask(value, pattern, replace)
	if result != value {
		return result
	}

	// 如果配置的正则表达式不匹配，尝试通用正则表达式模板
	result = s.tryUniversalRegexMask(value, replace)
	if result != value {
		return result
	}

	// 最后使用智能脱敏作为后备方案
	return s.smartMask(value)
}

// tryRegexMask 尝试使用指定的正则表达式进行脱敏
func (s *MigrationService) tryRegexMask(value, pattern, replace string) string {
	re, err := regexp.Compile(pattern)
	if err != nil {
		log.Printf("正则表达式编译失败: %s, 错误: %v", pattern, err)
		return value
	}

	if re.MatchString(value) {
		return re.ReplaceAllString(value, replace)
	}

	return value
}

// tryUniversalRegexMask 尝试使用通用正则表达式模板进行脱敏
func (s *MigrationService) tryUniversalRegexMask(value, replace string) string {
	// 定义多个通用正则表达式模板，按优先级排序
	patterns := []struct {
		regex   string
		replace string
	}{
		// 长字符串（8个字符以上）：保留前2个和后2个
		{"^(.{2})(.{4,})(.{2})$", "$1****$3"},
		// 中等长度（5-7个字符）：保留首尾
		{"^(.)(.{3,5})(.)$", "$1***$3"},
		// 短字符串（3-4个字符）：保留首尾
		{"^(.)(.{1,2})(.)$", "$1*$3"},
		// 2个字符：保留第一个
		{"^(.)(.{1})$", "$1*"},
	}

	// 如果没有指定替换模式，使用默认的
	if replace == "" {
		replace = "$1***$3"
	}

	for _, p := range patterns {
		re, err := regexp.Compile(p.regex)
		if err != nil {
			continue
		}

		if re.MatchString(value) {
			// 使用模式自带的替换规则，或者用户指定的替换规则
			replacePattern := p.replace
			if replace != "$1***$3" {
				// 如果用户指定了特殊的替换模式，尝试适配
				replacePattern = s.adaptReplacePattern(replace, p.regex)
			}
			return re.ReplaceAllString(value, replacePattern)
		}
	}

	return value
}

// adaptReplacePattern 适配替换模式到不同的正则表达式
func (s *MigrationService) adaptReplacePattern(userReplace, regex string) string {
	// 根据正则表达式的捕获组数量调整替换模式
	switch regex {
	case "^(.{2})(.{4,})(.{2})$":
		// 3个捕获组
		return userReplace
	case "^(.)(.{3,5})(.)$", "^(.)(.{1,2})(.)$":
		// 3个捕获组
		return userReplace
	case "^(.)(.{1})$":
		// 2个捕获组，调整为只使用前两个
		if strings.Contains(userReplace, "$3") {
			return strings.ReplaceAll(userReplace, "$3", "")
		}
		return userReplace
	default:
		return userReplace
	}
}

// smartMask 智能脱敏函数，根据字符串长度和内容自动选择脱敏策略
func (s *MigrationService) smartMask(value string) string {
	if len(value) == 0 {
		return value
	}

	// 转换为rune数组以正确处理中文字符
	runes := []rune(value)
	length := len(runes)

	// 根据字符串类型和长度选择不同的脱敏策略
	switch {
	case length == 1:
		// 单个字符：根据类型决定是否脱敏
		if s.isSensitiveChar(runes[0]) {
			return "*"
		}
		return value

	case length == 2:
		// 两个字符：保留第一个，第二个用*替换
		return string(runes[0]) + "*"

	case length == 3:
		// 三个字符：保留首尾，中间用*替换
		return string(runes[0]) + "*" + string(runes[2])

	case length >= 4 && length <= 6:
		// 4-6个字符：保留首尾，中间用适量*替换
		maskCount := length - 2
		if maskCount > 4 {
			maskCount = 4 // 最多4个*
		}
		return string(runes[0]) + strings.Repeat("*", maskCount) + string(runes[length-1])

	case length >= 7 && length <= 10:
		// 7-10个字符：保留前2个和后1个，中间用***替换
		return string(runes[0]) + string(runes[1]) + "***" + string(runes[length-1])

	case length >= 11 && length <= 15:
		// 11-15个字符：保留前2个和后2个，中间用****替换
		return string(runes[0]) + string(runes[1]) + "****" + string(runes[length-2]) + string(runes[length-1])

	default:
		// 超过15个字符：保留前3个和后2个，中间用*****替换
		return string(runes[0]) + string(runes[1]) + string(runes[2]) + "*****" + string(runes[length-2]) + string(runes[length-1])
	}
}

// isSensitiveChar 判断单个字符是否需要脱敏
func (s *MigrationService) isSensitiveChar(r rune) bool {
	// 中文字符、字母、数字都认为是敏感字符
	if (r >= 0x4e00 && r <= 0x9fff) || // 中文字符
		(r >= 'a' && r <= 'z') || // 小写字母
		(r >= 'A' && r <= 'Z') || // 大写字母
		(r >= '0' && r <= '9') { // 数字
		return true
	}
	return false
}

// maskKeepHeadTail 保留首尾脱敏
func (s *MigrationService) maskKeepHeadTail(value string) string {
	if len(value) == 0 {
		return value
	}

	runes := []rune(value)
	length := len(runes)

	switch {
	case length <= 2:
		return value
	case length == 3:
		return string(runes[0]) + "*" + string(runes[2])
	case length <= 6:
		return string(runes[0]) + "**" + string(runes[length-1])
	default:
		return string(runes[0]) + string(runes[1]) + "***" + string(runes[length-2]) + string(runes[length-1])
	}
}

// maskKeepHead 保留开头脱敏
func (s *MigrationService) maskKeepHead(value string) string {
	if len(value) == 0 {
		return value
	}

	runes := []rune(value)
	length := len(runes)

	switch {
	case length <= 1:
		return value
	case length <= 3:
		return string(runes[0]) + "*"
	case length <= 6:
		return string(runes[0]) + string(runes[1]) + "**"
	default:
		return string(runes[0]) + string(runes[1]) + string(runes[2]) + "***"
	}
}

// maskKeepTail 保留结尾脱敏
func (s *MigrationService) maskKeepTail(value string) string {
	if len(value) == 0 {
		return value
	}

	runes := []rune(value)
	length := len(runes)

	switch {
	case length <= 1:
		return value
	case length <= 3:
		return "*" + string(runes[length-1])
	case length <= 6:
		return "**" + string(runes[length-2]) + string(runes[length-1])
	default:
		return "***" + string(runes[length-3]) + string(runes[length-2]) + string(runes[length-1])
	}
}

// maskBankCard 银行卡号脱敏
func (s *MigrationService) maskBankCard(cardNo string) string {
	if len(cardNo) < 8 {
		return cardNo
	}

	// 保留前4位和后4位
	return cardNo[:4] + strings.Repeat("*", len(cardNo)-8) + cardNo[len(cardNo)-4:]
}

// maskAddress 地址脱敏
func (s *MigrationService) maskAddress(address string) string {
	if len(address) == 0 {
		return address
	}

	runes := []rune(address)
	length := len(runes)

	switch {
	case length <= 4:
		return address
	case length <= 8:
		return string(runes[0]) + string(runes[1]) + "**" + string(runes[length-2]) + string(runes[length-1])
	default:
		return string(runes[0]) + string(runes[1]) + string(runes[2]) + "****" + string(runes[length-3]) + string(runes[length-2]) + string(runes[length-1])
	}
}

func (s *MigrationService) insertBatch(db *sql.DB, tableName string, sourceColumns []ColumnInfo, fieldMappings []models.FieldMapping, batch [][]interface{}) error {
	if len(batch) == 0 {
		return nil
	}

	// 构建字段映射
	fieldMap := make(map[string]string)
	for _, mapping := range fieldMappings {
		fieldMap[mapping.SourceField] = mapping.TargetField
	}

	// 构建插入字段列表，跳过生成列
	var targetFields []string
	var validColumnIndexes []int
	for i, col := range sourceColumns {
		if !col.Generated {
			if targetField, exists := fieldMap[col.Name]; exists {
				targetFields = append(targetFields, quoteIdentifier(targetField))
			} else {
				targetFields = append(targetFields, quoteIdentifier(col.Name))
			}
			validColumnIndexes = append(validColumnIndexes, i)
		}
	}

	// 构建插入SQL
	placeholders := make([]string, len(targetFields))
	for i := range placeholders {
		placeholders[i] = "?"
	}

	insertSQL := fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s)",
		quoteIdentifier(tableName),
		strings.Join(targetFields, ", "),
		strings.Join(placeholders, ", "))

	// 准备语句
	stmt, err := db.Prepare(insertSQL)
	if err != nil {
		return err
	}
	defer stmt.Close()

	// 批量执行
	for _, row := range batch {
		// 只传递非生成列的数据
		validRow := make([]interface{}, len(validColumnIndexes))
		for i, colIndex := range validColumnIndexes {
			validRow[i] = row[colIndex]
		}

		if _, err := stmt.Exec(validRow...); err != nil {
			return err
		}
	}

	return nil
}

func (s *MigrationService) finishTaskWithError(task *models.MigrationTask, err error) {
	task.Status = "failed"
	task.ErrorMessage = err.Error()
	now := time.Now()
	task.EndAt = &now
	s.store.SaveMigrationTask(*task)
	log.Printf("任务执行失败: %s, 错误: %v", task.Name, err)
}

func (s *MigrationService) recordMigrationError(taskID, tableID string, err error) {
	record := models.MigrationRecord{
		ID:       generateUUID(),
		TaskID:   taskID,
		TableID:  tableID,
		Status:   "failed",
		Error:    err.Error(),
		CreateAt: time.Now(),
	}
	s.store.SaveMigrationRecord(record)
}

// 生成UUID的辅助函数
func generateUUID() string {
	return fmt.Sprintf("%d", time.Now().UnixNano())
}

// ensureTargetTableExists 确保目标表存在，如果不存在则创建
func (s *MigrationService) ensureTargetTableExists(sourceDB, targetDB *sql.DB, tableName string, sourceDS, targetDS models.DataSource, tableStrategy string) error {
	// 检查目标表是否存在
	exists, err := s.tableExists(targetDB, tableName, targetDS.Type)
	if err != nil {
		return fmt.Errorf("检查目标表是否存在失败: %v", err)
	}

	if exists {
		switch tableStrategy {
		case "recreate":
			log.Printf("目标表 %s 已存在，根据策略重新创建表", tableName)
			// 删除现有表
			dropSQL := fmt.Sprintf("DROP TABLE IF EXISTS %s", tableName)
			if _, err := targetDB.Exec(dropSQL); err != nil {
				return fmt.Errorf("删除现有表失败: %v", err)
			}
			log.Printf("已删除现有表: %s", tableName)
			// 继续创建新表
		case "create_only":
			log.Printf("目标表 %s 已存在，根据策略跳过创建", tableName)
			return nil
		default: // "use_existing"
			log.Printf("目标表 %s 已存在，检查表结构...", tableName)

			// 检查表是否为空
			isEmpty, err := s.isTableEmpty(targetDB, tableName)
			if err != nil {
				log.Printf("检查表是否为空失败: %v", err)
			} else if isEmpty {
				log.Printf("目标表 %s 为空表，继续使用现有表结构", tableName)
			} else {
				log.Printf("目标表 %s 包含数据，将根据重复数据处理策略处理", tableName)
			}

			return nil
		}
	}

	log.Printf("目标表 %s 不存在，开始创建...", tableName)

	// 获取源表的创建语句
	createSQL, err := s.getCreateTableSQL(sourceDB, tableName, sourceDS.Type, targetDS.Type)
	if err != nil {
		return fmt.Errorf("获取表创建语句失败: %v", err)
	}

	// 执行创建表语句
	if _, err := targetDB.Exec(createSQL); err != nil {
		return fmt.Errorf("执行创建表语句失败: %v, SQL: %s", err, createSQL)
	}

	log.Printf("成功创建目标表: %s", tableName)
	return nil
}

// isTableEmpty 检查表是否为空
func (s *MigrationService) isTableEmpty(db *sql.DB, tableName string) (bool, error) {
	query := fmt.Sprintf("SELECT COUNT(*) FROM %s LIMIT 1", quoteIdentifier(tableName))
	var count int
	err := db.QueryRow(query).Scan(&count)
	if err != nil {
		return false, err
	}
	return count == 0, nil
}

// tableExists 检查表是否存在
func (s *MigrationService) tableExists(db *sql.DB, tableName, dbType string) (bool, error) {

	var query string
	var args []interface{}

	switch dbType {
	case "mysql":
		query = "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?"
		args = []interface{}{tableName}
	case "postgresql":
		query = "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ?"
		args = []interface{}{tableName}
	default:
		return false, fmt.Errorf("不支持的数据库类型: %s", dbType)
	}

	var count int
	err := db.QueryRow(query, args...).Scan(&count)
	if err != nil {
		return false, err
	}

	return count > 0, nil
}

// getCreateTableSQL 获取创建表的SQL语句
func (s *MigrationService) getCreateTableSQL(sourceDB *sql.DB, tableName, sourceType, targetType string) (string, error) {
	switch sourceType {
	case "mysql":
		return s.getMySQLCreateTableSQL(sourceDB, tableName, targetType)
	case "postgresql":
		return s.getPostgreSQLCreateTableSQL(sourceDB, tableName, targetType)
	default:
		return "", fmt.Errorf("不支持的源数据库类型: %s", sourceType)
	}
}

// getMySQLCreateTableSQL 获取MySQL表的创建语句
func (s *MigrationService) getMySQLCreateTableSQL(sourceDB *sql.DB, tableName, targetType string) (string, error) {
	query := "SHOW CREATE TABLE " + tableName
	var table, createSQL string

	err := sourceDB.QueryRow(query).Scan(&table, &createSQL)
	if err != nil {
		return "", err
	}

	// 如果目标也是MySQL，直接返回
	if targetType == "mysql" {
		return createSQL, nil
	}

	// 如果目标是PostgreSQL，需要转换语法
	if targetType == "postgresql" {
		return s.convertMySQLToPostgreSQL(createSQL), nil
	}

	return createSQL, nil
}

// getPostgreSQLCreateTableSQL 获取PostgreSQL表的创建语句
func (s *MigrationService) getPostgreSQLCreateTableSQL(sourceDB *sql.DB, tableName, targetType string) (string, error) {
	// PostgreSQL获取表结构比较复杂，这里简化处理
	query := `
		SELECT column_name, data_type, is_nullable, column_default
		FROM information_schema.columns 
		WHERE table_name = $1 
		ORDER BY ordinal_position
	`

	rows, err := sourceDB.Query(query, tableName)
	if err != nil {
		return "", err
	}
	defer rows.Close()

	var columns []string
	for rows.Next() {
		var columnName, dataType, isNullable string
		var columnDefault sql.NullString

		if err := rows.Scan(&columnName, &dataType, &isNullable, &columnDefault); err != nil {
			return "", err
		}

		columnDef := fmt.Sprintf("%s %s", columnName, dataType)

		if isNullable == "NO" {
			columnDef += " NOT NULL"
		}

		if columnDefault.Valid {
			columnDef += " DEFAULT " + columnDefault.String
		}

		columns = append(columns, columnDef)
	}

	if len(columns) == 0 {
		return "", fmt.Errorf("表 %s 没有找到字段", tableName)
	}

	createSQL := fmt.Sprintf("CREATE TABLE %s (\n  %s\n)", tableName, strings.Join(columns, ",\n  "))

	// 如果目标是MySQL，需要转换语法
	if targetType == "mysql" {
		return s.convertPostgreSQLToMySQL(createSQL), nil
	}

	return createSQL, nil
}

// convertMySQLToPostgreSQL 将MySQL的CREATE TABLE语句转换为PostgreSQL格式
func (s *MigrationService) convertMySQLToPostgreSQL(mysqlSQL string) string {
	// 简化的转换逻辑，实际项目中需要更完善的转换
	pgSQL := mysqlSQL

	// 移除MySQL特有的语法
	pgSQL = regexp.MustCompile(`ENGINE=\w+`).ReplaceAllString(pgSQL, "")
	pgSQL = regexp.MustCompile(`DEFAULT CHARSET=\w+`).ReplaceAllString(pgSQL, "")
	pgSQL = regexp.MustCompile(`AUTO_INCREMENT=\d+`).ReplaceAllString(pgSQL, "")
	pgSQL = regexp.MustCompile(`AUTO_INCREMENT`).ReplaceAllString(pgSQL, "SERIAL")

	// 数据类型转换
	pgSQL = strings.ReplaceAll(pgSQL, "int(11)", "INTEGER")
	pgSQL = strings.ReplaceAll(pgSQL, "varchar(", "VARCHAR(")
	pgSQL = strings.ReplaceAll(pgSQL, "datetime", "TIMESTAMP")
	pgSQL = strings.ReplaceAll(pgSQL, "tinyint(1)", "BOOLEAN")

	// 移除反引号
	pgSQL = strings.ReplaceAll(pgSQL, "`", "")

	return pgSQL
}

// convertPostgreSQLToMySQL 将PostgreSQL的CREATE TABLE语句转换为MySQL格式
func (s *MigrationService) convertPostgreSQLToMySQL(pgSQL string) string {
	// 简化的转换逻辑
	mysqlSQL := pgSQL

	// 数据类型转换
	mysqlSQL = strings.ReplaceAll(mysqlSQL, "SERIAL", "INT AUTO_INCREMENT")
	mysqlSQL = strings.ReplaceAll(mysqlSQL, "BOOLEAN", "TINYINT(1)")
	mysqlSQL = strings.ReplaceAll(mysqlSQL, "TIMESTAMP", "DATETIME")

	// 添加MySQL引擎
	mysqlSQL += " ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"

	return mysqlSQL
}

// insertBatchWithStrategy 根据策略批量插入数据
func (s *MigrationService) insertBatchWithStrategy(db *sql.DB, tableName string, sourceColumns []ColumnInfo, batch [][]interface{}, strategy string) error {
	if len(batch) == 0 {
		return nil
	}

	// 构建字段列表，跳过生成列
	var fields []string
	var fieldNames []string // 保存原始字段名用于VALUES()函数
	var validColumnIndexes []int
	for i, col := range sourceColumns {
		if !col.Generated {
			fields = append(fields, quoteIdentifier(col.Name))
			fieldNames = append(fieldNames, col.Name)
			validColumnIndexes = append(validColumnIndexes, i)
		}
	}

	// 构建字段占位符
	placeholders := make([]string, len(fields))
	for i := range placeholders {
		placeholders[i] = "?"
	}

	var insertSQL string

	// 根据策略构建不同的SQL语句
	switch strategy {
	case "ignore":
		// 跳过重复记录
		insertSQL = fmt.Sprintf("INSERT IGNORE INTO %s (%s) VALUES (%s)",
			quoteIdentifier(tableName),
			strings.Join(fields, ", "),
			strings.Join(placeholders, ", "))
	case "replace":
		// 替换重复记录
		insertSQL = fmt.Sprintf("REPLACE INTO %s (%s) VALUES (%s)",
			quoteIdentifier(tableName),
			strings.Join(fields, ", "),
			strings.Join(placeholders, ", "))
	case "update":
		// 更新重复记录
		updateFields := make([]string, len(fields))
		for i, field := range fields {
			fieldName := fieldNames[i]
			if fieldName != "id" { // 假设id是主键，不更新主键
				updateFields[i] = fmt.Sprintf("%s = VALUES(%s)", field, field)
			}
		}
		// 过滤掉空的更新字段
		var validUpdateFields []string
		for _, field := range updateFields {
			if field != "" {
				validUpdateFields = append(validUpdateFields, field)
			}
		}

		insertSQL = fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s) ON DUPLICATE KEY UPDATE %s",
			quoteIdentifier(tableName),
			strings.Join(fields, ", "),
			strings.Join(placeholders, ", "),
			strings.Join(validUpdateFields, ", "))
	case "error":
		// 遇到重复记录就报错（默认INSERT行为）
		insertSQL = fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s)",
			quoteIdentifier(tableName),
			strings.Join(fields, ", "),
			strings.Join(placeholders, ", "))
	default:
		// 默认使用ignore策略
		insertSQL = fmt.Sprintf("INSERT IGNORE INTO %s (%s) VALUES (%s)",
			quoteIdentifier(tableName),
			strings.Join(fields, ", "),
			strings.Join(placeholders, ", "))
	}

	// 准备语句
	stmt, err := db.Prepare(insertSQL)
	if err != nil {
		return fmt.Errorf("准备SQL语句失败: %v, SQL: %s", err, insertSQL)
	}
	defer stmt.Close()

	successCount := 0
	skipCount := 0
	updateCount := 0
	errorCount := 0

	// 批量执行
	for _, row := range batch {
		// 只传递非生成列的数据
		validRow := make([]interface{}, len(validColumnIndexes))
		for i, colIndex := range validColumnIndexes {
			validRow[i] = row[colIndex]
		}

		result, err := stmt.Exec(validRow...)
		if err != nil {
			errorCount++
			if strategy == "error" {
				return fmt.Errorf("插入数据失败: %v", err)
			}
			log.Printf("插入数据失败: %v", err)
			continue
		}

		// 检查执行结果
		if rowsAffected, err := result.RowsAffected(); err == nil {
			if rowsAffected > 0 {
				if strategy == "update" {
					// 对于ON DUPLICATE KEY UPDATE，rowsAffected=1表示插入，=2表示更新
					if rowsAffected == 1 {
						successCount++
					} else if rowsAffected == 2 {
						updateCount++
					}
				} else {
					successCount++
				}
			} else {
				skipCount++
			}
		}
	}

	// 记录执行结果
	if strategy == "update" && updateCount > 0 {
		log.Printf("表 %s: 新增 %d 条，更新 %d 条，跳过 %d 条，错误 %d 条",
			tableName, successCount, updateCount, skipCount, errorCount)
	} else if skipCount > 0 || errorCount > 0 {
		log.Printf("表 %s: 成功 %d 条，跳过 %d 条，错误 %d 条",
			tableName, successCount, skipCount, errorCount)
	} else {
		log.Printf("表 %s: 成功插入 %d 条记录", tableName, successCount)
	}

	return nil
}

// executeTablesConcurrently 并发执行表迁移
func (s *MigrationService) executeTablesConcurrently(task *models.MigrationTask, tables []models.MigrationTableConfig, sourceDS, targetDS models.DataSource, stopChan chan bool) error {
	totalTables := len(tables)
	if totalTables == 0 {
		return nil
	}

	log.Printf("开始并发迁移 %d 个表，最大并发数: %d", totalTables, s.maxConcurrentTables)

	// 创建信号量控制并发数
	semaphore := make(chan struct{}, s.maxConcurrentTables)
	results := make(chan TableMigrationResult, totalTables)
	var wg sync.WaitGroup

	// 启动表迁移协程
	for i, tableConfig := range tables {
		wg.Add(1)
		go func(index int, config models.MigrationTableConfig) {
			defer wg.Done()

			// 获取信号量
			semaphore <- struct{}{}
			defer func() { <-semaphore }()

			// 检查是否被停止
			select {
			case <-stopChan:
				results <- TableMigrationResult{
					TableName:    config.Name,
					Success:      false,
					ErrorMessage: "任务被停止",
				}
				return
			default:
			}

			log.Printf("开始迁移表 %s (%d/%d)", config.Name, index+1, totalTables)
			startTime := time.Now()

			// 更新当前处理的表（并发安全）
			s.mutex.Lock()
			if task.CurrentTable == "" {
				task.CurrentTable = config.Name
			} else if !strings.Contains(task.CurrentTable, config.Name) {
				task.CurrentTable = task.CurrentTable + ", " + config.Name
			}
			s.store.SaveMigrationTask(*task)
			s.mutex.Unlock()

			// 执行表迁移（使用并发版本）
			err := s.migrateTableConcurrently(task, config, sourceDS, targetDS, task.DuplicateStrategy, task.TableStrategy)
			duration := time.Since(startTime)

			// 从当前处理表列表中移除该表
			s.mutex.Lock()
			currentTables := strings.Split(task.CurrentTable, ", ")
			var remainingTables []string
			for _, table := range currentTables {
				if table != config.Name && table != "" {
					remainingTables = append(remainingTables, table)
				}
			}
			task.CurrentTable = strings.Join(remainingTables, ", ")
			s.store.SaveMigrationTask(*task)
			s.mutex.Unlock()

			if err != nil {
				log.Printf("表 %s 迁移失败: %v", config.Name, err)
				results <- TableMigrationResult{
					TableName:    config.Name,
					Success:      false,
					ErrorMessage: err.Error(),
					Duration:     duration,
				}
			} else {
				log.Printf("表 %s 迁移成功，耗时: %v", config.Name, duration)
				results <- TableMigrationResult{
					TableName: config.Name,
					Success:   true,
					Duration:  duration,
				}
			}
		}(i, tableConfig)
	}

	// 启动结果收集协程
	go func() {
		wg.Wait()
		close(results)
	}()

	// 收集结果并更新进度
	completedTables := 0
	successCount := 0
	for result := range results {
		completedTables++
		if result.Success {
			successCount++
		}

		// 更新进度
		progress := int((float64(completedTables) / float64(totalTables)) * 100)
		task.Progress = progress
		s.store.SaveMigrationTask(*task)

		log.Printf("表迁移进度: %d/%d (成功: %d)", completedTables, totalTables, successCount)
	}

	log.Printf("并发表迁移完成: 总计 %d 个表，成功 %d 个", totalTables, successCount)
	return nil
}

// migrateTableConcurrently 并发迁移单个表的数据
func (s *MigrationService) migrateTableConcurrently(task *models.MigrationTask, tableConfig models.MigrationTableConfig, sourceDS, targetDS models.DataSource, duplicateStrategy, tableStrategy string) error {
	// 连接数据库
	sourceDB, err := s.dbService.GetConnection(sourceDS)
	if err != nil {
		return fmt.Errorf("连接源数据库失败: %v", err)
	}
	defer sourceDB.Close()

	targetDB, err := s.dbService.GetConnection(targetDS)
	if err != nil {
		return fmt.Errorf("连接目标数据库失败: %v", err)
	}
	defer targetDB.Close()

	log.Printf("源数据库: %s (%s), 目标数据库: %s (%s)", sourceDS.Name, sourceDS.Type, targetDS.Name, targetDS.Type)

	// 检查并创建目标表
	if err := s.ensureTargetTableExists(sourceDB, targetDB, tableConfig.Name, sourceDS, targetDS, tableStrategy); err != nil {
		return fmt.Errorf("创建目标表失败: %v", err)
	}

	// 如果不需要同步数据，只创建表结构即可
	if !tableConfig.SyncData {
		log.Printf("表 %s 设置为仅同步结构，跳过数据迁移", tableConfig.Name)
		return nil
	}

	// 构建查询条件
	whereClause, err := s.buildWhereClauseFromConfig(tableConfig)
	if err != nil {
		return fmt.Errorf("构建查询条件失败: %v", err)
	}

	// 获取源表字段
	sourceColumns, err := s.dbService.GetColumns(sourceDS, tableConfig.Name)
	if err != nil {
		return fmt.Errorf("获取源表字段失败: %v", err)
	}

	// 构建查询语句
	var fields []string
	for _, col := range sourceColumns {
		fields = append(fields, quoteIdentifier(col.Name))
	}

	query := fmt.Sprintf("SELECT %s FROM %s", strings.Join(fields, ", "), quoteIdentifier(tableConfig.Name))
	if whereClause != "" {
		query += " WHERE " + whereClause
	}

	// 执行查询
	rows, err := sourceDB.Query(query)
	if err != nil {
		return fmt.Errorf("查询源数据失败: %v", err)
	}
	defer rows.Close()

	// 获取脱敏规则
	maskingRules, err := s.getMaskingRulesFromConfig(tableConfig.MaskingRules)
	if err != nil {
		return fmt.Errorf("获取脱敏规则失败: %v", err)
	}

	// 并发处理数据批次（包含脱敏处理）
	return s.processBatchesConcurrentlyWithMasking(task, targetDB, tableConfig.Name, sourceColumns, rows, duplicateStrategy, maskingRules)
}

// processBatchesConcurrentlyWithMasking 并发处理数据批次（包含脱敏）
func (s *MigrationService) processBatchesConcurrentlyWithMasking(task *models.MigrationTask, targetDB *sql.DB, tableName string, sourceColumns []ColumnInfo, rows *sql.Rows, strategy string, maskingRules map[string]map[string]interface{}) error {
	batchSize := s.config.DefaultBatchSize

	// 创建批次通道
	batchChan := make(chan [][]interface{}, s.maxConcurrentBatch*2) // 缓冲通道
	resultChan := make(chan BatchResult, s.maxConcurrentBatch*2)

	var wg sync.WaitGroup

	// 启动批次处理协程
	for i := 0; i < s.maxConcurrentBatch; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()

			for batch := range batchChan {
				if len(batch) == 0 {
					continue
				}

				log.Printf("Worker %d 处理批次，记录数: %d", workerID, len(batch))

				err := s.insertBatchWithStrategy(targetDB, tableName, sourceColumns, batch, strategy)

				if err != nil {
					log.Printf("Worker %d 批次处理失败: %v", workerID, err)
					resultChan <- BatchResult{
						Success:      false,
						RecordCount:  len(batch),
						ErrorMessage: err.Error(),
					}
				} else {
					resultChan <- BatchResult{
						Success:     true,
						RecordCount: len(batch),
					}
				}
			}
		}(i)
	}

	// 启动结果收集协程
	go func() {
		wg.Wait()
		close(resultChan)
	}()

	// 读取数据并分批发送（包含脱敏处理）
	go func() {
		defer close(batchChan)

		batch := make([][]interface{}, 0, batchSize)

		for rows.Next() {
			// 创建接收数据的切片
			values := make([]interface{}, len(sourceColumns))
			valuePtrs := make([]interface{}, len(sourceColumns))
			for i := range values {
				valuePtrs[i] = &values[i]
			}

			// 扫描数据
			if err := rows.Scan(valuePtrs...); err != nil {
				log.Printf("扫描数据失败: %v", err)
				continue
			}

			// 应用脱敏规则
			for i, col := range sourceColumns {
				if rule, exists := maskingRules[col.Name]; exists {
					values[i] = s.applyMaskingFromConfig(values[i], rule)
				}
			}

			batch = append(batch, values)

			// 当批次满了或者是最后一批时，发送批次
			if len(batch) >= batchSize {
				batchChan <- batch
				batch = make([][]interface{}, 0, batchSize)
			}
		}

		// 发送最后一批
		if len(batch) > 0 {
			batchChan <- batch
		}
	}()

	// 收集结果
	totalRecords := 0
	successRecords := 0
	errorRecords := 0

	for result := range resultChan {
		totalRecords += result.RecordCount
		if result.Success {
			successRecords += result.RecordCount
		} else {
			errorRecords += result.RecordCount
		}

		// 使用锁保护任务状态更新
		s.mutex.Lock()
		task.ProcessedRecords += int64(result.RecordCount)
		s.store.SaveMigrationTask(*task)
		s.mutex.Unlock()
	}

	log.Printf("表 %s: 成功 %d 条，错误 %d 条", tableName, successRecords, errorRecords)
	log.Printf("表 %s 迁移完成，共处理 %d 条记录", tableName, totalRecords)

	return nil
}

// processBatchesConcurrently 并发处理数据批次（不含脱敏，保留兼容性）
func (s *MigrationService) processBatchesConcurrently(task *models.MigrationTask, targetDB *sql.DB, tableName string, sourceColumns []ColumnInfo, rows *sql.Rows, strategy string) error {
	batchSize := s.config.DefaultBatchSize

	// 创建批次通道
	batchChan := make(chan [][]interface{}, s.maxConcurrentBatch*2) // 缓冲通道
	resultChan := make(chan BatchResult, s.maxConcurrentBatch*2)

	var wg sync.WaitGroup

	// 启动批次处理协程
	for i := 0; i < s.maxConcurrentBatch; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()

			for batch := range batchChan {
				if len(batch) == 0 {
					continue
				}

				log.Printf("Worker %d 处理批次，记录数: %d", workerID, len(batch))

				err := s.insertBatchWithStrategy(targetDB, tableName, sourceColumns, batch, strategy)

				if err != nil {
					log.Printf("Worker %d 批次处理失败: %v", workerID, err)
					resultChan <- BatchResult{
						Success:      false,
						RecordCount:  len(batch),
						ErrorMessage: err.Error(),
					}
				} else {
					resultChan <- BatchResult{
						Success:     true,
						RecordCount: len(batch),
					}
				}
			}
		}(i)
	}

	// 启动结果收集协程
	go func() {
		wg.Wait()
		close(resultChan)
	}()

	// 读取数据并分批发送
	go func() {
		defer close(batchChan)

		batch := make([][]interface{}, 0, batchSize)

		for rows.Next() {
			// 创建接收数据的切片
			values := make([]interface{}, len(sourceColumns))
			valuePtrs := make([]interface{}, len(sourceColumns))
			for i := range values {
				valuePtrs[i] = &values[i]
			}

			// 扫描数据
			if err := rows.Scan(valuePtrs...); err != nil {
				log.Printf("扫描数据失败: %v", err)
				continue
			}

			batch = append(batch, values)

			// 当批次满了或者是最后一批时，发送批次
			if len(batch) >= batchSize {
				batchChan <- batch
				batch = make([][]interface{}, 0, batchSize)
			}
		}

		// 发送最后一批
		if len(batch) > 0 {
			batchChan <- batch
		}
	}()

	// 收集结果
	totalRecords := 0
	successRecords := 0
	errorRecords := 0

	for result := range resultChan {
		totalRecords += result.RecordCount
		if result.Success {
			successRecords += result.RecordCount
		} else {
			errorRecords += result.RecordCount
		}

		// 使用锁保护任务状态更新
		s.mutex.Lock()
		task.ProcessedRecords += int64(result.RecordCount)
		s.store.SaveMigrationTask(*task)
		s.mutex.Unlock()
	}

	log.Printf("表 %s: 成功 %d 条，错误 %d 条", tableName, successRecords, errorRecords)
	log.Printf("表 %s 迁移完成，共处理 %d 条记录", tableName, totalRecords)

	return nil
}

// SetConcurrencyLimits 设置并发限制（注意：现在并发配置由环境变量控制，此方法仅为兼容性保留）
func (s *MigrationService) SetConcurrencyLimits(maxTasks, maxTables, maxBatch int) {
	// 并发配置现在由环境变量控制，在程序启动时设置
	// 此方法保留是为了API兼容性，但不再动态修改配置
	log.Printf("注意: 并发配置现在由环境变量控制，请修改环境变量后重启程序")
	log.Printf("当前配置: 任务=%d, 表=%d, 批次=%d", s.maxConcurrentTasks, s.maxConcurrentTables, s.maxConcurrentBatch)
}

// GetConcurrencyStats 获取并发统计信息
func (s *MigrationService) GetConcurrencyStats() map[string]interface{} {
	s.mutex.RLock()
	defer s.mutex.RUnlock()

	return map[string]interface{}{
		"running_tasks":         len(s.runningTasks),
		"max_concurrent_tasks":  s.maxConcurrentTasks,
		"max_concurrent_tables": s.maxConcurrentTables,
		"max_concurrent_batch":  s.maxConcurrentBatch,
	}
}
