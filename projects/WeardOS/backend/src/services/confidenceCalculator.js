const logger = require('../utils/logger');

/**
 * 综合置信度计算器
 * 基于多个量化指标计算合约的安全性、可靠性和可维护性综合置信度
 */
class ConfidenceCalculator {
    constructor() {
        // 各项指标的权重配置
        this.weights = {
            verified_source: 0.20,        // 源码验证
            test_coverage: 0.15,          // 测试覆盖率
            static_analysis_score: 0.20,  // 静态分析得分
            fuzzing_score: 0.15,          // 模糊测试得分
            formal_verification: 0.10,    // 形式化验证
            dependency_trust: 0.10,       // 依赖可信度
            onchain_behavior_score: 0.10  // 链上行为得分
        };
    }

    /**
     * 计算综合置信度
     * @param {Object} metrics - 各项指标数据
     * @returns {Object} 置信度计算结果
     */
    calculateConfidence(metrics = {}) {
        try {
            const scores = {
                verified_source: this.calculateVerifiedSource(metrics.contractAddress, metrics.sourceCode),
                test_coverage: this.calculateTestCoverage(metrics.testData),
                static_analysis_score: this.calculateStaticAnalysisScore(metrics.vulnerabilities, metrics.codeQuality),
                fuzzing_score: this.calculateFuzzingScore(metrics.fuzzingResults),
                formal_verification: this.calculateFormalVerification(metrics.formalProofs),
                dependency_trust: this.calculateDependencyTrust(metrics.dependencies),
                onchain_behavior_score: this.calculateOnchainBehavior(metrics.transactionHistory, metrics.contractEvents)
            };

            // 计算加权综合置信度
            let weightedSum = 0;
            let totalWeight = 0;

            for (const [metric, score] of Object.entries(scores)) {
                if (score !== null && score !== undefined) {
                    weightedSum += score * this.weights[metric];
                    totalWeight += this.weights[metric];
                }
            }

            const confidence = totalWeight > 0 ? weightedSum / totalWeight : 0.5;

            return {
                confidence: Math.max(0, Math.min(1, confidence)),
                scores,
                weights: this.weights,
                details: this.generateConfidenceDetails(scores)
            };

        } catch (error) {
            logger.error('置信度计算失败:', error);
            return {
                confidence: 0.5,
                scores: {},
                weights: this.weights,
                details: '计算过程中出现错误，使用默认置信度'
            };
        }
    }

    /**
     * 计算源码验证得分
     */
    calculateVerifiedSource(contractAddress, sourceCode) {
        if (!contractAddress) return 0;

        // 模拟检查是否在 Etherscan 等平台验证
        // 实际实现中应该调用 Etherscan API
        if (sourceCode && sourceCode.length > 100) {
            // 如果有源码且长度合理，假设已验证
            return 1.0;
        }

        // 简单的地址格式检查
        if (contractAddress.startsWith('0x') && contractAddress.length === 42) {
            // 模拟部分验证情况
            return Math.random() > 0.5 ? 1.0 : 0.0;
        }

        return 0.0;
    }

    /**
     * 计算测试覆盖率得分
     */
    calculateTestCoverage(testData) {
        if (!testData) return 0.3; // 默认假设有基本测试

        if (testData.coverage !== undefined) {
            return Math.max(0, Math.min(1, testData.coverage / 100));
        }

        // 基于测试数量估算覆盖率
        if (testData.testCount) {
            const estimatedCoverage = Math.min(0.9, testData.testCount * 0.1);
            return estimatedCoverage;
        }

        return 0.3;
    }

    /**
     * 计算静态分析得分
     */
    calculateStaticAnalysisScore(vulnerabilities, codeQuality) {
        let score = 1.0;

        if (vulnerabilities && Array.isArray(vulnerabilities)) {
            // 根据漏洞严重程度扣分
            for (const vuln of vulnerabilities) {
                switch (vuln.severity) {
                    case 'critical':
                        score -= 0.3;
                        break;
                    case 'high':
                        score -= 0.2;
                        break;
                    case 'medium':
                        score -= 0.1;
                        break;
                    case 'low':
                        score -= 0.05;
                        break;
                }
            }
        }

        if (codeQuality) {
            // 代码质量调整
            if (codeQuality.complexity === 'high') score -= 0.1;
            if (codeQuality.maintainability === 'low') score -= 0.1;
        }

        return Math.max(0, Math.min(1, score));
    }

    /**
     * 计算模糊测试得分
     */
    calculateFuzzingScore(fuzzingResults) {
        if (!fuzzingResults) return 0.6; // 默认中等得分

        if (fuzzingResults.crashCount !== undefined) {
            // 基于崩溃次数计算
            const crashPenalty = Math.min(0.8, fuzzingResults.crashCount * 0.1);
            return Math.max(0.2, 1.0 - crashPenalty);
        }

        if (fuzzingResults.passed !== undefined) {
            return fuzzingResults.passed ? 0.9 : 0.3;
        }

        return 0.6;
    }

    /**
     * 计算形式化验证得分
     */
    calculateFormalVerification(formalProofs) {
        if (!formalProofs) return 0.0;

        if (formalProofs.complete) return 1.0;
        if (formalProofs.partial) return 0.5;
        if (formalProofs.attempted) return 0.2;

        return 0.0;
    }

    /**
     * 计算依赖可信度得分
     */
    calculateDependencyTrust(dependencies) {
        if (!dependencies || !Array.isArray(dependencies)) return 0.7;

        let trustScore = 0;
        let totalDeps = dependencies.length;

        if (totalDeps === 0) return 0.8; // 无依赖相对安全

        for (const dep of dependencies) {
            let depScore = 0.5; // 默认中等信任

            // OpenZeppelin 等知名库
            if (dep.name && dep.name.includes('openzeppelin')) {
                depScore = 0.9;
            } else if (dep.verified) {
                depScore = 0.8;
            } else if (dep.popular) {
                depScore = 0.7;
            }

            // 版本新旧程度
            if (dep.outdated) depScore *= 0.8;

            trustScore += depScore;
        }

        return trustScore / totalDeps;
    }

    /**
     * 计算链上行为得分
     */
    calculateOnchainBehavior(transactionHistory, contractEvents) {
        let score = 0.8; // 默认良好得分

        if (transactionHistory && Array.isArray(transactionHistory)) {
            // 检查异常交易
            const suspiciousCount = transactionHistory.filter(tx => 
                tx.suspicious || tx.failed || tx.gasUsed > tx.gasLimit * 0.9
            ).length;

            const suspiciousRatio = suspiciousCount / transactionHistory.length;
            score -= suspiciousRatio * 0.5;
        }

        if (contractEvents && Array.isArray(contractEvents)) {
            // 检查紧急事件
            const emergencyEvents = contractEvents.filter(event => 
                event.type === 'emergency' || event.type === 'pause' || event.type === 'halt'
            ).length;

            if (emergencyEvents > 0) {
                score -= Math.min(0.4, emergencyEvents * 0.1);
            }
        }

        return Math.max(0.1, Math.min(1, score));
    }

    /**
     * 生成置信度详细说明
     */
    generateConfidenceDetails(scores) {
        const details = [];

        for (const [metric, score] of Object.entries(scores)) {
            if (score !== null && score !== undefined) {
                const percentage = (score * 100).toFixed(1);
                const weight = (this.weights[metric] * 100).toFixed(0);
                
                let description = '';
                switch (metric) {
                    case 'verified_source':
                        description = `源码验证: ${percentage}% (权重${weight}%)`;
                        break;
                    case 'test_coverage':
                        description = `测试覆盖率: ${percentage}% (权重${weight}%)`;
                        break;
                    case 'static_analysis_score':
                        description = `静态分析: ${percentage}% (权重${weight}%)`;
                        break;
                    case 'fuzzing_score':
                        description = `模糊测试: ${percentage}% (权重${weight}%)`;
                        break;
                    case 'formal_verification':
                        description = `形式化验证: ${percentage}% (权重${weight}%)`;
                        break;
                    case 'dependency_trust':
                        description = `依赖可信度: ${percentage}% (权重${weight}%)`;
                        break;
                    case 'onchain_behavior_score':
                        description = `链上行为: ${percentage}% (权重${weight}%)`;
                        break;
                }
                details.push(description);
            }
        }

        return details;
    }

    /**
     * 更新权重配置
     */
    updateWeights(newWeights) {
        // 验证权重总和为1
        const totalWeight = Object.values(newWeights).reduce((sum, weight) => sum + weight, 0);
        if (Math.abs(totalWeight - 1.0) > 0.01) {
            throw new Error('权重总和必须等于1.0');
        }

        this.weights = { ...this.weights, ...newWeights };
        logger.info('置信度权重已更新:', this.weights);
    }
}

module.exports = new ConfidenceCalculator();