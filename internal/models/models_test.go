package models

import (
	"testing"
	"time"
)

func TestMigrationTask(t *testing.T) {
	task := MigrationTask{
		ID:             "test-id",
		Name:           "Test Task",
		Status:         "draft",
		Progress:       0,
		SourceDatabase: "source_db",
		TargetDatabase: "target_db",
		CreateAt:       time.Now(),
		UpdateAt:       time.Now(),
	}
	
	if task.ID != "test-id" {
		t.Errorf("Expected ID 'test-id', got %s", task.ID)
	}
	
	if task.Name != "Test Task" {
		t.Errorf("Expected name 'Test Task', got %s", task.Name)
	}
	
	if task.Status != "draft" {
		t.Errorf("Expected status 'draft', got %s", task.Status)
	}
}

func TestDataSource(t *testing.T) {
	ds := DataSource{
		ID:       "test-ds",
		Name:     "Test DataSource",
		Type:     "mysql",
		Host:     "localhost",
		Port:     3306,
		Database: "testdb",
		Username: "testuser",
	}
	
	if ds.Type != "mysql" {
		t.Errorf("Expected type 'mysql', got %s", ds.Type)
	}
	
	if ds.Port != 3306 {
		t.Errorf("Expected port 3306, got %d", ds.Port)
	}
}

func TestFilterCondition(t *testing.T) {
	condition := FilterCondition{
		Field:    "status",
		Operator: "=",
		Value:    "active",
	}
	
	if condition.Field != "status" {
		t.Errorf("Expected field 'status', got %s", condition.Field)
	}
	
	if condition.Operator != "=" {
		t.Errorf("Expected operator '=', got %s", condition.Operator)
	}
}