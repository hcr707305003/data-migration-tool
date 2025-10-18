package services

import (
	"data-migration-tool/internal/models"
	"database/sql"
	"fmt"

	_ "github.com/go-sql-driver/mysql"
	_ "github.com/lib/pq"
)

type DatabaseService struct{}

func NewDatabaseService() *DatabaseService {
	return &DatabaseService{}
}

func (s *DatabaseService) getConnectionString(ds models.DataSource) string {
	switch ds.Type {
	case "mysql":
		return fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?charset=utf8mb4&parseTime=True&loc=Local",
			ds.Username, ds.Password, ds.Host, ds.Port, ds.Database)
	case "postgresql":
		return fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=disable",
			ds.Host, ds.Port, ds.Username, ds.Password, ds.Database)
	default:
		return ""
	}
}

func (s *DatabaseService) TestConnection(ds models.DataSource) error {
	connStr := s.getConnectionString(ds)
	if connStr == "" {
		return fmt.Errorf("不支持的数据库类型: %s", ds.Type)
	}
	
	db, err := sql.Open(ds.Type, connStr)
	if err != nil {
		return err
	}
	defer db.Close()
	
	return db.Ping()
}

func (s *DatabaseService) GetTables(ds models.DataSource) ([]string, error) {
	connStr := s.getConnectionString(ds)
	if connStr == "" {
		return nil, fmt.Errorf("不支持的数据库类型: %s", ds.Type)
	}
	
	db, err := sql.Open(ds.Type, connStr)
	if err != nil {
		return nil, err
	}
	defer db.Close()
	
	var query string
	switch ds.Type {
	case "mysql":
		query = "SHOW TABLES"
	case "postgresql":
		query = "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
	default:
		return nil, fmt.Errorf("不支持的数据库类型: %s", ds.Type)
	}
	
	rows, err := db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var tables []string
	for rows.Next() {
		var tableName string
		if err := rows.Scan(&tableName); err != nil {
			return nil, err
		}
		tables = append(tables, tableName)
	}
	
	return tables, nil
}

type ColumnInfo struct {
	Name      string `json:"name"`
	Type      string `json:"type"`
	Nullable  bool   `json:"nullable"`
	Key       string `json:"key"`
	Generated bool   `json:"generated"` // 是否为生成列
}

func (s *DatabaseService) GetColumns(ds models.DataSource, tableName string) ([]ColumnInfo, error) {
	connStr := s.getConnectionString(ds)
	if connStr == "" {
		return nil, fmt.Errorf("不支持的数据库类型: %s", ds.Type)
	}
	
	db, err := sql.Open(ds.Type, connStr)
	if err != nil {
		return nil, err
	}
	defer db.Close()
	
	var query string
	switch ds.Type {
	case "mysql":
		query = `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY, 
				CASE WHEN EXTRA LIKE '%GENERATED%' OR EXTRA LIKE '%VIRTUAL%' OR EXTRA LIKE '%STORED%' THEN 1 ELSE 0 END as IS_GENERATED
				FROM INFORMATION_SCHEMA.COLUMNS 
				WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`
	case "postgresql":
		query = `SELECT column_name, data_type, is_nullable, 
				CASE WHEN tc.constraint_type = 'PRIMARY KEY' THEN 'PRI' ELSE '' END as column_key,
				CASE WHEN c.is_generated = 'ALWAYS' THEN 1 ELSE 0 END as is_generated
				FROM information_schema.columns c
				LEFT JOIN information_schema.key_column_usage kcu ON c.column_name = kcu.column_name 
					AND c.table_name = kcu.table_name AND c.table_schema = kcu.table_schema
				LEFT JOIN information_schema.table_constraints tc ON kcu.constraint_name = tc.constraint_name
				WHERE c.table_schema = 'public' AND c.table_name = $1`
	default:
		return nil, fmt.Errorf("不支持的数据库类型: %s", ds.Type)
	}
	
	var rows *sql.Rows
	if ds.Type == "mysql" {
		rows, err = db.Query(query, ds.Database, tableName)
	} else {
		rows, err = db.Query(query, tableName)
	}
	
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var columns []ColumnInfo
	for rows.Next() {
		var col ColumnInfo
		var nullable string
		var generated int
		if err := rows.Scan(&col.Name, &col.Type, &nullable, &col.Key, &generated); err != nil {
			return nil, err
		}
		col.Nullable = nullable == "YES"
		col.Generated = generated == 1
		columns = append(columns, col)
	}
	
	return columns, nil
}

func (s *DatabaseService) GetConnection(ds models.DataSource) (*sql.DB, error) {
	connStr := s.getConnectionString(ds)
	if connStr == "" {
		return nil, fmt.Errorf("不支持的数据库类型: %s", ds.Type)
	}
	
	return sql.Open(ds.Type, connStr)
}