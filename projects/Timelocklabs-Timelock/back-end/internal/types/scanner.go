package types

import (
	"math/big"
	"time"
)

// BlockScanProgress 区块扫描进度模型
type BlockScanProgress struct {
	ID                 int64     `json:"id" gorm:"primaryKey;autoIncrement"`
	ChainID            int       `json:"chain_id" gorm:"not null;unique;index"`
	ChainName          string    `json:"chain_name" gorm:"size:50;not null"`
	LastScannedBlock   int64     `json:"last_scanned_block" gorm:"not null;default:0"`
	LatestNetworkBlock int64     `json:"latest_network_block" gorm:"default:0"`
	ScanStatus         string    `json:"scan_status" gorm:"size:20;not null;default:'running';index"`
	ErrorMessage       *string   `json:"error_message" gorm:"type:text"`
	LastUpdateTime     time.Time `json:"last_update_time" gorm:"default:CURRENT_TIMESTAMP"`
	CreatedAt          time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt          time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

// TableName 设置表名
func (BlockScanProgress) TableName() string {
	return "block_scan_progress"
}

// CompoundTimelockTransaction Compound Timelock 交易记录模型
type CompoundTimelockTransaction struct {
	ID                     int64     `json:"id" gorm:"primaryKey;autoIncrement"`
	TxHash                 string    `json:"tx_hash" gorm:"size:66;not null;index"`              // 交易哈希
	BlockNumber            int64     `json:"block_number" gorm:"not null;index"`                 // 区块高度
	BlockTimestamp         time.Time `json:"block_timestamp" gorm:"not null"`                    // 区块时间
	ChainID                int       `json:"chain_id" gorm:"not null;index"`                     // 链ID
	ChainName              string    `json:"chain_name" gorm:"size:50;not null"`                 // 链名称
	ContractAddress        string    `json:"contract_address" gorm:"size:42;not null;index"`     // 合约地址
	FromAddress            string    `json:"from_address" gorm:"size:42;not null;index"`         // 发起地址
	ToAddress              string    `json:"to_address" gorm:"size:42;not null"`                 // 接收地址
	TxStatus               string    `json:"tx_status" gorm:"size:20;not null;default:'failed'"` // 交易状态（success, failed）
	EventType              string    `json:"event_type" gorm:"size:50;not null;index"`           // 事件类型（QueueTransaction, ExecuteTransaction, CancelTransaction）
	EventData              string    `json:"event_data" gorm:"type:jsonb;not null"`              // 事件数据
	EventTxHash            *string   `json:"event_tx_hash" gorm:"size:128;index"`                // 事件交易哈希
	EventTarget            *string   `json:"event_target" gorm:"size:42"`                        // 事件目标地址
	EventValue             string    `json:"event_value" gorm:"type:decimal(200,0);default:0"`   // 事件价值
	EventFunctionSignature *string   `json:"event_function_signature" gorm:"size:200"`           // 事件函数签名
	EventCallData          []byte    `json:"event_call_data" gorm:"type:bytea"`                  // 事件调用参数数据
	EventEta               *int64    `json:"event_eta"`                                          // 事件ETA（预计执行时间）
	CreatedAt              time.Time `json:"created_at" gorm:"autoCreateTime"`                   // 创建时间
	UpdatedAt              time.Time `json:"updated_at" gorm:"autoUpdateTime"`                   // 更新时间
}

// TableName 设置表名
func (CompoundTimelockTransaction) TableName() string {
	return "compound_timelock_transactions"
}

// TimelockTransactionFlow Timelock 交易流程关联模型
type TimelockTransactionFlow struct {
	ID               int64      `json:"id" gorm:"primaryKey;autoIncrement"`
	FlowID           string     `json:"flow_id" gorm:"size:128;not null;index"`                 // 流程ID（Compound的是TxHash,OpenZeppelin的是EventID）
	TimelockStandard string     `json:"timelock_standard" gorm:"size:20;not null"`              // Timelock标准
	ChainID          int        `json:"chain_id" gorm:"not null;index"`                         // 链ID
	ContractAddress  string     `json:"contract_address" gorm:"size:42;not null;index"`         // 合约地址
	Status           string     `json:"status" gorm:"size:20;not null;default:'waiting';index"` // 流程状态（waiting提案等待中, ready提案能够执行了, executed执行完成了, cancelled取消, expired过期只有Compound有）
	ProposeTxHash    string     `json:"propose_tx_hash" gorm:"size:66;not null;index"`          // 提议交易哈希
	QueueTxHash      string     `json:"queue_tx_hash" gorm:"size:66;not null;index"`            // 队列交易哈希
	ExecuteTxHash    string     `json:"execute_tx_hash" gorm:"size:66;not null;index"`          // 执行交易哈希
	CancelTxHash     string     `json:"cancel_tx_hash" gorm:"size:66;not null;index"`           // 取消交易哈希
	InitiatorAddress *string    `json:"initiator_address" gorm:"size:42"`                       // 发起人地址（queue/schedule 交易的 from）
	QueuedAt         *time.Time `json:"queued_at"`                                              // 提议时间
	ExecutedAt       *time.Time `json:"executed_at"`                                            // 执行时间
	CancelledAt      *time.Time `json:"cancelled_at"`                                           // 取消时间
	Eta              *time.Time `json:"eta"`                                                    // 预计执行时间（Compound的是EventEta,OpenZeppelin的是BlockTimestamp+EventDelay）
	ExpiredAt        *time.Time `json:"expired_at"`                                             // 过期时间（Compound的有过期时间ETA+GracePeriod，OpenZeppelin没有）
	TargetAddress    *string    `json:"target_address" gorm:"size:42"`                          // 目标地址
	CallData         []byte     `json:"call_data" gorm:"type:bytea"`                            // 调用数据（包含函数签名和参数）
	Value            string     `json:"value" gorm:"type:decimal(200,0);default:0"`             // 价值
	CreatedAt        time.Time  `json:"created_at" gorm:"autoCreateTime"`                       // 创建时间
	UpdatedAt        time.Time  `json:"updated_at" gorm:"autoUpdateTime"`                       // 更新时间
}

// TableName 设置表名
func (TimelockTransactionFlow) TableName() string {
	return "timelock_transaction_flows"
}

// CompoundTimelockEvent Compound Timelock 事件结构
type CompoundTimelockEvent struct {
	EventType       string `json:"event_type"`       // QueueTransaction, ExecuteTransaction, CancelTransaction
	TxHash          string `json:"tx_hash"`          // 交易哈希
	BlockNumber     uint64 `json:"block_number"`     // 区块高度
	BlockTimestamp  uint64 `json:"block_timestamp"`  // 区块时间
	ContractAddress string `json:"contract_address"` // 合约地址
	ChainID         int    `json:"chain_id"`         // 链ID
	ChainName       string `json:"chain_name"`       // 链名称
	FromAddress     string `json:"from_address"`     // 发起地址
	ToAddress       string `json:"to_address"`       // 接收地址
	TxStatus        string `json:"tx_status"`        // 交易状态（success, failed）
	EventData       string `json:"event_data"`       // 事件数据

	// QueueTransaction / ExecuteTransaction / CancelTransaction
	// bytes32 indexed txHash, address indexed target, uint value, string signature,  bytes data, uint eta
	EventTxHash            *string `json:"event_tx_hash"`            // 事件交易哈希
	EventTarget            *string `json:"event_target"`             // 事件目标地址
	EventValue             string  `json:"event_value"`              // 事件价值
	EventFunctionSignature *string `json:"event_function_signature"` // 事件函数签名
	EventCallData          []byte  `json:"event_call_data"`          // 事件调用参数数据
	EventEta               *int64  `json:"event_eta"`                // 事件ETA（预计执行时间）
}

// 实现TimelockEvent接口
func (e *CompoundTimelockEvent) GetEventType() string {
	return e.EventType
}

func (e *CompoundTimelockEvent) GetContractAddress() string {
	return e.ContractAddress
}

func (e *CompoundTimelockEvent) GetTxHash() string {
	return e.TxHash
}

func (e *CompoundTimelockEvent) GetBlockNumber() uint64 {
	return e.BlockNumber
}

// CompoundTimelockInfo Compound Timelock 合约信息
type CompoundTimelockInfo struct {
	GRACE_PERIOD  *big.Int `json:"grace_period"`  // 宽限期
	MINIMUM_DELAY *big.Int `json:"minimum_delay"` // 最小延迟
	MAXIMUM_DELAY *big.Int `json:"maximum_delay"` // 最大延迟
	Admin         string   `json:"admin"`         // 当前管理员
	PendingAdmin  *string  `json:"pending_admin"` // 待定管理员
	Delay         *big.Int `json:"delay"`         // 当前延迟
}

// RescanRequest 重扫请求
type RescanRequest struct {
	ChainID     int     `json:"chain_id" binding:"required"`   // 链ID
	FromBlock   uint64  `json:"from_block" binding:"required"` // 开始区块
	ToBlock     *uint64 `json:"to_block,omitempty"`            // 结束区块(空表示扫到最新)
	ForceRescan bool    `json:"force_rescan"`                  // 是否强制重扫已扫描的区块
}

// RescanResponse 重扫响应
type RescanResponse struct {
	TaskID    string  `json:"task_id"`    // 任务ID
	ChainID   int     `json:"chain_id"`   // 链ID
	FromBlock uint64  `json:"from_block"` // 开始区块
	ToBlock   *uint64 `json:"to_block"`   // 结束区块(空表示扫到最新)
	Status    string  `json:"status"`     // 任务状态(success, failed)
}

// ScannerStatus 扫链状态枚举
const (
	ScanStatusRunning = "running"
	ScanStatusPaused  = "paused"
	ScanStatusError   = "error"
)

// Event Type 事件类型枚举
const (
	// Compound Timelock Events
	EventQueueTransaction   = "QueueTransaction"
	EventExecuteTransaction = "ExecuteTransaction"
	EventCancelTransaction  = "CancelTransaction"

	// OpenZeppelin Timelock Events
	EventCallScheduled = "CallScheduled"
	EventCallExecuted  = "CallExecuted"
	EventCancelled     = "Cancelled"
)

// Relation Type 关联类型枚举
const (
	RelationCreator      = "creator"
	RelationAdmin        = "admin"
	RelationPendingAdmin = "pending_admin"
	RelationProposer     = "proposer"
	RelationExecutor     = "executor"
	RelationCanceller    = "canceller"
)
