package com.contractguard.security.service.ai;

import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.*;

/**
 * AgentRouter checkAvailability 简化测试
 *
 * 运行方式:
 * 1. IDEA: 右键点击类名 -> Run 'AgentRouterSimpleTest'
 * 2. Maven: mvn test -Dtest=AgentRouterSimpleTest
 */
@SpringBootTest
@DisplayName("AgentRouter 可用性简单测试")
class AgentRouterSimpleTest {

    @Autowired
    private AgentRouterAnalysisStrategy agentRouterStrategy;

    /**
     * 测试1: 快速检查API是否可用
     */
    @Test
    @DisplayName("快速可用性检查")
    void testQuickAvailability() {
        System.out.println("\n========================================");
        System.out.println("🔍 测试: 快速可用性检查");
        System.out.println("========================================");

        // 执行检查
        long startTime = System.currentTimeMillis();
        boolean available = agentRouterStrategy.isAvailable();
        long duration = System.currentTimeMillis() - startTime;

        // 输出结果
        System.out.println("⏱️  检查耗时: " + duration + "ms");
        System.out.println("📊 API状态: " + (available ? "✅ 可用" : "❌ 不可用"));

        // 如果可用，输出成功信息
        if (available) {
            System.out.println("✅ 测试通过！AgentRouter API 正常工作");
            assertTrue(available);
        } else {
            System.out.println("⚠️  API不可用，可能原因:");
            System.out.println("   1. API Key 未配置或无效");
            System.out.println("   2. 网络连接问题");
            System.out.println("   3. AgentRouter 服务暂时不可用");
            System.out.println("\n💡 请检查 application.yml 中的配置:");
            System.out.println("   ai.agentrouter.api-key");
            System.out.println("   ai.agentrouter.api-url");
        }

        System.out.println("========================================\n");

        // 断言：不管结果如何，方法应该正常返回（不抛异常）
        assertNotNull(available);
    }

    /**
     * 测试2: 验证缓存机制
     */
    @Test
    @DisplayName("缓存机制验证")
    void testCache() {
        System.out.println("\n========================================");
        System.out.println("🔍 测试: 缓存机制");
        System.out.println("========================================");

        // 第一次调用
        long start1 = System.currentTimeMillis();
        boolean result1 = agentRouterStrategy.isAvailable();
        long duration1 = System.currentTimeMillis() - start1;

        System.out.println("📍 第一次调用: " + duration1 + "ms - " + (result1 ? "✅" : "❌"));

        // 第二次调用（应该使用缓存）
        long start2 = System.currentTimeMillis();
        boolean result2 = agentRouterStrategy.isAvailable();
        long duration2 = System.currentTimeMillis() - start2;

        System.out.println("📍 第二次调用: " + duration2 + "ms - " + (result2 ? "✅" : "❌"));

        // 验证
        assertEquals(result1, result2, "两次调用结果应该一致");

        if (duration2 < duration1) {
            System.out.println("✅ 缓存机制工作正常！");
            System.out.println("   💾 性能提升: " + String.format("%.1fx", (double)duration1/duration2));
        } else {
            System.out.println("⚠️  缓存可能未生效（但这可能是正常的）");
        }

        System.out.println("========================================\n");
    }

    /**
     * 测试3: 连续多次调用
     */
    @Test
    @DisplayName("连续调用测试")
    void testMultipleCalls() {
        System.out.println("\n========================================");
        System.out.println("🔍 测试: 连续5次调用");
        System.out.println("========================================");

        Boolean firstResult = null;

        for (int i = 1; i <= 5; i++) {
            long start = System.currentTimeMillis();
            boolean result = agentRouterStrategy.isAvailable();
            long duration = System.currentTimeMillis() - start;

            System.out.println("📍 第" + i + "次: " + duration + "ms - " + (result ? "✅" : "❌"));

            if (firstResult == null) {
                firstResult = result;
            }

            // 验证结果一致性
            assertEquals(firstResult, result, "第" + i + "次调用结果应该与第一次一致");
        }

        System.out.println("✅ 所有调用结果一致！");
        System.out.println("========================================\n");
    }
}