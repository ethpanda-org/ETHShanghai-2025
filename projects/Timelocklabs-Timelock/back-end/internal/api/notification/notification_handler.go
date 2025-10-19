package notification

import (
	"errors"
	"net/http"
	"strings"
	"timelock-backend/internal/middleware"
	"timelock-backend/internal/service/auth"
	"timelock-backend/internal/service/notification"
	"timelock-backend/internal/types"
	"timelock-backend/pkg/logger"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// NotificationHandler 通知API处理器
type NotificationHandler struct {
	notificationService notification.NotificationService
	authService         auth.Service
}

// NewNotificationHandler 创建通知处理器实例
func NewNotificationHandler(notificationService notification.NotificationService, authService auth.Service) *NotificationHandler {
	return &NotificationHandler{
		notificationService: notificationService,
		authService:         authService,
	}
}

// RegisterRoutes 注册通知相关路由
func (h *NotificationHandler) RegisterRoutes(router *gin.RouterGroup) {
	// 通知API组 - 需要认证
	notificationGroup := router.Group("/notifications", middleware.AuthMiddleware(h.authService))
	{
		// 获取所有通知配置
		// POST /api/v1/notifications/configs
		// http://localhost:8080/api/v1/notifications/configs
		notificationGroup.POST("/configs", h.GetAllNotificationConfigs)

		// 创建通知配置
		// POST /api/v1/notifications/create
		// http://localhost:8080/api/v1/notifications/create
		notificationGroup.POST("/create", h.CreateNotificationConfig)

		// 更新通知配置
		// POST /api/v1/notifications/update
		// http://localhost:8080/api/v1/notifications/update
		notificationGroup.POST("/update", h.UpdateNotificationConfig)

		// 删除通知配置
		// POST /api/v1/notifications/delete
		// http://localhost:8080/api/v1/notifications/delete
		notificationGroup.POST("/delete", h.DeleteNotificationConfig)
	}
}

// ===== 通用API =====

// GetAllNotificationConfigs 获取所有通知配置
// @Summary 获取所有通知配置
// @Description 获取当前用户的所有通知渠道配置，如果用户没有任何配置则返回空列表
// @Tags Notification
// @Accept json
// @Produce json
// @Success 200 {object} types.APIResponse{data=types.NotificationConfigListResponse} "获取成功，返回所有配置或空列表"
// @Failure 401 {object} types.APIResponse{error=types.APIError} "未认证 - UNAUTHORIZED: 用户未认证"
// @Failure 500 {object} types.APIResponse{error=types.APIError} "服务器内部错误 - INTERNAL_ERROR: 获取配置失败; DATABASE_ERROR: 数据库访问失败"
// @Router /api/v1/notifications/configs [post]
func (h *NotificationHandler) GetAllNotificationConfigs(c *gin.Context) {
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
		logger.Error("GetAllNotificationConfigs error", nil, "message", "user not authenticated")
		return
	}

	// 调用service层
	response, err := h.notificationService.GetAllNotificationConfigs(c.Request.Context(), userAddress)
	if err != nil {
		// 处理特定错误类型
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// 没有找到任何配置，返回空列表
			emptyResponse := &types.NotificationConfigListResponse{
				TelegramConfigs: []*types.TelegramConfig{},
				LarkConfigs:     []*types.LarkConfig{},
				FeishuConfigs:   []*types.FeishuConfig{},
			}
			c.JSON(http.StatusOK, types.APIResponse{
				Success: true,
				Data:    emptyResponse,
			})
			return
		}

		// 数据库连接错误或其他内部错误
		if strings.Contains(err.Error(), "failed to get") {
			c.JSON(http.StatusInternalServerError, types.APIResponse{
				Success: false,
				Error: &types.APIError{
					Code:    "DATABASE_ERROR",
					Message: "Failed to retrieve notification configs from database",
					Details: err.Error(),
				},
			})
			logger.Error("GetAllNotificationConfigs error", err, "user_address", userAddress)
			return
		}

		// 通用内部错误
		c.JSON(http.StatusInternalServerError, types.APIResponse{
			Success: false,
			Error: &types.APIError{
				Code:    "INTERNAL_ERROR",
				Message: "Failed to get notification configs",
				Details: err.Error(),
			},
		})
		logger.Error("GetAllNotificationConfigs error", err, "user_address", userAddress)
		return
	}

	logger.Info("GetAllNotificationConfigs success", "user_address", userAddress)
	c.JSON(http.StatusOK, types.APIResponse{
		Success: true,
		Data:    response,
	})
}

// CreateNotificationConfig 创建通知配置
// @Summary 创建通知配置
// @Description 为当前用户创建新的通知配置, 名字的空格会被自动去除, 防止攻击者通过空格来绕过名称验证
// @Tags Notification
// @Accept json
// @Produce json
// @Param request body types.CreateNotificationRequest true "创建请求"
// @Success 200 {object} types.APIResponse{data=object} "创建成功"
// @Failure 400 {object} types.APIResponse{error=types.APIError} "请求参数错误 - INVALID_REQUEST: 请求参数格式错误; INVALID_NAME: 名称不能为空; INVALID_CHANNEL: 无效的通知渠道; MISSING_TELEGRAM_FIELDS: 缺少telegram必填字段; MISSING_WEBHOOK_URL: 缺少webhook_url字段; MISSING_REQUIRED_FIELDS: 缺少必填字段"
// @Failure 401 {object} types.APIResponse{error=types.APIError} "未认证 - UNAUTHORIZED: 用户未认证"
// @Failure 409 {object} types.APIResponse{error=types.APIError} "配置冲突 - CONFIG_ALREADY_EXISTS: 同名配置已存在"
// @Failure 500 {object} types.APIResponse{error=types.APIError} "服务器内部错误 - INTERNAL_ERROR: 创建配置失败"
// @Router /api/v1/notifications/create [post]
func (h *NotificationHandler) CreateNotificationConfig(c *gin.Context) {
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
		logger.Error("CreateNotificationConfig error", nil, "message", "user not authenticated")
		return
	}

	var req types.CreateNotificationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, types.APIResponse{
			Success: false,
			Error: &types.APIError{
				Code:    "INVALID_REQUEST",
				Message: "Invalid request parameters",
				Details: err.Error(),
			},
		})
		logger.Error("CreateNotificationConfig error", err, "message", "invalid request parameters", "user_address", userAddress)
		return
	}

	// 标准化名称
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		c.JSON(http.StatusBadRequest, types.APIResponse{
			Success: false,
			Error: &types.APIError{
				Code:    "INVALID_NAME",
				Message: "Name cannot be empty",
			},
		})
		return
	}

	// 验证渠道类型
	req.Channel = strings.ToLower(req.Channel)
	if req.Channel != "telegram" && req.Channel != "lark" && req.Channel != "feishu" {
		c.JSON(http.StatusBadRequest, types.APIResponse{
			Success: false,
			Error: &types.APIError{
				Code:    "INVALID_CHANNEL",
				Message: "Invalid notification channel. Supported channels: telegram, lark, feishu",
				Details: "channel must be one of: telegram, lark, feishu",
			},
		})
		return
	}

	// 验证渠道特定的必填字段
	if req.Channel == "telegram" {
		if req.BotToken == "" || req.ChatID == "" {
			c.JSON(http.StatusBadRequest, types.APIResponse{
				Success: false,
				Error: &types.APIError{
					Code:    "MISSING_TELEGRAM_FIELDS",
					Message: "bot_token and chat_id are required for telegram channel",
					Details: "Please provide both bot_token and chat_id",
				},
			})
			return
		}
	} else if req.Channel == "lark" || req.Channel == "feishu" {
		if req.WebhookURL == "" {
			c.JSON(http.StatusBadRequest, types.APIResponse{
				Success: false,
				Error: &types.APIError{
					Code:    "MISSING_WEBHOOK_URL",
					Message: "webhook_url is required for " + req.Channel + " channel",
					Details: "Please provide webhook_url",
				},
			})
			return
		}
	}

	// 调用service层
	err := h.notificationService.CreateNotificationConfig(c.Request.Context(), userAddress, &req)
	if err != nil {
		// 处理特定错误类型
		if strings.Contains(err.Error(), "already exists") {
			c.JSON(http.StatusConflict, types.APIResponse{
				Success: false,
				Error: &types.APIError{
					Code:    "CONFIG_ALREADY_EXISTS",
					Message: "A notification config with this name already exists for the specified channel",
					Details: err.Error(),
				},
			})
			logger.Error("CreateNotificationConfig error", err, "user_address", userAddress, "name", req.Name, "channel", req.Channel)
			return
		}

		if strings.Contains(err.Error(), "bot_token and chat_id are required") ||
			strings.Contains(err.Error(), "webhook_url are required") {
			c.JSON(http.StatusBadRequest, types.APIResponse{
				Success: false,
				Error: &types.APIError{
					Code:    "MISSING_REQUIRED_FIELDS",
					Message: "Required fields are missing",
					Details: err.Error(),
				},
			})
			logger.Error("CreateNotificationConfig error", err, "user_address", userAddress, "name", req.Name, "channel", req.Channel)
			return
		}

		if strings.Contains(err.Error(), "invalid channel") {
			c.JSON(http.StatusBadRequest, types.APIResponse{
				Success: false,
				Error: &types.APIError{
					Code:    "INVALID_CHANNEL",
					Message: "Invalid notification channel",
					Details: err.Error(),
				},
			})
			logger.Error("CreateNotificationConfig error", err, "user_address", userAddress, "name", req.Name, "channel", req.Channel)
			return
		}

		// 通用内部错误
		c.JSON(http.StatusInternalServerError, types.APIResponse{
			Success: false,
			Error: &types.APIError{
				Code:    "INTERNAL_ERROR",
				Message: "Failed to create notification config",
				Details: err.Error(),
			},
		})
		logger.Error("CreateNotificationConfig error", err, "user_address", userAddress, "name", req.Name, "channel", req.Channel)
		return
	}

	logger.Info("CreateNotificationConfig success", "user_address", userAddress, "name", req.Name)
	c.JSON(http.StatusOK, types.APIResponse{
		Success: true,
		Data:    gin.H{"message": "Notification config created successfully"},
	})
}

// UpdateNotificationConfig 更新通知配置
// @Summary 更新通知配置
// @Description 更新当前用户的通知配置, 如果不需要更新某个字段, 可以不传该字段, 但至少传一个字段
// @Tags Notification
// @Accept json
// @Produce json
// @Param request body types.UpdateNotificationRequest true "更新请求"
// @Success 200 {object} types.APIResponse{data=object} "更新成功"
// @Failure 400 {object} types.APIResponse{error=types.APIError} "请求参数错误 - INVALID_REQUEST: 请求参数格式错误; INVALID_NAME: 名称不能为空; INVALID_CHANNEL: 无效的通知渠道; NO_FIELDS_TO_UPDATE: 至少需要提供一个字段进行更新"
// @Failure 401 {object} types.APIResponse{error=types.APIError} "未认证 - UNAUTHORIZED: 用户未认证"
// @Failure 404 {object} types.APIResponse{error=types.APIError} "配置不存在 - CONFIG_NOT_FOUND: 指定的通知配置不存在"
// @Failure 500 {object} types.APIResponse{error=types.APIError} "服务器内部错误 - INTERNAL_ERROR: 更新配置失败"
// @Router /api/v1/notifications/update [post]
func (h *NotificationHandler) UpdateNotificationConfig(c *gin.Context) {

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
		logger.Error("UpdateNotificationConfig error", nil, "message", "user not authenticated")
		return
	}

	var req types.UpdateNotificationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, types.APIResponse{
			Success: false,
			Error: &types.APIError{
				Code:    "INVALID_REQUEST",
				Message: "Invalid request parameters",
				Details: err.Error(),
			},
		})
		logger.Error("UpdateNotificationConfig error", err, "message", "invalid request parameters", "user_address", userAddress)
		return
	}

	// 验证名称
	if req.Name == nil || strings.TrimSpace(*req.Name) == "" {
		c.JSON(http.StatusBadRequest, types.APIResponse{
			Success: false,
			Error: &types.APIError{
				Code:    "INVALID_NAME",
				Message: "Name is required",
				Details: "Name cannot be empty or null",
			},
		})
		return
	}

	// 验证渠道类型
	if req.Channel == nil || strings.TrimSpace(*req.Channel) == "" {
		c.JSON(http.StatusBadRequest, types.APIResponse{
			Success: false,
			Error: &types.APIError{
				Code:    "INVALID_CHANNEL",
				Message: "Channel is required",
				Details: "Channel cannot be empty or null",
			},
		})
		return
	}

	*req.Channel = strings.ToLower(*req.Channel)
	if *req.Channel != "telegram" && *req.Channel != "lark" && *req.Channel != "feishu" {
		c.JSON(http.StatusBadRequest, types.APIResponse{
			Success: false,
			Error: &types.APIError{
				Code:    "INVALID_CHANNEL",
				Message: "Invalid notification channel. Supported channels: telegram, lark, feishu",
				Details: "channel must be one of: telegram, lark, feishu",
			},
		})
		return
	}

	// 验证至少有一个字段要更新
	hasUpdate := false
	if *req.Channel == "telegram" {
		hasUpdate = req.BotToken != nil || req.ChatID != nil || req.IsActive != nil
	} else if *req.Channel == "lark" || *req.Channel == "feishu" {
		hasUpdate = req.WebhookURL != nil || req.Secret != nil || req.IsActive != nil
	}

	if !hasUpdate {
		c.JSON(http.StatusBadRequest, types.APIResponse{
			Success: false,
			Error: &types.APIError{
				Code:    "NO_FIELDS_TO_UPDATE",
				Message: "At least one field must be provided for update",
				Details: "Please provide at least one field to update",
			},
		})
		return
	}

	// 调用service层
	err := h.notificationService.UpdateNotificationConfig(c.Request.Context(), userAddress, &req)
	if err != nil {
		// 处理特定错误类型
		if strings.Contains(err.Error(), "not found") {
			c.JSON(http.StatusNotFound, types.APIResponse{
				Success: false,
				Error: &types.APIError{
					Code:    "CONFIG_NOT_FOUND",
					Message: "Notification config not found",
					Details: err.Error(),
				},
			})
			logger.Error("UpdateNotificationConfig error", err, "user_address", userAddress, "name", *req.Name, "channel", *req.Channel)
			return
		}

		if strings.Contains(err.Error(), "at least one field must be provided") ||
			strings.Contains(err.Error(), "no fields to update") {
			c.JSON(http.StatusBadRequest, types.APIResponse{
				Success: false,
				Error: &types.APIError{
					Code:    "NO_FIELDS_TO_UPDATE",
					Message: "At least one field must be provided for update",
					Details: err.Error(),
				},
			})
			logger.Error("UpdateNotificationConfig error", err, "user_address", userAddress, "name", *req.Name, "channel", *req.Channel)
			return
		}

		if strings.Contains(err.Error(), "invalid channel") {
			c.JSON(http.StatusBadRequest, types.APIResponse{
				Success: false,
				Error: &types.APIError{
					Code:    "INVALID_CHANNEL",
					Message: "Invalid notification channel",
					Details: err.Error(),
				},
			})
			logger.Error("UpdateNotificationConfig error", err, "user_address", userAddress, "name", *req.Name, "channel", *req.Channel)
			return
		}

		// 通用内部错误
		c.JSON(http.StatusInternalServerError, types.APIResponse{
			Success: false,
			Error: &types.APIError{
				Code:    "INTERNAL_ERROR",
				Message: "Failed to update notification config",
				Details: err.Error(),
			},
		})
		logger.Error("UpdateNotificationConfig error", err, "user_address", userAddress, "name", *req.Name, "channel", *req.Channel)
		return
	}

	logger.Info("UpdateNotificationConfig success", "user_address", userAddress, "name", *req.Name)
	c.JSON(http.StatusOK, types.APIResponse{
		Success: true,
		Data:    gin.H{"message": "Notification config updated successfully"},
	})
}

// DeleteNotificationConfig 删除通知配置
// @Summary 删除通知配置
// @Description 删除当前用户的通知配置, 名字的空格会被自动去除, 防止攻击者通过空格来绕过名称验证
// @Tags Notification
// @Accept json
// @Produce json
// @Param request body types.DeleteNotificationRequest true "删除请求"
// @Success 200 {object} types.APIResponse{data=object} "删除成功"
// @Failure 400 {object} types.APIResponse{error=types.APIError} "请求参数错误 - INVALID_REQUEST: 请求参数格式错误; INVALID_NAME: 名称不能为空; INVALID_CHANNEL: 无效的通知渠道"
// @Failure 401 {object} types.APIResponse{error=types.APIError} "未认证 - UNAUTHORIZED: 用户未认证"
// @Failure 404 {object} types.APIResponse{error=types.APIError} "配置不存在 - CONFIG_NOT_FOUND: 指定的通知配置不存在"
// @Failure 500 {object} types.APIResponse{error=types.APIError} "服务器内部错误 - INTERNAL_ERROR: 删除配置失败"
// @Router /api/v1/notifications/delete [post]
func (h *NotificationHandler) DeleteNotificationConfig(c *gin.Context) {
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
		logger.Error("DeleteNotificationConfig error", nil, "message", "user not authenticated")
		return
	}

	var req types.DeleteNotificationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, types.APIResponse{
			Success: false,
			Error: &types.APIError{
				Code:    "INVALID_REQUEST",
				Message: "Invalid request parameters",
				Details: err.Error(),
			},
		})
		logger.Error("DeleteNotificationConfig error", err, "message", "invalid request parameters", "user_address", userAddress)
		return
	}

	// 标准化名称
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		c.JSON(http.StatusBadRequest, types.APIResponse{
			Success: false,
			Error: &types.APIError{
				Code:    "INVALID_NAME",
				Message: "Name cannot be empty",
				Details: "Name field is required and cannot be empty",
			},
		})
		return
	}

	// 验证渠道类型
	req.Channel = strings.ToLower(req.Channel)
	if req.Channel != "telegram" && req.Channel != "lark" && req.Channel != "feishu" {
		c.JSON(http.StatusBadRequest, types.APIResponse{
			Success: false,
			Error: &types.APIError{
				Code:    "INVALID_CHANNEL",
				Message: "Invalid notification channel. Supported channels: telegram, lark, feishu",
				Details: "channel must be one of: telegram, lark, feishu",
			},
		})
		return
	}

	// 调用service层
	err := h.notificationService.DeleteNotificationConfig(c.Request.Context(), userAddress, &req)
	if err != nil {
		// 处理特定错误类型
		if strings.Contains(err.Error(), "not found") {
			c.JSON(http.StatusNotFound, types.APIResponse{
				Success: false,
				Error: &types.APIError{
					Code:    "CONFIG_NOT_FOUND",
					Message: "Notification config not found",
					Details: err.Error(),
				},
			})
			logger.Error("DeleteNotificationConfig error", err, "user_address", userAddress, "name", req.Name, "channel", req.Channel)
			return
		}

		if strings.Contains(err.Error(), "invalid channel") {
			c.JSON(http.StatusBadRequest, types.APIResponse{
				Success: false,
				Error: &types.APIError{
					Code:    "INVALID_CHANNEL",
					Message: "Invalid notification channel",
					Details: err.Error(),
				},
			})
			logger.Error("DeleteNotificationConfig error", err, "user_address", userAddress, "name", req.Name, "channel", req.Channel)
			return
		}

		// 通用内部错误
		c.JSON(http.StatusInternalServerError, types.APIResponse{
			Success: false,
			Error: &types.APIError{
				Code:    "INTERNAL_ERROR",
				Message: "Failed to delete notification config",
				Details: err.Error(),
			},
		})
		logger.Error("DeleteNotificationConfig error", err, "user_address", userAddress, "name", req.Name, "channel", req.Channel)
		return
	}

	logger.Info("DeleteNotificationConfig success", "user_address", userAddress, "name", req.Name, "channel", req.Channel)
	c.JSON(http.StatusOK, types.APIResponse{
		Success: true,
		Data:    gin.H{"message": "Notification config deleted successfully"},
	})
}
