package alert

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/w3hub/core/pkg/blockchain"
)

type MockNotifier struct {
	lastAlert Alert
}

func (m *MockNotifier) Send(ctx context.Context, alert Alert) error {
	m.lastAlert = alert
	return nil
}

func TestRuleEngine(t *testing.T) {
	mockNotifier := &MockNotifier{}
	engine := NewRuleEngine(mockNotifier)

	// 添加测试规则
	err := engine.AddRule(AlertRule{
		Name: "大额交易预警",
		Conditions: []RuleCondition{
			{
				Field:    "value",
				Operator: ">",
				Value:    10.0, // 10 ETH
			},
		},
	})
	assert.NoError(t, err)

	// 测试不触发条件
	tx := blockchain.Transaction{
		Value: 5.0,
	}
	err = engine.EvaluateTransaction(context.Background(), tx)
	assert.NoError(t, err)
	assert.Empty(t, mockNotifier.lastAlert.Title)

	// 测试触发条件
	tx.Value = 15.0
	err = engine.EvaluateTransaction(context.Background(), tx)
	assert.NoError(t, err)
	assert.Equal(t, "大额交易预警", mockNotifier.lastAlert.Title)
}

func TestCompareOperators(t *testing.T) {
	engine := &RuleEngine{}

	assert.True(t, engine.compare(2.0, 1.0, ">"))
	assert.True(t, engine.compare(1.0, 2.0, "<"))
	assert.True(t, engine.compare(1.0, 1.0, "=="))
	assert.True(t, engine.compare(2.0, 1.0, ">="))
	assert.True(t, engine.compare(1.0, 2.0, "<="))
	assert.False(t, engine.compare(1.0, 2.0, "invalid"))
}