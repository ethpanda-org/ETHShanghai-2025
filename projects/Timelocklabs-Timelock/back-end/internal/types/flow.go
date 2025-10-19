package types

import "time"

// GetCompoundFlowListRequest 获取流程列表请求
type GetCompoundFlowListRequest struct {
	Status   *string `json:"status" form:"status"`       // 状态all, waiting, ready, executed, cancelled, expired
	Standard *string `json:"standard" form:"standard"`   // 标准compound, openzeppelin
	Page     int     `json:"page" form:"page"`           // 页码，默认为1
	PageSize int     `json:"page_size" form:"page_size"` // 每页大小，默认为10，最大100
}

// GetCompoundFlowListResponse 获取流程列表响应
type GetCompoundFlowListResponse struct {
	Flows []CompoundFlowResponse `json:"flows"` // 流程列表
	Total int64                  `json:"total"` // 总数
}

// CompoundFlowResponse 流程响应结构
type CompoundFlowResponse struct {
	ID                int64      `json:"id"`                           // ID
	FlowID            string     `json:"flow_id"`                      // 流程ID
	TimelockStandard  string     `json:"timelock_standard"`            // Timelock标准
	ChainID           int        `json:"chain_id"`                     // 链ID
	ContractAddress   string     `json:"contract_address"`             // 合约地址
	ContractRemark    string     `json:"contract_remark"`              // 合约备注
	Status            string     `json:"status"`                       // 状态
	QueueTxHash       *string    `json:"queue_tx_hash,omitempty"`      // 排队交易哈希
	ExecuteTxHash     *string    `json:"execute_tx_hash,omitempty"`    // 执行交易哈希
	CancelTxHash      *string    `json:"cancel_tx_hash,omitempty"`     // 取消交易哈希
	InitiatorAddress  *string    `json:"initiator_address,omitempty"`  // 发起者地址(FromAddress)
	TargetAddress     *string    `json:"target_address,omitempty"`     // 目标地址
	FunctionSignature *string    `json:"function_signature,omitempty"` // 函数签名
	CallDataHex       *string    `json:"call_data_hex,omitempty"`      // 调用数据
	Value             string     `json:"value"`                        // 价值
	Eta               *time.Time `json:"eta,omitempty"`                // 执行时间
	ExpiredAt         *time.Time `json:"expired_at,omitempty"`         // 过期时间
	ExecutedAt        *time.Time `json:"executed_at,omitempty"`        // 执行时间
	CancelledAt       *time.Time `json:"cancelled_at,omitempty"`       // 取消时间
	CreatedAt         time.Time  `json:"created_at"`                   // 创建时间
	UpdatedAt         time.Time  `json:"updated_at"`                   // 更新时间
}

type FlowStatusCount struct {
	Count     int64 `json:"count"`     // 总数
	Waiting   int64 `json:"waiting"`   // 等待中
	Ready     int64 `json:"ready"`     // 准备中
	Executed  int64 `json:"executed"`  // 已执行
	Cancelled int64 `json:"cancelled"` // 已取消
	Expired   int64 `json:"expired"`   // 已过期
}

type GetCompoundFlowListCountRequest struct {
	Standard *string `json:"standard" form:"standard"` // 标准compound
}

type GetCompoundFlowListCountResponse struct {
	FlowCount FlowStatusCount `json:"flow_count"` // 流程数量
}
