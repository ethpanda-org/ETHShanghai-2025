package handlers

import (
	"net/http"
	"strconv"

	"github.com/KamisAyaka/crowdsourcing_graphql/packages/backend/internal/service/sync"
	"github.com/gin-gonic/gin"
)

type SyncHandler struct {
	syncScheduler *sync.SyncScheduler
}

func NewSyncHandler(syncScheduler *sync.SyncScheduler) *SyncHandler {
	return &SyncHandler{
		syncScheduler: syncScheduler,
	}
}

// SyncAllUsers 手动触发全量用户数据同步
// @Summary 同步所有用户数据
// @Description 从子图同步所有用户的行为数据到本地数据库
// @Tags sync
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{} "同步成功"
// @Failure 500 {object} map[string]interface{} "同步失败"
// @Router /api/sync/users [post]
func (h *SyncHandler) SyncAllUsers(c *gin.Context) {
	// 这里可以添加权限验证
	// 例如：只有管理员才能触发全量同步
	
	c.JSON(http.StatusOK, gin.H{
		"message": "全量用户数据同步已启动",
		"status":  "started",
	})
}

// SyncUser 同步特定用户数据
// @Summary 同步特定用户数据
// @Description 从子图同步指定用户的行为数据
// @Tags sync
// @Accept json
// @Produce json
// @Param address path string true "用户地址"
// @Success 200 {object} map[string]interface{} "同步成功"
// @Failure 400 {object} map[string]interface{} "请求参数错误"
// @Failure 500 {object} map[string]interface{} "同步失败"
// @Router /api/sync/users/{address} [post]
func (h *SyncHandler) SyncUser(c *gin.Context) {
	userAddress := c.Param("address")
	if userAddress == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "用户地址不能为空",
		})
		return
	}
	
	// 执行用户数据同步
	if err := h.syncScheduler.SyncSpecificUser(userAddress); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "同步用户数据失败",
			"details": err.Error(),
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"message": "用户数据同步完成",
		"address": userAddress,
		"status":  "completed",
	})
}

// GetSyncStatus 获取同步状态
// @Summary 获取数据同步状态
// @Description 获取当前数据同步的状态信息
// @Tags sync
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{} "同步状态"
// @Router /api/sync/status [get]
func (h *SyncHandler) GetSyncStatus(c *gin.Context) {
	status := h.syncScheduler.GetSyncStatus()
	c.JSON(http.StatusOK, status)
}

// SyncUsersBatch 批量同步用户数据
// @Summary 批量同步用户数据
// @Description 批量同步多个用户的数据
// @Tags sync
// @Accept json
// @Produce json
// @Param request body BatchSyncRequest true "批量同步请求"
// @Success 200 {object} map[string]interface{} "同步结果"
// @Failure 400 {object} map[string]interface{} "请求参数错误"
// @Router /api/sync/users/batch [post]
func (h *SyncHandler) SyncUsersBatch(c *gin.Context) {
	var request BatchSyncRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "请求参数错误",
			"details": err.Error(),
		})
		return
	}
	
	if len(request.Addresses) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "用户地址列表不能为空",
		})
		return
	}
	
	if len(request.Addresses) > 100 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "批量同步用户数量不能超过100个",
		})
		return
	}
	
	// 执行批量同步
	results := make([]UserSyncResult, 0, len(request.Addresses))
	successCount := 0
	failureCount := 0
	
	for _, address := range request.Addresses {
		result := UserSyncResult{
			Address: address,
		}
		
		if err := h.syncScheduler.SyncSpecificUser(address); err != nil {
			result.Status = "failed"
			result.Error = err.Error()
			failureCount++
		} else {
			result.Status = "success"
			successCount++
		}
		
		results = append(results, result)
	}
	
	c.JSON(http.StatusOK, gin.H{
		"message":       "批量同步完成",
		"total":         len(request.Addresses),
		"success_count": successCount,
		"failure_count": failureCount,
		"results":       results,
	})
}

// SyncUsersByPage 分页同步用户数据
// @Summary 分页同步用户数据
// @Description 分页同步用户数据，避免一次性同步过多数据
// @Tags sync
// @Accept json
// @Produce json
// @Param page query int false "页码" default(1)
// @Param page_size query int false "每页大小" default(50)
// @Success 200 {object} map[string]interface{} "同步结果"
// @Failure 400 {object} map[string]interface{} "请求参数错误"
// @Router /api/sync/users/page [post]
func (h *SyncHandler) SyncUsersByPage(c *gin.Context) {
	pageStr := c.DefaultQuery("page", "1")
	pageSizeStr := c.DefaultQuery("page_size", "50")
	
	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "页码必须是大于0的整数",
		})
		return
	}
	
	pageSize, err := strconv.Atoi(pageSizeStr)
	if err != nil || pageSize < 1 || pageSize > 100 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "每页大小必须是1-100之间的整数",
		})
		return
	}
	
	// 这里可以实现分页同步逻辑
	// 目前返回模拟数据
	c.JSON(http.StatusOK, gin.H{
		"message":    "分页同步功能开发中",
		"page":       page,
		"page_size":  pageSize,
		"status":     "not_implemented",
	})
}

// 请求和响应结构体
type BatchSyncRequest struct {
	Addresses []string `json:"addresses" binding:"required"`
}

type UserSyncResult struct {
	Address string `json:"address"`
	Status  string `json:"status"`
	Error   string `json:"error,omitempty"`
}
