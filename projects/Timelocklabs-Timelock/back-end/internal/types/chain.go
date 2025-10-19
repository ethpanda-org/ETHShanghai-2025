package types

import (
	"time"
)

// SupportChain 支持的区块链模型（重构版）
type SupportChain struct {
	ID                     int64     `json:"id" gorm:"primaryKey;autoIncrement"`
	ChainName              string    `json:"chain_name" gorm:"size:50;not null;unique"`           // Covalent API的chainName
	DisplayName            string    `json:"display_name" gorm:"size:100;not null"`               // 显示名称
	ChainID                int64     `json:"chain_id" gorm:"not null"`                            // 链ID
	NativeCurrencyName     string    `json:"native_currency_name" gorm:"size:50;not null"`        // 原生货币名称
	NativeCurrencySymbol   string    `json:"native_currency_symbol" gorm:"size:10;not null"`      // 原生货币符号
	NativeCurrencyDecimals int       `json:"native_currency_decimals" gorm:"not null;default:18"` // 原生货币精度
	LogoURL                string    `json:"logo_url" gorm:"type:text"`                           // 链Logo URL
	IsTestnet              bool      `json:"is_testnet" gorm:"not null;default:false"`            // 是否是测试网
	IsActive               bool      `json:"is_active" gorm:"not null;default:true"`              // 是否激活
	AlchemyRPCTemplate     string    `json:"alchemy_rpc_template" gorm:"type:text"`               // Alchemy RPC URL模板
	InfuraRPCTemplate      string    `json:"infura_rpc_template" gorm:"type:text"`                // Infura RPC URL模板
	OfficialRPCUrls        string    `json:"official_rpc_urls" gorm:"type:text;not null"`         // 官方RPC URLs (JSON数组)
	BlockExplorerUrls      string    `json:"block_explorer_urls" gorm:"type:text;not null"`       // 区块浏览器URLs (JSON数组)
	RPCEnabled             bool      `json:"rpc_enabled" gorm:"not null;default:true"`            // 是否启用RPC功能
	CreatedAt              time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt              time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

// SupportChainResponse 支持链对外响应结构（将字符串JSON字段转换为更易用的类型）
type SupportChainResponse struct {
	ID                     int64    `json:"id"`
	ChainName              string   `json:"chain_name"`
	DisplayName            string   `json:"display_name"`
	ChainID                int64    `json:"chain_id"`
	NativeCurrencyName     string   `json:"native_currency_name"`
	NativeCurrencySymbol   string   `json:"native_currency_symbol"`
	NativeCurrencyDecimals int      `json:"native_currency_decimals"`
	LogoURL                string   `json:"logo_url"`
	IsTestnet              bool     `json:"is_testnet"`
	IsActive               bool     `json:"is_active"`
	AlchemyRPCTemplate     string   `json:"alchemy_rpc_template"`
	InfuraRPCTemplate      string   `json:"infura_rpc_template"`
	OfficialRPCUrls        []string `json:"official_rpc_urls"`
	// 返回单个区块浏览器URL（取第一个），字段名保持不变以兼容前端
	BlockExplorerUrls string `json:"block_explorer_urls"`
	RPCEnabled        bool   `json:"rpc_enabled"`
}

// TableName 设置表名
func (SupportChain) TableName() string {
	return "support_chains"
}

// WalletChainConfig 钱包插件添加链的配置数据
type WalletChainConfig struct {
	ChainID           string               `json:"chainId"`
	ChainName         string               `json:"chainName"`
	NativeCurrency    NativeCurrencyConfig `json:"nativeCurrency"`
	RPCUrls           []string             `json:"rpcUrls"`
	BlockExplorerUrls string               `json:"blockExplorerUrls"`
}

// NativeCurrencyConfig 原生货币配置
type NativeCurrencyConfig struct {
	Name     string `json:"name"`
	Symbol   string `json:"symbol"`
	Decimals int    `json:"decimals"`
}

// GetSupportChainsRequest 获取支持链列表请求
type GetSupportChainsRequest struct {
	IsTestnet *bool `json:"is_testnet" form:"is_testnet"` // 筛选测试网/主网
	IsActive  *bool `json:"is_active" form:"is_active"`   // 筛选激活状态
}

// GetSupportChainsResponse 获取支持链列表响应
type GetSupportChainsResponse struct {
	Chains []SupportChainResponse `json:"chains"`
	Total  int64                  `json:"total"`
}

// GetChainByIDRequest 根据ID获取链信息请求
type GetChainByIDRequest struct {
	ID int64 `json:"id" form:"id" binding:"required"`
}

// GetChainByChainIDRequest 根据ChainID获取链信息请求
type GetChainByChainIDRequest struct {
	ChainID int64 `json:"chain_id" form:"chain_id" binding:"required"`
}

// GetWalletChainConfigRequest 获取钱包配置请求
type GetWalletChainConfigRequest struct {
	ChainID int64 `json:"chain_id" binding:"required"`
}

// ChainRPCInfo 链的RPC信息（从数据库获取）
type ChainRPCInfo struct {
	ChainName          string  `json:"chain_name" db:"chain_name"`
	DisplayName        string  `json:"display_name" db:"display_name"`
	ChainID            int     `json:"chain_id" db:"chain_id"`
	AlchemyRPCTemplate *string `json:"alchemy_rpc_template" db:"alchemy_rpc_template"`
	OfficialRPCUrls    string  `json:"official_rpc_urls" db:"official_rpc_urls"`
	RPCEnabled         bool    `json:"rpc_enabled" db:"rpc_enabled"`
	IsTestnet          bool    `json:"is_testnet" db:"is_testnet"`
}
