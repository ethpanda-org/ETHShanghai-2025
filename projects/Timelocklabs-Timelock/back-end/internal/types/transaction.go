package types

import "time"

// GetTransactionDetailRequest 获取交易详情请求
type GetTransactionDetailRequest struct {
	Standard string `json:"standard" form:"standard" binding:"required,oneof=compound openzeppelin"` // 标准
	TxHash   string `json:"tx_hash" form:"tx_hash" binding:"required"`                               // 交易哈希
}

// GetTransactionDetailResponse 获取交易详情响应
type GetTransactionDetailResponse struct {
	Detail CompoundTimelockTransactionDetail `json:"detail"` // 交易详情
}

// CompoundTimelockTransactionDetail 交易详情
type CompoundTimelockTransactionDetail struct {
	TxHash                 string    `json:"tx_hash"`                  // 交易哈希
	BlockNumber            int64     `json:"block_number"`             // 区块高度
	BlockTimestamp         time.Time `json:"block_timestamp"`          // 区块时间
	ChainID                int       `json:"chain_id"`                 // 链ID
	ChainName              string    `json:"chain_name"`               // 链名称
	ContractAddress        string    `json:"contract_address"`         // 合约地址
	FromAddress            string    `json:"from_address"`             // 发起地址
	ToAddress              string    `json:"to_address"`               // 接收地址
	TxStatus               string    `json:"tx_status"`                // 交易状态（success, failed）
	EventFunctionSignature *string   `json:"event_function_signature"` // 事件函数签名
	EventCallData          []byte    `json:"event_call_data"`          // 事件调用参数数据
	EventEta               *int64    `json:"event_eta"`                // 事件ETA（预计执行时间）
	EventTarget            *string   `json:"event_target"`             // 事件目标地址
	EventValue             string    `json:"event_value"`              // 事件价值
	EventTxHash            *string   `json:"event_tx_hash"`            // 事件交易哈希
}
