package sponsor

import (
	"timelock-backend/internal/types"
	"timelock-backend/pkg/logger"

	"gorm.io/gorm"
)

// Repository 赞助方存储库接口
type Repository interface {
	// 获取所有激活的赞助方（公开接口使用）
	GetAllActive() ([]*types.Sponsor, error)
}

// repository 赞助方存储库实现
type repository struct {
	db *gorm.DB
}

// NewRepository 创建新的赞助方存储库
func NewRepository(db *gorm.DB) Repository {
	return &repository{
		db: db,
	}
}

// GetAllActive 获取所有激活的赞助方（公开接口使用）
func (r *repository) GetAllActive() ([]*types.Sponsor, error) {
	var sponsors []*types.Sponsor
	err := r.db.Where("is_active = ?", true).
		Order("sort_order DESC, created_at DESC").
		Find(&sponsors).Error

	if err != nil {
		logger.Error("GetAllActive sponsors error", err)
		return nil, err
	}

	logger.Info("Got all active sponsors", "count", len(sponsors))
	return sponsors, nil
}
