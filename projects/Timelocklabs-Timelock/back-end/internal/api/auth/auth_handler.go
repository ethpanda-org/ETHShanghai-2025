package auth

import (
	"errors"
	"net/http"
	"strings"

	"timelock-backend/internal/middleware"
	"timelock-backend/internal/service/auth"
	"timelock-backend/internal/types"
	"timelock-backend/pkg/logger"

	"github.com/gin-gonic/gin"
)

// Handler 认证处理器
type Handler struct {
	authService auth.Service
}

// NewHandler 创建认证处理器
func NewHandler(authService auth.Service) *Handler {
	return &Handler{
		authService: authService,
	}
}

// RegisterRoutes 注册认证路由
func (h *Handler) RegisterRoutes(router *gin.RouterGroup) {
	// 认证API组
	authGroup := router.Group("/auth")
	{
		// 获取nonce
		// POST /api/v1/auth/nonce
		// http://localhost:8080/api/v1/auth/nonce
		authGroup.POST("/nonce", h.GetNonce)

		// 钱包连接
		// POST /api/v1/auth/wallet-connect
		// http://localhost:8080/api/v1/auth/wallet-connect
		authGroup.POST("/wallet-connect", h.WalletConnect)

		// 刷新令牌
		// POST /api/v1/auth/refresh-token
		// http://localhost:8080/api/v1/auth/refresh-token
		authGroup.POST("/refresh-token", h.RefreshToken)

		// 获取用户资料
		// POST /api/v1/auth/profile
		// http://localhost:8080/api/v1/auth/profile
		authGroup.POST("/profile", middleware.AuthMiddleware(h.authService), h.GetProfile)
	}
}

// GetNonce 获取认证nonce
// @Summary 获取认证nonce
// @Description 获取用于钱包签名认证的随机nonce。前端需要先调用此接口获取nonce和消息，然后让用户对消息进行签名，最后调用wallet-connect接口完成认证。
// @Tags Authentication
// @Accept json
// @Produce json
// @Param request body types.GetNonceRequest true "获取nonce请求"
// @Success 200 {object} types.APIResponse{data=types.GetNonceResponse} "成功获取nonce和签名消息"
// @Failure 400 {object} types.APIResponse{error=types.APIError} "请求参数错误"
// @Failure 500 {object} types.APIResponse{error=types.APIError} "服务器内部错误"
// @Router /api/v1/auth/nonce [post]
func (h *Handler) GetNonce(c *gin.Context) {
	var req types.GetNonceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.Error("GetNonce bind error", err)
		c.JSON(http.StatusBadRequest, types.APIResponse{
			Success: false,
			Error: &types.APIError{
				Code:    "INVALID_REQUEST",
				Message: "Invalid request parameters",
				Details: err.Error(),
			},
		})
		return
	}

	response, err := h.authService.GetNonce(c.Request.Context(), &req)
	if err != nil {
		var statusCode int
		var errorCode string

		switch err {
		case auth.ErrInvalidAddress:
			statusCode = http.StatusBadRequest
			errorCode = "INVALID_WALLET_ADDRESS"
		default:
			statusCode = http.StatusInternalServerError
			errorCode = "INTERNAL_ERROR"
		}

		logger.Error("GetNonce Error: ", err, "errorCode: ", errorCode)
		c.JSON(statusCode, types.APIResponse{
			Success: false,
			Error: &types.APIError{
				Code:    errorCode,
				Message: err.Error(),
			},
		})
		return
	}

	logger.Info("GetNonce Response:", "wallet_address", req.WalletAddress)
	c.JSON(http.StatusOK, types.APIResponse{
		Success: true,
		Data:    response,
	})
}

// WalletConnect 钱包连接认证
// @Summary 钱包连接认证（支持EOA和Safe钱包）
// @Description 通过钱包进行用户认证。EOA钱包：1.先调用/auth/nonce获取随机nonce和消息 2.让用户对消息进行签名 3.调用此接口完成认证。Safe钱包：直接提供Safe地址和chain_id即可，系统会验证地址是否为有效的Safe合约。
// @Tags Authentication
// @Accept json
// @Produce json
// @Param request body types.WalletConnectRequest true "钱包连接认证请求体。EOA钱包需要nonce、message和signature。Safe钱包只需要wallet_address、wallet_type='safe'和chain_id"
// @Success 200 {object} types.APIResponse{data=types.WalletConnectResponse} "认证成功，返回访问令牌和用户信息"
// @Failure 400 {object} types.APIResponse{error=types.APIError} "请求参数错误 - INVALID_REQUEST: 请求参数格式错误; INVALID_WALLET_ADDRESS: 钱包地址格式无效; MISSING_REQUIRED_FIELDS: EOA钱包缺少必需字段; INVALID_SAFE_CONTRACT: 地址不是有效的Safe合约"
// @Failure 401 {object} types.APIResponse{error=types.APIError} "认证失败 - INVALID_SIGNATURE: 签名验证失败; SIGNATURE_RECOVERY_FAILED: 无法从签名恢复地址; INVALID_NONCE: nonce无效或已过期; NONCE_ALREADY_USED: nonce已被使用"
// @Failure 500 {object} types.APIResponse{error=types.APIError} "服务器内部错误 - INTERNAL_ERROR: 服务器内部错误; DATABASE_ERROR: 数据库操作失败; TOKEN_GENERATION_FAILED: JWT令牌生成失败"
// @Router /api/v1/auth/wallet-connect [post]
func (h *Handler) WalletConnect(c *gin.Context) {
	var req types.WalletConnectRequest
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
		logger.Error("WalletConnect Error: ", errors.New("invalid request parameters"), "error: ", err)
		return
	}

	// 调用认证服务，返回响应数据
	response, err := h.authService.WalletConnect(c.Request.Context(), &req)
	if err != nil {
		var statusCode int
		var errorCode string

		// 根据错误类型和消息内容确定具体的错误码
		switch {
		case err == auth.ErrInvalidAddress:
			statusCode = http.StatusBadRequest
			errorCode = "INVALID_WALLET_ADDRESS"
		case err == auth.ErrInvalidSignature:
			statusCode = http.StatusUnauthorized
			errorCode = "INVALID_SIGNATURE"
		case err == auth.ErrSignatureRecovery:
			statusCode = http.StatusUnauthorized
			errorCode = "SIGNATURE_RECOVERY_FAILED"
		case err == auth.ErrInvalidNonce:
			statusCode = http.StatusUnauthorized
			errorCode = "INVALID_NONCE"
		case err == auth.ErrNonceUsed:
			statusCode = http.StatusUnauthorized
			errorCode = "NONCE_ALREADY_USED"
		case strings.Contains(err.Error(), "EOA wallet requires"):
			statusCode = http.StatusBadRequest
			errorCode = "MISSING_REQUIRED_FIELDS"
		case strings.Contains(err.Error(), "not a valid Safe contract"):
			statusCode = http.StatusBadRequest
			errorCode = "INVALID_SAFE_CONTRACT"
		case strings.Contains(err.Error(), "failed to create user"):
			statusCode = http.StatusInternalServerError
			errorCode = "DATABASE_ERROR"
		case strings.Contains(err.Error(), "failed to generate jwt tokens"):
			statusCode = http.StatusInternalServerError
			errorCode = "TOKEN_GENERATION_FAILED"
		case strings.Contains(err.Error(), "database error"):
			statusCode = http.StatusInternalServerError
			errorCode = "DATABASE_ERROR"
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
		logger.Error("WalletConnect Error: ", err, "errorCode: ", errorCode)
		return
	}
	logger.Info("WalletConnect :", "User: ", response.User.WalletAddress)
	c.JSON(http.StatusOK, types.APIResponse{
		Success: true,
		Data:    response,
	})
}

// RefreshToken 刷新访问令牌
// @Summary 刷新访问令牌
// @Description 使用刷新令牌获取新的访问令牌。当访问令牌过期时，前端可以使用此接口通过刷新令牌重新获取新的访问令牌和刷新令牌，无需重新进行钱包签名认证。
// @Tags Authentication
// @Accept json
// @Produce json
// @Param request body types.RefreshTokenRequest true "刷新令牌请求体"
// @Success 200 {object} types.APIResponse{data=types.WalletConnectResponse} "刷新成功，返回新的访问令牌和刷新令牌"
// @Failure 400 {object} types.APIResponse{error=types.APIError} "请求参数错误"
// @Failure 401 {object} types.APIResponse{error=types.APIError} "刷新令牌无效或已过期"
// @Failure 404 {object} types.APIResponse{error=types.APIError} "用户不存在"
// @Failure 500 {object} types.APIResponse{error=types.APIError} "服务器内部错误"
// @Router /api/v1/auth/refresh-token [post]
func (h *Handler) RefreshToken(c *gin.Context) {
	var req types.RefreshTokenRequest
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
		logger.Error("RefreshToken Error: ", errors.New("invalid request parameters"), "error: ", err)
		return
	}

	// 调用认证服务
	response, err := h.authService.RefreshToken(c.Request.Context(), &req)
	if err != nil {
		var statusCode int
		var errorCode string

		switch err {
		case auth.ErrInvalidToken:
			statusCode = http.StatusUnauthorized
			errorCode = "INVALID_REFRESH_TOKEN"
		case auth.ErrUserNotFound:
			statusCode = http.StatusNotFound
			errorCode = "USER_NOT_FOUND"
		default:
			statusCode = http.StatusInternalServerError
			errorCode = "INTERNAL_ERROR"
		}
		logger.Error("RefreshToken Error: ", err, "errorCode: ", errorCode)
		c.JSON(statusCode, types.APIResponse{
			Success: false,
			Error: &types.APIError{
				Code:    errorCode,
				Message: err.Error(),
			},
		})
		return
	}

	logger.Info("RefreshToken :", "User: ", response.User.WalletAddress)
	c.JSON(http.StatusOK, types.APIResponse{
		Success: true,
		Data:    response,
	})
}

// GetProfile 获取用户资料
// @Summary 获取用户资料
// @Description 获取当前认证用户的详细资料信息，包括钱包地址、创建时间等。需要有效的JWT令牌。
// @Tags Authentication
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} types.APIResponse{data=types.UserProfile} "成功获取用户资料"
// @Failure 401 {object} types.APIResponse{error=types.APIError} "未认证或令牌无效"
// @Failure 404 {object} types.APIResponse{error=types.APIError} "用户不存在"
// @Failure 500 {object} types.APIResponse{error=types.APIError} "服务器内部错误"
// @Router /api/v1/auth/profile [post]
func (h *Handler) GetProfile(c *gin.Context) {
	// 从上下文获取用户信息
	_, walletAddress, ok := middleware.GetUserFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, types.APIResponse{
			Success: false,
			Error: &types.APIError{
				Code:    "UNAUTHORIZED",
				Message: "User not authenticated",
			},
		})
		logger.Error("GetProfile Error: ", errors.New("user not authenticated"))
		return
	}

	// 调用认证服务
	profile, err := h.authService.GetProfile(c.Request.Context(), walletAddress)
	if err != nil {
		var statusCode int
		var errorCode string

		switch err {
		case auth.ErrUserNotFound:
			statusCode = http.StatusNotFound
			errorCode = "USER_NOT_FOUND"
		default:
			statusCode = http.StatusInternalServerError
			errorCode = "INTERNAL_ERROR"
		}
		logger.Error("GetProfile Error: ", err, "errorCode: ", errorCode)
		c.JSON(statusCode, types.APIResponse{
			Success: false,
			Error: &types.APIError{
				Code:    errorCode,
				Message: err.Error(),
			},
		})
		return
	}

	logger.Info("GetProfile: ", "User: ", profile.WalletAddress)
	c.JSON(http.StatusOK, types.APIResponse{
		Success: true,
		Data:    profile,
	})
}
