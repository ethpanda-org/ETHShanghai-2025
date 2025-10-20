const axios = require('axios');
const logger = require('../utils/logger');

class QwenService {
  constructor() {
    this.apiKey = process.env.QWEN_API_KEY;
    this.baseURL = process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
    this.model = process.env.QWEN_MODEL || 'qwen-plus';
    
    if (!this.apiKey) {
      throw new Error('QWEN_API_KEY is required');
    }
  }

  async generateResponse(message, conversationId = null) {
    try {
      // 构建消息历史
      let messages = [];
      
      if (conversationId) {
        // 如果有对话ID，获取历史消息
        const MessageModel = require('../models/Message');
        const historyMessages = await MessageModel.find({ conversationId })
          .sort({ createdAt: 1 })
          .limit(10); // 限制历史消息数量
        
        messages = historyMessages.map(msg => ({
          role: msg.role,
          content: msg.content
        }));
      }
      
      // 添加当前用户消息
      messages.push({
        role: 'user',
        content: message
      });
      
      // 调用Qwen API
      const response = await this.chat(messages);
      return response;
      
    } catch (error) {
      logger.error('Generate response error:', error);
      throw error;
    }
  }

  /**
   * 流式聊天 - 简化版本，支持字符串消息输入
   * @param {string|Array} input - 消息内容或消息数组
   * @param {Function} onChunk - 接收数据块的回调函数
   * @returns {Promise<string>} 完整响应内容
   */
  async streamChat(input, onChunk) {
    return new Promise((resolve, reject) => {
      let messages;
      
      // 处理输入参数
      if (typeof input === 'string') {
        messages = [{ role: 'user', content: input }];
      } else if (Array.isArray(input)) {
        messages = input;
      } else {
        reject(new Error('Invalid input type for streamChat'));
        return;
      }

      this.streamChatWithMessages(
        messages,
        onChunk,
        (fullContent) => resolve(fullContent),
        (error) => reject(error)
      );
    });
  }

  /**
   * 聊天流式回复 - 用于Socket.IO
   * @param {string} message - 用户消息
   * @param {Object} options - 选项
   * @param {Function} options.onChunk - 接收数据块的回调函数
   * @returns {Promise<Object>} 包含完整内容的响应对象
   */
  async chatStream(message, options = {}) {
    const { onChunk } = options;
    
    try {
      const fullContent = await this.streamChat(message, onChunk);
      return {
        content: fullContent,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Chat stream error:', error);
      throw error;
    }
  }

  /**
   * 原始流式聊天方法
   * @param {Array} messages - 消息数组
   * @param {Function} onChunk - 接收数据块的回调函数
   * @param {Function} onComplete - 完成回调函数
   * @param {Function} onError - 错误回调函数
   */
  async streamChatWithMessages(messages, onChunk, onComplete, onError) {
    try {
      const response = await axios({
        method: 'POST',
        url: `${this.baseURL}/chat/completions`,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        data: {
          model: this.model,
          messages: messages,
          stream: true,
          temperature: 0.7,
          max_tokens: 2000
        },
        responseType: 'stream'
      });

      let fullContent = '';
      let buffer = '';

      response.data.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop(); // 保留最后一个不完整的行

        for (const line of lines) {
          if (line.trim() === '') continue;
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              onComplete(fullContent);
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                fullContent += delta;
                onChunk(delta, fullContent);
              }
            } catch (parseError) {
              logger.error('Error parsing SSE data:', parseError);
            }
          }
        }
      });

      response.data.on('end', () => {
        if (fullContent) {
          onComplete(fullContent);
        }
      });

      response.data.on('error', (error) => {
        logger.error('Stream error:', error);
        onError(error);
      });

    } catch (error) {
      logger.error('Qwen API error:', error);
      onError(error);
    }
  }

  async chat(messages) {
    try {
      const response = await axios({
        method: 'POST',
        url: `${this.baseURL}/chat/completions`,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        data: {
          model: this.model,
          messages: messages,
          temperature: 0.7,
          max_tokens: 2000
        }
      });

      return response.data.choices[0].message.content;
    } catch (error) {
      logger.error('Qwen API error:', error);
      throw error;
    }
  }
}

module.exports = new QwenService();