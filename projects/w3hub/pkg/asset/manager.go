package asset

import (
	"context"
	"database/sql"
	"time"

	"github.com/q23818/ETHShanghai-2025/projects/w3hub/pkg/blockchain"
)

type Asset struct {
	ID          string
	ChainType   string
	Address     string
	Balance     float64
	TokenType   string
	LastUpdated time.Time
}

type Manager struct {
	db          *sql.DB
	chainClient blockchain.Client
}

func NewManager(db *sql.DB, client blockchain.Client) *Manager {
	return &Manager{
		db:          db,
		chainClient: client,
	}
}

// TrackAssets 监控指定链上的资产
func (m *Manager) TrackAssets(ctx context.Context, chainType string, addresses []string) error {
	if len(addresses) == 0 {
		return fmt.Errorf("至少需要提供一个地址")
	}

	client, ok := m.chainClient.GetClient(chainType)
	if !ok {
		return fmt.Errorf("不支持的链类型: %s", chainType)
	}

	for _, addr := range addresses {
		assets, err := client.GetAssets(ctx, addr)
		if err != nil {
			return fmt.Errorf("获取资产失败: %w", err)
		}

		// 保存资产快照
		tx, err := m.db.BeginTx(ctx, nil)
		if err != nil {
			return fmt.Errorf("启动事务失败: %w", err)
		}

		for _, asset := range assets {
			_, err = tx.ExecContext(ctx,
				`INSERT OR REPLACE INTO assets 
				(chain_type, address, balance, token_type, last_updated)
				VALUES (?, ?, ?, ?, ?)`,
				chainType, asset.Address, asset.Balance, 
				asset.TokenType, asset.LastUpdated)
			if err != nil {
				tx.Rollback()
				return fmt.Errorf("保存资产失败: %w", err)
			}
		}

		if err := tx.Commit(); err != nil {
			return fmt.Errorf("提交事务失败: %w", err)
		}
	}
	return nil
}

// GetAssetHistory 获取资产历史记录
func (m *Manager) GetAssetHistory(ctx context.Context, assetID string, from, to time.Time) ([]Asset, error) {
	// 实现历史查询逻辑
	return nil, nil
}