package scanner

import (
	"context"
	"fmt"
	"strings"
	"time"
	"timelock-backend/internal/types"
	"timelock-backend/pkg/logger"

	"gorm.io/gorm"
)

// FlowRepository 流程管理仓库接口
type FlowRepository interface {
	CreateFlow(ctx context.Context, flow *types.TimelockTransactionFlow) error
	GetFlowByID(ctx context.Context, flowID, timelockStandard string, chainID int, contractAddress string) (*types.TimelockTransactionFlow, error)
	UpdateFlow(ctx context.Context, flow *types.TimelockTransactionFlow) error

	// 状态管理相关方法
	GetWaitingFlowsDue(ctx context.Context, now time.Time, limit int) ([]types.TimelockTransactionFlow, error)
	GetCompoundFlowsExpired(ctx context.Context, now time.Time, limit int) ([]types.TimelockTransactionFlow, error)
	UpdateFlowStatus(ctx context.Context, flowID, timelockStandard string, chainID int, contractAddress string, fromStatus, toStatus string) error
	BatchUpdateFlowStatus(ctx context.Context, flows []types.TimelockTransactionFlow, toStatus string) error

	// API查询方法
	GetUserRelatedCompoundFlows(ctx context.Context, userAddress string, status *string, standard *string, offset int, limit int) ([]types.TimelockTransactionFlow, int64, error)
	GetUserRelatedCompoundFlowsCount(ctx context.Context, userAddress string, standard *string) (*types.FlowStatusCount, error)
	GetCompoundTransactionDetail(ctx context.Context, standard string, txHash string) (*types.CompoundTimelockTransactionDetail, error)
	GetCompoundQueueTransactionFunctionSignature(ctx context.Context, queueTxHash string, contractAddress string) (*string, error)

	// GRACE_PERIOD相关方法
	RefreshCompoundFlowsExpiredAt(ctx context.Context, chainID int, contractAddress string, gracePeriodSeconds int64) (int64, error)
}

type flowRepository struct {
	db *gorm.DB
}

// NewFlowRepository 创建新的流程管理仓库
func NewFlowRepository(db *gorm.DB) FlowRepository {
	return &flowRepository{
		db: db,
	}
}

// CreateFlow 创建交易流程记录
func (r *flowRepository) CreateFlow(ctx context.Context, flow *types.TimelockTransactionFlow) error {
	if err := r.db.WithContext(ctx).Create(flow).Error; err != nil {
		logger.Error("CreateFlow Error", err, "flow_id", flow.FlowID, "standard", flow.TimelockStandard)
		return err
	}

	return nil
}

// GetFlowByID 根据流程ID获取交易流程
func (r *flowRepository) GetFlowByID(ctx context.Context, flowID, timelockStandard string, chainID int, contractAddress string) (*types.TimelockTransactionFlow, error) {
	var flow types.TimelockTransactionFlow
	normalizedContractAddress := strings.ToLower(contractAddress)
	err := r.db.WithContext(ctx).
		Where("flow_id = ? AND timelock_standard = ? AND chain_id = ? AND LOWER(contract_address) = ?",
			flowID, timelockStandard, chainID, normalizedContractAddress).
		First(&flow).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		logger.Error("GetFlowByID Error", err, "flow_id", flowID)
		return nil, err
	}

	return &flow, nil
}

// UpdateFlow 更新交易流程
func (r *flowRepository) UpdateFlow(ctx context.Context, flow *types.TimelockTransactionFlow) error {
	if err := r.db.WithContext(ctx).Save(flow).Error; err != nil {
		logger.Error("UpdateFlow Error", err, "flow_id", flow.FlowID)
		return err
	}

	return nil
}

// GetWaitingFlowsDue 获取等待中但ETA已到的流程
func (r *flowRepository) GetWaitingFlowsDue(ctx context.Context, now time.Time, limit int) ([]types.TimelockTransactionFlow, error) {
	var flows []types.TimelockTransactionFlow
	query := r.db.WithContext(ctx).
		Where("status = ? AND eta IS NOT NULL AND eta <= ?", "waiting", now).
		Order("eta ASC")

	if limit > 0 {
		query = query.Limit(limit)
	}

	err := query.Find(&flows).Error
	if err != nil {
		logger.Error("GetWaitingFlowsDue Error", err, "now", now, "limit", limit)
		return nil, err
	}

	return flows, nil
}

// GetCompoundFlowsExpired 获取Compound中已过期的流程
func (r *flowRepository) GetCompoundFlowsExpired(ctx context.Context, now time.Time, limit int) ([]types.TimelockTransactionFlow, error) {
	var flows []types.TimelockTransactionFlow
	query := r.db.WithContext(ctx).
		Where("timelock_standard = ? AND status IN (?) AND expired_at IS NOT NULL AND expired_at <= ?",
			"compound", []string{"waiting", "ready"}, now).
		Order("expired_at ASC")

	if limit > 0 {
		query = query.Limit(limit)
	}

	err := query.Find(&flows).Error
	if err != nil {
		logger.Error("GetCompoundFlowsExpired Error", err, "now", now, "limit", limit)
		return nil, err
	}

	return flows, nil
}

// UpdateFlowStatus 更新单个流程状态
func (r *flowRepository) UpdateFlowStatus(ctx context.Context, flowID, timelockStandard string, chainID int, contractAddress string, fromStatus, toStatus string) error {
	normalizedContractAddress := strings.ToLower(contractAddress)
	result := r.db.WithContext(ctx).
		Model(&types.TimelockTransactionFlow{}).
		Where("flow_id = ? AND timelock_standard = ? AND chain_id = ? AND LOWER(contract_address) = ? AND status = ?",
			flowID, timelockStandard, chainID, normalizedContractAddress, fromStatus).
		Update("status", toStatus)

	if result.Error != nil {
		logger.Error("UpdateFlowStatus Error", result.Error, "flow_id", flowID, "from", fromStatus, "to", toStatus)
		return result.Error
	}

	if result.RowsAffected == 0 {
		logger.Warn("UpdateFlowStatus: No rows affected", "flow_id", flowID, "from", fromStatus, "to", toStatus)
	}

	return nil
}

// BatchUpdateFlowStatus 批量更新流程状态
func (r *flowRepository) BatchUpdateFlowStatus(ctx context.Context, flows []types.TimelockTransactionFlow, toStatus string) error {
	if len(flows) == 0 {
		return nil
	}

	// 构建WHERE条件：(flow_id = ? AND timelock_standard = ? AND chain_id = ? AND contract_address = ?) OR ...
	var conditions []string
	var args []interface{}

	for _, flow := range flows {
		normalizedContractAddress := strings.ToLower(flow.ContractAddress)
		conditions = append(conditions, "(flow_id = ? AND timelock_standard = ? AND chain_id = ? AND LOWER(contract_address) = ?)")
		args = append(args, flow.FlowID, flow.TimelockStandard, flow.ChainID, normalizedContractAddress)
	}

	whereClause := "(" + strings.Join(conditions, " OR ") + ")"

	result := r.db.WithContext(ctx).
		Model(&types.TimelockTransactionFlow{}).
		Where(whereClause, args...).
		Update("status", toStatus)

	if result.Error != nil {
		logger.Error("BatchUpdateFlowStatus Error", result.Error, "count", len(flows), "to_status", toStatus)
		return result.Error
	}

	logger.Info("BatchUpdateFlowStatus completed", "updated", result.RowsAffected, "to_status", toStatus)
	return nil
}

// GetUserRelatedCompoundFlows 获取与用户相关的流程列表
func (r *flowRepository) GetUserRelatedCompoundFlows(ctx context.Context, userAddress string, status *string, standard *string, offset int, limit int) ([]types.TimelockTransactionFlow, int64, error) {
	normalizedUserAddress := strings.ToLower(userAddress)

	// 构建查询条件
	query := r.db.WithContext(ctx).Model(&types.TimelockTransactionFlow{})

	// 构建WHERE条件，包含两种情况：
	// 1. initiator_address是该地址
	// 2. 该flow的合约中，该地址是管理员或有权限的用户
	whereConditions := []string{}
	args := []interface{}{}

	// 第一种情况：initiator_address是该地址
	whereConditions = append(whereConditions, "LOWER(initiator_address) = ?")
	args = append(args, normalizedUserAddress)

	// 第二种情况：根据合约权限查询
	// 需要联表查询compound_timelocks和openzeppelin_timelocks

	// Compound权限查询：admin或pending_admin
	compoundCondition := `(
		timelock_standard = 'compound' AND 
		(chain_id, contract_address) IN (
			SELECT chain_id, contract_address FROM compound_timelocks 
			WHERE LOWER(admin) = ? OR LOWER(pending_admin) = ?
		)
	)`
	whereConditions = append(whereConditions, compoundCondition)
	args = append(args, normalizedUserAddress, normalizedUserAddress)

	// 组合所有条件
	finalWhere := "(" + strings.Join(whereConditions, " OR ") + ")"

	// 添加状态过滤
	if status != nil && *status != "all" {
		finalWhere += " AND status = ?"
		args = append(args, *status)
	}

	// 添加标准过滤
	if standard != nil {
		finalWhere += " AND timelock_standard = ?"
		args = append(args, *standard)
	}

	// 计算总数
	var total int64
	if err := query.Where(finalWhere, args...).Count(&total).Error; err != nil {
		logger.Error("GetUserRelatedCompoundFlows Count Error", err, "user", userAddress)
		return nil, 0, err
	}

	// 获取数据
	var flows []types.TimelockTransactionFlow
	dataQuery := r.db.WithContext(ctx).
		Where(finalWhere, args...).
		Order("created_at DESC")

	if limit > 0 {
		dataQuery = dataQuery.Offset(offset).Limit(limit)
	}

	err := dataQuery.Find(&flows).Error

	if err != nil {
		logger.Error("GetUserRelatedCompoundFlows Error", err, "user", userAddress)
		return nil, 0, err
	}

	return flows, total, nil
}

// GetUserRelatedCompoundFlowsCount 获取与用户相关的流程数量统计
func (r *flowRepository) GetUserRelatedCompoundFlowsCount(ctx context.Context, userAddress string, standard *string) (*types.FlowStatusCount, error) {
	normalizedUserAddress := strings.ToLower(userAddress)

	// 构建基础查询条件，复用GetUserRelatedCompoundFlows的逻辑
	query := r.db.WithContext(ctx).Model(&types.TimelockTransactionFlow{})

	// 构建WHERE条件，包含两种情况：
	// 1. initiator_address是该地址
	// 2. 该flow的合约中，该地址是管理员或有权限的用户
	whereConditions := []string{}
	args := []interface{}{}

	// 第一种情况：initiator_address是该地址
	whereConditions = append(whereConditions, "LOWER(initiator_address) = ?")
	args = append(args, normalizedUserAddress)

	// 第二种情况：根据合约权限查询
	// Compound权限查询：admin或pending_admin
	compoundCondition := `(
		timelock_standard = 'compound' AND 
		(chain_id, contract_address) IN (
			SELECT chain_id, contract_address FROM compound_timelocks 
			WHERE LOWER(admin) = ? OR LOWER(pending_admin) = ?
		)
	)`
	whereConditions = append(whereConditions, compoundCondition)
	args = append(args, normalizedUserAddress, normalizedUserAddress)

	// 组合所有条件
	finalWhere := "(" + strings.Join(whereConditions, " OR ") + ")"

	// 添加标准过滤
	if standard != nil {
		finalWhere += " AND timelock_standard = ?"
		args = append(args, *standard)
	}

	// 统计各个状态的数量
	var result types.FlowStatusCount

	// 总数
	if err := query.Where(finalWhere, args...).Count(&result.Count).Error; err != nil {
		logger.Error("GetUserRelatedCompoundFlowsCount Total Error", err, "user", userAddress)
		return nil, err
	}

	// 各状态数量统计
	statusCounts := map[string]*int64{
		"waiting":   &result.Waiting,
		"ready":     &result.Ready,
		"executed":  &result.Executed,
		"cancelled": &result.Cancelled,
		"expired":   &result.Expired,
	}

	for status, count := range statusCounts {
		statusWhere := finalWhere + " AND status = ?"
		statusArgs := append(args, status)

		if err := query.Where(statusWhere, statusArgs...).Count(count).Error; err != nil {
			logger.Error("GetUserRelatedCompoundFlowsCount Status Error", err, "user", userAddress, "status", status)
			return nil, err
		}
	}

	return &result, nil
}

// GetTransactionDetail 获取交易详情
func (r *flowRepository) GetCompoundTransactionDetail(ctx context.Context, standard string, txHash string) (*types.CompoundTimelockTransactionDetail, error) {
	var detail types.CompoundTimelockTransactionDetail

	if standard == "compound" {
		// 查询compound交易表
		var tx types.CompoundTimelockTransaction
		err := r.db.WithContext(ctx).
			Where("tx_hash = ?", txHash).
			First(&tx).Error

		if err != nil {
			if err == gorm.ErrRecordNotFound {
				return nil, nil
			}
			logger.Error("GetTransactionDetail Compound Error", err, "tx_hash", txHash)
			return nil, err
		}

		// 转换为统一格式
		detail = types.CompoundTimelockTransactionDetail{
			TxHash:                 tx.TxHash,
			BlockNumber:            tx.BlockNumber,
			BlockTimestamp:         tx.BlockTimestamp,
			ChainID:                tx.ChainID,
			ChainName:              tx.ChainName,
			ContractAddress:        tx.ContractAddress,
			FromAddress:            tx.FromAddress,
			ToAddress:              tx.ToAddress,
			TxStatus:               tx.TxStatus,
			EventFunctionSignature: tx.EventFunctionSignature,
			EventCallData:          tx.EventCallData,
			EventEta:               tx.EventEta,
			EventTarget:            tx.EventTarget,
			EventValue:             tx.EventValue,
			EventTxHash:            tx.EventTxHash,
		}

	}
	return &detail, nil
}

// GetCompoundQueueTransactionFunctionSignature 获取Compound队列交易的函数签名
func (r *flowRepository) GetCompoundQueueTransactionFunctionSignature(ctx context.Context, flowID string, contractAddress string) (*string, error) {
	var tx types.CompoundTimelockTransaction
	err := r.db.WithContext(ctx).
		Select("event_function_signature").
		Where("event_tx_hash = ? AND LOWER(contract_address) = LOWER(?) AND event_type = ? AND tx_status = ?", flowID, contractAddress, "QueueTransaction", "success").
		First(&tx).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		logger.Error("GetQueueTransactionFunctionSignature Error", err, "flow_id", flowID, "contract_address", contractAddress)
		return nil, err
	}

	return tx.EventFunctionSignature, nil
}

// RefreshCompoundFlowsExpiredAt 刷新指定Compound合约的所有flows的expired_at字段
func (r *flowRepository) RefreshCompoundFlowsExpiredAt(ctx context.Context, chainID int, contractAddress string, gracePeriodSeconds int64) (int64, error) {
	normalizedContractAddress := strings.ToLower(contractAddress)

	// 更新所有该合约的compound flows，重新计算expired_at = eta + grace_period
	// 使用字符串格式化来构建INTERVAL表达式，避免参数化查询问题
	intervalExpr := fmt.Sprintf("eta + INTERVAL '%d seconds'", gracePeriodSeconds)
	result := r.db.WithContext(ctx).
		Model(&types.TimelockTransactionFlow{}).
		Where("timelock_standard = ? AND chain_id = ? AND LOWER(contract_address) = ? AND eta IS NOT NULL",
			"compound", chainID, normalizedContractAddress).
		Update("expired_at", gorm.Expr(intervalExpr))

	if result.Error != nil {
		logger.Error("RefreshCompoundFlowsExpiredAt Error", result.Error,
			"chain_id", chainID, "contract_address", contractAddress, "grace_period", gracePeriodSeconds)
		return 0, result.Error
	}

	logger.Info("RefreshCompoundFlowsExpiredAt completed",
		"updated", result.RowsAffected, "chain_id", chainID, "contract_address", contractAddress, "grace_period", gracePeriodSeconds)

	return result.RowsAffected, nil
}
