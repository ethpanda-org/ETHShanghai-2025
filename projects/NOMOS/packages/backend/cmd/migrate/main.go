package main

import (
	"log"

	"github.com/KamisAyaka/crowdsourcing_graphql/packages/backend/internal/config"
	"github.com/KamisAyaka/crowdsourcing_graphql/packages/backend/internal/model"
	"github.com/KamisAyaka/crowdsourcing_graphql/packages/backend/internal/repository/db"
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

	// 执行数据库迁移
	log.Println("开始数据库迁移...")

	// 迁移增强的用户模型
	if err := db.AutoMigrate(&model.EnhancedUser{}); err != nil {
		log.Fatalf("迁移增强用户表失败: %v", err)
	}
	log.Println("✅ 增强用户表迁移完成")

	// 迁移用户行为统计表
	if err := db.AutoMigrate(&model.UserBehaviorStats{}); err != nil {
		log.Fatalf("迁移用户行为统计表失败: %v", err)
	}
	log.Println("✅ 用户行为统计表迁移完成")

	// 迁移投标表
	if err := db.AutoMigrate(&model.Bid{}); err != nil {
		log.Fatalf("迁移投标表失败: %v", err)
	}
	log.Println("✅ 投标表迁移完成")

	// 迁移争议表
	if err := db.AutoMigrate(&model.Dispute{}); err != nil {
		log.Fatalf("迁移争议表失败: %v", err)
	}
	log.Println("✅ 争议表迁移完成")

	// 迁移增强的公会分数表
	if err := db.AutoMigrate(&model.EnhancedGuildScore{}); err != nil {
		log.Fatalf("迁移增强公会分数表失败: %v", err)
	}
	log.Println("✅ 增强公会分数表迁移完成")

	// 迁移增强的公会分数历史表
	if err := db.AutoMigrate(&model.EnhancedGuildScoreHistory{}); err != nil {
		log.Fatalf("迁移增强公会分数历史表失败: %v", err)
	}
	log.Println("✅ 增强公会分数历史表迁移完成")

	// 迁移增强的AI分析表
	if err := db.AutoMigrate(&model.EnhancedAIAnalysis{}); err != nil {
		log.Fatalf("迁移增强AI分析表失败: %v", err)
	}
	log.Println("✅ 增强AI分析表迁移完成")

	// 迁移现有表（保持兼容性）
	if err := db.AutoMigrate(&model.User{}); err != nil {
		log.Fatalf("迁移用户表失败: %v", err)
	}
	log.Println("✅ 用户表迁移完成")

	if err := db.AutoMigrate(&model.UserProfile{}); err != nil {
		log.Fatalf("迁移用户档案表失败: %v", err)
	}
	log.Println("✅ 用户档案表迁移完成")

	if err := db.AutoMigrate(&model.GuildScore{}); err != nil {
		log.Fatalf("迁移公会分数表失败: %v", err)
	}
	log.Println("✅ 公会分数表迁移完成")

	if err := db.AutoMigrate(&model.GuildScoreHistory{}); err != nil {
		log.Fatalf("迁移公会分数历史表失败: %v", err)
	}
	log.Println("✅ 公会分数历史表迁移完成")

	if err := db.AutoMigrate(&model.AIAnalysis{}); err != nil {
		log.Fatalf("迁移AI分析表失败: %v", err)
	}
	log.Println("✅ AI分析表迁移完成")

	if err := db.AutoMigrate(&model.TaskCache{}); err != nil {
		log.Fatalf("迁移任务缓存表失败: %v", err)
	}
	log.Println("✅ 任务缓存表迁移完成")

	log.Println("🎉 所有数据库迁移完成！")

	// 显示表信息
	log.Println("\n📊 数据库表信息:")
	var tables []string
	if err := db.Raw("SELECT tablename FROM pg_tables WHERE schemaname = 'public'").Scan(&tables).Error; err != nil {
		log.Printf("获取表信息失败: %v", err)
	} else {
		for _, table := range tables {
			log.Printf("  - %s", table)
		}
	}
}
