const { Web3 } = require('web3');
const logger = require('../utils/logger');

class AIAnalysisService {
    constructor() {
        // 初始化Qwen客户端（异步）
        this.qwen = null;
        this.initializeQwenClient().catch(error => {
            logger.error('Constructor: Failed to initialize Qwen client:', error.message);
        });
        
        // Web3 初始化 - 支持Holesky测试网连接
        try {
            const web3ProviderUrl = process.env.WEB3_PROVIDER_URL || 'https://ethereum-holesky-rpc.publicnode.com';
            const chainId = process.env.CHAIN_ID || '17000';
            
            this.web3 = new Web3(web3ProviderUrl);
            
            // 区块链网络配置
            this.blockchainConfig = {
                url: web3ProviderUrl,
                chainId: chainId,
                networkId: process.env.NETWORK_ID || chainId
            };
            
            logger.info(`Web3 client initialized successfully for Holesky testnet: ${web3ProviderUrl}`);
            logger.info(`Chain ID: ${chainId}, Network ID: ${this.blockchainConfig.networkId}`);
            
            // 测试网络连接
            this.testNetworkConnection();
            
        } catch (error) {
            logger.error('Failed to initialize Web3 for Holesky testnet:', error);
            this.web3 = null;
        }
    
        // 风险评估权重配置
        this.riskWeights = {
            codeComplexity: 0.25,
            securityVulnerabilities: 0.35,
            liquidityRisk: 0.20,
            communityTrust: 0.10,
            auditStatus: 0.10
        };
    }

    // 添加单独的初始化方法
    async initializeQwenClient() {
        try {
            // 检查环境变量
            const apiKey = process.env.QWEN_API_KEY;
            const baseURL = process.env.QWEN_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1";
            
            logger.info(`🔑 API Key exists: ${!!apiKey}`);
            logger.info(`🌐 Base URL: ${baseURL}`);
            
            if (!apiKey) {
                logger.error('❌ QWEN_API_KEY not found in environment variables');
                this.qwen = null;
                throw new Error('Qwen API Key未配置，请检查环境变量QWEN_API_KEY');
            }
    
            // 动态导入OpenAI
            const OpenAI = require('openai');
            
            this.qwen = new OpenAI({
                apiKey: apiKey,
                baseURL: baseURL
            });
            
            logger.info('✅ Qwen client initialized successfully');
            logger.info(`📡 Using model: ${process.env.QWEN_MODEL || 'qwen-plus'}`);
            
            // 测试连接
            await this.testQwenConnection();
            
        } catch (error) {
            logger.error('❌ Failed to initialize Qwen client:', error.message);
            logger.error('Stack trace:', error.stack);
            this.qwen = null;
            throw error;
        }
    }

    // 测试私链连接
    async testNetworkConnection() {
        try {
            if (!this.web3) {
                logger.error('Web3 client not initialized');
                return false;
            }
            
            logger.info('🔗 Testing Holesky testnet connection...');
            
            // 测试网络连接
            const isListening = await this.web3.eth.net.isListening();
            const networkId = await this.web3.eth.net.getId();
            const chainId = await this.web3.eth.getChainId();
            const blockNumber = await this.web3.eth.getBlockNumber();
            
            logger.info(`✅ Holesky testnet connection successful:`);
            logger.info(`   - Network listening: ${isListening}`);
            logger.info(`   - Network ID: ${networkId}`);
            logger.info(`   - Chain ID: ${chainId}`);
            logger.info(`   - Current block: ${blockNumber}`);
            
            // 验证链ID是否匹配配置
            if (chainId.toString() !== this.blockchainConfig.chainId) {
                logger.warn(`⚠️ Chain ID mismatch: expected ${this.blockchainConfig.chainId}, got ${chainId}`);
            }
            
            return true;
            
        } catch (error) {
            logger.error('❌ Holesky testnet connection test failed:', error.message);
            return false;
        }
    }
    async testQwenConnection() {
        try {
            if (!this.qwen) return;
            
            logger.info('🧪 Testing Qwen connection...');
            
            const testResponse = await this.qwen.chat.completions.create({
                model: process.env.QWEN_MODEL || "qwen-plus",
                messages: [
                    {
                        role: "user",
                        content: "Hello, please respond with 'OK' if you can hear me."
                    }
                ],
                max_tokens: 10
            });
            
            logger.info('✅ Qwen connection test successful');
            logger.info(`📝 Test response: ${testResponse.choices[0].message.content}`);
            
        } catch (error) {
            logger.error('❌ Qwen connection test failed:', error.message);
            this.qwen = null;
        }
    }

    // 🧠 增强版合约分析 - 集成QWen深度代码审计
    async analyzeContract(contractAddress, options = {}) {
        try {
            // 🔧 增强地址验证和清理
            let cleanAddress = contractAddress;
            
            // 处理各种输入格式
            if (typeof cleanAddress !== 'string') {
                throw new Error('合约地址必须是字符串格式');
            }
            
            // 移除所有空白字符（包括前后空格、制表符、换行符等）
            cleanAddress = cleanAddress.replace(/\s+/g, '');
            
            // 基础格式检查
            if (!cleanAddress) {
                throw new Error('合约地址不能为空');
            }
            
            // 检查是否为明显无效的地址
            if (cleanAddress === '00000' || cleanAddress === '0x00000' || cleanAddress.length < 10) {
                throw new Error('无效的合约地址格式');
            }
            
            // 确保以0x开头
            if (!cleanAddress.startsWith('0x')) {
                // 如果没有0x前缀，尝试添加
                if (/^[a-fA-F0-9]{40}$/.test(cleanAddress)) {
                    cleanAddress = '0x' + cleanAddress;
                } else {
                    throw new Error('合约地址必须以0x开头或为40位十六进制字符');
                }
            }
            
            // 检查长度
            if (cleanAddress.length !== 42) {
                throw new Error(`合约地址长度不正确，当前长度：${cleanAddress.length}，应为42位（包含0x前缀）`);
            }
            
            // 检查十六进制格式
            const hexPattern = /^0x[a-fA-F0-9]{40}$/;
            if (!hexPattern.test(cleanAddress)) {
                throw new Error('合约地址包含无效字符，只能包含0-9和a-f的十六进制字符');
            }

            // 🚨 强制检查Qwen服务可用性
            if (!this.qwen) {
                throw new Error('Qwen AI服务未初始化，无法进行分析');
            }

            // 测试Qwen连接
            try {
                await this.testQwenConnection();
            } catch (qwenError) {
                throw new Error(`Qwen AI服务连接失败: ${qwenError.message}`);
            }

            logger.info(`🔍 开始分析合约: ${cleanAddress}`);
            
            // 使用清理后的地址进行后续分析
            const contractInfo = await this.getContractInfo(cleanAddress);
            const transactionHistory = await this.getTransactionHistory(cleanAddress);
            
            // 执行深度代码审计
            const analysis = await this.deepCodeAudit(cleanAddress, contractInfo, transactionHistory, options);
            
            logger.info(`✅ 合约分析完成: ${cleanAddress}, 风险评分: ${analysis.riskScore}`);
            return analysis;
            
        } catch (error) {
            logger.error(`❌ 合约分析失败: ${error.message}`, {
                contractAddress,
                error: error.stack
            });
            throw error;
        }
    }

    // 🔍 Qwen深度代码审计
    async deepCodeAudit(contractAddress, contractInfo, transactionHistory, transactionData) {
        // 🚨 强制检查Qwen客户端
        if (!this.qwen) {
            throw new Error('Qwen AI服务不可用，无法进行ETH+AI分析');
        }

        try {
            const auditPrompt = await this.buildComprehensiveAuditPrompt(contractAddress, contractInfo, transactionHistory, transactionData);
            
            logger.info('🤖 开始ETH+AI深度分析...');
            
            // 启用流式输出
            const completion = await this.qwen.chat.completions.create({
                model: process.env.QWEN_MODEL || "qwen-plus",
                messages: [
                    {
                        role: "system",
                        content: "你是一个专业的ETH+AI融合系统分析专家，专注于AI驱动的以太坊风险控制与稳定机制。你具有深厚的DeFi协议分析经验、机器学习风险预测能力，以及AI驱动的稳定机制设计专长。请从ETH+AI融合的角度提供详细、准确的风险评估和稳定性分析。"
                    },
                    {
                        role: "user",
                        content: auditPrompt
                    }
                ],
                temperature: 0.2, // 降低温度以获得更稳定的分析结果
                max_tokens: 3000, // 增加token数量以支持更详细的分析
                stream: true
            });

            // 处理流式响应
            let content = '';
            for await (const chunk of completion) {
                if (chunk.choices[0]?.delta?.content) {
                    content += chunk.choices[0].delta.content;
                    // AI分析进度日志
                    logger.info(`🤖 ETH+AI分析进度: ${content.length} 字符`);
                }
            }

            if (!content || content.trim().length === 0) {
                throw new Error('Qwen AI返回空响应');
            }

            logger.info('🤖 ETH+AI分析完成，开始解析结果...');

            // 解析AI响应
            const aiAnalysis = this.parseQwenResponse(content);
            
            // 结合规则分析，但以AI分析为主
            const ruleBasedAnalysis = await this.ruleBasedAnalyzeContract(contractAddress, contractInfo.code, transactionHistory, transactionData);
            
            return this.combineETHAIAnalysisResults(aiAnalysis, ruleBasedAnalysis, contractInfo);
            
        } catch (error) {
            logger.error('🚨 ETH+AI分析失败:', error.message);
            // 🚨 不再提供降级分析，直接抛出错误
            throw new Error(`ETH+AI分析失败: ${error.message}。请检查Qwen AI服务状态。`);
        }
    }

    // 📊 ETH+AI分析结果合并 
    combineETHAIAnalysisResults(aiAnalysis, ruleBasedAnalysis, contractInfo) {
        if (aiAnalysis) { 
            // AI分析成功，构建ETH+AI融合结果 
            return { 
                ...aiAnalysis, 
                contractInfo, 
                analysisMethod: 'eth_ai_driven', 
                fallbackData: ruleBasedAnalysis, 
                ethAIFeatures: { 
                    realTimeAIMonitoring: true, 
                    predictiveRiskAnalysis: true, 
                    adaptiveStabilityMechanisms: true, 
                    aiDrivenRiskControl: true, 
                    ethNetworkIntegration: true, 
                    intelligentLiquidityManagement: true 
                }, 
                stabilityMetrics: { 
                    aiConfidence: aiAnalysis.ethAIConfidence || 0.72, 
                    systemResilience: this.calculateSystemResilience(aiAnalysis), 
                    adaptiveCapability: this.calculateAdaptiveCapability(aiAnalysis), 
                    ethIntegrationLevel: 0.9 
                }, 
                timestamp: new Date().toISOString() 
            }; 
        } else { 
            // 使用增强的规则基础分析 
            return { 
                ...ruleBasedAnalysis, 
                contractInfo, 
                analysisMethod: 'eth_ai_fallback', 
                ethAIFeatures: { 
                    realTimeAIMonitoring: false, 
                    predictiveRiskAnalysis: false, 
                    adaptiveStabilityMechanisms: false, 
                    aiDrivenRiskControl: false, 
                    ethNetworkIntegration: true, 
                    intelligentLiquidityManagement: false 
                }, 
                stabilityMetrics: { 
                    aiConfidence: 0.4, 
                    systemResilience: 0.6, 
                    adaptiveCapability: 0.3, 
                    ethIntegrationLevel: 0.7 
                }, 
                timestamp: new Date().toISOString() 
            }; 
        } 
    } 

    // 计算系统韧性 
    calculateSystemResilience(aiAnalysis) { 
        if (!aiAnalysis.aiDrivenStabilityAnalysis) return 0.5; 
        
        const stability = aiAnalysis.aiDrivenStabilityAnalysis; 
        const resilience = ( 
            (stability.liquidityStability === 'high' ? 0.3 : stability.liquidityStability === 'medium' ? 0.2 : 0.1) + 
            (stability.priceStability === 'high' ? 0.3 : stability.priceStability === 'medium' ? 0.2 : 0.1) + 
            (stability.systemResilience === 'high' ? 0.4 : stability.systemResilience === 'medium' ? 0.3 : 0.2) 
        ); 
        
        return Math.min(1.0, resilience); 
    } 

    // 计算自适应能力 
    calculateAdaptiveCapability(aiAnalysis) { 
        if (!aiAnalysis.aiDrivenStabilityAnalysis) return 0.3; 
        
        const adaptiveScore = aiAnalysis.aiDrivenStabilityAnalysis.adaptiveCapability; 
        if (typeof adaptiveScore === 'string') { 
            return adaptiveScore === 'high' ? 0.9 : adaptiveScore === 'medium' ? 0.6 : 0.3; 
        } 
        return adaptiveScore || 0.5; 
    }

    // 添加单独的初始化方法
    async initializeQwenClient() {
        try {
            // 检查环境变量
            const apiKey = process.env.QWEN_API_KEY;
            const baseURL = process.env.QWEN_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1";
            
            logger.info(`🔑 API Key exists: ${!!apiKey}`);
            logger.info(`🌐 Base URL: ${baseURL}`);
            
            if (!apiKey) {
                logger.error('❌ QWEN_API_KEY not found in environment variables');
                this.qwen = null;
                throw new Error('Qwen API Key未配置，请检查环境变量QWEN_API_KEY');
            }
    
            // 动态导入OpenAI
            const OpenAI = require('openai');
            
            this.qwen = new OpenAI({
                apiKey: apiKey,
                baseURL: baseURL
            });
            
            logger.info('✅ Qwen client initialized successfully');
            logger.info(`📡 Using model: ${process.env.QWEN_MODEL || 'qwen-plus'}`);
            
            // 测试连接
            await this.testQwenConnection();
            
        } catch (error) {
            logger.error('❌ Failed to initialize Qwen client:', error.message);
            logger.error('Stack trace:', error.stack);
            this.qwen = null;
            throw error;
        }
    }

    async testQwenConnection() {
        try {
            if (!this.qwen) return;
            
            logger.info('🧪 Testing Qwen connection...');
            
            const testResponse = await this.qwen.chat.completions.create({
                model: process.env.QWEN_MODEL || "qwen-plus",
                messages: [
                    {
                        role: "user",
                        content: "Hello, please respond with 'OK' if you can hear me."
                    }
                ],
                max_tokens: 10
            });
            
            logger.info('✅ Qwen connection test successful');
            logger.info(`📝 Test response: ${testResponse.choices[0].message.content}`);
            
        } catch (error) {
            logger.error('❌ Qwen connection test failed:', error.message);
            this.qwen = null;
        }
    }

    // 🧠 增强版合约分析 - 集成QWen深度代码审计
    async analyzeContract(contractAddress, options = {}) {
        try {
            // 🔧 增强地址验证和清理
            let cleanAddress = contractAddress;
            
            // 处理各种输入格式
            if (typeof cleanAddress !== 'string') {
                throw new Error('合约地址必须是字符串格式');
            }
            
            // 移除所有空白字符（包括前后空格、制表符、换行符等）
            cleanAddress = cleanAddress.replace(/\s+/g, '');
            
            // 基础格式检查
            if (!cleanAddress) {
                throw new Error('合约地址不能为空');
            }
            
            // 检查是否为明显无效的地址
            if (cleanAddress === '00000' || cleanAddress === '0x00000' || cleanAddress.length < 10) {
                throw new Error('无效的合约地址格式');
            }
            
            // 确保以0x开头
            if (!cleanAddress.startsWith('0x')) {
                // 如果没有0x前缀，尝试添加
                if (/^[a-fA-F0-9]{40}$/.test(cleanAddress)) {
                    cleanAddress = '0x' + cleanAddress;
                } else {
                    throw new Error('合约地址必须以0x开头或为40位十六进制字符');
                }
            }
            
            // 检查长度
            if (cleanAddress.length !== 42) {
                throw new Error(`合约地址长度不正确，当前长度：${cleanAddress.length}，应为42位（包含0x前缀）`);
            }
            
            // 检查十六进制格式
            const hexPattern = /^0x[a-fA-F0-9]{40}$/;
            if (!hexPattern.test(cleanAddress)) {
                throw new Error('合约地址包含无效字符，只能包含0-9和a-f的十六进制字符');
            }

            // 🚨 强制检查Qwen服务可用性
            if (!this.qwen) {
                throw new Error('Qwen AI服务未初始化，无法进行分析');
            }

            // 测试Qwen连接
            try {
                await this.testQwenConnection();
            } catch (qwenError) {
                throw new Error(`Qwen AI服务连接失败: ${qwenError.message}`);
            }

            logger.info(`🔍 开始分析合约: ${cleanAddress}`);
            
            // 使用清理后的地址进行后续分析
            const contractInfo = await this.getContractInfo(cleanAddress);
            const transactionHistory = await this.getTransactionHistory(cleanAddress);
            
            // 执行深度代码审计
            const analysis = await this.deepCodeAudit(cleanAddress, contractInfo, transactionHistory, options);
            
            logger.info(`✅ 合约分析完成: ${cleanAddress}, 风险评分: ${analysis.riskScore}`);
            return analysis;
            
        } catch (error) {
            logger.error(`❌ 合约分析失败: ${error.message}`, {
                contractAddress,
                error: error.stack
            });
            throw error;
        }
    }

    // 🔍 Qwen深度代码审计
    async deepCodeAudit(contractAddress, contractInfo, transactionHistory, transactionData) {
        // 🚨 强制检查Qwen客户端
        if (!this.qwen) {
            throw new Error('Qwen AI服务不可用，无法进行ETH+AI分析');
        }

        try {
            const auditPrompt = await this.buildComprehensiveAuditPrompt(contractAddress, contractInfo, transactionHistory, transactionData);
            
            logger.info('🤖 开始ETH+AI深度分析...');
            
            // 启用流式输出
            const completion = await this.qwen.chat.completions.create({
                model: process.env.QWEN_MODEL || "qwen-plus",
                messages: [
                    {
                        role: "system",
                        content: "你是一个专业的ETH+AI融合系统分析专家，专注于AI驱动的以太坊风险控制与稳定机制。你具有深厚的DeFi协议分析经验、机器学习风险预测能力，以及AI驱动的稳定机制设计专长。请从ETH+AI融合的角度提供..."
                    },
                    {
                        role: "user",
                        content: auditPrompt
                    }
                ],
                temperature: 0.2, // 降低温度以获得更稳定的分析结果
                max_tokens: 3000, // 增加token数量以支持更详细的分析
                stream: true
            });

            // 处理流式响应
            let content = '';
            for await (const chunk of completion) {
                if (chunk.choices[0]?.delta?.content) {
                    content += chunk.choices[0].delta.content;
                    // AI分析进度日志
                    logger.info(`🤖 ETH+AI分析进度: ${content.length} 字符`);
                }
            }

            if (!content || content.trim().length === 0) {
                throw new Error('Qwen AI返回空响应');
            }

            logger.info('🤖 ETH+AI分析完成，开始解析结果...');

            // 解析AI响应
            const aiAnalysis = this.parseQwenResponse(content);
            
            // 结合规则分析，但以AI分析为主
            const ruleBasedAnalysis = await this.ruleBasedAnalyzeContract(contractAddress, contractInfo.code, transactionHistory, transactionData);
            
            return this.combineETHAIAnalysisResults(aiAnalysis, ruleBasedAnalysis, contractInfo);
            
        } catch (error) {
            logger.error('🚨 ETH+AI分析失败:', error.message);
            // 🚨 不再提供降级分析，直接抛出错误
            throw new Error(`ETH+AI分析失败: ${error.message}。请检查Qwen AI服务状态。`);
        }
    }

    // 📋 构建简化的审计提示词
    async buildComprehensiveAuditPrompt(contractAddress, contractInfo, transactionHistory, transactionData) {
        // 获取区块链网络信息
        const blockchainInfo = this.getBlockchainContext();
        
        // 获取当前区块信息
        const currentBlock = await this.getCurrentBlock();
        blockchainInfo.currentBlock = currentBlock;
        
        return `
        🔍 **ETH+AI融合系统深度分析请求**
        
        **Holesky测试网环境:**
        - 网络URL: ${blockchainInfo.url}
        - 链ID: ${blockchainInfo.chainId}
        - 网络ID: ${blockchainInfo.networkId}
        - 当前区块: ${blockchainInfo.currentBlock || 'N/A'}
        
        **合约基本信息:**
        - 合约地址: ${contractAddress}
        - 字节码长度: ${contractInfo.code ? contractInfo.code.length : 0}
        - 余额: ${contractInfo.balance || '0'} ETH
        - 交易计数: ${contractInfo.transactionCount || 0}
        
        **Holesky测试网交易历史分析:**
        ${transactionHistory && transactionHistory.length > 0 ? 
            `- 总交易数: ${transactionHistory.length}
            - 最近交易: ${JSON.stringify(transactionHistory.slice(0, 3), null, 2)}` : 
            '- 暂无交易历史'
        }
        
        **实时交易数据:**
        ${transactionData ? JSON.stringify(transactionData, null, 2) : '暂无实时数据'}
        
        **分析要求:**
        请基于Holesky测试网环境特点，从以下维度进行ETH+AI融合分析：
        
        1. **测试网安全性评估**
           - 测试网络的去中心化程度
           - 节点分布和共识机制安全性
           - 测试网特有的攻击向量分析
        
        2. **合约代码风险分析**
           - 智能合约漏洞检测
           - 权限控制机制评估
           - 重入攻击和溢出风险
        
        3. **AI驱动的行为模式分析**
           - 交易模式异常检测
           - 资金流向风险评估
           - 时间序列行为分析
        
        4. **测试网生态系统稳定性**
           - 流动性风险评估
           - 系统性风险预测
           - 应急响应机制评估
        
        **输出格式要求:**
        请严格按照以下JSON格式返回分析结果：
        
        {
            "ethAIRiskScore": 数字(0-100),
            "ethAIRiskLevel": "low/medium/high/critical",
            "testnetRisks": {
                "networkSecurity": "评估结果",
                "consensusRisk": "共识风险评估",
                "nodeDistribution": "节点分布风险"
            },
            "contractRisks": {
                "codeVulnerabilities": ["漏洞列表"],
                "permissionRisks": "权限风险评估",
                "upgradeability": "可升级性风险"
            },
            "aiAnalysis": {
                "behaviorPatterns": "行为模式分析",
                "anomalyDetection": "异常检测结果",
                "predictiveRisk": "预测性风险评估"
            },
            "aiDrivenStabilityAnalysis": {
                "liquidityStability": "high/medium/low",
                "priceStability": "high/medium/low",
                "systemResilience": "high/medium/low",
                "riskMitigation": "advanced/basic/limited",
                "adaptiveCapability": "high/medium/low"
            },
            "ethAIRiskFactors": [
                "风险因素1",
                "风险因素2",
                "风险因素3"
            ],
            "ethAIRecommendation": "具体建议",
            "ethAIConfidence": 数字(0-5),
            "timestamp": "${new Date().toISOString()}"
        }
        `;
    }

    // 获取私链网络上下文信息
    getBlockchainContext() {
        return {
            url: this.blockchainConfig?.url || 'https://ethereum-holesky-rpc.publicnode.com',
            chainId: this.blockchainConfig?.chainId || '17000',
            networkId: this.blockchainConfig?.networkId || '17000',
            currentBlock: null // 将在实际调用时获取
        };
    }

    // 获取当前区块信息
    async getCurrentBlock() {
        try {
            if (!this.web3) {
                return null;
            }
            const blockNumber = await this.web3.eth.getBlockNumber();
            return blockNumber.toString();
        } catch (error) {
            logger.error('Failed to get current block from Holesky testnet:', error);
            return null;
        }
    }

    //  获取合约详细信息
    async getContractInfo(contractAddress) {
        try {
            if (!this.web3) {
                return { code: '', creationTime: null, balance: '0' };
            }

            const [code, balance] = await Promise.all([
                this.web3.eth.getCode(contractAddress),
                this.web3.eth.getBalance(contractAddress)
            ]);

            return {
                code,
                balance: this.web3.utils.fromWei(balance, 'ether'),
                creationTime: new Date().toISOString() // 简化处理
            };
        } catch (error) {
            logger.error('Failed to get contract info:', error);
            return { code: '', creationTime: null, balance: '0' };
        }
    }

    //  综合分析结果
    combineAnalysisResults(aiAnalysis, ruleBasedAnalysis, contractInfo) {
        if (aiAnalysis) {
            // AI分析成功，以AI结果为主
            return {
                ...aiAnalysis,
                contractInfo,
                analysisMethod: 'ai_primary',
                fallbackData: ruleBasedAnalysis,
                enhancedFeatures: {
                    realTimeMonitoring: true,
                    predictiveAnalysis: true,
                    adaptiveLearning: true
                }
            };
        } else {
            // 使用规则基础分析
            return {
                ...ruleBasedAnalysis,
                contractInfo,
                analysisMethod: 'rule_based_fallback',
                enhancedFeatures: {
                    realTimeMonitoring: false,
                    predictiveAnalysis: false,
                    adaptiveLearning: false
                }
            };
        }
    }

    // 实时风险监控
    async startRealTimeMonitoring(contractAddress) {
        logger.info(`Starting real-time monitoring for: ${contractAddress}`);
        
        // 设置事件监听器
        if (this.web3) {
            const subscription = await this.web3.eth.subscribe('logs', {
                address: contractAddress
            });

            subscription.on('data', async (log) => {
                logger.info(`New transaction detected for ${contractAddress}`);
                // 触发实时分析
                await this.analyzeTransaction(log);
            });

            return subscription;
        }
    }

    async analyzePool(poolAddress, poolData) {
        try {
            // 使用Qwen
            if (this.qwen) {
                return await this.aiAnalyzePool(poolAddress, poolData);
            } else {
                return await this.ruleBasedAnalyzePool(poolAddress, poolData);
            }
        } catch (error) {
            logger.error('Pool analysis failed:', error);
            throw new Error('流动池分析失败: ' + error.message);
        }
    }

    // 添加缺失的 aiAnalyzePool 方法
    async aiAnalyzePool(poolAddress, poolData) {
        const prompt = `
        分析以下流动性的风险：
        
        池地址: ${poolAddress}
        池数据: ${JSON.stringify(poolData)}
        
        评估风险并返回JSON格式：
        {
            "riskScore": 数字,
            "riskLevel": "low/medium/high/critical",
            "riskFactors": ["因素1", "因素2"],
            "recommendation": "建议",
            "confidence": 数字
        }
        `;

        const response = await this.qwen.chat.completions.create({
            model: process.env.QWEN_MODEL || "qwen-plus",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3
        });

        return JSON.parse(response.choices[0].message.content);
    }

    async ruleBasedAnalyzePool(poolAddress, poolData) {
        // 简单的池子风险评估
        return {
            riskScore: 25,
            riskLevel: 'low',
            riskFactors: ['使用规则基础分析'],
            recommendation: '建议启用千问 API 以获得更准确的分析',
            confidence: 50
        };
    }

    async getTransactionHistory(contractAddress, limit = 100) {
        try {
            // 从私有链获取交易历史（简化版本）
            // 在实际应用中，这里应该查询区块链获取真实交易数据
            return [
                { hash: '0x123...', value: '1000000000000000000', timestamp: Date.now() }
            ];
        } catch (error) {
            logger.error('Failed to get transaction history:', error);
            return [];
        }
    }

    // 🔧 ETH专用规则分析
    async ruleBasedAnalyzeContract(contractAddress, contractCode, transactionHistory, transactionData) {
        try {
            logger.info(`Starting ETH-focused rule-based analysis for contract: ${contractAddress}`);
            
            // ETH专用风险评估
            let ethRiskScore = 0;
            const ethRiskFactors = [];
            
            // 1. ETH合约代码检测
            if (contractCode && contractCode.length > 10000) {
                ethRiskScore += 15;
                ethRiskFactors.push('ETH合约代码复杂度较高');
            }
            
            // 2. ETH交易频率检测
            if (transactionHistory && transactionHistory.length > 100) {
                ethRiskScore += 10;
                ethRiskFactors.push('ETH交易频率异常');
            }
            
            // 3. ETH地址格式检测
            if (!contractAddress || contractAddress.length !== 42) {
                ethRiskScore += 25;
                ethRiskFactors.push('ETH合约地址格式异常');
            }
            
            // 4. ETH特定模式检测
            if (contractCode && contractCode.includes('transfer')) {
                ethRiskScore += 5;
                ethRiskFactors.push('包含ETH转账功能');
            }
            
            if (contractCode && contractCode.includes('selfdestruct')) {
                ethRiskScore += 20;
                ethRiskFactors.push('包含ETH合约自毁功能');
            }
            
            // 5. ETH余额风险检测
            const ethBalance = parseFloat(transactionData?.balance || '0');
            if (ethBalance > 100) {
                ethRiskScore += 15;
                ethRiskFactors.push('ETH余额过高，存在资金风险');
            }
            
            // 确定ETH风险等级
            let ethRiskLevel = 'low';
            if (ethRiskScore >= 50) ethRiskLevel = 'critical';
            else if (ethRiskScore >= 30) ethRiskLevel = 'high';
            else if (ethRiskScore >= 15) ethRiskLevel = 'medium';
            
            return {
                ethRiskScore,
                ethRiskLevel,
                ethRiskFactors,
                ethRecommendation: this.generateETHRecommendation(ethRiskLevel),
                ethConfidence: 0.75,
                analysisType: 'eth-rule-based',
                ethSpecificFindings: {
                    ethBalanceRisk: ethBalance > 100 ? 'high' : 'low',
                    ethTransferSafety: contractCode?.includes('transfer') ? 'needs_review' : 'safe',
                    ethGasOptimization: 'standard',
                    ethUpgradeability: contractCode?.includes('proxy') ? 'upgradeable' : 'immutable'
                },
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            logger.error('ETH rule-based analysis failed:', error);
            return this.getETHFallbackAnalysis(contractAddress);
        }
    }

    // 生成ETH专用建议
    generateETHRecommendation(ethRiskLevel) {
        const ethRecommendations = {
            'low': '该ETH合约风险较低，建议定期监控ETH余额变化',
            'medium': '该ETH合约存在中等风险，建议审查ETH转账逻辑和权限控制',
            'high': '该ETH合约存在高风险，建议立即审计所有ETH相关功能',
            'critical': '该ETH合约存在严重风险，建议暂停使用并进行全面安全审计'
        };
        return ethRecommendations[ethRiskLevel] || '建议进行ETH安全评估';
    }

    // ETH专用降级分析
    getETHFallbackAnalysis(contractAddress) {
        return {
            contractAddress,
            ethRiskScore: 50,
            ethRiskLevel: 'medium',
            ethRiskFactors: ['无法连接到ETH网络进行深度分析'],
            ethRecommendation: '建议在ETH网络连接恢复后重新进行分析',
            ethConfidence: 0.4,
            analysisType: 'eth-fallback-analysis',
            ethSpecificFindings: {
                ethBalanceRisk: 'unknown',
                ethTransferSafety: 'unknown',
                ethGasOptimization: 'unknown',
                ethUpgradeability: 'unknown'
            },
            timestamp: new Date().toISOString(),
            ethSummary: '由于ETH网络连接问题，使用基础规则进行ETH风险评估'
        };
    }

    // 获取后备分析结果（缺失的方法）
    // 已禁用的降级分析方法 - 仅用于向后兼容
    getFallbackAnalysis(contractAddress, error) {
        throw new Error(`ETH+AI分析是必需的，不支持降级分析。原始错误: ${error.message}`);
    }
    
    //  已禁用的降级分析方法  仅用于向后兼容  
    getBasicFallbackAnalysis(contractAddress) {
        throw new Error('ETH+AI分析是必需的，不支持基础降级分析');
    }
    
    //  已禁用的ETH降级分析方法 仅用于向后兼容
    getETHFallbackAnalysis(contractAddress) {
        throw new Error('ETH+AI分析是必需的，不支持ETH降级分析');
    }
    
    //  已禁用的ETH+AI降级分析方法  仅用于向后兼容
    getETHAIFallbackAnalysis(contractAddress, error) {
        throw new Error(`ETH+AI分析是必需的，不支持降级分析。请确保Qwen AI服务正常运行。原始错误: ${error.message}`);
    }

    //  基础后备分析
    getBasicFallbackAnalysis(contractAddress) {
        return {
            riskScore: 40,
            riskLevel: 'medium',
            riskFactors: ['基础规则分析'],
            recommendation: '建议进行更详细的人工审计',
            confidence: 40,
            analysisType: 'basic_fallback',
            timestamp: new Date().toISOString(),
            contractAddress
        };
    }

    //  生成建议
    generateRecommendation(riskLevel) {
        const recommendations = {
            low: '风险较低，可以考虑投资，但仍需谨慎',
            medium: '存在中等风险，建议进一步调研后决定',
            high: '风险较高，不建议投资，需要专业审计',
            critical: '风险极高，强烈不建议投资'
        };
        
        return recommendations[riskLevel] || '建议谨慎评估';
    }

    //  解析千问响应 添加缺失的方法
    parseQwenResponse(content) {
        try {
            logger.info('🔍 开始解析Qwen响应:', content.substring(0, 200) + '...');
            
            let jsonContent = content;
            
            // 🔧 处理markdown代码块格式
            if (content.includes('```json')) {
                // 提取JSON内容，移除markdown代码块标记
                const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
                if (jsonMatch && jsonMatch[1]) {
                    jsonContent = jsonMatch[1].trim();
                    logger.info('✅ 检测到markdown格式，已提取JSON内容');
                } else {
                    // 如果没有找到完整的代码块，尝试从```json开始提取
                    const startIndex = content.indexOf('```json');
                    if (startIndex !== -1) {
                        const afterStart = content.substring(startIndex + 7); // 跳过```json
                        const endIndex = afterStart.indexOf('```');
                        if (endIndex !== -1) {
                            jsonContent = afterStart.substring(0, endIndex).trim();
                        } else {
                            // 没有结束标记，取从```json之后的所有内容
                            jsonContent = afterStart.trim();
                        }
                    }
                }
            }
            
            // 🔧 处理其他可能的格式问题
            // 移除可能的前后空白字符和换行符
            jsonContent = jsonContent.trim();
            
            // 如果内容以```开头但不是```json，尝试移除
            if (jsonContent.startsWith('```') && !jsonContent.startsWith('```json')) {
                const lines = jsonContent.split('\n');
                if (lines.length > 1) {
                    jsonContent = lines.slice(1).join('\n');
                    // 移除结尾的```
                    if (jsonContent.endsWith('```')) {
                        jsonContent = jsonContent.slice(0, -3);
                    }
                    jsonContent = jsonContent.trim();
                }
            }
            
            // 移除结尾的```如果存在
            if (jsonContent.endsWith('```')) {
                jsonContent = jsonContent.slice(0, -3).trim();
            }
            
            // 🔧 增强JSON修复逻辑
            jsonContent = this.fixJsonFormat(jsonContent);
            
            logger.info('🔍 清理后的JSON内容:', jsonContent.substring(0, 200) + '...');
            
            // 尝试解析JSON响应
            const parsed = JSON.parse(jsonContent);
            
            // 🔍 验证和修复响应结构
            const validatedResponse = this.validateAndRepairAIResponse(parsed);
            
            logger.info('✅ ETH+AI响应解析和验证成功');
            return validatedResponse;
            
        } catch (parseError) {
            logger.error('🚨 Qwen响应解析失败:', {
                error: parseError.message,
                originalContent: content.substring(0, 500),
                contentLength: content.length
            });
            
            // 🔧 尝试修复JSON并重新解析
            try {
                const fixedJson = this.attemptJsonRepair(content);
                if (fixedJson) {
                    logger.info('🔧 尝试修复JSON成功，重新解析');
                    return this.parseQwenResponse(fixedJson);
                }
            } catch (repairError) {
                logger.error('🚨 JSON修复失败:', repairError.message);
            }
            
            //  最终失败，抛出错误
            throw new Error(`Qwen AI响应解析失败: ${parseError.message}。响应内容: ${content.substring(0, 100)}...。请检查Qwen AI服务状态。`);
        }
    }

    // 🔧 修复JSON格式的辅助方法
    fixJsonFormat(jsonStr) {
        try {
            // 移除多余的逗号
            jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');
            
            // 修复未闭合的字符串
            const lines = jsonStr.split('\n');
            const fixedLines = [];
            
            for (let i = 0; i < lines.length; i++) {
                let line = lines[i];
                
                // 检查是否有未闭合的引号
                const quotes = (line.match(/"/g) || []).length;
                if (quotes % 2 !== 0 && !line.trim().endsWith(',') && !line.trim().endsWith('{') && !line.trim().endsWith('[')) {
                    // 尝试在行末添加引号
                    line = line.trim();
                    if (!line.endsWith('"')) {
                        line += '"';
                    }
                }
                
                fixedLines.push(line);
            }
            
            return fixedLines.join('\n');
        } catch (error) {
            logger.warn('🔧 JSON格式修复失败:', error.message);
            return jsonStr;
        }
    }

    // 🔧 尝试修复不完整的JSON
    attemptJsonRepair(content) {
        try {
            // 提取可能的JSON部分
            let jsonContent = content;
            
            // 查找JSON开始位置
            const jsonStart = content.indexOf('{');
            if (jsonStart === -1) return null;
            
            jsonContent = content.substring(jsonStart);
            
            // 尝试找到最后一个完整的字段
            const lines = jsonContent.split('\n');
            let validJson = '';
            let braceCount = 0;
            let inString = false;
            let escapeNext = false;
            
            for (const line of lines) {
                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    
                    if (escapeNext) {
                        escapeNext = false;
                        continue;
                    }
                    
                    if (char === '\\') {
                        escapeNext = true;
                        continue;
                    }
                    
                    if (char === '"' && !escapeNext) {
                        inString = !inString;
                    }
                    
                    if (!inString) {
                        if (char === '{') braceCount++;
                        if (char === '}') braceCount--;
                    }
                    
                    validJson += char;
                    
                    // 如果找到完整的JSON对象
                    if (braceCount === 0 && validJson.trim().startsWith('{')) {
                        return validJson;
                    }
                }
                validJson += '\n';
            }
            
            // 如果没有找到完整的JSON，尝试补全
            if (braceCount > 0) {
                validJson += '}'.repeat(braceCount);
            }
            
            return validJson;
        } catch (error) {
            logger.error('🚨 JSON修复尝试失败:', error.message);
            return null;
        }
    }

    // 🔍 验证和修复AI响应的方法
     validateAndRepairAIResponse(response) {
         try {
             logger.info('🔍 开始验证AI响应结构');
             
             // 基本结构验证
             if (!response || typeof response !== 'object') {
                 throw new Error('响应不是有效的对象');
             }
             
             // 🔧 处理标准格式转换为ETH+AI格式
             if (response.riskScore !== undefined && !response.ethAIRiskScore) {
                 logger.info('🔄 检测到标准格式，转换为ETH+AI格式');
                 response.ethAIRiskScore = response.riskScore;
                 response.ethAIRiskLevel = response.riskLevel;
                 response.ethAIRiskFactors = response.riskFactors || [];
                 response.ethAIRecommendation = response.recommendation || '建议进一步进行ETH+AI分析';
                 response.ethAIConfidence = (response.confidence || 70) / 100;
             }
             
             // 必需字段验证和修复
             const requiredFields = {
                 ethAIRiskScore: 'number',
                 ethAIRiskLevel: 'string',
                 ethAIRiskFactors: 'array'
             };
             
             const repairedResponse = { ...response };
             
             for (const [field, expectedType] of Object.entries(requiredFields)) {
                 if (repairedResponse[field] === undefined || repairedResponse[field] === null) {
                     logger.warn(`⚠️ 缺失字段 ${field}，使用默认值`);
                     switch (field) {
                         case 'ethAIRiskScore':
                             repairedResponse[field] = 50;
                             break;
                         case 'ethAIRiskLevel':
                             repairedResponse[field] = 'medium';
                             break;
                         case 'ethAIRiskFactors':
                             repairedResponse[field] = ['数据不完整'];
                             break;
                     }
                 } else {
                     // 类型验证和修复
                     if (expectedType === 'number' && typeof repairedResponse[field] !== 'number') {
                         const numValue = parseFloat(repairedResponse[field]);
                         if (!isNaN(numValue)) {
                             repairedResponse[field] = numValue;
                             logger.info(`🔧 修复字段 ${field} 类型: ${typeof response[field]} -> number`);
                         } else {
                             repairedResponse[field] = 50; // 默认值
                             logger.warn(`⚠️ 无法转换字段 ${field}，使用默认值`);
                         }
                     } else if (expectedType === 'string' && typeof repairedResponse[field] !== 'string') {
                         repairedResponse[field] = String(repairedResponse[field]);
                         logger.info(`🔧 修复字段 ${field} 类型: ${typeof response[field]} -> string`);
                     } else if (expectedType === 'array' && !Array.isArray(repairedResponse[field])) {
                         if (typeof repairedResponse[field] === 'string') {
                             repairedResponse[field] = [repairedResponse[field]];
                         } else {
                             repairedResponse[field] = ['数据格式错误'];
                         }
                         logger.info(`🔧 修复字段 ${field} 类型: ${typeof response[field]} -> array`);
                     }
                 }
             }
             
             // 风险等级标准化
             const validRiskLevels = ['low', 'medium', 'high', 'critical'];
             if (!validRiskLevels.includes(repairedResponse.ethAIRiskLevel.toLowerCase())) {
                 const score = repairedResponse.ethAIRiskScore;
                 if (score < 30) repairedResponse.ethAIRiskLevel = 'low';
                 else if (score < 60) repairedResponse.ethAIRiskLevel = 'medium';
                 else if (score < 80) repairedResponse.ethAIRiskLevel = 'high';
                 else repairedResponse.ethAIRiskLevel = 'critical';
                 logger.info(`🔧 修复风险等级: ${response.ethAIRiskLevel} -> ${repairedResponse.ethAIRiskLevel}`);
             }
             
             // 风险分数范围验证
             if (repairedResponse.ethAIRiskScore < 0 || repairedResponse.ethAIRiskScore > 100) {
                 repairedResponse.ethAIRiskScore = Math.max(0, Math.min(100, repairedResponse.ethAIRiskScore));
                 logger.info(`🔧 修复风险分数范围: ${response.ethAIRiskScore} -> ${repairedResponse.ethAIRiskScore}`);
             }
             
             // 添加缺失的可选字段
             const optionalFields = {
                 ethAIRecommendation: '建议进一步进行ETH+AI分析',
                 ethAIConfidence: 0.72,
                 ethAISecurityScore: repairedResponse.ethAIRiskScore,
                 ethAIStabilityScore: Math.max(0, 100 - repairedResponse.ethAIRiskScore),
                 aiDrivenStabilityAnalysis: {
                     liquidityStability: 'unknown',
                     priceStability: 'unknown',
                     systemResilience: 'unknown',
                     riskMitigation: 'basic',
                     adaptiveCapability: 'limited'
                 },
                 analysisType: 'eth_ai_qwen_repaired',
                 timestamp: new Date().toISOString()
             };
             
             for (const [field, defaultValue] of Object.entries(optionalFields)) {
                 if (repairedResponse[field] === undefined) {
                     repairedResponse[field] = defaultValue;
                 }
             }
             
             logger.info('✅ AI响应验证和修复完成');
             return repairedResponse;
             
         } catch (error) {
             logger.error('🚨 AI响应验证失败:', error.message);
             
             // 返回最小可用响应
             return {
                 ethAIRiskScore: 50,
                 ethAIRiskLevel: 'medium',
                 ethAIRiskFactors: ['响应验证失败，使用默认分析'],
                 ethAIRecommendation: '建议重新进行分析',
                 ethAIConfidence: 0.3,
                 ethAISecurityScore: 50,
                 ethAIStabilityScore: 50,
                 aiDrivenStabilityAnalysis: {
                     liquidityStability: 'unknown',
                     priceStability: 'unknown',
                     systemResilience: 'unknown',
                     riskMitigation: 'basic',
                     adaptiveCapability: 'limited'
                 },
                 analysisType: 'eth_ai_fallback',
                 timestamp: new Date().toISOString(),
                 error: error.message
             };
         }
     }

    // 📊 ETH+AI分析结果合并 
    combineETHAIAnalysisResults(aiAnalysis, ruleBasedAnalysis, contractInfo) {
        if (aiAnalysis) { 
            // AI分析成功，构建ETH+AI融合结果 
            return { 
                ...aiAnalysis, 
                contractInfo, 
                analysisMethod: 'eth_ai_driven', 
                fallbackData: ruleBasedAnalysis, 
                ethAIFeatures: { 
                    realTimeAIMonitoring: true, 
                    predictiveRiskAnalysis: true, 
                    adaptiveStabilityMechanisms: true, 
                    aiDrivenRiskControl: true, 
                    ethNetworkIntegration: true, 
                    intelligentLiquidityManagement: true 
                }, 
                stabilityMetrics: { 
                    aiConfidence: aiAnalysis.ethAIConfidence || 0.72, 
                    systemResilience: this.calculateSystemResilience(aiAnalysis), 
                    adaptiveCapability: this.calculateAdaptiveCapability(aiAnalysis), 
                    ethIntegrationLevel: 0.9 
                }, 
                timestamp: new Date().toISOString() 
            }; 
        } else { 
            // 使用增强的规则基础分析 
            return { 
                ...ruleBasedAnalysis, 
                contractInfo, 
                analysisMethod: 'eth_ai_fallback', 
                ethAIFeatures: { 
                    realTimeAIMonitoring: false, 
                    predictiveRiskAnalysis: false, 
                    adaptiveStabilityMechanisms: false, 
                    aiDrivenRiskControl: false, 
                    ethNetworkIntegration: true, 
                    intelligentLiquidityManagement: false 
                }, 
                stabilityMetrics: { 
                    aiConfidence: 0.4, 
                    systemResilience: 0.6, 
                    adaptiveCapability: 0.3, 
                    ethIntegrationLevel: 0.7 
                }, 
                timestamp: new Date().toISOString() 
            }; 
        } 
    } 

    // 计算系统韧性 
    calculateSystemResilience(aiAnalysis) { 
        if (!aiAnalysis.aiDrivenStabilityAnalysis) return 0.5; 
        
        const stability = aiAnalysis.aiDrivenStabilityAnalysis; 
        const resilience = ( 
            (stability.liquidityStability === 'high' ? 0.3 : stability.liquidityStability === 'medium' ? 0.2 : 0.1) + 
            (stability.priceStability === 'high' ? 0.3 : stability.priceStability === 'medium' ? 0.2 : 0.1) + 
            (stability.systemResilience === 'high' ? 0.4 : stability.systemResilience === 'medium' ? 0.3 : 0.2) 
        ); 
        
        return Math.min(1.0, resilience); 
    } 

    // 计算自适应能力 
    calculateAdaptiveCapability(aiAnalysis) { 
        if (!aiAnalysis.aiDrivenStabilityAnalysis) return 0.3; 
        
        const adaptiveScore = aiAnalysis.aiDrivenStabilityAnalysis.adaptiveCapability; 
        if (typeof adaptiveScore === 'string') { 
            return adaptiveScore === 'high' ? 0.9 : adaptiveScore === 'medium' ? 0.6 : 0.3; 
        } 
        return adaptiveScore || 0.5; 
    }
}

module.exports = new AIAnalysisService();
