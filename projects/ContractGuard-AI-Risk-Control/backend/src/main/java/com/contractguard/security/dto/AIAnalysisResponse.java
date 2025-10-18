package com.contractguard.security.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * AI分析响应 - 四维度完整版
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AIAnalysisResponse {

    // 1. 代码漏洞
    private List<CodeVulnerability> codeVulnerabilities;

    // 2. 设计缺陷 (新增)
    private List<DesignFlaw> designFlaws;

    // 3. 业务逻辑漏洞
    private List<BusinessVulnerability> businessVulnerabilities;

    // 4. Gas优化建议
    private List<GasOptimization> gasOptimizations;

    // AI综合洞察
    private String insights;

    // 综合评分
    private Integer overallScore;

    // ============================================================
    // 1. 代码漏洞
    // ============================================================
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CodeVulnerability {
        private String severity;
        private String category;
        private String title;
        private String description;
        private String contractFile;
        private String function;
        private String impact;
        private String exploitScenario;
        private String affectedCode;
    }

    // ============================================================
    // 2. 设计缺陷 (新增)
    // ============================================================
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DesignFlaw {
        private String severity; // CRITICAL, HIGH, MEDIUM, LOW
        private String category; // 架构设计、升级机制、紧急控制、事件日志、访问控制
        private String title;
        private String description;
        private String currentDesign; // 当前设计
        private String recommendedDesign; // 推荐设计
        private String designImpact; // 设计影响
        private List<String> affectedContracts; // 受影响的合约
    }

    // ============================================================
    // 3. 业务逻辑漏洞
    // ============================================================
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BusinessVulnerability {
        private String severity;
        private String category;
        private String title;
        private String description;
        private String expectedLogic;
        private String actualLogic;
        private String riskDescription;
        private String businessImpact;
        private List<String> examples;
    }

    // ============================================================
    // 4. Gas优化
    // ============================================================
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GasOptimization {
        private String priority;
        private String category;
        private String title;
        private String description;
        private String contractFile;
        private String function;
        private String beforeCode;
        private String afterCode;
        private String explanation;
        private Integer estimatedSavings;
    }
}