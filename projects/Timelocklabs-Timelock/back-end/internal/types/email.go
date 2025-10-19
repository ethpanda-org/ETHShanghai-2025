package types

import (
	"time"
)

// Email 邮箱主表模型
type Email struct {
	ID            int64     `json:"id" gorm:"primaryKey;autoIncrement"`
	Email         string    `json:"email" gorm:"unique;size:200;not null"`
	IsDeliverable bool      `json:"is_deliverable" gorm:"not null;default:true"`
	CreatedAt     time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt     time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

// TableName 设置表名
func (Email) TableName() string {
	return "emails"
}

// UserEmail 用户与邮箱的关系表模型
type UserEmail struct {
	ID             int64      `json:"id" gorm:"primaryKey;autoIncrement"`
	UserID         int64      `json:"user_id" gorm:"not null"`
	EmailID        int64      `json:"email_id" gorm:"not null"`
	Remark         *string    `json:"remark" gorm:"size:200"`
	IsVerified     bool       `json:"is_verified" gorm:"not null;default:false"`
	LastVerifiedAt *time.Time `json:"last_verified_at"`
	CreatedAt      time.Time  `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt      time.Time  `json:"updated_at" gorm:"autoUpdateTime"`

	// 关联
	Email *Email `json:"email,omitempty" gorm:"foreignKey:EmailID"`
	User  *User  `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

// TableName 设置表名
func (UserEmail) TableName() string {
	return "user_emails"
}

// EmailVerificationCode 邮箱验证码模型
type EmailVerificationCode struct {
	ID           int64     `json:"id" gorm:"primaryKey;autoIncrement"`
	UserEmailID  int64     `json:"user_email_id" gorm:"not null"`
	Code         string    `json:"code" gorm:"size:16;not null"`
	ExpiresAt    time.Time `json:"expires_at" gorm:"not null"`
	SentAt       time.Time `json:"sent_at" gorm:"not null;autoCreateTime"`
	AttemptCount int       `json:"attempt_count" gorm:"not null;default:0"`
	IsUsed       bool      `json:"is_used" gorm:"not null;default:false"`

	// 关联
	UserEmail *UserEmail `json:"user_email,omitempty" gorm:"foreignKey:UserEmailID"`
}

// TableName 设置表名
func (EmailVerificationCode) TableName() string {
	return "email_verification_codes"
}

// EmailSendLog 邮件发送日志模型
type EmailSendLog struct {
	ID               int64     `json:"id" gorm:"primaryKey;autoIncrement"`
	EmailID          int64     `json:"email_id" gorm:"not null"`
	FlowID           string    `json:"flow_id" gorm:"size:128;not null"`
	TimelockStandard string    `json:"timelock_standard" gorm:"size:20;not null"`
	ChainID          int       `json:"chain_id" gorm:"not null"`
	ContractAddress  string    `json:"contract_address" gorm:"size:42;not null"`
	StatusFrom       *string   `json:"status_from" gorm:"size:20"`
	StatusTo         string    `json:"status_to" gorm:"size:20;not null"`
	TxHash           *string   `json:"tx_hash" gorm:"size:66"`
	SendStatus       string    `json:"send_status" gorm:"size:20;not null;check:send_status IN ('success','failed')"`
	ErrorMessage     *string   `json:"error_message" gorm:"type:text"`
	RetryCount       int       `json:"retry_count" gorm:"not null;default:0"`
	SentAt           time.Time `json:"sent_at" gorm:"not null;autoCreateTime"`

	// 关联
	Email *Email `json:"email,omitempty" gorm:"foreignKey:EmailID"`
}

// TableName 设置表名
func (EmailSendLog) TableName() string {
	return "email_send_logs"
}

// UpdateEmailRemarkRequest 更新邮箱备注请求
type UpdateEmailRemarkRequest struct {
	Remark *string `json:"remark"`
}

// UpdateEmailRemarkWithIDRequest 更新邮箱备注（带ID）
type UpdateEmailRemarkWithIDRequest struct {
	ID     int64   `json:"id" binding:"required"`
	Remark *string `json:"remark"`
}

// SendVerificationCodeRequest 发送验证码请求
type SendVerificationCodeRequest struct {
	Email  string  `json:"email"`
	Remark *string `json:"remark"`
}

// VerifyEmailRequest 验证邮箱请求
type VerifyEmailRequest struct {
	Email string `json:"email"`
	Code  string `json:"code"`
}

// DeleteEmailRequest 删除邮箱请求
type DeleteEmailRequest struct {
	ID int64 `json:"id" binding:"required"`
}

// GetEmailsRequest 获取邮箱列表请求
type GetEmailsRequest struct {
	Page     int `json:"page" form:"page"`
	PageSize int `json:"page_size" form:"page_size"`
}

// UserEmailResponse 用户邮箱响应
type UserEmailResponse struct {
	ID             int64      `json:"id"`
	Email          string     `json:"email"`
	Remark         *string    `json:"remark"`
	IsVerified     bool       `json:"is_verified"`
	LastVerifiedAt *time.Time `json:"last_verified_at"`
	CreatedAt      time.Time  `json:"created_at"`
}

// EmailListResponse 邮箱列表响应
type EmailListResponse struct {
	Emails []UserEmailResponse `json:"emails"`
	Total  int64               `json:"total"`
}

// NotificationStatus 通知状态枚举
var NotificationStatus = struct {
	Waiting   string
	Ready     string
	Executed  string
	Cancelled string
	Expired   string
}{
	Waiting:   "waiting",
	Ready:     "ready",
	Executed:  "executed",
	Cancelled: "cancelled",
	Expired:   "expired",
}

// TimelockStandard Timelock标准枚举
var TimelockStandard = struct {
	Compound     string
	OpenZeppelin string
}{
	Compound:     "compound",
	OpenZeppelin: "openzeppelin",
}
