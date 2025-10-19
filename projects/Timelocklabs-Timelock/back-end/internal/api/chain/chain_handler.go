package chain

import (
	"net/http"

	"timelock-backend/internal/service/chain"
	"timelock-backend/internal/types"
	"timelock-backend/pkg/logger"

	"github.com/gin-gonic/gin"
)

// Handler 支持链处理器
type Handler struct {
	chainService chain.Service
}

// NewHandler 创建新的支持链处理器
func NewHandler(chainService chain.Service) *Handler {
	return &Handler{
		chainService: chainService,
	}
}

// RegisterRoutes 注册路由
func (h *Handler) RegisterRoutes(router *gin.RouterGroup) {
	// 支持链API组
	chainGroup := router.Group("/chain")
	{
		// 获取支持链列表
		// POST /api/v1/chain/list
		// http://localhost:8080/api/v1/chain/list
		chainGroup.POST("/list", h.GetSupportChains)

		// 根据ChainID获取链信息
		// POST /api/v1/chain/chainid
		// http://localhost:8080/api/v1/chain/chainid
		chainGroup.POST("/chainid", h.GetChainByChainID)

		// 获取钱包插件添加链的配置数据
		// POST /api/v1/chain/wallet-config
		// http://localhost:8080/api/v1/chain/wallet-config
		chainGroup.POST("/wallet-config", h.GetWalletChainConfig)
	}
}

// GetSupportChains 获取支持链列表
// @Summary 获取支持的区块链列表
// @Description 获取所有支持的区块链列表，可根据是否测试网和是否激活状态进行筛选。返回链的详细信息包括名称、链ID、原生代币、Logo等信息。
// @Tags Chain
// @Accept json
// @Produce json
// @Param request body types.GetSupportChainsRequest false "筛选参数"
// @Success 200 {object} types.APIResponse{data=types.GetSupportChainsResponse} "成功获取支持链列表"
// @Failure 400 {object} types.APIResponse{error=types.APIError} "请求参数错误"
// @Failure 500 {object} types.APIResponse{error=types.APIError} "服务器内部错误"
// @Router /api/v1/chain/list [post]
func (h *Handler) GetSupportChains(c *gin.Context) {
	var req types.GetSupportChainsRequest
	// 绑定参数（支持 body 优先，兼容 query）
	if err := c.ShouldBindQuery(&req); err != nil {
		// ignore, will try JSON
	}
	if err := c.ShouldBindJSON(&req); err != nil && err.Error() != "EOF" {
		logger.Error("GetSupportChains BindQuery Error: ", err)
		c.JSON(http.StatusBadRequest, types.APIResponse{
			Success: false,
			Error: &types.APIError{
				Code:    "INVALID_REQUEST",
				Message: "Invalid query parameters",
				Details: err.Error(),
			},
		})
		return
	}

	// 调用服务
	response, err := h.chainService.GetSupportChains(c.Request.Context(), &req)
	if err != nil {
		logger.Error("GetSupportChains Service Error: ", err)
		c.JSON(http.StatusInternalServerError, types.APIResponse{
			Success: false,
			Error: &types.APIError{
				Code:    "INTERNAL_ERROR",
				Message: "Failed to get support chains",
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

// GetChainByChainID 根据ChainID获取链信息
// @Summary 根据ChainID获取链信息
// @Description 根据指定的链ID（如1代表以太坊主网）获取单个支持链的详细信息，包括链名称、原生代币、Logo等基本信息。
// @Tags Chain
// @Accept json
// @Produce json
// @Param request body types.GetChainByChainIDRequest true "按ChainID获取请求体"
// @Success 200 {object} types.APIResponse{data=types.SupportChainResponse} "成功获取链信息"
// @Failure 400 {object} types.APIResponse{error=types.APIError} "请求参数错误"
// @Failure 404 {object} types.APIResponse{error=types.APIError} "链不存在"
// @Failure 500 {object} types.APIResponse{error=types.APIError} "服务器内部错误"
// @Router /api/v1/chain/chainid [post]
func (h *Handler) GetChainByChainID(c *gin.Context) {
	var req types.GetChainByChainIDRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, types.APIResponse{
			Success: false,
			Error: &types.APIError{
				Code:    "INVALID_REQUEST",
				Message: "Invalid request parameters",
				Details: err.Error(),
			},
		})
		logger.Error("GetChainByChainID Error: ", err)
		return
	}

	// 调用服务层
	chain, err := h.chainService.GetChainByChainID(c.Request.Context(), req.ChainID)
	if err != nil {
		var statusCode int
		var errorCode string

		switch err.Error() {
		case "chain not found":
			statusCode = http.StatusNotFound
			errorCode = "CHAIN_NOT_FOUND"
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
		logger.Error("GetChainByChainID Error: ", err, "chain_id", req.ChainID)
		return
	}

	logger.Info("GetChainByChainID: ", "chain_id", req.ChainID, "chain_name", chain.ChainName)
	c.JSON(http.StatusOK, types.APIResponse{
		Success: true,
		Data:    chain,
	})
}

// GetWalletChainConfig 获取钱包插件添加链的配置数据
// @Summary 获取钱包插件添加链的配置数据
// @Description 获取指定链ID的钱包插件配置数据，包括chainId、chainName、nativeCurrency、rpcUrls、blockExplorerUrls等信息，用于帮助用户在钱包插件中添加该链。
// @Tags Chain
// @Accept json
// @Produce json
// @Param request body types.GetWalletChainConfigRequest true "获取钱包配置请求体"
// @Success 200 {object} types.APIResponse{data=types.WalletChainConfig} "成功获取钱包配置数据"
// @Failure 400 {object} types.APIResponse{error=types.APIError} "请求参数错误"
// @Failure 404 {object} types.APIResponse{error=types.APIError} "链不存在"
// @Failure 500 {object} types.APIResponse{error=types.APIError} "服务器内部错误"
// @Router /api/v1/chain/wallet-config [post]
func (h *Handler) GetWalletChainConfig(c *gin.Context) {
	var req types.GetWalletChainConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, types.APIResponse{
			Success: false,
			Error: &types.APIError{
				Code:    "INVALID_REQUEST",
				Message: "Invalid request parameters",
				Details: err.Error(),
			},
		})
		logger.Error("GetWalletChainConfig Error: ", err)
		return
	}

	// 调用服务层
	config, err := h.chainService.GetWalletChainConfig(c.Request.Context(), req.ChainID)
	if err != nil {
		var statusCode int
		var errorCode string

		switch err.Error() {
		case "chain not found":
			statusCode = http.StatusNotFound
			errorCode = "CHAIN_NOT_FOUND"
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
		logger.Error("GetWalletChainConfig Error: ", err, "chain_id", req.ChainID)
		return
	}

	logger.Info("GetWalletChainConfig: ", "chain_id", req.ChainID, "chain_name", config.ChainName)
	c.JSON(http.StatusOK, types.APIResponse{
		Success: true,
		Data:    config,
	})
}
