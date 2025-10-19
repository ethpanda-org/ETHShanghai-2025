package timelock

import (
	"context"
	"errors"
	"fmt"
	"html"
	"math/big"
	"regexp"
	"strings"
	"time"

	"timelock-backend/internal/config"
	"timelock-backend/internal/repository/chain"
	scannerRepo "timelock-backend/internal/repository/scanner"
	"timelock-backend/internal/repository/timelock"
	"timelock-backend/internal/service/scanner"
	"timelock-backend/internal/types"
	"timelock-backend/pkg/crypto"
	"timelock-backend/pkg/logger"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"
	"gorm.io/gorm"
)

var (
	ErrTimeLockNotFound      = errors.New("timelock not found")
	ErrTimeLockExists        = errors.New("timelock already exists")
	ErrInvalidContract       = errors.New("invalid timelock contract")
	ErrInvalidStandard       = errors.New("invalid contract standard")
	ErrUnauthorized          = errors.New("unauthorized access")
	ErrInvalidRemark         = errors.New("invalid remark content")
	ErrInvalidContractParams = errors.New("invalid contract parameters")
	ErrInvalidPermissions    = errors.New("insufficient permissions")
	ErrChainNotSupported     = errors.New("chain not supported")
	ErrRPCConnection         = errors.New("failed to connect to RPC")
	ErrContractNotTimelock   = errors.New("contract is not a valid timelock")
)

// Service timelock服务接口
type Service interface {
	// 创建或导入timelock合约
	CreateOrImportTimeLock(ctx context.Context, userAddress string, req *types.CreateOrImportTimelockContractRequest) (interface{}, error)

	// 获取timelock列表（按权限筛选）
	GetTimeLockList(ctx context.Context, userAddress string, req *types.GetTimeLockListRequest) (*types.GetTimeLockListResponse, error)

	// 获取timelock详情
	GetTimeLockDetail(ctx context.Context, userAddress string, req *types.GetTimeLockDetailRequest) (*types.GetTimeLockDetailResponse, error)

	// 更新timelock备注
	UpdateTimeLock(ctx context.Context, userAddress string, req *types.UpdateTimeLockRequest) error

	// 删除timelock
	DeleteTimeLock(ctx context.Context, userAddress string, req *types.DeleteTimeLockRequest) error

	// 刷新用户所有timelock合约权限
	RefreshTimeLockPermissions(ctx context.Context, userAddress string) error

	// 刷新所有timelock合约数据（定时任务）
	RefreshAllTimeLockData(ctx context.Context) error
}

type service struct {
	timeLockRepo timelock.Repository
	chainRepo    chain.Repository
	flowRepo     scannerRepo.FlowRepository
	rpcManager   *scanner.RPCManager
	config       *config.Config
}

// NewService 创建timelock服务实例
func NewService(timeLockRepo timelock.Repository, chainRepo chain.Repository, flowRepo scannerRepo.FlowRepository, rpcManager *scanner.RPCManager, config *config.Config) Service {
	return &service{
		timeLockRepo: timeLockRepo,
		chainRepo:    chainRepo,
		flowRepo:     flowRepo,
		rpcManager:   rpcManager,
		config:       config,
	}
}

// CreateOrImportTimeLock 创建或导入timelock合约记录
func (s *service) CreateOrImportTimeLock(ctx context.Context, userAddress string, req *types.CreateOrImportTimelockContractRequest) (interface{}, error) {
	// 标准化地址
	normalizedUser := crypto.NormalizeAddress(userAddress)
	normalizedContract := crypto.NormalizeAddress(req.ContractAddress)

	// 验证请求参数
	if err := s.validateCreateOrImportRequest(req); err != nil {
		logger.Error("CreateOrImportTimeLock validation error", err, "user_address", normalizedUser)
		return nil, err
	}

	// 检查合约是否已存在
	if err := s.checkContractExists(ctx, req.Standard, req.ChainID, normalizedContract, userAddress); err != nil {
		logger.Error("CreateOrImportTimeLock check exists error", err, "user_address", normalizedUser)
		return nil, err
	}

	// 获取链信息
	chainInfo, err := s.chainRepo.GetChainByChainID(ctx, int64(req.ChainID))
	if err != nil {
		logger.Error("Failed to get chain info", err, "chain_id", req.ChainID)
		return nil, fmt.Errorf("failed to get chain info: %w", err)
	}

	// 从链上读取合约数据并验证
	switch req.Standard {
	case "compound":
		return s.createOrImportCompoundTimeLock(ctx, normalizedUser, normalizedContract, req, chainInfo)
	default:
		logger.Error("Invalid standard", fmt.Errorf("invalid standard: %s", req.Standard))
		return nil, ErrInvalidStandard
	}
}

// GetTimeLockList 获取timelock列表（根据用户权限筛选）
func (s *service) GetTimeLockList(ctx context.Context, userAddress string, req *types.GetTimeLockListRequest) (*types.GetTimeLockListResponse, error) {
	logger.Info("GetTimeLockList", "user_address", userAddress, "standard", req.Standard, "status", req.Status)

	// 标准化地址
	normalizedUser := crypto.NormalizeAddress(userAddress)

	// 查询所有有权限的timelock
	compoundList, total, err := s.timeLockRepo.GetTimeLocksByUserPermissions(ctx, normalizedUser, req)
	if err != nil {
		logger.Error("GetTimeLockList error", err, "user_address", normalizedUser)
		return nil, fmt.Errorf("failed to get timelock list: %w", err)
	}

	response := &types.GetTimeLockListResponse{
		CompoundTimeLocks: compoundList,
		Total:             total,
	}

	logger.Info("GetTimeLockList success", "user_address", normalizedUser, "total", total, "compound_count", len(compoundList))
	return response, nil
}

// GetTimeLockDetail 获取timelock详情
func (s *service) GetTimeLockDetail(ctx context.Context, userAddress string, req *types.GetTimeLockDetailRequest) (*types.GetTimeLockDetailResponse, error) {
	logger.Info("GetTimeLockDetail", "user_address", userAddress, "standard", req.Standard, "chain_id", req.ChainID, "contract_address", req.ContractAddress)

	// 标准化地址
	normalizedUser := crypto.NormalizeAddress(userAddress)
	normalizedContract := crypto.NormalizeAddress(req.ContractAddress)

	switch req.Standard {
	case "compound":
		return s.getCompoundTimeLockDetail(ctx, normalizedUser, req.ChainID, normalizedContract)
	default:
		logger.Error("Invalid standard", fmt.Errorf("invalid standard: %s", req.Standard))
		return nil, ErrInvalidStandard
	}
}

// UpdateTimeLock 更新timelock备注
func (s *service) UpdateTimeLock(ctx context.Context, userAddress string, req *types.UpdateTimeLockRequest) error {
	logger.Info("UpdateTimeLock", "user_address", userAddress, "standard", req.Standard, "chain_id", req.ChainID, "contract_address", req.ContractAddress)

	// 标准化地址
	normalizedUser := crypto.NormalizeAddress(userAddress)
	normalizedContract := crypto.NormalizeAddress(req.ContractAddress)

	// 验证备注
	if err := s.validateRemark(req.Remark); err != nil {
		logger.Error("UpdateTimeLock remark validation error", err, "user_address", normalizedUser)
		return err
	}

	sanitizedRemark := html.EscapeString(strings.TrimSpace(req.Remark))

	switch req.Standard {
	case "compound":
		// 验证所有权（创建者或导入者）
		isOwner, err := s.timeLockRepo.ValidateCompoundOwnership(ctx, req.ChainID, normalizedContract, normalizedUser)
		if err != nil {
			logger.Error("UpdateTimeLock validate ownership error", err, "user_address", normalizedUser)
			return fmt.Errorf("failed to validate ownership: %w", err)
		}
		if !isOwner {
			logger.Error("UpdateTimeLock unauthorized", ErrUnauthorized, "user_address", normalizedUser)
			return ErrUnauthorized
		}

		if err := s.timeLockRepo.UpdateCompoundTimeLockRemark(ctx, req.ChainID, normalizedContract, normalizedUser, sanitizedRemark); err != nil {
			logger.Error("UpdateTimeLock repository error", err, "user_address", normalizedUser)
			return fmt.Errorf("failed to update timelock: %w", err)
		}

	default:
		return ErrInvalidStandard
	}

	logger.Info("UpdateTimeLock success", "user_address", normalizedUser)
	return nil
}

// DeleteTimeLock 删除timelock
func (s *service) DeleteTimeLock(ctx context.Context, userAddress string, req *types.DeleteTimeLockRequest) error {
	logger.Info("DeleteTimeLock", "user_address", userAddress, "standard", req.Standard, "chain_id", req.ChainID, "contract_address", req.ContractAddress)

	// 标准化地址
	normalizedUser := crypto.NormalizeAddress(userAddress)
	normalizedContract := crypto.NormalizeAddress(req.ContractAddress)

	switch req.Standard {
	case "compound":
		// 验证所有权（创建者或导入者）
		isOwner, err := s.timeLockRepo.ValidateCompoundOwnership(ctx, req.ChainID, normalizedContract, normalizedUser)
		if err != nil {
			logger.Error("DeleteTimeLock validate ownership error", err, "user_address", normalizedUser)
			return fmt.Errorf("failed to validate ownership: %w", err)
		}
		if !isOwner {
			logger.Error("DeleteTimeLock unauthorized", ErrUnauthorized, "user_address", normalizedUser)
			return ErrUnauthorized
		}

		if err := s.timeLockRepo.DeleteCompoundTimeLock(ctx, req.ChainID, normalizedContract, normalizedUser); err != nil {
			logger.Error("DeleteTimeLock repository error", err, "user_address", normalizedUser)
			return fmt.Errorf("failed to delete timelock: %w", err)
		}

	default:
		return ErrInvalidStandard
	}

	logger.Info("DeleteTimeLock success", "user_address", normalizedUser)
	return nil
}

// RefreshTimeLockPermissions 刷新用户所有timelock合约权限
func (s *service) RefreshTimeLockPermissions(ctx context.Context, userAddress string) error {
	logger.Info("RefreshTimeLockPermissions", "user_address", userAddress)

	normalizedUser := crypto.NormalizeAddress(userAddress)

	// 获取用户所有的timelock合约
	compoundTimelocks, err := s.timeLockRepo.GetAllCompoundTimeLocksByUser(ctx, normalizedUser)
	if err != nil {
		logger.Error("Failed to get compound timelocks", err, "user_address", normalizedUser)
		return fmt.Errorf("failed to get compound timelocks: %w", err)
	}

	// 刷新Compound合约权限
	for _, timeLock := range compoundTimelocks {
		if err := s.refreshCompoundTimeLockData(ctx, &timeLock); err != nil {
			logger.Error("Failed to refresh compound timelock", err, "contract_address", timeLock.ContractAddress)
			continue
		}
	}

	logger.Info("RefreshTimeLockPermissions success", "user_address", normalizedUser)
	return nil
}

// RefreshAllTimeLockData 刷新所有timelock合约数据（定时任务）
func (s *service) RefreshAllTimeLockData(ctx context.Context) error {
	logger.Info("RefreshAllTimeLockData started")

	// 获取所有活跃的Compound timelock合约
	compoundTimelocks, err := s.timeLockRepo.GetAllActiveCompoundTimeLocks(ctx)
	if err != nil {
		logger.Error("Failed to get all compound timelocks", err)
		return fmt.Errorf("failed to get compound timelocks: %w", err)
	}

	// 刷新Compound合约数据
	for _, timeLock := range compoundTimelocks {
		if err := s.refreshCompoundTimeLockData(ctx, &timeLock); err != nil {
			logger.Error("Failed to refresh compound timelock", err, "contract_address", timeLock.ContractAddress)
			continue
		}
	}

	logger.Info("RefreshAllTimeLockData completed", "compound_count", len(compoundTimelocks))
	return nil
}

// 私有方法 - 创建或导入Compound timelock
func (s *service) createOrImportCompoundTimeLock(ctx context.Context, userAddress, contractAddress string, req *types.CreateOrImportTimelockContractRequest, chainInfo *types.SupportChain) (*types.CompoundTimeLock, error) {
	// 从链上读取合约数据
	contractData, err := s.readCompoundTimeLockFromChain(ctx, req.ChainID, contractAddress)
	if err != nil {
		logger.Error("Failed to read compound timelock from chain", err, "contract_address", contractAddress)
		return nil, fmt.Errorf("failed to read contract data: %w", err)
	}

	timeLock := &types.CompoundTimeLock{
		CreatorAddress:  userAddress,
		ChainID:         req.ChainID,
		ChainName:       chainInfo.ChainName,
		ContractAddress: contractAddress,
		Delay:           contractData.Delay,
		Admin:           contractData.Admin,
		PendingAdmin:    contractData.PendingAdmin,
		GracePeriod:     contractData.GracePeriod,
		MinimumDelay:    contractData.MinimumDelay,
		MaximumDelay:    contractData.MaximumDelay,
		Remark:          html.EscapeString(strings.TrimSpace(req.Remark)),
		Status:          "active",
		IsImported:      req.IsImported,
	}

	if err := s.timeLockRepo.CreateCompoundTimeLock(ctx, timeLock); err != nil {
		logger.Error("Failed to create compound timelock", err)
		return nil, fmt.Errorf("failed to create compound timelock: %w", err)
	}

	// 刷新该合约相关的所有flows的expired_at字段，使用正确的GRACE_PERIOD
	if s.flowRepo != nil {
		updatedCount, err := s.flowRepo.RefreshCompoundFlowsExpiredAt(ctx, req.ChainID, contractAddress, contractData.GracePeriod)
		if err != nil {
			logger.Error("Failed to refresh compound flows expired_at", err,
				"contract_address", contractAddress, "grace_period", contractData.GracePeriod)
			// 不影响主流程，只记录错误
		} else {
			logger.Info("Refreshed compound flows expired_at after import",
				"updated_flows", updatedCount, "contract_address", contractAddress, "grace_period", contractData.GracePeriod)
		}
	}

	logger.Info("CreateOrImportCompoundTimeLock success", "timelock_id", timeLock.ID, "user_address", userAddress, "contract_address", contractAddress)
	return timeLock, nil
}

// 私有方法 - 获取Compound timelock详情
func (s *service) getCompoundTimeLockDetail(ctx context.Context, userAddress string, chainID int, contractAddress string) (*types.GetTimeLockDetailResponse, error) {
	timeLock, err := s.timeLockRepo.GetCompoundTimeLockByChainAndAddress(ctx, chainID, contractAddress)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrTimeLockNotFound
		}
		logger.Error("Failed to get compound timelock", err)
		return nil, fmt.Errorf("failed to get timelock: %w", err)
	}

	// 检查用户是否有权限查看
	hasPermission := s.checkCompoundPermission(timeLock, userAddress)
	if !hasPermission {
		logger.Error("User has no permission to view timelock", ErrUnauthorized)
		return nil, ErrUnauthorized
	}

	// 构建权限信息
	permissions := s.buildCompoundPermissions(timeLock, userAddress)

	compoundData := &types.CompoundTimeLockWithPermission{
		CompoundTimeLock: *timeLock,
		UserPermissions:  permissions,
	}

	return &types.GetTimeLockDetailResponse{
		Standard:     "compound",
		CompoundData: compoundData,
	}, nil
}

// 链上数据结构
type CompoundTimeLockData struct {
	Delay        int64   `json:"delay"`
	Admin        string  `json:"admin"`
	PendingAdmin *string `json:"pending_admin"`
	GracePeriod  int64   `json:"grace_period"`
	MinimumDelay int64   `json:"minimum_delay"`
	MaximumDelay int64   `json:"maximum_delay"`
}

type OpenzeppelinTimeLockData struct {
	Delay     int64    `json:"delay"`
	Admin     *string  `json:"admin"`
	Proposers []string `json:"proposers"`
	Executors []string `json:"executors"`
}

// 私有方法 - 从链上读取Compound timelock数据
func (s *service) readCompoundTimeLockFromChain(ctx context.Context, chainID int, contractAddress string) (*CompoundTimeLockData, error) {
	client, err := s.rpcManager.GetOrCreateClient(ctx, chainID)
	if err != nil {
		return nil, fmt.Errorf("failed to get RPC client: %w", err)
	}

	contractAddr := common.HexToAddress(contractAddress)

	// Compound Timelock ABI (简化版，只包含需要的方法)
	abiJSON := `[
		{"inputs":[],"name":"delay","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
		{"inputs":[],"name":"admin","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
		{"inputs":[],"name":"pendingAdmin","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
		{"inputs":[],"name":"GRACE_PERIOD","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
		{"inputs":[],"name":"MINIMUM_DELAY","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
		{"inputs":[],"name":"MAXIMUM_DELAY","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}
	]`

	parsedABI, err := abi.JSON(strings.NewReader(abiJSON))
	if err != nil {
		return nil, fmt.Errorf("failed to parse ABI: %w", err)
	}

	data := &CompoundTimeLockData{}

	// 读取delay
	result, err := s.callContract(ctx, client, contractAddr, parsedABI, "delay")
	if err != nil {
		return nil, fmt.Errorf("failed to read delay: %w", err)
	}
	if len(result) > 0 {
		if delay, ok := result[0].(*big.Int); ok {
			data.Delay = delay.Int64()
		} else {
			return nil, fmt.Errorf("invalid delay type")
		}
	}

	// 读取admin
	result, err = s.callContract(ctx, client, contractAddr, parsedABI, "admin")
	if err != nil {
		return nil, fmt.Errorf("failed to read admin: %w", err)
	}
	if len(result) > 0 {
		if admin, ok := result[0].(common.Address); ok {
			data.Admin = strings.ToLower(admin.Hex())
		} else {
			return nil, fmt.Errorf("invalid admin type")
		}
	}

	// 读取pendingAdmin
	result, err = s.callContract(ctx, client, contractAddr, parsedABI, "pendingAdmin")
	if err != nil {
		// pendingAdmin 可能为空，不是错误
		logger.Warn("Failed to read pendingAdmin", "error", err)
	} else if len(result) > 0 {
		if pendingAdmin, ok := result[0].(common.Address); ok && pendingAdmin != (common.Address{}) {
			pendingAdminStr := strings.ToLower(pendingAdmin.Hex())
			data.PendingAdmin = &pendingAdminStr
		}
	}

	// 读取GRACE_PERIOD
	result, err = s.callContract(ctx, client, contractAddr, parsedABI, "GRACE_PERIOD")
	if err != nil {
		return nil, fmt.Errorf("failed to read GRACE_PERIOD: %w", err)
	}
	if len(result) > 0 {
		if gracePeriod, ok := result[0].(*big.Int); ok {
			data.GracePeriod = gracePeriod.Int64()
		} else {
			return nil, fmt.Errorf("invalid grace period type")
		}
	}

	// 读取MINIMUM_DELAY
	result, err = s.callContract(ctx, client, contractAddr, parsedABI, "MINIMUM_DELAY")
	if err != nil {
		return nil, fmt.Errorf("failed to read MINIMUM_DELAY: %w", err)
	}
	if len(result) > 0 {
		if minDelay, ok := result[0].(*big.Int); ok {
			data.MinimumDelay = minDelay.Int64()
		} else {
			return nil, fmt.Errorf("invalid minimum delay type")
		}
	}

	// 读取MAXIMUM_DELAY
	result, err = s.callContract(ctx, client, contractAddr, parsedABI, "MAXIMUM_DELAY")
	if err != nil {
		return nil, fmt.Errorf("failed to read MAXIMUM_DELAY: %w", err)
	}
	if len(result) > 0 {
		if maxDelay, ok := result[0].(*big.Int); ok {
			data.MaximumDelay = maxDelay.Int64()
		} else {
			return nil, fmt.Errorf("invalid maximum delay type")
		}
	}

	return data, nil
}

// 私有方法 - 调用合约方法
func (s *service) callContract(ctx context.Context, client *ethclient.Client, contractAddr common.Address, parsedABI abi.ABI, method string, args ...interface{}) ([]interface{}, error) {
	callData, err := parsedABI.Pack(method, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to pack call data: %w", err)
	}

	result, err := client.CallContract(ctx, ethereum.CallMsg{
		To:   &contractAddr,
		Data: callData,
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to call contract: %w", err)
	}

	return parsedABI.Unpack(method, result)
}

// 私有方法 - 刷新Compound timelock数据
func (s *service) refreshCompoundTimeLockData(ctx context.Context, timeLock *types.CompoundTimeLock) error {
	// 从链上读取最新数据
	contractData, err := s.readCompoundTimeLockFromChain(ctx, timeLock.ChainID, timeLock.ContractAddress)
	if err != nil {
		return fmt.Errorf("failed to read contract data: %w", err)
	}

	// 更新数据库中的数据
	timeLock.Delay = contractData.Delay
	timeLock.Admin = contractData.Admin
	timeLock.PendingAdmin = contractData.PendingAdmin
	timeLock.GracePeriod = contractData.GracePeriod
	timeLock.MinimumDelay = contractData.MinimumDelay
	timeLock.MaximumDelay = contractData.MaximumDelay
	timeLock.UpdatedAt = time.Now()

	return s.timeLockRepo.UpdateCompoundTimeLock(ctx, timeLock)
}

// 私有方法 - 检查Compound权限
func (s *service) checkCompoundPermission(timeLock *types.CompoundTimeLock, userAddress string) bool {
	return timeLock.CreatorAddress == userAddress ||
		timeLock.Admin == userAddress ||
		(timeLock.PendingAdmin != nil && *timeLock.PendingAdmin == userAddress)
}

// 私有方法 - 构建Compound权限列表
func (s *service) buildCompoundPermissions(timeLock *types.CompoundTimeLock, userAddress string) []string {
	var permissions []string
	if timeLock.CreatorAddress == userAddress {
		permissions = append(permissions, "creator")
	}
	if timeLock.Admin == userAddress {
		permissions = append(permissions, "admin")
	}
	if timeLock.PendingAdmin != nil && *timeLock.PendingAdmin == userAddress {
		permissions = append(permissions, "pending_admin")
	}
	return permissions
}

// validateCreateOrImportRequest 验证创建或导入timelock合约的请求
func (s *service) validateCreateOrImportRequest(req *types.CreateOrImportTimelockContractRequest) error {
	// 验证合约地址格式
	if !crypto.ValidateEthereumAddress(req.ContractAddress) {
		return fmt.Errorf("%w: invalid contract address", ErrInvalidContractParams)
	}

	// 验证标准
	if req.Standard != "compound" {
		return fmt.Errorf("%w: %s", ErrInvalidStandard, req.Standard)
	}

	// 验证备注
	if err := s.validateRemark(req.Remark); err != nil {
		return err
	}

	return nil
}

// checkContractExists 检查合约是否存在
func (s *service) checkContractExists(ctx context.Context, standard string, chainID int, contractAddress string, userAddress string) error {
	switch standard {
	case "compound":
		exists, err := s.timeLockRepo.CheckCompoundTimeLockExists(ctx, chainID, contractAddress, userAddress)
		if err != nil {
			return fmt.Errorf("failed to check compound timelock existence: %w", err)
		}
		if exists {
			return ErrTimeLockExists
		}
	}
	return nil
}

// validateRemark 验证备注
func (s *service) validateRemark(remark string) error {
	if len(remark) > 500 {
		return fmt.Errorf("%w: remark too long (max 500 characters)", ErrInvalidRemark)
	}

	if strings.ContainsAny(remark, "<>\"'&") {
		logger.Warn("Remark contains HTML-sensitive characters, will be escaped", "remark", remark)
	}

	maliciousPatterns := []string{
		`(?i)javascript:`,
		`(?i)data:`,
		`(?i)vbscript:`,
		`(?i)<script`,
		`(?i)on\w+\s*=`,
	}

	for _, pattern := range maliciousPatterns {
		if matched, _ := regexp.MatchString(pattern, remark); matched {
			return fmt.Errorf("%w: remark contains potentially malicious content", ErrInvalidRemark)
		}
	}

	return nil
}
