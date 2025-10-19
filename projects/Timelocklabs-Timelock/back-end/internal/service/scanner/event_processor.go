package scanner

import (
	"context"
	"fmt"
	"time"

	"timelock-backend/internal/config"
	"timelock-backend/internal/repository/scanner"
	"timelock-backend/internal/repository/timelock"
	"timelock-backend/internal/types"
	"timelock-backend/pkg/crypto"
	"timelock-backend/pkg/logger"
)

// EventProcessor 事件处理器
type EventProcessor struct {
	config              *config.Config
	txRepo              scanner.TransactionRepository
	flowRepo            scanner.FlowRepository
	emailService        EmailService        // 邮件服务接口
	notificationService NotificationService // 通知服务接口
	timelockRepo        timelock.Repository
}

// NewEventProcessor 创建新的事件处理器
func NewEventProcessor(
	cfg *config.Config,
	txRepo scanner.TransactionRepository,
	flowRepo scanner.FlowRepository,
	emailService EmailService,
	notificationService NotificationService,
	timelockRepo timelock.Repository,
) *EventProcessor {
	return &EventProcessor{
		config:              cfg,
		txRepo:              txRepo,
		flowRepo:            flowRepo,
		emailService:        emailService,
		notificationService: notificationService,
		timelockRepo:        timelockRepo,
	}
}

// ProcessEvents 处理事件列表
func (ep *EventProcessor) ProcessEvents(ctx context.Context, chainID int, chainName string, events []TimelockEvent) error {
	if len(events) == 0 {
		return nil
	}

	var compoundEvents []types.CompoundTimelockTransaction

	// 分类处理事件
	for _, event := range events {
		switch e := event.(type) {
		case *types.CompoundTimelockEvent:
			tx := ep.convertCompoundEvent(e)
			compoundEvents = append(compoundEvents, *tx)

			// 处理流程关联
			if err := ep.processCompoundFlow(ctx, e); err != nil {
				logger.Error("Failed to process Compound flow", err, "tx_hash", e.TxHash)
			}

		default:
			logger.Warn("Unknown event type", "event", event)
		}
	}

	// 批量存储事件
	if len(compoundEvents) > 0 {
		if err := ep.txRepo.BatchCreateCompoundTransactions(ctx, compoundEvents); err != nil {
			logger.Error("Failed to batch create Compound transactions", err)
			return fmt.Errorf("failed to create Compound transactions: %w", err)
		}
	}

	return nil
}

// convertCompoundEvent 转换Compound事件为数据库记录
func (ep *EventProcessor) convertCompoundEvent(event *types.CompoundTimelockEvent) *types.CompoundTimelockTransaction {
	return &types.CompoundTimelockTransaction{
		TxHash:                 event.TxHash,
		BlockNumber:            int64(event.BlockNumber),
		BlockTimestamp:         time.Unix(int64(event.BlockTimestamp), 0),
		ChainID:                event.ChainID,
		ChainName:              event.ChainName,
		ContractAddress:        event.ContractAddress,
		FromAddress:            event.FromAddress,
		ToAddress:              event.ToAddress,
		TxStatus:               event.TxStatus,
		EventType:              event.EventType,
		EventData:              event.EventData,
		EventTxHash:            event.EventTxHash,
		EventTarget:            event.EventTarget,
		EventValue:             event.EventValue,
		EventFunctionSignature: event.EventFunctionSignature,
		EventCallData:          event.EventCallData,
		EventEta:               event.EventEta,
	}
}

// processCompoundFlow 处理Compound流程关联
func (ep *EventProcessor) processCompoundFlow(ctx context.Context, event *types.CompoundTimelockEvent) error {
	if event.EventTxHash == nil {
		return fmt.Errorf("event_tx_hash is required for flow processing")
	}

	// 根据文档，Compound的FlowID是EventTxHash
	flowID := *event.EventTxHash

	// 标准化合约地址
	normalizedContract := crypto.NormalizeAddress(event.ContractAddress)

	// 查找现有流程
	existingFlow, err := ep.flowRepo.GetFlowByID(ctx, flowID, "compound", event.ChainID, normalizedContract)
	if err != nil {
		return fmt.Errorf("failed to get existing flow: %w", err)
	}

	var flow *types.TimelockTransactionFlow
	var statusFrom, statusTo string
	var txHash *string

	if existingFlow == nil {
		// 创建新流程（只有QueueTransaction事件创建）
		if event.EventType != "QueueTransaction" {
			logger.Warn("Received non-Queue event for non-existing flow", "event_type", event.EventType, "flow_id", flowID)
			return nil
		}

		// 计算ETA、排队时间、过期时间
		var eta, queuedAt, expiredAt *time.Time
		if event.EventEta != nil {
			etaTime := time.Unix(*event.EventEta, 0)
			eta = &etaTime

			// 读取合约的实际 grace_period 计算过期时间
			var gracePeriodSeconds int64 = 14 * 24 * 3600 // 默认14天兜底
			if ep.timelockRepo != nil {
				if tl, err := ep.timelockRepo.GetCompoundTimeLockByChainAndAddress(ctx, event.ChainID, normalizedContract); err == nil && tl != nil {
					if tl.GracePeriod > 0 {
						gracePeriodSeconds = tl.GracePeriod
					}
				} else if err != nil {
					logger.Warn("Failed to load timelock for grace period, fallback to default", "error", err, "chain_id", event.ChainID, "contract_address", normalizedContract)
				}
			}
			expiredTime := etaTime.Add(time.Duration(gracePeriodSeconds) * time.Second)
			expiredAt = &expiredTime
		}

		// 排队时间
		qt := time.Unix(int64(event.BlockTimestamp), 0)
		queuedAt = &qt

		flow = &types.TimelockTransactionFlow{
			FlowID:           flowID,
			TimelockStandard: "compound",
			ChainID:          event.ChainID,
			ContractAddress:  normalizedContract,
			Status:           "waiting",
			QueueTxHash:      event.TxHash,
			InitiatorAddress: &event.FromAddress,
			QueuedAt:         queuedAt,
			Eta:              eta,
			ExpiredAt:        expiredAt,
			TargetAddress:    event.EventTarget,
			CallData:         event.EventCallData,
			Value:            event.EventValue,
		}

		if err := ep.flowRepo.CreateFlow(ctx, flow); err != nil {
			return fmt.Errorf("failed to create flow: %w", err)
		}

		statusFrom = ""
		statusTo = "waiting"
		txHash = &event.TxHash

		logger.Info("Created new Compound flow", "flow_id", flowID, "status", statusTo)
	} else {
		// 更新现有流程
		flow = existingFlow
		statusFrom = flow.Status

		switch event.EventType {
		case "ExecuteTransaction":
			if flow.Status == "ready" || flow.Status == "waiting" {
				flow.Status = "executed"
				flow.ExecuteTxHash = event.TxHash
				executedAt := time.Unix(int64(event.BlockTimestamp), 0)
				flow.ExecutedAt = &executedAt
				statusTo = "executed"
				txHash = &event.TxHash
			}
		case "CancelTransaction":
			if flow.Status == "waiting" || flow.Status == "ready" {
				flow.Status = "cancelled"
				flow.CancelTxHash = event.TxHash
				cancelledAt := time.Unix(int64(event.BlockTimestamp), 0)
				flow.CancelledAt = &cancelledAt
				statusTo = "cancelled"
				txHash = &event.TxHash
			}
		case "QueueTransaction":
			// 幂等保护：如果重复扫到 Queue 事件，补写缺失字段（如 QueuedAt、Eta、ExpiredAt），但不改变状态
			if flow.QueuedAt == nil {
				qt := time.Unix(int64(event.BlockTimestamp), 0)
				flow.QueuedAt = &qt
			}
			if flow.Eta == nil && event.EventEta != nil {
				etaTime := time.Unix(*event.EventEta, 0)
				flow.Eta = &etaTime
			}
			if flow.ExpiredAt == nil && flow.Eta != nil {
				var gracePeriodSeconds int64 = 14 * 24 * 3600
				if ep.timelockRepo != nil {
					if tl, err := ep.timelockRepo.GetCompoundTimeLockByChainAndAddress(ctx, event.ChainID, normalizedContract); err == nil && tl != nil {
						if tl.GracePeriod > 0 {
							gracePeriodSeconds = tl.GracePeriod
						}
					}
				}
				expiredTime := flow.Eta.Add(time.Duration(gracePeriodSeconds) * time.Second)
				flow.ExpiredAt = &expiredTime
			}
			statusTo = statusFrom // 不触发状态变化
		default:
			// QueueTransaction事件重复处理，忽略
			return nil
		}

		if statusFrom != statusTo {
			if err := ep.flowRepo.UpdateFlow(ctx, flow); err != nil {
				return fmt.Errorf("failed to update flow: %w", err)
			}

			logger.Info("Updated Compound flow", "flow_id", flowID, "status", statusFrom, "->", statusTo)
		}
	}

	// 发送邮件通知
	if statusFrom != statusTo && ep.emailService != nil {
		if err := ep.emailService.SendFlowNotification(ctx, "compound", event.ChainID, normalizedContract, flowID, statusFrom, statusTo, txHash, event.FromAddress); err != nil {
			logger.Error("Failed to send email notification", err, "flow_id", flowID, "status_change", statusFrom+"->"+statusTo)
			// 不返回错误，因为邮件发送失败不应该影响流程状态更新
		}
	}

	// 发送渠道通知
	if statusFrom != statusTo && ep.notificationService != nil {
		if err := ep.notificationService.SendFlowNotification(ctx, "compound", event.ChainID, normalizedContract, flowID, statusFrom, statusTo, txHash, event.FromAddress); err != nil {
			logger.Error("Failed to send channel notification", err, "flow_id", flowID, "status_change", statusFrom+"->"+statusTo)
			// 不返回错误，因为通知发送失败不应该影响流程状态更新
		}
	}

	return nil
}
