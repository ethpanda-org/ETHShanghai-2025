package chain

import (
	"context"
	"errors"
	"fmt"
	"timelock-backend/internal/types"
	"timelock-backend/pkg/logger"

	"gorm.io/gorm"
)

// Repository 支持链仓库接口
type Repository interface {
	GetAllActiveChains() ([]*types.SupportChain, error)
	GetChainByChainName(chainName string) (*types.SupportChain, error)
	GetActiveMainnetChains() ([]*types.SupportChain, error)
	GetActiveTestnetChains() ([]*types.SupportChain, error)

	// 获取支持链列表
	GetSupportChains(ctx context.Context, req *types.GetSupportChainsRequest) ([]types.SupportChain, int64, error)
	// 根据ChainID获取链信息
	GetChainByChainID(ctx context.Context, chainID int64) (*types.SupportChain, error)

	// RPC配置相关
	GetRPCEnabledChains(ctx context.Context, includeTestnets bool) ([]types.ChainRPCInfo, error)
}

// repository 支持链仓库实现
type repository struct {
	db *gorm.DB
}

// NewRepository 创建新的支持链仓库
func NewRepository(db *gorm.DB) Repository {
	return &repository{
		db: db,
	}
}

// GetAllActiveChains 获取所有激活的链
func (r *repository) GetAllActiveChains() ([]*types.SupportChain, error) {
	var chains []*types.SupportChain

	err := r.db.Where("is_active = ?", true).Find(&chains).Error
	if err != nil {
		logger.Error("GetAllActiveChains Error: ", err)
		return nil, err
	}

	logger.Info("GetAllActiveChains: ", "count", len(chains))
	return chains, nil
}

// GetChainByChainName 根据链名称获取链信息
func (r *repository) GetChainByChainName(chainName string) (*types.SupportChain, error) {
	var chain types.SupportChain

	err := r.db.Where("chain_name = ?", chainName).First(&chain).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("chain not found")
		}
		logger.Error("GetChainByChainName Error: ", err, "chain_name", chainName)
		return nil, err
	}

	logger.Info("GetChainByChainName: ", "chain_name", chainName, "found", chain.ID)
	return &chain, nil
}

// GetActiveMainnetChains 获取所有激活的主网链
func (r *repository) GetActiveMainnetChains() ([]*types.SupportChain, error) {
	var chains []*types.SupportChain

	err := r.db.Where("is_active = ? AND is_testnet = ?", true, false).Find(&chains).Error
	if err != nil {
		logger.Error("GetActiveMainnetChains Error: ", err)
		return nil, err
	}

	logger.Info("GetActiveMainnetChains: ", "count", len(chains))
	return chains, nil
}

// GetActiveTestnetChains 获取所有激活的测试网链
func (r *repository) GetActiveTestnetChains() ([]*types.SupportChain, error) {
	var chains []*types.SupportChain

	err := r.db.Where("is_active = ? AND is_testnet = ?", true, true).Find(&chains).Error
	if err != nil {
		logger.Error("GetActiveTestnetChains Error: ", err)
		return nil, err
	}

	logger.Info("GetActiveTestnetChains: ", "count", len(chains))
	return chains, nil
}

// GetSupportChains 根据条件获取支持链列表
func (r *repository) GetSupportChains(ctx context.Context, req *types.GetSupportChainsRequest) ([]types.SupportChain, int64, error) {
	var chains []types.SupportChain
	var total int64

	query := r.db.WithContext(ctx).Model(&types.SupportChain{})

	// 根据筛选条件构建查询
	if req.IsTestnet != nil {
		query = query.Where("is_testnet = ?", *req.IsTestnet)
	}
	if req.IsActive != nil {
		query = query.Where("is_active = ?", *req.IsActive)
	}

	// 获取总数
	if err := query.Count(&total).Error; err != nil {
		logger.Error("GetSupportChains Count Error: ", err)
		return nil, 0, err
	}

	// 获取数据，按创建时间倒序排列
	if err := query.Order("created_at DESC").Find(&chains).Error; err != nil {
		logger.Error("GetSupportChains Find Error: ", err)
		return nil, 0, err
	}

	logger.Info("GetSupportChains: ", "count", len(chains), "total", total)
	return chains, total, nil
}

// GetChainByChainID 根据ChainID获取链信息
func (r *repository) GetChainByChainID(ctx context.Context, chainID int64) (*types.SupportChain, error) {
	var chain types.SupportChain

	err := r.db.WithContext(ctx).Where("chain_id = ?", chainID).First(&chain).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("chain not found")
		}
		logger.Error("GetChainByChainID Error: ", err, "chain_id", chainID)
		return nil, err
	}

	logger.Info("GetChainByChainID: ", "chain_id", chainID, "chain_name", chain.ChainName)
	return &chain, nil
}

// GetRPCEnabledChains 获取启用RPC的链配置
func (r *repository) GetRPCEnabledChains(ctx context.Context, includeTestnets bool) ([]types.ChainRPCInfo, error) {
	var chains []types.ChainRPCInfo

	query := r.db.WithContext(ctx).
		Table("support_chains").
		Where("is_active = ? AND rpc_enabled = ?", true, true)

	if !includeTestnets {
		query = query.Where("is_testnet = ?", false)
	}

	err := query.
		Select("chain_name, display_name, chain_id, alchemy_rpc_template, official_rpc_urls, rpc_enabled, is_testnet").
		Find(&chains).Error

	if err != nil {
		logger.Error("GetRPCEnabledChains Error: ", err, "include_testnets", includeTestnets)
		return nil, err
	}

	logger.Info("GetRPCEnabledChains Success: ", "count", len(chains), "include_testnets", includeTestnets)
	return chains, nil
}
