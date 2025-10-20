package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/KamisAyaka/crowdsourcing_graphql/packages/backend/internal/service/reputation"
	"github.com/KamisAyaka/crowdsourcing_graphql/packages/backend/pkg/logger"
)

type ReputationHandler struct {
	service *reputation.Service
}

func NewReputationHandler(service *reputation.Service) *ReputationHandler {
	return &ReputationHandler{
		service: service,
	}
}

// GetUserScore 获取用户声誉分数
func (h *ReputationHandler) GetUserScore(c *gin.Context) {
	address := c.Param("address")

	score, err := h.service.GetOrCalculateScore(c.Request.Context(), address)
	if err != nil {
		logger.Error("Failed to get user score", "address", address, "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get user score",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": score,
	})
}

// GetLeaderboard 获取排行榜
func (h *ReputationHandler) GetLeaderboard(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "100"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	leaderboard, err := h.service.GetLeaderboard(c.Request.Context(), limit, offset)
	if err != nil {
		logger.Error("Failed to get leaderboard", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get leaderboard",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": leaderboard,
		"meta": gin.H{
			"limit":  limit,
			"offset": offset,
			"total":  len(leaderboard),
		},
	})
}

// GetScoreHistory 获取分数历史
func (h *ReputationHandler) GetScoreHistory(c *gin.Context) {
	address := c.Param("address")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "30"))

	history, err := h.service.GetScoreHistory(c.Request.Context(), address, limit)
	if err != nil {
		logger.Error("Failed to get score history", "address", address, "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get score history",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": history,
	})
}

// CalculateScore 手动触发分数计算
func (h *ReputationHandler) CalculateScore(c *gin.Context) {
	address := c.Param("address")

	score, err := h.service.CalculateAndSave(c.Request.Context(), address)
	if err != nil {
		logger.Error("Failed to calculate score", "address", address, "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to calculate score",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":    score,
		"message": "Score calculated successfully",
	})
}

// GetImprovementSuggestions 获取改进建议
func (h *ReputationHandler) GetImprovementSuggestions(c *gin.Context) {
	address := c.Param("address")

	suggestions, err := h.service.GetImprovementSuggestions(c.Request.Context(), address)
	if err != nil {
		logger.Error("Failed to get improvement suggestions", "address", address, "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get improvement suggestions",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": suggestions,
	})
}

// GetUserProfile 获取用户资料
func (h *ReputationHandler) GetUserProfile(c *gin.Context) {
	address := c.Param("address")

	profile, err := h.service.GetUserProfile(c.Request.Context(), address)
	if err != nil {
		logger.Error("Failed to get user profile", "address", address, "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get user profile",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": profile,
	})
}

// GetUserStats 获取用户统计数据
func (h *ReputationHandler) GetUserStats(c *gin.Context) {
	address := c.Param("address")

	stats, err := h.service.GetUserStats(c.Request.Context(), address)
	if err != nil {
		logger.Error("Failed to get user stats", "address", address, "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get user stats",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": stats,
	})
}

// AnalyzeUser AI 分析用户 (占位符)
func (h *ReputationHandler) AnalyzeUser(c *gin.Context) {
	address := c.Param("address")

	c.JSON(http.StatusOK, gin.H{
		"message": "AI analysis coming soon",
		"address": address,
	})
}

// GetAnomalyDetection 获取异常检测结果 (占位符)
func (h *ReputationHandler) GetAnomalyDetection(c *gin.Context) {
	address := c.Param("address")

	c.JSON(http.StatusOK, gin.H{
		"message": "Anomaly detection coming soon",
		"address": address,
	})
}

func (h *ReputationHandler) GetUserTier(c *gin.Context) {
	address := c.Param("address")

	tier, err := h.service.GetUserTier(c.Request.Context(), address)
	if err != nil {
		logger.Error("Failed to get user tier", "address", address, "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get user tier",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": tier,
	})
}

func (h *ReputationHandler) TriggerWeeklyUpdate(c *gin.Context) {
	// 这个方法可以用于测试或手动触发更新
	// 生产环境中应该添加认证保护

	go func() {
		// 异步执行，避免阻塞请求
		// TODO: 调用 scheduler 的 updateSensitiveUsers
		logger.Info("Manual weekly update triggered")
	}()

	c.JSON(http.StatusOK, gin.H{
		"message": "Weekly update triggered",
	})
}

// TriggerMonthlyUpdate 手动触发月更新
func (h *ReputationHandler) TriggerMonthlyUpdate(c *gin.Context) {
	// 这个方法可以用于测试或手动触发更新
	// 生产环境中应该添加认证保护

	go func() {
		// 异步执行，避免阻塞请求
		// TODO: 调用 scheduler 的 updateAllUsers
		logger.Info("Manual monthly update triggered")
	}()

	c.JSON(http.StatusOK, gin.H{
		"message": "Monthly update triggered",
	})
}
