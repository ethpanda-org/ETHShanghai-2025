package main

import (
	"log"

	"github.com/KamisAyaka/crowdsourcing_graphql/packages/backend/internal/config"
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

	log.Println("开始清理不需要的表...")

	// 删除AI分析相关的表
	log.Println("删除AI分析表...")
	
	// 删除增强AI分析表
	if err := db.Exec("DROP TABLE IF EXISTS enhanced_ai_analyses CASCADE").Error; err != nil {
		log.Printf("删除enhanced_ai_analyses表失败: %v", err)
	} else {
		log.Println("✅ 删除enhanced_ai_analyses表成功")
	}

	// 删除原始AI分析表
	if err := db.Exec("DROP TABLE IF EXISTS ai_analyses CASCADE").Error; err != nil {
		log.Printf("删除ai_analyses表失败: %v", err)
	} else {
		log.Println("✅ 删除ai_analyses表成功")
	}

	// 删除旧的公会分数相关表
	log.Println("删除旧的公会分数表...")
	
	// 删除原始公会分数历史表
	if err := db.Exec("DROP TABLE IF EXISTS guild_score_histories CASCADE").Error; err != nil {
		log.Printf("删除guild_score_histories表失败: %v", err)
	} else {
		log.Println("✅ 删除guild_score_histories表成功")
	}

	// 删除原始公会分数表
	if err := db.Exec("DROP TABLE IF EXISTS guild_scores CASCADE").Error; err != nil {
		log.Printf("删除guild_scores表失败: %v", err)
	} else {
		log.Println("✅ 删除guild_scores表成功")
	}

	// 删除原始用户表（保留enhanced_users）
	log.Println("删除原始用户表...")
	
	// 删除原始用户表
	if err := db.Exec("DROP TABLE IF EXISTS users CASCADE").Error; err != nil {
		log.Printf("删除users表失败: %v", err)
	} else {
		log.Println("✅ 删除users表成功")
	}

	// 删除用户档案表（如果不需要的话）
	log.Println("删除用户档案表...")
	
	// 删除用户档案表
	if err := db.Exec("DROP TABLE IF EXISTS user_profiles CASCADE").Error; err != nil {
		log.Printf("删除user_profiles表失败: %v", err)
	} else {
		log.Println("✅ 删除user_profiles表成功")
	}

	log.Println("🎉 表清理完成！")

	// 显示剩余的表
	log.Println("\n📊 剩余的表:")
	var tables []string
	if err := db.Raw("SELECT tablename FROM pg_tables WHERE schemaname = 'public'").Scan(&tables).Error; err != nil {
		log.Printf("获取表信息失败: %v", err)
	} else {
		for _, table := range tables {
			log.Printf("  - %s", table)
		}
	}

	log.Println("\n✅ 清理完成！现在只保留增强的表结构。")
}
