package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"strings"

	"github.com/KamisAyaka/crowdsourcing_graphql/packages/backend/internal/config"
	"github.com/KamisAyaka/crowdsourcing_graphql/packages/backend/internal/repository/db"
	"github.com/KamisAyaka/crowdsourcing_graphql/packages/backend/internal/service/sync"
	"github.com/KamisAyaka/crowdsourcing_graphql/packages/backend/pkg/subgraph"
)

func main() {
	var (
		action    = flag.String("action", "all", "同步操作: all, user, batch")
		address   = flag.String("address", "", "用户地址（用于单个用户同步）")
		addresses = flag.String("addresses", "", "用户地址列表，用逗号分隔（用于批量同步）")
		help      = flag.Bool("help", false, "显示帮助信息")
	)
	flag.Parse()

	if *help {
		showHelp()
		return
	}

	// 加载配置
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("加载配置失败: %v", err)
	}

	// 初始化数据库
	database, err := db.NewDatabase(cfg.Database)
	if err != nil {
		log.Fatalf("连接数据库失败: %v", err)
	}
	defer database.Close()

	// 自动迁移
	if err := database.AutoMigrate(); err != nil {
		log.Fatalf("数据库迁移失败: %v", err)
	}

	// 初始化 Subgraph 客户端
	log.Printf("子图URL: %s", cfg.SubgraphURL)
	subgraphClient := subgraph.NewClient(cfg.SubgraphURL)

	// 创建数据同步服务
	dataSyncService := sync.NewDataSyncService(database, subgraphClient)

	ctx := context.Background()

	switch *action {
	case "all":
		fmt.Println("开始全量用户数据同步...")
		if err := dataSyncService.SyncAllUsers(ctx); err != nil {
			log.Fatalf("全量同步失败: %v", err)
		}
		fmt.Println("全量用户数据同步完成")

	case "user":
		if *address == "" {
			log.Fatal("用户地址不能为空，请使用 -address 参数指定")
		}
		fmt.Printf("开始同步用户 %s 的数据...\n", *address)
		if err := dataSyncService.SyncUserBehaviorData(ctx, *address); err != nil {
			log.Fatalf("用户数据同步失败: %v", err)
		}
		fmt.Printf("用户 %s 的数据同步完成\n", *address)

	case "batch":
		if *addresses == "" {
			log.Fatal("用户地址列表不能为空，请使用 -addresses 参数指定")
		}
		addressList := strings.Split(*addresses, ",")
		fmt.Printf("开始批量同步 %d 个用户的数据...\n", len(addressList))
		
		successCount := 0
		failureCount := 0
		
		for _, addr := range addressList {
			addr = strings.TrimSpace(addr)
			if addr == "" {
				continue
			}
			
			fmt.Printf("同步用户: %s\n", addr)
			if err := dataSyncService.SyncUserBehaviorData(ctx, addr); err != nil {
				fmt.Printf("用户 %s 同步失败: %v\n", addr, err)
				failureCount++
			} else {
				successCount++
			}
		}
		
		fmt.Printf("批量同步完成: 成功 %d 个，失败 %d 个\n", successCount, failureCount)

	default:
		log.Fatalf("未知的操作: %s", *action)
	}
}

func showHelp() {
	fmt.Println("数据同步工具")
	fmt.Println("")
	fmt.Println("用法:")
	fmt.Println("  go run cmd/sync/main.go [选项]")
	fmt.Println("")
	fmt.Println("选项:")
	fmt.Println("  -config string")
	fmt.Println("        配置文件路径 (默认: config.yaml)")
	fmt.Println("  -action string")
	fmt.Println("        同步操作: all, user, batch (默认: all)")
	fmt.Println("  -address string")
	fmt.Println("        用户地址（用于单个用户同步）")
	fmt.Println("  -addresses string")
	fmt.Println("        用户地址列表，用逗号分隔（用于批量同步）")
	fmt.Println("  -help")
	fmt.Println("        显示帮助信息")
	fmt.Println("")
	fmt.Println("示例:")
	fmt.Println("  # 全量同步所有用户")
	fmt.Println("  go run cmd/sync/main.go -action all")
	fmt.Println("")
	fmt.Println("  # 同步单个用户")
	fmt.Println("  go run cmd/sync/main.go -action user -address 0x1234...")
	fmt.Println("")
	fmt.Println("  # 批量同步多个用户")
	fmt.Println("  go run cmd/sync/main.go -action batch -addresses 0x1234...,0x5678...,0x9abc...")
}
