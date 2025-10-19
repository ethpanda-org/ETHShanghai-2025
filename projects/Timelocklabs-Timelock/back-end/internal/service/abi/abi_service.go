package abi

import (
	"context"
	"errors"
	"fmt"

	abiRepo "timelock-backend/internal/repository/abi"
	"timelock-backend/internal/types"
	"timelock-backend/pkg/logger"
	"timelock-backend/pkg/utils"

	"gorm.io/gorm"
)

var (
	ErrABINotFound        = errors.New("ABI not found")
	ErrAccessDenied       = errors.New("access denied")
	ErrInvalidABI         = errors.New("invalid ABI format")
	ErrABINameExists      = errors.New("ABI name already exists")
	ErrCannotDeleteShared = errors.New("cannot delete shared ABI")
)

// Service ABI服务接口
type Service interface {
	CreateABI(ctx context.Context, walletAddress string, req *types.CreateABIRequest) (*types.ABIResponse, error)
	GetABIList(ctx context.Context, walletAddress string) (*types.ABIListResponse, error)
	GetABIByID(ctx context.Context, id int64, walletAddress string) (*types.ABIResponse, error)
	UpdateABI(ctx context.Context, id int64, walletAddress string, req *types.UpdateABIRequest) (*types.ABIResponse, error)
	DeleteABI(ctx context.Context, id int64, walletAddress string) error
	ValidateABI(ctx context.Context, abiContent string) (*types.ABIValidationResult, error)
}

type service struct {
	abiRepo abiRepo.Repository
}

func NewService(abiRepo abiRepo.Repository) Service {
	return &service{
		abiRepo: abiRepo,
	}
}

// CreateABI 创建新的ABI
func (s *service) CreateABI(ctx context.Context, walletAddress string, req *types.CreateABIRequest) (*types.ABIResponse, error) {
	logger.Info("CreateABI:", "wallet_address", walletAddress, "name", req.Name)

	// 1. 验证ABI格式
	validation, err := utils.ValidateABI(req.ABIContent)
	if err != nil {
		logger.Error("CreateABI validation error:", err, "wallet_address", walletAddress, "name", req.Name)
		return nil, fmt.Errorf("ABI validation failed: %w", err)
	}

	if !validation.IsValid {
		logger.Error("CreateABI invalid ABI:", errors.New(validation.ErrorMessage), "wallet_address", walletAddress, "name", req.Name)
		return nil, fmt.Errorf("%w: %s", ErrInvalidABI, validation.ErrorMessage)
	}

	// 3. 检查名称是否重复（同一用户下）
	existingABI, err := s.abiRepo.GetABIByNameAndOwner(ctx, req.Name, walletAddress)
	if err != nil && err != gorm.ErrRecordNotFound {
		logger.Error("CreateABI check name error:", err, "wallet_address", walletAddress, "name", req.Name)
		return nil, fmt.Errorf("failed to check ABI name: %w", err)
	}

	if existingABI != nil {
		logger.Error("CreateABI name exists:", ErrABINameExists, "wallet_address", walletAddress, "name", req.Name)
		return nil, ErrABINameExists
	}

	// 4. 创建ABI记录
	newABI := &types.ABI{
		Name:        req.Name,
		ABIContent:  req.ABIContent,
		Owner:       walletAddress,
		Description: req.Description,
		IsShared:    false, // 用户创建的ABI默认不共享
	}

	if err := s.abiRepo.CreateABI(ctx, newABI); err != nil {
		logger.Error("CreateABI database error:", err, "wallet_address", walletAddress, "name", req.Name)
		return nil, fmt.Errorf("failed to create ABI: %w", err)
	}

	// 5. 返回响应
	response := &types.ABIResponse{
		ID:          newABI.ID,
		Name:        newABI.Name,
		ABIContent:  newABI.ABIContent,
		Owner:       newABI.Owner,
		Description: newABI.Description,
		IsShared:    newABI.IsShared,
		CreatedAt:   newABI.CreatedAt,
		UpdatedAt:   newABI.UpdatedAt,
	}

	logger.Info("CreateABI Success:", "id", newABI.ID, "wallet_address", walletAddress, "name", req.Name)
	return response, nil
}

// GetABIList 获取ABI列表（用户的+共享的）
func (s *service) GetABIList(ctx context.Context, walletAddress string) (*types.ABIListResponse, error) {
	logger.Info("GetABIList:", "wallet_address", walletAddress)

	// 1. 获取用户创建的ABI
	userABIs, err := s.abiRepo.GetUserABIs(ctx, walletAddress)
	if err != nil {
		logger.Error("GetABIList user ABIs error:", err, "wallet_address", walletAddress)
		return nil, fmt.Errorf("failed to get user ABIs: %w", err)
	}

	// 2. 获取共享ABI
	sharedABIs, err := s.abiRepo.GetSharedABIs(ctx)
	if err != nil {
		logger.Error("GetABIList shared ABIs error:", err, "wallet_address", walletAddress)
		return nil, fmt.Errorf("failed to get shared ABIs: %w", err)
	}

	response := &types.ABIListResponse{
		ABIs: append(userABIs, sharedABIs...),
	}

	logger.Info("GetABIList Success:", "wallet_address", walletAddress, "user_count", len(userABIs), "shared_count", len(sharedABIs))
	return response, nil
}

// GetABIByID 根据ID获取ABI详情
func (s *service) GetABIByID(ctx context.Context, id int64, walletAddress string) (*types.ABIResponse, error) {
	logger.Info("GetABIByID:", "id", id, "wallet_address", walletAddress)

	// 获取ABI
	abi, err := s.abiRepo.GetABIByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			logger.Error("GetABIByID not found:", ErrABINotFound, "id", id, "wallet_address", walletAddress)
			return nil, ErrABINotFound
		}
		logger.Error("GetABIByID database error:", err, "id", id, "wallet_address", walletAddress)
		return nil, fmt.Errorf("failed to get ABI: %w", err)
	}

	// 检查访问权限：用户只能访问自己的ABI或共享ABI
	if abi.Owner != walletAddress && abi.Owner != abiRepo.SharedABIOwner {
		logger.Error("GetABIByID access denied:", ErrAccessDenied, "id", id, "wallet_address", walletAddress, "owner", abi.Owner)
		return nil, ErrAccessDenied
	}

	response := &types.ABIResponse{
		ID:          abi.ID,
		Name:        abi.Name,
		ABIContent:  abi.ABIContent,
		Owner:       abi.Owner,
		Description: abi.Description,
		IsShared:    abi.IsShared,
		CreatedAt:   abi.CreatedAt,
		UpdatedAt:   abi.UpdatedAt,
	}

	logger.Info("GetABIByID Success:", "id", id, "wallet_address", walletAddress, "name", abi.Name)
	return response, nil
}

// UpdateABI 更新ABI
func (s *service) UpdateABI(ctx context.Context, id int64, walletAddress string, req *types.UpdateABIRequest) (*types.ABIResponse, error) {
	logger.Info("UpdateABI:", "id", id, "wallet_address", walletAddress, "name", req.Name)

	// 1. 获取现有ABI并检查权限
	existingABI, err := s.abiRepo.GetABIByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			logger.Error("UpdateABI not found:", ErrABINotFound, "id", id, "wallet_address", walletAddress)
			return nil, ErrABINotFound
		}
		logger.Error("UpdateABI database error:", err, "id", id, "wallet_address", walletAddress)
		return nil, fmt.Errorf("failed to get ABI: %w", err)
	}

	// 2. 检查所有权
	if existingABI.Owner != walletAddress {
		logger.Error("UpdateABI access denied:", ErrAccessDenied, "id", id, "wallet_address", walletAddress, "owner", existingABI.Owner)
		return nil, ErrAccessDenied
	}

	// 3. 验证新的ABI格式
	validation, err := utils.ValidateABI(req.ABIContent)
	if err != nil {
		logger.Error("UpdateABI validation error:", err, "id", id, "wallet_address", walletAddress)
		return nil, fmt.Errorf("ABI validation failed: %w", err)
	}

	if !validation.IsValid {
		logger.Error("UpdateABI invalid ABI:", errors.New(validation.ErrorMessage), "id", id, "wallet_address", walletAddress)
		return nil, fmt.Errorf("%w: %s", ErrInvalidABI, validation.ErrorMessage)
	}

	// 5. 检查名称是否与其他ABI重复（排除当前ABI）
	if req.Name != existingABI.Name {
		duplicateABI, err := s.abiRepo.GetABIByNameAndOwner(ctx, req.Name, walletAddress)
		if err != nil && err != gorm.ErrRecordNotFound {
			logger.Error("UpdateABI check name error:", err, "id", id, "wallet_address", walletAddress)
			return nil, fmt.Errorf("failed to check ABI name: %w", err)
		}

		if duplicateABI != nil && duplicateABI.ID != id {
			logger.Error("UpdateABI name exists:", ErrABINameExists, "id", id, "wallet_address", walletAddress, "name", req.Name)
			return nil, ErrABINameExists
		}
	}

	// 6. 更新ABI
	existingABI.Name = req.Name
	existingABI.ABIContent = req.ABIContent
	existingABI.Description = req.Description

	if err := s.abiRepo.UpdateABI(ctx, existingABI); err != nil {
		logger.Error("UpdateABI database error:", err, "id", id, "wallet_address", walletAddress)
		return nil, fmt.Errorf("failed to update ABI: %w", err)
	}

	// 7. 返回响应
	response := &types.ABIResponse{
		ID:          existingABI.ID,
		Name:        existingABI.Name,
		ABIContent:  existingABI.ABIContent,
		Owner:       existingABI.Owner,
		Description: existingABI.Description,
		IsShared:    existingABI.IsShared,
		CreatedAt:   existingABI.CreatedAt,
		UpdatedAt:   existingABI.UpdatedAt,
	}

	logger.Info("UpdateABI Success:", "id", id, "wallet_address", walletAddress, "name", req.Name)
	return response, nil
}

// DeleteABI 删除ABI
func (s *service) DeleteABI(ctx context.Context, id int64, walletAddress string) error {
	logger.Info("DeleteABI:", "id", id, "wallet_address", walletAddress)

	// 1. 获取ABI并检查权限
	existingABI, err := s.abiRepo.GetABIByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			logger.Error("DeleteABI not found:", ErrABINotFound, "id", id, "wallet_address", walletAddress)
			return ErrABINotFound
		}
		logger.Error("DeleteABI database error:", err, "id", id, "wallet_address", walletAddress)
		return fmt.Errorf("failed to get ABI: %w", err)
	}

	// 2. 检查所有权
	if existingABI.Owner != walletAddress {
		logger.Error("DeleteABI access denied:", ErrAccessDenied, "id", id, "wallet_address", walletAddress, "owner", existingABI.Owner)
		return ErrAccessDenied
	}

	// 3. 不允许删除共享ABI
	if existingABI.Owner == abiRepo.SharedABIOwner {
		logger.Error("DeleteABI cannot delete shared:", ErrCannotDeleteShared, "id", id, "wallet_address", walletAddress)
		return ErrCannotDeleteShared
	}

	// 4. 执行删除
	if err := s.abiRepo.DeleteABI(ctx, id, walletAddress); err != nil {
		logger.Error("DeleteABI database error:", err, "id", id, "wallet_address", walletAddress)
		return fmt.Errorf("failed to delete ABI: %w", err)
	}

	logger.Info("DeleteABI Success:", "id", id, "wallet_address", walletAddress)
	return nil
}

// ValidateABI 验证ABI格式（独立的验证接口）
func (s *service) ValidateABI(ctx context.Context, abiContent string) (*types.ABIValidationResult, error) {
	logger.Info("ValidateABI: start validation")

	validation, err := utils.ValidateABI(abiContent)
	if err != nil {
		logger.Error("ValidateABI error:", err)
		return nil, fmt.Errorf("ABI validation failed: %w", err)
	}

	logger.Info("ValidateABI Success:", "is_valid", validation.IsValid, "function_count", validation.FunctionCount, "event_count", validation.EventCount)
	return validation, nil
}
