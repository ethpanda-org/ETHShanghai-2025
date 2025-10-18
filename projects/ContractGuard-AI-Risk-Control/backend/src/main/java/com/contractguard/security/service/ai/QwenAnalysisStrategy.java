package com.contractguard.security.service.ai;

import com.contractguard.security.annotation.AIStrategy;
import com.contractguard.security.annotation.AIStrategyType;
import com.contractguard.security.dto.AIAnalysisResponse;
import com.contractguard.security.dto.AnalysisRequest;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import java.util.*;

/**
 * 通义千问 AI分析策略 - 四维度完整版
 */
@AIStrategy(value = AIStrategyType.QWEN, priority = 3)
@Slf4j
public class QwenAnalysisStrategy implements AIAnalysisStrategy {

    @Value("${ai.qwen.api-key:}")
    private String apiKey;

    @Value("${ai.qwen.model:qwen-plus}")
    private String model;

    private static final String API_URL = "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation";

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    private volatile Boolean cachedAvailability = null;
    private volatile long lastCheckTime = 0;
    private static final long CHECK_INTERVAL = 5 * 60 * 1000;

    @PostConstruct
    public void init() {
        log.info("🚀 初始化 通义千问 策略 (四维度分析版)");
        log.info("🔑 API Key: {}...", apiKey != null && apiKey.length() > 10 ?
                apiKey.substring(0, 10) : "未配置");
        log.info("🤖 Model: {}", model);

        boolean available = checkAvailability();
        log.info("✅ 通义千问 可用性: {}", available ? "可用" : "不可用");
    }

    @Override
    public AIAnalysisResponse analyze(AnalysisRequest request) {
        try {
            log.info("🚀 使用通义千问四维度分析: {}",
                    request.getBusinessContext().getProjectName());

            String prompt = buildEnhancedPrompt(request);
            String response = callQwen(prompt);

            return parseEnhancedResponse(response);

        } catch (Exception e) {
            log.error("❌ 通义千问分析失败", e);
            throw new RuntimeException("通义千问分析失败: " + e.getMessage());
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
            log.debug("❌ 通义千问 API Key 未配置");
            return false;
        }

        try {
            log.debug("🔍 测试 通义千问 API 可用性");

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Bearer " + apiKey);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", model);

            Map<String, Object> input = new HashMap<>();
            List<Map<String, String>> messages = new ArrayList<>();
            Map<String, String> message = new HashMap<>();
            message.put("role", "user");
            message.put("content", "hi");
            messages.add(message);
            input.put("messages", messages);
            requestBody.put("input", input);

            Map<String, Object> parameters = new HashMap<>();
            parameters.put("max_tokens", 5);
            requestBody.put("parameters", parameters);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(API_URL, entity, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("✅ 通义千问 API 可用");
                return true;
            } else {
                log.warn("⚠️ 通义千问 API 返回异常状态码: {}", response.getStatusCode());
                return false;
            }

        } catch (Exception e) {
            log.warn("❌ 通义千问 API 不可用: {}", e.getMessage());
            return false;
        }
    }


    private String callQwen(String prompt) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Bearer " + apiKey);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", model);

            Map<String, Object> input = new HashMap<>();
            List<Map<String, String>> messages = new ArrayList<>();
            Map<String, String> message = new HashMap<>();
            message.put("role", "user");
            message.put("content", prompt);
            messages.add(message);
            input.put("messages", messages);
            requestBody.put("input", input);

            Map<String, Object> parameters = new HashMap<>();
            parameters.put("result_format", "message");
            requestBody.put("parameters", parameters);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            log.info("📡 调用通义千问API");
            ResponseEntity<String> response = restTemplate.postForEntity(API_URL, entity, String.class);

            JsonNode root = objectMapper.readTree(response.getBody());
            String content = root.path("output").path("choices").get(0)
                    .path("message").path("content").asText();

            log.info("✅ 通义千问响应成功,长度: {}", content.length());
            return content;

        } catch (Exception e) {
            log.error("❌ 通义千问API调用失败", e);
            throw new RuntimeException("通义千问API失败: " + e.getMessage());
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