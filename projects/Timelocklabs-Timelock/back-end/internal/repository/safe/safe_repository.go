package safe

import (
	"context"
	"fmt"

	"timelock-backend/internal/types"
	"timelock-backend/pkg/crypto"
	"timelock-backend/pkg/logger"

	"gorm.io/gorm"
)

// Repository Safe仓库接口
type Repository interface {
	// 创建或更新Safe信息
	CreateOrUpdateSafe(ctx context.Context, safe *types.SafeWallet) error

	// 根据地址获取Safe信息
	GetSafeByAddress(ctx context.Context, address string, chainID int) (*types.SafeWallet, error)

	// 检查地址是否为Safe钱包
	IsSafeAddress(ctx context.Context, address string, chainID int) (bool, error)

	// 删除Safe信息
	DeleteSafe(ctx context.Context, address string, chainID int) error

	// 更新Safe状态
	UpdateSafeStatus(ctx context.Context, address string, chainID int, status string) error
}

type repository struct {
	db *gorm.DB
}

// NewRepository 创建Safe仓库
func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

// CreateOrUpdateSafe 创建或更新Safe信息
func (r *repository) CreateOrUpdateSafe(ctx context.Context, safe *types.SafeWallet) error {
	logger.Info("CreateOrUpdateSafe", "safe_address", safe.SafeAddress, "chain_id", safe.ChainID)

	normalizedAddress := crypto.NormalizeAddress(safe.SafeAddress)
	safe.SafeAddress = normalizedAddress

	// 使用ON CONFLICT DO UPDATE实现upsert
	result := r.db.WithContext(ctx).
		Where("safe_address = ? AND chain_id = ?", normalizedAddress, safe.ChainID).
		Assign(map[string]interface{}{
			"chain_name": safe.ChainName,
			"threshold":  safe.Threshold,
			"owners":     safe.Owners,
			"version":    safe.Version,
			"status":     safe.Status,
		}).
		FirstOrCreate(safe)

	if result.Error != nil {
		logger.Error("Failed to create or update safe", result.Error)
		return fmt.Errorf("failed to create or update safe: %w", result.Error)
	}

	logger.Info("CreateOrUpdateSafe success", "safe_id", safe.ID)
	return nil
}

// GetSafeByAddress 根据地址获取Safe信息
func (r *repository) GetSafeByAddress(ctx context.Context, address string, chainID int) (*types.SafeWallet, error) {
	logger.Info("GetSafeByAddress", "address", address, "chain_id", chainID)

	normalizedAddress := crypto.NormalizeAddress(address)

	var safe types.SafeWallet
	result := r.db.WithContext(ctx).
		Where("LOWER(safe_address) = LOWER(?) AND chain_id = ? AND status = ?", normalizedAddress, chainID, "active").
		First(&safe)

	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			return nil, nil
		}
		logger.Error("Failed to get safe by address", result.Error)
		return nil, fmt.Errorf("failed to get safe by address: %w", result.Error)
	}

	return &safe, nil
}

// IsSafeAddress 检查地址是否为Safe钱包
func (r *repository) IsSafeAddress(ctx context.Context, address string, chainID int) (bool, error) {
	normalizedAddress := crypto.NormalizeAddress(address)

	var count int64
	result := r.db.WithContext(ctx).
		Model(&types.SafeWallet{}).
		Where("LOWER(safe_address) = ? AND chain_id = ? AND status = ?", normalizedAddress, chainID, "active").
		Count(&count)

	if result.Error != nil {
		return false, result.Error
	}

	return count > 0, nil
}

// DeleteSafe 删除Safe信息
func (r *repository) DeleteSafe(ctx context.Context, address string, chainID int) error {
	logger.Info("DeleteSafe", "address", address, "chain_id", chainID)

	normalizedAddress := crypto.NormalizeAddress(address)

	result := r.db.WithContext(ctx).
		Where("LOWER(safe_address) = ? AND chain_id = ?", normalizedAddress, chainID).
		Delete(&types.SafeWallet{})

	if result.Error != nil {
		logger.Error("Failed to delete safe", result.Error)
		return fmt.Errorf("failed to delete safe: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("safe not found")
	}

	logger.Info("DeleteSafe success", "address", normalizedAddress, "chain_id", chainID)
	return nil
}

// UpdateSafeStatus 更新Safe状态
func (r *repository) UpdateSafeStatus(ctx context.Context, address string, chainID int, status string) error {
	logger.Info("UpdateSafeStatus", "address", address, "chain_id", chainID, "status", status)

	normalizedAddress := crypto.NormalizeAddress(address)

	result := r.db.WithContext(ctx).
		Model(&types.SafeWallet{}).
		Where("LOWER(safe_address) = ? AND chain_id = ?", normalizedAddress, chainID).
		Update("status", status)

	if result.Error != nil {
		logger.Error("Failed to update safe status", result.Error)
		return fmt.Errorf("failed to update safe status: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("safe not found")
	}

	logger.Info("UpdateSafeStatus success", "address", normalizedAddress, "status", status)
	return nil
}
