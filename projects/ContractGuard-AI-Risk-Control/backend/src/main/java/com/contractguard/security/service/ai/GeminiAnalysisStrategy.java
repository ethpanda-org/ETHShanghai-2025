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
 * Google Gemini AI分析策略
 * 完全免费，每天1500次请求
 */
@AIStrategy(value = AIStrategyType.GEMINI, priority = 2)
@Slf4j
public class GeminiAnalysisStrategy implements AIAnalysisStrategy {

    @Value("${ai.gemini.api-key:}")
    private String apiKey;

    @Value("${ai.gemini.model:gemini-1.5-flash-latest}")
    private String model;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * 缓存可用性状态，避免每次都请求
     */
    private volatile Boolean cachedAvailability = null;
    private volatile long lastCheckTime = 0;
    private static final long CHECK_INTERVAL = 5 * 60 * 1000; // 5分钟检查一次

    @PostConstruct
    public void init() {
        log.info("🚀 初始化 Gemini 策略");
        log.info("🔑 API Key: {}...", apiKey != null && apiKey.length() > 10 ?
                apiKey.substring(0, 10) : "未配置");
        log.info("🤖 Model: {}", model);

        // 启动时检查一次可用性
        boolean available = checkAvailability();
        log.info("✅ Gemini 可用性: {}", available ? "可用" : "不可用");
    }


    @Override
    public AIAnalysisResponse analyze(AnalysisRequest request) {
        try {
            log.info("🚀 使用Gemini分析 (模型: {}): {}",
                    model, request.getBusinessContext().getProjectName());

            String prompt = buildEnhancedPrompt(request);
            String response = callGemini(prompt);

            return parseEnhancedResponse(response);

        } catch (Exception e) {
            log.error("❌ Gemini分析失败", e);
            throw new RuntimeException("Gemini分析失败: " + e.getMessage());
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
        if (apiKey == null || apiKey.isEmpty()) {
            log.debug("❌ Gemini API Key 未配置");
            return false;
        }

        // 2. 实际API调用测试
        try {
            String apiUrl = String.format(
                    "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s",
                    model, apiKey
            );

            log.debug("🔍 测试 Gemini API 可用性");

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            // 构造最小测试请求
            Map<String, Object> requestBody = new HashMap<>();
            List<Map<String, Object>> contents = new ArrayList<>();
            Map<String, Object> content = new HashMap<>();
            List<Map<String, String>> parts = new ArrayList<>();
            Map<String, String> part = new HashMap<>();
            part.put("text", "hi");
            parts.add(part);
            content.put("parts", parts);
            contents.add(content);
            requestBody.put("contents", contents);

            Map<String, Object> generationConfig = new HashMap<>();
            generationConfig.put("maxOutputTokens", 5);
            requestBody.put("generationConfig", generationConfig);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            ResponseEntity<String> response = restTemplate.postForEntity(apiUrl, entity, String.class);

            // 检查响应状态
            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("✅ Gemini API 可用 (状态码: {})", response.getStatusCode());
                return true;
            } else {
                log.warn("⚠️ Gemini API 返回异常状态码: {}", response.getStatusCode());
                return false;
            }

        } catch (Exception e) {
            log.warn("❌ Gemini API 不可用: {}", e.getMessage());
            return false;
        }
    }


    /**
     * 调用Gemini API
     */
    private String callGemini(String prompt) {
        try {
            String apiUrl = String.format(
                    "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s",
                    model, apiKey
            );

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, Object> requestBody = new HashMap<>();

            // 构建contents
            List<Map<String, Object>> contents = new ArrayList<>();
            Map<String, Object> content = new HashMap<>();
            List<Map<String, String>> parts = new ArrayList<>();
            Map<String, String> part = new HashMap<>();
            part.put("text", prompt);
            parts.add(part);
            content.put("parts", parts);
            contents.add(content);
            requestBody.put("contents", contents);

            // 配置生成参数
            Map<String, Object> generationConfig = new HashMap<>();
            generationConfig.put("temperature", 0.1);
            generationConfig.put("topK", 40);
            generationConfig.put("topP", 0.95);
            generationConfig.put("maxOutputTokens", 4096);
            requestBody.put("generationConfig", generationConfig);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            log.info("📡 调用Gemini API");
            ResponseEntity<String> response = restTemplate.postForEntity(apiUrl, entity, String.class);

            JsonNode root = objectMapper.readTree(response.getBody());
            String responseContent = root.path("candidates").get(0)
                    .path("content").path("parts").get(0)
                    .path("text").asText();

            log.info("✅ Gemini响应成功,长度: {}", responseContent.length());
            return responseContent;

        } catch (Exception e) {
            log.error("❌ Gemini API调用失败", e);
            throw new RuntimeException("Gemini API失败: " + e.getMessage());
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