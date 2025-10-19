package scanner

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"timelock-backend/internal/config"
	"timelock-backend/internal/repository/chain"
	"timelock-backend/internal/types"
	"timelock-backend/pkg/logger"

	"github.com/ethereum/go-ethereum/ethclient"
)

// RPCManager RPC管理器
type RPCManager struct {
	config    *config.ScannerConfig
	rpcConfig *config.RPCConfig
	chainRepo chain.Repository
	clients   map[int]*ethclient.Client // 直接使用chainID作为key
	mutex     sync.RWMutex
}

// NewRPCManager 创建RPC管理器
func NewRPCManager(cfg *config.Config, chainRepo chain.Repository) *RPCManager {
	return &RPCManager{
		config:    &cfg.Scanner,
		rpcConfig: &cfg.RPC,
		chainRepo: chainRepo,
		clients:   make(map[int]*ethclient.Client),
	}
}

// Start 启动RPC管理器
func (rm *RPCManager) Start(ctx context.Context) error {
	logger.Info("Starting simplified RPC Manager")

	// 获取启用RPC的链
	chains, err := rm.chainRepo.GetRPCEnabledChains(ctx, rm.rpcConfig.IncludeTestnets)
	if err != nil {
		logger.Error("Failed to get RPC enabled chains", err)
		return fmt.Errorf("failed to get RPC enabled chains: %w", err)
	}

	// 检查Alchemy API Key
	if rm.rpcConfig.AlchemyAPIKey == "" {
		return fmt.Errorf("alchemy API key is required")
	}

	// 初始化每条链的Alchemy RPC连接
	for _, chainInfo := range chains {
		if err := rm.initChainAlchemyRPC(ctx, &chainInfo); err != nil {
			logger.Error("Failed to init Alchemy RPC for chain", err, "chain_name", chainInfo.ChainName)
			continue
		}
	}

	logger.Info("RPC Manager started successfully", "chains_count", len(chains))
	return nil
}

// Stop 停止RPC管理器
func (rm *RPCManager) Stop() {
	logger.Info("Stopping RPC Manager")

	rm.mutex.Lock()
	defer rm.mutex.Unlock()

	// 关闭所有RPC连接
	for chainID, client := range rm.clients {
		if client != nil {
			client.Close()
			logger.Debug("Closed RPC client", "chain_id", chainID)
		}
	}

	// 清理客户端映射
	rm.clients = make(map[int]*ethclient.Client)

	logger.Info("RPC Manager stopped successfully")
}

// GetClient 获取指定链的RPC客户端
func (rm *RPCManager) GetClient(chainID int) (*ethclient.Client, error) {
	rm.mutex.RLock()
	client, exists := rm.clients[chainID]
	rm.mutex.RUnlock()

	if !exists || client == nil {
		return nil, fmt.Errorf("no RPC client available for chain %d", chainID)
	}

	return client, nil
}

// GetOrCreateClient 获取或创建指定链的RPC客户端
func (rm *RPCManager) GetOrCreateClient(ctx context.Context, chainID int) (*ethclient.Client, error) {
	// 先尝试获取现有客户端
	client, err := rm.GetClient(chainID)
	if err == nil {
		return client, nil
	}

	// 如果没有客户端，从RPC配置中查找并创建
	chains, err := rm.chainRepo.GetRPCEnabledChains(ctx, rm.rpcConfig.IncludeTestnets)
	if err != nil {
		return nil, fmt.Errorf("failed to get RPC enabled chains: %w", err)
	}

	// 查找对应的链配置
	for _, chainInfo := range chains {
		if chainInfo.ChainID == chainID {
			if chainInfo.AlchemyRPCTemplate == nil {
				return nil, fmt.Errorf("no alchemy RPC template for chain %d", chainID)
			}

			rpcURL := strings.Replace(*chainInfo.AlchemyRPCTemplate, "{KEY}", rm.rpcConfig.AlchemyAPIKey, 1)
			return rm.createClient(ctx, chainID, rpcURL)
		}
	}

	return nil, fmt.Errorf("chain %d not found in RPC enabled chains", chainID)
}

// initChainAlchemyRPC 初始化单链的Alchemy RPC连接
func (rm *RPCManager) initChainAlchemyRPC(ctx context.Context, chainInfo *types.ChainRPCInfo) error {
	if chainInfo.AlchemyRPCTemplate == nil {
		logger.Warn("No Alchemy RPC template for chain", "chain_name", chainInfo.ChainName)
		return nil
	}

	rpcURL := strings.Replace(*chainInfo.AlchemyRPCTemplate, "{KEY}", rm.rpcConfig.AlchemyAPIKey, 1)
	_, err := rm.createClient(ctx, chainInfo.ChainID, rpcURL)
	return err
}

// createClient 创建RPC客户端
func (rm *RPCManager) createClient(ctx context.Context, chainID int, rpcURL string) (*ethclient.Client, error) {
	// 创建带超时的上下文
	dialCtx, cancel := context.WithTimeout(ctx, rm.config.RPCTimeout)
	defer cancel()

	// 创建RPC客户端
	client, err := ethclient.DialContext(dialCtx, rpcURL)
	if err != nil {
		logger.Error("Failed to dial Alchemy RPC", err, "chain_id", chainID, "url", rpcURL)
		return nil, fmt.Errorf("failed to dial RPC %s: %w", rpcURL, err)
	}

	// 测试连接
	_, err = client.ChainID(dialCtx)

	if err != nil {
		logger.Error("Failed to test RPC connection", err, "chain_id", chainID, "url", rpcURL)
		client.Close()
		return nil, fmt.Errorf("failed to test RPC connection %s: %w", rpcURL, err)
	}

	// 保存客户端
	rm.mutex.Lock()
	rm.clients[chainID] = client
	rm.mutex.Unlock()

	return client, nil
}

// ExecuteWithRetry 带重试的RPC调用执行
func (rm *RPCManager) ExecuteWithRetry(ctx context.Context, chainID int, fn func(*ethclient.Client) error) error {
	var lastErr error
	retryDelay := rm.config.RPCRetryDelay

	for i := 0; i < rm.config.RPCRetryMax; i++ {
		client, err := rm.GetOrCreateClient(ctx, chainID)
		if err != nil {
			lastErr = err
			logger.Warn("Failed to get RPC client", "chain_id", chainID, "attempt", i+1, "error", err)

			// 等待重试延迟
			if i < rm.config.RPCRetryMax-1 {
				select {
				case <-ctx.Done():
					return ctx.Err()
				case <-time.After(retryDelay):
					retryDelay *= 2 // 指数退避
				}
			}
			continue
		}

		// 执行RPC调用
		if err := fn(client); err != nil {
			lastErr = err
			logger.Warn("RPC call failed", "chain_id", chainID, "attempt", i+1, "error", err)

			// 如果是连接错误，移除客户端以便下次重新创建
			rm.removeClient(chainID)

			// 等待重试延迟
			if i < rm.config.RPCRetryMax-1 {
				select {
				case <-ctx.Done():
					return ctx.Err()
				case <-time.After(retryDelay):
					retryDelay *= 2 // 指数退避
				}
			}
			continue
		}

		// 成功执行
		return nil
	}

	logger.Error("RPC call failed after all retries", lastErr, "chain_id", chainID, "max_retries", rm.config.RPCRetryMax)
	return fmt.Errorf("RPC call failed after %d retries: %w", rm.config.RPCRetryMax, lastErr)
}

// removeClient 移除指定链的客户端
func (rm *RPCManager) removeClient(chainID int) {
	rm.mutex.Lock()
	defer rm.mutex.Unlock()

	if client, exists := rm.clients[chainID]; exists && client != nil {
		client.Close()
		delete(rm.clients, chainID)
		logger.Debug("Removed RPC client", "chain_id", chainID)
	}
}

// GetStatus 获取RPC管理器状态
func (rm *RPCManager) GetStatus() map[string]interface{} {
	rm.mutex.RLock()
	defer rm.mutex.RUnlock()

	status := map[string]interface{}{
		"total_clients": len(rm.clients),
		"chains":        make([]int, 0, len(rm.clients)),
	}

	for chainID := range rm.clients {
		status["chains"] = append(status["chains"].([]int), chainID)
	}

	return status
}
