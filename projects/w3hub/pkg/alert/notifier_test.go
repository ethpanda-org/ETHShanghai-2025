package alert

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

type MockNotifier struct {
	mock.Mock
}

func (m *MockNotifier) Send(ctx context.Context, alert Alert) error {
	args := m.Called(ctx, alert)
	return args.Error(0)
}

func TestMultiNotifier(t *testing.T) {
	// 准备测试数据
	testAlert := Alert{
		Title:    "Test Alert",
		Message:  "This is a test",
		Severity: SeverityHigh,
	}

	// 创建模拟通知器
	mock1 := new(MockNotifier)
	mock2 := new(MockNotifier)
	
	// 设置期望
	mock1.On("Send", mock.Anything, testAlert).Return(nil)
	mock2.On("Send", mock.Anything, testAlert).Return(nil)

	// 创建多重通知器
	notifier := NewMultiNotifier(mock1, mock2)

	// 执行测试
	err := notifier.Send(context.Background(), testAlert)

	// 验证结果
	assert.NoError(t, err)
	mock1.AssertExpectations(t)
	mock2.AssertExpectations(t)
}

func TestMultiNotifierWithError(t *testing.T) {
	testAlert := Alert{
		Title:    "Error Test",
		Message:  "This should fail",
		Severity: SeverityMedium,
	}

	mock1 := new(MockNotifier)
	mock2 := new(MockNotifier)
	
	mock1.On("Send", mock.Anything, testAlert).Return(nil)
	mock2.On("Send", mock.Anything, testAlert).Return(assert.AnError)

	notifier := NewMultiNotifier(mock1, mock2)

	err := notifier.Send(context.Background(), testAlert)
	
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "notification errors")
	mock1.AssertExpectations(t)
	mock2.AssertExpectations(t)
}