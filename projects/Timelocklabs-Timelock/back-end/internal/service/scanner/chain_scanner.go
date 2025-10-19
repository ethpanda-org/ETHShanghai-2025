package scanner

import (
	"context"
	"fmt"
	"sync"
	"time"

	"timelock-backend/internal/config"
	"timelock-backend/internal/repository/scanner"
	"timelock-backend/internal/repository/timelock"
	"timelock-backend/internal/types"
	"timelock-backend/pkg/logger"

	"github.com/ethereum/go-ethereum/ethclient"
)

// EmailService 邮件服务接口
type EmailService interface {
	SendFlowNotification(ctx context.Context, standard string, chainID int, contractAddress string, flowID string, statusFrom, statusTo string, txHash *string, initiatorAddress string) error
}

// NotificationService 通知服务接口
type NotificationService interface {
	SendFlowNotification(ctx context.Context, standard string, chainID int, contractAddress string, flowID string, statusFrom, statusTo string, txHash *string, initiatorAddress string) error
}

// ChainScanner 单链扫描器
type ChainScanner struct {
	config       *config.Config
	chainInfo    *types.ChainRPCInfo
	progress     *types.BlockScanProgress
	rpcManager   *RPCManager
	progressRepo scanner.ProgressRepository
	txRepo       scanner.TransactionRepository
	flowRepo     scanner.FlowRepository
	timelockRepo timelock.Repository

	blockProcessor *BlockProcessor
	eventProcessor *EventProcessor

	mutex      sync.RWMutex
	stopCh     chan struct{}
	wg         sync.WaitGroup
	isRunning  bool
	lastUpdate time.Time
}

// ChainScannerStatus 链扫描器状态
type ChainScannerStatus struct {
	ChainID            int       `json:"chain_id"`
	ChainName          string    `json:"chain_name"`
	ScanStatus         string    `json:"scan_status"`
	LastScannedBlock   int64     `json:"last_scanned_block"`
	LatestNetworkBlock int64     `json:"latest_network_block"`
	BlocksLag          int64     `json:"blocks_lag"`
	ScanSpeed          string    `json:"scan_speed"`
	LastUpdate         time.Time `json:"last_update"`
	ErrorMessage       *string   `json:"error_message,omitempty"`
}

// NewChainScanner 创建新的链扫描器
func NewChainScanner(
	cfg *config.Config,
	chainInfo *types.ChainRPCInfo,
	progress *types.BlockScanProgress,
	rpcManager *RPCManager,
	progressRepo scanner.ProgressRepository,
	txRepo scanner.TransactionRepository,
	flowRepo scanner.FlowRepository,
	emailService EmailService,
	notificationService NotificationService,
	timelockRepo timelock.Repository,
) *ChainScanner {
	cs := &ChainScanner{
		config:       cfg,
		chainInfo:    chainInfo,
		progress:     progress,
		rpcManager:   rpcManager,
		progressRepo: progressRepo,
		txRepo:       txRepo,
		flowRepo:     flowRepo,
		timelockRepo: timelockRepo,
		stopCh:       make(chan struct{}),
		lastUpdate:   time.Now(),
	}

	// 创建处理器
	cs.blockProcessor = NewBlockProcessor(cfg, cs.chainInfo)
	cs.eventProcessor = NewEventProcessor(cfg, txRepo, flowRepo, emailService, notificationService, timelockRepo)

	return cs
}

// Start 启动链扫描器
func (cs *ChainScanner) Start(ctx context.Context) error {
	cs.mutex.Lock()
	defer cs.mutex.Unlock()

	if cs.isRunning {
		return fmt.Errorf("chain scanner for chain %d is already running", cs.chainInfo.ChainID)
	}

	// 启动扫描协程
	cs.wg.Add(1)
	go cs.scanLoop(ctx)

	cs.isRunning = true
	return nil
}

// Stop 停止链扫描器
func (cs *ChainScanner) Stop() {
	cs.mutex.Lock()
	defer cs.mutex.Unlock()

	if !cs.isRunning {
		return
	}

	logger.Info("Stopping chain scanner", "chain_id", cs.chainInfo.ChainID)

	// 先设置为停止状态，避免新的异步数据库更新
	cs.isRunning = false

	// 安全地关闭channel
	select {
	case <-cs.stopCh:
		// channel已经关闭
	default:
		close(cs.stopCh)
	}

	// 等待协程结束
	cs.wg.Wait()

	// 更新本地状态为 paused (等扫链器完全停止后再更新)
	cs.progress.ScanStatus = "paused"
	// cs.progress.ErrorMessage = nil
	cs.progress.LastUpdateTime = time.Now()

	// 同步更新数据库状态
	ctx, cancel := context.WithTimeout(context.Background(), time.Second*5)
	defer cancel()
	if err := cs.progressRepo.UpdateProgress(ctx, cs.progress); err != nil {
		logger.Error("Failed to update progress status during stop", err, "chain_id", cs.chainInfo.ChainID)
	}

	logger.Info("Chain scanner stopped", "chain_id", cs.chainInfo.ChainID)
}

// scanLoop 扫描循环
func (cs *ChainScanner) scanLoop(ctx context.Context) {
	defer cs.wg.Done()

	for {
		select {
		case <-ctx.Done():
			logger.Info("Scan loop stopped by context", "chain_id", cs.chainInfo.ChainID)
			return
		case <-cs.stopCh:
			logger.Info("Scan loop stopped by stop channel", "chain_id", cs.chainInfo.ChainID)
			return
		default:
			// 若状态为 paused（例如上次优雅退出后残留），在真正开始扫描前恢复为 running
			if cs.progress.ScanStatus == "paused" {
				cs.updateProgressStatus("running", "")
			}

			if err := cs.scanBlocks(ctx); err != nil {
				logger.Error("Scan blocks failed", err, "chain_id", cs.chainInfo.ChainID)
				cs.updateProgressStatus("error", err.Error())

				// 发生错误时等待一段时间再重试
				select {
				case <-time.After(time.Second * 30):
				case <-cs.stopCh:
					return
				case <-ctx.Done():
					return
				}
			} else {
				// 扫描成功，确保状态为 running（处理从错误状态恢复的情况）
				if cs.progress.ScanStatus == "error" || cs.progress.ErrorMessage != nil {
					cs.updateProgressStatus("running", "")
				}

				// 根据是否跟上最新区块调整扫描间隔
				interval := cs.getScanInterval()
				select {
				case <-time.After(interval):
				case <-cs.stopCh:
					return
				case <-ctx.Done():
					return
				}
			}
		}
	}
}

// scanBlocks 扫描区块
func (cs *ChainScanner) scanBlocks(ctx context.Context) error {
	var latestBlock uint64

	// 使用RPC管理器的重试机制获取最新区块号
	err := cs.rpcManager.ExecuteWithRetry(ctx, cs.chainInfo.ChainID, func(client *ethclient.Client) error {
		var err error
		latestBlock, err = client.BlockNumber(ctx)
		return err
	})
	if err != nil {
		return fmt.Errorf("failed to get latest block number: %w", err)
	}

	// 更新最新网络区块号
	cs.progress.LatestNetworkBlock = int64(latestBlock)

	// 计算需要扫描的区块范围
	fromBlock := cs.progress.LastScannedBlock + 1
	toBlock := cs.calculateToBlock(fromBlock, int64(latestBlock))

	if fromBlock > int64(latestBlock) {
		logger.Debug("No new blocks to scan", "chain_id", cs.chainInfo.ChainID, "latest", latestBlock)
		return nil
	}

	// 批量扫描区块范围（使用eth_getLogs一次性获取所有事件）
	select {
	case <-cs.stopCh:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	default:
		var events []TimelockEvent

		// 使用RPC管理器的重试机制扫描区块范围
		err := cs.rpcManager.ExecuteWithRetry(ctx, cs.chainInfo.ChainID, func(client *ethclient.Client) error {
			var err error
			events, err = cs.blockProcessor.ScanBlockRange(ctx, client, fromBlock, toBlock)
			return err
		})
		if err != nil {
			return fmt.Errorf("failed to scan block range %d-%d: %w", fromBlock, toBlock, err)
		}

		if len(events) > 0 {
			// 处理事件
			if err := cs.eventProcessor.ProcessEvents(ctx, cs.chainInfo.ChainID, cs.chainInfo.ChainName, events); err != nil {
				return fmt.Errorf("failed to process events: %w", err)
			}
		}

		// 更新进度到最后扫描的区块
		cs.progress.LastScannedBlock = toBlock
		cs.progress.LastUpdateTime = time.Now()
		cs.lastUpdate = time.Now()

		if err := cs.progressRepo.UpdateProgressBlock(ctx, cs.chainInfo.ChainID, toBlock, int64(latestBlock)); err != nil {
			logger.Error("Failed to update progress", err, "chain_id", cs.chainInfo.ChainID, "block", toBlock)
		}
	}

	return nil
}

// calculateToBlock 计算要扫描到的区块号
func (cs *ChainScanner) calculateToBlock(fromBlock, latestBlock int64) int64 {
	batchSize := int64(cs.config.Scanner.ScanBatchSize)

	// 计算批次结束区块
	toBlock := fromBlock + batchSize - 1

	// 不超过最新区块
	if toBlock > latestBlock {
		toBlock = latestBlock
	}

	// 不超过确认区块数
	confirmations := int64(cs.config.Scanner.ScanConfirmations)
	if toBlock > latestBlock-confirmations {
		toBlock = latestBlock - confirmations
		if toBlock < fromBlock {
			toBlock = fromBlock
		}
	}

	return toBlock
}

// getScanInterval 获取扫描间隔
func (cs *ChainScanner) getScanInterval() time.Duration {
	// 计算落后的区块数
	lag := cs.progress.LatestNetworkBlock - cs.progress.LastScannedBlock

	if lag > 100 {
		// 落后超过100个区块，使用快速扫描
		return cs.config.Scanner.ScanInterval
	} else {
		// 接近最新区块，使用慢速扫描
		return cs.config.Scanner.ScanIntervalSlow
	}
}

// updateProgressStatus 更新进度状态
func (cs *ChainScanner) updateProgressStatus(status string, errorMsg string) {
	cs.mutex.Lock()
	defer cs.mutex.Unlock()

	cs.progress.ScanStatus = status
	if errorMsg != "" {
		cs.progress.ErrorMessage = &errorMsg
	} else {
		cs.progress.ErrorMessage = nil
	}
	cs.progress.LastUpdateTime = time.Now()

	// 异步更新数据库，但要管理goroutine
	// 检查是否正在停止中，如果是则不启动新的goroutine
	if !cs.isRunning {
		// 扫描器已经停止或正在停止，同步更新
		ctx, cancel := context.WithTimeout(context.Background(), time.Second*3)
		defer cancel()
		if err := cs.progressRepo.UpdateProgress(ctx, cs.progress); err != nil {
			logger.Error("Failed to update progress status during stop", err, "chain_id", cs.chainInfo.ChainID)
		}
		return
	}

	cs.wg.Add(1)
	go func() {
		defer cs.wg.Done()
		ctx, cancel := context.WithTimeout(context.Background(), time.Second*10)
		defer cancel()

		if err := cs.progressRepo.UpdateProgress(ctx, cs.progress); err != nil {
			logger.Error("Failed to update progress status", err, "chain_id", cs.chainInfo.ChainID)
		}
	}()
}

// GetStatus 获取扫描器状态
func (cs *ChainScanner) GetStatus() ChainScannerStatus {
	cs.mutex.RLock()
	defer cs.mutex.RUnlock()

	lag := cs.progress.LatestNetworkBlock - cs.progress.LastScannedBlock
	scanSpeed := "slow"
	if lag > 100 {
		scanSpeed = "fast"
	}

	status := ChainScannerStatus{
		ChainID:            cs.chainInfo.ChainID,
		ChainName:          cs.chainInfo.ChainName,
		ScanStatus:         cs.progress.ScanStatus,
		LastScannedBlock:   cs.progress.LastScannedBlock,
		LatestNetworkBlock: cs.progress.LatestNetworkBlock,
		BlocksLag:          lag,
		ScanSpeed:          scanSpeed,
		LastUpdate:         cs.lastUpdate,
	}

	if cs.progress.ErrorMessage != nil {
		status.ErrorMessage = cs.progress.ErrorMessage
	}

	return status
}
