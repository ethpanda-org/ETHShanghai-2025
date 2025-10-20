package alert

import (
	"context"
	"fmt"
	"time"

	"github.com/w3hub/core/pkg/blockchain"
)

type RuleCondition struct {
	Field    string      // 监控字段：balance/value/frequency
	Operator string      // 操作符：>/<==/between
	Value    interface{} // 比较值
}

type AlertRule struct {
	Name       string
	Conditions []RuleCondition
	Actions    []string // notify_channels
	Cooldown   time.Duration
}

type RuleEngine struct {
	rules  map[string]AlertRule
	notifier Notifier
}

func NewRuleEngine(notifier Notifier) *RuleEngine {
	return &RuleEngine{
		rules:    make(map[string]AlertRule),
		notifier: notifier,
	}
}

func (e *RuleEngine) AddRule(rule AlertRule) error {
	if _, exists := e.rules[rule.Name]; exists {
		return fmt.Errorf("规则已存在: %s", rule.Name)
	}
	e.rules[rule.Name] = rule
	return nil
}

func (e *RuleEngine) EvaluateTransaction(ctx context.Context, tx blockchain.Transaction) error {
	for _, rule := range e.rules {
		if e.checkConditions(rule, tx) {
			alert := Alert{
				Title:    fmt.Sprintf("交易预警: %s", rule.Name),
				Message:  fmt.Sprintf("检测到可疑交易: %s", tx.Hash),
				Severity: SeverityHigh,
			}
			if err := e.notifier.Send(ctx, alert); err != nil {
				return fmt.Errorf("发送预警失败: %w", err)
			}
		}
	}
	return nil
}

func (e *RuleEngine) checkConditions(rule AlertRule, tx blockchain.Transaction) bool {
	for _, cond := range rule.Conditions {
		switch cond.Field {
		case "value":
			value, ok := tx.Value.(float64)
			if !ok {
				continue
			}
			threshold, ok := cond.Value.(float64)
			if !ok {
				continue
			}
			if !e.compare(value, threshold, cond.Operator) {
				return false
			}
		// 可以添加更多条件字段
		}
	}
	return true
}

func (e *RuleEngine) compare(a, b float64, op string) bool {
	switch op {
	case ">":
		return a > b
	case "<":
		return a < b
	case ">=":
		return a >= b
	case "<=":
		return a <= b
	case "==":
		return a == b
	default:
		return false
	}
}