package email

import (
	"fmt"
	"net/smtp"
	"timelock-backend/internal/config"
)

// SMTPSender SMTP邮件发送器
type SMTPSender struct {
	config *config.EmailConfig
}

// NewSMTPSender 创建SMTP发送器实例
func NewSMTPSender(config *config.EmailConfig) *SMTPSender {
	return &SMTPSender{
		config: config,
	}
}

// SendEmail 发送邮件
func (s *SMTPSender) SendEmail(to, subject, body string) error {
	// 配置SMTP认证
	auth := smtp.PlainAuth("", s.config.SMTPUsername, s.config.SMTPPassword, s.config.SMTPHost)

	// 构建邮件内容
	msg := fmt.Sprintf("To: %s\r\nFrom: %s <%s>\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n%s",
		to, s.config.FromName, s.config.FromEmail, subject, body)

	// 发送邮件
	addr := fmt.Sprintf("%s:%d", s.config.SMTPHost, s.config.SMTPPort)
	err := smtp.SendMail(addr, auth, s.config.FromEmail, []string{to}, []byte(msg))
	if err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}

	return nil
}

// SendHTMLEmail 发送HTML格式邮件
func (s *SMTPSender) SendHTMLEmail(to, subject, htmlBody string) error {
	return s.SendEmail(to, subject, htmlBody)
}

// SendTextEmail 发送纯文本邮件
func (s *SMTPSender) SendTextEmail(to, subject, textBody string) error {
	// 配置SMTP认证
	auth := smtp.PlainAuth("", s.config.SMTPUsername, s.config.SMTPPassword, s.config.SMTPHost)

	// 构建邮件内容（纯文本）
	msg := fmt.Sprintf("To: %s\r\nFrom: %s <%s>\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n%s",
		to, s.config.FromName, s.config.FromEmail, subject, textBody)

	// 发送邮件
	addr := fmt.Sprintf("%s:%d", s.config.SMTPHost, s.config.SMTPPort)
	err := smtp.SendMail(addr, auth, s.config.FromEmail, []string{to}, []byte(msg))
	if err != nil {
		return fmt.Errorf("failed to send text email: %w", err)
	}

	return nil
}
