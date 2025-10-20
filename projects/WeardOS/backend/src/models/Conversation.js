const mongoose = require('mongoose');
const { getMainConnection } = require('../config/database');

// 使用crypto.randomUUID代替uuid包
const { randomUUID } = require('crypto');

const conversationSchema = new mongoose.Schema({
  id: {
    type: String,
    default: randomUUID,
    unique: true,
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  userId: {
    type: String,
    default: 'default-user', // 暂时使用默认用户
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  messageCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  collection: 'conversations'
});

// 更新时间中间件
conversationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// 创建索引
conversationSchema.index({ userId: 1, createdAt: -1 });
conversationSchema.index({ id: 1 }, { unique: true });

// 使用默认mongoose连接，确保连接稳定性
const ConversationModel = mongoose.model('Conversation', conversationSchema);

module.exports = ConversationModel;