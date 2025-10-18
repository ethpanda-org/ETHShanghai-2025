package com.contractguard.security.controller;

import com.contractguard.security.dto.AnalysisRequest;
import com.contractguard.security.dto.AnalysisResult;
import com.contractguard.security.service.ContractAnalysisService;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

/**
 * 安全分析控制器
 */
@RestController
@RequestMapping("/security")
@CrossOrigin(origins = "*")
@Slf4j
public class SecurityController {

    @Autowired
    private ContractAnalysisService analysisService;

    @GetMapping("/health")
    public Map<String, String> health() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "ok");
        response.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME));
        return response;
    }

    /**
     * 提交合约分析 - 新版本
     */
    @PostMapping("/analyze")
    public AnalysisResult analyzeContract(@Valid @RequestBody AnalysisRequest request) {
        try {
            log.info("收到分析请求: projectName={}, contracts={}",
                    request.getBusinessContext().getProjectName(),
                    request.getContracts().size());

            // 调用分析服务
            AnalysisResult result = analysisService.analyzeContracts(request);

            log.info("分析完成: projectName={}, score={}",
                    result.getProjectName(),
                    result.getOverallAssessment().getOverallScore());

            return result;

        } catch (Exception e) {
            log.error("分析失败", e);
            // 返回失败结果 - 使用正确的数据结构
            return AnalysisResult.builder()
                    .success(false)
                    .projectName(request.getBusinessContext().getProjectName())
                    .analysisTime(LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME))

                    // 四个核心分析维度 - 空结果
                    .codeVulnerabilityAnalysis(AnalysisResult.CodeVulnerabilityAnalysis.builder()
                            .summary(AnalysisResult.VulnerabilitySummary.builder()
                                    .total(0).critical(0).high(0).medium(0).low(0)
                                    .build())
                            .vulnerabilities(Collections.emptyList())
                            .build())

                    .designFlawAnalysis(AnalysisResult.DesignFlawAnalysis.builder()
                            .summary(AnalysisResult.DesignSummary.builder()
                                    .total(0).architectural(0).upgradeability(0)
                                    .emergencyControl(0).eventLogging(0)
                                    .build())
                            .flaws(Collections.emptyList())
                            .build())

                    .businessLogicAnalysis(AnalysisResult.BusinessLogicAnalysis.builder()
                            .summary(AnalysisResult.BusinessSummary.builder()
                                    .totalIssues(0).logicMismatches(0)
                                    .missingFeatures(0).implementationGaps(0)
                                    .build())
                            .issues(Collections.emptyList())
                            .missingFeatures(Collections.emptyList())
                            .build())

                    .gasAnalysis(AnalysisResult.GasAnalysis.builder()
                            .currentGasReport(AnalysisResult.GasReport.builder()
                                    .totalEstimatedGas(0L)
                                    .averageGasPrice("0 Gwei")
                                    .estimatedCostETH("0")
                                    .estimatedCostUSD("0")
                                    .highGasFunctions(Collections.emptyList())
                                    .analysis("分析失败，无法获取Gas数据")
                                    .build())
                            .optimizations(Collections.emptyList())
                            .summary(AnalysisResult.GasOptimizationSummary.builder()
                                    .totalOptimizations(0)
                                    .totalPotentialSavings(0L)
                                    .estimatedSavingsPercentage("0%")
                                    .potentialCostReduction("0 ETH")
                                    .build())
                            .build())

                    // 修复方案和综合评估
                    .fixSolutions(Collections.emptyList())
                    .overallAssessment(AnalysisResult.OverallAssessment.builder()
                            .overallScore(0)
                            .riskLevel("CRITICAL")
                            .scoreBreakdown(AnalysisResult.ScoreBreakdown.builder()
                                    .securityScore(0)
                                    .designScore(0)
                                    .businessScore(0)
                                    .gasScore(0)
                                    .build())
                            .aiInsights("分析失败: " + e.getMessage())
                            .keyFindings(Collections.singletonList("系统异常，无法完成分析"))
                            .priorityRecommendations(Collections.singletonList("请检查合约代码格式和系统配置"))
                            .conclusionSummary("由于系统异常，无法完成安全分析。请重试或联系技术支持。")
                            .build())
                    .build();
        }
    }
}