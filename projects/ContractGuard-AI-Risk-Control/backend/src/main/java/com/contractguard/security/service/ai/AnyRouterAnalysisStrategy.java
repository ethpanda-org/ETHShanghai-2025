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
 * AnyRouter AI分析策略
 * 支持通过AnyRouter调用Claude、GPT等多个模型
 */
@AIStrategy(value = AIStrategyType.ANYROUTER, priority = 5)
@Slf4j
public class AnyRouterAnalysisStrategy implements AIAnalysisStrategy {

    @Value("${ai.anyrouter.api-key:}")
    private String apiKey;

    @Value("${ai.anyrouter.api-url:https://api.anyrouter.ai/v1/chat/completions}")
    private String apiUrl;

    @Value("${ai.anyrouter.model:claude-3-5-sonnet}")
    private String model;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    private volatile Boolean cachedAvailability = null;
    private volatile long lastCheckTime = 0;
    private static final long CHECK_INTERVAL = 5 * 60 * 1000;

    @Override
    public AIAnalysisResponse analyze(AnalysisRequest request) {
        try {
            log.info("🌐 使用AnyRouter分析 (模型: {}): {}",
                    model, request.getBusinessContext().getProjectName());

            String prompt = buildEnhancedPrompt(request);
            String response = callAnyRouter(prompt);

            return parseEnhancedResponse(response);

        } catch (Exception e) {
            log.error("❌ AnyRouter分析失败", e);
            throw new RuntimeException("AnyRouter分析失败: " + e.getMessage());
        }
    }

    @Override
    public boolean isAvailable() {
        // 如果缓存有效，直接返回
        long now = System.currentTimeMillis();
        if (cachedAvailability != null && (now - lastCheckTime) < CHECK_INTERVAL) {
            return cachedAvailability;
        }

        // 缓存过期或首次检查，重新检查可用性
        boolean available = checkAvailability();
        cachedAvailability = available;
        lastCheckTime = now;

        return available;
    }

    /**
     * 实际检查API是否可用
     */
    private boolean checkAvailability() {
        // 1. 基本配置检查
        if (apiKey == null || apiKey.isEmpty() ) {
            log.debug("❌ AnyRouter API Key 未配置");
            return false;
        }

        if (apiUrl == null || apiUrl.isEmpty()) {
            log.debug("❌ AnyRouter API URL 未配置");
            return false;
        }

        // 2. 实际API调用测试
        try {
            log.debug("🔍 测试 AnyRouter API 可用性: {}", apiUrl);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);

            // 构造最小测试请求
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("max_tokens", 5);  // 最小token数，节省成本

            List<Map<String, String>> messages = new ArrayList<>();
            Map<String, String> message = new HashMap<>();
            message.put("role", "user");
            message.put("content", "hi");  // 最短的测试消息
            messages.add(message);
            requestBody.put("messages", messages);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            // 设置较短的超时时间
            restTemplate.getRequestFactory();

            ResponseEntity<String> response = restTemplate.postForEntity(apiUrl, entity, String.class);

            // 检查响应状态
            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("✅ AnyRouter API 可用 (状态码: {})", response.getStatusCode());
                return true;
            } else {
                log.warn("⚠️ AnyRouter API 返回异常状态码: {}", response.getStatusCode());
                return false;
            }

        } catch (Exception e) {
            log.warn("❌ AnyRouter API 不可用: {}", e.getMessage());
            return false;
        }
    }
    /**
     * 调用AnyRouter API (OpenAI兼容格式)
     */
    private String callAnyRouter(String prompt) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", model);
            requestBody.put("temperature", 0.3);
            requestBody.put("max_tokens", 4096);

            List<Map<String, String>> messages = new ArrayList<>();
            Map<String, String> message = new HashMap<>();
            message.put("role", "user");
            message.put("content", prompt);
            messages.add(message);
            requestBody.put("messages", messages);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            log.info("📡 调用AnyRouter API: {}", apiUrl);
            ResponseEntity<String> response = restTemplate.postForEntity(apiUrl, entity, String.class);

            JsonNode root = objectMapper.readTree(response.getBody());
            String content = root.path("choices").get(0).path("message").path("content").asText();

            log.info("✅ AnyRouter响应成功,长度: {}", content.length());
            return content;

        } catch (Exception e) {
            log.error("❌ AnyRouter API调用失败", e);
            throw new RuntimeException("AnyRouter API失败: " + e.getMessage());
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