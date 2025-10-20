const mongoose = require('mongoose');
const logger = require('../utils/logger');
const getAnalysisResultModel = require('../models/AnalysisResult');

class ContractService {
    constructor() {
        // 移除内存存储，改用MongoDB
    }

    /**
     * 保存合约分析结果到MongoDB
     */
    async saveAnalysis(contractAddress, analysisData) {
        try {
            // 检查数据库连接状态
            if (mongoose.connection.readyState !== 1) {
                logger.warn('MongoDB connection not ready, attempting to reconnect...');
                await mongoose.connect(process.env.MONGODB_URI);
            }

            // 动态导入模型
            let AnalysisResult;
            try {
                // 检查模型是否已存在
                if (mongoose.models.AnalysisResult) {
                    AnalysisResult = mongoose.models.AnalysisResult;
                } else {
                    // 重新定义schema和模型
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
                        collection: 'heike'  // 使用heike集合
                    });

                    AnalysisResult = mongoose.model('AnalysisResult', analysisResultSchema);
                }
            } catch (modelError) {
                logger.error('Model creation failed:', modelError);
                throw new Error('无法创建数据库模型: ' + modelError.message);
            }

            // 标准化analysisType字段
            let analysisType = analysisData.analysisType || 'ai-analysis';
            if (analysisType === 'rule_based') {
                analysisType = 'rule-based';
            }
            if (analysisType === 'ai_primary') {
                analysisType = 'ai-analysis';
            }

            // 验证必需字段
            if (!contractAddress) {
                throw new Error('合约地址不能为空');
            }

            // 🔧 修复：使用new关键字创建模型实例
            const analysisRecord = new AnalysisResult({
                contractAddress: contractAddress.toLowerCase(), // 标准化地址格式
                riskScore: Math.min(100, Math.max(0, analysisData.riskScore || 0)),
                riskLevel: analysisData.riskLevel || 'medium',
                riskFactors: Array.isArray(analysisData.riskFactors) ? analysisData.riskFactors : ['AI分析完成'],
                recommendation: analysisData.recommendation || '建议进行更详细的审计',
                confidence: Math.min(100, Math.max(0, analysisData.confidence || 85)),
                analysisType: analysisType,
                transactionData: analysisData.transactionData || {},
                contractCode: analysisData.contractCode || '',
                transactionHistory: analysisData.transactionHistory || [],
                createdAt: new Date(),
                updatedAt: new Date()
            });

            logger.info(`Attempting to save analysis for contract: ${contractAddress}`);
            logger.info(`Analysis data: riskScore=${analysisRecord.riskScore}, riskLevel=${analysisRecord.riskLevel}, analysisType=${analysisRecord.analysisType}`);

            // 🔧 修复：确保save方法可用
            if (typeof analysisRecord.save !== 'function') {
                logger.error('analysisRecord.save is not a function, model instance creation failed');
                throw new Error('数据库模型实例创建失败');
            }

            // 保存到数据库
            const savedRecord = await analysisRecord.save();
            logger.info(`✅ Analysis saved successfully to heike collection with ID: ${savedRecord._id}`);
            
            return { 
                ...savedRecord.toObject(), 
                saved: true,
                collection: 'heike'
            };
            
        } catch (error) {
            logger.error('❌ Failed to save analysis to MongoDB:', {
                error: error.message,
                stack: error.stack,
                contractAddress,
                analysisData: JSON.stringify(analysisData, null, 2)
            });
            
            // 返回降级存储结果
            return {
                _id: Date.now().toString(),
                contractAddress,
                riskScore: analysisData.riskScore || 0,
                riskLevel: analysisData.riskLevel || 'medium',
                riskFactors: analysisData.riskFactors || ['保存失败'],
                recommendation: analysisData.recommendation || '数据库保存失败，建议重试',
                confidence: analysisData.confidence || 0,
                analysisType: analysisData.analysisType || 'fallback',
                createdAt: new Date(),
                saved: false,
                error: error.message,
                fallback: true
            };
        }
    }

    /**
     * 从MongoDB获取合约风险报告
     */
    async getRiskReport(contractAddress) {
        try {
            // 获取模型实例
            const AnalysisResult = getAnalysisResultModel();
            
            const analysis = await AnalysisResult.findOne({ 
                contractAddress 
            }).sort({ createdAt: -1 });
            
            if (!analysis) {
                return {
                    contractAddress,
                    riskScore: 0,
                    riskLevel: 'unknown',
                    riskFactors: ['未找到分析数据'],
                    recommendation: '请先进行风险分析',
                    confidence: 0,
                    timestamp: new Date().toISOString()
                };
            }

            return analysis;
        } catch (error) {
            logger.error('Failed to get risk report from MongoDB:', error);
            throw new Error('获取风险报告失败: ' + error.message);
        }
    }
}

module.exports = new ContractService();