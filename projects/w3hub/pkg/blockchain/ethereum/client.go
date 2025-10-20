package ethereum

import (
	"context"
	"math/big"
	"time"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"
	"/Users/liu/2025/web3/eth2025hackathon/ETHShanghai-2025/pkg/blockchain"
)

type EthereumClient struct {
	client *ethclient.Client
}

func NewEthereumClient(rpcURL string) (*EthereumClient, error) {
	client, err := ethclient.Dial(rpcURL)
	if err != nil {
		return nil, err
	}
	return &EthereumClient{client: client}, nil
}

func (e *EthereumClient) GetBalance(ctx context.Context, address string) (float64, error) {
	if !common.IsHexAddress(address) {
		return 0, fmt.Errorf("无效的以太坊地址: %s", address)
	}

	account := common.HexToAddress(address)
	balance, err := e.client.BalanceAt(ctx, account, nil)
	if err != nil {
		if err == context.DeadlineExceeded {
			return 0, fmt.Errorf("获取余额超时: %w", err)
		}
		return 0, fmt.Errorf("区块链RPC错误: %w", err)
	}

	// 转换为ETH单位
	ethValue := new(big.Float).Quo(
		new(big.Float).SetInt(balance),
		big.NewFloat(1e18),
	)
	
	result, accuracy := ethValue.Float64()
	if accuracy != big.Exact {
		log.Printf("警告: 余额转换存在精度损失 address=%s balance=%s", address, balance.String())
	}
	
	return result, nil
}

func (e *EthereumClient) GetAssets(ctx context.Context, address string) ([]blockchain.Asset, error) {
	balance, err := e.GetBalance(ctx, address)
	if err != nil {
		return nil, err
	}
	return []blockchain.Asset{
		{
			Address:     address,
			Balance:     balance,
			TokenType:   "ETH",
			LastUpdated: time.Now(),
		},
	}, nil
}

func (e *EthereumClient) GetTransactions(ctx context.Context, address string, from, to time.Time) ([]blockchain.Transaction, error) {
	// 实现交易历史查询
	return nil, nil
}

func (e *EthereumClient) WatchAddress(ctx context.Context, address string) (<-chan blockchain.Transaction, error) {
	if !common.IsHexAddress(address) {
		return nil, fmt.Errorf("invalid Ethereum address: %s", address)
	}

	account := common.HexToAddress(address)
	txChan := make(chan blockchain.Transaction)
	
	// 订阅新区块头
	headers := make(chan *types.Header)
	sub, err := e.client.SubscribeNewHead(ctx, headers)
	if err != nil {
		return nil, fmt.Errorf("failed to subscribe to new heads: %w", err)
	}

	go func() {
		defer close(txChan)
		defer sub.Unsubscribe()

		for {
			select {
			case <-ctx.Done():
				return
			case err := <-sub.Err():
				log.Printf("Subscription error: %v", err)
				return
			case header := <-headers:
				block, err := e.client.BlockByHash(ctx, header.Hash())
				if err != nil {
					log.Printf("Failed to get block: %v", err)
					continue
				}

				for _, tx := range block.Transactions() {
					// 只监控与目标地址相关的交易
					if tx.To() != nil && *tx.To() == account || tx.From() == account {
						txChan <- blockchain.Transaction{
							Hash:        tx.Hash().Hex(),
							From:        tx.From().Hex(),
							To:          tx.To().Hex(),
							Value:       new(big.Float).Quo(new(big.Float).SetInt(tx.Value()), big.NewFloat(1e18)).String(),
							Timestamp:   time.Unix(int64(block.Time()), 0),
							BlockNumber: block.NumberU64(),
						}
					}
				}
			}
		}
	}()

	return txChan, nil
}