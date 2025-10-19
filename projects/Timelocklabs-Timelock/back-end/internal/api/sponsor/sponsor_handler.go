package sponsor

import (
	"net/http"

	sponsorService "timelock-backend/internal/service/sponsor"
	"timelock-backend/internal/types"
	"timelock-backend/pkg/logger"

	"github.com/gin-gonic/gin"
)

// Handler 赞助方处理器
type Handler struct {
	sponsorService sponsorService.Service
}

// NewHandler 创建新的赞助方处理器
func NewHandler(sponsorService sponsorService.Service) *Handler {
	return &Handler{
		sponsorService: sponsorService,
	}
}

// RegisterRoutes 注册路由
func (h *Handler) RegisterRoutes(router *gin.RouterGroup) {
	// 公开接口（无需认证）
	publicGroup := router.Group("/sponsors")
	{
		// 获取公开的赞助方和生态伙伴列表
		// http://localhost:8080/api/v1/sponsors/public
		publicGroup.POST("/public", h.GetPublicSponsors)
	}
}

// GetPublicSponsors 获取公开的赞助方和生态伙伴列表
// @Summary 获取公开的赞助方和生态伙伴列表
// @Description 获取所有激活的赞助方和生态伙伴信息，用于在前端展示。返回的数据按照排序权重和创建时间排序。
// @Tags Sponsors
// @Accept json
// @Produce json
// @Success 200 {object} types.APIResponse{data=types.GetPublicSponsorsResponse} "成功获取赞助方和生态伙伴列表"
// @Failure 500 {object} types.APIResponse{error=types.APIError} "获取赞助方列表失败"
// @Router /api/v1/sponsors/public [post]
func (h *Handler) GetPublicSponsors(c *gin.Context) {
	logger.Info("GetPublicSponsors: getting public sponsors")

	sponsors, err := h.sponsorService.GetPublicSponsors()
	if err != nil {
		logger.Error("GetPublicSponsors: failed to get public sponsors", err)
		c.JSON(http.StatusInternalServerError, types.APIResponse{
			Success: false,
			Error: &types.APIError{
				Code:    "QUERY_FAILED",
				Message: "Failed to get sponsors",
				Details: err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, types.APIResponse{
		Success: true,
		Data:    sponsors,
	})
}
