package middleware

import (
	"errors"
	"net/http"
	"strings"

	"timelock-backend/internal/service/auth"
	"timelock-backend/internal/types"
	"timelock-backend/pkg/logger"

	"github.com/gin-gonic/gin"
)

// AuthMiddleware JWT认证中间件
// 1. 从请求头获取Authorization
// 2. 检查Bearer前缀
// 3. 提取token
// 4. 验证token
// 5. 将用户信息存储到上下文中
// 6. 继续处理请求
func AuthMiddleware(authService auth.Service) gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		// 从请求头获取Authorization
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, types.APIResponse{
				Success: false,
				Error: &types.APIError{
					Code:    "MISSING_AUTH_HEADER",
					Message: "Authorization header is required",
				},
			})
			logger.Error("AuthMiddleware Error: ", errors.New("missing authorization header"))
			c.Abort()
			return
		}

		// 检查Bearer前缀
		const bearerPrefix = "Bearer "
		if !strings.HasPrefix(authHeader, bearerPrefix) {
			c.JSON(http.StatusUnauthorized, types.APIResponse{
				Success: false,
				Error: &types.APIError{
					Code:    "INVALID_AUTH_FORMAT",
					Message: "Authorization header must start with Bearer",
				},
			})
			logger.Error("AuthMiddleware Error: ", errors.New("authorization header must start with Bearer"))
			c.Abort()
			return
		}

		// 提取token
		token := strings.TrimPrefix(authHeader, bearerPrefix)
		if token == "" {
			c.JSON(http.StatusUnauthorized, types.APIResponse{
				Success: false,
				Error: &types.APIError{
					Code:    "MISSING_TOKEN",
					Message: "JWT token is required",
				},
			})
			logger.Error("AuthMiddleware Error: ", errors.New("JWT token is required"))
			c.Abort()
			return
		}

		// 验证token
		claims, err := authService.VerifyToken(c.Request.Context(), token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, types.APIResponse{
				Success: false,
				Error: &types.APIError{
					Code:    "INVALID_TOKEN",
					Message: "Invalid or expired token",
					Details: err.Error(),
				},
			})
			logger.Error("AuthMiddleware Error: ", errors.New("invalid or expired token"), "error: ", err)
			c.Abort()
			return
		}

		// 将用户信息存储到上下文中
		c.Set("user_id", claims.UserID)
		c.Set("wallet_address", claims.WalletAddress)
		c.Set("jwt_claims", claims)

		logger.Info("AuthMiddleware: ", "auth middleware success", "user_id: ", claims.UserID, "wallet_address: ", claims.WalletAddress)
		// 继续处理请求
		c.Next()
	})
}

// GetUserFromContext 从gin上下文获取用户信息
func GetUserFromContext(c *gin.Context) (int64, string, bool) {
	userID, exists := c.Get("user_id")
	if !exists {
		logger.Error("GetUserFromContext Error: ", errors.New("user_id not found"))
		return 0, "", false
	}

	walletAddress, exists := c.Get("wallet_address")
	if !exists {
		logger.Error("GetUserFromContext Error: ", errors.New("wallet_address not found"))
		return 0, "", false
	}

	userIDInt64, ok := userID.(int64)
	if !ok {
		logger.Error("GetUserFromContext Error: ", errors.New("user_id is not an integer"))
		return 0, "", false
	}

	walletAddressStr, ok := walletAddress.(string)
	if !ok {
		logger.Error("GetUserFromContext Error: ", errors.New("wallet_address is not a string"))
		return 0, "", false
	}
	logger.Info("GetUserFromContext: ", "get user from context success", "user_id: ", userIDInt64, "wallet_address: ", walletAddressStr)
	return userIDInt64, walletAddressStr, true
}

// GetClaimsFromContext 从gin上下文获取JWT claims
func GetClaimsFromContext(c *gin.Context) (*types.JWTClaims, bool) {
	claims, exists := c.Get("jwt_claims")
	if !exists {
		logger.Error("GetClaimsFromContext Error: ", errors.New("jwt_claims not found"))
		return nil, false
	}

	jwtClaims, ok := claims.(*types.JWTClaims)
	if !ok {
		logger.Error("GetClaimsFromContext Error: ", errors.New("jwt_claims is not a *types.JWTClaims"))
		return nil, false
	}

	logger.Info("GetClaimsFromContext: ", "get claims from context success", "user_id: ", jwtClaims.UserID, "wallet_address: ", jwtClaims.WalletAddress)
	return jwtClaims, true
}
