package com.contractguard.security.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 分析结果响应 - 改进版
 * 包含四个维度：代码漏洞、设计缺陷、业务逻辑对比、Gas消耗
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnalysisResult {

    private boolean success;
    private String projectName;
    private String analysisTime;

    // ============ 四个核心分析维度 ============

    // 1. 代码漏洞分析
    private CodeVulnerabilityAnalysis codeVulnerabilityAnalysis;

    // 2. 设计缺陷分析（新增）
    private DesignFlawAnalysis designFlawAnalysis;

    // 3. 业务逻辑对比分析
    private BusinessLogicAnalysis businessLogicAnalysis;

    // 4. Gas消耗分析
    private GasAnalysis gasAnalysis;

    // ============ 修复方案（统一的）============
    private List<FixSolution> fixSolutions;

    // ============ 综合评估 ============
    private OverallAssessment overallAssessment;

    // ============================================================
    // 1. 代码漏洞分析
    // ============================================================

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CodeVulnerabilityAnalysis {
        private VulnerabilitySummary summary;
        private List<CodeVulnerability> vulnerabilities;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VulnerabilitySummary {
        private int total;
        private int critical;
        private int high;
        private int medium;
        private int low;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CodeVulnerability {
        private String id;
        private String severity; // CRITICAL, HIGH, MEDIUM, LOW
        private String category; // 重入攻击、整数溢出、权限控制等
        private String title;
        private String description;
        private Location location;
        private String impact;
        private String exploitScenario;
        private String affectedCode;
        private List<String> references; // CWE、SWC等参考
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Location {
        private String contractFile;
        private Integer lineNumber;
        private String function;
    }

    // ============================================================
    // 2. 设计缺陷分析（新增）
    // ============================================================

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DesignFlawAnalysis {
        private DesignSummary summary;
        private List<DesignFlaw> flaws;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DesignSummary {
        private int total;
        private int architectural; // 架构问题
        private int upgradeability; // 升级机制
        private int emergencyControl; // 紧急控制
        private int eventLogging; // 事件日志
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DesignFlaw {
        private String id;
        private String severity;
        private String category; // ARCHITECTURE, UPGRADE, EMERGENCY, LOGGING, ACCESS_CONTROL
        private String title;
        private String description;
        private String currentDesign; // 当前设计
        private String recommendedDesign; // 推荐设计
        private String designImpact;
        private List<String> affectedContracts;
        private List<String> bestPractices; // 最佳实践参考
    }

    // ============================================================
    // 3. 业务逻辑对比分析
    // ============================================================

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BusinessLogicAnalysis {
        private BusinessSummary summary;
        private List<BusinessLogicIssue> issues;
        private List<MissingFeature> missingFeatures;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BusinessSummary {
        private int totalIssues;
        private int logicMismatches; // 逻辑不匹配
        private int missingFeatures; // 缺失功能
        private int implementationGaps; // 实现差距
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BusinessLogicIssue {
        private String id;
        private String severity;
        private String category; // LOGIC_MISMATCH, INCOMPLETE_IMPLEMENTATION
        private String title;
        private String description;
        private String expectedBehavior; // 预期行为
        private String actualImplementation; // 实际实现
        private String discrepancy; // 差异说明
        private String businessImpact;
        private List<String> affectedFunctions;
        private List<String> examples;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MissingFeature {
        private String id;
        private String priority; // CRITICAL, HIGH, MEDIUM, LOW
        private String featureName;
        private String description;
        private String whyNeeded;
        private String suggestedImplementation;
        private List<String> relatedRequirements;
    }

    // ============================================================
    // 4. Gas消耗分析
    // ============================================================

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GasAnalysis {
        private GasReport currentGasReport; // 当前Gas消耗
        private List<GasOptimization> optimizations; // 优化建议
        private GasOptimizationSummary summary;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GasReport {
        private long totalEstimatedGas;
        private String averageGasPrice; // Gwei
        private String estimatedCostETH;
        private String estimatedCostUSD;
        private List<GasConsumption> highGasFunctions;
        private String analysis;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GasConsumption {
        private String contractFile;
        private String functionName;
        private long estimatedGas;
        private String gasLevel; // HIGH, MEDIUM, LOW
        private String costETH;
        private String explanation;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GasOptimization {
        private String id;
        private String priority; // HIGH, MEDIUM, LOW
        private String category; // STORAGE, LOOP, VISIBILITY, DATA_TYPE, LOGIC
        private String title;
        private String description;
        private OptimizationLocation location;
        private GasComparison gasComparison;
        private Implementation implementation;
        private String explanation;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OptimizationLocation {
        private String contractFile;
        private String function;
        private Integer lineNumber;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GasComparison {
        private long currentGas;
        private long optimizedGas;
        private long savings;
        private String savingsPercentage;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Implementation {
        private String beforeCode;
        private String afterCode;
        private String changeDescription;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GasOptimizationSummary {
        private int totalOptimizations;
        private long totalPotentialSavings;
        private String estimatedSavingsPercentage;
        private String potentialCostReduction;
    }

    // ============================================================
    // 修复方案（统一的，适用于所有问题）
    // ============================================================

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FixSolution {
        private String id;
        private String issueId; // 对应的问题ID
        private String issueType; // CODE_VULNERABILITY, DESIGN_FLAW, BUSINESS_LOGIC, GAS_OPTIMIZATION
        private String priority; // URGENT, HIGH, MEDIUM, LOW
        private String solutionTitle;
        private String solutionDescription;
        private List<String> implementationSteps;
        private List<CodeChange> codeChanges;
        private String estimatedEffort; // e.g., "2-4 hours"
        private String complexity; // SIMPLE, MODERATE, COMPLEX
        private String testingAdvice;
        private List<String> prerequisites;
        private List<String> securityConsiderations;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CodeChange {
        private String file;
        private String function;
        private Integer lineNumber;
        private String beforeCode;
        private String afterCode;
        private String explanation;
        private String changeType; // ADD, MODIFY, DELETE
    }

    // ============================================================
    // 综合评估
    // ============================================================

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OverallAssessment {
        private Integer overallScore; // 0-100
        private String riskLevel; // CRITICAL, HIGH, MEDIUM, LOW, SAFE
        private ScoreBreakdown scoreBreakdown;
        private String aiInsights;
        private List<String> keyFindings;
        private List<String> priorityRecommendations;
        private String conclusionSummary;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ScoreBreakdown {
        private Integer securityScore; // 代码安全评分
        private Integer designScore; // 设计质量评分
        private Integer businessScore; // 业务符合度评分
        private Integer gasScore; // Gas效率评分
    }
}