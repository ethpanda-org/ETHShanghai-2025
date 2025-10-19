package scanner

import (
	"context"
	"fmt"
	"sync"
	"time"

	"timelock-backend/internal/config"
	"timelock-backend/internal/repository/chain"
	"timelock-backend/internal/repository/scanner"
	"timelock-backend/internal/repository/timelock"
	"timelock-backend/internal/types"
	"timelock-backend/pkg/logger"
)

// Manager 扫链管理器
type Manager struct {
	config              *config.Config
	chainRepo           chain.Repository
	timelockRepo        timelock.Repository
	progressRepo        scanner.ProgressRepository
	txRepo              scanner.TransactionRepository
	flowRepo            scanner.FlowRepository
	rpcManager          *RPCManager
	chainScanners       map[int]*ChainScanner
	flowRefresher       *FlowStatusRefresher
	emailService        EmailService
	notificationService NotificationService
	mutex               sync.RWMutex
	stopCh              chan struct{}
	wg                  sync.WaitGroup
	isRunning           bool
}

// NewManager 创建扫链管理器
func NewManager(
	cfg *config.Config,
	chainRepo chain.Repository,
	timelockRepo timelock.Repository,
	progressRepo scanner.ProgressRepository,
	txRepo scanner.TransactionRepository,
	flowRepo scanner.FlowRepository,
	rpcManager *RPCManager,
	emailService EmailService,
	notificationService NotificationService,
) *Manager {
	// 创建流程状态刷新器
	flowRefresher := NewFlowStatusRefresher(cfg, flowRepo, timelockRepo, emailService, notificationService)

	return &Manager{
		config:              cfg,
		chainRepo:           chainRepo,
		timelockRepo:        timelockRepo,
		progressRepo:        progressRepo,
		txRepo:              txRepo,
		flowRepo:            flowRepo,
		rpcManager:          rpcManager,
		chainScanners:       make(map[int]*ChainScanner),
		flowRefresher:       flowRefresher,
		emailService:        emailService,
		notificationService: notificationService,
		stopCh:              make(chan struct{}),
	}
}

// Start 启动扫链管理器
func (m *Manager) Start(ctx context.Context) error {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	if m.isRunning {
		return fmt.Errorf("scanner manager is already running")
	}

	logger.Info("Starting Scanner Manager")

	// 获取启用RPC的链
	chains, err := m.chainRepo.GetRPCEnabledChains(ctx, m.config.RPC.IncludeTestnets)
	if err != nil {
		logger.Error("Failed to get RPC enabled chains", err)
		return fmt.Errorf("failed to get RPC enabled chains: %w", err)
	}

	// 为每条链创建和启动扫描器
	for _, chainInfo := range chains {
		if err := m.startChainScanner(ctx, &chainInfo); err != nil {
			logger.Error("Failed to start chain scanner", err, "chain_name", chainInfo.ChainName, "chain_id", chainInfo.ChainID)
			continue
		}
	}

	// 启动流程状态刷新器
	m.wg.Add(1)
	go func() {
		defer m.wg.Done()
		if err := m.flowRefresher.Start(ctx); err != nil {
			logger.Error("Flow status refresher stopped with error", err)
		}
	}()

	// 启动监控协程
	m.wg.Add(1)
	go m.monitorLoop(ctx)

	m.isRunning = true
	logger.Info("Scanner Manager started successfully", "chains_count", len(chains))
	return nil
}

// Stop 停止扫链管理器
func (m *Manager) Stop() {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	if !m.isRunning {
		return
	}

	logger.Info("Stopping Scanner Manager")

	// 停止流程状态刷新器
	if m.flowRefresher != nil {
		m.flowRefresher.Stop()
	}

	// 发送停止信号
	close(m.stopCh)

	// 停止所有链扫描器
	var scannerWg sync.WaitGroup
	for chainID, scanner := range m.chainScanners {
		logger.Info("Stopping chain scanner", "chain_id", chainID)
		scannerWg.Add(1)
		go func(s *ChainScanner, id int) {
			defer scannerWg.Done()
			s.Stop()
			logger.Info("Chain scanner stopped", "chain_id", id)
		}(scanner, chainID)
	}

	// 等待所有链扫描器停止，带超时
	logger.Info("Waiting for all chain scanners to stop...")
	done := make(chan struct{})
	go func() {
		scannerWg.Wait()
		close(done)
	}()

	select {
	case <-done:
		logger.Info("All chain scanners stopped")
	case <-time.After(10 * time.Second):
		logger.Error("Timeout waiting for chain scanners to stop, continuing...", nil)
	}

	// 等待管理器自身的协程结束，带超时
	logger.Info("Waiting for manager goroutines to stop...")
	done = make(chan struct{})
	go func() {
		m.wg.Wait()
		close(done)
	}()

	select {
	case <-done:
		logger.Info("Manager goroutines stopped")
	case <-time.After(5 * time.Second):
		logger.Error("Timeout waiting for manager goroutines to stop, continuing...", nil)
	}

	// 清理扫描器映射
	m.chainScanners = make(map[int]*ChainScanner)

	m.isRunning = false
	logger.Info("Scanner Manager stopped successfully")
}

// startChainScanner 启动单链扫描器
func (m *Manager) startChainScanner(ctx context.Context, chainInfo *types.ChainRPCInfo) error {
	// 获取或创建扫描进度
	progress, err := m.getOrCreateProgress(ctx, chainInfo)
	if err != nil {
		return fmt.Errorf("failed to get scan progress for chain %d: %w", chainInfo.ChainID, err)
	}

	// 创建链扫描器
	chainScanner := NewChainScanner(
		m.config,
		chainInfo,
		progress,
		m.rpcManager,
		m.progressRepo,
		m.txRepo,
		m.flowRepo,
		m.emailService,
		m.notificationService,
		m.timelockRepo,
	)

	// 启动扫描器
	if err := chainScanner.Start(ctx); err != nil {
		return fmt.Errorf("failed to start chain scanner for chain %d: %w", chainInfo.ChainID, err)
	}

	// 保存扫描器引用
	m.chainScanners[chainInfo.ChainID] = chainScanner
	return nil
}

// getOrCreateProgress 获取或创建扫描进度
func (m *Manager) getOrCreateProgress(ctx context.Context, chainInfo *types.ChainRPCInfo) (*types.BlockScanProgress, error) {
	// 尝试获取现有进度
	progress, err := m.progressRepo.GetProgressByChainID(ctx, chainInfo.ChainID)
	if err != nil {
		return nil, err
	}

	// 如果没有进度记录，创建新的
	if progress == nil {
		progress = &types.BlockScanProgress{
			ChainID:            chainInfo.ChainID,
			ChainName:          chainInfo.ChainName,
			LastScannedBlock:   0, // 从创世区块开始
			LatestNetworkBlock: 0,
			ScanStatus:         "running",
			LastUpdateTime:     time.Now(),
		}

		if err := m.progressRepo.CreateProgress(ctx, progress); err != nil {
			return nil, fmt.Errorf("failed to create scan progress: %w", err)
		}
	}

	return progress, nil
}

// monitorLoop 监控循环
func (m *Manager) monitorLoop(ctx context.Context) {
	defer m.wg.Done()

	ticker := time.NewTicker(time.Minute * 5) // 每5分钟监控一次
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			logger.Info("Scanner monitor loop stopped by context")
			return
		case <-m.stopCh:
			logger.Info("Scanner monitor loop stopped by stop channel")
			return
		case <-ticker.C:
			m.performHealthCheck(ctx)
		}
	}
}

// performHealthCheck 执行健康检查
func (m *Manager) performHealthCheck(ctx context.Context) {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	healthyScanners := 0
	errorScanners := 0

	for chainID, scanner := range m.chainScanners {
		status := scanner.GetStatus()

		switch status.ScanStatus {
		case "running":
			healthyScanners++
		case "error":
			errorScanners++
			logger.Warn("Chain scanner in error state", "chain_id", chainID, "error", status.ErrorMessage)
		case "paused":
			logger.Info("Chain scanner is paused", "chain_id", chainID)
		}
	}
}

// GetStatus 获取扫链管理器状态
func (m *Manager) GetStatus() map[string]interface{} {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	scannerStatus := make(map[string]interface{})

	for chainID, scanner := range m.chainScanners {
		status := scanner.GetStatus()
		scannerStatus[fmt.Sprintf("chain_%d", chainID)] = status
	}

	return map[string]interface{}{
		"is_running":        m.isRunning,
		"total_scanners":    len(m.chainScanners),
		"scanner_details":   scannerStatus,
		"last_health_check": time.Now(),
	}
}

// RestartChainScanner 重启指定链的扫描器
func (m *Manager) RestartChainScanner(ctx context.Context, chainID int) error {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	// 停止现有扫描器
	if scanner, exists := m.chainScanners[chainID]; exists {
		scanner.Stop()
		delete(m.chainScanners, chainID)
	}

	// 获取链信息
	chains, err := m.chainRepo.GetRPCEnabledChains(ctx, m.config.RPC.IncludeTestnets)
	if err != nil {
		return fmt.Errorf("failed to get chain info: %w", err)
	}

	var targetChain *types.ChainRPCInfo
	for _, chainInfo := range chains {
		if chainInfo.ChainID == chainID {
			targetChain = &chainInfo
			break
		}
	}

	if targetChain == nil {
		return fmt.Errorf("chain %d not found or not enabled", chainID)
	}

	// 重新启动扫描器
	return m.startChainScanner(ctx, targetChain)
}

// RescanFromBlock 从指定区块重新扫描
func (m *Manager) RescanFromBlock(ctx context.Context, chainID int, fromBlock int64) error {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	// 停止扫描器
	if scanner, exists := m.chainScanners[chainID]; exists {
		scanner.Stop()
		delete(m.chainScanners, chainID)
	}

	// 更新扫描进度
	progress, err := m.progressRepo.GetProgressByChainID(ctx, chainID)
	if err != nil {
		return fmt.Errorf("failed to get scan progress: %w", err)
	}

	if progress == nil {
		return fmt.Errorf("no scan progress found for chain %d", chainID)
	}

	progress.LastScannedBlock = fromBlock
	progress.ScanStatus = "running"
	progress.ErrorMessage = nil

	if err := m.progressRepo.UpdateProgress(ctx, progress); err != nil {
		return fmt.Errorf("failed to update scan progress: %w", err)
	}

	// 重新启动扫描器
	chains, err := m.chainRepo.GetRPCEnabledChains(ctx, m.config.RPC.IncludeTestnets)
	if err != nil {
		return fmt.Errorf("failed to get chain info: %w", err)
	}

	for _, chainInfo := range chains {
		if chainInfo.ChainID == chainID {
			return m.startChainScanner(ctx, &chainInfo)
		}
	}

	return fmt.Errorf("chain %d not found or not enabled", chainID)
}
