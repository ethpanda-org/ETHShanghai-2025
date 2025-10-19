package flow

import (
	"net/http"
	"strings"

	"timelock-backend/internal/middleware"
	"timelock-backend/internal/service/auth"
	"timelock-backend/internal/service/flow"
	"timelock-backend/internal/types"
	"timelock-backend/pkg/logger"
	"timelock-backend/pkg/utils"

	"github.com/gin-gonic/gin"
)

// FlowHandler 流程处理器
type FlowHandler struct {
	flowService flow.FlowService
	authService auth.Service
}

// NewFlowHandler 创建新的流程处理器
func NewFlowHandler(flowService flow.FlowService, authService auth.Service) *FlowHandler {
	return &FlowHandler{
		flowService: flowService,
		authService: authService,
	}
}

// RegisterRoutes 注册路由
func (h *FlowHandler) RegisterRoutes(router *gin.RouterGroup) {
	flows := router.Group("/flows")
	{
		// 获取与用户相关的流程列表（需要鉴权）
		// POST /api/v1/flows/list
		// http://localhost:8080/api/v1/flows/list
		flows.POST("/list", middleware.AuthMiddleware(h.authService), h.GetFlowList)
		// 获取与用户相关的流程数量统计（需要鉴权）
		// POST /api/v1/flows/list/count
		// http://localhost:8080/api/v1/flows/list/count
		flows.POST("/list/count", middleware.AuthMiddleware(h.authService), h.GetFlowListCount)
		// 获取交易详情
		// POST /api/v1/flows/transaction/detail
		// http://localhost:8080/api/v1/flows/transaction/detail
		flows.POST("/transaction/detail", h.GetTransactionDetail)
	}
}

// GetFlowList 获取与用户相关的流程列表
// @Summary 获取与用户相关的流程列表
// @Description 获取与用户相关的timelock流程列表，包括发起的和有权限管理的
// @Tags Flow
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body types.GetCompoundFlowListRequest false "查询参数"
// @Success 200 {object} types.APIResponse{data=types.GetCompoundFlowListResponse}
// @Failure 400 {object} types.APIResponse{error=types.APIError} "请求参数错误"
// @Failure 401 {object} types.APIResponse{error=types.APIError} "未认证或令牌无效"
// @Failure 500 {object} types.APIResponse{error=types.APIError} "服务器内部错误"
// @Router /api/v1/flows/list [post]
func (h *FlowHandler) GetFlowList(c *gin.Context) {
	// 从鉴权中间件获取用户地址
	_, userAddressStr, ok := middleware.GetUserFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, types.APIResponse{
			Success: false,
			Error: &types.APIError{
				Code:    "UNAUTHORIZED",
				Message: "User address not found in token",
			},
		})
		return
	}

	// 解析请求参数（支持 body 优先，兼容 query）
	var req types.GetCompoundFlowListRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		// ignore
	}
	if err := c.ShouldBindJSON(&req); err != nil && err.Error() != "EOF" {
		c.JSON(http.StatusBadRequest, types.APIResponse{
			Success: false,
			Error: &types.APIError{
				Code:    "INVALID_PARAMS",
				Message: "Invalid query parameters",
				Details: err.Error(),
			},
		})
		return
	}

	// 调用服务层
	response, err := h.flowService.GetCompoundFlowList(c.Request.Context(), userAddressStr, &req)
	if err != nil {
		logger.Error("Failed to get flow list", err, "user", userAddressStr)
		c.JSON(http.StatusInternalServerError, types.APIResponse{
			Success: false,
			Error: &types.APIError{
				Code:    "INTERNAL_ERROR",
				Message: "Failed to get flow list",
				Details: err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, types.APIResponse{
		Success: true,
		Data:    response,
	})
}

// GetFlowListCount 获取与用户相关的流程数量统计
// @Summary 获取与用户相关的流程数量统计
// @Description 获取与用户相关的timelock流程数量统计，包括发起的和有权限管理的，按状态分组统计
// @Tags Flow
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body types.GetCompoundFlowListCountRequest false "查询参数"
// @Success 200 {object} types.APIResponse{data=types.GetCompoundFlowListCountResponse}
// @Failure 400 {object} types.APIResponse{error=types.APIError} "请求参数错误"
// @Failure 401 {object} types.APIResponse{error=types.APIError} "未认证或令牌无效"
// @Failure 500 {object} types.APIResponse{error=types.APIError} "服务器内部错误"
// @Router /api/v1/flows/list/count [post]
func (h *FlowHandler) GetFlowListCount(c *gin.Context) {
	// 从鉴权中间件获取用户地址
	_, userAddressStr, ok := middleware.GetUserFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, types.APIResponse{
			Success: false,
			Error: &types.APIError{
				Code:    "UNAUTHORIZED",
				Message: "User address not found in token",
			},
		})
		return
	}

	// 解析请求参数（支持 body 优先，兼容 query）
	var req types.GetCompoundFlowListCountRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		// ignore
	}
	if err := c.ShouldBindJSON(&req); err != nil && err.Error() != "EOF" {
		c.JSON(http.StatusBadRequest, types.APIResponse{
			Success: false,
			Error: &types.APIError{
				Code:    "INVALID_PARAMS",
				Message: "Invalid query parameters",
				Details: err.Error(),
			},
		})
		return
	}

	// 调用服务层
	response, err := h.flowService.GetCompoundFlowListCount(c.Request.Context(), userAddressStr, &req)
	if err != nil {
		logger.Error("Failed to get flow list count", err, "user", userAddressStr)
		c.JSON(http.StatusInternalServerError, types.APIResponse{
			Success: false,
			Error: &types.APIError{
				Code:    "INTERNAL_ERROR",
				Message: "Failed to get flow list count",
				Details: err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, types.APIResponse{
		Success: true,
		Data:    response,
	})
}

// GetTransactionDetail 获取交易详情
// @Summary 获取交易详情
// @Description 根据交易哈希和标准获取交易详情。standard 仅支持 compound/openzeppelin；tx_hash 必须为 0x 开头的64位十六进制。
// @Tags Flow
// @Accept json
// @Produce json
// @Param request body types.GetTransactionDetailRequest true "请求体"
// @Success 200 {object} types.APIResponse{data=types.GetTransactionDetailResponse}
// @Failure 400 {object} types.APIResponse{error=types.APIError} "请求参数错误（INVALID_STANDARD / INVALID_TX_HASH）"
// @Failure 404 {object} types.APIResponse{error=types.APIError} "交易不存在"
// @Failure 500 {object} types.APIResponse{error=types.APIError} "服务器内部错误"
// @Router /api/v1/flows/transaction/detail [post]
func (h *FlowHandler) GetTransactionDetail(c *gin.Context) {
	// 解析请求参数
	var req types.GetTransactionDetailRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, types.APIResponse{
			Success: false,
			Error: &types.APIError{
				Code:    "INVALID_PARAMS",
				Message: "Invalid query parameters",
				Details: err.Error(),
			},
		})
		return
	}

	// 标准化
	req.Standard = strings.ToLower(strings.TrimSpace(req.Standard))
	req.TxHash = strings.TrimSpace(req.TxHash)
	// 校验标准
	if req.Standard != "compound" {
		c.JSON(http.StatusBadRequest, types.APIResponse{Success: false, Error: &types.APIError{Code: "INVALID_STANDARD", Message: "Invalid timelock standard"}})
		return
	}
	// 校验交易哈希格式
	if !utils.IsValidTxHash(req.TxHash) {
		c.JSON(http.StatusBadRequest, types.APIResponse{Success: false, Error: &types.APIError{Code: "INVALID_TX_HASH", Message: "Invalid tx hash format"}})
		return
	}

	if req.Standard == "compound" {
		// 调用服务层
		response, err := h.flowService.GetCompoundTransactionDetail(c.Request.Context(), &req)
		if err != nil {
			if err.Error() == "transaction not found" {
				c.JSON(http.StatusNotFound, types.APIResponse{
					Success: false,
					Error: &types.APIError{
						Code:    "TRANSACTION_NOT_FOUND",
						Message: "Transaction not found",
					},
				})
				return
			}

			logger.Error("Failed to get transaction detail", err, "standard", req.Standard, "tx_hash", req.TxHash)
			c.JSON(http.StatusInternalServerError, types.APIResponse{
				Success: false,
				Error: &types.APIError{
					Code:    "INTERNAL_ERROR",
					Message: "Failed to get transaction detail",
					Details: err.Error(),
				},
			})
			return
		}

		c.JSON(http.StatusOK, types.APIResponse{
			Success: true,
			Data:    response,
		})
	}
}
