package blockchain

import (
	"context"
	"time"
)

type Asset struct {
	Address     string
	Balance     float64
	TokenType   string
	LastUpdated time.Time
}

type Transaction struct {
	Hash        string
	From        string
	To          string
	Value       float64
	Timestamp   time.Time
	BlockNumber uint64
}

type Client interface {
	// 获取地址资产余额
	GetBalance(ctx context.Context, address string) (float64, error)
	
	// 获取地址所有资产
	GetAssets(ctx context.Context, address string) ([]Asset, error)
	
	// 获取地址交易历史
	GetTransactions(ctx context.Context, address string, from, to time.Time) ([]Transaction, error)
	
	// 监控地址变动
	WatchAddress(ctx context.Context, address string) (<-chan Transaction, error)
}

// 多链客户端管理器
type MultiChainClient struct {
	clients map[string]Client
}

func NewMultiChainClient() *MultiChainClient {
	return &MultiChainClient{
		clients: make(map[string]Client),
	}
}

func (m *MultiChainClient) RegisterClient(chainType string, client Client) {
	m.clients[chainType] = client
}

func (m *MultiChainClient) GetClient(chainType string) (Client, bool) {
	client, ok := m.clients[chainType]
	return client, ok
}