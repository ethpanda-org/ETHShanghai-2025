package com.contractguard.security.service.ai;

import com.contractguard.security.annotation.AIStrategy;
import com.contractguard.security.annotation.AIStrategyType;
import com.contractguard.security.dto.AIAnalysisResponse;
import com.contractguard.security.dto.AnalysisRequest;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import java.util.*;

/**
 * Claude AI分析策略
 */
@AIStrategy(value = AIStrategyType.CLAUDE, priority = 10)
@Slf4j
public class ClaudeAnalysisStrategy implements AIAnalysisStrategy {

    @Value("${ai.claude.api-key:}")
    private String apiKey;

    @Value("${ai.claude.api-url:https://api.anthropic.com/v1/messages}")
    private String apiUrl;

    @Value("${ai.claude.model:claude-3-5-sonnet-20241022}")
    private String model;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();


    private volatile Boolean cachedAvailability = null;
    private volatile long lastCheckTime = 0;
    private static final long CHECK_INTERVAL = 5 * 60 * 1000;

    @Override
    public AIAnalysisResponse analyze(AnalysisRequest request) {
        try {
            log.info("🤖 使用Claude AI分析: {}", request.getBusinessContext().getProjectName());

            String prompt = buildEnhancedPrompt(request);
            String response = callClaudeAPI(prompt);

            return parseEnhancedResponse(response);

        } catch (Exception e) {
            log.error("❌ Claude AI分析失败", e);
            throw new RuntimeException("Claude分析失败: " + e.getMessage());
        }
    }

    @Override
    public boolean isAvailable() {
        long now = System.currentTimeMillis();
        if (cachedAvailability != null && (now - lastCheckTime) < CHECK_INTERVAL) {
            return cachedAvailability;
        }

        boolean available = checkAvailability();
        cachedAvailability = available;
        lastCheckTime = now;

        return available;
    }

    private boolean checkAvailability() {
        if (apiKey == null || apiKey.isEmpty()) {
            log.debug("❌ Claude API Key 未配置");
            return false;
        }

        try {
            log.debug("🔍 测试 Claude API 可用性");
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("x-api-key", apiKey);
            headers.set("anthropic-version", "2023-06-01");

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", model);
            requestBody.put("max_tokens", 5);

            List<Map<String, String>> messages = new ArrayList<>();
            Map<String, String> message = new HashMap<>();
            message.put("role", "user");
            message.put("content", "hi");
            messages.add(message);
            requestBody.put("messages", messages);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(apiUrl, entity, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("✅ Claude API 可用");
                return true;
            } else {
                log.warn("⚠️ Claude API 返回异常状态码: {}", response.getStatusCode());
                return false;
            }

        } catch (Exception e) {
            log.warn("❌ Claude API 不可用: {}", e.getMessage());
            return false;
        }
    }


    private String callClaudeAPI(String prompt) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("x-api-key", apiKey);
            headers.set("anthropic-version", "2023-06-01");

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", model);
            requestBody.put("max_tokens", 4096);

            List<Map<String, String>> messages = new ArrayList<>();
            Map<String, String> message = new HashMap<>();
            message.put("role", "user");
            message.put("content", prompt);
            messages.add(message);
            requestBody.put("messages", messages);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            ResponseEntity<String> response = restTemplate.postForEntity(apiUrl, entity, String.class);

            JsonNode root = objectMapper.readTree(response.getBody());
            String content = root.path("content").get(0).path("text").asText();

            log.info("✅ Claude响应成功");
            return content;

        } catch (Exception e) {
            log.error("Claude API调用失败", e);
            throw new RuntimeException("Claude API失败: " + e.getMessage());
        }
    }

    /**
     * 解析增强的四维度响应
     */
    private AIAnalysisResponse parseEnhancedResponse(String response) {
        try {
            String jsonStr = extractJSON(response);
            JsonNode root = objectMapper.readTree(jsonStr);

            AIAnalysisResponse result = AIAnalysisResponse.builder()
                    .codeVulnerabilities(parseCodeVulnerabilities(root.path("codeVulnerabilities")))
                    .designFlaws(parseDesignFlaws(root.path("designFlaws"))) // 新增
                    .businessVulnerabilities(parseBusinessVulnerabilities(root.path("businessVulnerabilities")))
                    .gasOptimizations(parseGasOptimizations(root.path("gasOptimizations")))
                    .insights(root.path("insights").asText())
                    .overallScore(root.path("overallScore").asInt(70))
                    .build();

            log.info("✅ 解析成功: 代码漏洞={}, 设计缺陷={}, 业务问题={}, Gas优化={}",
                    result.getCodeVulnerabilities().size(),
                    result.getDesignFlaws().size(),
                    result.getBusinessVulnerabilities().size(),
                    result.getGasOptimizations().size());

            return result;

        } catch (Exception e) {
            log.error("❌ 解析响应失败", e);
            throw new RuntimeException("解析失败: " + e.getMessage());
        }
    }
}