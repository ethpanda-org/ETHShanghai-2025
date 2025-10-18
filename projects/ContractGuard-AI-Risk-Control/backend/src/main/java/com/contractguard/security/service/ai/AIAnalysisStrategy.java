package com.contractguard.security.service.ai;

import com.contractguard.security.dto.AnalysisRequest;
import com.contractguard.security.dto.AIAnalysisResponse;
import com.fasterxml.jackson.databind.JsonNode;

import java.util.ArrayList;
import java.util.List;

/**
 * AI分析策略接口
 */
public interface AIAnalysisStrategy {

    /**
     * 分析智能合约
     */
    AIAnalysisResponse analyze(AnalysisRequest request);

    /**
     * 是否可用
     */
    boolean isAvailable();

    /**
     * 构建增强的四维度分析 Prompt
     */
    default String buildEnhancedPrompt(AnalysisRequest request) {
        StringBuilder prompt = new StringBuilder();

        prompt.append("你是专业的智能合约安全审计专家。请从四个维度深度分析以下合约:\n\n");
        prompt.append("## 🎯 四个分析维度\n");
        prompt.append("1. **代码漏洞分析** - 技术层面的安全漏洞\n");
        prompt.append("2. **设计缺陷分析** - 架构和设计层面的问题\n");
        prompt.append("3. **业务逻辑对比** - 预期行为 vs 实际实现\n");
        prompt.append("4. **Gas 消耗优化** - 性能和成本优化\n\n");

        // 业务背景
        prompt.append("## 📋 业务背景\n");
        prompt.append("项目名称: ").append(request.getBusinessContext().getProjectName()).append("\n");
        if (request.getBusinessContext().getBusinessType() != null) {
            prompt.append("业务类型: ").append(request.getBusinessContext().getBusinessType()).append("\n");
        }
        prompt.append("业务描述: ").append(request.getBusinessContext().getBusinessDescription()).append("\n");
        prompt.append("预期行为: ").append(request.getBusinessContext().getExpectedBehavior()).append("\n");
        if (request.getBusinessContext().getSecurityRequirements() != null) {
            prompt.append("安全要求: ").append(request.getBusinessContext().getSecurityRequirements()).append("\n");
        }
        prompt.append("\n");

        // 合约代码
        prompt.append("## 💻 合约代码\n");
        for (AnalysisRequest.ContractFile contract : request.getContracts()) {
            prompt.append("### ").append(contract.getFileName());
            if (contract.isMain()) prompt.append(" (主合约)");
            prompt.append("\n```solidity\n");
            prompt.append(contract.getCode()).append("\n```\n\n");
        }

        // 分析要求 - 四个维度
        prompt.append("## 📊 分析要求\n\n");
        prompt.append("请返回JSON格式的分析结果，包含以下字段:\n\n");

        // 1. 代码漏洞
        prompt.append("### 1. codeVulnerabilities (代码漏洞数组)\n");
        prompt.append("技术层面的安全漏洞，每个漏洞包含:\n");
        prompt.append("```json\n");
        prompt.append("{\n");
        prompt.append("  \"severity\": \"CRITICAL|HIGH|MEDIUM|LOW\",\n");
        prompt.append("  \"category\": \"重入攻击|整数溢出|权限控制|时间戳依赖|...\",\n");
        prompt.append("  \"title\": \"漏洞标题\",\n");
        prompt.append("  \"description\": \"详细描述\",\n");
        prompt.append("  \"contractFile\": \"文件名\",\n");
        prompt.append("  \"function\": \"函数名\",\n");
        prompt.append("  \"impact\": \"漏洞影响\",\n");
        prompt.append("  \"exploitScenario\": \"攻击场景描述\",\n");
        prompt.append("  \"affectedCode\": \"有问题的代码片段\"\n");
        prompt.append("}\n");
        prompt.append("```\n\n");

        // 2. 设计缺陷 (新增)
        prompt.append("### 2. designFlaws (设计缺陷数组) 【重点】\n");
        prompt.append("架构和设计层面的问题，每个缺陷包含:\n");
        prompt.append("```json\n");
        prompt.append("{\n");
        prompt.append("  \"severity\": \"CRITICAL|HIGH|MEDIUM|LOW\",\n");
        prompt.append("  \"category\": \"架构设计|升级机制|紧急控制|事件日志|访问控制\",\n");
        prompt.append("  \"title\": \"缺陷标题\",\n");
        prompt.append("  \"description\": \"详细描述\",\n");
        prompt.append("  \"currentDesign\": \"当前的设计方式\",\n");
        prompt.append("  \"recommendedDesign\": \"推荐的设计方式\",\n");
        prompt.append("  \"designImpact\": \"对系统的影响\",\n");
        prompt.append("  \"affectedContracts\": [\"合约文件名列表\"]\n");
        prompt.append("}\n");
        prompt.append("```\n");
        prompt.append("**设计缺陷示例**:\n");
        prompt.append("- 缺少暂停机制(Pausable)\n");
        prompt.append("- 缺少升级能力(Upgradeable Proxy)\n");
        prompt.append("- 缺少紧急提款功能\n");
        prompt.append("- 缺少关键事件日志\n");
        prompt.append("- 缺少时间锁(Timelock)\n");
        prompt.append("- 缺少多签控制\n");
        prompt.append("- 架构耦合度过高\n\n");

        // 3. 业务逻辑对比
        prompt.append("### 3. businessVulnerabilities (业务逻辑问题数组) 【核心】\n");
        prompt.append("严格对比'预期行为'和实际代码实现，找出所有不符合的地方!\n");
        prompt.append("```json\n");
        prompt.append("{\n");
        prompt.append("  \"severity\": \"CRITICAL|HIGH|MEDIUM|LOW\",\n");
        prompt.append("  \"category\": \"功能缺失|逻辑错误|单向操作|资金锁定\",\n");
        prompt.append("  \"title\": \"问题标题\",\n");
        prompt.append("  \"description\": \"详细描述\",\n");
        prompt.append("  \"expectedLogic\": \"业务预期的逻辑(来自'预期行为')\",\n");
        prompt.append("  \"actualLogic\": \"实际代码实现的逻辑\",\n");
        prompt.append("  \"riskDescription\": \"风险说明\",\n");
        prompt.append("  \"businessImpact\": \"对业务的影响\",\n");
        prompt.append("  \"examples\": [\"具体场景示例\"]\n");
        prompt.append("}\n");
        prompt.append("```\n");
        prompt.append("**重点**: 如果预期说'用户可以退款'但代码没有退款函数，这是CRITICAL级别的业务逻辑缺陷!\n\n");

        // 4. Gas优化
        prompt.append("### 4. gasOptimizations (Gas优化建议数组)\n");
        prompt.append("```json\n");
        prompt.append("{\n");
        prompt.append("  \"priority\": \"HIGH|MEDIUM|LOW\",\n");
        prompt.append("  \"category\": \"存储优化|循环优化|可见性优化|数据类型优化\",\n");
        prompt.append("  \"title\": \"优化标题\",\n");
        prompt.append("  \"description\": \"优化描述\",\n");
        prompt.append("  \"contractFile\": \"文件名\",\n");
        prompt.append("  \"function\": \"函数名\",\n");
        prompt.append("  \"beforeCode\": \"优化前代码\",\n");
        prompt.append("  \"afterCode\": \"优化后代码\",\n");
        prompt.append("  \"explanation\": \"优化说明\",\n");
        prompt.append("  \"estimatedSavings\": 预计节省的Gas数量(整数)\n");
        prompt.append("}\n");
        prompt.append("```\n\n");

        // 5. 综合信息
        prompt.append("### 5. insights (AI综合洞察 - 字符串)\n");
        prompt.append("对整体合约的综合分析和建议\n\n");

        prompt.append("### 6. overallScore (综合评分 - 0到100的整数)\n\n");

        // 特别强调
        prompt.append("## ⚠️ 特别注意\n");
        prompt.append("1. **设计缺陷** 和 **业务逻辑问题** 是两个不同的维度，都要认真分析！\n");
        prompt.append("2. 必须严格对比'预期行为'和实际代码，找出所有不匹配的地方\n");
        prompt.append("3. 如果预期功能在代码中缺失，这是严重的业务逻辑问题\n");
        prompt.append("4. 直接返回JSON，不要markdown标记，不要其他说明文字\n");

        return prompt.toString();
    }

    // ============================================================
    // 统一的解析方法
    // ============================================================

    default String extractJSON(String response) {
        String jsonStr = response.trim();

        if (jsonStr.startsWith("```json")) {
            int start = jsonStr.indexOf("\n") + 1;
            int end = jsonStr.lastIndexOf("```");
            return jsonStr.substring(start, end).trim();
        } else if (jsonStr.startsWith("```")) {
            int start = jsonStr.indexOf("\n") + 1;
            int end = jsonStr.lastIndexOf("```");
            return jsonStr.substring(start, end).trim();
        } else if (jsonStr.contains("{")) {
            int start = jsonStr.indexOf("{");
            int end = jsonStr.lastIndexOf("}") + 1;
            return jsonStr.substring(start, end);
        }

        return jsonStr;
    }

    default List<AIAnalysisResponse.CodeVulnerability> parseCodeVulnerabilities(JsonNode node) {
        List<AIAnalysisResponse.CodeVulnerability> list = new ArrayList<>();
        if (node.isArray()) {
            for (JsonNode item : node) {
                list.add(AIAnalysisResponse.CodeVulnerability.builder()
                        .severity(item.path("severity").asText())
                        .category(item.path("category").asText())
                        .title(item.path("title").asText())
                        .description(item.path("description").asText())
                        .contractFile(item.path("contractFile").asText())
                        .function(item.path("function").asText())
                        .impact(item.path("impact").asText())
                        .exploitScenario(item.path("exploitScenario").asText())
                        .affectedCode(item.path("affectedCode").asText())
                        .build());
            }
        }
        return list;
    }

    /**
     * 解析设计缺陷 (新增)
     */
    default List<AIAnalysisResponse.DesignFlaw> parseDesignFlaws(JsonNode node) {
        List<AIAnalysisResponse.DesignFlaw> list = new ArrayList<>();
        if (node.isArray()) {
            for (JsonNode item : node) {
                List<String> affectedContracts = new ArrayList<>();
                JsonNode contractsNode = item.path("affectedContracts");
                if (contractsNode.isArray()) {
                    for (JsonNode contract : contractsNode) {
                        affectedContracts.add(contract.asText());
                    }
                }

                list.add(AIAnalysisResponse.DesignFlaw.builder()
                        .severity(item.path("severity").asText())
                        .category(item.path("category").asText())
                        .title(item.path("title").asText())
                        .description(item.path("description").asText())
                        .currentDesign(item.path("currentDesign").asText())
                        .recommendedDesign(item.path("recommendedDesign").asText())
                        .designImpact(item.path("designImpact").asText())
                        .affectedContracts(affectedContracts)
                        .build());
            }
        }
        return list;
    }

    default List<AIAnalysisResponse.BusinessVulnerability> parseBusinessVulnerabilities(JsonNode node) {
        List<AIAnalysisResponse.BusinessVulnerability> list = new ArrayList<>();
        if (node.isArray()) {
            for (JsonNode item : node) {
                List<String> examples = new ArrayList<>();
                JsonNode examplesNode = item.path("examples");
                if (examplesNode.isArray()) {
                    for (JsonNode ex : examplesNode) {
                        examples.add(ex.asText());
                    }
                }

                list.add(AIAnalysisResponse.BusinessVulnerability.builder()
                        .severity(item.path("severity").asText())
                        .category(item.path("category").asText())
                        .title(item.path("title").asText())
                        .description(item.path("description").asText())
                        .expectedLogic(item.path("expectedLogic").asText())
                        .actualLogic(item.path("actualLogic").asText())
                        .riskDescription(item.path("riskDescription").asText())
                        .businessImpact(item.path("businessImpact").asText())
                        .examples(examples)
                        .build());
            }
        }
        return list;
    }

    default List<AIAnalysisResponse.GasOptimization> parseGasOptimizations(JsonNode node) {
        List<AIAnalysisResponse.GasOptimization> list = new ArrayList<>();
        if (node.isArray()) {
            for (JsonNode item : node) {
                list.add(AIAnalysisResponse.GasOptimization.builder()
                        .priority(item.path("priority").asText())
                        .category(item.path("category").asText())
                        .title(item.path("title").asText())
                        .description(item.path("description").asText())
                        .contractFile(item.path("contractFile").asText())
                        .function(item.path("function").asText())
                        .beforeCode(item.path("beforeCode").asText())
                        .afterCode(item.path("afterCode").asText())
                        .explanation(item.path("explanation").asText())
                        .estimatedSavings(item.path("estimatedSavings").asInt(0))
                        .build());
            }
        }
        return list;
    }


}