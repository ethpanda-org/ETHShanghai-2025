package scanner

import (
	"context"
	"time"

	"timelock-backend/internal/config"
	"timelock-backend/internal/repository/scanner"
	"timelock-backend/internal/repository/timelock"
	"timelock-backend/internal/types"
	"timelock-backend/pkg/logger"
)

// FlowStatusRefresher 流程状态刷新器
type FlowStatusRefresher struct {
	config              *config.Config
	flowRepo            scanner.FlowRepository
	timelockRepo        timelock.Repository
	emailService        EmailService
	notificationService NotificationService
	stopCh              chan struct{}
}

// NewFlowStatusRefresher 创建新的流程状态刷新器
func NewFlowStatusRefresher(
	cfg *config.Config,
	flowRepo scanner.FlowRepository,
	timelockRepo timelock.Repository,
	emailService EmailService,
	notificationService NotificationService,
) *FlowStatusRefresher {
	return &FlowStatusRefresher{
		config:              cfg,
		flowRepo:            flowRepo,
		timelockRepo:        timelockRepo,
		emailService:        emailService,
		notificationService: notificationService,
		stopCh:              make(chan struct{}),
	}
}

// Start 启动刷新器
func (fsr *FlowStatusRefresher) Start(ctx context.Context) error {
	logger.Info("Starting FlowStatusRefresher",
		"interval", fsr.config.Scanner.FlowRefreshInterval,
		"batch_size", fsr.config.Scanner.FlowRefreshBatchSize)

	ticker := time.NewTicker(fsr.config.Scanner.FlowRefreshInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			logger.Info("FlowStatusRefresher stopped by context")
			return ctx.Err()
		case <-fsr.stopCh:
			logger.Info("FlowStatusRefresher stopped")
			return nil
		case <-ticker.C:
			if err := fsr.refreshFlowStatuses(ctx); err != nil {
				logger.Error("Failed to refresh flow statuses", err)
			}
		}
	}
}

// Stop 停止刷新器
func (fsr *FlowStatusRefresher) Stop() {
	close(fsr.stopCh)
}

// refreshFlowStatuses 刷新流程状态
func (fsr *FlowStatusRefresher) refreshFlowStatuses(ctx context.Context) error {
	now := time.Now()

	// 1. 处理waiting → ready状态转换
	if err := fsr.processWaitingToReady(ctx, now); err != nil {
		logger.Error("Failed to process waiting->ready transitions", err)
	}

	// 2. 处理Compound的过期状态转换
	if err := fsr.processCompoundExpired(ctx, now); err != nil {
		logger.Error("Failed to process compound expired transitions", err)
	}

	return nil
}

// processWaitingToReady 处理waiting → ready状态转换
func (fsr *FlowStatusRefresher) processWaitingToReady(ctx context.Context, now time.Time) error {
	// 获取等待中但ETA已到的流程
	flows, err := fsr.flowRepo.GetWaitingFlowsDue(ctx, now, fsr.config.Scanner.FlowRefreshBatchSize)
	if err != nil {
		return err
	}

	if len(flows) == 0 {
		return nil
	}

	logger.Info("Processing waiting->ready transitions", "count", len(flows))

	// 批量更新状态
	if err := fsr.flowRepo.BatchUpdateFlowStatus(ctx, flows, "ready"); err != nil {
		return err
	}

	// 发送通知（过滤导入前的历史交易）
	for _, flow := range flows {
		if flow.InitiatorAddress != nil {
			if fsr.shouldSuppressNotification(ctx, &flow) {
				logger.Debug("Skip notification for historical flow (waiting->ready)", "flow_id", flow.FlowID)
				continue
			}

			// 发送邮件通知
			if fsr.emailService != nil {
				if err := fsr.emailService.SendFlowNotification(
					ctx,
					flow.TimelockStandard,
					flow.ChainID,
					flow.ContractAddress,
					flow.FlowID,
					"waiting",
					"ready",
					nil, // 无交易hash，因为是定时任务触发的状态变更
					*flow.InitiatorAddress,
				); err != nil {
					logger.Error("Failed to send ready email notification", err,
						"flow_id", flow.FlowID, "standard", flow.TimelockStandard)
					// 不影响其他流程的处理，继续执行
				}
			}

			// 发送渠道通知
			if fsr.notificationService != nil {
				if err := fsr.notificationService.SendFlowNotification(
					ctx,
					flow.TimelockStandard,
					flow.ChainID,
					flow.ContractAddress,
					flow.FlowID,
					"waiting",
					"ready",
					nil, // 无交易hash，因为是定时任务触发的状态变更
					*flow.InitiatorAddress,
				); err != nil {
					logger.Error("Failed to send ready channel notification", err,
						"flow_id", flow.FlowID, "standard", flow.TimelockStandard)
					// 不影响其他流程的处理，继续执行
				}
			}
		}
	}

	logger.Info("Completed waiting->ready transitions", "updated", len(flows))
	return nil
}

// processCompoundExpired 处理Compound的过期状态转换
func (fsr *FlowStatusRefresher) processCompoundExpired(ctx context.Context, now time.Time) error {
	// 获取Compound中已过期的流程
	flows, err := fsr.flowRepo.GetCompoundFlowsExpired(ctx, now, fsr.config.Scanner.FlowRefreshBatchSize)
	if err != nil {
		return err
	}

	if len(flows) == 0 {
		return nil
	}

	logger.Info("Processing compound expired transitions", "count", len(flows))

	// 批量更新状态
	if err := fsr.flowRepo.BatchUpdateFlowStatus(ctx, flows, "expired"); err != nil {
		return err
	}

	// 发送通知（过滤导入前的历史交易）
	for _, flow := range flows {
		if flow.InitiatorAddress != nil {
			if fsr.shouldSuppressNotification(ctx, &flow) {
				logger.Debug("Skip notification for historical flow (expired)", "flow_id", flow.FlowID)
				continue
			}
			statusFrom := flow.Status // 记录原状态用于通知

			// 发送邮件通知
			if fsr.emailService != nil {
				if err := fsr.emailService.SendFlowNotification(
					ctx,
					flow.TimelockStandard,
					flow.ChainID,
					flow.ContractAddress,
					flow.FlowID,
					statusFrom,
					"expired",
					nil, // 无交易hash，因为是定时任务触发的状态变更
					*flow.InitiatorAddress,
				); err != nil {
					logger.Error("Failed to send expired email notification", err,
						"flow_id", flow.FlowID, "standard", flow.TimelockStandard)
					// 不影响其他流程的处理，继续执行
				}
			}

			// 发送渠道通知
			if fsr.notificationService != nil {
				if err := fsr.notificationService.SendFlowNotification(
					ctx,
					flow.TimelockStandard,
					flow.ChainID,
					flow.ContractAddress,
					flow.FlowID,
					statusFrom,
					"expired",
					nil, // 无交易hash，因为是定时任务触发的状态变更
					*flow.InitiatorAddress,
				); err != nil {
					logger.Error("Failed to send expired channel notification", err,
						"flow_id", flow.FlowID, "standard", flow.TimelockStandard)
					// 不影响其他流程的处理，继续执行
				}
			}
		}
	}

	logger.Info("Completed compound expired transitions", "updated", len(flows))
	return nil
}

// shouldSuppressNotification 判断该流程是否为合约被导入/开始监听之前的历史交易
// 规则：如果 flow.QueuedAt 存在，且早于合约在系统中的创建时间（timelock.CreatedAt），则不发送任何通知
func (fsr *FlowStatusRefresher) shouldSuppressNotification(ctx context.Context, flow *types.TimelockTransactionFlow) bool {
	// 仅当存在排队时间时才进行历史过滤
	if flow == nil || flow.QueuedAt == nil || fsr.timelockRepo == nil {
		return false
	}

	// 根据标准读取对应的 timelock 记录
	switch flow.TimelockStandard {
	case "compound":
		tl, err := fsr.timelockRepo.GetCompoundTimeLockByChainAndAddress(ctx, flow.ChainID, flow.ContractAddress)
		if err != nil || tl == nil {
			return false
		}
		return flow.QueuedAt.Before(tl.CreatedAt)
	default:
		return false
	}
}
