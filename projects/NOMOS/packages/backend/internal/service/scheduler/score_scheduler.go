package scheduler

import (
	"context"
	"sync"
	"time"

	"github.com/KamisAyaka/crowdsourcing_graphql/packages/backend/internal/config"
	"github.com/KamisAyaka/crowdsourcing_graphql/packages/backend/internal/model"
	"github.com/KamisAyaka/crowdsourcing_graphql/packages/backend/internal/repository/db"
	"github.com/KamisAyaka/crowdsourcing_graphql/packages/backend/internal/service/blockchain"
	"github.com/KamisAyaka/crowdsourcing_graphql/packages/backend/internal/service/reputation"
	"github.com/KamisAyaka/crowdsourcing_graphql/packages/backend/pkg/logger"
	"github.com/KamisAyaka/crowdsourcing_graphql/packages/backend/pkg/subgraph"
)

type ScoreScheduler struct {
	db                *db.Database
	subgraphClient    *subgraph.Client
	calculator        *reputation.Calculator
	blockchainService *blockchain.ReputationContract
	config            *config.Config

	stopChan chan struct{}
	wg       sync.WaitGroup
}

func NewScoreScheduler(
	database *db.Database,
	client *subgraph.Client,
	cfg *config.Config,
) *ScoreScheduler {
	// 初始化区块链服务
	var blockchainService *blockchain.ReputationContract
	if cfg.Blockchain.ReputationContract != "" {
		bc, err := blockchain.NewReputationContract(
			cfg.Blockchain.RPCURL,
			cfg.Blockchain.PrivateKey,
			cfg.Blockchain.ReputationContract,
			cfg.Blockchain.ChainID,
		)
		if err != nil {
			logger.Error("Failed to initialize blockchain service", "error", err)
		} else {
			blockchainService = bc
			logger.Info("Blockchain service initialized")
		}
	}

	return &ScoreScheduler{
		db:                database,
		subgraphClient:    client,
		calculator:        reputation.NewCalculator(client),
		blockchainService: blockchainService,
		config:            cfg,
		stopChan:          make(chan struct{}),
	}
}

// Start 启动调度器
func (s *ScoreScheduler) Start() {
	if !s.config.Scheduler.WeeklyUpdateEnabled && !s.config.Scheduler.MonthlyUpdateEnabled {
		logger.Info("Scheduler is disabled")
		return
	}

	s.wg.Add(2)

	// 启动小周期任务 (每周)
	if s.config.Scheduler.WeeklyUpdateEnabled {
		go s.weeklyUpdateTask()
	} else {
		s.wg.Done()
	}

	// 启动大周期任务 (每月)
	if s.config.Scheduler.MonthlyUpdateEnabled {
		go s.monthlyUpdateTask()
	} else {
		s.wg.Done()
	}
}

// Stop 停止调度器
func (s *ScoreScheduler) Stop() {
	close(s.stopChan)
	s.wg.Wait()

	if s.blockchainService != nil {
		s.blockchainService.Close()
	}

	logger.Info("Score scheduler stopped")
}

// weeklyUpdateTask 每周更新任务 (只更新敏感区间用户)
func (s *ScoreScheduler) weeklyUpdateTask() {
	defer s.wg.Done()

	var ticker *time.Ticker

	// 开发模式: 使用短间隔
	if s.config.Scheduler.DevMode {
		interval := time.Duration(s.config.Scheduler.DevWeeklyIntervalMinutes) * time.Minute
		ticker = time.NewTicker(interval)
		logger.Info("Weekly update task started (DEV MODE)", "interval", interval.String())
	} else {
		// 生产模式: 每周执行
		ticker = time.NewTicker(7 * 24 * time.Hour)
		logger.Info("Weekly update task started (PRODUCTION MODE)")
	}
	defer ticker.Stop()

	// 启动时立即执行一次
	s.updateSensitiveUsers()

	for {
		select {
		case <-ticker.C:
			logger.Info("Starting weekly sensitive zone update")
			s.updateSensitiveUsers()
		case <-s.stopChan:
			return
		}
	}
}

// monthlyUpdateTask 每月更新任务 (更新所有用户)
func (s *ScoreScheduler) monthlyUpdateTask() {
	defer s.wg.Done()

	var ticker *time.Ticker
	var initialDelay time.Duration

	// 开发模式: 使用短间隔
	if s.config.Scheduler.DevMode {
		interval := time.Duration(s.config.Scheduler.DevMonthlyIntervalMinutes) * time.Minute
		ticker = time.NewTicker(interval)
		initialDelay = 2 * time.Minute // 延迟2分钟，避免与周更新冲突
		logger.Info("Monthly update task started (DEV MODE)", "interval", interval.String())
	} else {
		// 生产模式: 每月执行
		ticker = time.NewTicker(30 * 24 * time.Hour)
		initialDelay = 1 * time.Hour // 延迟1小时
		logger.Info("Monthly update task started (PRODUCTION MODE)")
	}
	defer ticker.Stop()

	// 延迟执行
	time.Sleep(initialDelay)
	s.updateAllUsers()

	for {
		select {
		case <-ticker.C:
			logger.Info("Starting monthly full update")
			s.updateAllUsers()
		case <-s.stopChan:
			return
		}
	}
}

// updateSensitiveUsers 更新敏感区间的用户评分
func (s *ScoreScheduler) updateSensitiveUsers() {
	ctx := context.Background()

	// 方法1: 直接查询用户，通过 JOIN 获取他们的分数
	var users []model.User
	err := s.db.
		Joins("JOIN guild_scores ON guild_scores.user_id = users.id").
		Where(
			"(guild_scores.score >= ? AND guild_scores.score <= ?) OR (guild_scores.score >= ? AND guild_scores.score <= ?)",
			reputation.SensitiveLowerBound1,
			reputation.SensitiveUpperBound1,
			reputation.SensitiveLowerBound2,
			reputation.SensitiveUpperBound2,
		).
		Find(&users).Error

	if err != nil {
		logger.Error("Failed to fetch sensitive users", "error", err)
		return
	}

	logger.Info("Updating sensitive zone users", "count", len(users))

	successCount := 0
	failCount := 0

	// 批量更新
	for _, user := range users {
		if err := s.updateUserScore(ctx, user.Address, "weekly_sensitive_update"); err != nil {
			logger.Error("Failed to update user score",
				"address", user.Address,
				"error", err)
			failCount++
		} else {
			successCount++
		}
	}

	logger.Info("Sensitive zone update completed",
		"total", len(users),
		"success", successCount,
		"failed", failCount)
}

// updateAllUsers 更新所有用户评分
func (s *ScoreScheduler) updateAllUsers() {
	ctx := context.Background()

	// 分页查询所有用户
	page := 0
	pageSize := 100

	totalUpdated := 0
	totalFailed := 0

	for {
		var users []model.User
		err := s.db.Limit(pageSize).Offset(page * pageSize).Find(&users).Error

		if err != nil {
			logger.Error("Failed to fetch users", "error", err)
			break
		}

		if len(users) == 0 {
			break
		}

		logger.Info("Updating user batch", "page", page, "count", len(users))

		for _, user := range users {
			if err := s.updateUserScore(ctx, user.Address, "monthly_full_update"); err != nil {
				logger.Error("Failed to update user score",
					"address", user.Address,
					"error", err)
				totalFailed++
			} else {
				totalUpdated++
			}
		}

		page++

		// 添加短暂延迟，避免过载
		time.Sleep(100 * time.Millisecond)
	}

	logger.Info("Monthly full update completed",
		"total_updated", totalUpdated,
		"total_failed", totalFailed)
}

// updateUserScore 更新单个用户的评分
func (s *ScoreScheduler) updateUserScore(ctx context.Context, address string, reason string) error {
	// 1. 从 Subgraph 获取最新数据
	_, err := s.subgraphClient.GetUserWorkSummary(ctx, address)
	if err != nil {
		return err
	}

	// 2. 计算新分数
	result, err := s.calculator.CalculateGuildScore(ctx, address)
	if err != nil {
		return err
	}

	// 3. 查找或创建用户
	var user model.User
	err = s.db.Where("address = ?", address).FirstOrCreate(&user, model.User{Address: address}).Error
	if err != nil {
		return err
	}

	// 4. 查找或创建分数记录
	var score model.GuildScore
	err = s.db.Where("user_id = ?", user.ID).FirstOrInit(&score).Error
	if err != nil {
		return err
	}

	oldScore := score.Score
	oldTier := reputation.GetScoreTier(oldScore)
	newTier := reputation.GetScoreTier(result.GuildScore)

	// 5. 记录历史（如果分数或等级发生变化）
	if score.ID > 0 && (oldScore != result.GuildScore || oldTier != newTier) {
		history := model.GuildScoreHistory{
			UserID:       user.ID,
			Score:        result.GuildScore,
			Rank:         result.Rank.Grade,
			ChangeReason: reason,
		}
		s.db.Create(&history)

		logger.Info("Score changed",
			"address", address,
			"old_score", oldScore,
			"new_score", result.GuildScore,
			"old_tier", oldTier,
			"new_tier", newTier,
		)
	}

	// 6. 更新分数
	score.UserID = user.ID
	score.Score = result.GuildScore
	score.Rank = result.Rank.Grade
	score.RankTitle = result.Rank.Title
	score.TaskCompletionScore = result.Breakdown.TaskCompletion.Score
	score.TaskCreationScore = result.Breakdown.TaskCreation.Score
	score.BiddingScore = result.Breakdown.Bidding.Score
	score.DisputeScore = result.Breakdown.Dispute.Score
	score.ActivityScore = result.Breakdown.Activity.Score
	score.TimeDecayFactor = result.TimeDecayFactor
	score.RawScore = result.RawScore

	// 更新统计数据
	if details, ok := result.Breakdown.TaskCompletion.Details["total_tasks"].(int); ok {
		score.TotalTasks = details
	}
	if details, ok := result.Breakdown.TaskCompletion.Details["completed_tasks"].(int); ok {
		score.CompletedTasks = details
	}
	if details, ok := result.Breakdown.Dispute.Details["total_disputes"].(int); ok {
		score.DisputeCount = details
	}

	score.CalculatedAt = time.Now()
	score.UpdatedAt = time.Now()

	if err := s.db.Save(&score).Error; err != nil {
		return err
	}

	// 7. 如果等级发生变化，上链更新
	if s.blockchainService != nil && oldTier != newTier {
		if err := s.blockchainService.UpdateUserScore(ctx, address, result.GuildScore, string(newTier)); err != nil {
			logger.Error("Failed to update score on chain",
				"address", address,
				"error", err)
			// 不阻断流程，仅记录错误
		} else {
			logger.Info("Score updated on chain successfully",
				"address", address,
				"score", result.GuildScore,
				"tier", newTier,
			)
		}
	}

	return nil
}
