package abi

import (
	"context"
	"fmt"
	"strings"

	"timelock-backend/internal/types"
	"timelock-backend/pkg/logger"

	"gorm.io/gorm"
)

const (
	SharedABIOwner = "0x0000000000000000000000000000000000000000" // 共享ABI的所有者地址
)

type Repository interface {
	CreateABI(ctx context.Context, abi *types.ABI) error
	GetABIByID(ctx context.Context, id int64) (*types.ABI, error)
	GetUserABIs(ctx context.Context, walletAddress string) ([]types.ABI, error)
	GetSharedABIs(ctx context.Context) ([]types.ABI, error)
	GetABIsByOwner(ctx context.Context, walletAddress string) ([]types.ABI, error)
	UpdateABI(ctx context.Context, abi *types.ABI) error
	DeleteABI(ctx context.Context, id int64, walletAddress string) error
	CheckABIOwnership(ctx context.Context, id int64, walletAddress string) (bool, error)
	GetABIByNameAndOwner(ctx context.Context, name string, owner string) (*types.ABI, error)
}

type repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) Repository {
	return &repository{
		db: db,
	}
}

// CreateABI 创建新的ABI
func (r *repository) CreateABI(ctx context.Context, abi *types.ABI) error {
	logger.Info("CreateABI:", "name", abi.Name, "owner", abi.Owner)

	if err := r.db.WithContext(ctx).Create(abi).Error; err != nil {
		logger.Error("CreateABI Error:", err, "name", abi.Name, "owner", abi.Owner)
		return err
	}

	logger.Info("CreateABI Success:", "id", abi.ID, "name", abi.Name, "owner", abi.Owner)
	return nil
}

// GetABIByID 根据ID获取ABI
func (r *repository) GetABIByID(ctx context.Context, id int64) (*types.ABI, error) {
	var abi types.ABI
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&abi).Error

	if err != nil {
		logger.Error("GetABIByID Error:", err, "id", id)
		return nil, err
	}

	logger.Info("GetABIByID Success:", "id", abi.ID, "name", abi.Name, "owner", abi.Owner)
	return &abi, nil
}

// GetUserABIs 获取用户创建的ABI列表
func (r *repository) GetUserABIs(ctx context.Context, walletAddress string) ([]types.ABI, error) {
	var abis []types.ABI
	normalizedWalletAddress := strings.ToLower(walletAddress)
	err := r.db.WithContext(ctx).
		Where("LOWER(owner) = ?", normalizedWalletAddress).
		Order("created_at DESC").
		Find(&abis).Error

	if err != nil {
		logger.Error("GetUserABIs Error:", err, "wallet_address", walletAddress)
		return nil, err
	}

	logger.Info("GetUserABIs Success:", "wallet_address", walletAddress, "count", len(abis))
	return abis, nil
}

// GetSharedABIs 获取共享ABI列表
func (r *repository) GetSharedABIs(ctx context.Context) ([]types.ABI, error) {
	var abis []types.ABI
	err := r.db.WithContext(ctx).
		Where("owner = ? AND is_shared = ?", SharedABIOwner, true).
		Order("created_at DESC").
		Find(&abis).Error

	if err != nil {
		logger.Error("GetSharedABIs Error:", err)
		return nil, err
	}

	logger.Info("GetSharedABIs Success:", "count", len(abis))
	return abis, nil
}

// GetABIsByOwner 获取指定所有者的ABI列表
func (r *repository) GetABIsByOwner(ctx context.Context, walletAddress string) ([]types.ABI, error) {
	var abis []types.ABI
	normalizedWalletAddress := strings.ToLower(walletAddress)
	err := r.db.WithContext(ctx).
		Where("LOWER(owner) = ?", normalizedWalletAddress).
		Order("created_at DESC").
		Find(&abis).Error

	if err != nil {
		logger.Error("GetABIsByOwner Error:", err, "wallet_address", walletAddress)
		return nil, err
	}

	logger.Info("GetABIsByOwner Success:", "wallet_address", walletAddress, "count", len(abis))
	return abis, nil
}

// UpdateABI 更新ABI
func (r *repository) UpdateABI(ctx context.Context, abi *types.ABI) error {
	logger.Info("UpdateABI:", "id", abi.ID, "name", abi.Name, "owner", abi.Owner)

	err := r.db.WithContext(ctx).
		Model(abi).
		Where("id = ?", abi.ID).
		Updates(map[string]interface{}{
			"name":        abi.Name,
			"abi_content": abi.ABIContent,
			"description": abi.Description,
		}).Error

	if err != nil {
		logger.Error("UpdateABI Error:", err, "id", abi.ID, "name", abi.Name)
		return err
	}

	logger.Info("UpdateABI Success:", "id", abi.ID, "name", abi.Name)
	return nil
}

// DeleteABI 删除ABI（硬删除）
func (r *repository) DeleteABI(ctx context.Context, id int64, walletAddress string) error {
	logger.Info("DeleteABI:", "id", id, "wallet_address", walletAddress)
	normalizedWalletAddress := strings.ToLower(walletAddress)
	// 确保只能删除自己的ABI
	result := r.db.WithContext(ctx).
		Where("id = ? AND LOWER(owner) = ?", id, normalizedWalletAddress).
		Delete(&types.ABI{})

	if result.Error != nil {
		logger.Error("DeleteABI Error:", result.Error, "id", id, "wallet_address", walletAddress)
		return result.Error
	}

	if result.RowsAffected == 0 {
		err := fmt.Errorf("ABI not found or access denied")
		logger.Error("DeleteABI Error:", err, "id", id, "wallet_address", walletAddress)
		return err
	}

	logger.Info("DeleteABI Success:", "id", id, "wallet_address", walletAddress)
	return nil
}

// CheckABIOwnership 检查用户是否拥有指定的ABI
func (r *repository) CheckABIOwnership(ctx context.Context, id int64, walletAddress string) (bool, error) {
	var count int64
	normalizedWalletAddress := strings.ToLower(walletAddress)
	err := r.db.WithContext(ctx).
		Model(&types.ABI{}).
		Where("id = ? AND LOWER(owner) = ?", id, normalizedWalletAddress).
		Count(&count).Error

	if err != nil {
		logger.Error("CheckABIOwnership Error:", err, "id", id, "wallet_address", walletAddress)
		return false, err
	}

	isOwner := count > 0
	logger.Info("CheckABIOwnership:", "id", id, "wallet_address", walletAddress, "is_owner", isOwner)
	return isOwner, nil
}

// GetABIByNameAndOwner 根据名称和所有者获取ABI（用于检查重复）
func (r *repository) GetABIByNameAndOwner(ctx context.Context, name string, owner string) (*types.ABI, error) {
	var abi types.ABI
	normalizedOwner := strings.ToLower(owner)
	err := r.db.WithContext(ctx).
		Where("name = ? AND LOWER(owner) = ?", name, normalizedOwner).
		First(&abi).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			logger.Info("GetABIByNameAndOwner: not found", "name", name, "owner", owner)
			return nil, err
		}
		logger.Error("GetABIByNameAndOwner Error:", err, "name", name, "owner", owner)
		return nil, err
	}

	logger.Info("GetABIByNameAndOwner Success:", "id", abi.ID, "name", abi.Name, "owner", abi.Owner)
	return &abi, nil
}
