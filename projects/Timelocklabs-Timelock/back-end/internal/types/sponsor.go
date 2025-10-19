package types

import (
	"time"
)

// SponsorType 赞助方类型
type SponsorType string

const (
	SponsorTypePartner SponsorType = "partner" // 生态伙伴
	SponsorTypeSponsor SponsorType = "sponsor" // 赞助方
)

// Sponsor 赞助方和生态伙伴模型
type Sponsor struct {
	ID          int64       `json:"id" gorm:"primaryKey;autoIncrement"`
	Name        string      `json:"name" gorm:"size:200;not null"`          // 名称
	LogoURL     string      `json:"logo_url" gorm:"type:text;not null"`     // Logo URL
	Link        string      `json:"link" gorm:"type:text;not null"`         // 链接
	Description string      `json:"description" gorm:"type:text;not null"`  // 英文介绍
	Type        SponsorType `json:"type" gorm:"size:20;not null"`           // 类型：sponsor/partner
	SortOrder   int         `json:"sort_order" gorm:"not null;default:0"`   // 排序权重，数值越大越靠前
	IsActive    bool        `json:"is_active" gorm:"not null;default:true"` // 是否激活
	CreatedAt   time.Time   `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt   time.Time   `json:"updated_at" gorm:"autoUpdateTime"`
}

// TableName 设置表名
func (Sponsor) TableName() string {
	return "sponsors"
}

// CreateSponsorRequest 创建赞助方请求
type CreateSponsorRequest struct {
	Name        string      `json:"name" binding:"required,max=200"`
	LogoURL     string      `json:"logo_url" binding:"required,url"`
	Link        string      `json:"link" binding:"required,url"`
	Description string      `json:"description" binding:"required,max=1000"`
	Type        SponsorType `json:"type" binding:"required,oneof=sponsor partner"`
	SortOrder   int         `json:"sort_order"`
}

// UpdateSponsorRequest 更新赞助方请求
type UpdateSponsorRequest struct {
	Name        *string      `json:"name,omitempty" binding:"omitempty,max=200"`
	LogoURL     *string      `json:"logo_url,omitempty" binding:"omitempty,url"`
	Link        *string      `json:"link,omitempty" binding:"omitempty,url"`
	Description *string      `json:"description,omitempty" binding:"omitempty,max=1000"`
	Type        *SponsorType `json:"type,omitempty" binding:"omitempty,oneof=sponsor partner"`
	SortOrder   *int         `json:"sort_order,omitempty"`
	IsActive    *bool        `json:"is_active,omitempty"`
}

// GetSponsorsRequest 获取赞助方列表请求
type GetSponsorsRequest struct {
	Type     *SponsorType `json:"type" form:"type" binding:"omitempty,oneof=sponsor partner"`
	IsActive *bool        `json:"is_active" form:"is_active"`
	Page     int          `json:"page" form:"page" binding:"omitempty,min=1"`
	PageSize int          `json:"page_size" form:"page_size" binding:"omitempty,min=1,max=100"`
}

// GetSponsorsResponse 获取赞助方列表响应
type GetSponsorsResponse struct {
	Sponsors []Sponsor `json:"sponsors"`
	Total    int64     `json:"total"`
	Page     int       `json:"page"`
	PageSize int       `json:"page_size"`
}

// SponsorInfo 赞助方信息（公开接口使用）
type SponsorInfo struct {
	ID          int64       `json:"id"`
	Name        string      `json:"name"`
	LogoURL     string      `json:"logo_url"`
	Link        string      `json:"link"`
	Description string      `json:"description"`
	Type        SponsorType `json:"type"`
	SortOrder   int         `json:"sort_order"`
}

// GetPublicSponsorsResponse 公开的赞助方列表响应
type GetPublicSponsorsResponse struct {
	Sponsors []SponsorInfo `json:"sponsors"`
	Partners []SponsorInfo `json:"partners"`
}
