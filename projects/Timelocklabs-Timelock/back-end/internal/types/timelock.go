package types

import (
	"time"
)

// CompoundTimeLock Compound标准timelock合约模型
type CompoundTimeLock struct {
	ID              int64     `json:"id" gorm:"primaryKey;autoIncrement"`
	CreatorAddress  string    `json:"creator_address" gorm:"size:42;not null;index;uniqueIndex:idx_compound_creator_chain_address,priority:1"`  // 创建者/导入者地址
	ChainID         int       `json:"chain_id" gorm:"not null;index;uniqueIndex:idx_compound_creator_chain_address,priority:2"`                 // 所在链ID
	ChainName       string    `json:"chain_name" gorm:"size:50;not null;index"`                                                                 // 链名称
	ContractAddress string    `json:"contract_address" gorm:"size:42;not null;index;uniqueIndex:idx_compound_creator_chain_address,priority:3"` // 合约地址
	Delay           int64     `json:"delay" gorm:"not null"`                                                                                    // 延迟时间（秒），从链上读取
	Admin           string    `json:"admin" gorm:"size:42;not null;index"`                                                                      // 管理员地址，从链上读取
	PendingAdmin    *string   `json:"pending_admin" gorm:"size:42;index"`                                                                       // 待定管理员地址，从链上读取
	GracePeriod     int64     `json:"grace_period" gorm:"not null"`                                                                             // 宽限期（秒），从链上读取
	MinimumDelay    int64     `json:"minimum_delay" gorm:"not null"`                                                                            // 最小延迟时间（秒），从链上读取
	MaximumDelay    int64     `json:"maximum_delay" gorm:"not null"`                                                                            // 最大延迟时间（秒），从链上读取
	Remark          string    `json:"remark" gorm:"size:500"`                                                                                   // 备注
	Status          string    `json:"status" gorm:"size:20;not null;default:'active';index"`                                                    // 状态（active, inactive, deleted）
	IsImported      bool      `json:"is_imported" gorm:"not null;default:false"`                                                                // 是否导入的合约
	CreatedAt       time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt       time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

// TableName 设置表名
func (CompoundTimeLock) TableName() string {
	return "compound_timelocks"
}

// CreateOrImportTimelockContractRequest 创建或导入合约请求
type CreateOrImportTimelockContractRequest struct {
	Standard        string `json:"standard" binding:"required,oneof=compound openzeppelin"`
	ContractAddress string `json:"contract_address" binding:"required"`
	ChainID         int    `json:"chain_id" binding:"required"`
	IsImported      bool   `json:"is_imported"`
	Remark          string `json:"remark" binding:"max=500"`
}

// UpdateTimeLockRequest 更新timelock合约请求
type UpdateTimeLockRequest struct {
	Standard        string `json:"standard" binding:"required,oneof=compound openzeppelin"`
	ChainID         int    `json:"chain_id" binding:"required"`
	ContractAddress string `json:"contract_address" binding:"required"`
	Remark          string `json:"remark" binding:"max=500"`
}

// DeleteTimeLockRequest 删除timelock合约请求
type DeleteTimeLockRequest struct {
	Standard        string `json:"standard" binding:"required,oneof=compound openzeppelin"`
	ChainID         int    `json:"chain_id" binding:"required"`
	ContractAddress string `json:"contract_address" binding:"required"`
}

// GetTimeLockListRequest 获取timelock列表请求
type GetTimeLockListRequest struct {
	Standard string `json:"standard" form:"standard"`
	Status   string `json:"status" form:"status"`
}

// GetTimeLockListResponse 获取timelock列表响应
type GetTimeLockListResponse struct {
	CompoundTimeLocks []CompoundTimeLockWithPermission `json:"compound_timelocks"`
	Total             int64                            `json:"total"`
}

// GetTimeLockDetailRequest 获取timelock详情请求
type GetTimeLockDetailRequest struct {
	Standard        string `json:"standard" form:"standard" binding:"required,oneof=compound openzeppelin"`
	ChainID         int    `json:"chain_id" form:"chain_id" binding:"required"`
	ContractAddress string `json:"contract_address" form:"contract_address" binding:"required"`
}

// GetTimeLockDetailResponse timelock详情响应
type GetTimeLockDetailResponse struct {
	Standard     string                          `json:"standard"`
	CompoundData *CompoundTimeLockWithPermission `json:"compound_data,omitempty"`
}

// CompoundTimeLockWithPermission Compound timelock with permission info
type CompoundTimeLockWithPermission struct {
	CompoundTimeLock
	UserPermissions []string `json:"user_permissions"` // creator, admin, pending_admin
}
