package reputation

import (
	"context"
	"fmt"
	"time"

	"github.com/KamisAyaka/crowdsourcing_graphql/packages/backend/internal/model"
	"github.com/KamisAyaka/crowdsourcing_graphql/packages/backend/internal/repository/db"
	"github.com/KamisAyaka/crowdsourcing_graphql/packages/backend/pkg/logger"
)

type Service struct {
	db         *db.Database
	calculator *Calculator
}

func NewService(db *db.Database, calculator *Calculator) *Service {
	return &Service{
		db:         db,
		calculator: calculator,
	}
}

// GetOrCalculateScore 获取或计算用户分数
func (s *Service) GetOrCalculateScore(ctx context.Context, address string) (*model.GuildScore, error) {
	// 从数据库获取
	var score model.GuildScore
	err := s.db.Preload("User").
		Joins("JOIN users ON users.id = guild_scores.user_id").
		Where("users.address = ?", address).
		First(&score).Error

	if err == nil {
		// 检查是否需要更新（超过1小时）
		if time.Since(score.CalculatedAt) < time.Hour {
			return &score, nil
		}
	}

	// 重新计算
	return s.CalculateAndSave(ctx, address)
}

// CalculateAndSave 计算并保存分数
func (s *Service) CalculateAndSave(ctx context.Context, address string) (*model.GuildScore, error) {
	// 计算分数
	result, err := s.calculator.CalculateGuildScore(ctx, address)
	if err != nil {
		return nil, fmt.Errorf("failed to calculate score: %w", err)
	}

	// 查找或创建用户
	var user model.User
	err = s.db.Where("address = ?", address).FirstOrCreate(&user, model.User{Address: address}).Error
	if err != nil {
		return nil, fmt.Errorf("failed to find or create user: %w", err)
	}

	// 查找或创建分数记录
	var score model.GuildScore
	err = s.db.Where("user_id = ?", user.ID).FirstOrInit(&score).Error
	if err != nil {
		return nil, fmt.Errorf("failed to find score: %w", err)
	}

	// 记录历史（如果分数发生变化）
	if score.ID > 0 && score.Score != result.GuildScore {
		history := model.GuildScoreHistory{
			UserID:       user.ID,
			Score:        result.GuildScore,
			Rank:         result.Rank.Grade,
			ChangeReason: "recalculation",
		}
		s.db.Create(&history)
	}

	// 更新分数
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
		return nil, fmt.Errorf("failed to save score: %w", err)
	}

	logger.Info("Score calculated and saved", "address", address, "score", result.GuildScore)

	return &score, nil
}

// GetLeaderboard 获取排行榜
func (s *Service) GetLeaderboard(ctx context.Context, limit, offset int) ([]model.GuildScore, error) {
	var scores []model.GuildScore
	err := s.db.
		Preload("User").
		Order("score DESC").
		Limit(limit).
		Offset(offset).
		Find(&scores).Error

	return scores, err
}

// GetScoreHistory 获取分数历史
func (s *Service) GetScoreHistory(ctx context.Context, address string, limit int) ([]model.GuildScoreHistory, error) {
	var history []model.GuildScoreHistory
	err := s.db.
		Joins("JOIN users ON users.id = guild_score_histories.user_id").
		Where("users.address = ?", address).
		Order("created_at DESC").
		Limit(limit).
		Find(&history).Error

	return history, err
}

// GetImprovementSuggestions 获取改进建议
func (s *Service) GetImprovementSuggestions(ctx context.Context, address string) (interface{}, error) {
	score, err := s.GetOrCalculateScore(ctx, address)
	if err != nil {
		return nil, err
	}

	suggestions := generateSuggestions(score)
	return suggestions, nil
}

// GetUserProfile 获取用户资料
func (s *Service) GetUserProfile(ctx context.Context, address string) (*model.User, error) {
	var user model.User
	err := s.db.
		Preload("Profile").
		Preload("GuildScore").
		Where("address = ?", address).
		First(&user).Error

	return &user, err
}

// GetUserStats 获取用户统计
func (s *Service) GetUserStats(ctx context.Context, address string) (interface{}, error) {
	score, err := s.GetOrCalculateScore(ctx, address)
	if err != nil {
		return nil, err
	}

	completionRate := 0.0
	if score.TotalTasks > 0 {
		completionRate = float64(score.CompletedTasks) / float64(score.TotalTasks)
	}

	stats := map[string]interface{}{
		"total_tasks":     score.TotalTasks,
		"completed_tasks": score.CompletedTasks,
		"dispute_count":   score.DisputeCount,
		"completion_rate": completionRate,
		"current_score":   score.Score,
		"rank":            score.RankTitle,
		"last_updated":    score.CalculatedAt,
	}

	return stats, nil
}

// GetUserTier 获取用户等级
func (s *Service) GetUserTier(ctx context.Context, address string) (map[string]interface{}, error) {
	score, err := s.GetOrCalculateScore(ctx, address)
	if err != nil {
		return nil, err
	}

	tier := GetScoreTier(score.Score)
	inSensitiveZone := IsInSensitiveZone(score.Score)

	return map[string]interface{}{
		"address":           address,
		"score":             score.Score,
		"tier":              string(tier),
		"in_sensitive_zone": inSensitiveZone,
		"next_tier_score":   getNextTierScore(score.Score),
		"tier_progress":     getTierProgress(score.Score),
	}, nil
}

// 辅助函数
func getNextTierScore(score float64) float64 {
	if score < ThresholdPoorGood {
		return ThresholdPoorGood
	}
	if score < ThresholdGoodExcellent {
		return ThresholdGoodExcellent
	}
	return 100.0
}

func getTierProgress(score float64) float64 {
	if score < ThresholdPoorGood {
		return (score / ThresholdPoorGood) * 100
	}
	if score < ThresholdGoodExcellent {
		return ((score - ThresholdPoorGood) / (ThresholdGoodExcellent - ThresholdPoorGood)) * 100
	}
	return ((score - ThresholdGoodExcellent) / (100 - ThresholdGoodExcellent)) * 100
}

func generateSuggestions(score *model.GuildScore) []map[string]interface{} {
	suggestions := []map[string]interface{}{}

	if score.TaskCompletionScore < 20 {
		suggestions = append(suggestions, map[string]interface{}{
			"priority":        "high",
			"dimension":       "taskCompletion",
			"issue":           "任务完成度较低",
			"suggestions":     []string{"提高任务完成率", "注意deadline", "选择匹配的任务"},
			"expected_impact": "+10-15分",
		})
	}

	if score.TaskCreationScore < 10 {
		suggestions = append(suggestions, map[string]interface{}{
			"priority":        "medium",
			"dimension":       "taskCreation",
			"issue":           "任务发布质量需提升",
			"suggestions":     []string{"及时支付任务", "撰写清晰描述", "设置合理报酬"},
			"expected_impact": "+5-10分",
		})
	}

	if score.DisputeScore < 10 {
		suggestions = append(suggestions, map[string]interface{}{
			"priority":        "high",
			"dimension":       "disputeResolution",
			"issue":           "存在纠纷历史",
			"suggestions":     []string{"加强沟通", "及时更新进度", "保留证明记录"},
			"expected_impact": "+8-12分",
		})
	}

	if score.TimeDecayFactor < 0.95 {
		suggestions = append(suggestions, map[string]interface{}{
			"priority":        "high",
			"dimension":       "activity",
			"issue":           "近期活跃度下降",
			"suggestions":     []string{"增加任务参与", "保持持续活跃"},
			"expected_impact": fmt.Sprintf("+%.1f分", (1-score.TimeDecayFactor)*score.RawScore),
		})
	}

	return suggestions
}
