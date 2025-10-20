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

	log.Println("开始数据迁移...")

	// 1. 迁移用户数据
	log.Println("迁移用户数据...")
	var oldUsers []model.User
	if err := db.Find(&oldUsers).Error; err != nil {
		log.Fatalf("获取用户数据失败: %v", err)
	}

	for _, oldUser := range oldUsers {
		// 创建增强用户
		enhancedUser := model.EnhancedUser{
			Address:   oldUser.Address,
			CreatedAt: oldUser.CreatedAt,
			UpdatedAt: oldUser.UpdatedAt,
			DeletedAt: oldUser.DeletedAt,
		}

		// 检查是否已存在
		var existingUser model.EnhancedUser
		err := db.Where("address = ?", oldUser.Address).First(&existingUser).Error
		if err != nil {
			// 不存在，创建新记录
			if err := db.Create(&enhancedUser).Error; err != nil {
				log.Printf("创建增强用户失败: %v", err)
				continue
			}
			log.Printf("✅ 迁移用户: %s", oldUser.Address)
		} else {
			log.Printf("⏭️  用户已存在: %s", oldUser.Address)
		}
	}

	// 2. 迁移任务缓存数据到投标和争议表
	log.Println("迁移任务数据...")
	var taskCaches []model.TaskCache
	if err := db.Find(&taskCaches).Error; err != nil {
		log.Printf("获取任务缓存数据失败: %v", err)
	} else {
		for _, task := range taskCaches {
			// 创建投标记录（如果有投标者）
			if task.WorkerAddr != "" {
				bid := model.Bid{
					TaskID:        task.TaskID,
					BidderAddr:    task.WorkerAddr,
					Amount:        task.Reward,
					EstimatedTime: 604800, // 默认7天
					Description:   "从任务缓存迁移",
					Status:        "accepted",
				}

				// 检查是否已存在
				var existingBid model.Bid
				err := db.Where("task_id = ? AND bidder_addr = ?", task.TaskID, task.WorkerAddr).First(&existingBid).Error
				if err != nil {
					// 不存在，创建新记录
					if err := db.Create(&bid).Error; err != nil {
						log.Printf("创建投标记录失败: %v", err)
					} else {
						log.Printf("✅ 创建投标记录: 任务 %s, 投标者 %s", task.TaskID, task.WorkerAddr)
					}
				}
			}
		}
	}

	// 3. 创建默认的用户行为统计
	log.Println("创建用户行为统计...")
	var enhancedUsers []model.EnhancedUser
	if err := db.Find(&enhancedUsers).Error; err != nil {
		log.Fatalf("获取增强用户数据失败: %v", err)
	}

	for _, user := range enhancedUsers {
		// 检查是否已有行为统计
		var existingStats model.UserBehaviorStats
		err := db.Where("user_id = ?", user.ID).First(&existingStats).Error
		if err != nil {
			// 不存在，创建默认统计
			stats := model.UserBehaviorStats{
				UserID:                user.ID,
				TotalTasksCreated:     0,
				TotalTasksCompleted:   0,
				TotalTasksAssigned:    0,
				TaskCompletionRate:    0,
				TotalBidsPlaced:       0,
				TotalBidsWon:          0,
				BidWinRate:            0,
				AverageBidAmount:      "0",
				TotalDisputesAsWorker: 0,
				TotalDisputesAsCreator: 0,
				DisputesWonAsWorker:   0,
				DisputesWonAsCreator:  0,
				DisputeWinRate:        0,
				TotalEarnings:         "0",
				TotalSpent:           "0",
				NetProfit:            "0",
				AverageTaskDuration:   0,
				TotalActiveTime:       0,
				OnTimeDeliveryRate:    0.8,
				QualityScore:          0.7,
				ReliabilityScore:      0.8,
				CollaborationScore:    0.6,
				CommunicationScore:    0.7,
			}

			if err := db.Create(&stats).Error; err != nil {
				log.Printf("创建用户行为统计失败: %v", err)
			} else {
				log.Printf("✅ 创建用户行为统计: %s", user.Address)
			}
		}
	}

	log.Println("🎉 数据迁移完成！")

	// 显示统计信息
	log.Println("\n📊 迁移统计:")
	
	var userCount int64
	db.Model(&model.EnhancedUser{}).Count(&userCount)
	log.Printf("增强用户数量: %d", userCount)

	var statsCount int64
	db.Model(&model.UserBehaviorStats{}).Count(&statsCount)
	log.Printf("行为统计数量: %d", statsCount)

	var bidCount int64
	db.Model(&model.Bid{}).Count(&bidCount)
	log.Printf("投标记录数量: %d", bidCount)

	var disputeCount int64
	db.Model(&model.Dispute{}).Count(&disputeCount)
	log.Printf("争议记录数量: %d", disputeCount)
}
