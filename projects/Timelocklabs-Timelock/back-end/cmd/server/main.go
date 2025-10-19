package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"timelock-backend/internal/config"

	authHandler "timelock-backend/internal/api/auth"

	chainRepo "timelock-backend/internal/repository/chain"
	safeRepo "timelock-backend/internal/repository/safe"
	userRepo "timelock-backend/internal/repository/user"

	authService "timelock-backend/internal/service/auth"
	scannerService "timelock-backend/internal/service/scanner"

	"timelock-backend/pkg/database"

	"timelock-backend/pkg/logger"
	"timelock-backend/pkg/utils"

	"github.com/gin-gonic/gin"
)

func main() {
	logger.Init(logger.DefaultConfig())

	// 创建根context和WaitGroup用于协调关闭
	ctx, cancel := context.WithCancel(context.Background())
	var wg sync.WaitGroup

	// 设置信号处理
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	// 加载配置
	cfg, err := config.LoadConfig()
	if err != nil {
		logger.Error("Failed to load config: ", err)
		os.Exit(1)
	}

	// 连接数据库
	db, err := database.NewPostgresConnection(&cfg.Database)
	if err != nil {
		logger.Error("Failed to connect to database: ", err)
		os.Exit(1)
	}

	// 初始化仓库层
	userRepository := userRepo.NewRepository(db)
	safeRepository := safeRepo.NewRepository(db)
	chainRepository := chainRepo.NewRepository(db)

	// 初始化JWT管理器
	jwtManager := utils.NewJWTManager(
		cfg.JWT.Secret,
		cfg.JWT.AccessExpiry,
		cfg.JWT.RefreshExpiry,
	)

	// 设置Gin和路由
	gin.SetMode(cfg.Server.Mode)
	router := gin.Default()

	// 8. 添加CORS中间件
	router.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	})

	// 健康检查端点
	router.GET("/api/v1/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// 11. 启动RPC管理器
	rpcManager := scannerService.NewRPCManager(cfg, chainRepository)
	if err := rpcManager.Start(ctx); err != nil {
		logger.Error("Failed to start RPC manager", err)
	} else {
		logger.Info("RPC Manager started successfully")
	}

	// 初始化服务层
	authSvc := authService.NewService(userRepository, safeRepository, rpcManager, jwtManager)
	authHandler := authHandler.NewHandler(authSvc)

	// 创建API路由组
	v1 := router.Group("/api/v1")
	{
		authHandler.RegisterRoutes(v1)
	}

	// 启动HTTP服务器
	addr := ":" + cfg.Server.Port
	srv := &http.Server{
		Addr:    addr,
		Handler: router,
	}

	wg.Add(1)
	go func() {
		defer wg.Done()
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("HTTP server error: ", err)
			cancel() // 通知其他组件关闭
		}
	}()

	// 等待关闭信号
	<-sigCh
	logger.Info("Received shutdown signal, starting graceful shutdown...")

	// 优雅关闭（逆序关闭）
	// 停止HTTP服务器（最后启动的最先关闭）
	logger.Info("Stopping HTTP server...")
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Error("HTTP server shutdown error: ", err)
	} else {
		logger.Info("HTTP server stopped")
	}
	shutdownCancel()

	// 停止RPC管理器
	logger.Info("Stopping RPC manager...")
	rpcManager.Stop()

	// 等待所有goroutine结束
	logger.Info("Waiting for all goroutines to finish...")
	done := make(chan struct{})
	go func() {
		wg.Wait()
		close(done)
	}()

	select {
	case <-done:
		logger.Info("All services stopped gracefully")
	case <-time.After(15 * time.Second):
		logger.Error("Timeout waiting for services to stop, forcing exit", nil)
	}
}
