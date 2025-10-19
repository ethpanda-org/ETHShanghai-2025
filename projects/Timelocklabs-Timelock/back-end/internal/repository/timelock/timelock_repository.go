package timelock

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"timelock-backend/internal/types"
	"timelock-backend/pkg/logger"

	"gorm.io/gorm"
)

// Repository timelock仓库接口
type Repository interface {
	// Compound Timelock操作
	CreateCompoundTimeLock(ctx context.Context, timeLock *types.CompoundTimeLock) error
	GetCompoundTimeLockByChainAndAddress(ctx context.Context, chainID int, contractAddress string) (*types.CompoundTimeLock, error)
	UpdateCompoundTimeLock(ctx context.Context, timeLock *types.CompoundTimeLock) error
	DeleteCompoundTimeLock(ctx context.Context, chainID int, contractAddress string, userAddress string) error
	UpdateCompoundTimeLockRemark(ctx context.Context, chainID int, contractAddress string, userAddress string, remark string) error

	// 查询操作
	CheckCompoundTimeLockExists(ctx context.Context, chainID int, contractAddress string, userAddress string) (bool, error)

	// 权限相关查询
	GetTimeLocksByUserPermissions(ctx context.Context, userAddress string, req *types.GetTimeLockListRequest) ([]types.CompoundTimeLockWithPermission, int64, error)

	// 验证操作
	ValidateCompoundOwnership(ctx context.Context, chainID int, contractAddress string, userAddress string) (bool, error)

	// 获取用户相关的timelock合约（用于权限刷新）
	GetAllCompoundTimeLocksByUser(ctx context.Context, userAddress string) ([]types.CompoundTimeLock, error)

	// 获取所有活跃timelock合约（用于定时刷新）
	GetAllActiveCompoundTimeLocks(ctx context.Context) ([]types.CompoundTimeLock, error)

	// 通用方法：根据标准、链ID和合约地址获取合约备注
	GetContractRemarkByStandardAndAddress(ctx context.Context, standard string, chainID int, contractAddress string) (string, error)
}

type repository struct {
	db *gorm.DB
}

// NewRepository 创建timelock仓库实例
func NewRepository(db *gorm.DB) Repository {
	return &repository{
		db: db,
	}
}

// CreateCompoundTimeLock 创建compound timelock合约记录
func (r *repository) CreateCompoundTimeLock(ctx context.Context, timeLock *types.CompoundTimeLock) error {
	if err := r.db.WithContext(ctx).Create(timeLock).Error; err != nil {
		logger.Error("CreateCompoundTimeLock error", err, "creator_address", timeLock.CreatorAddress, "contract_address", timeLock.ContractAddress)
		return err
	}

	logger.Info("CreateCompoundTimeLock success", "timelock_id", timeLock.ID, "creator_address", timeLock.CreatorAddress, "contract_address", timeLock.ContractAddress)
	return nil
}

// GetCompoundTimeLockByChainAndAddress 根据链ID和合约地址获取compound timelock合约
func (r *repository) GetCompoundTimeLockByChainAndAddress(ctx context.Context, chainID int, contractAddress string) (*types.CompoundTimeLock, error) {
	var timeLock types.CompoundTimeLock
	normalizedContractAddress := strings.ToLower(contractAddress)
	err := r.db.WithContext(ctx).
		Where("chain_id = ? AND LOWER(contract_address) = ? AND status != ?", chainID, normalizedContractAddress, "deleted").
		First(&timeLock).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("timelock not found")
		}
		logger.Error("GetCompoundTimeLockByChainAndAddress error", err, "chain_id", chainID, "contract_address", contractAddress)
		return nil, err
	}

	logger.Info("GetCompoundTimeLockByChainAndAddress success", "timelock_id", timeLock.ID, "creator_address", timeLock.CreatorAddress)
	return &timeLock, nil
}

// UpdateCompoundTimeLock 更新compound timelock合约信息
func (r *repository) UpdateCompoundTimeLock(ctx context.Context, timeLock *types.CompoundTimeLock) error {
	if err := r.db.WithContext(ctx).Save(timeLock).Error; err != nil {
		logger.Error("UpdateCompoundTimeLock error", err, "timelock_id", timeLock.ID)
		return err
	}

	logger.Info("UpdateCompoundTimeLock success", "timelock_id", timeLock.ID, "creator_address", timeLock.CreatorAddress)
	return nil
}

// DeleteCompoundTimeLock 硬删除 compound timelock 合约（仅删除合约行，不清理其他表）
func (r *repository) DeleteCompoundTimeLock(ctx context.Context, chainID int, contractAddress string, userAddress string) error {
	normalizedContractAddress := strings.ToLower(contractAddress)
	normalizedUserAddress := strings.ToLower(userAddress)
	if err := r.db.WithContext(ctx).
		Where("chain_id = ? AND LOWER(contract_address) = ? AND LOWER(creator_address) = ?", chainID, normalizedContractAddress, normalizedUserAddress).
		Delete(&types.CompoundTimeLock{}).Error; err != nil {
		logger.Error("DeleteCompoundTimeLock error", err, "chain_id", chainID, "contract_address", contractAddress, "user_address", userAddress)
		return err
	}
	logger.Info("DeleteCompoundTimeLock success", "chain_id", chainID, "contract_address", contractAddress, "user_address", userAddress)
	return nil
}

// UpdateCompoundTimeLockRemark 更新compound timelock备注
func (r *repository) UpdateCompoundTimeLockRemark(ctx context.Context, chainID int, contractAddress string, userAddress string, remark string) error {
	normalizedContractAddress := strings.ToLower(contractAddress)
	normalizedUserAddress := strings.ToLower(userAddress)
	if err := r.db.WithContext(ctx).
		Model(&types.CompoundTimeLock{}).
		Where("chain_id = ? AND LOWER(contract_address) = ? AND LOWER(creator_address) = ?", chainID, normalizedContractAddress, normalizedUserAddress).
		Update("remark", remark).Error; err != nil {
		logger.Error("UpdateCompoundTimeLockRemark error", err, "chain_id", chainID, "contract_address", contractAddress, "user_address", userAddress)
		return err
	}

	logger.Info("UpdateCompoundTimeLockRemark success", "chain_id", chainID, "contract_address", contractAddress, "user_address", userAddress, "remark_length", len(remark))
	return nil
}

// CheckCompoundTimeLockExists 检查compound timelock合约是否已存在
func (r *repository) CheckCompoundTimeLockExists(ctx context.Context, chainID int, contractAddress string, userAddress string) (bool, error) {
	normalizedContractAddress := strings.ToLower(contractAddress)
	normalizedUserAddress := strings.ToLower(userAddress)
	var count int64
	err := r.db.WithContext(ctx).
		Model(&types.CompoundTimeLock{}).
		Where("chain_id = ? AND LOWER(contract_address) = ? AND LOWER(creator_address) = ? AND status != ?", chainID, normalizedContractAddress, normalizedUserAddress, "deleted").
		Count(&count).Error

	if err != nil {
		logger.Error("CheckCompoundTimeLockExists error", err, "chain_id", chainID, "contract_address", contractAddress)
		return false, err
	}

	exists := count > 0
	logger.Info("CheckCompoundTimeLockExists", "chain_id", chainID, "contract_address", contractAddress, "exists", exists)
	return exists, nil
}

// GetTimeLocksByUserPermissions 根据用户权限获取timelock列表
func (r *repository) GetTimeLocksByUserPermissions(ctx context.Context, userAddress string, req *types.GetTimeLockListRequest) ([]types.CompoundTimeLockWithPermission, int64, error) {
	var compoundTimeLocks []types.CompoundTimeLock
	var totalCount int64
	normalizedUserAddress := strings.ToLower(userAddress)

	// 构建查询基础条件
	baseQuery := "status != ?"
	baseArgs := []interface{}{"deleted"}

	// 添加状态筛选条件
	if req.Status != "" {
		baseQuery += " AND status = ?"
		baseArgs = append(baseArgs, req.Status)
	}

	// 查询Compound timelocks - 用户是创建者、管理员或待定管理员
	compoundQuery := r.db.WithContext(ctx).
		Model(&types.CompoundTimeLock{}).
		Where(baseQuery+" AND (LOWER(creator_address) = ? OR LOWER(admin) = ? OR LOWER(pending_admin) = ?)",
			append(baseArgs, normalizedUserAddress, normalizedUserAddress, normalizedUserAddress)...)

	var compoundCount int64
	if err := compoundQuery.Count(&compoundCount).Error; err != nil {
		logger.Error("GetTimeLocksByUserPermissions compound count error", err, "user_address", userAddress)
		return nil, 0, err
	}

	// 查询所有Compound timelocks（无分页）
	if err := compoundQuery.Order("created_at DESC").Find(&compoundTimeLocks).Error; err != nil {
		logger.Error("GetTimeLocksByUserPermissions compound query error", err, "user_address", userAddress)
		return nil, 0, err
	}

	totalCount = compoundCount

	// 构建带权限信息的响应
	compoundWithPermissions := make([]types.CompoundTimeLockWithPermission, len(compoundTimeLocks))
	for i, tl := range compoundTimeLocks {
		permissions := r.getCompoundUserPermissions(tl, userAddress)
		compoundWithPermissions[i] = types.CompoundTimeLockWithPermission{
			CompoundTimeLock: tl,
			UserPermissions:  permissions,
		}
	}

	logger.Info("GetTimeLocksByUserPermissions success", "user_address", userAddress, "compound_count", len(compoundWithPermissions), "total", totalCount)
	return compoundWithPermissions, totalCount, nil
}

// ValidateCompoundOwnership 验证compound timelock合约的所有权
func (r *repository) ValidateCompoundOwnership(ctx context.Context, chainID int, contractAddress string, userAddress string) (bool, error) {
	normalizedContractAddress := strings.ToLower(contractAddress)
	normalizedUserAddress := strings.ToLower(userAddress)
	var count int64
	err := r.db.WithContext(ctx).
		Model(&types.CompoundTimeLock{}).
		Where("chain_id = ? AND LOWER(contract_address) = ? AND LOWER(creator_address) = ? AND status != ?", chainID, normalizedContractAddress, normalizedUserAddress, "deleted").
		Count(&count).Error

	if err != nil {
		logger.Error("ValidateCompoundOwnership error", err, "chain_id", chainID, "contract_address", contractAddress, "user_address", userAddress)
		return false, err
	}

	isOwner := count > 0
	logger.Info("ValidateCompoundOwnership", "chain_id", chainID, "contract_address", contractAddress, "user_address", userAddress, "is_owner", isOwner)
	return isOwner, nil
}

// GetAllCompoundTimeLocksByUser 获取用户相关的所有compound timelock合约
func (r *repository) GetAllCompoundTimeLocksByUser(ctx context.Context, userAddress string) ([]types.CompoundTimeLock, error) {
	var timelocks []types.CompoundTimeLock
	normalizedUserAddress := strings.ToLower(userAddress)
	err := r.db.WithContext(ctx).
		Where("(LOWER(creator_address) = ? OR LOWER(admin) = ? OR LOWER(pending_admin) = ?) AND status != ?", normalizedUserAddress, normalizedUserAddress, normalizedUserAddress, "deleted").
		Find(&timelocks).Error

	if err != nil {
		logger.Error("GetAllCompoundTimeLocksByUser error", err, "user_address", userAddress)
		return nil, err
	}

	logger.Info("GetAllCompoundTimeLocksByUser success", "user_address", userAddress, "count", len(timelocks))
	return timelocks, nil
}

// GetAllActiveCompoundTimeLocks 获取所有活跃的compound timelock合约
func (r *repository) GetAllActiveCompoundTimeLocks(ctx context.Context) ([]types.CompoundTimeLock, error) {
	var timelocks []types.CompoundTimeLock

	err := r.db.WithContext(ctx).
		Where("status = ?", "active").
		Find(&timelocks).Error

	if err != nil {
		logger.Error("GetAllActiveCompoundTimeLocks error", err)
		return nil, err
	}

	logger.Info("GetAllActiveCompoundTimeLocks success", "count", len(timelocks))
	return timelocks, nil
}

// GetContractRemarkByStandardAndAddress 根据标准、链ID和合约地址获取合约备注
func (r *repository) GetContractRemarkByStandardAndAddress(ctx context.Context, standard string, chainID int, contractAddress string) (string, error) {
	standard = strings.ToLower(strings.TrimSpace(standard))
	contractAddress = strings.ToLower(strings.TrimSpace(contractAddress))

	switch standard {
	case "compound":
		var timeLock types.CompoundTimeLock
		err := r.db.WithContext(ctx).
			Select("remark").
			Where("chain_id = ? AND LOWER(contract_address) = ? AND status = ?", chainID, contractAddress, "active").
			First(&timeLock).Error

		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				logger.Debug("Compound contract not found", "chainID", chainID, "contractAddress", contractAddress)
				return "", nil // 返回空字符串而不是错误，因为合约可能不存在
			}
			logger.Error("GetContractRemarkByStandardAndAddress error for compound", err, "chainID", chainID, "contractAddress", contractAddress)
			return "", err
		}

		return timeLock.Remark, nil

	default:
		return "", fmt.Errorf("unsupported timelock standard: %s", standard)
	}
}

// getCompoundUserPermissions 获取compound timelock合约的用户权限
func (r *repository) getCompoundUserPermissions(tl types.CompoundTimeLock, userAddress string) []string {
	var permissions []string

	if strings.EqualFold(tl.CreatorAddress, userAddress) {
		permissions = append(permissions, "creator")
	}
	if strings.EqualFold(tl.Admin, userAddress) {
		permissions = append(permissions, "admin")
	}
	if tl.PendingAdmin != nil && strings.EqualFold(*tl.PendingAdmin, userAddress) {
		permissions = append(permissions, "pending_admin")
	}

	return permissions
}
