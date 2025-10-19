package types

import "time"

// SafeWallet Safe钱包信息模型
type SafeWallet struct {
	ID          int64     `json:"id" gorm:"primaryKey;autoIncrement"`
	SafeAddress string    `json:"safe_address" gorm:"size:42;not null;index;uniqueIndex:idx_safe_chain_address,priority:1"`
	ChainID     int       `json:"chain_id" gorm:"not null;index;uniqueIndex:idx_safe_chain_address,priority:2"`
	ChainName   string    `json:"chain_name" gorm:"size:50;not null"`
	Threshold   int       `json:"threshold" gorm:"not null"`                             // Safe钱包阈值
	Owners      string    `json:"owners" gorm:"type:text;not null"`                      // JSON数组存储owners
	Version     string    `json:"version" gorm:"size:20"`                                // Safe合约版本
	Status      string    `json:"status" gorm:"size:20;not null;default:'active';index"` // active, inactive
	CreatedAt   time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt   time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

// TableName 设置表名
func (SafeWallet) TableName() string {
	return "safe_wallets"
}

// SafeOwner Safe钱包所有者信息
type SafeOwner struct {
	Address string `json:"address"`
	Name    string `json:"name,omitempty"`
}

// SafeInfo Safe钱包详细信息
type SafeInfo struct {
	SafeAddress string      `json:"safe_address"`
	ChainID     int         `json:"chain_id"`
	ChainName   string      `json:"chain_name"`
	Threshold   int         `json:"threshold"` // Safe钱包阈值
	Owners      []SafeOwner `json:"owners"`    // Safe钱包所有者列表
	Version     string      `json:"version"`   // Safe合约版本
	Nonce       int64       `json:"nonce"`     // Safe的nonce
	Balance     string      `json:"balance"`   // Safe钱包余额
}
