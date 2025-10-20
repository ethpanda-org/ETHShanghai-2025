const logger = require('../utils/logger');

/**
 * 依赖可信度评估服务
 * 分析智能合约使用的库和依赖的安全性和可信度
 */
class DependencyTrustService {
    constructor() {
        // 可信库的评分数据库
        this.trustedLibraries = {
            // OpenZeppelin 系列 - 高可信度
            '@openzeppelin/contracts': { score: 0.95, category: 'security', description: 'OpenZeppelin官方安全库' },
            '@openzeppelin/contracts-upgradeable': { score: 0.93, category: 'security', description: 'OpenZeppelin可升级合约库' },
            '@openzeppelin/contracts-ethereum-package': { score: 0.90, category: 'security', description: 'OpenZeppelin以太坊包' },
            
            // 其他知名库
            'solmate': { score: 0.85, category: 'optimization', description: 'Solmate优化库' },
            'ds-math': { score: 0.80, category: 'math', description: 'DappHub数学库' },
            'prb-math': { score: 0.82, category: 'math', description: 'PRB数学库' },
            'chainlink': { score: 0.88, category: 'oracle', description: 'Chainlink预言机库' },
            'uniswap-v2-core': { score: 0.85, category: 'defi', description: 'Uniswap V2核心库' },
            'uniswap-v3-core': { score: 0.87, category: 'defi', description: 'Uniswap V3核心库' },
            
            // 中等可信度库
            'hardhat': { score: 0.75, category: 'development', description: 'Hardhat开发框架' },
            'truffle': { score: 0.70, category: 'development', description: 'Truffle开发框架' },
            
            // 低可信度或未知库
            'unknown': { score: 0.3, category: 'unknown', description: '未知或未验证的库' }
        };

        // 依赖风险模式
        this.riskPatterns = {
            outdatedVersion: {
                severity: 'medium',
                description: '使用过时版本的库',
                scoreImpact: -0.2
            },
            unverifiedSource: {
                severity: 'high',
                description: '使用未验证来源的库',
                scoreImpact: -0.4
            },
            tooManyDependencies: {
                threshold: 10,
                severity: 'medium',
                description: '依赖过多的外部库',
                scoreImpact: -0.1
            },
            circularDependency: {
                severity: 'high',
                description: '存在循环依赖',
                scoreImpact: -0.3
            },
            deprecatedLibrary: {
                severity: 'high',
                description: '使用已弃用的库',
                scoreImpact: -0.5
            }
        };

        // 版本模式匹配
        this.versionPatterns = {
            stable: /^\d+\.\d+\.\d+$/,
            prerelease: /^\d+\.\d+\.\d+-(alpha|beta|rc)/,
            development: /^\d+\.\d+\.\d+-(dev|snapshot)/
        };
    }

    /**
     * 评估合约依赖可信度
     * @param {string} contractCode - 合约源码
     * @param {Object} packageInfo - 包信息（如package.json内容）
     * @param {Object} options - 评估选项
     * @returns {Promise<Object>} 依赖可信度评估结果
     */
    async evaluateDependencyTrust(contractCode, packageInfo = null, options = {}) {
        try {
            const {
                includeDevDependencies = false,
                strictMode = false,
                customTrustRules = {}
            } = options;

            // 合并自定义信任规则
            const trustRules = { ...this.trustedLibraries, ...customTrustRules };

            // 分析导入的依赖
            const importAnalysis = this.analyzeImports(contractCode);
            
            // 分析包依赖（如果提供了package.json）
            const packageAnalysis = packageInfo ? 
                this.analyzePackageDependencies(packageInfo, includeDevDependencies) : null;

            // 检测依赖风险
            const riskAnalysis = this.analyzeRisks(importAnalysis, packageAnalysis);

            // 计算可信度得分
            const trustScore = this.calculateTrustScore(
                importAnalysis, 
                packageAnalysis, 
                riskAnalysis, 
                trustRules,
                strictMode
            );

            // 生成建议
            const recommendations = this.generateTrustRecommendations(
                importAnalysis, 
                riskAnalysis, 
                trustScore
            );

            return {
                score: trustScore,
                analysisDate: new Date().toISOString(),
                dependencies: {
                    imports: importAnalysis,
                    packages: packageAnalysis,
                    totalCount: importAnalysis.dependencies.length + 
                               (packageAnalysis ? packageAnalysis.dependencies.length : 0)
                },
                risks: riskAnalysis,
                trustBreakdown: this.generateTrustBreakdown(importAnalysis, trustRules),
                recommendations,
                summary: this.generateTrustSummary(trustScore, importAnalysis, riskAnalysis)
            };

        } catch (error) {
            logger.error('依赖可信度评估失败:', error);
            return this.getDefaultTrustResult(error.message);
        }
    }

    /**
     * 分析合约中的导入语句
     * @param {string} contractCode - 合约源码
     * @returns {Object} 导入分析结果
     */
    analyzeImports(contractCode) {
        const dependencies = [];
        const importPatterns = [
            // Solidity import patterns
            /import\s+["']([^"']+)["']/g,
            /import\s+\{[^}]+\}\s+from\s+["']([^"']+)["']/g,
            /import\s+\*\s+as\s+\w+\s+from\s+["']([^"']+)["']/g,
            /import\s+(\w+)\s+from\s+["']([^"']+)["']/g
        ];

        // 提取所有导入
        importPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(contractCode)) !== null) {
                const importPath = match[1] || match[2];
                if (importPath && !dependencies.some(dep => dep.path === importPath)) {
                    dependencies.push({
                        path: importPath,
                        type: this.classifyImportType(importPath),
                        isLocal: this.isLocalImport(importPath),
                        library: this.extractLibraryName(importPath),
                        version: this.extractVersionFromPath(importPath)
                    });
                }
            }
        });

        // 分析继承关系
        const inheritance = this.analyzeInheritance(contractCode);

        return {
            dependencies,
            inheritance,
            localImports: dependencies.filter(dep => dep.isLocal).length,
            externalImports: dependencies.filter(dep => !dep.isLocal).length,
            libraryDistribution: this.calculateLibraryDistribution(dependencies)
        };
    }

    /**
     * 分析包依赖（package.json）
     * @param {Object} packageInfo - 包信息
     * @param {boolean} includeDevDependencies - 是否包含开发依赖
     * @returns {Object} 包依赖分析结果
     */
    analyzePackageDependencies(packageInfo, includeDevDependencies) {
        const dependencies = [];
        
        // 分析生产依赖
        if (packageInfo.dependencies) {
            Object.entries(packageInfo.dependencies).forEach(([name, version]) => {
                dependencies.push({
                    name,
                    version,
                    type: 'production',
                    versionType: this.classifyVersion(version),
                    isOutdated: this.checkIfOutdated(name, version)
                });
            });
        }

        // 分析开发依赖
        if (includeDevDependencies && packageInfo.devDependencies) {
            Object.entries(packageInfo.devDependencies).forEach(([name, version]) => {
                dependencies.push({
                    name,
                    version,
                    type: 'development',
                    versionType: this.classifyVersion(version),
                    isOutdated: this.checkIfOutdated(name, version)
                });
            });
        }

        return {
            dependencies,
            productionCount: dependencies.filter(dep => dep.type === 'production').length,
            developmentCount: dependencies.filter(dep => dep.type === 'development').length,
            outdatedCount: dependencies.filter(dep => dep.isOutdated).length,
            versionDistribution: this.calculateVersionDistribution(dependencies)
        };
    }

    /**
     * 分析依赖风险
     * @param {Object} importAnalysis - 导入分析结果
     * @param {Object} packageAnalysis - 包分析结果
     * @returns {Object} 风险分析结果
     */
    analyzeRisks(importAnalysis, packageAnalysis) {
        const risks = [];

        // 检查过多依赖
        const totalDependencies = importAnalysis.dependencies.length + 
                                 (packageAnalysis ? packageAnalysis.dependencies.length : 0);
        
        if (totalDependencies > this.riskPatterns.tooManyDependencies.threshold) {
            risks.push({
                type: 'tooManyDependencies',
                severity: this.riskPatterns.tooManyDependencies.severity,
                description: `依赖数量过多 (${totalDependencies})`,
                impact: this.riskPatterns.tooManyDependencies.scoreImpact
            });
        }

        // 检查未知库
        const unknownLibraries = importAnalysis.dependencies.filter(dep => 
            !dep.isLocal && !this.trustedLibraries[dep.library]
        );

        unknownLibraries.forEach(dep => {
            risks.push({
                type: 'unverifiedSource',
                severity: this.riskPatterns.unverifiedSource.severity,
                description: `使用未验证的库: ${dep.library}`,
                impact: this.riskPatterns.unverifiedSource.scoreImpact,
                dependency: dep
            });
        });

        // 检查过时版本
        if (packageAnalysis) {
            const outdatedDeps = packageAnalysis.dependencies.filter(dep => dep.isOutdated);
            outdatedDeps.forEach(dep => {
                risks.push({
                    type: 'outdatedVersion',
                    severity: this.riskPatterns.outdatedVersion.severity,
                    description: `使用过时版本: ${dep.name}@${dep.version}`,
                    impact: this.riskPatterns.outdatedVersion.scoreImpact,
                    dependency: dep
                });
            });
        }

        // 检查循环依赖（简化检查）
        const circularRisk = this.detectCircularDependencies(importAnalysis);
        if (circularRisk) {
            risks.push(circularRisk);
        }

        return {
            risks,
            riskCount: risks.length,
            highRiskCount: risks.filter(risk => risk.severity === 'high').length,
            mediumRiskCount: risks.filter(risk => risk.severity === 'medium').length,
            totalImpact: risks.reduce((sum, risk) => sum + Math.abs(risk.impact), 0)
        };
    }

    /**
     * 计算依赖可信度得分
     * @param {Object} importAnalysis - 导入分析
     * @param {Object} packageAnalysis - 包分析
     * @param {Object} riskAnalysis - 风险分析
     * @param {Object} trustRules - 信任规则
     * @param {boolean} strictMode - 严格模式
     * @returns {number} 0-1之间的得分
     */
    calculateTrustScore(importAnalysis, packageAnalysis, riskAnalysis, trustRules, strictMode) {
        let baseScore = 0.8; // 基础得分

        // 根据库的可信度调整得分
        const libraryScores = importAnalysis.dependencies
            .filter(dep => !dep.isLocal)
            .map(dep => {
                const libraryInfo = trustRules[dep.library] || trustRules['unknown'];
                return libraryInfo.score;
            });

        if (libraryScores.length > 0) {
            const averageLibraryScore = libraryScores.reduce((sum, score) => sum + score, 0) / libraryScores.length;
            baseScore = (baseScore + averageLibraryScore) / 2;
        }

        // 根据风险扣分
        let riskPenalty = 0;
        riskAnalysis.risks.forEach(risk => {
            riskPenalty += Math.abs(risk.impact);
        });

        // 严格模式下加重惩罚
        if (strictMode) {
            riskPenalty *= 1.5;
        }

        // 计算最终得分
        const finalScore = Math.max(0.1, Math.min(1, baseScore - riskPenalty));

        return Math.round(finalScore * 100) / 100;
    }

    /**
     * 辅助方法 - 分类导入类型
     */
    classifyImportType(importPath) {
        if (importPath.startsWith('@openzeppelin')) return 'security';
        if (importPath.includes('math')) return 'math';
        if (importPath.includes('token') || importPath.includes('erc')) return 'token';
        if (importPath.includes('access')) return 'access';
        if (importPath.includes('utils')) return 'utility';
        return 'other';
    }

    /**
     * 辅助方法 - 判断是否为本地导入
     */
    isLocalImport(importPath) {
        return importPath.startsWith('./') || importPath.startsWith('../') || 
               (!importPath.startsWith('@') && !importPath.includes('/'));
    }

    /**
     * 辅助方法 - 提取库名
     */
    extractLibraryName(importPath) {
        if (importPath.startsWith('@')) {
            const parts = importPath.split('/');
            return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : parts[0];
        }
        return importPath.split('/')[0];
    }

    /**
     * 辅助方法 - 从路径提取版本
     */
    extractVersionFromPath(importPath) {
        const versionMatch = importPath.match(/v(\d+)/);
        return versionMatch ? versionMatch[1] : null;
    }

    /**
     * 辅助方法 - 分析继承关系
     */
    analyzeInheritance(contractCode) {
        const inheritancePattern = /contract\s+\w+\s+is\s+([^{]+)/g;
        const inheritance = [];
        let match;

        while ((match = inheritancePattern.exec(contractCode)) !== null) {
            const parents = match[1].split(',').map(parent => parent.trim());
            inheritance.push(...parents);
        }

        return inheritance;
    }

    /**
     * 辅助方法 - 计算库分布
     */
    calculateLibraryDistribution(dependencies) {
        const distribution = {};
        dependencies.forEach(dep => {
            if (!dep.isLocal) {
                distribution[dep.library] = (distribution[dep.library] || 0) + 1;
            }
        });
        return distribution;
    }

    /**
     * 辅助方法 - 分类版本类型
     */
    classifyVersion(version) {
        if (this.versionPatterns.stable.test(version)) return 'stable';
        if (this.versionPatterns.prerelease.test(version)) return 'prerelease';
        if (this.versionPatterns.development.test(version)) return 'development';
        return 'other';
    }

    /**
     * 辅助方法 - 检查是否过时
     */
    checkIfOutdated(name, version) {
        // 简化实现，实际应该查询npm registry
        const majorVersion = parseInt(version.replace(/[^\d]/g, ''));
        
        // 一些常见库的"过时"判断
        const outdatedThresholds = {
            '@openzeppelin/contracts': 4,
            'hardhat': 2,
            'truffle': 5
        };

        const threshold = outdatedThresholds[name];
        return threshold ? majorVersion < threshold : false;
    }

    /**
     * 辅助方法 - 计算版本分布
     */
    calculateVersionDistribution(dependencies) {
        const distribution = { stable: 0, prerelease: 0, development: 0, other: 0 };
        dependencies.forEach(dep => {
            distribution[dep.versionType]++;
        });
        return distribution;
    }

    /**
     * 辅助方法 - 检测循环依赖
     */
    detectCircularDependencies(importAnalysis) {
        // 简化的循环依赖检测
        const localImports = importAnalysis.dependencies.filter(dep => dep.isLocal);
        
        // 如果本地导入过多，可能存在循环依赖风险
        if (localImports.length > 5) {
            return {
                type: 'circularDependency',
                severity: this.riskPatterns.circularDependency.severity,
                description: '可能存在循环依赖风险',
                impact: this.riskPatterns.circularDependency.scoreImpact
            };
        }
        
        return null;
    }

    /**
     * 生成信任度分解
     */
    generateTrustBreakdown(importAnalysis, trustRules) {
        const breakdown = {};
        
        importAnalysis.dependencies
            .filter(dep => !dep.isLocal)
            .forEach(dep => {
                const libraryInfo = trustRules[dep.library] || trustRules['unknown'];
                breakdown[dep.library] = {
                    score: libraryInfo.score,
                    category: libraryInfo.category,
                    description: libraryInfo.description
                };
            });

        return breakdown;
    }

    /**
     * 生成信任建议
     */
    generateTrustRecommendations(importAnalysis, riskAnalysis, trustScore) {
        const recommendations = [];

        if (trustScore < 0.6) {
            recommendations.push('整体依赖可信度较低，建议审查所有外部依赖');
        }

        if (riskAnalysis.highRiskCount > 0) {
            recommendations.push('发现高风险依赖，建议立即处理');
        }

        const unknownLibs = importAnalysis.dependencies.filter(dep => 
            !dep.isLocal && !this.trustedLibraries[dep.library]
        );

        if (unknownLibs.length > 0) {
            recommendations.push(`建议验证以下未知库的安全性: ${unknownLibs.map(lib => lib.library).join(', ')}`);
        }

        if (importAnalysis.externalImports > 10) {
            recommendations.push('外部依赖过多，考虑减少不必要的依赖');
        }

        return recommendations;
    }

    /**
     * 生成信任摘要
     */
    generateTrustSummary(trustScore, importAnalysis, riskAnalysis) {
        const scorePercent = (trustScore * 100).toFixed(1);
        let summary = `依赖可信度: ${scorePercent}%`;

        if (importAnalysis.externalImports > 0) {
            summary += `, 外部依赖: ${importAnalysis.externalImports}个`;
        }

        if (riskAnalysis.riskCount > 0) {
            summary += `, 发现 ${riskAnalysis.riskCount} 个风险`;
        }

        return summary;
    }

    /**
     * 获取默认结果
     */
    getDefaultTrustResult(error) {
        return {
            score: 0.5, // 默认中等得分
            analysisDate: new Date().toISOString(),
            dependencies: { imports: { dependencies: [] }, packages: null, totalCount: 0 },
            risks: { risks: [], riskCount: 0, highRiskCount: 0, mediumRiskCount: 0, totalImpact: 0 },
            trustBreakdown: {},
            recommendations: ['无法分析依赖，建议手动检查'],
            summary: `依赖分析失败: ${error}`
        };
    }
}

module.exports = new DependencyTrustService();