package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/KamisAyaka/crowdsourcing_graphql/packages/backend/internal/api/routes"
	"github.com/KamisAyaka/crowdsourcing_graphql/packages/backend/internal/config"
	"github.com/KamisAyaka/crowdsourcing_graphql/packages/backend/internal/repository/db"
	"github.com/KamisAyaka/crowdsourcing_graphql/packages/backend/internal/service/scheduler"
	"github.com/KamisAyaka/crowdsourcing_graphql/packages/backend/internal/service/sync"
	"github.com/KamisAyaka/crowdsourcing_graphql/packages/backend/pkg/logger"
	"github.com/KamisAyaka/crowdsourcing_graphql/packages/backend/pkg/subgraph"
	"github.com/gin-gonic/gin"
)

func main() {
	// 加载配置
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// 初始化日志
	logger.Init(cfg.LogLevel)

	// 初始化数据库
	database, err := db.NewDatabase(cfg.Database)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer database.Close()

	// 自动迁移
	if err := database.AutoMigrate(); err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}

	// 初始化 Subgraph 客户端
	subgraphClient := subgraph.NewClient(cfg.SubgraphURL)

	// 设置 Gin 模式
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	// 创建路由
	router := routes.SetupRoutes(database, subgraphClient, cfg)

	// 启动评分调度器
	scoreScheduler := scheduler.NewScoreScheduler(database, subgraphClient, cfg)
	scoreScheduler.Start()
	defer scoreScheduler.Stop()

	logger.Info("Score scheduler started")

	// 启动数据同步调度器
	syncScheduler := sync.NewSyncScheduler(database, subgraphClient, cfg)
	syncScheduler.Start()
	defer syncScheduler.Stop()

	logger.Info("Data sync scheduler started")

	// 创建 HTTP 服务器
	srv := &http.Server{
		Addr:    fmt.Sprintf(":%d", cfg.Port),
		Handler: router,
	}

	// 启动服务器
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	logger.Info(fmt.Sprintf("Server started on port %d", cfg.Port))

	// 等待中断信号
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown:", err)
	}

	logger.Info("Server exited")
}
