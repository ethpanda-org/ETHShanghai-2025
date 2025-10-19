package notification

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"
)

// FeishuSender 飞书消息发送器
type FeishuSender struct{}

// NewFeishuSender 创建飞书发送器实例
func NewFeishuSender() *FeishuSender {
	return &FeishuSender{}
}

// FeishuMessage 飞书消息结构
type FeishuMessage struct {
	Timestamp string               `json:"timestamp,omitempty"`
	Sign      string               `json:"sign,omitempty"`
	MsgType   string               `json:"msg_type"`
	Content   FeishuMessageContent `json:"content"`
}

// FeishuMessageContent 飞书消息内容
type FeishuMessageContent struct {
	Text string `json:"text"`
}

// SendMessage 发送飞书消息
func (s *FeishuSender) SendMessage(webhookURL, secret, message string) error {
	feishuMsg := FeishuMessage{
		MsgType: "text",
		Content: FeishuMessageContent{
			Text: message,
		},
	}

	// 如果有签名校验的密钥，添加签名
	if secret != "" {
		timestamp := strconv.FormatInt(time.Now().Unix(), 10)
		sign := s.generateSign(secret, timestamp)
		feishuMsg.Timestamp = timestamp
		feishuMsg.Sign = sign
	}

	jsonData, err := json.Marshal(feishuMsg)
	if err != nil {
		return fmt.Errorf("failed to marshal feishu message: %w", err)
	}

	// 创建HTTP客户端
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	// 发送请求
	resp, err := client.Post(webhookURL, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to send feishu message: %w", err)
	}
	defer resp.Body.Close()

	// 检查响应状态码
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("feishu webhook returned status %d", resp.StatusCode)
	}

	return nil
}

// generateSign 生成飞书签名
func (s *FeishuSender) generateSign(secret, timestamp string) string {
	stringToSign := timestamp + "\n" + secret
	h := hmac.New(sha256.New, []byte(stringToSign))
	h.Write([]byte(""))
	return base64.StdEncoding.EncodeToString(h.Sum(nil))
}
