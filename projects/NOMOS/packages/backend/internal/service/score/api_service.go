package score

import (
    "context"
    "fmt"

    "gorm.io/gorm"

    "github.com/KamisAyaka/crowdsourcing_graphql/packages/backend/internal/model"
)

// EnhancedGuildScoreService 提供对外给 API 使用的增强分数查询服务
type EnhancedGuildScoreService struct {
    db          *gorm.DB
    calculator  *EnhancedScoreCalculator
}

func NewEnhancedGuildScoreService(db *gorm.DB) *EnhancedGuildScoreService {
    return &EnhancedGuildScoreService{
        db:         db,
        calculator: NewEnhancedScoreCalculator(db),
    }
}

// GetOrCalculateByAddress 通过地址获取或计算最新分数
func (s *EnhancedGuildScoreService) GetOrCalculateByAddress(ctx context.Context, address string) (*model.EnhancedGuildScore, error) {
    // 确认增强用户是否存在
    var user model.EnhancedUser
    if err := s.db.Where("address = ?", address).First(&user).Error; err != nil {
        if err == gorm.ErrRecordNotFound {
            user = model.EnhancedUser{Address: address}
            if err := s.db.Create(&user).Error; err != nil {
                return nil, fmt.Errorf("创建增强用户失败: %w", err)
            }
        } else {
            return nil, fmt.Errorf("查询增强用户失败: %w", err)
        }
    }

    // 优先读取已有分数
    var score model.EnhancedGuildScore
    if err := s.db.Where("user_id = ?", user.ID).First(&score).Error; err != nil {
        if err != gorm.ErrRecordNotFound {
            return nil, fmt.Errorf("查询分数失败: %w", err)
        }
    }

    // 计算并保存（会内部更新/创建记录）
    result, err := s.calculator.CalculateUserScore(ctx, user.ID)
    if err != nil {
        return nil, err
    }
    return result, nil
}

// GetLeaderboard 获取排行榜（按总分倒序）
func (s *EnhancedGuildScoreService) GetLeaderboard(ctx context.Context, limit, offset int) ([]struct {
    Address    string  `json:"address"`
    TotalScore float64 `json:"total_score"`
    Rank       int     `json:"rank"`
    RankTitle  string  `json:"rank_title"`
}, error) {
    type row struct {
        Address    string
        TotalScore float64
        Rank       int
        RankTitle  string
    }
    var rows []row
    if err := s.db.Table("enhanced_guild_scores s").
        Select("u.address, s.total_score, s.rank, s.rank_title").
        Joins("JOIN enhanced_users u ON u.id = s.user_id").
        Order("s.total_score DESC").
        Limit(limit).
        Offset(offset).
        Scan(&rows).Error; err != nil {
        return nil, fmt.Errorf("查询排行榜失败: %w", err)
    }

    // 映射匿名结构供 JSON 输出
    result := make([]struct {
        Address    string  `json:"address"`
        TotalScore float64 `json:"total_score"`
        Rank       int     `json:"rank"`
        RankTitle  string  `json:"rank_title"`
    }, len(rows))
    for i, r := range rows {
        result[i].Address = r.Address
        result[i].TotalScore = r.TotalScore
        result[i].Rank = r.Rank
        result[i].RankTitle = r.RankTitle
    }
    return result, nil
}

// GetHistoryByAddress 获取指定地址的分数历史
func (s *EnhancedGuildScoreService) GetHistoryByAddress(ctx context.Context, address string, limit int) ([]model.EnhancedGuildScoreHistory, error) {
    var user model.EnhancedUser
    // 如果不存在则创建，避免首次查询报错
    if err := s.db.Where("address = ?", address).First(&user).Error; err != nil {
        if err == gorm.ErrRecordNotFound {
            user = model.EnhancedUser{Address: address}
            if err := s.db.Create(&user).Error; err != nil {
                return nil, fmt.Errorf("创建增强用户失败: %w", err)
            }
        } else {
            return nil, fmt.Errorf("查询增强用户失败: %w", err)
        }
    }

    var histories []model.EnhancedGuildScoreHistory
    if err := s.db.Where("user_id = ?", user.ID).Order("created_at DESC").Limit(limit).Find(&histories).Error; err != nil {
        return nil, fmt.Errorf("查询分数历史失败: %w", err)
    }
    return histories, nil
}


