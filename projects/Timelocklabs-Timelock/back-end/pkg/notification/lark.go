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

// LarkSender Lark消息发送器
type LarkSender struct{}

// NewLarkSender 创建Lark发送器实例
func NewLarkSender() *LarkSender {
	return &LarkSender{}
}

// LarkMessage Lark消息结构
type LarkMessage struct {
	Timestamp string             `json:"timestamp,omitempty"`
	Sign      string             `json:"sign,omitempty"`
	MsgType   string             `json:"msg_type"`
	Content   LarkMessageContent `json:"content"`
}

// LarkMessageContent Lark消息内容
type LarkMessageContent struct {
	Text string `json:"text"`
}

// SendMessage 发送Lark消息
func (s *LarkSender) SendMessage(webhookURL, secret, message string) error {
	larkMsg := LarkMessage{
		MsgType: "text",
		Content: LarkMessageContent{
			Text: message,
		},
	}

	// 如果有签名验证的密钥，添加签名
	if secret != "" {
		timestamp := strconv.FormatInt(time.Now().Unix(), 10)
		sign := s.generateSign(secret, timestamp)
		larkMsg.Timestamp = timestamp
		larkMsg.Sign = sign
	}

	jsonData, err := json.Marshal(larkMsg)
	if err != nil {
		return fmt.Errorf("failed to marshal lark message: %w", err)
	}

	// 创建HTTP客户端
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	// 发送请求
	resp, err := client.Post(webhookURL, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to send lark message: %w", err)
	}
	defer resp.Body.Close()

	// 检查响应状态码
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("lark webhook returned status %d", resp.StatusCode)
	}

	return nil
}

// generateSign 生成Lark签名
func (s *LarkSender) generateSign(secret, timestamp string) string {
	stringToSign := timestamp + "\n" + secret
	h := hmac.New(sha256.New, []byte(stringToSign))
	h.Write([]byte(""))
	return base64.StdEncoding.EncodeToString(h.Sum(nil))
}
