package types

import (
	"html/template"
	"time"
)

// NotificationChannel 通知通道类型
type NotificationChannel string

const (
	ChannelTelegram NotificationChannel = "telegram"
	ChannelLark     NotificationChannel = "lark"
	ChannelFeishu   NotificationChannel = "feishu"
)

// TelegramConfig Telegram通知配置
type TelegramConfig struct {
	ID          uint      `json:"id" gorm:"primaryKey"`                       // ID
	UserAddress string    `json:"user_address" gorm:"not null;index;size:42"` // 用户地址
	Name        string    `json:"name" gorm:"size:100"`                       // 名称
	BotToken    string    `json:"bot_token" gorm:"not null;size:500"`         // 机器人token
	ChatID      string    `json:"chat_id" gorm:"not null;size:100"`           // 聊天ID
	IsActive    bool      `json:"is_active" gorm:"default:true"`              // 是否激活
	CreatedAt   time.Time `json:"created_at"`                                 // 创建时间
	UpdatedAt   time.Time `json:"updated_at"`                                 // 更新时间
}

func (TelegramConfig) TableName() string {
	return "telegram_configs"
}

// LarkConfig Lark通知配置
type LarkConfig struct {
	ID          uint      `json:"id" gorm:"primaryKey"`                       // ID
	UserAddress string    `json:"user_address" gorm:"not null;index;size:42"` // 用户地址
	Name        string    `json:"name" gorm:"size:100"`                       // 名称
	WebhookURL  string    `json:"webhook_url" gorm:"not null;size:1000"`      // 网络钩子URL
	Secret      string    `json:"secret" gorm:"size:500"`                     // 签名验证时的密钥
	IsActive    bool      `json:"is_active" gorm:"default:true"`              // 是否激活
	CreatedAt   time.Time `json:"created_at"`                                 // 创建时间
	UpdatedAt   time.Time `json:"updated_at"`                                 // 更新时间
}

func (LarkConfig) TableName() string {
	return "lark_configs"
}

// FeishuConfig Feishu通知配置
type FeishuConfig struct {
	ID          uint      `json:"id" gorm:"primaryKey"`                       // ID
	UserAddress string    `json:"user_address" gorm:"not null;index;size:42"` // 用户地址
	Name        string    `json:"name" gorm:"size:100"`                       // 名称
	WebhookURL  string    `json:"webhook_url" gorm:"not null;size:1000"`      // 网络钩子URL
	Secret      string    `json:"secret" gorm:"size:500"`                     // 签名验证时的密钥
	IsActive    bool      `json:"is_active" gorm:"default:true"`              // 是否激活
	CreatedAt   time.Time `json:"created_at"`                                 // 创建时间
	UpdatedAt   time.Time `json:"updated_at"`                                 // 更新时间
}

func (FeishuConfig) TableName() string {
	return "feishu_configs"
}

// NotificationLog 通知发送日志
type NotificationLog struct {
	ID               uint                `json:"id" gorm:"primaryKey"`
	UserAddress      string              `json:"user_address" gorm:"not null;index;size:42"` // 用户地址
	Channel          NotificationChannel `json:"channel" gorm:"not null;size:20"`            // 通道
	ConfigID         uint                `json:"config_id" gorm:"not null"`                  // 配置ID
	FlowID           string              `json:"flow_id" gorm:"not null;index;size:128"`     // 流程ID
	TimelockStandard string              `json:"timelock_standard" gorm:"not null;size:20"`  // 时间锁标准
	ChainID          int                 `json:"chain_id" gorm:"not null"`                   // 链ID
	ContractAddress  string              `json:"contract_address" gorm:"not null;size:42"`   // 合约地址
	StatusFrom       string              `json:"status_from" gorm:"size:20"`                 // 状态从
	StatusTo         string              `json:"status_to" gorm:"not null;size:20"`          // 状态到
	TxHash           string              `json:"tx_hash" gorm:"size:66"`                     // 交易哈希
	SendStatus       string              `json:"send_status" gorm:"not null;size:20"`        // 发送状态
	ErrorMessage     string              `json:"error_message" gorm:"type:text"`             // 错误消息
	SentAt           time.Time           `json:"sent_at"`                                    // 发送时间
}

func (NotificationLog) TableName() string {
	return "notification_logs"
}

// NotificationConfig 通用通知配置
type NotificationConfig struct {
	// 通用
	ID          uint      `json:"id"`
	UserAddress string    `json:"user_address"`
	Name        string    `json:"name"`
	Channel     string    `json:"channel"` // telegram / lark / feishu
	IsActive    bool      `json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	// 可选字段，不同渠道用不同
	BotToken   *string `json:"bot_token,omitempty"`
	ChatID     *string `json:"chat_id,omitempty"`
	WebhookURL *string `json:"webhook_url,omitempty"`
	Secret     *string `json:"secret,omitempty"`
}

// CreateNotificationRequest 创建通知通用请求
type CreateNotificationRequest struct {
	// 通用
	Name    string `json:"name" binding:"required"`    // 名称
	Channel string `json:"channel" binding:"required"` // 渠道,telegram,lark,feishu
	// telegram
	BotToken string `json:"bot_token"` // 机器人token
	ChatID   string `json:"chat_id"`   // 聊天ID
	// lark feishu
	WebhookURL string `json:"webhook_url"` // 网络钩子URL
	Secret     string `json:"secret"`      // 签名验证时的密钥
}

// UpdateNotificationRequest 更新通知通用请求
type UpdateNotificationRequest struct {
	// 通用
	Name     *string `json:"name" binding:"required"`    // 名称
	Channel  *string `json:"channel" binding:"required"` // 渠道,telegram,lark,feishu
	IsActive *bool   `json:"is_active"`                  // 是否激活
	// telegram
	BotToken *string `json:"bot_token"` // 机器人token
	ChatID   *string `json:"chat_id"`   // 聊天ID
	// lark feishu
	WebhookURL *string `json:"webhook_url"` // 网络钩子URL
	Secret     *string `json:"secret"`      // 签名验证时的密钥
}

// DeleteNotificationRequest 删除通知通用请求
type DeleteNotificationRequest struct {
	// 通用
	Name    string `json:"name" binding:"required"`    // 名称
	Channel string `json:"channel" binding:"required"` // 渠道,telegram,lark,feishu
}

// UserNotificationConfigs 用户通知配置集合
type UserNotificationConfigs struct {
	TelegramConfigs []*TelegramConfig `json:"telegram_configs"`
	LarkConfigs     []*LarkConfig     `json:"lark_configs"`
	FeishuConfigs   []*FeishuConfig   `json:"feishu_configs"`
}

// NotificationConfigListResponse 通知配置列表响应
type NotificationConfigListResponse struct {
	TelegramConfigs []*TelegramConfig `json:"telegram_configs"`
	LarkConfigs     []*LarkConfig     `json:"lark_configs"`
	FeishuConfigs   []*FeishuConfig   `json:"feishu_configs"`
}

type CalldataParam struct {
	Name  string `json:"name"`  // param[0],param[1]...
	Type  string `json:"type"`  // address,bool,uint256,int256,uint64,int64,uint8,int8,string,bytes...
	Value string `json:"value"` // 值
}

type NotificationData struct {
	BgColorFrom    template.CSS    `json:"bg_color_from"`
	TextColorFrom  template.CSS    `json:"text_color_from"`
	StatusFrom     string          `json:"status_from"`
	BgColorTo      template.CSS    `json:"bg_color_to"`
	TextColorTo    template.CSS    `json:"text_color_to"`
	StatusTo       string          `json:"status_to"`
	Standard       string          `json:"standard"`
	Network        string          `json:"network"`
	Contract       string          `json:"contract"`
	Remark         string          `json:"remark"`
	Caller         string          `json:"caller"`
	Target         string          `json:"target"`
	Value          string          `json:"value"`
	Function       string          `json:"function"`
	CalldataParams []CalldataParam `json:"calldata_params"`
	TxUrl          string          `json:"tx_url"`
	TxHash         string          `json:"tx_hash"`
	DashboardUrl   string          `json:"dashboard_url"`
}
