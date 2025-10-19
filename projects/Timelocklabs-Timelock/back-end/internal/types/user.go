package types

import (
	"time"
)

// AuthNonce 认证nonce模型
type AuthNonce struct {
	ID            int64     `json:"id" gorm:"primaryKey;autoIncrement"`
	WalletAddress string    `json:"wallet_address" gorm:"size:42;not null;index;uniqueIndex:idx_nonce_wallet_nonce,priority:1"`
	Nonce         string    `json:"nonce" gorm:"size:128;not null;uniqueIndex:idx_nonce_wallet_nonce,priority:2"`
	Message       string    `json:"message" gorm:"type:text;not null"`
	ExpiresAt     time.Time `json:"expires_at" gorm:"not null;index"`
	IsUsed        bool      `json:"is_used" gorm:"default:false;index"`
	CreatedAt     time.Time `json:"created_at" gorm:"autoCreateTime"`
}

// TableName 设置表名
func (AuthNonce) TableName() string {
	return "auth_nonces"
}

// User 用户模型
type User struct {
	ID            int64      `json:"id" gorm:"primaryKey;autoIncrement"`
	WalletAddress string     `json:"wallet_address" gorm:"unique;size:42;not null"` // 钱包地址作为唯一标识
	CreatedAt     time.Time  `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt     time.Time  `json:"updated_at" gorm:"autoUpdateTime"`
	LastLogin     *time.Time `json:"last_login"`
	Status        int        `json:"status" gorm:"default:1"`
	IsSafeWallet  bool       `json:"is_safe_wallet" gorm:"default:false"`    // 是否为Safe钱包
	SafeThreshold *int       `json:"safe_threshold,omitempty"`               // Safe钱包阈值
	SafeOwners    *string    `json:"safe_owners,omitempty" gorm:"type:text"` // Safe钱包所有者列表（JSON）
}

// TableName 设置表名
func (User) TableName() string {
	return "users"
}

// GetNonceRequest 获取nonce请求
type GetNonceRequest struct {
	WalletAddress string `json:"wallet_address" form:"wallet_address" binding:"required,len=42"`
}

// GetNonceResponse 获取nonce响应
type GetNonceResponse struct {
	Message string `json:"message"`
	Nonce   string `json:"nonce"`
}

// WalletConnectRequest 钱包连接请求
type WalletConnectRequest struct {
	ChainID       int    `json:"chain_id,omitempty"` // Safe需要指定链ID
	WalletAddress string `json:"wallet_address" binding:"required,len=42"`
	Signature     string `json:"signature,omitempty"`                                  // EOA钱包需要，Safe钱包可选
	Message       string `json:"message,omitempty"`                                    // EOA钱包需要，Safe钱包可选
	WalletType    string `json:"wallet_type,omitempty"`                                // "eoa", "safe"
	Nonce         string `json:"nonce" binding:"required_if=WalletType eoa,omitempty"` // EOA钱包需要nonce，Safe钱包不需要
}

// WalletConnectResponse 钱包连接响应
type WalletConnectResponse struct {
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
	ExpiresAt    time.Time `json:"expires_at"`
	User         User      `json:"user"`
}

// RefreshTokenRequest 刷新令牌请求
type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

// UserProfile 用户资料
type UserProfile struct {
	WalletAddress string     `json:"wallet_address"`
	CreatedAt     time.Time  `json:"created_at"`
	LastLogin     *time.Time `json:"last_login"`
}

// JWTClaims JWT声明
type JWTClaims struct {
	UserID        int64  `json:"user_id"`
	WalletAddress string `json:"wallet_address"`
	Type          string `json:"type"` // access or refresh
}

// APIResponse 统一API响应格式
type APIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   *APIError   `json:"error,omitempty"`
}

// APIError API错误格式
type APIError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Details string `json:"details,omitempty"`
}

// ErrorResponse 简单错误响应格式
type ErrorResponse struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}
