package sync

import (
	"context"
	"log"
	"time"

	"github.com/KamisAyaka/crowdsourcing_graphql/packages/backend/internal/config"
	"github.com/KamisAyaka/crowdsourcing_graphql/packages/backend/internal/repository/db"
	"github.com/KamisAyaka/crowdsourcing_graphql/packages/backend/pkg/subgraph"
)

type SyncScheduler struct {
	dataSyncService *DataSyncService
	config          *config.Config
	stopChan        chan bool
}

func NewSyncScheduler(database *db.Database, subgraphClient *subgraph.Client, cfg *config.Config) *SyncScheduler {
	dataSyncService := NewDataSyncService(database, subgraphClient)
	
	return &SyncScheduler{
		dataSyncService: dataSyncService,
		config:          cfg,
		stopChan:        make(chan bool),
	}
}

// Start 启动同步调度器
func (s *SyncScheduler) Start() {
	log.Println("启动数据同步调度器...")
	
	// 启动全量同步
	go s.startFullSync()
	
	// 启动增量同步
	go s.startIncrementalSync()
}

// Stop 停止同步调度器
func (s *SyncScheduler) Stop() {
	log.Println("停止数据同步调度器...")
	s.stopChan <- true
}

// startFullSync 启动全量同步
func (s *SyncScheduler) startFullSync() {
	// 立即执行一次全量同步
	if err := s.dataSyncService.SyncAllUsers(context.Background()); err != nil {
		log.Printf("全量同步失败: %v", err)
	}
	
	// 根据配置设置全量同步间隔
	var interval time.Duration
	if s.config.Scheduler.WeeklyUpdateEnabled {
		interval = 24 * time.Hour // 每天执行一次全量同步
	} else {
		interval = 1 * time.Hour // 默认每小时执行一次
	}
	
	// 开发模式使用更短的间隔
	if s.config.Scheduler.DevMode {
		interval = time.Duration(s.config.Scheduler.DevWeeklyIntervalMinutes) * time.Minute
	}
	
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	
	for {
		select {
		case <-ticker.C:
			log.Println("开始全量数据同步...")
			if err := s.dataSyncService.SyncAllUsers(context.Background()); err != nil {
				log.Printf("全量同步失败: %v", err)
			} else {
				log.Println("全量数据同步完成")
			}
		case <-s.stopChan:
			log.Println("全量同步调度器已停止")
			return
		}
	}
}

// startIncrementalSync 启动增量同步
func (s *SyncScheduler) startIncrementalSync() {
	// 增量同步间隔
	interval := 5 * time.Minute // 每5分钟执行一次增量同步
	
	// 开发模式使用更短的间隔
	if s.config.Scheduler.DevMode {
		interval = 1 * time.Minute // 开发模式每分钟执行一次
	}
	
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	
	for {
		select {
		case <-ticker.C:
			log.Println("开始增量数据同步...")
			if err := s.syncRecentUsers(context.Background()); err != nil {
				log.Printf("增量同步失败: %v", err)
			} else {
				log.Println("增量数据同步完成")
			}
		case <-s.stopChan:
			log.Println("增量同步调度器已停止")
			return
		}
	}
}

// syncRecentUsers 同步最近活跃的用户
func (s *SyncScheduler) syncRecentUsers(ctx context.Context) error {
	// 这里可以实现更智能的增量同步逻辑
	// 例如：只同步最近24小时内有活动的用户
	// 或者根据任务缓存中的LastSynced字段来判断需要更新的用户
	
	// 目前实现为简单的全量同步
	// 在实际生产环境中，应该根据业务需求优化这个逻辑
	return s.dataSyncService.SyncAllUsers(ctx)
}

// SyncSpecificUser 同步特定用户的数据
func (s *SyncScheduler) SyncSpecificUser(userAddress string) error {
	log.Printf("开始同步用户 %s 的数据...", userAddress)
	
	if err := s.dataSyncService.SyncUserBehaviorData(context.Background(), userAddress); err != nil {
		log.Printf("同步用户 %s 失败: %v", userAddress, err)
		return err
	}
	
	log.Printf("用户 %s 的数据同步完成", userAddress)
	return nil
}

// GetSyncStatus 获取同步状态
func (s *SyncScheduler) GetSyncStatus() map[string]interface{} {
	return map[string]interface{}{
		"status":           "running",
		"last_sync_time":   time.Now().Format(time.RFC3339),
		"sync_interval":    s.getSyncInterval(),
		"dev_mode":         s.config.Scheduler.DevMode,
	}
}

// getSyncInterval 获取同步间隔
func (s *SyncScheduler) getSyncInterval() string {
	if s.config.Scheduler.DevMode {
		return "1 minute (dev mode)"
	}
	return "5 minutes"
}
