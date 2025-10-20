package main

import (
	"context"
	"database/sql"
	"log"
	"os"
	"os/signal"
	"syscall"

	"/Users/liu/2025/web3/eth2025hackathon/ETHShanghai-2025/pkg/alert"
	"/Users/liu/2025/web3/eth2025hackathon/ETHShanghai-2025/pkg/asset"
	"/Users/liu/2025/web3/eth2025hackathon/ETHShanghai-2025/pkg/blockchain"
	"/Users/liu/2025/web3/eth2025hackathon/ETHShanghai-2025/pkg/blockchain/ethereum"
)

func main() {
	// 初始化配置
	config, err := loadConfig()
	if err != nil {
		log.Fatalf("加载配置失败: %v", err)
	}

	// 初始化日志
	logger := log.New(os.Stdout, "W3HUB: ", log.LstdFlags|log.Lshortfile)

	// 初始化数据库
	db, err := sql.Open("sqlite3", config.DatabasePath)
	if err != nil {
		logger.Fatalf("数据库初始化失败: %v", err)
	}
	defer db.Close()

	// 初始化表结构
	if err := initDatabase(db); err != nil {
		logger.Fatalf("数据库初始化失败: %v", err)
	}

	// 初始化区块链客户端
	ethClient, err := ethereum.NewEthereumClient(config.EthRPCURL)
	if err != nil {
		logger.Fatalf("以太坊客户端初始化失败: %v", err)
	}

	// 初始化多链客户端
	chainClient := blockchain.NewMultiChainClient()
	chainClient.RegisterClient("ethereum", ethClient)

	// 初始化服务
	assetManager := asset.NewManager(db, chainClient)
	notifier := alert.NewMultiNotifier(
		&alert.EmailNotifier{
			SMTPHost:     os.Getenv("SMTP_HOST"),
			SMTPPort:     587,
			FromAddress:  os.Getenv("EMAIL_FROM"),
			FromPassword: os.Getenv("EMAIL_PASSWORD"),
		},
		&alert.TelegramNotifier{
			BotToken: os.Getenv("TELEGRAM_TOKEN"),
			ChatID:   os.Getenv("TELEGRAM_CHAT_ID"),
		},
	)

	// 初始化API服务
	api := NewAPI(assetManager)
	router := gin.Default()
	router.GET("/api/v1/assets/:chain/:address", api.GetAssets)
	router.GET("/api/v1/assets/history/:id", api.GetAssetHistory)

	// 添加Swagger文档
	router.StaticFile("/swagger.json", "./docs/swagger.json")
	router.GET("/docs/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	go func() {
		if err := router.Run(":8080"); err != nil {
			logger.Fatalf("API服务启动失败: %v", err)
		}
	}()

	// 监控配置的地址
	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()

	addresses := []string{"0xYourAddress1", "0xYourAddress2"}
	if err := assetManager.TrackAssets(ctx, "ethereum", addresses); err != nil {
		log.Fatal(err)
	}

	<-ctx.Done()
	log.Println("Shutting down...")
}