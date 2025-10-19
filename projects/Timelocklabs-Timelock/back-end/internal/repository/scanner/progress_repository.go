package scanner

import (
	"context"
	"timelock-backend/internal/types"
	"timelock-backend/pkg/logger"

	"gorm.io/gorm"
)

// ProgressRepository 扫描进度仓库接口
type ProgressRepository interface {
	GetProgressByChainID(ctx context.Context, chainID int) (*types.BlockScanProgress, error)
	UpdateProgress(ctx context.Context, progress *types.BlockScanProgress) error
	CreateProgress(ctx context.Context, progress *types.BlockScanProgress) error
	GetAllActiveProgress(ctx context.Context) ([]types.BlockScanProgress, error)
	UpdateProgressBlock(ctx context.Context, chainID int, lastScannedBlock, latestNetworkBlock int64) error
	UpdateAllRunningScannersToPaused(ctx context.Context) error
}

type progressRepository struct {
	db *gorm.DB
}

// NewProgressRepository 创建新的扫描进度仓库
func NewProgressRepository(db *gorm.DB) ProgressRepository {
	return &progressRepository{
		db: db,
	}
}

// GetProgressByChainID 根据链ID获取扫描进度
func (r *progressRepository) GetProgressByChainID(ctx context.Context, chainID int) (*types.BlockScanProgress, error) {
	var progress types.BlockScanProgress
	err := r.db.WithContext(ctx).
		Where("chain_id = ?", chainID).
		First(&progress).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			logger.Debug("No scan progress found for chain", "chain_id", chainID)
			return nil, nil
		}
		logger.Error("GetProgressByChainID Error", err, "chain_id", chainID)
		return nil, err
	}

	return &progress, nil
}

// CreateProgress 创建新的扫描进度记录
func (r *progressRepository) CreateProgress(ctx context.Context, progress *types.BlockScanProgress) error {
	if err := r.db.WithContext(ctx).Create(progress).Error; err != nil {
		logger.Error("CreateProgress Error", err, "chain_id", progress.ChainID)
		return err
	}

	return nil
}

// UpdateProgress 更新扫描进度
func (r *progressRepository) UpdateProgress(ctx context.Context, progress *types.BlockScanProgress) error {
	if err := r.db.WithContext(ctx).Save(progress).Error; err != nil {
		logger.Error("UpdateProgress Error", err, "chain_id", progress.ChainID)
		return err
	}

	return nil
}

// UpdateProgressBlock 快速更新扫描区块信息
func (r *progressRepository) UpdateProgressBlock(ctx context.Context, chainID int, lastScannedBlock, latestNetworkBlock int64) error {
	err := r.db.WithContext(ctx).
		Model(&types.BlockScanProgress{}).
		Where("chain_id = ?", chainID).
		Updates(map[string]interface{}{
			"last_scanned_block":   lastScannedBlock,
			"latest_network_block": latestNetworkBlock,
			"last_update_time":     "NOW()",
		}).Error

	if err != nil {
		logger.Error("UpdateProgressBlock Error", err, "chain_id", chainID)
		return err
	}

	return nil
}

// GetAllActiveProgress 获取所有活跃的扫描进度
func (r *progressRepository) GetAllActiveProgress(ctx context.Context) ([]types.BlockScanProgress, error) {
	var progressList []types.BlockScanProgress
	err := r.db.WithContext(ctx).
		Where("scan_status = ?", "running").
		Find(&progressList).Error

	if err != nil {
		logger.Error("GetAllActiveProgress Error", err)
		return nil, err
	}

	return progressList, nil
}

// UpdateAllRunningScannersToPaused 将所有运行中的扫描器状态更新为暂停
func (r *progressRepository) UpdateAllRunningScannersToPaused(ctx context.Context) error {
	err := r.db.WithContext(ctx).
		Model(&types.BlockScanProgress{}).
		Where("scan_status = ?", "running").
		Updates(map[string]interface{}{
			"scan_status":      "paused",
			"last_update_time": "NOW()",
		}).Error

	if err != nil {
		logger.Error("UpdateAllRunningScannersToPaused Error", err)
		return err
	}

	logger.Info("Updated all running scanners to paused status")
	return nil
}
