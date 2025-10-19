package types

import (
	"time"
)

// ABI ABI库模型
type ABI struct {
	ID          int64     `json:"id" gorm:"primaryKey;autoIncrement"`
	Name        string    `json:"name" gorm:"size:200;not null"`           // ABI名称
	ABIContent  string    `json:"abi_content" gorm:"type:text;not null"`   // ABI JSON内容
	Owner       string    `json:"owner" gorm:"size:42;not null;index"`     // 所有者地址，全0表示共享ABI
	Description string    `json:"description" gorm:"size:500;default:''"`  // ABI描述
	IsShared    bool      `json:"is_shared" gorm:"not null;default:false"` // 是否为共享ABI
	CreatedAt   time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt   time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

// TableName 设置表名
func (ABI) TableName() string {
	return "abis"
}

// CreateABIRequest 创建ABI请求
type CreateABIRequest struct {
	Name        string `json:"name" binding:"required,min=1,max=200"`
	ABIContent  string `json:"abi_content" binding:"required"`
	Description string `json:"description" binding:"max=500"`
}

// UpdateABIRequest 更新ABI请求
type UpdateABIRequest struct {
	Name        string `json:"name" binding:"required,min=1,max=200"`
	ABIContent  string `json:"abi_content" binding:"required"`
	Description string `json:"description" binding:"max=500"`
}

// ABIListResponse ABI列表响应
type ABIListResponse struct {
	ABIs []ABI `json:"abis"` // 用户创建的ABI及平台共享的ABI
}

// ABIResponse ABI详情响应
type ABIResponse struct {
	ID          int64     `json:"id"`
	Name        string    `json:"name"`
	ABIContent  string    `json:"abi_content"`
	Owner       string    `json:"owner"`
	Description string    `json:"description"`
	IsShared    bool      `json:"is_shared"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// ABIValidationResult ABI验证结果
type ABIValidationResult struct {
	IsValid       bool     `json:"is_valid"`
	ErrorMessage  string   `json:"error_message,omitempty"`
	Warnings      []string `json:"warnings,omitempty"`
	FunctionCount int      `json:"function_count"`
	EventCount    int      `json:"event_count"`
}

// GetABIByIDRequest 按ID获取ABI请求
type GetABIByIDRequest struct {
	ID int64 `json:"id" binding:"required"`
}

// UpdateABIWithIDRequest 带ID的更新ABI请求
type UpdateABIWithIDRequest struct {
	ID int64 `json:"id" binding:"required"`
	UpdateABIRequest
}

// DeleteABIRequest 删除ABI请求
type DeleteABIRequest struct {
	ID int64 `json:"id" binding:"required"`
}
