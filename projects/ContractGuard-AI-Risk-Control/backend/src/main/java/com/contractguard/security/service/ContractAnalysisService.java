package com.contractguard.security.service;

import com.contractguard.security.dto.AIAnalysisResponse;
import com.contractguard.security.dto.AnalysisRequest;
import com.contractguard.security.dto.AnalysisResult;
import com.contractguard.security.service.ai.AIAnalysisStrategy;
import com.contractguard.security.service.ai.AIStrategyFactory;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * 智能合约分析服务 - 修复版本
 */
@Service
@Slf4j
public class ContractAnalysisService {

    @Autowired
    private AIStrategyFactory aiStrategyFactory;

    /**
     * 分析智能合约 - 主入口
     */
    public AnalysisResult analyzeContracts(AnalysisRequest request) {
        log.info("开始分析: {}", request.getBusinessContext().getProjectName());

        try {
            // 1. 根据请求选择AI策略
            AIAnalysisStrategy strategy = aiStrategyFactory.getStrategy(request.getAiStrategy());
            AIAnalysisResponse aiResponse = strategy.analyze(request);

            // 2. 转换AI响应为完整结果
            return buildAnalysisResult(request, aiResponse);

        } catch (Exception e) {
            log.error("分析失败", e);
            throw new RuntimeException("分析失败: " + e.getMessage());
        }
    }

    /**
     * 构建完整的分析结果 - 修复版本
     */
    private AnalysisResult buildAnalysisResult(AnalysisRequest request, AIAnalysisResponse aiResponse) {

        // ============================================================
        // 1. 转换代码漏洞分析
        // ============================================================
        List<AnalysisResult.CodeVulnerability> codeVulns = Optional.ofNullable(aiResponse.getCodeVulnerabilities())
                .orElse(Collections.emptyList())
                .stream()
                .map(v -> AnalysisResult.CodeVulnerability.builder()
                        .id(UUID.randomUUID().toString())
                        .severity(v.getSeverity())
                        .category(v.getCategory())
                        .title(v.getTitle())
                        .description(v.getDescription())
                        .location(AnalysisResult.Location.builder()
                                .contractFile(v.getContractFile())
                                .function(v.getFunction())
                                .lineNumber(1) // 默认值，实际应该从AI分析中获取
                                .build())
                        .impact(v.getImpact())
                        .exploitScenario(v.getExploitScenario())
                        .affectedCode(v.getAffectedCode())
                        .references(Arrays.asList("CWE-" + v.getCategory())) // 简单的参考链接
                        .build())
                .collect(Collectors.toList());

        // 代码漏洞摘要
        AnalysisResult.VulnerabilitySummary vulnSummary = buildVulnerabilitySummary(codeVulns);

        // ============================================================
        // 2. 转换设计缺陷分析
        // ============================================================
        List<AnalysisResult.DesignFlaw> designFlaws = Optional.ofNullable(aiResponse.getDesignFlaws())
                .orElse(Collections.emptyList())
                .stream()
                .map(flaw -> AnalysisResult.DesignFlaw.builder()
                        .id(UUID.randomUUID().toString())
                        .severity(flaw.getSeverity())
                        .category(flaw.getCategory())
                        .title(flaw.getTitle())
                        .description(flaw.getDescription())
                        .currentDesign(flaw.getCurrentDesign())
                        .recommendedDesign(flaw.getRecommendedDesign())
                        .designImpact(flaw.getDesignImpact())
                        .affectedContracts(Optional.ofNullable(flaw.getAffectedContracts())
                                .orElse(request.getContracts().stream()
                                        .map(AnalysisRequest.ContractFile::getFileName)
                                        .collect(Collectors.toList())))
                        .bestPractices(Arrays.asList("参考Solidity最佳实践", "遵循OpenZeppelin标准"))
                        .build())
                .collect(Collectors.toList());

        // 设计缺陷摘要
        AnalysisResult.DesignSummary designSummary = buildDesignSummary(designFlaws);

        // ============================================================
        // 3. 转换业务逻辑分析
        // ============================================================
        List<AnalysisResult.BusinessLogicIssue> businessIssues = Optional.ofNullable(aiResponse.getBusinessVulnerabilities())
                .orElse(Collections.emptyList())
                .stream()
                .map(v -> AnalysisResult.BusinessLogicIssue.builder()
                        .id(UUID.randomUUID().toString())
                        .severity(v.getSeverity())
                        .category(v.getCategory())
                        .title(v.getTitle())
                        .description(v.getDescription())
                        .expectedBehavior(v.getExpectedLogic()) // 字段名称映射
                        .actualImplementation(v.getActualLogic()) // 字段名称映射
                        .discrepancy(v.getRiskDescription()) // 使用风险描述作为差异说明
                        .businessImpact(v.getBusinessImpact())
                        .affectedFunctions(Collections.singletonList("需要从AI分析中提取")) // 需要AI提供
                        .examples(Optional.ofNullable(v.getExamples()).orElse(Collections.emptyList()))
                        .build())
                .collect(Collectors.toList());

        // 业务逻辑摘要
        AnalysisResult.BusinessSummary businessSummary = buildBusinessSummary(businessIssues);

        // ============================================================
        // 4. 转换Gas优化分析
        // ============================================================
        List<AnalysisResult.GasOptimization> gasOptimizations = Optional.ofNullable(aiResponse.getGasOptimizations())
                .orElse(Collections.emptyList())
                .stream()
                .map(opt -> AnalysisResult.GasOptimization.builder()
                        .id(UUID.randomUUID().toString())
                        .priority(opt.getPriority())
                        .category(opt.getCategory())
                        .title(opt.getTitle())
                        .description(opt.getDescription())
                        .location(AnalysisResult.OptimizationLocation.builder()
                                .contractFile(opt.getContractFile())
                                .function(opt.getFunction())
                                .lineNumber(1) // 默认值，应该从AI分析中获取
                                .build())
                        .gasComparison(AnalysisResult.GasComparison.builder()
                                .currentGas(estimateGas(opt.getBeforeCode()))
                                .optimizedGas(estimateGas(opt.getAfterCode()))
                                .savings(Optional.ofNullable(opt.getEstimatedSavings()).orElse(5000))
                                .savingsPercentage(calculateSavingsPercentage(opt))
                                .build())
                        .implementation(AnalysisResult.Implementation.builder()
                                .beforeCode(opt.getBeforeCode())
                                .afterCode(opt.getAfterCode())
                                .changeDescription(opt.getExplanation())
                                .build())
                        .explanation(opt.getExplanation())
                        .build())
                .collect(Collectors.toList());

        // Gas报告
        AnalysisResult.GasReport gasReport = buildGasReport(request, gasOptimizations);
        AnalysisResult.GasOptimizationSummary gasOptSummary = buildGasOptimizationSummary(gasOptimizations);

        // ============================================================
        // 5. 生成修复方案
        // ============================================================
        List<AnalysisResult.FixSolution> fixSolutions = generateFixSolutions(codeVulns, designFlaws, businessIssues, gasOptimizations);

        // ============================================================
        // 6. 综合评估
        // ============================================================
        AnalysisResult.OverallAssessment overallAssessment = buildOverallAssessment(
                codeVulns, designFlaws, businessIssues, gasOptimizations,
                Optional.ofNullable(aiResponse.getInsights()).orElse("AI分析完成"));

        // ============================================================
        // 7. 构建最终结果
        // ============================================================
        return AnalysisResult.builder()
                .success(true)
                .projectName(request.getBusinessContext().getProjectName())
                .analysisTime(LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME))

                // 四个核心分析维度
                .codeVulnerabilityAnalysis(AnalysisResult.CodeVulnerabilityAnalysis.builder()
                        .summary(vulnSummary)
                        .vulnerabilities(codeVulns)
                        .build())

                .designFlawAnalysis(AnalysisResult.DesignFlawAnalysis.builder()
                        .summary(designSummary)
                        .flaws(designFlaws)
                        .build())

                .businessLogicAnalysis(AnalysisResult.BusinessLogicAnalysis.builder()
                        .summary(businessSummary)
                        .issues(businessIssues)
                        .missingFeatures(Collections.emptyList()) // 可以后续扩展
                        .build())

                .gasAnalysis(AnalysisResult.GasAnalysis.builder()
                        .currentGasReport(gasReport)
                        .optimizations(gasOptimizations)
                        .summary(gasOptSummary)
                        .build())

                // 修复方案和综合评估
                .fixSolutions(fixSolutions)
                .overallAssessment(overallAssessment)
                .build();
    }

    /**
     * 构建漏洞摘要
     */
    private AnalysisResult.VulnerabilitySummary buildVulnerabilitySummary(List<AnalysisResult.CodeVulnerability> vulns) {
        Map<String, Long> severityCounts = vulns.stream()
                .collect(Collectors.groupingBy(AnalysisResult.CodeVulnerability::getSeverity, Collectors.counting()));

        return AnalysisResult.VulnerabilitySummary.builder()
                .total(vulns.size())
                .critical(severityCounts.getOrDefault("CRITICAL", 0L).intValue())
                .high(severityCounts.getOrDefault("HIGH", 0L).intValue())
                .medium(severityCounts.getOrDefault("MEDIUM", 0L).intValue())
                .low(severityCounts.getOrDefault("LOW", 0L).intValue())
                .build();
    }

    /**
     * 构建设计缺陷摘要
     */
    private AnalysisResult.DesignSummary buildDesignSummary(List<AnalysisResult.DesignFlaw> flaws) {
        Map<String, Long> categoryCounts = flaws.stream()
                .collect(Collectors.groupingBy(AnalysisResult.DesignFlaw::getCategory, Collectors.counting()));

        return AnalysisResult.DesignSummary.builder()
                .total(flaws.size())
                .architectural(categoryCounts.getOrDefault("ARCHITECTURE", 0L).intValue())
                .upgradeability(categoryCounts.getOrDefault("UPGRADE", 0L).intValue())
                .emergencyControl(categoryCounts.getOrDefault("EMERGENCY", 0L).intValue())
                .eventLogging(categoryCounts.getOrDefault("LOGGING", 0L).intValue())
                .build();
    }

    /**
     * 构建业务逻辑摘要
     */
    private AnalysisResult.BusinessSummary buildBusinessSummary(List<AnalysisResult.BusinessLogicIssue> issues) {
        Map<String, Long> categoryCounts = issues.stream()
                .collect(Collectors.groupingBy(AnalysisResult.BusinessLogicIssue::getCategory, Collectors.counting()));

        return AnalysisResult.BusinessSummary.builder()
                .totalIssues(issues.size())
                .logicMismatches(categoryCounts.getOrDefault("LOGIC_MISMATCH", 0L).intValue())
                .missingFeatures(categoryCounts.getOrDefault("MISSING_FEATURE", 0L).intValue())
                .implementationGaps(categoryCounts.getOrDefault("INCOMPLETE_IMPLEMENTATION", 0L).intValue())
                .build();
    }

    /**
     * 构建Gas报告
     */
    private AnalysisResult.GasReport buildGasReport(AnalysisRequest request, List<AnalysisResult.GasOptimization> opts) {
        long totalGas = opts.stream()
                .mapToLong(opt -> opt.getGasComparison().getCurrentGas())
                .sum();

        if (totalGas == 0) {
            totalGas = 52000; // 默认最小Gas消耗
        }

        List<AnalysisResult.GasConsumption> highGasFunctions = opts.stream()
                .filter(opt -> opt.getGasComparison().getCurrentGas() > 40000)
                .map(opt -> AnalysisResult.GasConsumption.builder()
                        .contractFile(opt.getLocation().getContractFile())
                        .functionName(opt.getLocation().getFunction())
                        .estimatedGas(opt.getGasComparison().getCurrentGas())
                        .gasLevel(opt.getGasComparison().getCurrentGas() > 80000 ? "HIGH" : "MEDIUM")
                        .costETH(String.format("%.6f", opt.getGasComparison().getCurrentGas() * 10 / 1000000000.0))
                        .explanation("基于代码复杂度估算")
                        .build())
                .collect(Collectors.toList());

        return AnalysisResult.GasReport.builder()
                .totalEstimatedGas(totalGas)
                .averageGasPrice("10 Gwei")
                .estimatedCostETH(String.format("%.6f", totalGas * 10 / 1000000000.0))
                .estimatedCostUSD(String.format("%.2f", totalGas * 10 / 1000000000.0 * 2000)) // 假设ETH价格2000美元
                .highGasFunctions(highGasFunctions)
                .analysis("整体Gas消耗处于" + (totalGas > 100000 ? "较高" : "中等") + "水平")
                .build();
    }

    /**
     * 构建Gas优化摘要
     */
    private AnalysisResult.GasOptimizationSummary buildGasOptimizationSummary(List<AnalysisResult.GasOptimization> opts) {
        long totalSavings = opts.stream()
                .mapToLong(opt -> opt.getGasComparison().getSavings())
                .sum();

        long totalCurrentGas = opts.stream()
                .mapToLong(opt -> opt.getGasComparison().getCurrentGas())
                .sum();

        String savingsPercentage = totalCurrentGas > 0 ?
                String.format("%.1f%%", totalSavings * 100.0 / totalCurrentGas) : "0%";

        return AnalysisResult.GasOptimizationSummary.builder()
                .totalOptimizations(opts.size())
                .totalPotentialSavings(totalSavings)
                .estimatedSavingsPercentage(savingsPercentage)
                .potentialCostReduction(String.format("%.4f ETH", totalSavings * 10 / 1000000000.0))
                .build();
    }

    /**
     * 生成修复方案
     */
    private List<AnalysisResult.FixSolution> generateFixSolutions(
            List<AnalysisResult.CodeVulnerability> codeVulns,
            List<AnalysisResult.DesignFlaw> designFlaws,
            List<AnalysisResult.BusinessLogicIssue> businessIssues,
            List<AnalysisResult.GasOptimization> gasOpts) {

        List<AnalysisResult.FixSolution> solutions = new ArrayList<>();

        // 为代码漏洞生成修复方案
        for (AnalysisResult.CodeVulnerability vuln : codeVulns) {
            solutions.add(generateCodeVulnFix(vuln));
        }

        // 为设计缺陷生成修复方案
        for (AnalysisResult.DesignFlaw flaw : designFlaws) {
            solutions.add(generateDesignFlawFix(flaw));
        }

        // 为业务逻辑问题生成修复方案
        for (AnalysisResult.BusinessLogicIssue issue : businessIssues) {
            solutions.add(generateBusinessLogicFix(issue));
        }

        // 为Gas优化生成方案（选择高优先级的）
        gasOpts.stream()
                .filter(opt -> "HIGH".equals(opt.getPriority()))
                .forEach(opt -> solutions.add(generateGasOptimizationFix(opt)));

        return solutions;
    }

    /**
     * 生成代码漏洞修复方案
     */
    private AnalysisResult.FixSolution generateCodeVulnFix(AnalysisResult.CodeVulnerability vuln) {
        return AnalysisResult.FixSolution.builder()
                .id(UUID.randomUUID().toString())
                .issueId(vuln.getId())
                .issueType("CODE_VULNERABILITY")
                .priority(mapSeverityToPriority(vuln.getSeverity()))
                .solutionTitle("修复" + vuln.getCategory() + "漏洞")
                .solutionDescription(vuln.getTitle() + " - " + vuln.getDescription())
                .implementationSteps(generateStepsForVulnerability(vuln))
                .codeChanges(Collections.singletonList(AnalysisResult.CodeChange.builder()
                        .file(vuln.getLocation().getContractFile())
                        .function(vuln.getLocation().getFunction())
                        .lineNumber(vuln.getLocation().getLineNumber())
                        .beforeCode(vuln.getAffectedCode())
                        .afterCode("// 修复后的代码 - 需要AI提供具体方案")
                        .explanation("修复说明")
                        .changeType("MODIFY")
                        .build()))
                .estimatedEffort(estimateEffort(vuln.getSeverity()))
                .complexity(mapSeverityToComplexity(vuln.getSeverity()))
                .testingAdvice("编写针对" + vuln.getCategory() + "的测试用例")
                .prerequisites(Collections.emptyList())
                .securityConsiderations(Arrays.asList("确保修复不会引入新的安全风险", "进行充分的测试"))
                .build();
    }

    /**
     * 生成设计缺陷修复方案
     */
    private AnalysisResult.FixSolution generateDesignFlawFix(AnalysisResult.DesignFlaw flaw) {
        return AnalysisResult.FixSolution.builder()
                .id(UUID.randomUUID().toString())
                .issueId(flaw.getId())
                .issueType("DESIGN_FLAW")
                .priority(mapSeverityToPriority(flaw.getSeverity()))
                .solutionTitle("改进" + flaw.getCategory() + "设计")
                .solutionDescription(flaw.getTitle() + " - " + flaw.getDescription())
                .implementationSteps(Arrays.asList(
                        "分析当前设计: " + flaw.getCurrentDesign(),
                        "实施推荐设计: " + flaw.getRecommendedDesign(),
                        "测试新设计方案",
                        "更新相关文档"
                ))
                .codeChanges(Collections.emptyList()) // 设计缺陷可能不需要直接的代码更改
                .estimatedEffort(estimateEffort(flaw.getSeverity()))
                .complexity("MODERATE")
                .testingAdvice("测试设计变更对系统的影响")
                .prerequisites(Collections.singletonList("架构设计评审"))
                .securityConsiderations(Collections.singletonList("确保设计变更符合安全最佳实践"))
                .build();
    }

    /**
     * 生成业务逻辑修复方案
     */
    private AnalysisResult.FixSolution generateBusinessLogicFix(AnalysisResult.BusinessLogicIssue issue) {
        return AnalysisResult.FixSolution.builder()
                .id(UUID.randomUUID().toString())
                .issueId(issue.getId())
                .issueType("BUSINESS_LOGIC")
                .priority(mapSeverityToPriority(issue.getSeverity()))
                .solutionTitle("修复业务逻辑不匹配")
                .solutionDescription("调整实现以符合业务预期: " + issue.getExpectedBehavior())
                .implementationSteps(Arrays.asList(
                        "重新评估业务需求",
                        "调整代码实现逻辑",
                        "编写业务测试用例",
                        "验证业务流程"
                ))
                .codeChanges(Collections.emptyList()) // 需要AI提供具体的代码变更
                .estimatedEffort(estimateEffort(issue.getSeverity()))
                .complexity("MODERATE")
                .testingAdvice("确保业务逻辑测试覆盖所有场景")
                .prerequisites(Collections.singletonList("业务需求确认"))
                .securityConsiderations(Collections.singletonList("确保业务逻辑修改不影响安全性"))
                .build();
    }

    /**
     * 生成Gas优化方案
     */
    private AnalysisResult.FixSolution generateGasOptimizationFix(AnalysisResult.GasOptimization opt) {
        return AnalysisResult.FixSolution.builder()
                .id(UUID.randomUUID().toString())
                .issueId(opt.getId())
                .issueType("GAS_OPTIMIZATION")
                .priority(opt.getPriority())
                .solutionTitle("Gas优化: " + opt.getTitle())
                .solutionDescription(opt.getDescription())
                .implementationSteps(Arrays.asList(
                        "应用优化方案",
                        "测试Gas消耗变化",
                        "验证功能正确性"
                ))
                .codeChanges(Collections.singletonList(AnalysisResult.CodeChange.builder()
                        .file(opt.getLocation().getContractFile())
                        .function(opt.getLocation().getFunction())
                        .lineNumber(opt.getLocation().getLineNumber())
                        .beforeCode(opt.getImplementation().getBeforeCode())
                        .afterCode(opt.getImplementation().getAfterCode())
                        .explanation(opt.getImplementation().getChangeDescription())
                        .changeType("MODIFY")
                        .build()))
                .estimatedEffort("30分钟")
                .complexity("SIMPLE")
                .testingAdvice("验证优化后功能无变化且Gas确实降低")
                .prerequisites(Collections.emptyList())
                .securityConsiderations(Collections.singletonList("确保优化不影响安全性"))
                .build();
    }

    /**
     * 构建综合评估
     */
    private AnalysisResult.OverallAssessment buildOverallAssessment(
            List<AnalysisResult.CodeVulnerability> codeVulns,
            List<AnalysisResult.DesignFlaw> designFlaws,
            List<AnalysisResult.BusinessLogicIssue> businessIssues,
            List<AnalysisResult.GasOptimization> gasOpts,
            String aiInsights) {

        // 计算各维度评分
        int securityScore = calculateSecurityScore(codeVulns);
        int designScore = calculateDesignScore(designFlaws);
        int businessScore = calculateBusinessScore(businessIssues);
        int gasScore = calculateGasScore(gasOpts);

        // 综合评分
        int overallScore = (securityScore + designScore + businessScore + gasScore) / 4;

        // 风险等级
        String riskLevel = determineRiskLevel(codeVulns, designFlaws, businessIssues);

        // 关键发现
        List<String> keyFindings = generateKeyFindings(codeVulns, designFlaws, businessIssues, gasOpts);

        // 优先级建议
        List<String> priorityRecommendations = generatePriorityRecommendations(codeVulns, designFlaws, businessIssues);

        return AnalysisResult.OverallAssessment.builder()
                .overallScore(overallScore)
                .riskLevel(riskLevel)
                .scoreBreakdown(AnalysisResult.ScoreBreakdown.builder()
                        .securityScore(securityScore)
                        .designScore(designScore)
                        .businessScore(businessScore)
                        .gasScore(gasScore)
                        .build())
                .aiInsights(aiInsights)
                .keyFindings(keyFindings)
                .priorityRecommendations(priorityRecommendations)
                .conclusionSummary(generateConclusionSummary(overallScore, riskLevel))
                .build();
    }

    // ============================================================
    // 辅助方法
    // ============================================================

    private String mapSeverityToPriority(String severity) {
        switch (severity) {
            case "CRITICAL": return "URGENT";
            case "HIGH": return "HIGH";
            case "MEDIUM": return "MEDIUM";
            case "LOW": return "LOW";
            default: return "MEDIUM";
        }
    }

    private String mapSeverityToComplexity(String severity) {
        switch (severity) {
            case "CRITICAL": return "COMPLEX";
            case "HIGH": return "MODERATE";
            default: return "SIMPLE";
        }
    }

    private String estimateEffort(String severity) {
        switch (severity) {
            case "CRITICAL": return "4-8小时";
            case "HIGH": return "2-4小时";
            case "MEDIUM": return "1-2小时";
            case "LOW": return "30分钟-1小时";
            default: return "1小时";
        }
    }

    private List<String> generateStepsForVulnerability(AnalysisResult.CodeVulnerability vuln) {
        if (vuln.getCategory().contains("重入")) {
            return Arrays.asList(
                    "导入OpenZeppelin的ReentrancyGuard",
                    "添加nonReentrant修饰符",
                    "调整状态更新顺序",
                    "测试重入攻击防护"
            );
        } else if (vuln.getCategory().contains("权限")) {
            return Arrays.asList(
                    "添加访问控制检查",
                    "使用OpenZeppelin的AccessControl",
                    "定义角色权限",
                    "测试权限控制"
            );
        }
        return Arrays.asList("分析漏洞", "制定修复方案", "实施修复", "测试验证");
    }

    private long estimateGas(String code) {
        if (code == null || code.isEmpty()) return 50000;

        int complexity = code.split("\n").length * 5000;
        if (code.contains("call")) complexity += 20000;
        if (code.contains("storage")) complexity += 20000;
        if (code.contains("sstore")) complexity += 20000;
        if (code.contains("loop") || code.contains("for") || code.contains("while")) complexity += 10000;

        return Math.max(21000, complexity);
    }

    private String calculateSavingsPercentage(AIAnalysisResponse.GasOptimization opt) {
        long currentGas = estimateGas(opt.getBeforeCode());
        long optimizedGas = estimateGas(opt.getAfterCode());
        if (currentGas > 0) {
            long savings = currentGas - optimizedGas;
            return String.format("%.1f%%", savings * 100.0 / currentGas);
        }
        return "0%";
    }

    private int calculateSecurityScore(List<AnalysisResult.CodeVulnerability> vulns) {
        int baseScore = 100;
        for (AnalysisResult.CodeVulnerability v : vulns) {
            switch (v.getSeverity()) {
                case "CRITICAL": baseScore -= 30; break;
                case "HIGH": baseScore -= 20; break;
                case "MEDIUM": baseScore -= 10; break;
                case "LOW": baseScore -= 5; break;
            }
        }
        return Math.max(0, baseScore);
    }

    private int calculateDesignScore(List<AnalysisResult.DesignFlaw> flaws) {
        int baseScore = 100;
        for (AnalysisResult.DesignFlaw f : flaws) {
            switch (f.getSeverity()) {
                case "CRITICAL": baseScore -= 25; break;
                case "HIGH": baseScore -= 15; break;
                case "MEDIUM": baseScore -= 8; break;
                case "LOW": baseScore -= 3; break;
            }
        }
        return Math.max(0, baseScore);
    }

    private int calculateBusinessScore(List<AnalysisResult.BusinessLogicIssue> issues) {
        int baseScore = 100;
        for (AnalysisResult.BusinessLogicIssue i : issues) {
            switch (i.getSeverity()) {
                case "CRITICAL": baseScore -= 25; break;
                case "HIGH": baseScore -= 15; break;
                case "MEDIUM": baseScore -= 8; break;
                case "LOW": baseScore -= 3; break;
            }
        }
        return Math.max(0, baseScore);
    }

    private int calculateGasScore(List<AnalysisResult.GasOptimization> opts) {
        if (opts.isEmpty()) return 85; // 无优化建议，说明Gas效率不错

        long totalSavings = opts.stream()
                .mapToLong(opt -> opt.getGasComparison().getSavings())
                .sum();

        if (totalSavings > 50000) return 60; // 大量优化空间
        if (totalSavings > 20000) return 75; // 中等优化空间
        return 85; // 少量优化空间
    }

    private String determineRiskLevel(
            List<AnalysisResult.CodeVulnerability> codeVulns,
            List<AnalysisResult.DesignFlaw> designFlaws,
            List<AnalysisResult.BusinessLogicIssue> businessIssues) {

        boolean hasCritical = codeVulns.stream().anyMatch(v -> "CRITICAL".equals(v.getSeverity())) ||
                designFlaws.stream().anyMatch(f -> "CRITICAL".equals(f.getSeverity())) ||
                businessIssues.stream().anyMatch(i -> "CRITICAL".equals(i.getSeverity()));

        if (hasCritical) return "CRITICAL";

        boolean hasHigh = codeVulns.stream().anyMatch(v -> "HIGH".equals(v.getSeverity())) ||
                designFlaws.stream().anyMatch(f -> "HIGH".equals(f.getSeverity())) ||
                businessIssues.stream().anyMatch(i -> "HIGH".equals(i.getSeverity()));

        if (hasHigh) return "HIGH";

        if (!codeVulns.isEmpty() || !designFlaws.isEmpty() || !businessIssues.isEmpty()) return "MEDIUM";

        return "SAFE";
    }

    private List<String> generateKeyFindings(
            List<AnalysisResult.CodeVulnerability> codeVulns,
            List<AnalysisResult.DesignFlaw> designFlaws,
            List<AnalysisResult.BusinessLogicIssue> businessIssues,
            List<AnalysisResult.GasOptimization> gasOpts) {

        List<String> findings = new ArrayList<>();

        // 安全发现
        if (!codeVulns.isEmpty()) {
            findings.add("发现 " + codeVulns.size() + " 个代码安全问题");
        }

        // 设计发现
        if (!designFlaws.isEmpty()) {
            findings.add("发现 " + designFlaws.size() + " 个设计缺陷");
        }

        // 业务逻辑发现
        if (!businessIssues.isEmpty()) {
            findings.add("发现 " + businessIssues.size() + " 个业务逻辑问题");
        }

        // Gas优化发现
        if (!gasOpts.isEmpty()) {
            long totalSavings = gasOpts.stream()
                    .mapToLong(opt -> opt.getGasComparison().getSavings())
                    .sum();
            findings.add("可节省约 " + totalSavings + " Gas");
        }

        if (findings.isEmpty()) {
            findings.add("未发现明显的安全问题，代码质量良好");
        }

        return findings;
    }

    private List<String> generatePriorityRecommendations(
            List<AnalysisResult.CodeVulnerability> codeVulns,
            List<AnalysisResult.DesignFlaw> designFlaws,
            List<AnalysisResult.BusinessLogicIssue> businessIssues) {

        List<String> recommendations = new ArrayList<>();

        long criticalCount = Stream.of(codeVulns, designFlaws, businessIssues)
                .flatMap(List::stream)
                .filter(item -> {
                    if (item instanceof AnalysisResult.CodeVulnerability) {
                        return "CRITICAL".equals(((AnalysisResult.CodeVulnerability) item).getSeverity());
                    } else if (item instanceof AnalysisResult.DesignFlaw) {
                        return "CRITICAL".equals(((AnalysisResult.DesignFlaw) item).getSeverity());
                    } else if (item instanceof AnalysisResult.BusinessLogicIssue) {
                        return "CRITICAL".equals(((AnalysisResult.BusinessLogicIssue) item).getSeverity());
                    }
                    return false;
                })
                .count();

        if (criticalCount > 0) {
            recommendations.add("立即修复 " + criticalCount + " 个严重问题，这是最高优先级");
        }

        if (!businessIssues.isEmpty()) {
            recommendations.add("业务逻辑与预期不符，建议优先调整");
        }

        if (!designFlaws.isEmpty()) {
            recommendations.add("改进系统设计，提升整体架构质量");
        }

        recommendations.add("完善测试用例，覆盖所有关键业务场景");
        recommendations.add("建议进行专业的安全审计");

        return recommendations;
    }

    private String generateConclusionSummary(int overallScore, String riskLevel) {
        if (overallScore >= 90) {
            return "代码质量优秀，安全性良好，建议在小幅优化后部署到生产环境。";
        } else if (overallScore >= 75) {
            return "代码质量良好，存在一些需要改进的地方，建议修复主要问题后部署。";
        } else if (overallScore >= 60) {
            return "代码存在较多问题，建议进行全面的代码审查和安全加固。";
        } else {
            return "代码存在严重的安全风险和设计缺陷，强烈建议在修复所有关键问题后再考虑部署。";
        }
    }
}