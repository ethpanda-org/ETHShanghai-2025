package handlers

import (
    "net/http"
    "strconv"

    "github.com/gin-gonic/gin"

    "github.com/KamisAyaka/crowdsourcing_graphql/packages/backend/internal/service/score"
)

type GuildHandler struct {
    service *score.EnhancedGuildScoreService
}

func NewGuildHandler(service *score.EnhancedGuildScoreService) *GuildHandler {
    return &GuildHandler{service: service}
}

// GetUserGuildScore 获取指定地址的 guild score（会计算并保存最新一次）
func (h *GuildHandler) GetUserGuildScore(c *gin.Context) {
    address := c.Param("address")
    res, err := h.service.GetOrCalculateByAddress(c.Request.Context(), address)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    c.JSON(http.StatusOK, gin.H{"data": res})
}

// GetGuildLeaderboard 获取排行榜
func (h *GuildHandler) GetGuildLeaderboard(c *gin.Context) {
    limit, _ := strconv.Atoi(c.DefaultQuery("limit", "100"))
    offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
    res, err := h.service.GetLeaderboard(c.Request.Context(), limit, offset)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    c.JSON(http.StatusOK, gin.H{"data": res, "meta": gin.H{"limit": limit, "offset": offset, "total": len(res)}})
}

// GetGuildScoreHistory 获取用户分数历史
func (h *GuildHandler) GetGuildScoreHistory(c *gin.Context) {
    address := c.Param("address")
    limit, _ := strconv.Atoi(c.DefaultQuery("limit", "30"))
    res, err := h.service.GetHistoryByAddress(c.Request.Context(), address, limit)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    c.JSON(http.StatusOK, gin.H{"data": res})
}


