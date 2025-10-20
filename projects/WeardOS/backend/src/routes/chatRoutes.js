const express = require('express');
const router = express.Router();
const qwenService = require('../services/qwenService');
const logger = require('../utils/logger');

/**
 * 发送聊天消息
 * POST /api/chat/message
 */
router.post('/message', async (req, res) => {
  try {
    const { message, conversationId } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: '消息内容不能为空'
      });
    }

    logger.info(`收到聊天消息: ${message.slice(0, 100)}...`);

    // 构建消息数组格式
    const messages = [
      {
        role: 'user',
        content: message
      }
    ];

    // 调用通义千问API
    const response = await qwenService.chat(messages);

    res.json({
      success: true,
      data: {
        response: response,
        conversationId: conversationId,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('聊天消息处理失败:', error);
    res.status(500).json({
      success: false,
      error: '处理消息时发生错误: ' + error.message
    });
  }
});

/**
 * 获取对话历史
 * GET /api/chat/history/:conversationId
 */
router.get('/history/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    // 这里可以从数据库获取对话历史
    // 暂时返回空数组
    res.json({
      success: true,
      data: {
        messages: [],
        conversationId
      }
    });

  } catch (error) {
    logger.error('获取对话历史失败:', error);
    res.status(500).json({
      success: false,
      error: '获取对话历史时发生错误: ' + error.message
    });
  }
});

/**
 * 删除对话
 * DELETE /api/chat/conversation/:conversationId
 */
router.delete('/conversation/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    // 这里可以从数据库删除对话
    logger.info(`删除对话: ${conversationId}`);

    res.json({
      success: true,
      message: '对话已删除'
    });

  } catch (error) {
    logger.error('删除对话失败:', error);
    res.status(500).json({
      success: false,
      error: '删除对话时发生错误: ' + error.message
    });
  }
});

module.exports = router;