package com.contractguard.security.ai.test;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import java.util.*;

/**
 * 通义千问 API 测试
 * 直接运行 main 方法测试
 */
public class QwenApiTest {

    public static void main(String[] args) {
        System.out.println("=".repeat(60));
        System.out.println("🚀 通义千问 API 测试");
        System.out.println("=".repeat(60));
        System.out.println();

        // ⚠️ 替换为你的 API Key
        String apiKey = "sk-f19e1ecc819c4ca5b64c58ef15fa0f2a";

        // 测试 1: API Key 验证
        System.out.println("【测试 1】验证 API Key");
        boolean isValid = testApiKey(apiKey);
        System.out.println("结果: " + (isValid ? "✅ API Key 有效" : "❌ API Key 无效"));
        System.out.println();

        if (!isValid) {
            System.out.println("❌ API Key 无效，请检查配置后重试");
            System.out.println();
            System.out.println("📝 如何获取 API Key:");
            System.out.println("1. 访问: https://dashscope.aliyuncs.com");
            System.out.println("2. 用淘宝/支付宝账号登录");
            System.out.println("3. 开通 DashScope 服务");
            System.out.println("4. 进入 API-KEY 管理");
            System.out.println("5. 创建新的 API Key");
            return;
        }

        // 测试 2: 简单对话
        System.out.println("【测试 2】简单对话测试");
        testSimpleChat(apiKey);
        System.out.println();

        // 测试 3: 智能合约分析
        System.out.println("【测试 3】智能合约分析测试");
        testContractAnalysis(apiKey);
        System.out.println();

        System.out.println("=".repeat(60));
        System.out.println("✅ 所有测试完成！");
        System.out.println("=".repeat(60));
    }

    /**
     * 测试 1: 验证 API Key
     */
    private static boolean testApiKey(String apiKey) {
        try {
            RestTemplate restTemplate = new RestTemplate();
            ObjectMapper objectMapper = new ObjectMapper();

            String apiUrl = "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Bearer " + apiKey);

            // 最小测试请求
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", "qwen-plus");

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

            ResponseEntity<String> response = restTemplate.postForEntity(apiUrl, entity, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                String responseBody = response.getBody();
                System.out.println("  原始响应: " + responseBody);

                JsonNode root = objectMapper.readTree(responseBody);

                // 检查是否有错误
                if (root.has("code") && !root.path("code").asText().isEmpty()) {
                    String errorCode = root.path("code").asText();
                    String errorMessage = root.path("message").asText();
                    System.out.println("  API 错误: " + errorCode + " - " + errorMessage);
                    return false;
                }

                // 解析正常响应
                JsonNode output = root.path("output");
                if (!output.isMissingNode()) {
                    JsonNode choices = output.path("choices");
                    if (choices.isArray() && choices.size() > 0) {
                        String content = choices.get(0).path("message").path("content").asText();
                        System.out.println("  响应内容: " + content);
                        return true;
                    }
                }

                System.out.println("  ⚠️ 响应格式异常");
                return false;
            }

            System.out.println("  ⚠️ HTTP 状态码: " + response.getStatusCode());
            return false;

        } catch (Exception e) {
            System.out.println("  错误: " + e.getMessage());
            return false;
        }
    }

    /**
     * 测试 2: 简单对话
     */
    private static void testSimpleChat(String apiKey) {
        try {
            RestTemplate restTemplate = new RestTemplate();
            ObjectMapper objectMapper = new ObjectMapper();

            String apiUrl = "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Bearer " + apiKey);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", "qwen-plus");

            Map<String, Object> input = new HashMap<>();
            List<Map<String, String>> messages = new ArrayList<>();
            Map<String, String> message = new HashMap<>();
            message.put("role", "user");
            message.put("content", "用一句话介绍智能合约安全审计的重要性");
            messages.add(message);
            input.put("messages", messages);
            requestBody.put("input", input);

            Map<String, Object> parameters = new HashMap<>();
            parameters.put("max_tokens", 100);
            requestBody.put("parameters", parameters);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            long startTime = System.currentTimeMillis();
            ResponseEntity<String> response = restTemplate.postForEntity(apiUrl, entity, String.class);
            long duration = System.currentTimeMillis() - startTime;

            if (response.getStatusCode().is2xxSuccessful()) {
                JsonNode root = objectMapper.readTree(response.getBody());
                String content = root.path("output").path("choices").get(0)
                        .path("message").path("content").asText();

                int inputTokens = root.path("usage").path("input_tokens").asInt();
                int outputTokens = root.path("usage").path("output_tokens").asInt();

                System.out.println("  ✅ 对话成功");
                System.out.println("  响应时间: " + duration + " ms");
                System.out.println("  输入 tokens: " + inputTokens);
                System.out.println("  输出 tokens: " + outputTokens);
                System.out.println("  AI 回复: " + content);
            } else {
                System.out.println("  ❌ 请求失败: " + response.getStatusCode());
            }

        } catch (Exception e) {
            System.out.println("  ❌ 错误: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * 测试 3: 智能合约分析
     */
    private static void testContractAnalysis(String apiKey) {
        try {
            RestTemplate restTemplate = new RestTemplate();
            ObjectMapper objectMapper = new ObjectMapper();

            String apiUrl = "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation";

            // 简单的测试合约
            String contractCode = """
                pragma solidity ^0.8.0;
                
                contract SimpleBank {
                    mapping(address => uint256) public balances;
                    
                    function deposit() public payable {
                        balances[msg.sender] += msg.value;
                    }
                    
                    function withdraw(uint256 amount) public {
                        require(balances[msg.sender] >= amount, "Insufficient balance");
                        balances[msg.sender] -= amount;
                        payable(msg.sender).transfer(amount);
                    }
                }
                """;

            String prompt = String.format("""
                你是专业的智能合约安全审计专家。请分析以下合约，找出安全问题。
                
                合约代码：
                ```solidity
                %s
                ```
                
                请返回 JSON 格式：
                {
                  "vulnerabilities": [
                    {
                      "severity": "HIGH/MEDIUM/LOW",
                      "title": "漏洞标题",
                      "description": "详细描述"
                    }
                  ],
                  "summary": "总结"
                }
                
                只返回 JSON，不要其他文字。
                """, contractCode);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Bearer " + apiKey);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", "qwen-plus");

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
            parameters.put("max_tokens", 2000);
            requestBody.put("parameters", parameters);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            System.out.println("  📡 发送分析请求...");
            long startTime = System.currentTimeMillis();
            ResponseEntity<String> response = restTemplate.postForEntity(apiUrl, entity, String.class);
            long duration = System.currentTimeMillis() - startTime;

            if (response.getStatusCode().is2xxSuccessful()) {
                JsonNode root = objectMapper.readTree(response.getBody());
                String content = root.path("output").path("choices").get(0)
                        .path("message").path("content").asText();

                int inputTokens = root.path("usage").path("input_tokens").asInt();
                int outputTokens = root.path("usage").path("output_tokens").asInt();
                int totalTokens = inputTokens + outputTokens;

                // 计算成本（qwen-plus: 输入¥0.8/百万，输出¥2/百万）
                double cost = (inputTokens * 0.8 + outputTokens * 2.0) / 1_000_000;

                System.out.println("  ✅ 分析完成");
                System.out.println("  响应时间: " + duration + " ms");
                System.out.println("  输入 tokens: " + inputTokens);
                System.out.println("  输出 tokens: " + outputTokens);
                System.out.println("  总 tokens: " + totalTokens);
                System.out.println("  本次成本: ¥" + String.format("%.4f", cost));
                System.out.println();
                System.out.println("  AI 分析结果:");
                System.out.println("  " + "-".repeat(56));

                // 提取 JSON
                String jsonStr = extractJSON(content);
                JsonNode analysis = objectMapper.readTree(jsonStr);

                // 打印漏洞列表
                JsonNode vulnerabilities = analysis.path("vulnerabilities");
                if (vulnerabilities.isArray() && vulnerabilities.size() > 0) {
                    System.out.println("  发现 " + vulnerabilities.size() + " 个安全问题:");
                    for (int i = 0; i < vulnerabilities.size(); i++) {
                        JsonNode vuln = vulnerabilities.get(i);
                        System.out.println();
                        System.out.println("  " + (i + 1) + ". [" + vuln.path("severity").asText() + "] "
                                + vuln.path("title").asText());
                        System.out.println("     " + vuln.path("description").asText());
                    }
                } else {
                    System.out.println("  未发现明显安全问题");
                }

                System.out.println();
                System.out.println("  总结: " + analysis.path("summary").asText());
                System.out.println("  " + "-".repeat(56));

            } else {
                System.out.println("  ❌ 请求失败: " + response.getStatusCode());
            }

        } catch (Exception e) {
            System.out.println("  ❌ 错误: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * 提取 JSON
     */
    private static String extractJSON(String response) {
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
}