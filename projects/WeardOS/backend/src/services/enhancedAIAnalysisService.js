const logger = require('../utils/logger');
const chainDataService = require('./chainDataService');

class EnhancedAIAnalysisService {
    constructor() {
        // 初始化Qwen客户端
        this.qwen = null;
        this.chainDataService = chainDataService;
        this.initializeQwenClient().catch(error => {
            logger.error('Failed to initialize Qwen client:', error.message);
        });
        
        logger.info('增强AI分析服务初始化完成');
    }

    /**
     * 初始化Qwen客户端
     */
    async initializeQwenClient() {
        try {
            const apiKey = process.env.QWEN_API_KEY;
            const baseURL = process.env.QWEN_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1";
            
            if (!apiKey) {
                throw new Error('Qwen API Key未配置，请检查环境变量QWEN_API_KEY');
            }

            const OpenAI = require('openai');
            this.qwen = new OpenAI({
                apiKey: apiKey,
                baseURL: baseURL
            });
            
            logger.info('Qwen客户端初始化成功');
            
            // 测试连接
            await this.testQwenConnection();
            
        } catch (error) {
            logger.error('初始化Qwen客户端失败:', error.message);
            this.qwen = null;
            throw error;
        }
    }

    /**
     * 测试Qwen连接
     */
    async testQwenConnection() {
        try {
            if (!this.qwen) {
                throw new Error('Qwen客户端未初始化');
            }

            const response = await this.qwen.chat.completions.create({
                model: process.env.QWEN_MODEL || 'qwen-plus',
                messages: [
                    { role: 'user', content: '测试连接，请回复"连接成功"' }
                ],
                max_tokens: 10
            });

            if (response.choices && response.choices[0]) {
                logger.info('Qwen连接测试成功');
                return true;
            }
            
            throw new Error('Qwen响应格式异常');
        } catch (error) {
            logger.error('Qwen连接测试失败:', error.message);
            return false;
        }
    }

    /**
     * 智能合约地址分析 - 输入地址即可分析
     * @param {string} contractAddress - 合约地址
     * @param {string} network - 网络 ('holesky' | 'mainnet')
     * @param {string} userRequest - 用户分析需求（可选）
     * @returns {Promise<Object>} 分析结果
     */
    async analyzeContractByAddress(contractAddress, network = 'holesky', userRequest = '') {
        try {
            logger.info(`开始分析合约地址: ${contractAddress} (网络: ${network})`);

            if (!this.qwen) {
                throw new Error('AI分析服务未初始化，请稍后重试');
            }

            // 1. 获取完整的链上数据
            const chainData = await this.chainDataService.getCompleteContractData(contractAddress, network);
            
            // 2. 构建AI分析提示词
            const analysisPrompt = this.buildAnalysisPrompt(chainData, userRequest);
            
            // 3. 调用Qwen进行分析
            const aiAnalysis = await this.callQwenForAnalysis(analysisPrompt);
            
            // 4. 构建最终结果
            const result = {
                address: contractAddress,
                network: network,
                timestamp: new Date().toISOString(),
                chainData: {
                    isContract: chainData.isContract,
                    contractType: chainData.contractType,
                    verified: chainData.verified,
                    balance: chainData.balance,
                    txCount: chainData.txCount,
                    bytecodeLength: chainData.bytecodeLength,
                    hasEvents: chainData.analysis?.hasEvents || false,
                    eventCount: chainData.analysis?.eventCount || 0,
                    isActive: chainData.analysis?.isActive || false
                },
                aiAnalysis: aiAnalysis,
                summary: this.generateSummary(chainData, aiAnalysis),
                riskLevel: this.calculateRiskLevel(chainData, aiAnalysis),
                recommendations: this.generateRecommendations(chainData, aiAnalysis)
            };

            logger.info(`合约分析完成: ${contractAddress}, 风险等级: ${result.riskLevel}`);
            return result;

        } catch (error) {
            logger.error('合约地址分析失败:', error);
            throw error;
        }
    }

    /**
     * 构建AI分析提示词
     * @param {Object} chainData - 链上数据
     * @param {string} userRequest - 用户需求
     * @returns {string} 分析提示词
     */
    buildAnalysisPrompt(chainData, userRequest) {
        const prompt = `
作为区块链智能合约分析专家，请分析以下链上数据并提供专业的安全评估和功能解释。

**合约地址**: ${chainData.address}
**网络**: ${chainData.network}
**分析时间**: ${chainData.timestamp}

**链上基础数据**:
- 是否为合约: ${chainData.isContract ? '是' : '否'}
- 合约类型: ${chainData.contractType}
- 验证状态: ${chainData.verified ? '已验证' : '未验证'}
- 账户余额: ${chainData.balance} ETH
- 交易数量: ${chainData.txCount}
- 字节码长度: ${chainData.bytecodeLength} bytes
- 是否活跃: ${chainData.analysis?.isActive ? '是' : '否'}
- 事件日志数量: ${chainData.analysis?.eventCount || 0}

**合约信息**:
${chainData.contractInfo ? `
- 合约名称: ${chainData.contractInfo.contractName || '未知'}
- 编译器版本: ${chainData.contractInfo.compilerVersion || '未知'}
- 许可证类型: ${chainData.contractInfo.licenseType || '未知'}
` : '- 合约信息: 未获取到详细信息'}

**ABI信息**:
${chainData.abi ? `
- ABI可用: 是
- 函数数量: ${chainData.abi.filter(item => item.type === 'function').length}
- 事件数量: ${chainData.abi.filter(item => item.type === 'event').length}
- 主要函数: ${chainData.abi.filter(item => item.type === 'function').slice(0, 5).map(f => f.name).join(', ')}
` : '- ABI可用: 否'}

**源码信息**:
${chainData.sourceCode ? `
- 源码可用: 是
- 源码长度: ${chainData.sourceCode.length} 字符
` : '- 源码可用: 否'}

**最近活动**:
- 最近事件数量: ${chainData.eventLogs?.length || 0}
- 最后活动时间: ${chainData.analysis?.lastActivity || '未知'}

**网络信息**:
${chainData.networkInfo ? `
- 链ID: ${chainData.networkInfo.chainId}
- 网络名称: ${chainData.networkInfo.name}
` : '- 网络信息: 未获取'}

**Gas价格信息**:
${chainData.gasPrice ? `
- 当前Gas价格: ${chainData.gasPrice.gasPrice} Gwei
- 最大费用: ${chainData.gasPrice.maxFeePerGas} Gwei
` : '- Gas信息: 未获取'}

${userRequest ? `**用户特定需求**: ${userRequest}` : ''}

请基于以上链上数据提供以下分析：

1. **合约功能分析**: 根据合约类型、ABI和源码，分析合约的主要功能和用途
2. **安全风险评估**: 基于验证状态、活跃度、合约复杂度等因素评估安全风险
3. **交互建议**: 根据合约特征给出是否建议交互的建议
4. **技术特征**: 分析合约的技术实现特点
5. **风险等级**: 给出LOW/MEDIUM/HIGH的风险等级评估

请以结构化的JSON格式返回分析结果，包含以下字段：
{
  "functionality": "合约功能描述",
  "securityAssessment": "安全评估",
  "riskFactors": ["风险因素列表"],
  "technicalFeatures": ["技术特征列表"],
  "interactionAdvice": "交互建议",
  "riskLevel": "LOW/MEDIUM/HIGH",
  "confidence": "分析置信度(0-1)",
  "detailedAnalysis": "详细分析说明"
}
`;

        return prompt;
    }

    /**
     * 调用Qwen进行分析
     * @param {string} prompt - 分析提示词
     * @returns {Promise<Object>} AI分析结果
     */
    async callQwenForAnalysis(prompt) {
        try {
            const response = await this.qwen.chat.completions.create({
                model: process.env.QWEN_MODEL || 'qwen-plus',
                messages: [
                    {
                        role: 'system',
                        content: '你是一个专业的区块链智能合约分析专家，擅长分析链上数据并提供准确的安全评估。请基于提供的链上数据进行分析，不要尝试直接访问区块链网络。'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 2000,
                temperature: 0.3
            });

            if (!response.choices || !response.choices[0]) {
                throw new Error('AI分析响应格式异常');
            }

            const content = response.choices[0].message.content;
            
            // 尝试解析JSON响应
            try {
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]);
                }
            } catch (parseError) {
                logger.warn('AI响应不是有效JSON，使用文本解析');
            }

            // 如果不是JSON格式，返回文本分析
            return {
                functionality: this.extractSection(content, '功能'),
                securityAssessment: this.extractSection(content, '安全'),
                riskFactors: ['基于AI文本分析'],
                technicalFeatures: ['基于AI文本分析'],
                interactionAdvice: this.extractSection(content, '建议'),
                riskLevel: this.extractRiskLevel(content),
                confidence: 0.7,
                detailedAnalysis: content
            };

        } catch (error) {
            logger.error('调用Qwen分析失败:', error);
            throw error;
        }
    }

    /**
     * 从文本中提取特定部分
     * @param {string} text - 文本内容
     * @param {string} keyword - 关键词
     * @returns {string} 提取的内容
     */
    extractSection(text, keyword) {
        const lines = text.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(keyword)) {
                return lines[i + 1] || lines[i];
            }
        }
        return '未找到相关信息';
    }

    /**
     * 从文本中提取风险等级
     * @param {string} text - 文本内容
     * @returns {string} 风险等级
     */
    extractRiskLevel(text) {
        if (text.includes('HIGH') || text.includes('高风险')) return 'HIGH';
        if (text.includes('MEDIUM') || text.includes('中风险')) return 'MEDIUM';
        if (text.includes('LOW') || text.includes('低风险')) return 'LOW';
        return 'MEDIUM';
    }

    /**
     * 生成分析摘要
     * @param {Object} chainData - 链上数据
     * @param {Object} aiAnalysis - AI分析结果
     * @returns {string} 摘要
     */
    generateSummary(chainData, aiAnalysis) {
        const parts = [];
        
        if (!chainData.isContract) {
            return `地址 ${chainData.address} 是一个外部账户(EOA)，余额为 ${chainData.balance} ETH，共有 ${chainData.txCount} 笔交易。`;
        }

        parts.push(`这是一个${chainData.verified ? '已验证' : '未验证'}的${chainData.contractType}合约`);
        
        if (chainData.balance !== '0') {
            parts.push(`持有 ${chainData.balance} ETH`);
        }
        
        if (chainData.analysis?.isActive) {
            parts.push('合约处于活跃状态');
        } else {
            parts.push('合约活跃度较低');
        }

        if (aiAnalysis.riskLevel) {
            const riskText = {
                'LOW': '低风险',
                'MEDIUM': '中等风险',
                'HIGH': '高风险'
            };
            parts.push(`风险等级为${riskText[aiAnalysis.riskLevel] || '未知'}`);
        }

        return parts.join('，') + '。';
    }

    /**
     * 计算风险等级
     * @param {Object} chainData - 链上数据
     * @param {Object} aiAnalysis - AI分析结果
     * @returns {string} 风险等级
     */
    calculateRiskLevel(chainData, aiAnalysis) {
        // 如果AI已经给出风险等级，优先使用
        if (aiAnalysis.riskLevel) {
            return aiAnalysis.riskLevel;
        }

        let riskScore = 0;

        // 基于链上数据计算风险分数
        if (!chainData.isContract) {
            return 'LOW'; // EOA账户风险较低
        }

        if (!chainData.verified) {
            riskScore += 30; // 未验证合约风险较高
        }

        if (chainData.bytecodeLength > 20000) {
            riskScore += 20; // 复杂合约风险较高
        }

        if (!chainData.analysis?.isActive) {
            riskScore += 15; // 不活跃合约可能有问题
        }

        if (chainData.contractType === 'Proxy') {
            riskScore += 25; // 代理合约风险较高
        }

        // 根据分数确定风险等级
        if (riskScore >= 50) return 'HIGH';
        if (riskScore >= 25) return 'MEDIUM';
        return 'LOW';
    }

    /**
     * 生成建议
     * @param {Object} chainData - 链上数据
     * @param {Object} aiAnalysis - AI分析结果
     * @returns {Array} 建议列表
     */
    generateRecommendations(chainData, aiAnalysis) {
        const recommendations = [];

        if (!chainData.isContract) {
            recommendations.push('这是一个外部账户，可以正常进行转账交互');
            return recommendations;
        }

        if (!chainData.verified) {
            recommendations.push('合约未验证，建议谨慎交互，先了解合约功能');
        }

        if (chainData.contractType === 'Proxy') {
            recommendations.push('这是代理合约，实际逻辑可能在其他地址，需要额外注意');
        }

        if (!chainData.analysis?.isActive) {
            recommendations.push('合约活跃度较低，可能已停止维护或存在问题');
        }

        if (chainData.verified && chainData.analysis?.isActive) {
            recommendations.push('合约已验证且活跃，相对安全，但仍需了解具体功能后再交互');
        }

        if (aiAnalysis.interactionAdvice) {
            recommendations.push(aiAnalysis.interactionAdvice);
        }

        return recommendations.length > 0 ? recommendations : ['请根据具体需求谨慎评估是否与此合约交互'];
    }

    /**
     * 批量分析多个地址
     * @param {Array<string>} addresses - 地址列表
     * @param {string} network - 网络
     * @returns {Promise<Array>} 分析结果列表
     */
    async batchAnalyzeAddresses(addresses, network = 'holesky') {
        try {
            logger.info(`批量分析 ${addresses.length} 个地址 (网络: ${network})`);

            const results = await Promise.allSettled(
                addresses.map(address => this.analyzeContractByAddress(address, network))
            );

            return results.map((result, index) => ({
                address: addresses[index],
                success: result.status === 'fulfilled',
                data: result.status === 'fulfilled' ? result.value : null,
                error: result.status === 'rejected' ? result.reason.message : null
            }));

        } catch (error) {
            logger.error('批量分析失败:', error);
            throw error;
        }
    }
}

module.exports = new EnhancedAIAnalysisService();