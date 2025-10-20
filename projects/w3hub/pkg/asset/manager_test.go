package asset

import (
	"context"
	"database/sql"
	"testing"
	"time"

	"github.com/w3hub/core/pkg/blockchain"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

type MockBlockchainClient struct {
	mock.Mock
}

func (m *MockBlockchainClient) GetBalance(ctx context.Context, address string) (float64, error) {
	args := m.Called(ctx, address)
	return args.Get(0).(float64), args.Error(1)
}

func (m *MockBlockchainClient) GetAssets(ctx context.Context, address string) ([]blockchain.Asset, error) {
	args := m.Called(ctx, address)
	return args.Get(0).([]blockchain.Asset), args.Error(1)
}

func (m *MockBlockchainClient) GetTransactions(ctx context.Context, address string, from, to time.Time) ([]blockchain.Transaction, error) {
	args := m.Called(ctx, address, from, to)
	return args.Get(0).([]blockchain.Transaction), args.Error(1)
}

func (m *MockBlockchainClient) WatchAddress(ctx context.Context, address string) (<-chan blockchain.Transaction, error) {
	args := m.Called(ctx, address)
	return args.Get(0).(<-chan blockchain.Transaction), args.Error(1)
}

func TestTrackAssets(t *testing.T) {
	// 初始化模拟依赖
	db, _ := sql.Open("sqlite3", ":memory:")
	defer db.Close()
	
	mockClient := new(MockBlockchainClient)
	manager := NewManager(db, mockClient)

	// 设置模拟期望
	testAddress := "0x1234567890abcdef"
	mockClient.On("GetAssets", mock.Anything, testAddress).
		Return([]blockchain.Asset{
			{
				Address:     testAddress,
				Balance:     1.5,
				TokenType:   "ETH",
				LastUpdated: time.Now(),
			},
		}, nil)

	// 执行测试
	err := manager.TrackAssets(context.Background(), "ethereum", []string{testAddress})
	assert.NoError(t, err)

	// 验证模拟调用
	mockClient.AssertExpectations(t)
}

func TestGetAssetHistory(t *testing.T) {
	// 初始化测试数据库
	db, _ := sql.Open("sqlite3", ":memory:")
	defer db.Close()
	
	// 创建测试表并插入数据
	db.Exec(`CREATE TABLE assets (
		id INTEGER PRIMARY KEY,
		chain_type TEXT,
		address TEXT,
		balance REAL,
		token_type TEXT,
		last_updated TIMESTAMP
	)`)
	
	db.Exec(`CREATE TABLE asset_history (
		id INTEGER PRIMARY KEY,
		asset_id INTEGER,
		balance REAL,
		timestamp TIMESTAMP
	)`)
	
	db.Exec(`INSERT INTO assets VALUES (1, 'ethereum', '0x123', 1.5, 'ETH', '2025-10-20')`)
	db.Exec(`INSERT INTO asset_history VALUES (1, 1, 1.0, '2025-10-19')`)
	db.Exec(`INSERT INTO asset_history VALUES (2, 1, 1.5, '2025-10-20')`)

	manager := NewManager(db, nil)

	// 执行测试
	history, err := manager.GetAssetHistory(context.Background(), "1", 
		time.Date(2025, 10, 19, 0, 0, 0, 0, time.UTC),
		time.Date(2025, 10, 21, 0, 0, 0, 0, time.UTC))
	
	assert.NoError(t, err)
	assert.Len(t, history, 2)
	assert.Equal(t, 1.0, history[0].Balance)
	assert.Equal(t, 1.5, history[1].Balance)
}