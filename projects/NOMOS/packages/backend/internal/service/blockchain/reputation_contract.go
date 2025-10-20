package blockchain

import (
	"context"
	"crypto/ecdsa"
	"fmt"
	"math/big"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"

	"github.com/KamisAyaka/crowdsourcing_graphql/packages/backend/pkg/logger"
)

type ReputationContract struct {
	client     *ethclient.Client
	privateKey *ecdsa.PrivateKey
	address    common.Address
	chainID    *big.Int
}

func NewReputationContract(rpcURL, privateKeyHex, contractAddress string, chainID int64) (*ReputationContract, error) {
	// 连接到以太坊节点
	client, err := ethclient.Dial(rpcURL)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to ethereum: %w", err)
	}

	// 解析私钥
	privateKey, err := crypto.HexToECDSA(privateKeyHex)
	if err != nil {
		return nil, fmt.Errorf("failed to parse private key: %w", err)
	}

	return &ReputationContract{
		client:     client,
		privateKey: privateKey,
		address:    common.HexToAddress(contractAddress),
		chainID:    big.NewInt(chainID),
	}, nil
}

// UpdateUserScore 更新用户评分到链上
func (rc *ReputationContract) UpdateUserScore(ctx context.Context, userAddress string, score float64, tier string) error {
	// 创建交易选项
	auth, err := bind.NewKeyedTransactorWithChainID(rc.privateKey, rc.chainID)
	if err != nil {
		return fmt.Errorf("failed to create transactor: %w", err)
	}

	// 设置 Gas 参数
	gasPrice, err := rc.client.SuggestGasPrice(ctx)
	if err != nil {
		return fmt.Errorf("failed to suggest gas price: %w", err)
	}
	auth.GasPrice = gasPrice
	auth.GasLimit = uint64(300000)

	// 将分数转换为 uint256 (乘以 100 保留两位小数)
	scoreUint := big.NewInt(int64(score * 100))

	// TODO: 调用智能合约的 updateScore 方法
	// 实际实现需要根据你的合约 ABI 生成绑定代码
	logger.Info("Updating score on chain (simulated)",
		"user", userAddress,
		"score", score,
		"tier", tier,
		"scoreUint", scoreUint.String(),
	)

	return nil
}

// GetUserScore 从链上读取用户评分
func (rc *ReputationContract) GetUserScore(ctx context.Context, userAddress string) (*big.Int, string, error) {
	// TODO: 调用智能合约的 getScore 方法
	return big.NewInt(0), "", nil
}

func (rc *ReputationContract) Close() {
	rc.client.Close()
}
