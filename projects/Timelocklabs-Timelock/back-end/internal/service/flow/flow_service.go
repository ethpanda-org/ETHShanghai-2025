package flow

import (
	"context"
	"fmt"
	"strings"

	"timelock-backend/internal/repository/scanner"
	"timelock-backend/internal/repository/timelock"
	"timelock-backend/internal/types"
	"timelock-backend/pkg/logger"
	"timelock-backend/pkg/utils"
)

// FlowService 流程服务接口
type FlowService interface {
	// 获取与用户相关的流程列表
	GetCompoundFlowList(ctx context.Context, userAddress string, req *types.GetCompoundFlowListRequest) (*types.GetCompoundFlowListResponse, error)

	// 获取与用户相关的流程数量统计
	GetCompoundFlowListCount(ctx context.Context, userAddress string, req *types.GetCompoundFlowListCountRequest) (*types.GetCompoundFlowListCountResponse, error)

	// 获取交易详情
	GetCompoundTransactionDetail(ctx context.Context, req *types.GetTransactionDetailRequest) (*types.GetTransactionDetailResponse, error)
}

// flowService 流程服务实现
type flowService struct {
	flowRepo     scanner.FlowRepository
	timelockRepo timelock.Repository
}

// NewFlowService 创建流程服务实例
func NewFlowService(flowRepo scanner.FlowRepository, timelockRepo timelock.Repository) FlowService {
	return &flowService{
		flowRepo:     flowRepo,
		timelockRepo: timelockRepo,
	}
}

// GetFlowList 获取与用户相关的流程列表
func (s *flowService) GetCompoundFlowList(ctx context.Context, userAddress string, req *types.GetCompoundFlowListRequest) (*types.GetCompoundFlowListResponse, error) {
	// 验证状态参数
	if req.Status != nil {
		validStatuses := []string{"all", "waiting", "ready", "executed", "cancelled", "expired"}
		isValidStatus := false
		for _, validStatus := range validStatuses {
			if *req.Status == validStatus {
				isValidStatus = true
				break
			}
		}
		if !isValidStatus {
			return nil, fmt.Errorf("invalid status: %s", *req.Status)
		}
	}

	// 验证标准参数
	if req.Standard != nil {
		validStandards := []string{"compound"}
		isValidStandard := false
		for _, validStandard := range validStandards {
			if *req.Standard == validStandard {
				isValidStandard = true
				break
			}
		}
		if !isValidStandard {
			return nil, fmt.Errorf("invalid standard: %s", *req.Standard)
		}
	}

	// 计算分页
	page := req.Page
	pageSize := req.PageSize
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 10
	}
	if pageSize > 100 {
		pageSize = 100
	}
	offset := (page - 1) * pageSize

	flows, total, err := s.flowRepo.GetUserRelatedCompoundFlows(ctx, userAddress, req.Status, req.Standard, offset, pageSize)
	if err != nil {
		logger.Error("Failed to get user related compound flows", err, "user", userAddress)
		return nil, fmt.Errorf("failed to get user related compound flows: %w", err)
	}

	// 转换为响应格式
	flowResponses := make([]types.CompoundFlowResponse, len(flows))
	for i, flow := range flows {
		flowResponses[i] = s.convertToCompoundFlowResponse(ctx, flow)
	}

	return &types.GetCompoundFlowListResponse{
		Flows: flowResponses,
		Total: total,
	}, nil
}

// GetCompoundFlowListCount 获取与用户相关的流程数量统计
func (s *flowService) GetCompoundFlowListCount(ctx context.Context, userAddress string, req *types.GetCompoundFlowListCountRequest) (*types.GetCompoundFlowListCountResponse, error) {
	// 验证标准参数
	if req.Standard != nil {
		validStandards := []string{"compound"}
		isValidStandard := false
		for _, validStandard := range validStandards {
			if *req.Standard == validStandard {
				isValidStandard = true
				break
			}
		}
		if !isValidStandard {
			return nil, fmt.Errorf("invalid standard: %s", *req.Standard)
		}
	}

	// 调用repository层获取数量统计
	flowCount, err := s.flowRepo.GetUserRelatedCompoundFlowsCount(ctx, userAddress, req.Standard)
	if err != nil {
		logger.Error("Failed to get user related compound flows count", err, "user", userAddress)
		return nil, fmt.Errorf("failed to get user related compound flows count: %w", err)
	}

	return &types.GetCompoundFlowListCountResponse{
		FlowCount: *flowCount,
	}, nil
}

// GetTransactionDetail 获取交易详情
func (s *flowService) GetCompoundTransactionDetail(ctx context.Context, req *types.GetTransactionDetailRequest) (*types.GetTransactionDetailResponse, error) {
	// 标准化
	req.Standard = strings.ToLower(strings.TrimSpace(req.Standard))
	req.TxHash = strings.TrimSpace(req.TxHash)
	if req.Standard != "compound" {
		return nil, fmt.Errorf("invalid standard: %s", req.Standard)
	}
	if !utils.IsValidTxHash(req.TxHash) {
		return nil, fmt.Errorf("invalid tx hash")
	}
	detail, err := s.flowRepo.GetCompoundTransactionDetail(ctx, req.Standard, req.TxHash)
	if err != nil {
		logger.Error("Failed to get transaction detail", err, "standard", req.Standard, "tx_hash", req.TxHash)
		return nil, fmt.Errorf("failed to get transaction detail: %w", err)
	}

	if detail == nil {
		return nil, fmt.Errorf("transaction not found")
	}

	return &types.GetTransactionDetailResponse{
		Detail: *detail,
	}, nil
}

// convertToFlowResponse 转换为流程响应格式
func (s *flowService) convertToCompoundFlowResponse(ctx context.Context, flow types.TimelockTransactionFlow) types.CompoundFlowResponse {
	response := types.CompoundFlowResponse{
		ID:               flow.ID,
		FlowID:           flow.FlowID,
		TimelockStandard: flow.TimelockStandard,
		ChainID:          flow.ChainID,
		ContractAddress:  flow.ContractAddress,
		Status:           flow.Status,
		InitiatorAddress: flow.InitiatorAddress,
		TargetAddress:    flow.TargetAddress,
		Value:            flow.Value,
		Eta:              flow.Eta,
		ExpiredAt:        flow.ExpiredAt,
		CreatedAt:        flow.CreatedAt,
		UpdatedAt:        flow.UpdatedAt,
	}

	// 设置交易哈希
	if flow.QueueTxHash != "" {
		response.QueueTxHash = &flow.QueueTxHash
	}
	if flow.ExecuteTxHash != "" {
		response.ExecuteTxHash = &flow.ExecuteTxHash
	}
	if flow.CancelTxHash != "" {
		response.CancelTxHash = &flow.CancelTxHash
	}

	// 设置时间戳
	response.ExecutedAt = flow.ExecutedAt
	response.CancelledAt = flow.CancelledAt

	// 设置调用数据（转换为十六进制字符串）
	if len(flow.CallData) > 0 {
		callDataHex := fmt.Sprintf("0x%x", flow.CallData)
		response.CallDataHex = &callDataHex
	}

	// 获取队列交易的函数签名
	if flow.FlowID != "" && flow.TimelockStandard == "compound" {
		functionSignature, err := s.flowRepo.GetCompoundQueueTransactionFunctionSignature(ctx, flow.FlowID, flow.ContractAddress)
		if err != nil {
			logger.Error("Failed to get queue transaction function signature", err, "flow_id", flow.FlowID, "contract_address", flow.ContractAddress)
		} else if functionSignature != nil {
			response.FunctionSignature = functionSignature
		}
	}

	// 获取合约备注
	contractRemark, err := s.timelockRepo.GetContractRemarkByStandardAndAddress(ctx, flow.TimelockStandard, flow.ChainID, flow.ContractAddress)
	if err != nil {
		logger.Error("Failed to get contract remark", err, "standard", flow.TimelockStandard, "chain_id", flow.ChainID, "contract_address", flow.ContractAddress)
		// 不影响主流程，继续执行，备注为空
	} else {
		response.ContractRemark = contractRemark
	}

	return response
}
