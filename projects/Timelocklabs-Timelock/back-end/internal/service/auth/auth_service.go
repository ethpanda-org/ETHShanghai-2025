package auth

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"time"

	"timelock-backend/internal/repository/safe"
	"timelock-backend/internal/repository/user"
	"timelock-backend/internal/service/scanner"
	"timelock-backend/internal/types"
	"timelock-backend/pkg/crypto"
	"timelock-backend/pkg/logger"
	"timelock-backend/pkg/utils"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"
	"gorm.io/gorm"
)

var (
	ErrInvalidSignature  = errors.New("invalid signature")
	ErrInvalidAddress    = errors.New("invalid wallet address")
	ErrUserNotFound      = errors.New("user not found")
	ErrInvalidToken      = errors.New("invalid token")
	ErrTokenExpired      = errors.New("token expired")
	ErrSignatureRecovery = errors.New("failed to recover address from signature")
	ErrInvalidNonce      = errors.New("invalid or expired nonce")
	ErrNonceUsed         = errors.New("nonce already used")
)

// Service 认证服务接口 - 支持链切换
type Service interface {
	GetNonce(ctx context.Context, req *types.GetNonceRequest) (*types.GetNonceResponse, error)
	WalletConnect(ctx context.Context, req *types.WalletConnectRequest) (*types.WalletConnectResponse, error)
	RefreshToken(ctx context.Context, req *types.RefreshTokenRequest) (*types.WalletConnectResponse, error)
	GetProfile(ctx context.Context, walletAddress string) (*types.UserProfile, error)
	VerifyToken(ctx context.Context, tokenString string) (*types.JWTClaims, error)
}

type service struct {
	userRepo   user.Repository
	safeRepo   safe.Repository
	rpcManager *scanner.RPCManager
	jwtManager *utils.JWTManager
}

func NewService(userRepo user.Repository, safeRepo safe.Repository, rpcManager *scanner.RPCManager, jwtManager *utils.JWTManager) Service {
	return &service{
		userRepo:   userRepo,
		safeRepo:   safeRepo,
		rpcManager: rpcManager,
		jwtManager: jwtManager,
	}
}

// GetNonce 获取认证nonce
func (s *service) GetNonce(ctx context.Context, req *types.GetNonceRequest) (*types.GetNonceResponse, error) {
	logger.Info("GetNonce", "wallet_address", req.WalletAddress)

	// 验证钱包地址格式
	if !crypto.ValidateEthereumAddress(req.WalletAddress) {
		return nil, ErrInvalidAddress
	}

	normalizedAddress := crypto.NormalizeAddress(req.WalletAddress)

	// 生成随机nonce
	nonce := crypto.GenerateNonce()

	// 构造签名消息
	message := fmt.Sprintf("Welcome to TimeLock!\n\nClick to sign in and accept the TimeLock Terms of Service.\n\nThis request will not trigger a blockchain transaction or cost any gas fees.\n\nWallet address:\n%s\n\nNonce:\n%s", normalizedAddress, nonce)

	// 设置过期时间（5分钟）
	expiresAt := time.Now().Add(5 * time.Minute)

	// 清理该钱包地址的所有现有nonce（避免重复键冲突）
	if err := s.cleanupAllNonces(ctx, normalizedAddress); err != nil {
		logger.Error("Failed to cleanup existing nonces", err)
		// 不影响主流程
	}

	// 存储nonce到数据库
	authNonce := &types.AuthNonce{
		WalletAddress: normalizedAddress,
		Nonce:         nonce,
		Message:       message,
		ExpiresAt:     expiresAt,
		IsUsed:        false,
	}

	if err := s.userRepo.CreateAuthNonce(ctx, authNonce); err != nil {
		logger.Error("Failed to create auth nonce", err)
		return nil, fmt.Errorf("failed to create auth nonce: %w", err)
	}

	logger.Info("Generated nonce", "wallet_address", normalizedAddress, "nonce", nonce)
	return &types.GetNonceResponse{
		Message: message,
		Nonce:   nonce,
	}, nil
}

// WalletConnect 处理钱包连接认证（支持EOA和Safe钱包）
func (s *service) WalletConnect(ctx context.Context, req *types.WalletConnectRequest) (*types.WalletConnectResponse, error) {
	logger.Info("WalletConnect", "wallet_address", req.WalletAddress, "wallet_type", req.WalletType)

	// 1. 验证钱包地址格式
	if !crypto.ValidateEthereumAddress(req.WalletAddress) {
		logger.Error("WalletConnect Error: ", ErrInvalidAddress)
		return nil, ErrInvalidAddress
	}

	normalizedAddress := crypto.NormalizeAddress(req.WalletAddress)

	// 2. 根据钱包类型进行不同的验证
	var isSafeWallet bool
	var safeThreshold *int
	var safeOwners *string

	if req.WalletType == "safe" {
		// Safe钱包验证：只需要验证地址是否为Safe合约
		logger.Info("Verifying Safe wallet", "safe_address", normalizedAddress, "chain_id", req.ChainID)

		// 验证是否为Safe合约并获取Safe信息
		safeInfo, err := s.getSafeInfo(ctx, normalizedAddress, req.ChainID)
		if err != nil {
			logger.Error("Failed to verify Safe contract or get Safe info", err)
			return nil, fmt.Errorf("address is not a valid Safe contract: %w", err)
		}

		isSafeWallet = true
		threshold := safeInfo.Threshold
		safeThreshold = &threshold

		ownersJSON, _ := json.Marshal(safeInfo.Owners)
		ownersStr := string(ownersJSON)
		safeOwners = &ownersStr

		logger.Info("Safe wallet verified successfully", "safe_address", normalizedAddress, "threshold", threshold, "owners_count", len(safeInfo.Owners))

	} else {
		// 普通EOA钱包验证：需要nonce和签名验证
		if req.Nonce == "" || req.Message == "" || req.Signature == "" {
			logger.Error("WalletConnect Error: ", fmt.Errorf("EOA wallet requires nonce, message and signature"))
			return nil, fmt.Errorf("EOA wallet requires nonce, message and signature")
		}

		// 验证nonce
		if err := s.validateAndUseNonce(ctx, normalizedAddress, req.Nonce, req.Message); err != nil {
			logger.Error("WalletConnect nonce validation failed", err)
			return nil, err
		}

		// 验证签名
		err := crypto.VerifySignature(req.Message, req.Signature, req.WalletAddress)
		if err != nil {
			// 尝试从签名中恢复地址进行二次验证
			recoveredAddress, recoverErr := crypto.RecoverAddress(req.Message, req.Signature)
			if recoverErr != nil {
				logger.Error("WalletConnect Error: ", ErrSignatureRecovery, recoverErr)
				return nil, fmt.Errorf("%w: %v", ErrSignatureRecovery, recoverErr)
			}

			if strings.ToLower(recoveredAddress) != normalizedAddress {
				logger.Error("WalletConnect Error: ", ErrInvalidSignature)
				return nil, fmt.Errorf("%w: signature does not match wallet address", ErrInvalidSignature)
			}
		}
	}

	// 4. 查找或创建用户
	existingUser, err := s.userRepo.GetUserByWallet(ctx, normalizedAddress)
	var currentUser *types.User

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// 创建新用户
			newUser := &types.User{
				WalletAddress: normalizedAddress,
				Status:        1,
				IsSafeWallet:  isSafeWallet,
				SafeThreshold: safeThreshold,
				SafeOwners:    safeOwners,
			}

			if err := s.userRepo.CreateUser(ctx, newUser); err != nil {
				logger.Error("WalletConnect Error: ", errors.New("failed to create user"), "error: ", err)
				return nil, fmt.Errorf("failed to create user: %w", err)
			}
			currentUser = newUser
			logger.Info("WalletConnect: created new user", "wallet_address", normalizedAddress, "user_id", newUser.ID, "is_safe", isSafeWallet)
		} else {
			logger.Error("WalletConnect Error: ", errors.New("database error"), "error: ", err)
			return nil, fmt.Errorf("database error: %w", err)
		}
	} else {
		// 更新现有用户的Safe信息
		if isSafeWallet {
			existingUser.IsSafeWallet = true
			existingUser.SafeThreshold = safeThreshold
			existingUser.SafeOwners = safeOwners

			if err := s.userRepo.UpdateUser(ctx, existingUser); err != nil {
				logger.Error("Failed to update user safe info", err)
				// 不影响登录流程
			}
		}

		// 更新最后登录时间
		if err := s.userRepo.UpdateLastLogin(ctx, normalizedAddress); err != nil {
			logger.Error("WalletConnect Error: ", errors.New("failed to update last login"), "error: ", err)
		}
		currentUser = existingUser
		logger.Info("WalletConnect: found existing user", "wallet_address", normalizedAddress, "user_id", existingUser.ID, "is_safe", isSafeWallet)
	}

	// 5. 生成JWT令牌
	accessToken, refreshToken, expiresAt, err := s.jwtManager.GenerateTokens(
		currentUser.ID,
		currentUser.WalletAddress,
	)
	if err != nil {
		logger.Error("WalletConnect Error: ", errors.New("failed to generate jwt tokens"), "error: ", err)
		return nil, fmt.Errorf("failed to generate jwt tokens: %w", err)
	}

	logger.Info("WalletConnect Response:", "User: ", currentUser.WalletAddress, "IsSafe:", isSafeWallet)
	return &types.WalletConnectResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresAt:    expiresAt,
		User:         *currentUser,
	}, nil
}

// RefreshToken 刷新访问令牌
func (s *service) RefreshToken(ctx context.Context, req *types.RefreshTokenRequest) (*types.WalletConnectResponse, error) {
	// 1. 验证刷新令牌
	claims, err := s.jwtManager.VerifyRefreshToken(req.RefreshToken)
	if err != nil {
		logger.Error("RefreshToken Error: ", errors.New("failed to verify refresh token"), "error: ", err)
		return nil, fmt.Errorf("%w: %v", ErrInvalidToken, err)
	}

	// 2. 获取用户信息
	user, err := s.userRepo.GetUserByID(ctx, claims.UserID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("user not found")
		}
		logger.Error("RefreshToken Error: ", errors.New("database error"), "error: ", err)
		return nil, fmt.Errorf("database error: %w", err)
	}

	// 3. 验证用户状态
	if user.Status != 1 {
		logger.Error("RefreshToken Error: ", errors.New("user account is disabled"))
		return nil, errors.New("user account is disabled")
	}

	// 4. 生成新的令牌对
	accessToken, refreshToken, expiresAt, err := s.jwtManager.GenerateTokens(
		user.ID,
		user.WalletAddress,
	)
	if err != nil {
		logger.Error("RefreshToken Error: ", errors.New("failed to generate jwt tokens"), "error: ", err)
		return nil, fmt.Errorf("failed to generate tokens: %w", err)
	}

	// 5. 更新最后登录时间
	if err := s.userRepo.UpdateLastLogin(ctx, user.WalletAddress); err != nil {
		// 登录时间更新失败不应该阻止刷新流程
		logger.Error("RefreshToken Error: ", errors.New("failed to update last login"), "error: ", err)
	}

	logger.Info("RefreshToken Response:", "User: ", user.WalletAddress)
	return &types.WalletConnectResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresAt:    expiresAt,
		User:         *user,
	}, nil
}

// GetProfile 获取用户资料
func (s *service) GetProfile(ctx context.Context, walletAddress string) (*types.UserProfile, error) {
	logger.Info("GetProfile: start", "wallet_address", walletAddress)

	// 标准化钱包地址
	normalizedAddress := crypto.NormalizeAddress(walletAddress)

	// 获取用户信息
	user, err := s.userRepo.GetUserByWallet(ctx, normalizedAddress)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		logger.Error("GetProfile Error: ", errors.New("database error"), "error: ", err)
		return nil, fmt.Errorf("database error: %w", err)
	}

	profile := &types.UserProfile{
		WalletAddress: user.WalletAddress,
		CreatedAt:     user.CreatedAt,
		LastLogin:     user.LastLogin,
	}

	logger.Info("GetProfile: success", "user_id", user.ID, "wallet_address", user.WalletAddress)

	return profile, nil
}

// VerifyToken 验证访问令牌
func (s *service) VerifyToken(ctx context.Context, tokenString string) (*types.JWTClaims, error) {
	claims, err := s.jwtManager.VerifyAccessToken(tokenString)
	if err != nil {
		logger.Error("VerifyToken Error: ", errors.New("failed to verify access token"), "error: ", err)
		return nil, fmt.Errorf("%w: %v", ErrInvalidToken, err)
	}

	// 验证用户是否存在且有效
	user, err := s.userRepo.GetUserByID(ctx, claims.UserID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("user not found")
		}
		logger.Error("VerifyToken Error: ", errors.New("database error"), "error: ", err)
		return nil, fmt.Errorf("database error: %w", err)
	}

	if user.Status != 1 {
		logger.Error("VerifyToken Error: ", errors.New("user account is disabled"))
		return nil, errors.New("user account is disabled")
	}

	return claims, nil
}

// getSafeInfo 获取Safe信息（从数据库或链上）
func (s *service) getSafeInfo(ctx context.Context, safeAddress string, chainID int) (*types.SafeInfo, error) {
	logger.Info("getSafeInfo", "safe_address", safeAddress, "chain_id", chainID)

	normalizedAddress := crypto.NormalizeAddress(safeAddress)

	// 先从数据库查询
	safeWallet, err := s.safeRepo.GetSafeByAddress(ctx, normalizedAddress, chainID)
	if err == nil && safeWallet != nil {
		var owners []types.SafeOwner
		if safeWallet.Owners != "" {
			if err := json.Unmarshal([]byte(safeWallet.Owners), &owners); err != nil {
				logger.Error("Failed to unmarshal safe owners", err)
			}
		}

		logger.Info("Found Safe info in database", "safe_address", safeWallet.SafeAddress)
		return &types.SafeInfo{
			SafeAddress: safeWallet.SafeAddress,
			ChainID:     safeWallet.ChainID,
			ChainName:   safeWallet.ChainName,
			Threshold:   safeWallet.Threshold,
			Owners:      owners,
			Version:     safeWallet.Version,
		}, nil
	}

	// 从链上获取Safe信息，复用Safe服务的方法
	logger.Info("Fetching Safe info from blockchain", "safe_address", normalizedAddress, "chain_id", chainID)
	var safeInfo *types.SafeInfo

	err = s.rpcManager.ExecuteWithRetry(ctx, chainID, func(client *ethclient.Client) error {
		info, err := s.getSafeInfoFromContract(ctx, client, normalizedAddress, chainID)
		if err != nil {
			return err
		}
		safeInfo = info
		return nil
	})

	if err != nil {
		logger.Error("Failed to get Safe info from contract", err)
		return nil, fmt.Errorf("failed to get Safe info from contract: %w", err)
	}

	// 同步到数据库
	if err := s.syncSafeInfoToDB(ctx, safeInfo); err != nil {
		logger.Error("Failed to sync Safe info to database", err)
		// 不影响返回结果
	}

	return safeInfo, nil
}

// getSafeInfoFromContract 从合约获取Safe信息
func (s *service) getSafeInfoFromContract(ctx context.Context, client *ethclient.Client, address string, chainID int) (*types.SafeInfo, error) {
	contractAddr := common.HexToAddress(address)
	// 检查合约代码
	code, err := client.CodeAt(ctx, contractAddr, nil)
	if err != nil {
		return nil, err
	}

	if len(code) == 0 {
		return nil, fmt.Errorf("not a valid contract address") // 不是合约地址
	}

	// Safe合约标准方法的ABI
	safeABI := `[
		{"constant":true,"inputs":[],"name":"getThreshold","outputs":[{"name":"","type":"uint256"}],"type":"function"},
		{"constant":true,"inputs":[],"name":"getOwners","outputs":[{"name":"","type":"address[]"}],"type":"function"},
		{"constant":true,"inputs":[],"name":"nonce","outputs":[{"name":"","type":"uint256"}],"type":"function"},
		{"constant":true,"inputs":[],"name":"VERSION","outputs":[{"name":"","type":"string"}],"type":"function"}
	]`

	parsedABI, err := abi.JSON(strings.NewReader(safeABI))
	if err != nil {
		return nil, err
	}

	// 获取阈值
	thresholdData, err := parsedABI.Pack("getThreshold")
	if err != nil {
		return nil, err
	}

	thresholdResult, err := client.CallContract(ctx, ethereum.CallMsg{
		To:   &contractAddr,
		Data: thresholdData,
	}, nil)
	if err != nil {
		return nil, err
	}

	var threshold *big.Int
	if err := parsedABI.UnpackIntoInterface(&threshold, "getThreshold", thresholdResult); err != nil {
		return nil, err
	}

	// 获取所有者
	ownersData, err := parsedABI.Pack("getOwners")
	if err != nil {
		return nil, err
	}

	ownersResult, err := client.CallContract(ctx, ethereum.CallMsg{
		To:   &contractAddr,
		Data: ownersData,
	}, nil)
	if err != nil {
		return nil, err
	}

	var ownersAddresses []common.Address
	if err := parsedABI.UnpackIntoInterface(&ownersAddresses, "getOwners", ownersResult); err != nil {
		return nil, err
	}

	// 获取nonce
	nonceData, err := parsedABI.Pack("nonce")
	if err != nil {
		return nil, err
	}

	nonceResult, err := client.CallContract(ctx, ethereum.CallMsg{
		To:   &contractAddr,
		Data: nonceData,
	}, nil)
	if err != nil {
		return nil, err
	}

	var nonce *big.Int
	if err := parsedABI.UnpackIntoInterface(&nonce, "nonce", nonceResult); err != nil {
		return nil, err
	}

	// 获取版本
	var version string = "unknown"
	versionData, err := parsedABI.Pack("VERSION")
	if err == nil {
		versionResult, err := client.CallContract(ctx, ethereum.CallMsg{
			To:   &contractAddr,
			Data: versionData,
		}, nil)
		if err == nil {
			parsedABI.UnpackIntoInterface(&version, "VERSION", versionResult)
		}
	}

	// 获取余额
	balance, err := client.BalanceAt(ctx, contractAddr, nil)
	if err != nil {
		balance = big.NewInt(0)
	}

	// 转换owners
	owners := make([]types.SafeOwner, len(ownersAddresses))
	for i, addr := range ownersAddresses {
		owners[i] = types.SafeOwner{
			Address: addr.Hex(),
		}
	}

	return &types.SafeInfo{
		SafeAddress: address,
		ChainID:     chainID,
		Threshold:   int(threshold.Int64()),
		Owners:      owners,
		Version:     version,
		Nonce:       nonce.Int64(),
		Balance:     balance.String(),
	}, nil
}

// syncSafeInfoToDB 同步Safe信息到数据库
func (s *service) syncSafeInfoToDB(ctx context.Context, safeInfo *types.SafeInfo) error {
	ownersJSON, _ := json.Marshal(safeInfo.Owners)

	safeWallet := &types.SafeWallet{
		SafeAddress: safeInfo.SafeAddress,
		ChainID:     safeInfo.ChainID,
		ChainName:   safeInfo.ChainName,
		Threshold:   safeInfo.Threshold,
		Owners:      string(ownersJSON),
		Version:     safeInfo.Version,
		Status:      "active",
	}

	return s.safeRepo.CreateOrUpdateSafe(ctx, safeWallet)
}

// validateAndUseNonce 验证并使用nonce
func (s *service) validateAndUseNonce(ctx context.Context, walletAddress string, nonce string, message string) error {
	// 从数据库获取nonce
	authNonce, err := s.userRepo.GetAuthNonce(ctx, walletAddress, nonce)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrInvalidNonce
		}
		return fmt.Errorf("failed to get nonce: %w", err)
	}

	// 检查nonce是否已使用
	if authNonce.IsUsed {
		return ErrNonceUsed
	}

	// 检查nonce是否过期
	if time.Now().After(authNonce.ExpiresAt) {
		return ErrInvalidNonce
	}

	// 验证消息是否匹配
	if authNonce.Message != message {
		return fmt.Errorf("message does not match stored nonce message")
	}

	// 标记nonce为已使用
	if err := s.userRepo.MarkNonceAsUsed(ctx, authNonce.ID); err != nil {
		logger.Error("Failed to mark nonce as used", err)
		// 继续流程，但记录错误
	}

	return nil
}

// cleanupAllNonces 清理指定钱包地址的所有nonce（用于避免重复键冲突）
func (s *service) cleanupAllNonces(ctx context.Context, walletAddress string) error {
	return s.userRepo.DeleteAllNonces(ctx, walletAddress)
}
