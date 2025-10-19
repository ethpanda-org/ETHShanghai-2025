package email

import (
	"net/http"
	"strings"
	"timelock-backend/internal/middleware"
	"timelock-backend/internal/service/auth"
	"timelock-backend/internal/service/email"
	"timelock-backend/internal/types"
	"timelock-backend/pkg/logger"
	"timelock-backend/pkg/utils"

	"github.com/gin-gonic/gin"
)

// EmailHandler 邮箱API处理器
type EmailHandler struct {
	emailService email.EmailService
	authService  auth.Service
}

// NewEmailHandler 创建邮箱处理器实例
func NewEmailHandler(emailService email.EmailService, authService auth.Service) *EmailHandler {
	return &EmailHandler{
		emailService: emailService,
		authService:  authService,
	}
}

// RegisterRoutes 注册邮箱相关路由
func (h *EmailHandler) RegisterRoutes(router *gin.RouterGroup) {
	// 邮箱API组 - 需要认证
	emailGroup := router.Group("/emails", middleware.AuthMiddleware(h.authService))
	{
		// 邮箱管理：不暴露单独的添加邮箱接口，通过发送验证码自动创建/复用未验证记录
		// 获取邮箱列表
		// POST /api/v1/emails
		// http://localhost:8080/api/v1/emails
		emailGroup.POST("", h.GetEmails)
		// 更新邮箱备注
		// POST /api/v1/emails/remark
		// http://localhost:8080/api/v1/emails/remark
		emailGroup.POST("/remark", h.UpdateEmailRemark)
		// 删除邮箱
		// POST /api/v1/emails/delete
		// http://localhost:8080/api/v1/emails/delete
		emailGroup.POST("/delete", h.DeleteEmail)

		// 邮箱验证
		// 发送验证码
		// POST /api/v1/emails/send-verification
		// http://localhost:8080/api/v1/emails/send-verification
		emailGroup.POST("/send-verification", h.SendVerificationCode)
		// 验证邮箱
		// POST /api/v1/emails/verify
		// http://localhost:8080/api/v1/emails/verify
		emailGroup.POST("/verify", h.VerifyEmail)
	}
}

// ===== 邮箱管理相关API =====

// 旧的添加邮箱接口已移除

// GetEmails 获取用户邮箱列表
// @Summary 获取用户邮箱列表
// @Description 获取当前用户的所有邮箱地址
// @Tags Email
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body types.GetEmailsRequest false "分页参数"
// @Success 200 {object} types.APIResponse{data=types.EmailListResponse}
// @Failure 401 {object} types.APIResponse{error=types.APIError} "未授权"
// @Failure 500 {object} types.APIResponse{error=types.APIError} "服务器内部错误"
// @Router /api/v1/emails [post]
func (h *EmailHandler) GetEmails(c *gin.Context) {
	// 获取用户ID
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, types.APIResponse{Success: false, Error: &types.APIError{Code: "UNAUTHORIZED", Message: "User not authenticated"}})
		return
	}

	userIDInt, ok := userID.(int64)
	if !ok {
		c.JSON(http.StatusInternalServerError, types.APIResponse{Success: false, Error: &types.APIError{Code: "INTERNAL_ERROR", Message: "Invalid user ID format"}})
		return
	}

	// 解析分页参数（支持 body 优先，兼容 query）
	req := types.GetEmailsRequest{Page: 1, PageSize: 10}
	_ = c.ShouldBindQuery(&req)
	_ = c.ShouldBindJSON(&req)
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 || req.PageSize > 100 {
		req.PageSize = 10
	}

	result, err := h.emailService.GetUserEmails(c.Request.Context(), userIDInt, req.Page, req.PageSize)
	if err != nil {
		logger.Error("Failed to get user emails", err, "userID", userIDInt)
		c.JSON(http.StatusOK, types.APIResponse{Success: false, Error: &types.APIError{Code: "INTERNAL_ERROR", Message: "Failed to get emails", Details: err.Error()}})
		return
	}

	c.JSON(http.StatusOK, types.APIResponse{
		Success: true,
		Data:    result,
	})
}

// UpdateEmailRemark 更新邮箱备注
// @Summary 更新邮箱备注
// @Description 更新指定邮箱的备注信息
// @Tags Email
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body types.UpdateEmailRemarkWithIDRequest true "更新备注请求（包含ID）"
// @Success 200 {object} types.APIResponse
// @Failure 400 {object} types.APIResponse{error=types.APIError} "请求参数错误"
// @Failure 401 {object} types.APIResponse{error=types.APIError} "未授权"
// @Failure 403 {object} types.APIResponse{error=types.APIError} "无权限操作该邮箱"
// @Failure 404 {object} types.APIResponse{error=types.APIError} "邮箱不存在"
// @Failure 422 {object} types.APIResponse{error=types.APIError} "参数校验失败"
// @Failure 500 {object} types.APIResponse{error=types.APIError} "服务器内部错误"
// @Router /api/v1/emails/remark [post]
func (h *EmailHandler) UpdateEmailRemark(c *gin.Context) {
	// 获取用户ID
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, types.APIResponse{Success: false, Error: &types.APIError{Code: "UNAUTHORIZED", Message: "User not authenticated"}})
		return
	}

	userIDInt, ok := userID.(int64)
	if !ok {
		c.JSON(http.StatusInternalServerError, types.APIResponse{Success: false, Error: &types.APIError{Code: "INTERNAL_ERROR", Message: "Invalid user ID format"}})
		return
	}

	var req types.UpdateEmailRemarkWithIDRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.Error("Invalid request body", err)
		c.JSON(http.StatusBadRequest, types.APIResponse{Success: false, Error: &types.APIError{Code: "INVALID_REQUEST", Message: "Invalid request body", Details: err.Error()}})
		return
	}
	if req.Remark != nil {
		trimmed := strings.TrimSpace(*req.Remark)
		req.Remark = &trimmed
		if len(trimmed) > 200 {
			c.JSON(http.StatusUnprocessableEntity, types.APIResponse{Success: false, Error: &types.APIError{Code: "INVALID_REMARK", Message: "remark too long (max 200)"}})
			return
		}
	}

	err := h.emailService.UpdateEmailRemark(c.Request.Context(), req.ID, userIDInt, req.Remark)
	if err != nil {
		logger.Error("Failed to update email remark", err, "userID", userIDInt, "userEmailID", req.ID)
		if err.Error() == "user email not found" {
			c.JSON(http.StatusNotFound, types.APIResponse{Success: false, Error: &types.APIError{Code: "EMAIL_NOT_FOUND", Message: "Email not found"}})
			return
		}
		c.JSON(http.StatusInternalServerError, types.APIResponse{Success: false, Error: &types.APIError{Code: "INTERNAL_ERROR", Message: "Failed to update email remark", Details: err.Error()}})
		return
	}

	c.JSON(http.StatusOK, types.APIResponse{
		Success: true,
		Data:    gin.H{"message": "Email remark updated successfully"},
	})
}

// DeleteEmail 删除邮箱
// @Summary 删除邮箱
// @Description 删除指定的邮箱地址
// @Tags Email
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body types.DeleteEmailRequest true "删除邮箱请求（包含ID）"
// @Success 200 {object} types.APIResponse
// @Failure 400 {object} types.APIResponse{error=types.APIError} "请求参数错误"
// @Failure 401 {object} types.APIResponse{error=types.APIError} "未授权"
// @Failure 403 {object} types.APIResponse{error=types.APIError} "无权限操作该邮箱"
// @Failure 404 {object} types.APIResponse{error=types.APIError} "邮箱不存在"
// @Failure 500 {object} types.APIResponse{error=types.APIError} "服务器内部错误"
// @Router /api/v1/emails/delete [post]
func (h *EmailHandler) DeleteEmail(c *gin.Context) {
	// 获取用户ID
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, types.APIResponse{Success: false, Error: &types.APIError{Code: "UNAUTHORIZED", Message: "User not authenticated"}})
		return
	}

	userIDInt, ok := userID.(int64)
	if !ok {
		c.JSON(http.StatusInternalServerError, types.APIResponse{Success: false, Error: &types.APIError{Code: "INTERNAL_ERROR", Message: "Invalid user ID format"}})
		return
	}

	var req types.DeleteEmailRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, types.APIResponse{Success: false, Error: &types.APIError{Code: "INVALID_REQUEST", Message: "Invalid request body", Details: err.Error()}})
		return
	}

	err := h.emailService.DeleteUserEmail(c.Request.Context(), req.ID, userIDInt)
	if err != nil {
		logger.Error("Failed to delete email", err, "userID", userIDInt, "userEmailID", req.ID)
		if err.Error() == "user email not found" {
			c.JSON(http.StatusNotFound, types.APIResponse{Success: false, Error: &types.APIError{Code: "EMAIL_NOT_FOUND", Message: "Email not found"}})
			return
		}
		c.JSON(http.StatusInternalServerError, types.APIResponse{Success: false, Error: &types.APIError{Code: "INTERNAL_ERROR", Message: "Failed to delete email", Details: err.Error()}})
		return
	}

	c.JSON(http.StatusOK, types.APIResponse{
		Success: true,
		Data:    gin.H{"message": "Email deleted successfully"},
	})
}

// ===== 邮箱验证相关API =====

// SendVerificationCode 发送验证码
// @Summary 发送验证码
// @Description 基于邮箱发送验证码。后端会自动创建/复用未验证记录，并允许更新备注。email 必填，remark 最长200字符。
// @Tags Email
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body types.SendVerificationCodeRequest true "发送验证码请求（email 必填，remark 可选，最长200）"
// @Success 200 {object} types.APIResponse
// @Failure 400 {object} types.APIResponse{error=types.APIError} "请求参数错误（缺少email）"
// @Failure 401 {object} types.APIResponse{error=types.APIError} "未授权"
// @Failure 404 {object} types.APIResponse{error=types.APIError} "邮箱不存在"
// @Failure 429 {object} types.APIResponse{error=types.APIError} "发送过于频繁"
// @Failure 422 {object} types.APIResponse{error=types.APIError} "参数校验失败（INVALID_EMAIL_FORMAT / INVALID_REMARK）"
// @Failure 500 {object} types.APIResponse{error=types.APIError} "服务器内部错误"
// @Router /api/v1/emails/send-verification [post]
func (h *EmailHandler) SendVerificationCode(c *gin.Context) {
	// 获取用户ID
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, types.APIResponse{Success: false, Error: &types.APIError{Code: "UNAUTHORIZED", Message: "User not authenticated"}})
		return
	}

	userIDInt, ok := userID.(int64)
	if !ok {
		c.JSON(http.StatusInternalServerError, types.APIResponse{Success: false, Error: &types.APIError{Code: "INTERNAL_ERROR", Message: "Invalid user ID format"}})
		return
	}

	var req types.SendVerificationCodeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.Error("Invalid request body", err)
		c.JSON(http.StatusBadRequest, types.APIResponse{Success: false, Error: &types.APIError{Code: "INVALID_REQUEST", Message: "Invalid request body", Details: err.Error()}})
		return
	}

	// 标准化
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	if req.Remark != nil {
		trimmed := strings.TrimSpace(*req.Remark)
		req.Remark = &trimmed
		if len(trimmed) > 200 {
			c.JSON(http.StatusUnprocessableEntity, types.APIResponse{Success: false, Error: &types.APIError{Code: "INVALID_REMARK", Message: "remark too long (max 200)"}})
			return
		}
	}

	// 邮箱必填
	if req.Email == "" {
		c.JSON(http.StatusBadRequest, types.APIResponse{Success: false, Error: &types.APIError{Code: "INVALID_REQUEST", Message: "email is required"}})
		return
	}

	// 校验邮箱格式
	if !utils.IsValidEmail(req.Email) {
		c.JSON(http.StatusUnprocessableEntity, types.APIResponse{Success: false, Error: &types.APIError{Code: "INVALID_EMAIL_FORMAT", Message: "Invalid email format"}})
		return
	}

	err := h.emailService.SendVerificationCodeByEmail(c.Request.Context(), userIDInt, req.Email, req.Remark)
	if err != nil {
		logger.Error("Failed to send verification code", err, "userID", userIDInt, "email", req.Email)
		switch err.Error() {
		case "email already verified":
			c.JSON(http.StatusConflict, types.APIResponse{Success: false, Error: &types.APIError{Code: "EMAIL_ALREADY_VERIFIED", Message: "Email already verified", Details: err.Error()}})
			return
		case "verification code sent recently, please wait":
			c.JSON(http.StatusTooManyRequests, types.APIResponse{Success: false, Error: &types.APIError{Code: "TOO_MANY_REQUESTS", Message: "Verification code sent recently, please wait", Details: err.Error()}})
			return
		default:
			c.JSON(http.StatusInternalServerError, types.APIResponse{Success: false, Error: &types.APIError{Code: "INTERNAL_ERROR", Message: "Failed to send verification code", Details: err.Error()}})
			return
		}
	}

	c.JSON(http.StatusOK, types.APIResponse{
		Success: true,
		Data:    gin.H{"message": "Verification code sent successfully"},
	})
}

// VerifyEmail 验证邮箱
// @Summary 验证邮箱
// @Description 使用验证码验证邮箱地址。email 必填，code 为6位数字。
// @Tags Email
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body types.VerifyEmailRequest true "验证邮箱请求（email+code）"
// @Success 200 {object} types.APIResponse
// @Failure 400 {object} types.APIResponse{error=types.APIError} "请求参数错误"
// @Failure 401 {object} types.APIResponse{error=types.APIError} "未授权"
// @Failure 404 {object} types.APIResponse{error=types.APIError} "邮箱不存在"
// @Failure 422 {object} types.APIResponse{error=types.APIError} "验证码无效或已过期 / 参数校验失败（INVALID_EMAIL_FORMAT / INVALID_CODE_FORMAT）"
// @Failure 500 {object} types.APIResponse{error=types.APIError} "服务器内部错误"
// @Router /api/v1/emails/verify [post]
func (h *EmailHandler) VerifyEmail(c *gin.Context) {
	// 获取用户ID
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, types.APIResponse{Success: false, Error: &types.APIError{Code: "UNAUTHORIZED", Message: "User not authenticated"}})
		return
	}

	userIDInt, ok := userID.(int64)
	if !ok {
		c.JSON(http.StatusInternalServerError, types.APIResponse{Success: false, Error: &types.APIError{Code: "INTERNAL_ERROR", Message: "Invalid user ID format"}})
		return
	}

	var req types.VerifyEmailRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.Error("Invalid request body", err)
		c.JSON(http.StatusBadRequest, types.APIResponse{Success: false, Error: &types.APIError{Code: "INVALID_REQUEST", Message: "Invalid request body", Details: err.Error()}})
		return
	}

	// 标准化
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	req.Code = strings.TrimSpace(req.Code)

	// 邮箱和验证码必填
	if req.Email == "" || req.Code == "" {
		c.JSON(http.StatusBadRequest, types.APIResponse{Success: false, Error: &types.APIError{Code: "INVALID_REQUEST", Message: "email and code are required"}})
		return
	}
	// 校验邮箱格式
	if !utils.IsValidEmail(req.Email) {
		c.JSON(http.StatusUnprocessableEntity, types.APIResponse{Success: false, Error: &types.APIError{Code: "INVALID_EMAIL_FORMAT", Message: "Invalid email format"}})
		return
	}
	// 校验验证码格式
	if !utils.IsValidVerificationCode(req.Code) {
		c.JSON(http.StatusUnprocessableEntity, types.APIResponse{Success: false, Error: &types.APIError{Code: "INVALID_CODE_FORMAT", Message: "Invalid code format (expect 6 digits)"}})
		return
	}

	err := h.emailService.VerifyEmailByEmail(c.Request.Context(), userIDInt, req.Email, req.Code)
	if err != nil {
		logger.Error("Failed to verify email", err, "userID", userIDInt, "email", req.Email)
		if err.Error() == "user email not found" {
			c.JSON(http.StatusNotFound, types.APIResponse{Success: false, Error: &types.APIError{Code: "EMAIL_NOT_FOUND", Message: "Email not found"}})
			return
		}
		if err.Error() == "invalid or expired verification code" || err.Error() == "failed to verify code: invalid or expired verification code" {
			c.JSON(http.StatusUnprocessableEntity, types.APIResponse{Success: false, Error: &types.APIError{Code: "INVALID_OR_EXPIRED_CODE", Message: "Invalid or expired verification code"}})
			return
		}
		c.JSON(http.StatusInternalServerError, types.APIResponse{Success: false, Error: &types.APIError{Code: "INTERNAL_ERROR", Message: "Failed to verify email", Details: err.Error()}})
		return
	}

	c.JSON(http.StatusOK, types.APIResponse{
		Success: true,
		Data:    gin.H{"message": "Email verified successfully"},
	})
}
