package crypto

import (
	"errors"
	"fmt"
	"strings"
	"time"
	"timelock-backend/pkg/logger"

	"github.com/ethereum/go-ethereum/accounts"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/common/hexutil"
	"github.com/ethereum/go-ethereum/crypto"
)

// VerifySignature 验证以太坊签名
// message: 原始消息
// signature: 签名（hex格式）
// address: 期望的签名者地址
func VerifySignature(message, signature, address string) error {
	// 清理地址格式
	if !common.IsHexAddress(address) {
		logger.Error("VerifySignature Error: ", errors.New("invalid ethereum address format"))
		return errors.New("invalid ethereum address format")
	}
	// 转换地址格式
	expectedAddress := common.HexToAddress(address)

	// 验证签名格式
	if !strings.HasPrefix(signature, "0x") {
		logger.Error("VerifySignature Error: ", errors.New("signature must start with 0x"))
		return errors.New("signature must start with 0x")
	}

	// 解码签名
	signatureBytes, err := hexutil.Decode(signature)
	if err != nil {
		logger.Error("VerifySignature Error: ", errors.New("invalid signature hex"))
		return fmt.Errorf("invalid signature hex: %w", err)
	}

	if len(signatureBytes) != 65 {
		logger.Error("VerifySignature Error: ", errors.New("signature must be 65 bytes long"))
		return errors.New("signature must be 65 bytes long")
	}

	// 以太坊签名的v值需要调整
	if signatureBytes[64] == 27 || signatureBytes[64] == 28 {
		signatureBytes[64] -= 27
	}

	// 创建带有以太坊前缀的消息哈希
	messageHash := accounts.TextHash([]byte(message))

	// 从签名中恢复公钥
	publicKey, err := crypto.SigToPub(messageHash, signatureBytes)
	if err != nil {
		logger.Error("VerifySignature Error: ", errors.New("failed to recover public key"))
		return fmt.Errorf("failed to recover public key: %w", err)
	}

	// 从公钥生成地址
	recoveredAddress := crypto.PubkeyToAddress(*publicKey)

	// 比较地址
	if recoveredAddress != expectedAddress {
		logger.Error("VerifySignature Error: ", errors.New("signature verification failed"), "expected: ", expectedAddress.Hex(), "recovered: ", recoveredAddress.Hex())
		return fmt.Errorf("signature verification failed: expected %s, got %s", expectedAddress.Hex(), recoveredAddress.Hex())
	}

	return nil
}

// RecoverAddress 从签名中恢复地址
func RecoverAddress(message, signature string) (string, error) {
	// 验证签名格式
	if !strings.HasPrefix(signature, "0x") {
		logger.Error("RecoverAddress Error: ", errors.New("signature must start with 0x"))
		return "", errors.New("signature must start with 0x")
	}

	// 解码签名
	signatureBytes, err := hexutil.Decode(signature)
	if err != nil {
		logger.Error("RecoverAddress Error: ", errors.New("invalid signature hex"))
		return "", fmt.Errorf("invalid signature hex: %w", err)
	}

	if len(signatureBytes) != 65 {
		logger.Error("RecoverAddress Error: ", errors.New("signature must be 65 bytes long"))
		return "", errors.New("signature must be 65 bytes long")
	}

	// 以太坊签名的v值需要调整
	if signatureBytes[64] == 27 || signatureBytes[64] == 28 {
		signatureBytes[64] -= 27
	}

	// 创建带有以太坊前缀的消息哈希
	messageHash := accounts.TextHash([]byte(message))

	// 从签名中恢复公钥
	publicKey, err := crypto.SigToPub(messageHash, signatureBytes)
	if err != nil {
		logger.Error("RecoverAddress Error: ", errors.New("failed to recover public key"))
		return "", fmt.Errorf("failed to recover public key: %w", err)
	}

	// 从公钥生成地址
	recoveredAddress := crypto.PubkeyToAddress(*publicKey)

	return recoveredAddress.Hex(), nil
}

// ValidateEthereumAddress 验证以太坊地址格式
func ValidateEthereumAddress(address string) bool {
	return common.IsHexAddress(address)
}

// NormalizeAddress 标准化地址格式（转为小写）
func NormalizeAddress(address string) string {
	return strings.ToLower(address)
}

// GenerateNonce 生成用于签名的随机nonce
func GenerateNonce() string {
	// 基于时间戳给一个随机的字符串
	random := fmt.Sprintf("%d", time.Now().UnixNano())
	return fmt.Sprintf("TimeLock Login Nonce: %d", crypto.Keccak256Hash([]byte(fmt.Sprintf("%d", crypto.Keccak256Hash([]byte(random)).Big().Int64()))).Big().Int64())
}
