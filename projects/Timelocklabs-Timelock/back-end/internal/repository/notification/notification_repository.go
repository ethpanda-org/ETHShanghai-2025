package notification

import (
	"context"
	"fmt"
	"strings"
	"timelock-backend/internal/types"
	"timelock-backend/pkg/logger"

	"gorm.io/gorm"
)

// NotificationRepository 通知渠道仓库接口
type NotificationRepository interface {
	// Telegram配置管理
	CreateTelegramConfig(ctx context.Context, config *types.TelegramConfig) error
	GetTelegramConfigsByUserAddress(ctx context.Context, userAddress string) ([]*types.TelegramConfig, error)
	GetTelegramConfigByUserAddressAndName(ctx context.Context, userAddress, name string) (*types.TelegramConfig, error)
	UpdateTelegramConfig(ctx context.Context, userAddress, name string, updates map[string]interface{}) error
	DeleteTelegramConfig(ctx context.Context, userAddress, name string) error

	// Lark配置管理
	CreateLarkConfig(ctx context.Context, config *types.LarkConfig) error
	GetLarkConfigsByUserAddress(ctx context.Context, userAddress string) ([]*types.LarkConfig, error)
	GetLarkConfigByUserAddressAndName(ctx context.Context, userAddress, name string) (*types.LarkConfig, error)
	UpdateLarkConfig(ctx context.Context, userAddress, name string, updates map[string]interface{}) error
	DeleteLarkConfig(ctx context.Context, userAddress, name string) error

	// Feishu配置管理
	CreateFeishuConfig(ctx context.Context, config *types.FeishuConfig) error
	GetFeishuConfigsByUserAddress(ctx context.Context, userAddress string) ([]*types.FeishuConfig, error)
	GetFeishuConfigByUserAddressAndName(ctx context.Context, userAddress, name string) (*types.FeishuConfig, error)
	UpdateFeishuConfig(ctx context.Context, userAddress, name string, updates map[string]interface{}) error
	DeleteFeishuConfig(ctx context.Context, userAddress, name string) error

	// 通知日志管理
	CreateNotificationLog(ctx context.Context, log *types.NotificationLog) error
	CheckNotificationLogExists(ctx context.Context, channel types.NotificationChannel, userAddress string, configID uint, flowID, statusTo string) (bool, error)

	// 获取用户的所有激活通知配置
	GetUserActiveNotificationConfigs(ctx context.Context, userAddress string) (*types.UserNotificationConfigs, error)

	// 获取与合约相关的用户地址
	GetContractRelatedUserAddresses(ctx context.Context, standard string, chainID int, contractAddress string) ([]string, error)
}

// notificationRepository 通知渠道仓库实现
type notificationRepository struct {
	db *gorm.DB
}

// NewNotificationRepository 创建通知渠道仓库实例
func NewRepository(db *gorm.DB) NotificationRepository {
	return &notificationRepository{db: db}
}

// ===== Telegram配置管理 =====
// CreateTelegramConfig 创建Telegram配置
func (r *notificationRepository) CreateTelegramConfig(ctx context.Context, config *types.TelegramConfig) error {
	if err := r.db.WithContext(ctx).Create(config).Error; err != nil {
		logger.Error("CreateTelegramConfig error", err, "user_address", config.UserAddress, "name", config.Name)
		return err
	}
	logger.Info("CreateTelegramConfig success", "user_address", config.UserAddress, "name", config.Name)
	return nil
}

// GetTelegramConfigsByUserAddress 根据用户地址获取Telegram配置
func (r *notificationRepository) GetTelegramConfigsByUserAddress(ctx context.Context, userAddress string) ([]*types.TelegramConfig, error) {
	var configs []*types.TelegramConfig
	normalizedUserAddress := strings.ToLower(userAddress)
	if err := r.db.WithContext(ctx).
		Where("LOWER(user_address) = ?", normalizedUserAddress).
		Order("created_at DESC").
		Find(&configs).Error; err != nil {
		logger.Error("GetTelegramConfigsByUserAddress error", err, "user_address", userAddress)
		return nil, err
	}
	logger.Info("GetTelegramConfigsByUserAddress success", "user_address", userAddress)
	return configs, nil
}

// GetTelegramConfigByUserAddressAndName 根据用户地址和名称获取Telegram配置
func (r *notificationRepository) GetTelegramConfigByUserAddressAndName(ctx context.Context, userAddress, name string) (*types.TelegramConfig, error) {
	var config types.TelegramConfig
	normalizedUserAddress := strings.ToLower(userAddress)
	if err := r.db.WithContext(ctx).
		Where("LOWER(user_address) = ? AND name = ?", normalizedUserAddress, name).
		First(&config).Error; err != nil {
		logger.Error("GetTelegramConfigByUserAddressAndName error", err, "user_address", userAddress, "name", name)
		return nil, err
	}
	logger.Info("GetTelegramConfigByUserAddressAndName success", "user_address", userAddress, "name", name)
	return &config, nil
}

// UpdateTelegramConfig 更新Telegram配置
func (r *notificationRepository) UpdateTelegramConfig(ctx context.Context, userAddress, name string, updates map[string]interface{}) error {
	normalizedUserAddress := strings.ToLower(userAddress)
	if err := r.db.WithContext(ctx).
		Model(&types.TelegramConfig{}).
		Where("LOWER(user_address) = ? AND name = ?", normalizedUserAddress, name).
		Updates(updates).Error; err != nil {
		logger.Error("UpdateTelegramConfig error", err, "user_address", userAddress, "name", name)
		return err
	}
	logger.Info("UpdateTelegramConfig success", "user_address", userAddress, "name", name)
	return nil
}

// DeleteTelegramConfig 删除Telegram配置
func (r *notificationRepository) DeleteTelegramConfig(ctx context.Context, userAddress, name string) error {
	normalizedUserAddress := strings.ToLower(userAddress)
	if err := r.db.WithContext(ctx).
		Where("LOWER(user_address) = ? AND name = ?", normalizedUserAddress, name).
		Delete(&types.TelegramConfig{}).Error; err != nil {
		logger.Error("DeleteTelegramConfig error", err, "user_address", userAddress, "name", name)
		return err
	}
	logger.Info("DeleteTelegramConfig success", "user_address", userAddress, "name", name)
	return nil
}

// ===== Lark配置管理 =====
// CreateLarkConfig 创建Lark配置
func (r *notificationRepository) CreateLarkConfig(ctx context.Context, config *types.LarkConfig) error {
	if err := r.db.WithContext(ctx).Create(config).Error; err != nil {
		logger.Error("CreateLarkConfig error", err, "user_address", config.UserAddress, "name", config.Name)
		return err
	}
	logger.Info("CreateLarkConfig success", "user_address", config.UserAddress, "name", config.Name)
	return nil
}

// GetLarkConfigsByUserAddress 根据用户地址获取Lark配置
func (r *notificationRepository) GetLarkConfigsByUserAddress(ctx context.Context, userAddress string) ([]*types.LarkConfig, error) {
	var configs []*types.LarkConfig
	normalizedUserAddress := strings.ToLower(userAddress)
	if err := r.db.WithContext(ctx).
		Where("LOWER(user_address) = ?", normalizedUserAddress).
		Order("created_at DESC").
		Find(&configs).Error; err != nil {
		logger.Error("GetLarkConfigsByUserAddress error", err, "user_address", userAddress)
		return nil, err
	}
	logger.Info("GetLarkConfigsByUserAddress success", "user_address", userAddress)
	return configs, nil
}

// GetLarkConfigByUserAddressAndName 根据用户地址和名称获取Lark配置
func (r *notificationRepository) GetLarkConfigByUserAddressAndName(ctx context.Context, userAddress, name string) (*types.LarkConfig, error) {
	var config types.LarkConfig
	normalizedUserAddress := strings.ToLower(userAddress)
	if err := r.db.WithContext(ctx).
		Where("LOWER(user_address) = ? AND name = ?", normalizedUserAddress, name).
		First(&config).Error; err != nil {
		logger.Error("GetLarkConfigByUserAddressAndName error", err, "user_address", userAddress, "name", name)
		return nil, err
	}
	logger.Info("GetLarkConfigByUserAddressAndName success", "user_address", userAddress, "name", name)
	return &config, nil
}

// UpdateLarkConfig 更新Lark配置
func (r *notificationRepository) UpdateLarkConfig(ctx context.Context, userAddress, name string, updates map[string]interface{}) error {
	normalizedUserAddress := strings.ToLower(userAddress)
	if err := r.db.WithContext(ctx).
		Model(&types.LarkConfig{}).
		Where("LOWER(user_address) = ? AND name = ?", normalizedUserAddress, name).
		Updates(updates).Error; err != nil {
		logger.Error("UpdateLarkConfig error", err, "user_address", userAddress, "name", name)
		return err
	}
	logger.Info("UpdateLarkConfig success", "user_address", userAddress, "name", name)
	return nil
}

// DeleteLarkConfig 删除Lark配置
func (r *notificationRepository) DeleteLarkConfig(ctx context.Context, userAddress, name string) error {
	normalizedUserAddress := strings.ToLower(userAddress)
	if err := r.db.WithContext(ctx).
		Where("LOWER(user_address) = ? AND name = ?", normalizedUserAddress, name).
		Delete(&types.LarkConfig{}).Error; err != nil {
		logger.Error("DeleteLarkConfig error", err, "user_address", userAddress, "name", name)
		return err
	}
	logger.Info("DeleteLarkConfig success", "user_address", userAddress, "name", name)
	return nil
}

// ===== Feishu配置管理 =====
// CreateFeishuConfig 创建Feishu配置
func (r *notificationRepository) CreateFeishuConfig(ctx context.Context, config *types.FeishuConfig) error {
	if err := r.db.WithContext(ctx).Create(config).Error; err != nil {
		logger.Error("CreateFeishuConfig error", err, "user_address", config.UserAddress, "name", config.Name)
		return err
	}
	logger.Info("CreateFeishuConfig success", "user_address", config.UserAddress, "name", config.Name)
	return nil
}

// GetFeishuConfigsByUserAddress 根据用户地址获取Feishu配置
func (r *notificationRepository) GetFeishuConfigsByUserAddress(ctx context.Context, userAddress string) ([]*types.FeishuConfig, error) {
	var configs []*types.FeishuConfig
	normalizedUserAddress := strings.ToLower(userAddress)
	if err := r.db.WithContext(ctx).
		Where("LOWER(user_address) = ?", normalizedUserAddress).
		Order("created_at DESC").
		Find(&configs).Error; err != nil {
		logger.Error("GetFeishuConfigsByUserAddress error", err, "user_address", userAddress)
		return nil, err
	}
	logger.Info("GetFeishuConfigsByUserAddress success", "user_address", userAddress)
	return configs, nil
}

// GetFeishuConfigByUserAddressAndName 根据用户地址和名称获取Feishu配置
func (r *notificationRepository) GetFeishuConfigByUserAddressAndName(ctx context.Context, userAddress, name string) (*types.FeishuConfig, error) {
	var config types.FeishuConfig
	normalizedUserAddress := strings.ToLower(userAddress)
	if err := r.db.WithContext(ctx).
		Where("LOWER(user_address) = ? AND name = ?", normalizedUserAddress, name).
		First(&config).Error; err != nil {
		logger.Error("GetFeishuConfigByUserAddressAndName error", err, "user_address", userAddress, "name", name)
		return nil, err
	}
	logger.Info("GetFeishuConfigByUserAddressAndName success", "user_address", userAddress, "name", name)
	return &config, nil
}

// UpdateFeishuConfig 更新Feishu配置
func (r *notificationRepository) UpdateFeishuConfig(ctx context.Context, userAddress, name string, updates map[string]interface{}) error {
	normalizedUserAddress := strings.ToLower(userAddress)
	if err := r.db.WithContext(ctx).
		Model(&types.FeishuConfig{}).
		Where("LOWER(user_address) = ? AND name = ?", normalizedUserAddress, name).
		Updates(updates).Error; err != nil {
		logger.Error("UpdateFeishuConfig error", err, "user_address", userAddress, "name", name)
		return err
	}
	logger.Info("UpdateFeishuConfig success", "user_address", userAddress, "name", name)
	return nil
}

// DeleteFeishuConfig 删除Feishu配置
func (r *notificationRepository) DeleteFeishuConfig(ctx context.Context, userAddress, name string) error {
	normalizedUserAddress := strings.ToLower(userAddress)
	if err := r.db.WithContext(ctx).
		Where("LOWER(user_address) = ? AND name = ?", normalizedUserAddress, name).
		Delete(&types.FeishuConfig{}).Error; err != nil {
		logger.Error("DeleteFeishuConfig error", err, "user_address", userAddress, "name", name)
		return err
	}
	logger.Info("DeleteFeishuConfig success", "user_address", userAddress, "name", name)
	return nil
}

// ===== 通知日志管理 =====
// CreateNotificationLog 创建通知日志
func (r *notificationRepository) CreateNotificationLog(ctx context.Context, log *types.NotificationLog) error {
	if err := r.db.WithContext(ctx).Create(log).Error; err != nil {
		logger.Error("CreateNotificationLog error", err, "user_address", log.UserAddress, "channel", log.Channel, "config_id", log.ConfigID, "flow_id", log.FlowID, "status_to", log.StatusTo)
		return err
	}
	logger.Info("CreateNotificationLog success", "user_address", log.UserAddress, "channel", log.Channel, "config_id", log.ConfigID, "flow_id", log.FlowID, "status_to", log.StatusTo)
	return nil
}

// CheckNotificationLogExists 检查通知日志是否存在
func (r *notificationRepository) CheckNotificationLogExists(ctx context.Context, channel types.NotificationChannel, userAddress string, configID uint, flowID, statusTo string) (bool, error) {
	var count int64
	normalizedUserAddress := strings.ToLower(userAddress)
	if err := r.db.WithContext(ctx).
		Model(&types.NotificationLog{}).
		Where("channel = ? AND LOWER(user_address) = ? AND config_id = ? AND flow_id = ? AND status_to = ? AND send_status = ?", channel, normalizedUserAddress, configID, flowID, statusTo, "success").
		Count(&count).Error; err != nil {
		logger.Error("CheckNotificationLogExists error", err, "channel", channel, "user_address", userAddress, "config_id", configID, "flow_id", flowID, "status_to", statusTo)
		return false, err
	}
	logger.Info("CheckNotificationLogExists success", "channel", channel, "user_address", userAddress, "config_id", configID, "flow_id", flowID, "status_to", statusTo)
	return count > 0, nil
}

// ===== 获取用户的所有激活通知配置 =====
// GetUserActiveNotificationConfigs 获取用户的所有激活通知配置
func (r *notificationRepository) GetUserActiveNotificationConfigs(ctx context.Context, userAddress string) (*types.UserNotificationConfigs, error) {
	configs := &types.UserNotificationConfigs{}
	normalizedUserAddress := strings.ToLower(userAddress)
	// 获取激活的Telegram配置
	if err := r.db.WithContext(ctx).
		Where("LOWER(user_address) = ? AND is_active = ?", normalizedUserAddress, true).
		Find(&configs.TelegramConfigs).Error; err != nil {
		logger.Error("GetUserActiveNotificationConfigs error", err, "user_address", userAddress, "is_active", true)
		return nil, err
	}

	// 获取激活的Lark配置
	if err := r.db.WithContext(ctx).
		Where("LOWER(user_address) = ? AND is_active = ?", normalizedUserAddress, true).
		Find(&configs.LarkConfigs).Error; err != nil {
		logger.Error("GetUserActiveNotificationConfigs error", err, "user_address", userAddress, "is_active", true)
		return nil, err
	}

	// 获取激活的Feishu配置
	if err := r.db.WithContext(ctx).
		Where("LOWER(user_address) = ? AND is_active = ?", normalizedUserAddress, true).
		Find(&configs.FeishuConfigs).Error; err != nil {
		logger.Error("GetUserActiveNotificationConfigs error", err, "user_address", userAddress, "is_active", true)
		return nil, err
	}

	logger.Info("GetUserActiveNotificationConfigs success", "user_address", userAddress)
	return configs, nil
}

// GetContractRelatedUserAddresses 获取与指定合约相关的用户地址列表
func (r *notificationRepository) GetContractRelatedUserAddresses(ctx context.Context, standard string, chainID int, contractAddress string) ([]string, error) {
	var userAddresses []string
	normalizedContractAddress := strings.ToLower(contractAddress)

	switch strings.ToLower(standard) {
	case "compound":
		// 用户是该合约的 admin 或 pending_admin
		sql := `
            SELECT DISTINCT LOWER(u.wallet_address) as wallet_address
            FROM users u
            JOIN compound_timelocks t ON t.chain_id = ? AND LOWER(t.contract_address) = LOWER(?)
            WHERE LOWER(u.wallet_address) = LOWER(t.admin)
               OR (t.pending_admin IS NOT NULL AND LOWER(u.wallet_address) = LOWER(t.pending_admin))
        `
		if err := r.db.WithContext(ctx).Raw(sql, chainID, normalizedContractAddress).Pluck("wallet_address", &userAddresses).Error; err != nil {
			logger.Error("GetContractRelatedUserAddresses compound error", err, "chainID", chainID, "contract", contractAddress)
			return nil, fmt.Errorf("failed to query compound related users: %w", err)
		}
	default:
		logger.Debug("GetContractRelatedUserAddresses unsupported standard", "standard", standard)
		return []string{}, nil
	}

	logger.Info("GetContractRelatedUserAddresses success", "standard", standard, "chainID", chainID, "contract", contractAddress, "count", len(userAddresses))
	return userAddresses, nil
}
