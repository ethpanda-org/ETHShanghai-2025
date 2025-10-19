package utils

import (
	"errors"
	"time"

	"timelock-backend/internal/types"
	"timelock-backend/pkg/logger"

	"github.com/golang-jwt/jwt/v5"
)

type JWTManager struct {
	secret        []byte
	accessExpiry  time.Duration
	refreshExpiry time.Duration
}

func NewJWTManager(secret string, accessExpiry, refreshExpiry time.Duration) *JWTManager {
	return &JWTManager{
		secret:        []byte(secret),
		accessExpiry:  accessExpiry,
		refreshExpiry: refreshExpiry,
	}
}

// GenerateTokens 生成访问令牌和刷新令牌
func (j *JWTManager) GenerateTokens(userID int64, walletAddress string) (string, string, time.Time, error) {
	// 生成访问令牌
	accessClaims := jwt.MapClaims{
		"user_id":        userID,
		"wallet_address": walletAddress,
		"type":           "access",
		"exp":            time.Now().Add(j.accessExpiry).Unix(),
		"iat":            time.Now().Unix(),
	}

	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
	accessTokenString, err := accessToken.SignedString(j.secret)
	if err != nil {
		logger.Error("GenerateTokens Error: ", errors.New("failed to generate access token"), "error: ", err)
		return "", "", time.Time{}, err
	}

	// 生成刷新令牌
	refreshClaims := jwt.MapClaims{
		"user_id":        userID,
		"wallet_address": walletAddress,
		"type":           "refresh",
		"exp":            time.Now().Add(j.refreshExpiry).Unix(),
		"iat":            time.Now().Unix(),
	}

	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	refreshTokenString, err := refreshToken.SignedString(j.secret)
	if err != nil {
		logger.Error("GenerateTokens Error: ", errors.New("failed to generate refresh token"), "error: ", err)
		return "", "", time.Time{}, err
	}

	expiresAt := time.Now().Add(j.accessExpiry)

	logger.Info("GenerateTokens Success: ", "generate jwt token success", "user_id: ", userID, "wallet_address: ", walletAddress)
	return accessTokenString, refreshTokenString, expiresAt, nil
}

// VerifyAccessToken 验证访问令牌
func (j *JWTManager) VerifyAccessToken(tokenString string) (*types.JWTClaims, error) {
	logger.Info("VerifyAccessToken: ", "verifying access token")
	return j.verifyToken(tokenString, "access")
}

// VerifyRefreshToken 验证刷新令牌
func (j *JWTManager) VerifyRefreshToken(tokenString string) (*types.JWTClaims, error) {
	logger.Info("VerifyRefreshToken: ", "verifying refresh token")
	return j.verifyToken(tokenString, "refresh")
}

// verifyToken 验证令牌
func (j *JWTManager) verifyToken(tokenString, expectedType string) (*types.JWTClaims, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			logger.Error("verifyToken Error: ", errors.New("unexpected signing method"))
			return nil, errors.New("unexpected signing method")
		}
		return j.secret, nil
	})

	if err != nil {
		logger.Error("verifyToken Error: ", errors.New("failed to parse token"), "error: ", err)
		return nil, err
	}

	if !token.Valid {
		logger.Error("verifyToken Error: ", errors.New("invalid token"))
		return nil, errors.New("invalid token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		logger.Error("verifyToken Error: ", errors.New("invalid token claims"))
		return nil, errors.New("invalid token claims")
	}

	tokenType, ok := claims["type"].(string)
	if !ok || tokenType != expectedType {
		logger.Error("verifyToken Error: ", errors.New("invalid token type"))
		return nil, errors.New("invalid token type")
	}

	userID, ok := claims["user_id"].(float64)
	if !ok {
		logger.Error("verifyToken Error: ", errors.New("invalid user_id in token"))
		return nil, errors.New("invalid user_id in token")
	}

	walletAddress, ok := claims["wallet_address"].(string)
	if !ok {
		logger.Error("verifyToken Error: ", errors.New("invalid wallet_address in token"))
		return nil, errors.New("invalid wallet_address in token")
	}

	logger.Info("verifyToken Success: ", "token verified successfully", "user_id", userID, "wallet_address", walletAddress, "token_type", tokenType)
	return &types.JWTClaims{
		UserID:        int64(userID),
		WalletAddress: walletAddress,
		Type:          tokenType,
	}, nil
}
