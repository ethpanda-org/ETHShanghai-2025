package alert

import (
	"context"
	"fmt"
	"strings"
)

type Severity int

const (
	SeverityLow Severity = iota
	SeverityMedium
	SeverityHigh
	SeverityCritical
)

type Alert struct {
	Title     string
	Message   string
	Severity  Severity
	Timestamp int64
	Metadata  map[string]string
}

type Notifier interface {
	Send(ctx context.Context, alert Alert) error
}

type EmailNotifier struct {
	SMTPHost     string
	SMTPPort     int
	FromAddress  string
	FromPassword string
}

func (e *EmailNotifier) Send(ctx context.Context, alert Alert) error {
	// 实现邮件发送逻辑
	return nil
}

type TelegramNotifier struct {
	BotToken string
	ChatID   string
}

func (t *TelegramNotifier) Send(ctx context.Context, alert Alert) error {
	// 实现Telegram消息发送
	return nil
}

type MultiNotifier struct {
	notifiers []Notifier
}

func NewMultiNotifier(notifiers ...Notifier) *MultiNotifier {
	return &MultiNotifier{notifiers: notifiers}
}

func (m *MultiNotifier) Send(ctx context.Context, alert Alert) error {
	var errs []string
	for _, notifier := range m.notifiers {
		if err := notifier.Send(ctx, alert); err != nil {
			errs = append(errs, err.Error())
		}
	}
	if len(errs) > 0 {
		return fmt.Errorf("notification errors: %s", strings.Join(errs, "; "))
	}
	return nil
}