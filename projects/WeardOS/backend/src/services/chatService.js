const { randomUUID } = require('crypto');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const qwenService = require('./qwenService');
const logger = require('../utils/logger');

class ChatService {
  // 创建新对话
  async createConversation(title = '新对话') {
    try {
      const conversation = new Conversation({
        id: randomUUID(),
        title,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await conversation.save();
      return conversation;
    } catch (error) {
      logger.error('Error creating conversation:', error);
      throw error;
    }
  }

  // 获取所有对话
  async getConversations(limit = 50) {
    try {
      const conversations = await Conversation.find()
        .sort({ updatedAt: -1 })
        .limit(limit)
        .select('id title createdAt updatedAt messageCount');
      
      return conversations;
    } catch (error) {
      logger.error('Error getting conversations:', error);
      throw error;
    }
  }

  // 获取对话消息
  async getMessages(conversationId, limit = 100) {
    try {
      const messages = await Message.find({ conversationId })
        .sort({ timestamp: 1 })
        .limit(limit);
      
      return messages;
    } catch (error) {
      logger.error('Error getting messages:', error);
      throw error;
    }
  }

  // 保存消息
  async saveMessage(conversationId, role, content) {
    try {
      const message = new Message({
        id: randomUUID(),
        conversationId,
        role,
        content,
        timestamp: new Date()
      });

      await message.save();

      // 更新对话的消息计数和更新时间
      await Conversation.findOneAndUpdate(
        { id: conversationId },
        { 
          $inc: { messageCount: 1 },
          updatedAt: new Date()
        }
      );

      return message;
    } catch (error) {
      logger.error('Error saving message:', error);
      throw error;
    }
  }

  // 发送消息并获取AI回复
  async sendMessage(conversationId, userMessage, io, socketId) {
    try {
      // 保存用户消息
      await this.saveMessage(conversationId, 'user', userMessage);

      // 获取对话历史
      const messages = await this.getMessages(conversationId);
      
      // 构建对话上下文
      const chatMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      let assistantMessage = '';
      let messageId = randomUUID();

      // 流式获取AI回复
      await qwenService.streamChat(
        chatMessages,
        // onChunk - 每收到一个字符块
        (chunk, fullContent) => {
          assistantMessage = fullContent;
          io.to(socketId).emit('message_chunk', {
            conversationId,
            messageId,
            chunk,
            fullContent
          });
        },
        // onComplete - 完成时
        async (fullContent) => {
          try {
            // 保存完整的AI回复
            const savedMessage = await this.saveMessage(conversationId, 'assistant', fullContent);
            
            io.to(socketId).emit('message_complete', {
              conversationId,
              message: savedMessage
            });
          } catch (error) {
            logger.error('Error saving assistant message:', error);
            io.to(socketId).emit('error', { message: '保存消息失败' });
          }
        },
        // onError - 错误处理
        (error) => {
          logger.error('Qwen stream error:', error);
          io.to(socketId).emit('error', { message: 'AI服务暂时不可用' });
        }
      );

    } catch (error) {
      logger.error('Error in sendMessage:', error);
      io.to(socketId).emit('error', { message: '发送消息失败' });
    }
  }

  // 更新对话标题
  async updateConversationTitle(conversationId, title) {
    try {
      const conversation = await Conversation.findOneAndUpdate(
        { id: conversationId },
        { title, updatedAt: new Date() },
        { new: true }
      );
      
      return conversation;
    } catch (error) {
      logger.error('Error updating conversation title:', error);
      throw error;
    }
  }

  // 删除对话
  async deleteConversation(conversationId) {
    try {
      await Message.deleteMany({ conversationId });
      await Conversation.deleteOne({ id: conversationId });
      
      return { success: true };
    } catch (error) {
      logger.error('Error deleting conversation:', error);
      throw error;
    }
  }
}

module.exports = new ChatService();