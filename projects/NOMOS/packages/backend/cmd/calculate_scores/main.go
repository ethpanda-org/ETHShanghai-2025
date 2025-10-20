package main

import (
	"context"
	"log"

	"github.com/KamisAyaka/crowdsourcing_graphql/packages/backend/internal/config"
	"github.com/KamisAyaka/crowdsourcing_graphql/packages/backend/internal/repository/db"
	"github.com/KamisAyaka/crowdsourcing_graphql/packages/backend/internal/service/score"
	"github.com/KamisAyaka/crowdsourcing_graphql/packages/backend/internal/service/sync"
	"github.com/KamisAyaka/crowdsourcing_graphql/packages/backend/pkg/subgraph"
)

func main() {
	// 加载配置
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("加载配置失败: %v", err)
	}

	// 连接数据库
	database, err := db.NewDatabase(cfg.Database)
	if err != nil {
		log.Fatalf("连接数据库失败: %v", err)
	}
	defer database.Close()

	// 获取数据库实例
	db := database.DB

	// 创建子图客户端
	subgraphClient := subgraph.NewClient(cfg.SubgraphURL)

	// 创建增强数据同步服务
	enhancedSyncService := sync.NewEnhancedDataSyncService(db, subgraphClient)

	// 创建增强分数计算器
	scoreCalculator := score.NewEnhancedScoreCalculator(db)

	ctx := context.Background()

	log.Println("开始同步用户行为数据...")

	// 获取所有用户
	var users []struct {
		ID      uint   `json:"id"`
		Address string `json:"address"`
	}
	if err := db.Table("users").Select("id, address").Find(&users).Error; err != nil {
		log.Fatalf("获取用户列表失败: %v", err)
	}

	log.Printf("找到 %d 个用户，开始同步行为数据...", len(users))

	// 同步每个用户的行为数据
	for i, user := range users {
		log.Printf("同步用户 %d/%d: %s", i+1, len(users), user.Address)
		
		if err := enhancedSyncService.SyncUserBehaviorStats(ctx, user.Address); err != nil {
			log.Printf("同步用户 %s 行为数据失败: %v", user.Address, err)
			continue
		}
	}

	log.Println("开始计算用户分数...")

	// 计算所有用户分数
	if err := scoreCalculator.UpdateAllUserScores(ctx); err != nil {
		log.Fatalf("计算用户分数失败: %v", err)
	}

	log.Println("获取用户排名...")

	// 获取用户排名
	rankings, err := scoreCalculator.GetUserRanking(ctx, 10)
	if err != nil {
		log.Fatalf("获取用户排名失败: %v", err)
	}

	log.Println("🎉 分数计算完成！")
	log.Println("\n📊 用户排名 (前10名):")
	log.Println("排名 | 地址 | 总分 | 称号")
	log.Println("-----|------|------|------")

	for i, ranking := range rankings {
		log.Printf("%4d | %s | %6.2f | %s", 
			i+1, 
			ranking.User.Address, 
			ranking.TotalScore, 
			ranking.RankTitle)
	}

	log.Println("\n✅ 所有操作完成！")
}
