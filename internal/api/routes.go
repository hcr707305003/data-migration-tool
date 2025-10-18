package api

import (
	"data-migration-tool/internal/config"
	"data-migration-tool/internal/handlers"
	"data-migration-tool/internal/storage"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(router *gin.Engine, store *storage.JSONStorage, cfg *config.Config) {
	// 创建处理器
	h := handlers.NewHandler(store, cfg)

	// 页面路由
	router.GET("/", h.Index)
	router.GET("/migration", h.MigrationPage)
	router.GET("/execution", h.ExecutionPage)
	router.GET("/datasource", h.DataSourcePage)
	router.GET("/template", h.TemplatePage)
	router.GET("/masking", h.MaskingPage)

	// API路由组
	api := router.Group("/api")
	{
		// 数据源管理
		api.GET("/datasources", h.GetDataSources)
		api.POST("/datasources", h.CreateDataSource)
		api.PUT("/datasources/:id", h.UpdateDataSource)
		api.DELETE("/datasources/:id", h.DeleteDataSource)
		api.POST("/datasources/:id/test", h.TestDataSource)
		api.POST("/datasources/test-connection", h.TestDataSourceConnection)
		api.GET("/datasources/:id/tables", h.GetTables)
		api.GET("/datasources/:id/tables/:table/columns", h.GetColumns)

		// 过滤模板管理
		api.GET("/filter-templates", h.GetFilterTemplates)
		api.POST("/filter-templates", h.CreateFilterTemplate)
		api.PUT("/filter-templates/:id", h.UpdateFilterTemplate)
		api.DELETE("/filter-templates/:id", h.DeleteFilterTemplate)

		// 脱敏规则管理
		api.GET("/masking-rules", h.GetMaskingRules)
		api.POST("/masking-rules", h.CreateMaskingRule)
		api.PUT("/masking-rules/:id", h.UpdateMaskingRule)
		api.DELETE("/masking-rules/:id", h.DeleteMaskingRule)

		// 脱敏类型管理
		api.GET("/masking-types", h.GetMaskingTypes)
		api.POST("/masking-types", h.CreateMaskingType)
		api.PUT("/masking-types/:id", h.UpdateMaskingType)
		api.DELETE("/masking-types/:id", h.DeleteMaskingType)

		// 表迁移配置管理
		api.GET("/table-migrations", h.GetTableMigrations)
		api.POST("/table-migrations", h.CreateTableMigration)
		api.PUT("/table-migrations/:id", h.UpdateTableMigration)
		api.DELETE("/table-migrations/:id", h.DeleteTableMigration)

		// 迁移任务管理
		api.GET("/migration-tasks", h.GetMigrationTasks)
		api.POST("/migration-tasks", h.CreateMigrationTask)
		api.PUT("/migration-tasks/:id", h.UpdateMigrationTask)
		api.DELETE("/migration-tasks/:id", h.DeleteMigrationTask)
		api.POST("/migration-tasks/:id/start", h.StartMigrationTask)
		api.POST("/migration-tasks/:id/stop", h.StopMigrationTask)
		api.GET("/migration-tasks/:id/status", h.GetMigrationTaskStatus)
		api.GET("/migration-tasks/:id/records", h.GetMigrationTaskRecords)

		// 新的迁移API
		api.POST("/migration/start", h.StartMigration)
		api.GET("/migration/status/:taskId", h.GetMigrationStatus)
		api.POST("/migration/pause/:taskId", h.PauseMigration)
		api.POST("/migration/stop/:taskId", h.StopMigration)

		// 并发控制API
		api.POST("/migration/concurrency", h.SetConcurrencyLimits)
		api.GET("/migration/concurrency/stats", h.GetConcurrencyStats)
	}
}
