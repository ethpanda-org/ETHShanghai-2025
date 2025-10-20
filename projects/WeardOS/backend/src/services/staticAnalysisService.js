const logger = require('../utils/logger');

/**
 * 静态分析服务
 * 分析智能合约代码的安全性、质量和潜在问题
 */
class StaticAnalysisService {
    constructor() {
        // 漏洞模式定义
        this.vulnerabilityPatterns = {
            reentrancy: {
                pattern: /\.call\s*\(|\.send\s*\(|\.transfer\s*\(/gi,
                severity: 'high',
                description: '可能存在重入攻击风险'
            },
            uncheckedCall: {
                pattern: /\.call\s*\([^)]*\)\s*;/gi,
                severity: 'medium',
                description: '未检查外部调用返回值'
            },
            integerOverflow: {
                pattern: /\+\+|\-\-|\+\s*=|\-\s*=|\*\s*=|\/\s*=/gi,
                severity: 'medium',
                description: '可能存在整数溢出风险'
            },
            txOrigin: {
                pattern: /tx\.origin/gi,
                severity: 'high',
                description: '使用tx.origin进行身份验证存在安全风险'
            },
            delegateCall: {
                pattern: /delegatecall/gi,
                severity: 'high',
                description: 'delegatecall使用需要特别小心'
            },
            randomness: {
                pattern: /block\.timestamp|block\.number|block\.difficulty|blockhash/gi,
                severity: 'medium',
                description: '使用区块信息作为随机数源不安全'
            },
            gasLimit: {
                pattern: /gasleft\(\)|gas\s*:/gi,
                severity: 'low',
                description: 'Gas限制相关代码需要仔细检查'
            },
            suicide: {
                pattern: /selfdestruct|suicide/gi,
                severity: 'high',
                description: '自毁函数使用需要严格的访问控制'
            }
        };

        // 代码质量检查规则
        this.qualityRules = {
            functionLength: {
                maxLines: 50,
                severity: 'low',
                description: '函数过长，建议拆分'
            },
            complexity: {
                maxCyclomaticComplexity: 10,
                severity: 'medium',
                description: '函数复杂度过高'
            },
            naming: {
                pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
                severity: 'low',
                description: '命名不符合规范'
            }
        };
    }

    /**
     * 执行静态分析
     * @param {string} sourceCode - 合约源码
     * @param {Object} options - 分析选项
     * @returns {Object} 分析结果
     */
    async analyzeContract(sourceCode, options = {}) {
        try {
            if (!sourceCode || typeof sourceCode !== 'string') {
                return this.getDefaultAnalysisResult('无效的源码');
            }

            const vulnerabilities = this.detectVulnerabilities(sourceCode);
            const qualityIssues = this.analyzeCodeQuality(sourceCode);
            const complexity = this.calculateComplexity(sourceCode);
            const dependencies = this.analyzeDependencies(sourceCode);

            const score = this.calculateOverallScore(vulnerabilities, qualityIssues, complexity);

            return {
                score,
                vulnerabilities,
                qualityIssues,
                complexity,
                dependencies,
                recommendations: this.generateRecommendations(vulnerabilities, qualityIssues),
                summary: this.generateSummary(score, vulnerabilities, qualityIssues)
            };

        } catch (error) {
            logger.error('静态分析失败:', error);
            return this.getDefaultAnalysisResult('分析过程中出现错误');
        }
    }

    /**
     * 检测安全漏洞
     * @param {string} sourceCode - 源码
     * @returns {Array} 漏洞列表
     */
    detectVulnerabilities(sourceCode) {
        const vulnerabilities = [];

        for (const [vulnType, config] of Object.entries(this.vulnerabilityPatterns)) {
            const matches = sourceCode.match(config.pattern);
            if (matches) {
                vulnerabilities.push({
                    type: vulnType,
                    severity: config.severity,
                    description: config.description,
                    occurrences: matches.length,
                    confidence: this.calculateVulnerabilityConfidence(vulnType, matches, sourceCode)
                });
            }
        }

        // 特殊检查：重入攻击
        if (this.checkReentrancyVulnerability(sourceCode)) {
            vulnerabilities.push({
                type: 'reentrancy_advanced',
                severity: 'critical',
                description: '检测到潜在的重入攻击模式',
                occurrences: 1,
                confidence: 0.8
            });
        }

        return vulnerabilities;
    }

    /**
     * 分析代码质量
     * @param {string} sourceCode - 源码
     * @returns {Array} 质量问题列表
     */
    analyzeCodeQuality(sourceCode) {
        const issues = [];
        const lines = sourceCode.split('\n');

        // 检查函数长度
        const functions = this.extractFunctions(sourceCode);
        for (const func of functions) {
            if (func.lineCount > this.qualityRules.functionLength.maxLines) {
                issues.push({
                    type: 'function_too_long',
                    severity: 'low',
                    description: `函数 ${func.name} 过长 (${func.lineCount} 行)`,
                    line: func.startLine
                });
            }
        }

        // 检查注释覆盖率
        const commentRatio = this.calculateCommentRatio(sourceCode);
        if (commentRatio < 0.1) {
            issues.push({
                type: 'insufficient_comments',
                severity: 'low',
                description: '注释覆盖率过低',
                ratio: commentRatio
            });
        }

        // 检查TODO/FIXME标记
        const todoCount = (sourceCode.match(/TODO|FIXME|XXX/gi) || []).length;
        if (todoCount > 0) {
            issues.push({
                type: 'unfinished_code',
                severity: 'medium',
                description: `发现 ${todoCount} 个未完成的代码标记`,
                count: todoCount
            });
        }

        return issues;
    }

    /**
     * 计算代码复杂度
     * @param {string} sourceCode - 源码
     * @returns {Object} 复杂度指标
     */
    calculateComplexity(sourceCode) {
        const lines = sourceCode.split('\n');
        const nonEmptyLines = lines.filter(line => line.trim().length > 0).length;
        const functions = this.extractFunctions(sourceCode);
        
        // 圈复杂度估算
        const cyclomaticComplexity = this.estimateCyclomaticComplexity(sourceCode);
        
        return {
            linesOfCode: lines.length,
            nonEmptyLines,
            functionCount: functions.length,
            cyclomaticComplexity,
            averageFunctionLength: functions.length > 0 ? nonEmptyLines / functions.length : 0,
            complexity: this.classifyComplexity(cyclomaticComplexity, nonEmptyLines)
        };
    }

    /**
     * 分析依赖关系
     * @param {string} sourceCode - 源码
     * @returns {Array} 依赖列表
     */
    analyzeDependencies(sourceCode) {
        const dependencies = [];
        
        // 检查import语句
        const importMatches = sourceCode.match(/import\s+.*?from\s+["']([^"']+)["']/gi);
        if (importMatches) {
            for (const match of importMatches) {
                const pathMatch = match.match(/["']([^"']+)["']/);
                if (pathMatch) {
                    dependencies.push({
                        type: 'import',
                        path: pathMatch[1],
                        trusted: this.evaluateDependencyTrust(pathMatch[1])
                    });
                }
            }
        }

        // 检查继承
        const inheritanceMatches = sourceCode.match(/contract\s+\w+\s+is\s+([\w\s,]+)/gi);
        if (inheritanceMatches) {
            for (const match of inheritanceMatches) {
                const contracts = match.replace(/contract\s+\w+\s+is\s+/i, '').split(',');
                for (const contract of contracts) {
                    dependencies.push({
                        type: 'inheritance',
                        contract: contract.trim(),
                        trusted: this.evaluateContractTrust(contract.trim())
                    });
                }
            }
        }

        return dependencies;
    }

    /**
     * 计算总体得分
     * @param {Array} vulnerabilities - 漏洞列表
     * @param {Array} qualityIssues - 质量问题列表
     * @param {Object} complexity - 复杂度信息
     * @returns {number} 0-1之间的得分
     */
    calculateOverallScore(vulnerabilities, qualityIssues, complexity) {
        let score = 1.0;

        // 根据漏洞严重程度扣分
        for (const vuln of vulnerabilities) {
            switch (vuln.severity) {
                case 'critical':
                    score -= 0.4;
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

        // 根据质量问题扣分
        for (const issue of qualityIssues) {
            switch (issue.severity) {
                case 'high':
                    score -= 0.1;
                    break;
                case 'medium':
                    score -= 0.05;
                    break;
                case 'low':
                    score -= 0.02;
                    break;
            }
        }

        // 根据复杂度调整
        if (complexity.complexity === 'high') {
            score -= 0.1;
        } else if (complexity.complexity === 'very_high') {
            score -= 0.2;
        }

        return Math.max(0, Math.min(1, score));
    }

    /**
     * 检查重入攻击漏洞
     * @param {string} sourceCode - 源码
     * @returns {boolean} 是否存在重入风险
     */
    checkReentrancyVulnerability(sourceCode) {
        // 简化的重入检测：查找外部调用后的状态变更
        const externalCallPattern = /\.call\s*\(|\.send\s*\(|\.transfer\s*\(/gi;
        const stateChangePattern = /\w+\s*=|balance\s*\[|balances\s*\[/gi;
        
        const externalCalls = sourceCode.match(externalCallPattern);
        const stateChanges = sourceCode.match(stateChangePattern);
        
        return externalCalls && stateChanges && externalCalls.length > 0 && stateChanges.length > 0;
    }

    /**
     * 提取函数信息
     * @param {string} sourceCode - 源码
     * @returns {Array} 函数列表
     */
    extractFunctions(sourceCode) {
        const functions = [];
        const lines = sourceCode.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const functionMatch = line.match(/function\s+(\w+)/);
            
            if (functionMatch) {
                const functionName = functionMatch[1];
                let lineCount = 1;
                let braceCount = 0;
                let started = false;
                
                // 计算函数行数
                for (let j = i; j < lines.length; j++) {
                    const currentLine = lines[j];
                    
                    if (currentLine.includes('{')) {
                        braceCount += (currentLine.match(/\{/g) || []).length;
                        started = true;
                    }
                    if (currentLine.includes('}')) {
                        braceCount -= (currentLine.match(/\}/g) || []).length;
                    }
                    
                    if (started) {
                        lineCount++;
                        if (braceCount === 0) break;
                    }
                }
                
                functions.push({
                    name: functionName,
                    startLine: i + 1,
                    lineCount
                });
            }
        }
        
        return functions;
    }

    /**
     * 计算注释覆盖率
     * @param {string} sourceCode - 源码
     * @returns {number} 注释覆盖率
     */
    calculateCommentRatio(sourceCode) {
        const lines = sourceCode.split('\n');
        const commentLines = lines.filter(line => 
            line.trim().startsWith('//') || 
            line.trim().startsWith('/*') || 
            line.trim().startsWith('*')
        ).length;
        
        return lines.length > 0 ? commentLines / lines.length : 0;
    }

    /**
     * 估算圈复杂度
     * @param {string} sourceCode - 源码
     * @returns {number} 圈复杂度
     */
    estimateCyclomaticComplexity(sourceCode) {
        const decisionPoints = [
            /if\s*\(/gi,
            /else\s+if\s*\(/gi,
            /while\s*\(/gi,
            /for\s*\(/gi,
            /switch\s*\(/gi,
            /case\s+/gi,
            /catch\s*\(/gi,
            /\?\s*:/gi  // 三元操作符
        ];
        
        let complexity = 1; // 基础复杂度
        
        for (const pattern of decisionPoints) {
            const matches = sourceCode.match(pattern);
            if (matches) {
                complexity += matches.length;
            }
        }
        
        return complexity;
    }

    /**
     * 分类复杂度等级
     * @param {number} cyclomaticComplexity - 圈复杂度
     * @param {number} linesOfCode - 代码行数
     * @returns {string} 复杂度等级
     */
    classifyComplexity(cyclomaticComplexity, linesOfCode) {
        if (cyclomaticComplexity > 20 || linesOfCode > 1000) return 'very_high';
        if (cyclomaticComplexity > 10 || linesOfCode > 500) return 'high';
        if (cyclomaticComplexity > 5 || linesOfCode > 200) return 'medium';
        return 'low';
    }

    /**
     * 评估依赖可信度
     * @param {string} dependencyPath - 依赖路径
     * @returns {number} 可信度得分
     */
    evaluateDependencyTrust(dependencyPath) {
        if (dependencyPath.includes('openzeppelin')) return 0.9;
        if (dependencyPath.includes('@openzeppelin')) return 0.9;
        if (dependencyPath.startsWith('./') || dependencyPath.startsWith('../')) return 0.7;
        return 0.5;
    }

    /**
     * 评估合约可信度
     * @param {string} contractName - 合约名称
     * @returns {number} 可信度得分
     */
    evaluateContractTrust(contractName) {
        const trustedContracts = ['Ownable', 'ERC20', 'ERC721', 'ReentrancyGuard', 'Pausable'];
        return trustedContracts.includes(contractName) ? 0.9 : 0.6;
    }

    /**
     * 计算漏洞置信度
     * @param {string} vulnType - 漏洞类型
     * @param {Array} matches - 匹配结果
     * @param {string} sourceCode - 源码
     * @returns {number} 置信度
     */
    calculateVulnerabilityConfidence(vulnType, matches, sourceCode) {
        // 基于匹配数量和上下文计算置信度
        let confidence = Math.min(0.9, 0.3 + matches.length * 0.1);
        
        // 特殊调整
        if (vulnType === 'reentrancy' && sourceCode.includes('ReentrancyGuard')) {
            confidence *= 0.3; // 如果使用了防护，降低置信度
        }
        
        return confidence;
    }

    /**
     * 生成建议
     * @param {Array} vulnerabilities - 漏洞列表
     * @param {Array} qualityIssues - 质量问题列表
     * @returns {Array} 建议列表
     */
    generateRecommendations(vulnerabilities, qualityIssues) {
        const recommendations = [];
        
        // 基于漏洞的建议
        for (const vuln of vulnerabilities) {
            switch (vuln.type) {
                case 'reentrancy':
                    recommendations.push('使用ReentrancyGuard或检查-效果-交互模式防止重入攻击');
                    break;
                case 'integerOverflow':
                    recommendations.push('使用SafeMath库或Solidity 0.8+的内置溢出检查');
                    break;
                case 'txOrigin':
                    recommendations.push('使用msg.sender而不是tx.origin进行身份验证');
                    break;
            }
        }
        
        // 基于质量问题的建议
        for (const issue of qualityIssues) {
            switch (issue.type) {
                case 'function_too_long':
                    recommendations.push('将长函数拆分为更小的函数以提高可读性');
                    break;
                case 'insufficient_comments':
                    recommendations.push('增加代码注释以提高可维护性');
                    break;
            }
        }
        
        return [...new Set(recommendations)]; // 去重
    }

    /**
     * 生成分析摘要
     * @param {number} score - 总体得分
     * @param {Array} vulnerabilities - 漏洞列表
     * @param {Array} qualityIssues - 质量问题列表
     * @returns {string} 摘要
     */
    generateSummary(score, vulnerabilities, qualityIssues) {
        const criticalVulns = vulnerabilities.filter(v => v.severity === 'critical').length;
        const highVulns = vulnerabilities.filter(v => v.severity === 'high').length;
        
        let summary = `静态分析得分: ${(score * 100).toFixed(1)}%`;
        
        if (criticalVulns > 0) {
            summary += `, 发现 ${criticalVulns} 个严重安全问题`;
        }
        if (highVulns > 0) {
            summary += `, 发现 ${highVulns} 个高风险问题`;
        }
        
        summary += `, 共 ${qualityIssues.length} 个代码质量问题`;
        
        return summary;
    }

    /**
     * 获取默认分析结果
     * @param {string} error - 错误信息
     * @returns {Object} 默认结果
     */
    getDefaultAnalysisResult(error) {
        return {
            score: 0.5,
            vulnerabilities: [],
            qualityIssues: [],
            complexity: {
                linesOfCode: 0,
                functionCount: 0,
                cyclomaticComplexity: 0,
                complexity: 'unknown'
            },
            dependencies: [],
            recommendations: ['无法进行静态分析，建议手动审查代码'],
            summary: `静态分析失败: ${error}`
        };
    }
}

module.exports = new StaticAnalysisService();