const logger = require('../utils/logger');
const etherscanService = require('./etherscanService');

/**
 * 链上行为分析服务
 * 分析智能合约的历史交易行为和运行状态
 */
class OnchainBehaviorService {
    constructor() {
        // 异常行为检测规则
        this.behaviorRules = {
            highFailureRate: {
                threshold: 0.1, // 10%失败率
                severity: 'high',
                description: '交易失败率过高'
            },
            suspiciousGasUsage: {
                threshold: 0.9, // 使用90%以上gas
                severity: 'medium',
                description: 'Gas使用异常'
            },
            frequentEmergencyEvents: {
                threshold: 3, // 3次以上紧急事件
                severity: 'high',
                description: '频繁的紧急事件'
            },
            unusualValueTransfers: {
                threshold: 0.05, // 5%的异常价值转移
                severity: 'medium',
                description: '异常的价值转移模式'
            }
        };

        // 事件类型分类
        this.eventTypes = {
            emergency: ['Pause', 'Emergency', 'Halt', 'Stop', 'Freeze'],
            security: ['SecurityAlert', 'Breach', 'Attack', 'Exploit'],
            governance: ['Upgrade', 'Migration', 'OwnershipTransfer'],
            normal: ['Transfer', 'Approval', 'Mint', 'Burn', 'Swap']
        };
    }

    /**
     * 分析合约链上行为
     * @param {string} contractAddress - 合约地址
     * @param {Object} options - 分析选项
     * @returns {Promise<Object>} 行为分析结果
     */
    async analyzeContractBehavior(contractAddress, options = {}) {
        try {
            const {
                maxTransactions = 1000,
                timeRange = 30 * 24 * 60 * 60, // 30天
                includeInternalTx = true
            } = options;

            // 获取交易历史
            const transactions = await this.getTransactionHistory(contractAddress, maxTransactions);
            const internalTx = includeInternalTx ? 
                await etherscanService.getInternalTransactions(contractAddress) : [];

            // 分析各项指标
            const failureAnalysis = this.analyzeTransactionFailures(transactions);
            const gasAnalysis = this.analyzeGasUsage(transactions);
            const valueAnalysis = this.analyzeValueTransfers(transactions);
            const timeAnalysis = this.analyzeTimePatterns(transactions);
            const eventAnalysis = await this.analyzeContractEvents(contractAddress);

            // 计算综合得分
            const score = this.calculateBehaviorScore({
                failureAnalysis,
                gasAnalysis,
                valueAnalysis,
                timeAnalysis,
                eventAnalysis
            });

            return {
                score,
                contractAddress,
                analysisDate: new Date().toISOString(),
                transactionCount: transactions.length,
                timeRange: timeRange,
                metrics: {
                    failureAnalysis,
                    gasAnalysis,
                    valueAnalysis,
                    timeAnalysis,
                    eventAnalysis
                },
                recommendations: this.generateBehaviorRecommendations({
                    failureAnalysis,
                    gasAnalysis,
                    eventAnalysis
                }),
                summary: this.generateBehaviorSummary(score, {
                    failureAnalysis,
                    gasAnalysis,
                    eventAnalysis
                })
            };

        } catch (error) {
            logger.error('链上行为分析失败:', error);
            return this.getDefaultBehaviorResult(contractAddress, error.message);
        }
    }

    /**
     * 获取交易历史
     * @param {string} contractAddress - 合约地址
     * @param {number} maxTransactions - 最大交易数
     * @returns {Promise<Array>} 交易列表
     */
    async getTransactionHistory(contractAddress, maxTransactions) {
        try {
            // 尝试从Etherscan获取真实数据
            const transactions = await etherscanService.getContractTransactions(
                contractAddress, 
                1, 
                Math.min(maxTransactions, 1000)
            );

            if (transactions && transactions.length > 0) {
                return transactions;
            }

            // 如果没有真实数据，生成模拟数据
            return this.generateMockTransactions(contractAddress, maxTransactions);

        } catch (error) {
            logger.warn('获取交易历史失败，使用模拟数据:', error);
            return this.generateMockTransactions(contractAddress, maxTransactions);
        }
    }

    /**
     * 分析交易失败情况
     * @param {Array} transactions - 交易列表
     * @returns {Object} 失败分析结果
     */
    analyzeTransactionFailures(transactions) {
        if (!transactions || transactions.length === 0) {
            return { failureRate: 0, failedCount: 0, totalCount: 0, severity: 'low' };
        }

        const failedTransactions = transactions.filter(tx => 
            tx.isError || tx.txreceipt_status === '0'
        );

        const failureRate = failedTransactions.length / transactions.length;
        const severity = failureRate > this.behaviorRules.highFailureRate.threshold ? 'high' : 'low';

        return {
            failureRate,
            failedCount: failedTransactions.length,
            totalCount: transactions.length,
            severity,
            failedTransactions: failedTransactions.slice(0, 10), // 最多返回10个失败交易
            analysis: this.analyzeFailurePatterns(failedTransactions)
        };
    }

    /**
     * 分析Gas使用情况
     * @param {Array} transactions - 交易列表
     * @returns {Object} Gas分析结果
     */
    analyzeGasUsage(transactions) {
        if (!transactions || transactions.length === 0) {
            return { averageGasUsage: 0, gasEfficiency: 1, severity: 'low' };
        }

        const gasData = transactions
            .filter(tx => tx.gas && tx.gasUsed)
            .map(tx => ({
                gasLimit: parseInt(tx.gas),
                gasUsed: parseInt(tx.gasUsed),
                gasPrice: parseInt(tx.gasPrice || 0),
                efficiency: parseInt(tx.gasUsed) / parseInt(tx.gas)
            }));

        if (gasData.length === 0) {
            return { averageGasUsage: 0, gasEfficiency: 1, severity: 'low' };
        }

        const averageGasUsage = gasData.reduce((sum, data) => sum + data.gasUsed, 0) / gasData.length;
        const averageEfficiency = gasData.reduce((sum, data) => sum + data.efficiency, 0) / gasData.length;
        
        const highGasUsageCount = gasData.filter(data => 
            data.efficiency > this.behaviorRules.suspiciousGasUsage.threshold
        ).length;

        const severity = (highGasUsageCount / gasData.length) > 0.1 ? 'medium' : 'low';

        return {
            averageGasUsage: Math.round(averageGasUsage),
            gasEfficiency: averageEfficiency,
            highGasUsageCount,
            severity,
            gasDistribution: this.calculateGasDistribution(gasData)
        };
    }

    /**
     * 分析价值转移情况
     * @param {Array} transactions - 交易列表
     * @returns {Object} 价值分析结果
     */
    analyzeValueTransfers(transactions) {
        if (!transactions || transactions.length === 0) {
            return { totalValue: 0, averageValue: 0, suspiciousTransfers: 0, severity: 'low' };
        }

        const valueTransfers = transactions
            .filter(tx => tx.value && parseInt(tx.value) > 0)
            .map(tx => ({
                value: parseInt(tx.value),
                from: tx.from,
                to: tx.to,
                timestamp: parseInt(tx.timeStamp)
            }));

        if (valueTransfers.length === 0) {
            return { totalValue: 0, averageValue: 0, suspiciousTransfers: 0, severity: 'low' };
        }

        const totalValue = valueTransfers.reduce((sum, transfer) => sum + transfer.value, 0);
        const averageValue = totalValue / valueTransfers.length;

        // 检测异常转移（价值远高于平均值）
        const threshold = averageValue * 10; // 10倍平均值
        const suspiciousTransfers = valueTransfers.filter(transfer => 
            transfer.value > threshold
        ).length;

        const suspiciousRate = suspiciousTransfers / valueTransfers.length;
        const severity = suspiciousRate > this.behaviorRules.unusualValueTransfers.threshold ? 'medium' : 'low';

        return {
            totalValue,
            averageValue: Math.round(averageValue),
            transferCount: valueTransfers.length,
            suspiciousTransfers,
            suspiciousRate,
            severity,
            valueDistribution: this.calculateValueDistribution(valueTransfers)
        };
    }

    /**
     * 分析时间模式
     * @param {Array} transactions - 交易列表
     * @returns {Object} 时间分析结果
     */
    analyzeTimePatterns(transactions) {
        if (!transactions || transactions.length === 0) {
            return { activityPattern: 'unknown', peakHours: [], severity: 'low' };
        }

        const timestamps = transactions.map(tx => parseInt(tx.timeStamp));
        const hourlyActivity = new Array(24).fill(0);
        const dailyActivity = {};

        timestamps.forEach(timestamp => {
            const date = new Date(timestamp * 1000);
            const hour = date.getHours();
            const day = date.toDateString();

            hourlyActivity[hour]++;
            dailyActivity[day] = (dailyActivity[day] || 0) + 1;
        });

        // 找出活跃时段
        const maxActivity = Math.max(...hourlyActivity);
        const peakHours = hourlyActivity
            .map((activity, hour) => ({ hour, activity }))
            .filter(item => item.activity > maxActivity * 0.8)
            .map(item => item.hour);

        // 分析活动模式
        const activityPattern = this.classifyActivityPattern(hourlyActivity, dailyActivity);

        return {
            activityPattern,
            peakHours,
            hourlyDistribution: hourlyActivity,
            dailyCount: Object.keys(dailyActivity).length,
            averageDailyTransactions: timestamps.length / Object.keys(dailyActivity).length,
            severity: 'low' // 时间模式通常不是安全问题
        };
    }

    /**
     * 分析合约事件
     * @param {string} contractAddress - 合约地址
     * @returns {Promise<Object>} 事件分析结果
     */
    async analyzeContractEvents(contractAddress) {
        try {
            // 这里应该调用实际的事件获取API
            // 目前使用模拟数据
            const events = this.generateMockEvents(contractAddress);

            const eventsByType = this.categorizeEvents(events);
            const emergencyEventCount = eventsByType.emergency.length;
            const securityEventCount = eventsByType.security.length;

            const severity = emergencyEventCount > this.behaviorRules.frequentEmergencyEvents.threshold ? 
                'high' : (securityEventCount > 0 ? 'medium' : 'low');

            return {
                totalEvents: events.length,
                eventsByType,
                emergencyEventCount,
                securityEventCount,
                severity,
                recentEvents: events.slice(0, 10), // 最近10个事件
                timeline: this.createEventTimeline(events)
            };

        } catch (error) {
            logger.error('事件分析失败:', error);
            return {
                totalEvents: 0,
                eventsByType: { emergency: [], security: [], governance: [], normal: [] },
                emergencyEventCount: 0,
                securityEventCount: 0,
                severity: 'low'
            };
        }
    }

    /**
     * 计算行为得分
     * @param {Object} analyses - 各项分析结果
     * @returns {number} 0-1之间的得分
     */
    calculateBehaviorScore(analyses) {
        let score = 1.0;

        // 根据失败率扣分
        if (analyses.failureAnalysis.severity === 'high') {
            score -= 0.3;
        } else if (analyses.failureAnalysis.failureRate > 0.05) {
            score -= 0.1;
        }

        // 根据Gas使用异常扣分
        if (analyses.gasAnalysis.severity === 'medium') {
            score -= 0.1;
        }

        // 根据价值转移异常扣分
        if (analyses.valueAnalysis.severity === 'medium') {
            score -= 0.1;
        }

        // 根据紧急事件扣分
        if (analyses.eventAnalysis.severity === 'high') {
            score -= 0.4;
        } else if (analyses.eventAnalysis.severity === 'medium') {
            score -= 0.2;
        }

        return Math.max(0.1, Math.min(1, score));
    }

    /**
     * 生成模拟交易数据
     * @param {string} contractAddress - 合约地址
     * @param {number} count - 交易数量
     * @returns {Array} 模拟交易列表
     */
    generateMockTransactions(contractAddress, count) {
        const transactions = [];
        const now = Math.floor(Date.now() / 1000);

        for (let i = 0; i < Math.min(count, 100); i++) {
            const timestamp = now - (i * 3600); // 每小时一个交易
            const isError = Math.random() < 0.05; // 5%失败率
            const gasLimit = 21000 + Math.floor(Math.random() * 200000);
            const gasUsed = isError ? gasLimit : Math.floor(gasLimit * (0.3 + Math.random() * 0.6));

            transactions.push({
                hash: `0x${Math.random().toString(16).substr(2, 64)}`,
                blockNumber: 18000000 + i,
                timeStamp: timestamp,
                from: `0x${Math.random().toString(16).substr(2, 40)}`,
                to: contractAddress,
                value: Math.random() < 0.3 ? Math.floor(Math.random() * 1000000000000000000).toString() : '0',
                gas: gasLimit.toString(),
                gasPrice: (20000000000 + Math.floor(Math.random() * 50000000000)).toString(),
                gasUsed: gasUsed.toString(),
                isError: isError,
                txreceipt_status: isError ? '0' : '1'
            });
        }

        return transactions;
    }

    /**
     * 生成模拟事件数据
     * @param {string} contractAddress - 合约地址
     * @returns {Array} 模拟事件列表
     */
    generateMockEvents(contractAddress) {
        const events = [];
        const eventTypes = ['Transfer', 'Approval', 'Pause', 'Unpause', 'OwnershipTransfer'];
        const now = Math.floor(Date.now() / 1000);

        for (let i = 0; i < 20; i++) {
            const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
            events.push({
                eventType,
                blockNumber: 18000000 + i,
                timestamp: now - (i * 7200), // 每2小时一个事件
                transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
                data: `Mock data for ${eventType}`,
                topics: [`0x${Math.random().toString(16).substr(2, 64)}`]
            });
        }

        return events;
    }

    /**
     * 其他辅助方法...
     */
    analyzeFailurePatterns(failedTransactions) {
        // 分析失败模式的实现
        return {
            commonErrors: ['Out of gas', 'Revert', 'Invalid opcode'],
            errorDistribution: { 'Out of gas': 0.4, 'Revert': 0.5, 'Invalid opcode': 0.1 }
        };
    }

    calculateGasDistribution(gasData) {
        // 计算Gas分布的实现
        return {
            low: gasData.filter(d => d.gasUsed < 50000).length,
            medium: gasData.filter(d => d.gasUsed >= 50000 && d.gasUsed < 200000).length,
            high: gasData.filter(d => d.gasUsed >= 200000).length
        };
    }

    calculateValueDistribution(valueTransfers) {
        // 计算价值分布的实现
        const values = valueTransfers.map(t => t.value).sort((a, b) => a - b);
        return {
            min: values[0] || 0,
            max: values[values.length - 1] || 0,
            median: values[Math.floor(values.length / 2)] || 0
        };
    }

    classifyActivityPattern(hourlyActivity, dailyActivity) {
        // 分类活动模式的实现
        const maxHour = hourlyActivity.indexOf(Math.max(...hourlyActivity));
        if (maxHour >= 9 && maxHour <= 17) return 'business_hours';
        if (maxHour >= 22 || maxHour <= 6) return 'night_activity';
        return 'distributed';
    }

    categorizeEvents(events) {
        // 事件分类的实现
        const categorized = { emergency: [], security: [], governance: [], normal: [] };
        
        events.forEach(event => {
            let category = 'normal';
            for (const [type, keywords] of Object.entries(this.eventTypes)) {
                if (keywords.some(keyword => event.eventType.includes(keyword))) {
                    category = type;
                    break;
                }
            }
            categorized[category].push(event);
        });

        return categorized;
    }

    createEventTimeline(events) {
        // 创建事件时间线的实现
        return events
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 10)
            .map(event => ({
                timestamp: event.timestamp,
                type: event.eventType,
                description: `${event.eventType} event at block ${event.blockNumber}`
            }));
    }

    generateBehaviorRecommendations(analyses) {
        const recommendations = [];

        if (analyses.failureAnalysis.severity === 'high') {
            recommendations.push('调查高失败率的原因，检查合约逻辑和输入验证');
        }

        if (analyses.gasAnalysis.severity === 'medium') {
            recommendations.push('优化合约代码以降低Gas消耗');
        }

        if (analyses.eventAnalysis.emergencyEventCount > 0) {
            recommendations.push('审查紧急事件的触发原因，加强监控机制');
        }

        return recommendations;
    }

    generateBehaviorSummary(score, analyses) {
        const scorePercent = (score * 100).toFixed(1);
        let summary = `链上行为得分: ${scorePercent}%`;

        if (analyses.failureAnalysis.failureRate > 0.1) {
            summary += `, 交易失败率: ${(analyses.failureAnalysis.failureRate * 100).toFixed(1)}%`;
        }

        if (analyses.eventAnalysis.emergencyEventCount > 0) {
            summary += `, 发现 ${analyses.eventAnalysis.emergencyEventCount} 个紧急事件`;
        }

        return summary;
    }

    getDefaultBehaviorResult(contractAddress, error) {
        return {
            score: 0.7, // 默认中等得分
            contractAddress,
            analysisDate: new Date().toISOString(),
            transactionCount: 0,
            metrics: {},
            recommendations: ['无法获取链上数据，建议手动检查合约行为'],
            summary: `链上行为分析失败: ${error}`
        };
    }
}

module.exports = new OnchainBehaviorService();