package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	abiHandler "timelock-backend/internal/api/abi"
	authHandler "timelock-backend/internal/api/auth"
	chainHandler "timelock-backend/internal/api/chain"
	emailHandler "timelock-backend/internal/api/email"
	flowHandler "timelock-backend/internal/api/flow"
	notificationHandler "timelock-backend/internal/api/notification"
	sponsorHandler "timelock-backend/internal/api/sponsor"
	timelockHandler "timelock-backend/internal/api/timelock"

	"timelock-backend/internal/config"
	abiRepo "timelock-backend/internal/repository/abi"
	chainRepo "timelock-backend/internal/repository/chain"
	emailRepo "timelock-backend/internal/repository/email"

	notificationRepo "timelock-backend/internal/repository/notification"
	safeRepo "timelock-backend/internal/repository/safe"
	scannerRepo "timelock-backend/internal/repository/scanner"
	sponsorRepo "timelock-backend/internal/repository/sponsor"
	timelockRepo "timelock-backend/internal/repository/timelock"

	userRepo "timelock-backend/internal/repository/user"
	abiService "timelock-backend/internal/service/abi"
	authService "timelock-backend/internal/service/auth"
	chainService "timelock-backend/internal/service/chain"
	emailService "timelock-backend/internal/service/email"
	flowService "timelock-backend/internal/service/flow"
	notificationService "timelock-backend/internal/service/notification"
	scannerService "timelock-backend/internal/service/scanner"
	sponsorService "timelock-backend/internal/service/sponsor"
	timelockService "timelock-backend/internal/service/timelock"

	"timelock-backend/pkg/database"

	"timelock-backend/pkg/logger"
	"timelock-backend/pkg/utils"

	"github.com/gin-gonic/gin"
)

// @title TimeLock Backend API
// @version 1.0
// @description TimeLock Backend API
// @host localhost:8080
// @BasePath /
// @schemes http https
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Type "Bearer" followed by a space and JWT token.

// updateAllScannersStatusToPaused 更新所有扫链器状态为暂停
func updateAllScannersStatusToPaused(ctx context.Context, progressRepo scannerRepo.ProgressRepository) error {
	// 批量更新所有运行中的扫描器状态为 paused
	return progressRepo.UpdateAllRunningScannersToPaused(ctx)
}

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
	chainRepository := chainRepo.NewRepository(db)
	abiRepository := abiRepo.NewRepository(db)
	sponsorRepository := sponsorRepo.NewRepository(db)
	timelockRepository := timelockRepo.NewRepository(db)
	emailRepository := emailRepo.NewEmailRepository(db)
	notificationRepository := notificationRepo.NewRepository(db)
	safeRepository := safeRepo.NewRepository(db)

	// 扫链相关仓库
	progressRepository := scannerRepo.NewProgressRepository(db)
	transactionRepository := scannerRepo.NewTransactionRepository(db)
	flowRepository := scannerRepo.NewFlowRepository(db)

	// 初始化JWT管理器
	jwtManager := utils.NewJWTManager(
		cfg.JWT.Secret,
		cfg.JWT.AccessExpiry,
		cfg.JWT.RefreshExpiry,
	)

	// 设置Gin和路由
	gin.SetMode(cfg.Server.Mode)
	router := gin.Default()

	// 添加CORS中间件
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

	// 启动RPC管理器
	rpcManager := scannerService.NewRPCManager(cfg, chainRepository)
	if err := rpcManager.Start(ctx); err != nil {
		logger.Error("Failed to start RPC manager", err)
	} else {
		logger.Info("RPC Manager started successfully")
	}

	// 初始化部分服务层
	abiSvc := abiService.NewService(abiRepository)
	chainSvc := chainService.NewService(chainRepository)
	sponsorSvc := sponsorService.NewService(sponsorRepository)
	emailSvc := emailService.NewEmailService(emailRepository, chainRepository, timelockRepository, transactionRepository, cfg)
	flowSvc := flowService.NewFlowService(flowRepository, timelockRepository)
	notificationSvc := notificationService.NewNotificationService(notificationRepository, chainRepository, timelockRepository, transactionRepository, cfg)

	// 启动扫链管理器
	scannerManager := scannerService.NewManager(
		cfg,
		chainRepository,
		timelockRepository,
		progressRepository,
		transactionRepository,
		flowRepository,
		rpcManager,
		emailSvc,
		notificationSvc,
	)
	if err := scannerManager.Start(ctx); err != nil {
		logger.Error("Failed to start scanner manager", err)
	} else {
		logger.Info("Scanner Manager started successfully")
	}

	// 初始化剩余服务和处理器
	authSvc := authService.NewService(userRepository, safeRepository, rpcManager, jwtManager)
	timelockSvc := timelockService.NewService(timelockRepository, chainRepository, flowRepository, rpcManager, cfg)

	// 创建API路由组
	v1 := router.Group("/api/v1")
	{
		// 链相关API
		chainHandler := chainHandler.NewHandler(chainSvc)
		chainHandler.RegisterRoutes(v1)

		// 赞助商相关API
		sponsorHdl := sponsorHandler.NewHandler(sponsorSvc)
		sponsorHdl.RegisterRoutes(v1)

		// 认证相关API
		authHandler := authHandler.NewHandler(authSvc)
		authHandler.RegisterRoutes(v1)

		// ABI相关API
		abiHandler := abiHandler.NewHandler(abiSvc, authSvc)
		abiHandler.RegisterRoutes(v1)

		// Timelock相关API
		timelockHandler := timelockHandler.NewHandler(timelockSvc, authSvc)
		timelockHandler.RegisterRoutes(v1)

		// 邮箱相关API
		emailHdl := emailHandler.NewEmailHandler(emailSvc, authSvc)
		emailHdl.RegisterRoutes(v1)

		// 流程相关API
		flowHdl := flowHandler.NewFlowHandler(flowSvc, authSvc)
		flowHdl.RegisterRoutes(v1)

		// 通知相关API
		notificationHdl := notificationHandler.NewNotificationHandler(notificationSvc, authSvc)
		notificationHdl.RegisterRoutes(v1)
	}

	// 启动定时任务
	wg.Add(1)
	go func() {
		defer wg.Done()
		defer logger.Info("Timelock refresh task stopped")

		ticker := time.NewTicker(2 * time.Hour)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				logger.Info("Starting scheduled timelock data refresh")
				if err := timelockSvc.RefreshAllTimeLockData(ctx); err != nil {
					logger.Error("Failed to refresh timelock data", err)
				} else {
					logger.Info("Scheduled timelock data refresh completed successfully")
				}
			}
		}
	}()

	// 启动邮箱验证码清理定时任务
	wg.Add(1)
	go func() {
		defer wg.Done()
		defer logger.Info("Email verification code cleanup task stopped")

		ticker := time.NewTicker(30 * time.Minute) // 每30分钟清理一次过期验证码
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				logger.Info("Starting scheduled email verification code cleanup")
				if err := emailSvc.CleanExpiredCodes(ctx); err != nil {
					logger.Error("Failed to clean expired verification codes", err)
				} else {
					logger.Info("Scheduled email verification code cleanup completed successfully")
				}
			}
		}
	}()

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

	// 开始优雅关闭（逆序关闭）

	// 停止HTTP服务器（最后启动的最先关闭）
	logger.Info("Stopping HTTP server...")
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Error("HTTP server shutdown error: ", err)
	} else {
		logger.Info("HTTP server stopped")
	}
	shutdownCancel()

	// 取消context，通知所有扫链组件停止
	logger.Info("Cancelling context to stop all scanner services...")
	cancel()

	// 停止扫链管理器（会自动更新状态为paused）
	logger.Info("Stopping scanner manager...")
	scannerManager.Stop()

	// 停止RPC管理器
	logger.Info("Stopping RPC manager...")
	rpcManager.Stop()

	// 确保所有扫链器状态已更新为paused（兜底保护）
	logger.Info("Ensuring all scanner status updated to paused...")
	shutdownCtx, shutdownCancel = context.WithTimeout(context.Background(), 3*time.Second)
	if err := updateAllScannersStatusToPaused(shutdownCtx, progressRepository); err != nil {
		logger.Error("Failed to ensure scanner status paused: ", err)
	}
	shutdownCancel()

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
