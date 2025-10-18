package handlers

import (
	"data-migration-tool/internal/config"
	"data-migration-tool/internal/models"
	"data-migration-tool/internal/services"
	"data-migration-tool/internal/storage"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	store            *storage.JSONStorage
	config           *config.Config
	migrationService *services.MigrationService
}

func NewHandler(store *storage.JSONStorage, cfg *config.Config) *Handler {
	return &Handler{
		store:            store,
		config:           cfg,
		migrationService: services.NewMigrationService(store, cfg),
	}
}

// 首页 - 重定向到迁移任务配置
func (h *Handler) Index(c *gin.Context) {
	c.Redirect(http.StatusFound, "/migration")
}

// 迁移任务配置页面
func (h *Handler) MigrationPage(c *gin.Context) {
	c.HTML(http.StatusOK, "migration.html", gin.H{
		"title":  "迁移任务配置 - 数据迁移工具",
		"active": "migration",
		"jsFile": "migration.js",
	})
}

// 执行记录页面
func (h *Handler) ExecutionPage(c *gin.Context) {
	c.HTML(http.StatusOK, "execution.html", gin.H{
		"title":  "执行记录 - 数据迁移工具",
		"active": "execution",
		"jsFile": "execution.js",
	})
}

// 数据源管理页面
func (h *Handler) DataSourcePage(c *gin.Context) {
	c.HTML(http.StatusOK, "datasource.html", gin.H{
		"title":  "数据源管理 - 数据迁移工具",
		"active": "datasource",
		"jsFile": "datasource.js",
	})
}

// 过滤模板页面
func (h *Handler) TemplatePage(c *gin.Context) {
	c.HTML(http.StatusOK, "template.html", gin.H{
		"title":  "过滤模板 - 数据迁移工具",
		"active": "template",
		"jsFile": "template.js",
	})
}

// 脱敏规则页面
func (h *Handler) MaskingPage(c *gin.Context) {
	c.HTML(http.StatusOK, "masking.html", gin.H{
		"title":  "脱敏规则 - 数据迁移工具",
		"active": "masking",
		"jsFile": "masking.js",
	})
}

// 数据源管理
func (h *Handler) GetDataSources(c *gin.Context) {
	dataSources, err := h.store.GetDataSources()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, dataSources)
}

func (h *Handler) CreateDataSource(c *gin.Context) {
	var ds models.DataSource
	if err := c.ShouldBindJSON(&ds); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ds.ID = generateUUID()
	ds.CreateAt = time.Now()
	ds.UpdateAt = time.Now()

	// 如果没有设置enabled字段，默认为启用
	if !ds.Enabled {
		ds.Enabled = true
	}

	if err := h.store.SaveDataSource(ds); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, ds)
}

func (h *Handler) UpdateDataSource(c *gin.Context) {
	id := c.Param("id")
	var ds models.DataSource
	if err := c.ShouldBindJSON(&ds); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ds.ID = id
	ds.UpdateAt = time.Now()

	if err := h.store.SaveDataSource(ds); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, ds)
}

func (h *Handler) DeleteDataSource(c *gin.Context) {
	id := c.Param("id")
	if err := h.store.DeleteDataSource(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "删除成功"})
}

func (h *Handler) TestDataSource(c *gin.Context) {
	id := c.Param("id")
	dataSources, err := h.store.GetDataSources()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var ds *models.DataSource
	var dsIndex int
	for i, source := range dataSources {
		if source.ID == id {
			ds = &dataSources[i]
			dsIndex = i
			break
		}
	}

	if ds == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "数据源不存在"})
		return
	}

	dbService := services.NewDatabaseService()
	var status string
	var message string

	if err := dbService.TestConnection(*ds); err != nil {
		status = "disconnected"
		message = "连接失败: " + err.Error()

		// 更新状态到缓存
		dataSources[dsIndex].Status = status
		dataSources[dsIndex].UpdateAt = time.Now()
		h.store.SaveDataSource(dataSources[dsIndex])

		c.JSON(http.StatusBadRequest, gin.H{
			"error":  message,
			"status": status,
		})
		return
	}

	status = "connected"
	message = "连接成功"

	// 更新状态到缓存
	dataSources[dsIndex].Status = status
	dataSources[dsIndex].UpdateAt = time.Now()
	h.store.SaveDataSource(dataSources[dsIndex])

	c.JSON(http.StatusOK, gin.H{
		"message": message,
		"status":  status,
	})
}

// 测试数据源连接（不创建数据源）
func (h *Handler) TestDataSourceConnection(c *gin.Context) {
	var ds models.DataSource
	if err := c.ShouldBindJSON(&ds); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	dbService := services.NewDatabaseService()

	if err := dbService.TestConnection(ds); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":  "连接失败: " + err.Error(),
			"status": "disconnected",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "连接成功",
		"status":  "connected",
	})
}

func (h *Handler) GetTables(c *gin.Context) {
	id := c.Param("id")
	dataSources, err := h.store.GetDataSources()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var ds *models.DataSource
	for _, source := range dataSources {
		if source.ID == id {
			ds = &source
			break
		}
	}

	if ds == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "数据源不存在"})
		return
	}

	dbService := services.NewDatabaseService()
	tables, err := dbService.GetTables(*ds)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, tables)
}

func (h *Handler) GetColumns(c *gin.Context) {
	id := c.Param("id")
	tableName := c.Param("table")

	dataSources, err := h.store.GetDataSources()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var ds *models.DataSource
	for _, source := range dataSources {
		if source.ID == id {
			ds = &source
			break
		}
	}

	if ds == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "数据源不存在"})
		return
	}

	dbService := services.NewDatabaseService()
	columns, err := dbService.GetColumns(*ds, tableName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, columns)
}

// 过滤模板管理
func (h *Handler) GetFilterTemplates(c *gin.Context) {
	templates, err := h.store.GetFilterTemplates()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, templates)
}

func (h *Handler) CreateFilterTemplate(c *gin.Context) {
	var template models.FilterTemplate
	if err := c.ShouldBindJSON(&template); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	template.ID = generateUUID()
	template.CreateAt = time.Now()
	template.UpdateAt = time.Now()

	// 如果没有设置enabled字段，默认为启用
	if !template.Enabled {
		template.Enabled = true
	}

	if err := h.store.SaveFilterTemplate(template); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, template)
}

func (h *Handler) UpdateFilterTemplate(c *gin.Context) {
	id := c.Param("id")
	var template models.FilterTemplate
	if err := c.ShouldBindJSON(&template); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	template.ID = id
	template.UpdateAt = time.Now()

	if err := h.store.SaveFilterTemplate(template); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, template)
}

func (h *Handler) DeleteFilterTemplate(c *gin.Context) {
	id := c.Param("id")
	if err := h.store.DeleteFilterTemplate(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "删除成功"})
}

// 脱敏规则管理
func (h *Handler) GetMaskingRules(c *gin.Context) {
	rules, err := h.store.GetMaskingRules()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, rules)
}

func (h *Handler) CreateMaskingRule(c *gin.Context) {
	var rule models.MaskingRule
	if err := c.ShouldBindJSON(&rule); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	rule.ID = generateUUID()
	rule.CreateAt = time.Now()
	rule.UpdateAt = time.Now()

	// 如果没有设置enabled字段，默认为启用
	if !rule.Enabled {
		rule.Enabled = true
	}

	if err := h.store.SaveMaskingRule(rule); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, rule)
}

func (h *Handler) UpdateMaskingRule(c *gin.Context) {
	id := c.Param("id")
	var rule models.MaskingRule
	if err := c.ShouldBindJSON(&rule); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	rule.ID = id
	rule.UpdateAt = time.Now()

	if err := h.store.SaveMaskingRule(rule); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, rule)
}

func (h *Handler) DeleteMaskingRule(c *gin.Context) {
	id := c.Param("id")
	if err := h.store.DeleteMaskingRule(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "删除成功"})
} // 表迁移配置管理

func (h *Handler) GetTableMigrations(c *gin.Context) {
	migrations, err := h.store.GetTableMigrations()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, migrations)
}

func (h *Handler) CreateTableMigration(c *gin.Context) {
	var migration models.TableMigration
	if err := c.ShouldBindJSON(&migration); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	migration.ID = generateUUID()
	migration.CreateAt = time.Now()
	migration.UpdateAt = time.Now()

	if migration.BatchSize <= 0 {
		migration.BatchSize = 1000
	}

	if err := h.store.SaveTableMigration(migration); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, migration)
}

func (h *Handler) UpdateTableMigration(c *gin.Context) {
	id := c.Param("id")
	var migration models.TableMigration
	if err := c.ShouldBindJSON(&migration); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	migration.ID = id
	migration.UpdateAt = time.Now()

	if err := h.store.SaveTableMigration(migration); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, migration)
}

func (h *Handler) DeleteTableMigration(c *gin.Context) {
	id := c.Param("id")
	if err := h.store.DeleteTableMigration(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "删除成功"})
}

// 迁移任务管理
func (h *Handler) GetMigrationTasks(c *gin.Context) {
	tasks, err := h.store.GetMigrationTasks()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, tasks)
}

func (h *Handler) CreateMigrationTask(c *gin.Context) {
	var task models.MigrationTask
	if err := c.ShouldBindJSON(&task); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	task.ID = generateUUID()
	if task.Status == "" {
		task.Status = "draft" // 默认为草稿状态
	}
	task.Progress = 0
	task.CreateAt = time.Now()

	if err := h.store.SaveMigrationTask(task); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, task)
}

func (h *Handler) StartMigrationTask(c *gin.Context) {
	id := c.Param("id")

	if err := h.migrationService.StartTask(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "任务已启动"})
}

func (h *Handler) StopMigrationTask(c *gin.Context) {
	id := c.Param("id")

	if err := h.migrationService.StopTask(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "任务已停止"})
}

func (h *Handler) GetMigrationTaskStatus(c *gin.Context) {
	id := c.Param("id")

	tasks, err := h.store.GetMigrationTasks()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	for _, task := range tasks {
		if task.ID == id {
			c.JSON(http.StatusOK, task)
			return
		}
	}

	c.JSON(http.StatusNotFound, gin.H{"error": "任务不存在"})
}

func (h *Handler) GetMigrationTaskRecords(c *gin.Context) {
	id := c.Param("id")

	records, err := h.store.GetMigrationRecordsByTaskID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, records)
}

// 更新迁移任务
func (h *Handler) UpdateMigrationTask(c *gin.Context) {
	id := c.Param("id")
	var task models.MigrationTask
	if err := c.ShouldBindJSON(&task); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	task.ID = id
	task.UpdateAt = time.Now()

	if err := h.store.SaveMigrationTask(task); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, task)
}

// 删除迁移任务
func (h *Handler) DeleteMigrationTask(c *gin.Context) {
	id := c.Param("id")
	if err := h.store.DeleteMigrationTask(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "删除成功"})
}

// 启动迁移任务
func (h *Handler) StartMigration(c *gin.Context) {
	var config models.MigrationConfig
	if err := c.ShouldBindJSON(&config); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "配置格式错误: " + err.Error()})
		return
	}

	// 验证配置
	if config.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "任务名称不能为空"})
		return
	}
	if config.SourceDatabase == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "源数据库不能为空"})
		return
	}
	if config.TargetDatabase == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "目标数据库不能为空"})
		return
	}
	if len(config.Tables) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "至少需要选择一张表"})
		return
	}

	// 创建迁移任务
	task := models.MigrationTask{
		ID:                generateUUID(),
		Name:              config.Name,
		SourceDatabase:    config.SourceDatabase,
		TargetDatabase:    config.TargetDatabase,
		DuplicateStrategy: config.DuplicateStrategy,
		TableStrategy:     config.TableStrategy,
		Tables:            config.Tables,
		Status:            "initializing",
		Progress:          0,
		CreateAt:          time.Now(),
		StartAt:           time.Now(),
	}

	// 保存任务
	if err := h.store.SaveMigrationTask(task); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保存任务失败: " + err.Error()})
		return
	}

	// 异步启动迁移任务
	go h.migrationService.ExecuteMigration(task.ID, config)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"taskId":  task.ID,
		"message": "迁移任务已启动",
	})
}

// 获取迁移状态
func (h *Handler) GetMigrationStatus(c *gin.Context) {
	taskId := c.Param("taskId")

	tasks, err := h.store.GetMigrationTasks()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	for _, task := range tasks {
		if task.ID == taskId {
			// 构建状态响应
			status := gin.H{
				"status":           task.Status,
				"progress":         task.Progress,
				"currentTable":     task.CurrentTable,
				"processedRecords": task.ProcessedRecords,
				"totalRecords":     task.TotalRecords,
				"startTime":        task.StartAt,
				"logs":             []gin.H{}, // 简化版本，实际可以从日志存储中获取
			}

			// 根据状态添加一些模拟日志
			if task.Status == "running" {
				status["logs"] = []gin.H{
					{
						"timestamp": time.Now(),
						"level":     "info",
						"message":   fmt.Sprintf("正在处理表: %s", task.CurrentTable),
					},
				}
			} else if task.Status == "completed" {
				status["logs"] = []gin.H{
					{
						"timestamp": time.Now(),
						"level":     "success",
						"message":   "迁移任务已完成",
					},
				}
			}

			c.JSON(http.StatusOK, status)
			return
		}
	}

	c.JSON(http.StatusNotFound, gin.H{"error": "任务不存在"})
}

// 暂停迁移任务
func (h *Handler) PauseMigration(c *gin.Context) {
	taskId := c.Param("taskId")

	if err := h.migrationService.PauseTask(taskId); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "任务已暂停",
	})
}

// 停止迁移任务
func (h *Handler) StopMigration(c *gin.Context) {
	taskId := c.Param("taskId")

	if err := h.migrationService.StopTask(taskId); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "任务已停止",
	})
}

// 生成UUID的辅助函数
func generateUUID() string {
	// 简单的UUID生成，实际项目中建议使用专门的UUID库
	return fmt.Sprintf("%d", time.Now().UnixNano())
}

// 设置并发参数
func (h *Handler) SetConcurrencyLimits(c *gin.Context) {
	var params struct {
		MaxTasks  int `json:"max_tasks"`
		MaxTables int `json:"max_tables"`
		MaxBatch  int `json:"max_batch"`
	}

	if err := c.ShouldBindJSON(&params); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数格式错误: " + err.Error()})
		return
	}

	h.migrationService.SetConcurrencyLimits(params.MaxTasks, params.MaxTables, params.MaxBatch)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "并发参数设置成功",
	})
}

// 获取并发统计信息
func (h *Handler) GetConcurrencyStats(c *gin.Context) {
	stats := h.migrationService.GetConcurrencyStats()
	c.JSON(http.StatusOK, stats)
}

// 脱敏类型管理
func (h *Handler) GetMaskingTypes(c *gin.Context) {
	types, err := h.store.GetMaskingTypes()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, types)
}

func (h *Handler) CreateMaskingType(c *gin.Context) {
	var maskingType models.MaskingType
	if err := c.ShouldBindJSON(&maskingType); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	maskingType.ID = generateUUID()
	maskingType.CreateAt = time.Now()
	maskingType.UpdateAt = time.Now()

	if err := h.store.SaveMaskingType(maskingType); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, maskingType)
}

func (h *Handler) UpdateMaskingType(c *gin.Context) {
	id := c.Param("id")
	var maskingType models.MaskingType
	if err := c.ShouldBindJSON(&maskingType); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	maskingType.ID = id
	maskingType.UpdateAt = time.Now()

	if err := h.store.SaveMaskingType(maskingType); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, maskingType)
}

func (h *Handler) DeleteMaskingType(c *gin.Context) {
	id := c.Param("id")
	if err := h.store.DeleteMaskingType(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "删除成功"})
}
