const mongoose = require('mongoose');

const analysisResultSchema = new mongoose.Schema({
  contractAddress: {
    type: String,
    required: true,
    index: true
  },
  riskScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  riskLevel: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'critical']
  },
  riskFactors: [{
    type: String
  }],
  recommendation: {
    type: String,
    required: true
  },
  confidence: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  analysisType: {
    type: String,
    required: true,
    enum: ['ai-analysis', 'rule-based', 'rule_based', 'ai_primary', 'rule_based_fallback', 'basic_fallback', 'fallback-analysis', 'test-analysis', 'eth_ai_qwen_repaired', 'eth-rule-based', 'ai_enhanced']
  },
  transactionData: {
    type: mongoose.Schema.Types.Mixed
  },
  contractCode: {
    type: String
  },
  transactionHistory: [{
    hash: String,
    value: String,
    timestamp: Date
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'heike'  // 确保使用heike集合
});

// 创建复合索引
analysisResultSchema.index({ contractAddress: 1, createdAt: -1 });
analysisResultSchema.index({ riskLevel: 1, createdAt: -1 });

// 简化模型获取逻辑
function getAnalysisResultModel() {
    try {
        // 检查是否已存在模型
        if (mongoose.models.AnalysisResult) {
            return mongoose.models.AnalysisResult;
        }
        
        // 创建新模型
        return mongoose.model('AnalysisResult', analysisResultSchema);
        
    } catch (error) {
        console.error('Error getting AnalysisResult model:', error);
        throw new Error('无法创建或获取AnalysisResult模型: ' + error.message);
    }
}

module.exports = getAnalysisResultModel;