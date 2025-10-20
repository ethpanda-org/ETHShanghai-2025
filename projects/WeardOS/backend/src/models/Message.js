const mongoose = require('mongoose');
const { getMainConnection } = require('../config/database');

// 使用crypto.randomUUID代替uuid包，避免ES模块问题
const { randomUUID } = require('crypto');

const messageSchema = new mongoose.Schema({
  id: {
    type: String,
    default: randomUUID,
    unique: true,
    required: true
  },
  conversationId: {
    type: String,
    required: true,
    index: true
  },
  role: {
    type: String,
    required: true,
    enum: ['user', 'assistant', 'system'],
    default: 'user'
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  tokens: {
    type: Number,
    default: 0
  },
  model: {
    type: String,
    default: process.env.QWEN_MODEL || 'qwen-turbo'
  }
}, {
  timestamps: true,
  collection: 'messages'
});

// 创建复合索引
messageSchema.index({ conversationId: 1, timestamp: 1 });
messageSchema.index({ id: 1 }, { unique: true });

// 使用默认mongoose连接，确保连接稳定性
const MessageModel = mongoose.model('Message', messageSchema);

module.exports = MessageModel;