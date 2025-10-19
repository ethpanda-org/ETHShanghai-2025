package timelock

import (
	"net/http"
	"strings"

	"timelock-backend/internal/middleware"
	"timelock-backend/internal/service/auth"
	"timelock-backend/internal/service/timelock"
	"timelock-backend/internal/types"
	"timelock-backend/pkg/crypto"
	"timelock-backend/pkg/logger"

	"github.com/gin-gonic/gin"
)

// Handler timelock处理器
type Handler struct {
	timeLockService timelock.Service
	authService     auth.Service
}

// NewHandler 创建timelock处理器
func NewHandler(timeLockService timelock.Service, authService auth.Service) *Handler {
	return &Handler{
		timeLockService: timeLockService,
		authService:     authService,
	}
}

// RegisterRoutes 注册timelock相关路由
func (h *Handler) RegisterRoutes(router *gin.RouterGroup) {
	// 创建timelock路由组
	timeLockGroup := router.Group("/timelock")
	timeLockGroup.Use(middleware.AuthMiddleware(h.authService))
	{
		// 创建或导入timelock合约
		// POST /api/v1/timelock/create-or-import
		// http://localhost:8080/api/v1/timelock/create-or-import
		timeLockGroup.POST("/create-or-import", h.CreateOrImportTimeLock)

		// 获取timelock列表（根据用户权限筛选）
		// POST /api/v1/timelock/list
		// http://localhost:8080/api/v1/timelock/list
		timeLockGroup.POST("/list", h.GetTimeLockList)

		// 获取timelock详情
		// POST /api/v1/timelock/detail
		// http://localhost:8080/api/v1/timelock/detail
		timeLockGroup.POST("/detail", h.GetTimeLockDetail)

		// 更新timelock备注
		// POST /api/v1/timelock/update
		// http://localhost:8080/api/v1/timelock/update
		timeLockGroup.POST("/update", h.UpdateTimeLock)

		// 删除timelock
		// POST /api/v1/timelock/delete
		// http://localhost:8080/api/v1/timelock/delete
		timeLockGroup.POST("/delete", h.DeleteTimeLock)

		// 刷新用户所有timelock合约权限
		// POST /api/v1/timelock/refresh-permissions
		// http://localhost:8080/api/v1/timelock/refresh-permissions
		timeLockGroup.POST("/refresh-permissions", h.RefreshTimeLockPermissions)
	}
}

// CreateOrImportTimeLock 创建或导入timelock合约
// @Summary 创建或导入timelock合约记录
// @Description 创建新的或导入已存在的timelock合约记录。系统会从链上读取合约数据并验证其是否为有效的timelock合约。支持Compound和OpenZeppelin两种标准。合约地址必须为有效以太坊地址（0x + 40位十六进制）。
// @Tags Timelock
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body types.CreateOrImportTimelockContractRequest true "创建或导入timelock合约的请求体（地址从鉴权获取）"
// @Success 200 {object} types.APIResponse{data=object} "成功创建或导入timelock合约记录"
// @Failure 400 {object} types.APIResponse{error=types.APIError} "请求参数错误或标准/地址无效（INVALID_STANDARD / INVALID_CONTRACT_ADDRESS）"
// @Failure 401 {object} types.APIResponse{error=types.APIError} "未认证或令牌无效"
// @Failure 409 {object} types.APIResponse{error=types.APIError} "timelock合约已存在"
// @Failure 422 {object} types.APIResponse{error=types.APIError} "参数校验失败"
// @Failure 500 {object} types.APIResponse{error=types.APIError} "服务器内部错误"
// @Router /api/v1/timelock/create-or-import [post]
func (h *Handler) CreateOrImportTimeLock(c *gin.Context) {
	// 从上下文获取用户信息
	_, userAddress, ok := middleware.GetUserFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, types.APIResponse{
			Success: false,
			Error: &types.APIError{
				Code:    "UNAUTHORIZED",
				Message: "User not authenticated",
			},
		})
		logger.Error("CreateOrImportTimeLock error", nil, "message", "user not authenticated")
		return
	}

	var req types.CreateOrImportTimelockContractRequest
	// 绑定请求参数
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, types.APIResponse{
			Success: false,
			Error: &types.APIError{
				Code:    "INVALID_REQUEST",
				Message: "Invalid request parameters",
				Details: err.Error(),
			},
		})
		logger.Error("CreateOrImportTimeLock error", err, "message", "invalid request parameters", "user_address", userAddress)
		return
	}
	// 标准化
	req.Standard = strings.ToLower(strings.TrimSpace(req.Standard))
	req.ContractAddress = strings.TrimSpace(req.ContractAddress)
	if !crypto.ValidateEthereumAddress(req.ContractAddress) {
		c.JSON(http.StatusBadRequest, types.APIResponse{Success: false, Error: &types.APIError{Code: "INVALID_CONTRACT_ADDRESS", Message: "Invalid contract address"}})
		return
	}

	// 调用service层（地址从鉴权中获取）
	result, err := h.timeLockService.CreateOrImportTimeLock(c.Request.Context(), userAddress, &req)
	if err != nil {
		var statusCode int
		var errorCode string

		switch err {
		case timelock.ErrTimeLockExists:
			statusCode = http.StatusConflict
			errorCode = "TIMELOCK_EXISTS"
		case timelock.ErrInvalidContractParams:
			statusCode = http.StatusBadRequest
			errorCode = "INVALID_PARAMETERS"
		case timelock.ErrInvalidStandard:
			statusCode = http.StatusBadRequest
			errorCode = "INVALID_STANDARD"
		case timelock.ErrInvalidRemark:
			statusCode = http.StatusBadRequest
			errorCode = "INVALID_REMARK"
		case timelock.ErrChainNotSupported:
			statusCode = http.StatusBadRequest
			errorCode = "CHAIN_NOT_SUPPORTED"
		case timelock.ErrRPCConnection:
			statusCode = http.StatusServiceUnavailable
			errorCode = "RPC_CONNECTION_ERROR"
		case timelock.ErrContractNotTimelock:
			statusCode = http.StatusBadRequest
			errorCode = "CONTRACT_NOT_TIMELOCK"
		default:
			statusCode = http.StatusInternalServerError
			errorCode = "INTERNAL_ERROR"
		}

		c.JSON(statusCode, types.APIResponse{
			Success: false,
			Error: &types.APIError{
				Code:    errorCode,
				Message: err.Error(),
			},
		})
		logger.Error("CreateOrImportTimeLock error", err, "user_address", userAddress, "error_code", errorCode)
		return
	}

	logger.Info("CreateOrImportTimeLock success", "user_address", userAddress, "standard", req.Standard, "contract_address", req.ContractAddress)
	c.JSON(http.StatusOK, types.APIResponse{
		Success: true,
		Data:    result,
	})
}

// GetTimeLockList 获取timelock列表
// @Summary 获取用户timelock合约列表（按权限筛选，所有链）
// @Description 获取当前用户在所有链上有权限访问的timelock合约列表。支持按合约标准和状态进行筛选。返回的列表根据用户权限进行精细控制，只显示用户作为创建者、管理员、提议者、执行者的合约。
// @Tags Timelock
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body types.GetTimeLockListRequest false "查询参数"
// @Success 200 {object} types.APIResponse{data=types.GetTimeLockListResponse} "成功获取timelock合约列表"
// @Failure 400 {object} types.APIResponse{error=types.APIError} "请求参数错误或标准无效"
// @Failure 401 {object} types.APIResponse{error=types.APIError} "未认证或令牌无效"
// @Failure 500 {object} types.APIResponse{error=types.APIError} "服务器内部错误"
// @Router /api/v1/timelock/list [post]
func (h *Handler) GetTimeLockList(c *gin.Context) {
	// 从上下文获取用户信息
	_, userAddress, ok := middleware.GetUserFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, types.APIResponse{
			Success: false,
			Error: &types.APIError{
				Code:    "UNAUTHORIZED",
				Message: "User not authenticated",
			},
		})
		logger.Error("GetTimeLockList error", nil, "message", "user not authenticated")
		return
	}

	var req types.GetTimeLockListRequest
	// 绑定参数（支持 body 优先，兼容 query）
	if err := c.ShouldBindQuery(&req); err != nil {
		// ignore
	}
	if err := c.ShouldBindJSON(&req); err != nil && err.Error() != "EOF" {
		c.JSON(http.StatusBadRequest, types.APIResponse{
			Success: false,
			Error: &types.APIError{
				Code:    "INVALID_REQUEST",
				Message: "Invalid query parameters",
				Details: err.Error(),
			},
		})
		logger.Error("GetTimeLockList error", err, "message", "invalid query parameters", "user_address", userAddress)
		return
	}

	// 调用service层（地址从鉴权中获取）
	response, err := h.timeLockService.GetTimeLockList(c.Request.Context(), userAddress, &req)
	if err != nil {
		var statusCode int
		var errorCode string

		switch err {
		case timelock.ErrInvalidStandard:
			statusCode = http.StatusBadRequest
			errorCode = "INVALID_STANDARD"
		default:
			statusCode = http.StatusInternalServerError
			errorCode = "INTERNAL_ERROR"
		}

		c.JSON(statusCode, types.APIResponse{
			Success: false,
			Error: &types.APIError{
				Code:    errorCode,
				Message: err.Error(),
			},
		})
		logger.Error("GetTimeLockList error", err, "user_address", userAddress)
		return
	}

	logger.Info("GetTimeLockList success", "user_address", userAddress, "total", response.Total, "compound_count", len(response.CompoundTimeLocks))
	c.JSON(http.StatusOK, types.APIResponse{
		Success: true,
		Data:    response,
	})
}

// GetTimeLockDetail 获取timelock详情
// @Summary 获取timelock合约详细信息
// @Description 获取指定timelock合约的完整详细信息，包括合约的基本信息、治理参数以及用户权限信息。只有具有相应权限的用户才能查看详细信息。合约地址必须为有效以太坊地址（0x + 40位十六进制）。
// @Tags Timelock
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body types.GetTimeLockDetailRequest true "获取详情请求体"
// @Success 200 {object} types.APIResponse{data=types.GetTimeLockDetailResponse} "成功获取timelock合约详情"
// @Failure 400 {object} types.APIResponse{error=types.APIError} "请求参数错误或标准/地址无效（INVALID_STANDARD / INVALID_CONTRACT_ADDRESS）"
// @Failure 401 {object} types.APIResponse{error=types.APIError} "未认证或令牌无效"
// @Failure 403 {object} types.APIResponse{error=types.APIError} "无权访问此timelock合约"
// @Failure 404 {object} types.APIResponse{error=types.APIError} "timelock合约不存在"
// @Failure 422 {object} types.APIResponse{error=types.APIError} "参数校验失败"
// @Failure 500 {object} types.APIResponse{error=types.APIError} "服务器内部错误"
// @Router /api/v1/timelock/detail [post]
func (h *Handler) GetTimeLockDetail(c *gin.Context) {
	// 从上下文获取用户信息
	_, userAddress, ok := middleware.GetUserFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, types.APIResponse{
			Success: false,
			Error: &types.APIError{
				Code:    "UNAUTHORIZED",
				Message: "User not authenticated",
			},
		})
		logger.Error("GetTimeLockDetail error", nil, "message", "user not authenticated")
		return
	}

	var req types.GetTimeLockDetailRequest
	// 绑定请求参数
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, types.APIResponse{
			Success: false,
			Error: &types.APIError{
				Code:    "INVALID_REQUEST",
				Message: "Invalid query parameters",
				Details: err.Error(),
			},
		})
		logger.Error("GetTimeLockDetail error", err, "message", "invalid query parameters", "user_address", userAddress)
		return
	}
	// 标准化
	req.Standard = strings.ToLower(strings.TrimSpace(req.Standard))
	req.ContractAddress = strings.TrimSpace(req.ContractAddress)
	if !crypto.ValidateEthereumAddress(req.ContractAddress) {
		c.JSON(http.StatusBadRequest, types.APIResponse{Success: false, Error: &types.APIError{Code: "INVALID_CONTRACT_ADDRESS", Message: "Invalid contract address"}})
		return
	}

	// 验证标准
	if req.Standard != "compound" {
		c.JSON(http.StatusBadRequest, types.APIResponse{
			Success: false,
			Error: &types.APIError{
				Code:    "INVALID_STANDARD",
				Message: "Invalid timelock standard",
			},
		})
		logger.Error("GetTimeLockDetail error", nil, "message", "invalid timelock standard", "standard", req.Standard, "user_address", userAddress)
		return
	}

	// 调用service层（地址从鉴权中获取）
	response, err := h.timeLockService.GetTimeLockDetail(c.Request.Context(), userAddress, &req)
	if err != nil {
		var statusCode int
		var errorCode string

		switch err {
		case timelock.ErrTimeLockNotFound:
			statusCode = http.StatusNotFound
			errorCode = "TIMELOCK_NOT_FOUND"
		case timelock.ErrUnauthorized:
			statusCode = http.StatusForbidden
			errorCode = "UNAUTHORIZED_ACCESS"
		case timelock.ErrInvalidStandard:
			statusCode = http.StatusBadRequest
			errorCode = "INVALID_STANDARD"
		default:
			statusCode = http.StatusInternalServerError
			errorCode = "INTERNAL_ERROR"
		}

		c.JSON(statusCode, types.APIResponse{
			Success: false,
			Error: &types.APIError{
				Code:    errorCode,
				Message: err.Error(),
			},
		})
		logger.Error("GetTimeLockDetail error", err, "user_address", userAddress, "standard", req.Standard, "error_code", errorCode)
		return
	}

	logger.Info("GetTimeLockDetail success", "user_address", userAddress, "standard", req.Standard)
	c.JSON(http.StatusOK, types.APIResponse{
		Success: true,
		Data:    response,
	})
}

// UpdateTimeLock 更新timelock备注
// @Summary 更新timelock合约备注
// @Description 更新指定timelock合约的备注信息。只有合约的创建者/导入者才能更新备注。备注信息用于帮助用户管理和识别不同的timelock合约。合约地址必须为有效以太坊地址（0x + 40位十六进制）。
// @Tags Timelock
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body types.UpdateTimeLockRequest true "更新请求体（地址从鉴权获取）"
// @Success 200 {object} types.APIResponse{data=object} "成功更新timelock合约备注"
// @Failure 400 {object} types.APIResponse{error=types.APIError} "请求参数错误或标准/地址无效（INVALID_STANDARD / INVALID_CONTRACT_ADDRESS）"
// @Failure 401 {object} types.APIResponse{error=types.APIError} "未认证或令牌无效"
// @Failure 403 {object} types.APIResponse{error=types.APIError} "无权访问此timelock合约"
// @Failure 404 {object} types.APIResponse{error=types.APIError} "timelock合约不存在"
// @Failure 422 {object} types.APIResponse{error=types.APIError} "参数校验失败"
// @Failure 500 {object} types.APIResponse{error=types.APIError} "服务器内部错误"
// @Router /api/v1/timelock/update [post]
func (h *Handler) UpdateTimeLock(c *gin.Context) {
	// 从上下文获取用户信息
	_, userAddress, ok := middleware.GetUserFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, types.APIResponse{
			Success: false,
			Error: &types.APIError{
				Code:    "UNAUTHORIZED",
				Message: "User not authenticated",
			},
		})
		logger.Error("UpdateTimeLock error", nil, "message", "user not authenticated")
		return
	}

	var req types.UpdateTimeLockRequest
	// 绑定请求参数
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, types.APIResponse{
			Success: false,
			Error: &types.APIError{
				Code:    "INVALID_REQUEST",
				Message: "Invalid request parameters",
				Details: err.Error(),
			},
		})
		logger.Error("UpdateTimeLock error", err, "message", "invalid request parameters", "user_address", userAddress)
		return
	}
	// 标准化
	req.Standard = strings.ToLower(strings.TrimSpace(req.Standard))
	req.ContractAddress = strings.TrimSpace(req.ContractAddress)
	if !crypto.ValidateEthereumAddress(req.ContractAddress) {
		c.JSON(http.StatusBadRequest, types.APIResponse{Success: false, Error: &types.APIError{Code: "INVALID_CONTRACT_ADDRESS", Message: "Invalid contract address"}})
		return
	}

	// 验证标准
	if req.Standard != "compound" {
		c.JSON(http.StatusBadRequest, types.APIResponse{
			Success: false,
			Error: &types.APIError{
				Code:    "INVALID_STANDARD",
				Message: "Invalid timelock standard",
			},
		})
		logger.Error("UpdateTimeLock error", nil, "message", "invalid timelock standard", "standard", req.Standard, "user_address", userAddress)
		return
	}

	// 调用service层（地址从鉴权中获取）
	err := h.timeLockService.UpdateTimeLock(c.Request.Context(), userAddress, &req)
	if err != nil {
		var statusCode int
		var errorCode string

		switch err {
		case timelock.ErrTimeLockNotFound:
			statusCode = http.StatusNotFound
			errorCode = "TIMELOCK_NOT_FOUND"
		case timelock.ErrUnauthorized:
			statusCode = http.StatusForbidden
			errorCode = "UNAUTHORIZED_ACCESS"
		case timelock.ErrInvalidStandard:
			statusCode = http.StatusBadRequest
			errorCode = "INVALID_STANDARD"
		case timelock.ErrInvalidRemark:
			statusCode = http.StatusBadRequest
			errorCode = "INVALID_REMARK"
		default:
			statusCode = http.StatusInternalServerError
			errorCode = "INTERNAL_ERROR"
		}

		c.JSON(statusCode, types.APIResponse{
			Success: false,
			Error: &types.APIError{
				Code:    errorCode,
				Message: err.Error(),
			},
		})
		logger.Error("UpdateTimeLock error", err, "user_address", userAddress, "standard", req.Standard, "error_code", errorCode)
		return
	}

	logger.Info("UpdateTimeLock success", "user_address", userAddress, "standard", req.Standard)
	c.JSON(http.StatusOK, types.APIResponse{
		Success: true,
		Data:    gin.H{"message": "Timelock updated successfully"},
	})
}

// DeleteTimeLock 删除timelock
// @Summary 删除timelock合约记录
// @Description 硬删除指定的timelock合约记录。只有合约的创建者/导入者才能删除合约记录。删除操作是硬删除，数据从数据库中删除。合约地址必须为有效以太坊地址（0x + 40位十六进制）。
// @Tags Timelock
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body types.DeleteTimeLockRequest true "删除请求体（地址从鉴权获取）"
// @Success 200 {object} types.APIResponse{data=object} "成功删除timelock合约记录"
// @Failure 400 {object} types.APIResponse{error=types.APIError} "请求参数错误或标准/地址无效（INVALID_STANDARD / INVALID_CONTRACT_ADDRESS）"
// @Failure 401 {object} types.APIResponse{error=types.APIError} "未认证或令牌无效"
// @Failure 403 {object} types.APIResponse{error=types.APIError} "无权访问此timelock合约"
// @Failure 404 {object} types.APIResponse{error=types.APIError} "timelock合约不存在"
// @Failure 422 {object} types.APIResponse{error=types.APIError} "参数校验失败"
// @Failure 500 {object} types.APIResponse{error=types.APIError} "服务器内部错误"
// @Router /api/v1/timelock/delete [post]
func (h *Handler) DeleteTimeLock(c *gin.Context) {
	// 从上下文获取用户信息
	_, userAddress, ok := middleware.GetUserFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, types.APIResponse{
			Success: false,
			Error: &types.APIError{
				Code:    "UNAUTHORIZED",
				Message: "User not authenticated",
			},
		})
		logger.Error("DeleteTimeLock error", nil, "message", "user not authenticated")
		return
	}

	var req types.DeleteTimeLockRequest
	// 绑定请求参数
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, types.APIResponse{
			Success: false,
			Error: &types.APIError{
				Code:    "INVALID_REQUEST",
				Message: "Invalid request parameters",
				Details: err.Error(),
			},
		})
		logger.Error("DeleteTimeLock error", err, "message", "invalid request parameters", "user_address", userAddress)
		return
	}
	// 标准化
	req.Standard = strings.ToLower(strings.TrimSpace(req.Standard))
	req.ContractAddress = strings.TrimSpace(req.ContractAddress)
	if !crypto.ValidateEthereumAddress(req.ContractAddress) {
		c.JSON(http.StatusBadRequest, types.APIResponse{Success: false, Error: &types.APIError{Code: "INVALID_CONTRACT_ADDRESS", Message: "Invalid contract address"}})
		return
	}

	// 验证标准
	if req.Standard != "compound" {
		c.JSON(http.StatusBadRequest, types.APIResponse{
			Success: false,
			Error: &types.APIError{
				Code:    "INVALID_STANDARD",
				Message: "Invalid timelock standard",
			},
		})
		logger.Error("DeleteTimeLock error", nil, "message", "invalid timelock standard", "standard", req.Standard, "user_address", userAddress)
		return
	}

	// 调用service层（地址从鉴权中获取）
	err := h.timeLockService.DeleteTimeLock(c.Request.Context(), userAddress, &req)
	if err != nil {
		var statusCode int
		var errorCode string

		switch err {
		case timelock.ErrTimeLockNotFound:
			statusCode = http.StatusNotFound
			errorCode = "TIMELOCK_NOT_FOUND"
		case timelock.ErrUnauthorized:
			statusCode = http.StatusForbidden
			errorCode = "UNAUTHORIZED_ACCESS"
		case timelock.ErrInvalidStandard:
			statusCode = http.StatusBadRequest
			errorCode = "INVALID_STANDARD"
		default:
			statusCode = http.StatusInternalServerError
			errorCode = "INTERNAL_ERROR"
		}

		c.JSON(statusCode, types.APIResponse{
			Success: false,
			Error: &types.APIError{
				Code:    errorCode,
				Message: err.Error(),
			},
		})
		logger.Error("DeleteTimeLock error", err, "user_address", userAddress, "standard", req.Standard, "error_code", errorCode)
		return
	}

	logger.Info("DeleteTimeLock success", "user_address", userAddress, "standard", req.Standard)
	c.JSON(http.StatusOK, types.APIResponse{
		Success: true,
		Data:    gin.H{"message": "Timelock deleted successfully"},
	})
}

// RefreshTimeLockPermissions 刷新用户所有timelock合约权限
// @Summary 刷新用户所有timelock合约权限
// @Description 刷新该用户在库中所有timelock合约的权限，将合约中所有角色获取一遍然后更新数据库。这个操作会从区块链上重新读取用户在各个timelock合约中的最新权限信息。
// @Tags Timelock
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} types.APIResponse{data=object} "成功刷新权限"
// @Failure 401 {object} types.APIResponse{error=types.APIError} "未认证或令牌无效"
// @Failure 500 {object} types.APIResponse{error=types.APIError} "服务器内部错误"
// @Router /api/v1/timelock/refresh-permissions [post]
func (h *Handler) RefreshTimeLockPermissions(c *gin.Context) {
	// 从上下文获取用户信息
	_, userAddress, ok := middleware.GetUserFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, types.APIResponse{
			Success: false,
			Error: &types.APIError{
				Code:    "UNAUTHORIZED",
				Message: "User not authenticated",
			},
		})
		logger.Error("RefreshTimeLockPermissions error", nil, "message", "user not authenticated")
		return
	}

	// 调用service层（地址从鉴权中获取）
	err := h.timeLockService.RefreshTimeLockPermissions(c.Request.Context(), userAddress)
	if err != nil {
		c.JSON(http.StatusInternalServerError, types.APIResponse{
			Success: false,
			Error: &types.APIError{
				Code:    "INTERNAL_ERROR",
				Message: err.Error(),
			},
		})
		logger.Error("RefreshTimeLockPermissions error", err, "user_address", userAddress)
		return
	}

	logger.Info("RefreshTimeLockPermissions success", "user_address", userAddress)
	c.JSON(http.StatusOK, types.APIResponse{
		Success: true,
		Data:    gin.H{"message": "Permissions refreshed successfully"},
	})
}
