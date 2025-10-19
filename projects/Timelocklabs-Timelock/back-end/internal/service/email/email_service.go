package email

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"html/template"
	"math/big"
	"os"
	"strings"
	"time"
	"timelock-backend/internal/config"
	chainRepo "timelock-backend/internal/repository/chain"
	emailRepo "timelock-backend/internal/repository/email"
	"timelock-backend/internal/repository/scanner"
	timeLockRepo "timelock-backend/internal/repository/timelock"
	"timelock-backend/internal/types"
	emailPkg "timelock-backend/pkg/email"
	"timelock-backend/pkg/logger"
	"timelock-backend/pkg/utils"

	"golang.org/x/text/cases"
	"golang.org/x/text/language"
	"gorm.io/gorm"
)

// EmailService 邮箱服务接口
type EmailService interface {
	// 邮箱管理
	AddUserEmail(ctx context.Context, userID int64, emailAddr string, remark *string) (*types.UserEmailResponse, error)
	GetUserEmails(ctx context.Context, userID int64, page, pageSize int) (*types.EmailListResponse, error)
	UpdateEmailRemark(ctx context.Context, userEmailID int64, userID int64, remark *string) error
	DeleteUserEmail(ctx context.Context, userEmailID int64, userID int64) error

	// 邮箱验证
	SendVerificationCode(ctx context.Context, userEmailID int64, userID int64) error
	VerifyEmail(ctx context.Context, userEmailID int64, userID int64, code string) error
	// 基于 email 发送验证码（创建/复用未验证记录，允许备注更新）
	SendVerificationCodeByEmail(ctx context.Context, userID int64, emailAddr string, remark *string) error
	// 基于 email 校验验证码
	VerifyEmailByEmail(ctx context.Context, userID int64, emailAddr string, code string) error

	// 通知发送
	SendFlowNotification(ctx context.Context, standard string, chainID int, contractAddress string, flowID string, statusFrom, statusTo string, txHash *string, initiatorAddress string) error

	// 工具方法
	CleanExpiredCodes(ctx context.Context) error
}

// emailService 邮箱服务实现
type emailService struct {
	repo            emailRepo.EmailRepository
	chainRepo       chainRepo.Repository
	timeLockRepo    timeLockRepo.Repository
	transactionRepo scanner.TransactionRepository
	config          *config.Config
	sender          *emailPkg.SMTPSender
}

// NewEmailService 创建邮箱服务实例
func NewEmailService(repo emailRepo.EmailRepository, chainRepo chainRepo.Repository, timeLockRepo timeLockRepo.Repository, transactionRepo scanner.TransactionRepository, cfg *config.Config) EmailService {
	return &emailService{
		repo:            repo,
		chainRepo:       chainRepo,
		timeLockRepo:    timeLockRepo,
		transactionRepo: transactionRepo,
		config:          cfg,
		sender:          emailPkg.NewSMTPSender(&cfg.Email),
	}
}

// ===== 邮箱管理方法 =====
// AddUserEmail 添加用户邮箱
func (s *emailService) AddUserEmail(ctx context.Context, userID int64, emailAddr string, remark *string) (*types.UserEmailResponse, error) {
	// 获取或创建邮箱记录
	emailRecord, err := s.repo.GetOrCreateEmail(ctx, emailAddr)
	if err != nil {
		return nil, fmt.Errorf("failed to get or create email: %w", err)
	}

	// 检查用户是否已添加此邮箱
	exists, err := s.repo.CheckUserEmailExists(ctx, userID, emailRecord.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to check user email exists: %w", err)
	}
	if exists {
		return nil, fmt.Errorf("email already added by user")
	}

	// 添加用户邮箱关系
	userEmail, err := s.repo.AddUserEmail(ctx, userID, emailRecord.ID, remark)
	if err != nil {
		return nil, fmt.Errorf("failed to add user email: %w", err)
	}

	return &types.UserEmailResponse{
		ID:             userEmail.ID,
		Email:          emailAddr,
		Remark:         remark,
		IsVerified:     false,
		LastVerifiedAt: nil,
		CreatedAt:      userEmail.CreatedAt,
	}, nil
}

// GetUserEmails 获取用户邮箱
func (s *emailService) GetUserEmails(ctx context.Context, userID int64, page, pageSize int) (*types.EmailListResponse, error) {
	offset := (page - 1) * pageSize
	if offset < 0 {
		offset = 0
	}

	userEmails, total, err := s.repo.GetUserEmails(ctx, userID, offset, pageSize)
	if err != nil {
		return nil, fmt.Errorf("failed to get user emails: %w", err)
	}

	// 转换为响应格式
	emails := make([]types.UserEmailResponse, len(userEmails))
	for i, ue := range userEmails {
		emails[i] = types.UserEmailResponse{
			ID:             ue.ID,
			Email:          ue.Email.Email,
			Remark:         ue.Remark,
			IsVerified:     ue.IsVerified,
			LastVerifiedAt: ue.LastVerifiedAt,
			CreatedAt:      ue.CreatedAt,
		}
	}

	return &types.EmailListResponse{
		Emails: emails,
		Total:  total,
	}, nil
}

// UpdateEmailRemark 更新用户邮箱备注
func (s *emailService) UpdateEmailRemark(ctx context.Context, userEmailID int64, userID int64, remark *string) error {
	if remark != nil {
		trimmed := strings.TrimSpace(*remark)
		if len(trimmed) > 200 {
			return fmt.Errorf("remark too long")
		}
		remark = &trimmed
	}
	err := s.repo.UpdateUserEmailRemark(ctx, userEmailID, userID, remark)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("user email not found")
		}
		return fmt.Errorf("failed to update email remark: %w", err)
	}
	return nil
}

// DeleteUserEmail 删除用户邮箱
func (s *emailService) DeleteUserEmail(ctx context.Context, userEmailID int64, userID int64) error {
	err := s.repo.DeleteUserEmail(ctx, userEmailID, userID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("user email not found")
		}
		return fmt.Errorf("failed to delete user email: %w", err)
	}
	return nil
}

// ===== 邮箱验证方法 =====
// SendVerificationCode 发送验证码
func (s *emailService) SendVerificationCode(ctx context.Context, userEmailID int64, userID int64) error {
	// 获取用户邮箱信息
	userEmail, err := s.repo.GetUserEmailByID(ctx, userEmailID, userID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("user email not found")
		}
		return fmt.Errorf("failed to get user email: %w", err)
	}

	// 检查是否已验证
	if userEmail.IsVerified {
		return fmt.Errorf("email already verified")
	}

	// 检查最近是否发送过验证码（防止频繁发送）
	latestCode, err := s.repo.GetLatestVerificationCode(ctx, userEmailID)
	if err == nil {
		// 检查是否在1分钟内发送过
		if time.Since(latestCode.SentAt) < time.Minute {
			return fmt.Errorf("verification code sent recently, please wait")
		}
	}

	// 生成6位数字验证码
	code, err := s.generateVerificationCode()
	if err != nil {
		return fmt.Errorf("failed to generate verification code: %w", err)
	}

	// 设置过期时间
	expiresAt := time.Now().Add(s.config.Email.VerificationCodeExpiry)

	// 保存验证码
	if err := s.repo.CreateVerificationCode(ctx, userEmailID, code, expiresAt); err != nil {
		return fmt.Errorf("failed to save verification code: %w", err)
	}

	// 发送邮件
	if err := s.sendVerificationEmail(userEmail.Email.Email, code); err != nil {
		logger.Error("Failed to send verification email", err, "email", userEmail.Email.Email)
		return fmt.Errorf("failed to send verification email: %w", err)
	}

	logger.Info("Verification code sent", "email", userEmail.Email.Email, "userEmailID", userEmailID)
	return nil
}

// SendVerificationCodeByEmail 基于 email 发送验证码
func (s *emailService) SendVerificationCodeByEmail(ctx context.Context, userID int64, emailAddr string, remark *string) error {
	// 标准化
	emailAddr = strings.ToLower(strings.TrimSpace(emailAddr))
	if !utils.IsValidEmail(emailAddr) {
		return fmt.Errorf("invalid email format")
	}
	if remark != nil {
		trimmed := strings.TrimSpace(*remark)
		if len(trimmed) > 200 {
			return fmt.Errorf("remark too long")
		}
		remark = &trimmed
	}
	// 获取或创建邮箱记录
	emailRecord, err := s.repo.GetOrCreateEmail(ctx, emailAddr)
	if err != nil {
		return fmt.Errorf("failed to get or create email: %w", err)
	}
	// 获取或创建 user_email 未验证记录
	userEmail, err := s.repo.GetUserEmailByUserAndEmailID(ctx, userID, emailRecord.ID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			if userEmail, err = s.repo.AddUserEmail(ctx, userID, emailRecord.ID, remark); err != nil {
				return fmt.Errorf("failed to add user email: %w", err)
			}
		} else {
			return fmt.Errorf("failed to get user email: %w", err)
		}
	} else {
		if userEmail.IsVerified {
			return fmt.Errorf("email already added by user")
		}
		if err := s.repo.UpdateUserEmailRemark(ctx, userEmail.ID, userID, remark); err != nil {
			return fmt.Errorf("failed to update remark: %w", err)
		}
	}
	return s.SendVerificationCode(ctx, userEmail.ID, userID)
}

// VerifyEmailByEmail 基于 email 校验验证码
func (s *emailService) VerifyEmailByEmail(ctx context.Context, userID int64, emailAddr string, code string) error {
	// 标准化
	emailAddr = strings.ToLower(strings.TrimSpace(emailAddr))
	code = strings.TrimSpace(code)
	if !utils.IsValidEmail(emailAddr) {
		return fmt.Errorf("invalid email format")
	}
	if !utils.IsValidVerificationCode(code) {
		return fmt.Errorf("invalid or expired verification code")
	}
	// 获取邮箱
	emailRecord, err := s.repo.GetEmailByAddress(ctx, emailAddr)
	if err != nil {
		return fmt.Errorf("failed to get email: %w", err)
	}
	// 获取 user_email
	userEmail, err := s.repo.GetUserEmailByUserAndEmailID(ctx, userID, emailRecord.ID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("user email not found")
		}
		return fmt.Errorf("failed to get user email: %w", err)
	}
	return s.VerifyEmail(ctx, userEmail.ID, userID, code)
}

// VerifyEmail 验证邮箱
func (s *emailService) VerifyEmail(ctx context.Context, userEmailID int64, userID int64, code string) error {
	// 验证码验证
	if err := s.repo.VerifyCode(ctx, userEmailID, code); err != nil {
		return fmt.Errorf("failed to verify code: %w", err)
	}

	// 标记邮箱为已验证
	if err := s.repo.VerifyUserEmail(ctx, userEmailID, userID); err != nil {
		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("user email not found")
		}
		return fmt.Errorf("failed to verify user email: %w", err)
	}

	logger.Info("Email verified successfully", "userEmailID", userEmailID, "userID", userID)
	return nil
}

// ===== 通知发送方法 =====
// SendFlowNotification 发送流程通知
func (s *emailService) SendFlowNotification(ctx context.Context, standard string, chainID int, contractAddress string, flowID string, statusFrom, statusTo string, txHash *string, initiatorAddress string) error {
	// 获取与合约相关用户的已验证邮箱列表
	emailIDs, err := s.repo.GetContractRelatedVerifiedEmailIDs(ctx, standard, chainID, contractAddress)
	if err != nil {
		logger.Error("Failed to get related verified emails", err,
			"standard", standard, "chainID", chainID, "contract", contractAddress,
			"statusTo", statusTo, "initiator", initiatorAddress)
		return fmt.Errorf("failed to get related verified emails: %w", err)
	}

	if len(emailIDs) == 0 {
		logger.Debug("No related verified emails found for notification",
			"standard", standard, "chainID", chainID, "contract", contractAddress,
			"statusTo", statusTo, "initiator", initiatorAddress)
		return nil
	}

	logger.Info("Found related verified emails for notification",
		"count", len(emailIDs), "standard", standard, "chainID", chainID,
		"contract", contractAddress, "statusTo", statusTo, "initiator", initiatorAddress)

	// 对每个邮箱发送通知
	for _, emailID := range emailIDs {
		// 检查是否已发送过此通知
		exists, err := s.repo.CheckSendLogExists(ctx, emailID, flowID, statusTo)
		if err != nil {
			logger.Error("Failed to check send log", err, "emailID", emailID, "flowID", flowID)
			continue
		}
		if exists {
			logger.Info("Notification already sent", "emailID", emailID, "flowID", flowID, "status", statusTo)
			continue
		}

		var emailData *types.NotificationData

		// 获取链信息
		chainInfo, err := s.chainRepo.GetChainByChainID(ctx, int64(chainID))
		if err != nil {
			logger.Error("Failed to get chain info", err, "chainID", chainID)
			return fmt.Errorf("failed to get chain info: %w", err)
		}

		// 解析区块浏览器URLs
		var explorerURLs []string
		if err := json.Unmarshal([]byte(chainInfo.BlockExplorerUrls), &explorerURLs); err != nil {
			logger.Error("Failed to parse block explorer URLs", err, "chainID", chainID)
			explorerURLs = []string{}
		}

		// 构建交易链接
		var txLink string
		var txDisplay string
		if txHash != nil && len(explorerURLs) > 0 {
			txLink = fmt.Sprintf("%s/tx/%s", explorerURLs[0], *txHash)
			// 简化显示的交易哈希（前10位...后6位）
			if len(*txHash) > 10 {
				txDisplay = fmt.Sprintf("%s...%s", (*txHash)[:10], (*txHash)[len(*txHash)-6:])
			} else {
				txDisplay = *txHash
			}
		} else {
			txDisplay = "Pending"
			txLink = ""
		}

		// 根据状态获取颜色
		getStatusColor := func(status string) (bgColor, textColor string) {
			switch strings.ToLower(status) {
			case "waiting":
				return "rgba(251, 146, 60, 0.15)", "#fb923c"
			case "ready":
				return "rgba(34, 197, 94, 0.15)", "#22c55e"
			case "executed":
				return "rgba(99, 102, 241, 0.15)", "#6366f1"
			case "cancelled":
				return "rgba(239, 68, 68, 0.15)", "#ef4444"
			case "expired":
				return "rgba(107, 114, 128, 0.15)", "#6b7280"
			default:
				return "rgba(148, 163, 184, 0.15)", "#94a3b8"
			}
		}

		fromBg, fromText := getStatusColor(statusFrom)
		toBg, toText := getStatusColor(statusTo)

		if standard == "compound" {
			// 通过chainid、contractAddress获得该合约信息，拿到合约备注，GetCompoundTimeLockByChainAndAddress
			compoundTimeLock, err := s.timeLockRepo.GetCompoundTimeLockByChainAndAddress(ctx, chainID, contractAddress)
			if err != nil {
				logger.Error("Failed to get compound time lock", err, "chainID", chainID, "contractAddress", contractAddress)
				continue
			}

			// 通过flowID去交易表中拿到交易信息
			transaction, err := s.transactionRepo.GetQueueCompoundTransactionByFlowID(ctx, flowID, contractAddress)
			if err != nil {
				logger.Error("Failed to get queue compound transaction", err, "flowID", flowID, "contractAddress", contractAddress)
				continue
			}
			if transaction == nil {
				logger.Warn("No queue compound transaction found", "flowID", flowID, "contractAddress", contractAddress)
				continue
			}

			var functionName string
			var calldataParams []types.CalldataParam
			// 解析calldata
			if transaction.EventCallData != nil && transaction.EventFunctionSignature != nil {
				functionName = *transaction.EventFunctionSignature
				calldataParams, err = utils.ParseCalldataNoSelector(*transaction.EventFunctionSignature, transaction.EventCallData)
				if err != nil {
					calldataParams = []types.CalldataParam{
						{
							Name:  "param[0]",
							Type:  "CallData Does Not Match Function Signature",
							Value: "Please Check Your Call Data",
						},
					}
					logger.Error("Failed to parse calldata", err, "functionSignature", *transaction.EventFunctionSignature, "callData", transaction.EventCallData)
				}
			} else {
				functionName = "No Function Call"
				calldataParams = []types.CalldataParam{}
			}

			nativeToken := chainInfo.NativeCurrencySymbol
			value, err := utils.WeiToEth(transaction.EventValue, nativeToken)
			if err != nil {
				logger.Error("Failed to convert wei to eth", err, "eventValue", transaction.EventValue)
				value = fmt.Sprintf("0 %s", nativeToken)
			}

			emailData = &types.NotificationData{
				Standard:       strings.ToUpper(standard),
				Contract:       contractAddress,
				Remark:         compoundTimeLock.Remark,
				Caller:         transaction.FromAddress,
				Target:         *transaction.EventTarget,
				Function:       functionName,
				Value:          value,
				CalldataParams: calldataParams,
			}
		} else {
			return fmt.Errorf("invalid standard")
		}

		emailData.BgColorFrom = template.CSS(fromBg)
		emailData.TextColorFrom = template.CSS(fromText)
		emailData.BgColorTo = template.CSS(toBg)
		emailData.TextColorTo = template.CSS(toText)
		emailData.StatusFrom = strings.ToUpper(statusFrom)
		emailData.StatusTo = strings.ToUpper(statusTo)
		emailData.Network = chainInfo.DisplayName
		emailData.TxHash = txDisplay
		emailData.TxUrl = txLink
		emailData.DashboardUrl = s.config.Email.EmailURL

		// 发送通知邮件
		if err := s.sendFlowNotificationEmail(ctx, emailID, emailData); err != nil {
			logger.Error("Failed to send notification email", err, "emailID", emailID, "flowID", flowID)

			// 记录发送失败日志
			sendLog := &types.EmailSendLog{
				EmailID:          emailID,
				FlowID:           flowID,
				TimelockStandard: standard,
				ChainID:          chainID,
				ContractAddress:  contractAddress,
				StatusFrom:       &statusFrom,
				StatusTo:         statusTo,
				TxHash:           txHash,
				SendStatus:       "failed",
				ErrorMessage:     func() *string { s := err.Error(); return &s }(),
				RetryCount:       0,
			}
			s.repo.CreateSendLog(ctx, sendLog)
			continue
		}

		// 记录发送成功日志
		sendLog := &types.EmailSendLog{
			EmailID:          emailID,
			FlowID:           flowID,
			TimelockStandard: standard,
			ChainID:          chainID,
			ContractAddress:  contractAddress,
			StatusFrom:       &statusFrom,
			StatusTo:         statusTo,
			TxHash:           txHash,
			SendStatus:       "success",
			RetryCount:       0,
		}
		if err := s.repo.CreateSendLog(ctx, sendLog); err != nil {
			logger.Error("Failed to create send log", err, "emailID", emailID, "flowID", flowID)
		}

		logger.Info("Flow notification sent", "emailID", emailID, "flowID", flowID, "status", statusTo)
	}

	return nil
}

// ===== 工具方法 =====
// CleanExpiredCodes 清理过期验证码
func (s *emailService) CleanExpiredCodes(ctx context.Context) error {
	return s.repo.CleanExpiredCodes(ctx)
}

// ===== 私有辅助方法 =====

// generateVerificationCode 生成6位数字验证码
func (s *emailService) generateVerificationCode() (string, error) {
	code := ""
	for i := 0; i < 6; i++ {
		num, err := rand.Int(rand.Reader, big.NewInt(10))
		if err != nil {
			return "", err
		}
		code += num.String()
	}
	return code, nil
}

// sendVerificationEmail 发送验证码邮件
func (s *emailService) sendVerificationEmail(toEmail, code string) error {
	subject := "TimeLock - Verify Your Email Address"
	// 用VerificationEmail.html 模板生成邮件内容
	body, err := os.ReadFile("email_templates/VerificationEmail.html")
	if err != nil {
		return fmt.Errorf("failed to read verification email template: %w", err)
	}

	bodyStr := strings.ReplaceAll(string(body), "{{CODE}}", code)
	bodyStr = strings.ReplaceAll(bodyStr, "{{EXPIRE}}", s.config.Email.VerificationCodeExpiry.String())

	return s.sender.SendHTMLEmail(toEmail, subject, bodyStr)
}

// sendFlowNotificationEmail 发送流程通知邮件
func (s *emailService) sendFlowNotificationEmail(ctx context.Context, emailID int64, emailData *types.NotificationData) error {
	// 获取邮箱地址
	emailRecord, err := s.getEmailByID(ctx, emailID)
	if err != nil {
		return fmt.Errorf("failed to get email: %w", err)
	}
	subject := fmt.Sprintf("TimeLock Status Update: %s → %s",
		cases.Title(language.English).String(emailData.StatusFrom),
		cases.Title(language.English).String(emailData.StatusTo))

	tmpl, err := template.ParseFiles("email_templates/FlowNotificationEmail.html")
	if err != nil {
		return fmt.Errorf("parse template: %w", err)
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, emailData); err != nil {
		return fmt.Errorf("execute template: %w", err)
	}

	body := buf.String()

	return s.sender.SendHTMLEmail(emailRecord.Email, subject, body)
}

// getEmailByID 根据ID获取邮箱记录
func (s *emailService) getEmailByID(ctx context.Context, emailID int64) (*types.Email, error) {
	return s.repo.GetEmailByID(ctx, emailID)
}
