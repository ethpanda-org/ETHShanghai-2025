package com.contractguard.security.ai.test;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class ApiKeyTest {

    public static void main(String[] args) {
        // 你的 API Key
        String apiKey = "sk-sk-0TAvM19vctSaVRGgpxs46hxrBYjFVQhhl4D75TMM1IGJVYwa";

        // 尝试不同的端点
        String[] endpoints = {
                "https://agentrouter.org/v1/chat/completions",
                "https://api.anyrouter.ai/v1/chat/completions",
                "https://api.agentrouter.org/v1/chat/completions"
        };

        String requestBody = """
        {
          "model": "gpt-3.5-turbo",
          "messages": [
            {"role": "user", "content": "Hello"}
          ],
          "max_tokens": 10
        }
        """;

        HttpClient client = HttpClient.newHttpClient();

        for (String url : endpoints) {
            System.out.println("\n=== 测试端点: " + url + " ===");
            try {
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(url))
                        .header("Content-Type", "application/json")
                        .header("Authorization", "Bearer " + apiKey)
                        .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                        .build();

                HttpResponse<String> response = client.send(
                        request,
                        HttpResponse.BodyHandlers.ofString()
                );

                System.out.println("状态码: " + response.statusCode());
                System.out.println("响应: " + response.body());

            } catch (Exception e) {
                System.out.println("错误: " + e.getMessage());
            }
        }
    }
}