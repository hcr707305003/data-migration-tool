package services

import (
	"data-migration-tool/internal/models"
	"data-migration-tool/internal/storage"
	"fmt"
	"log"
	"sync"
	"time"
)

type StatusChecker struct {
	store     *storage.JSONStorage
	dbService *DatabaseService
	ticker    *time.Ticker
	stopChan  chan bool
	mutex     sync.RWMutex
	running   bool
}

func NewStatusChecker(store *storage.JSONStorage) *StatusChecker {
	return &StatusChecker{
		store:     store,
		dbService: NewDatabaseService(),
		stopChan:  make(chan bool),
	}
}

// 启动状态检查器
func (sc *StatusChecker) Start(interval time.Duration) {
	sc.mutex.Lock()
	defer sc.mutex.Unlock()
	
	if sc.running {
		log.Println("状态检查器已在运行中")
		return
	}
	
	if interval <= 0 {
		log.Println("状态检查间隔无效，跳过启动状态检查器")
		return
	}
	
	sc.ticker = time.NewTicker(interval)
	sc.running = true
	
	go sc.run()
	log.Printf("数据源状态检查器已启动，检查间隔: %v", interval)
	
	// 启动时立即执行一次检查
	go func() {
		time.Sleep(5 * time.Second) // 等待5秒让系统完全启动
		sc.checkAllDataSources()
	}()
}

// 停止状态检查器
func (sc *StatusChecker) Stop() {
	sc.mutex.Lock()
	defer sc.mutex.Unlock()
	
	if !sc.running {
		return
	}
	
	sc.running = false
	sc.ticker.Stop()
	sc.stopChan <- true
	log.Println("数据源状态检查器已停止")
}

// 运行状态检查
func (sc *StatusChecker) run() {
	for {
		select {
		case <-sc.ticker.C:
			sc.checkAllDataSources()
		case <-sc.stopChan:
			return
		}
	}
}

// 检查所有数据源状态
func (sc *StatusChecker) checkAllDataSources() {
	dataSources, err := sc.store.GetDataSources()
	if err != nil {
		log.Printf("获取数据源列表失败: %v", err)
		return
	}
	
	var wg sync.WaitGroup
	for i := range dataSources {
		wg.Add(1)
		go func(index int) {
			defer wg.Done()
			sc.checkDataSourceStatus(&dataSources[index])
		}(i)
	}
	
	wg.Wait()
	
	// 批量更新状态
	for _, ds := range dataSources {
		if err := sc.store.SaveDataSource(ds); err != nil {
			log.Printf("更新数据源状态失败 [%s]: %v", ds.Name, err)
		}
	}
}

// 检查单个数据源状态
func (sc *StatusChecker) checkDataSourceStatus(ds *models.DataSource) {
	previousStatus := ds.Status
	
	// 设置检查中状态（但不保存到存储，只在内存中标记）
	currentStatus := "checking"
	
	// 创建带超时的上下文
	done := make(chan bool, 1)
	var err error
	
	go func() {
		// 测试连接
		err = sc.dbService.TestConnection(*ds)
		done <- true
	}()
	
	// 等待结果或超时（30秒）
	select {
	case <-done:
		if err != nil {
			currentStatus = "disconnected"
		} else {
			currentStatus = "connected"
		}
	case <-time.After(30 * time.Second):
		currentStatus = "disconnected"
		err = fmt.Errorf("连接超时")
	}
	
	ds.Status = currentStatus
	ds.UpdateAt = time.Now()
	
	// 只在状态变化时记录日志
	if previousStatus != currentStatus && previousStatus != "checking" {
		if err != nil {
			log.Printf("数据源 [%s] 状态变化: %s -> %s (错误: %v)", ds.Name, previousStatus, currentStatus, err)
		} else {
			log.Printf("数据源 [%s] 状态变化: %s -> %s", ds.Name, previousStatus, currentStatus)
		}
	}
}

// 手动检查单个数据源
func (sc *StatusChecker) CheckSingleDataSource(id string) (string, error) {
	dataSources, err := sc.store.GetDataSources()
	if err != nil {
		return "", err
	}
	
	for i, ds := range dataSources {
		if ds.ID == id {
			sc.checkDataSourceStatus(&dataSources[i])
			
			// 保存更新后的状态
			if err := sc.store.SaveDataSource(dataSources[i]); err != nil {
				return "", err
			}
			
			return dataSources[i].Status, nil
		}
	}
	
	return "", nil
}