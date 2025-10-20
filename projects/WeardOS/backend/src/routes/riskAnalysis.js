const express = require('express');
const router = express.Router();
const aiAnalysisService = require('../services/aiAnalysisService');
const contractService = require('../services/contractService');
const { rateLimiter } = require('../middleware/rateLimiter');

// 导入新的综合置信度计算相关服务
const ConfidenceCalculator = require('../services/confidenceCalculator');
const etherscanService = require('../services/etherscanService');
const staticAnalysisService = require('../services/staticAnalysisService');
const dependencyTrustService = require('../services/dependencyTrustService');
const onchainBehaviorService = require('../services/onchainBehaviorService');

// 🆕 新增：智能合约解析接口 - 根据用户需求解析ABI和源码
router.post('/parse-contract', rateLimiter, async (req, res) => {
    try {
        const { contractAddress, parseRequest } = req.body;
        
        if (!contractAddress) {
            return res.status(400).json({ 
                success: false,
                error: '合约地址不能为空' 
            });
        }

        if (!parseRequest) {
            return res.status(400).json({ 
                success: false,
                error: '解析需求不能为空，请描述您希望解析的内容' 
            });
        }

        // 获取合约ABI和源码
        const [abiResult, sourceResult] = await Promise.allSettled([
            etherscanService.getContractABI(contractAddress),
            etherscanService.checkSourceVerification(contractAddress)
        ]);

        let abi = null;
        let sourceCode = '';
        let contractInfo = {};

        if (abiResult.status === 'fulfilled' && abiResult.value) {
            abi = abiResult.value;
        }

        if (sourceResult.status === 'fulfilled' && sourceResult.value) {
            sourceCode = sourceResult.value.sourceCode || '';
            contractInfo = {
                contractName: sourceResult.value.contractName,
                compilerVersion: sourceResult.value.compilerVersion,
                isVerified: sourceResult.value.isVerified,
                licenseType: sourceResult.value.licenseType
            };
        }

        // 构建Qwen分析提示词
        const analysisPrompt = `
作为智能合约分析专家，请根据用户的解析需求分析以下合约信息：

**合约地址**: ${contractAddress}
**合约信息**: ${JSON.stringify(contractInfo, null, 2)}

**用户解析需求**: ${parseRequest}

**合约ABI**: 
${abi ? JSON.stringify(abi, null, 2) : '未获取到ABI信息'}

**合约源码**: 
${sourceCode || '未获取到源码信息'}

请根据用户的具体需求，提供详细的分析结果。如果用户要求列出函数，请包含函数名、参数、返回值等信息。如果要求分析安全性，请重点关注潜在风险点。

请以结构化的JSON格式返回分析结果，包含以下字段：
- summary: 分析摘要
- details: 详细分析内容
- functions: 如果用户要求分析函数，则包含函数列表
- security: 如果涉及安全分析，则包含安全评估
- recommendations: 建议和注意事项
`;

        // 调用Qwen AI进行分析
        const qwenService = require('../services/qwenService');
        const analysisResult = await qwenService.chat([
            { role: 'user', content: analysisPrompt }
        ]);

        // 尝试解析Qwen返回的JSON结果
        let parsedResult;
        try {
            // 提取JSON部分（如果Qwen返回包含其他文本）
            const jsonMatch = analysisResult.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsedResult = JSON.parse(jsonMatch[0]);
            } else {
                // 如果没有JSON格式，创建结构化响应
                parsedResult = {
                    summary: "合约解析完成",
                    details: analysisResult,
                    rawResponse: analysisResult
                };
            }
        } catch (parseError) {
            // JSON解析失败，返回原始文本
            parsedResult = {
                summary: "合约解析完成",
                details: analysisResult,
                rawResponse: analysisResult,
                note: "AI返回的不是标准JSON格式，已转换为文本格式"
            };
        }

        res.json({
            success: true,
            data: {
                contractAddress,
                parseRequest,
                contractInfo,
                hasABI: !!abi,
                hasSourceCode: !!sourceCode,
                analysis: parsedResult,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('合约解析失败:', error);
        res.status(500).json({
            success: false,
            error: '合约解析失败',
            message: error.message
        });
    }
});

// AI分析合约风险 - 保存到Hark数据库的heike集合
router.post('/analyze-contract', rateLimiter, async (req, res) => {
    try {
        const { contractAddress, transactionData } = req.body;
        
        if (!contractAddress) {
            return res.status(400).json({ error: '合约地址不能为空' });
        }

        // AI分析
        const aiAnalysis = await aiAnalysisService.analyzeContract(contractAddress, transactionData);
        
        // 🆕 新增：使用综合置信度计算器
        let comprehensiveConfidence = null;
        
        try {
            // 使用置信度计算器实例（已导出为实例）
            const confidenceCalculator = ConfidenceCalculator;
            
            // 获取合约源码（用于静态分析和依赖分析）
            let contractCode = '';
            try {
                const sourceCodeResult = await etherscanService.getContractSourceCode(contractAddress);
                contractCode = sourceCodeResult.sourceCode || '';
            } catch (error) {
                console.warn('获取合约源码失败，使用模拟数据:', error.message);
            }
            
            // 🔧 修复：并行获取各种分析数据
            const [
                sourceVerification,
                staticAnalysis,
                dependencyAnalysis,
                onchainBehavior
            ] = await Promise.allSettled([
                // 源码验证
                etherscanService.checkSourceVerification(contractAddress),
                
                // 静态分析
                contractCode ? staticAnalysisService.analyzeContract(contractCode) : 
                    Promise.resolve({ score: 0.7, summary: '无源码，使用默认得分' }),
                
                // 依赖可信度分析
                contractCode ? dependencyTrustService.analyzeDependencies(contractAddress) :
                    Promise.resolve({ score: 0.7, summary: '无源码，使用默认得分' }),
                
                // 链上行为分析
                onchainBehaviorService.analyzeOnchainBehavior(contractAddress)
            ]);
            
            // 提取分析结果
            const metrics = {
                verified_source: sourceVerification.status === 'fulfilled' ? 
                    (sourceVerification.value.isVerified ? 1 : 0) : 0,
                test_coverage: 0.8, // 默认值，实际应该从测试报告获取
                static_analysis_score: staticAnalysis.status === 'fulfilled' ? 
                    staticAnalysis.value.score : 0.7,
                fuzzing_score: 0.85, // 默认值，实际应该从模糊测试获取
                formal_verification: 0, // 默认值，实际应该检查是否有形式化验证
                dependency_trust: dependencyAnalysis.status === 'fulfilled' ? 
                    dependencyAnalysis.value.score : 0.7,
                onchain_behavior_score: onchainBehavior.status === 'fulfilled' ? 
                    onchainBehavior.value.score : 0.7
            };
            
            // 计算综合置信度
            comprehensiveConfidence = confidenceCalculator.calculateConfidence(metrics);
            
        } catch (error) {
            console.error('综合置信度计算失败:', error);
            // 使用原有的置信度作为降级方案
            comprehensiveConfidence = {
                confidence: (aiAnalysis.ethAIConfidence || aiAnalysis.confidence || 72) / 100,
                scores: {
                    verified_source: 0.7,
                    test_coverage: 0.8,
                    static_analysis_score: 0.7,
                    fuzzing_score: 0.85,
                    formal_verification: 0,
                    dependency_trust: 0.7,
                    onchain_behavior: 0.7
                },
                summary: '综合分析失败，使用AI分析置信度'
            };
        }
        
        // 保存AI分析结果到Hark数据库的heike集合
        await contractService.saveAnalysis(contractAddress, aiAnalysis);
        
        // 🔧 修复：标准化返回数据格式，确保前端能正确显示
        const standardizedResult = {
            // 标准字段（前端期望的格式）
            riskScore: aiAnalysis.ethAIRiskScore || aiAnalysis.riskScore || 0,
            riskLevel: aiAnalysis.ethAIRiskLevel || aiAnalysis.riskLevel || 'medium',
            riskFactors: aiAnalysis.ethAIRiskFactors || aiAnalysis.riskFactors || ['AI分析完成'],
            recommendation: aiAnalysis.ethAIRecommendation || aiAnalysis.recommendation || '建议进行更详细的审计',
            
            // 🆕 修复：使用正确的置信度值
            confidence: comprehensiveConfidence ? 
                       Math.round(comprehensiveConfidence.confidence * 100) : 
                       (aiAnalysis.ethAIConfidence || aiAnalysis.confidence || 72),
            
            // 🆕 新增：综合置信度详细信息（0-1范围转换为0-100）
            comprehensiveConfidence: comprehensiveConfidence ? 
                                   Math.round(comprehensiveConfidence.confidence * 100) : null,
            
            // ETH+AI扩展字段（保持完整数据）
            ethAIRiskScore: aiAnalysis.ethAIRiskScore,
            ethAIRiskLevel: aiAnalysis.ethAIRiskLevel,
            ethAIRiskFactors: aiAnalysis.ethAIRiskFactors,
            ethAIRecommendation: aiAnalysis.ethAIRecommendation,
            ethAIConfidence: aiAnalysis.ethAIConfidence,
            ethAISecurityScore: aiAnalysis.ethAISecurityScore,
            ethAIStabilityScore: aiAnalysis.ethAIStabilityScore,
            
            // 其他字段
            analysisType: aiAnalysis.analysisType || 'ai-analysis',
            contractAddress: contractAddress,
            timestamp: new Date().toISOString(),
            
            // 原始完整数据
            rawAnalysis: aiAnalysis
        };
        
        res.json({
            success: true,
            data: standardizedResult,
            message: 'AI分析完成，数据已保存到Hark数据库'
        });
    } catch (error) {
        console.error('AI分析路由错误:', error);
        res.status(500).json({ 
            success: false,
            error: error.message,
            data: null
        });
    }
});



// 获取测试分析历史
router.get('/test-history', async (req, res) => {
    try {
        const { contractAddress, limit } = req.query;
        // 修复参数传递 - 移除多余的 new Date() 参数
        const history = await testAnalysisService.getTestAnalysisHistory(contractAddress, limit);
        
        res.json({
            success: true,
            data: history
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 获取测试分析统计
router.get('/test-stats', async (req, res) => {
    try {
        const stats = await testAnalysisService.getTestAnalysisStats();
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 分析池风险
router.post('/analyze-pool', rateLimiter, async (req, res) => {
    try {
        const { poolAddress, poolData } = req.body;
        
        const analysis = await aiAnalysisService.analyzePool(poolAddress, poolData);
        
        res.json({
            success: true,
            data: analysis
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 获取风险报告
router.get('/report/:address', async (req, res) => {
    try {
        const { address } = req.params;
        const report = await contractService.getRiskReport(address);
        
        res.json({
            success: true,
            data: report
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;