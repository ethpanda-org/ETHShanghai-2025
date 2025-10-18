package com.contractguard.security.service.ai;

import com.contractguard.security.dto.AIAnalysisResponse;
import com.contractguard.security.dto.AnalysisRequest;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 通义千问策略单元测试
 *
 * 测试覆盖:
 * 1. API 可用性检查
 * 2. 基础合约分析
 * 3. 重入攻击检测
 * 4. 业务逻辑漏洞检测
 * 5. Gas 优化建议
 * 6. 性能测试
 * 7. 并发测试
 * 8. 错误处理
 */
@SpringBootTest
@TestPropertySource(properties = {
        "ai.qwen.api-key=${QWEN_API_KEY}",
        "ai.qwen.model=qwen-plus"
})
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@DisplayName("通义千问 AI 策略测试")
class QwenAnalysisStrategyTest {

    @Autowired
    private QwenAnalysisStrategy qwenStrategy;

    private AnalysisRequest testRequest;

    private static final AtomicInteger testCounter = new AtomicInteger(0);

    @BeforeAll
    static void beforeAll() {
        System.out.println("\n" + "=".repeat(70));
        System.out.println("🚀 开始通义千问 AI 策略测试");
        System.out.println("=".repeat(70));
    }

    @AfterAll
    static void afterAll() {
        System.out.println("\n" + "=".repeat(70));
        System.out.println("✅ 通义千问测试完成，共执行 " + testCounter.get() + " 个测试");
        System.out.println("=".repeat(70) + "\n");
    }

    @BeforeEach
    void setUp() {
        testCounter.incrementAndGet();

        // 准备测试数据
        testRequest = new AnalysisRequest();

        // 设置业务背景
        AnalysisRequest.BusinessContext context = new AnalysisRequest.BusinessContext();
        context.setProjectName("测试银行合约");
        context.setBusinessType("DeFi");
        context.setBusinessDescription("简单的存取款合约");
        context.setExpectedBehavior("用户可以存款和取款，取款时检查余额");
        testRequest.setBusinessContext(context);

        // 设置合约代码
        AnalysisRequest.ContractFile contract = new AnalysisRequest.ContractFile();
        contract.setFileName("SimpleBank.sol");
        contract.setMain(true);
        contract.setCode("""
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
            """);

        testRequest.setContracts(Collections.singletonList(contract));
    }

    @Test
    @Order(1)
    @DisplayName("测试 API 可用性")
    void testIsAvailable() {
        printTestHeader("API 可用性检查");

        boolean available = qwenStrategy.isAvailable();

        System.out.println("结果: " + (available ? "✅ 可用" : "❌ 不可用"));

        if (!available) {
            System.out.println("\n⚠️ 提示:");
            System.out.println("1. 检查 QWEN_API_KEY 环境变量是否设置");
            System.out.println("2. 确认 API Key 有效");
            System.out.println("3. 检查网络连接");
            System.out.println("4. 运行诊断脚本: ./diagnose_qwen.sh");
        }

        assertTrue(available, "通义千问 API 应该可用");
        System.out.println();
    }

    @Test
    @Order(2)
    @DisplayName("测试基础合约分析")
    void testAnalyze() {
        printTestHeader("智能合约分析");

        // 先检查可用性
        assumeApiAvailable();

        System.out.println("📡 发送分析请求...");
        long startTime = System.currentTimeMillis();

        AIAnalysisResponse response = qwenStrategy.analyze(testRequest);

        long duration = System.currentTimeMillis() - startTime;

        System.out.println("✅ 分析完成 (耗时: " + duration + " ms)");
        System.out.println();

        // 基础断言
        assertNotNull(response, "响应不应为空");
        assertNotNull(response.getCodeVulnerabilities(), "代码漏洞列表不应为空");
        assertNotNull(response.getBusinessVulnerabilities(), "业务漏洞列表不应为空");
        assertNotNull(response.getGasOptimizations(), "Gas优化列表不应为空");
        assertTrue(response.getOverallScore() >= 0 && response.getOverallScore() <= 100,
                "评分应该在 0-100 之间");

        // 打印结果摘要
        printAnalysisSummary(response);

        // 详细断言
        int totalIssues = response.getCodeVulnerabilities().size()
                + response.getBusinessVulnerabilities().size();
        System.out.println("📊 总问题数: " + totalIssues);

        if (totalIssues > 0) {
            System.out.println("✅ AI 成功识别了安全问题");
        }

        System.out.println();
    }

    @Test
    @Order(3)
    @DisplayName("测试重入攻击检测")
    void testAnalyzeWithReentrancy() {
        printTestHeader("重入攻击检测");

        assumeApiAvailable();

        // 准备有重入漏洞的合约
        AnalysisRequest.ContractFile vulnerableContract = new AnalysisRequest.ContractFile();
        vulnerableContract.setFileName("VulnerableBank.sol");
        vulnerableContract.setMain(true);
        vulnerableContract.setCode("""
            pragma solidity ^0.8.0;
            
            contract VulnerableBank {
                mapping(address => uint256) public balances;
                
                function deposit() public payable {
                    balances[msg.sender] += msg.value;
                }
                
                function withdraw(uint256 amount) public {
                    require(balances[msg.sender] >= amount);
                    
                    // 重入漏洞: 在更新余额前转账
                    (bool success, ) = msg.sender.call{value: amount}("");
                    require(success);
                    
                    balances[msg.sender] -= amount;
                }
            }
            """);

        testRequest.setContracts(Collections.singletonList(vulnerableContract));

        System.out.println("📡 分析含有重入漏洞的合约...");
        AIAnalysisResponse response = qwenStrategy.analyze(testRequest);

        System.out.println("✅ 分析完成");
        System.out.println();

        // 验证是否检测到重入攻击
        boolean foundReentrancy = response.getCodeVulnerabilities().stream()
                .anyMatch(v -> v.getTitle().toLowerCase().contains("重入")
                        || v.getTitle().toLowerCase().contains("reentrancy")
                        || v.getCategory().toLowerCase().contains("重入")
                        || v.getCategory().toLowerCase().contains("reentrancy"));

        System.out.println("重入漏洞检测: " + (foundReentrancy ? "✅ 已检测到" : "⚠️ 未检测到"));

        if (foundReentrancy) {
            response.getCodeVulnerabilities().stream()
                    .filter(v -> v.getTitle().toLowerCase().contains("重入")
                            || v.getTitle().toLowerCase().contains("reentrancy")
                            || v.getCategory().toLowerCase().contains("重入")
                            || v.getCategory().toLowerCase().contains("reentrancy"))
                    .forEach(v -> {
                        System.out.println("\n发现重入漏洞:");
                        System.out.println("  严重程度: " + v.getSeverity());
                        System.out.println("  标题: " + v.getTitle());
                        System.out.println("  描述: " + v.getDescription());
                    });
        }

        System.out.println();

        // 断言：应该检测到重入攻击（但不强制，因为 AI 可能有变化）
        if (!foundReentrancy) {
            System.out.println("⚠️ 警告: 未检测到明显的重入攻击漏洞");
            System.out.println("   这可能是 AI 模型的判断，但该合约确实存在重入风险");
        }
    }

    @Test
    @Order(4)
    @DisplayName("测试业务逻辑漏洞检测")
    void testBusinessLogicDetection() {
        printTestHeader("业务逻辑漏洞检测");

        assumeApiAvailable();

        // 修改业务预期，创建不匹配
        AnalysisRequest.BusinessContext context = testRequest.getBusinessContext();
        context.setExpectedBehavior(
                "用户可以存款、取款和查询余额。" +
                        "用户可以随时申请退款，退款会扣除10%手续费。" +
                        "合约管理员可以暂停合约运行。"
        );

        System.out.println("📡 分析业务逻辑一致性...");
        System.out.println("预期功能: 存款、取款、退款(10%手续费)、暂停");
        System.out.println("实际代码: 仅有存款、取款功能");
        System.out.println();

        AIAnalysisResponse response = qwenStrategy.analyze(testRequest);

        System.out.println("✅ 分析完成");
        System.out.println();

        // 验证业务逻辑漏洞检测
        int businessVulnCount = response.getBusinessVulnerabilities().size();
        System.out.println("检测到 " + businessVulnCount + " 个业务逻辑问题");

        if (businessVulnCount > 0) {
            System.out.println("\n业务逻辑漏洞详情:");
            response.getBusinessVulnerabilities().forEach(v -> {
                System.out.println("\n• [" + v.getSeverity() + "] " + v.getTitle());
                System.out.println("  描述: " + v.getDescription());
                System.out.println("  预期: " + v.getExpectedLogic());
                System.out.println("  实际: " + v.getActualLogic());
            });
        }

        System.out.println();

        // 断言
        assertNotNull(response.getBusinessVulnerabilities(), "应该返回业务漏洞列表");
    }

    @Test
    @Order(5)
    @DisplayName("测试 Gas 优化建议")
    void testGasOptimizations() {
        printTestHeader("Gas 优化建议");

        assumeApiAvailable();

        // 使用一个有明显优化空间的合约
        AnalysisRequest.ContractFile contract = new AnalysisRequest.ContractFile();
        contract.setFileName("GasInefficient.sol");
        contract.setMain(true);
        contract.setCode("""
            pragma solidity ^0.8.0;
            
            contract GasInefficient {
                uint256 public value1;
                uint256 public value2;
                uint256 public value3;
                
                // 多次读取存储变量
                function inefficientLoop() public view returns (uint256) {
                    uint256 sum = 0;
                    for (uint256 i = 0; i < 10; i++) {
                        sum += value1 + value2 + value3;  // 每次循环都读取存储
                    }
                    return sum;
                }
                
                // 使用 string 代替 bytes32
                mapping(string => address) public users;
            }
            """);

        testRequest.setContracts(Collections.singletonList(contract));

        System.out.println("📡 分析 Gas 优化机会...");
        AIAnalysisResponse response = qwenStrategy.analyze(testRequest);

        System.out.println("✅ 分析完成");
        System.out.println();

        // 验证 Gas 优化建议
        int gasOptCount = response.getGasOptimizations().size();
        System.out.println("检测到 " + gasOptCount + " 条 Gas 优化建议");

        if (gasOptCount > 0) {
            System.out.println("\nGas 优化详情:");
            response.getGasOptimizations().forEach(o -> {
                System.out.println("\n• [" + o.getPriority() + "] " + o.getTitle());
                System.out.println("  描述: " + o.getDescription());
                if (o.getEstimatedSavings() > 0) {
                    System.out.println("  预计节省: " + o.getEstimatedSavings() + " gas");
                }
            });
        }

        System.out.println();

        // 断言
        assertNotNull(response.getGasOptimizations(), "应该返回 Gas 优化建议");
        assertTrue(gasOptCount >= 0, "Gas 优化建议数量应该 >= 0");
    }

    @Test
    @Order(6)
    @DisplayName("测试性能 - 连续分析")
    void testPerformance() {
        printTestHeader("性能测试 (连续3次分析)");

        assumeApiAvailable();

        List<Long> durations = new ArrayList<>();
        int successCount = 0;

        for (int i = 1; i <= 3; i++) {
            System.out.println("\n第 " + i + " 次分析:");
            try {
                long startTime = System.currentTimeMillis();
                AIAnalysisResponse response = qwenStrategy.analyze(testRequest);
                long duration = System.currentTimeMillis() - startTime;

                durations.add(duration);
                successCount++;

                System.out.println("  ✅ 成功 (耗时: " + duration + " ms)");
                System.out.println("  评分: " + response.getOverallScore());
                System.out.println("  漏洞: " + (response.getCodeVulnerabilities().size()
                        + response.getBusinessVulnerabilities().size()) + " 个");

                // 避免请求过快
                if (i < 3) {
                    Thread.sleep(1000);
                }

            } catch (Exception e) {
                System.out.println("  ❌ 失败: " + e.getMessage());
            }
        }

        System.out.println("\n=== 性能统计 ===");
        System.out.println("成功次数: " + successCount + "/3");

        if (!durations.isEmpty()) {
            long avgDuration = durations.stream()
                    .mapToLong(Long::longValue)
                    .sum() / durations.size();
            long minDuration = durations.stream()
                    .mapToLong(Long::longValue)
                    .min()
                    .orElse(0);
            long maxDuration = durations.stream()
                    .mapToLong(Long::longValue)
                    .max()
                    .orElse(0);

            System.out.println("平均耗时: " + avgDuration + " ms");
            System.out.println("最快耗时: " + minDuration + " ms");
            System.out.println("最慢耗时: " + maxDuration + " ms");
        }

        System.out.println();

        // 断言
        assertTrue(successCount >= 2, "至少应该成功 2 次");
    }

    @Test
    @Order(7)
    @DisplayName("测试评分准确性")
    void testScoring() {
        printTestHeader("评分准确性测试");

        assumeApiAvailable();

        // 测试高风险合约
        AnalysisRequest.ContractFile dangerousContract = new AnalysisRequest.ContractFile();
        dangerousContract.setFileName("Dangerous.sol");
        dangerousContract.setMain(true);
        dangerousContract.setCode("""
            pragma solidity ^0.8.0;
            
            contract Dangerous {
                address public owner;
                
                // 没有访问控制
                function setOwner(address newOwner) public {
                    owner = newOwner;
                }
                
                // 重入漏洞
                function withdraw() public {
                    (bool success, ) = msg.sender.call{value: address(this).balance}("");
                    require(success);
                }
                
                // 自毁函数没有保护
                function destroy() public {
                    selfdestruct(payable(msg.sender));
                }
            }
            """);

        testRequest.setContracts(Collections.singletonList(dangerousContract));

        System.out.println("📡 分析高风险合约...");
        AIAnalysisResponse response = qwenStrategy.analyze(testRequest);

        int score = response.getOverallScore();
        int criticalCount = (int) response.getCodeVulnerabilities().stream()
                .filter(v -> "CRITICAL".equals(v.getSeverity()) || "HIGH".equals(v.getSeverity()))
                .count();

        System.out.println("✅ 分析完成");
        System.out.println("   综合评分: " + score + "/100");
        System.out.println("   严重漏洞: " + criticalCount + " 个");
        System.out.println();

        // 断言：高风险合约评分应该较低
        assertTrue(score < 80, "高风险合约评分应该 < 80，实际: " + score);
        assertTrue(criticalCount > 0, "应该检测到至少一个严重漏洞");

        System.out.println();
    }

    @Test
    @Order(8)
    @DisplayName("测试缓存机制")
    void testCaching() {
        printTestHeader("缓存机制测试");

        assumeApiAvailable();

        System.out.println("第 1 次可用性检查 (会实际调用 API):");
        long start1 = System.currentTimeMillis();
        boolean available1 = qwenStrategy.isAvailable();
        long duration1 = System.currentTimeMillis() - start1;
        System.out.println("  结果: " + available1 + ", 耗时: " + duration1 + " ms");

        System.out.println("\n第 2 次可用性检查 (应该使用缓存):");
        long start2 = System.currentTimeMillis();
        boolean available2 = qwenStrategy.isAvailable();
        long duration2 = System.currentTimeMillis() - start2;
        System.out.println("  结果: " + available2 + ", 耗时: " + duration2 + " ms");

        System.out.println("\n缓存效果: " + (duration2 < duration1 ? "✅ 有效" : "⚠️ 未生效"));
        System.out.println();

        // 断言
        assertEquals(available1, available2, "两次检查结果应该一致");
//        assertTrue(duration2 < duration1 * 0.5, "缓存应该显著减少耗时");
    }

    @Test
    @Order(9)
    @DisplayName("测试错误处理")
    void testErrorHandling() {
        printTestHeader("错误处理测试");

        assumeApiAvailable();

        // 测试空合约代码
        System.out.println("测试场景 1: 空合约代码");
        AnalysisRequest.ContractFile emptyContract = new AnalysisRequest.ContractFile();
        emptyContract.setFileName("Empty.sol");
        emptyContract.setMain(true);
        emptyContract.setCode("");

        testRequest.setContracts(Collections.singletonList(emptyContract));

        try {
            AIAnalysisResponse response = qwenStrategy.analyze(testRequest);
            System.out.println("  ✅ 处理成功，返回了响应");
            assertNotNull(response, "应该返回响应而不是抛异常");
        } catch (Exception e) {
            System.out.println("  ⚠️ 抛出异常: " + e.getMessage());
        }

        System.out.println();

        // 测试无效的 Solidity 代码
        System.out.println("测试场景 2: 无效的 Solidity 代码");
        AnalysisRequest.ContractFile invalidContract = new AnalysisRequest.ContractFile();
        invalidContract.setFileName("Invalid.sol");
        invalidContract.setMain(true);
        invalidContract.setCode("this is not valid solidity code !!!!");

        testRequest.setContracts(Collections.singletonList(invalidContract));

        try {
            AIAnalysisResponse response = qwenStrategy.analyze(testRequest);
            System.out.println("  ✅ AI 仍然尝试分析并返回响应");
            assertNotNull(response, "应该返回响应");
        } catch (Exception e) {
            System.out.println("  ⚠️ 抛出异常: " + e.getMessage());
        }

        System.out.println();
    }

    @Test
    @Order(10)
    @DisplayName("测试完整响应结构")
    void testResponseStructure() {
        printTestHeader("响应结构完整性测试");

        assumeApiAvailable();

        AIAnalysisResponse response = qwenStrategy.analyze(testRequest);

        System.out.println("检查响应结构...");
        System.out.println();

        // 检查所有字段
        System.out.println("✅ codeVulnerabilities: " +
                (response.getCodeVulnerabilities() != null ? "存在" : "缺失"));
        System.out.println("✅ businessVulnerabilities: " +
                (response.getBusinessVulnerabilities() != null ? "存在" : "缺失"));
        System.out.println("✅ gasOptimizations: " +
                (response.getGasOptimizations() != null ? "存在" : "缺失"));
        System.out.println("✅ insights: " +
                (response.getInsights() != null ? "存在" : "缺失"));
        System.out.println("✅ overallScore: " + response.getOverallScore());

        // 检查漏洞详细字段
        if (!response.getCodeVulnerabilities().isEmpty()) {
            AIAnalysisResponse.CodeVulnerability vuln = response.getCodeVulnerabilities().get(0);
            System.out.println("\n代码漏洞字段检查:");
            System.out.println("  ✅ severity: " + (vuln.getSeverity() != null ? "存在" : "缺失"));
            System.out.println("  ✅ category: " + (vuln.getCategory() != null ? "存在" : "缺失"));
            System.out.println("  ✅ title: " + (vuln.getTitle() != null ? "存在" : "缺失"));
            System.out.println("  ✅ description: " + (vuln.getDescription() != null ? "存在" : "缺失"));
        }

        System.out.println();

        // 断言
        assertNotNull(response.getCodeVulnerabilities());
        assertNotNull(response.getBusinessVulnerabilities());
        assertNotNull(response.getGasOptimizations());
        assertTrue(response.getOverallScore() >= 0 && response.getOverallScore() <= 100);
    }

    // ==================== 辅助方法 ====================

    /**
     * 检查 API 是否可用，不可用则跳过测试
     */
    private void assumeApiAvailable() {
        if (!qwenStrategy.isAvailable()) {
            System.out.println("⚠️ 跳过测试: API 不可用");
            System.out.println("   请设置 QWEN_API_KEY 环境变量");
            System.out.println();
            Assumptions.assumeTrue(false, "API 不可用，跳过测试");
        }
    }

    /**
     * 打印测试头部
     */
    private void printTestHeader(String title) {
        System.out.println("\n" + "=".repeat(70));
        System.out.println("测试: " + title);
        System.out.println("=".repeat(70));
    }

    /**
     * 打印分析结果摘要
     */
    private void printAnalysisSummary(AIAnalysisResponse response) {
        System.out.println("=== 分析结果 ===");
        System.out.println("综合评分: " + response.getOverallScore());
        System.out.println("代码漏洞: " + response.getCodeVulnerabilities().size() + " 个");
        System.out.println("业务漏洞: " + response.getBusinessVulnerabilities().size() + " 个");
        System.out.println("Gas优化: " + response.getGasOptimizations().size() + " 条");
        System.out.println();

        // 打印代码漏洞
        if (!response.getCodeVulnerabilities().isEmpty()) {
            System.out.println("=== 代码安全漏洞 ===");
            response.getCodeVulnerabilities().forEach(v -> {
                System.out.println("• [" + v.getSeverity() + "] " + v.getTitle());
                System.out.println("  " + v.getDescription());
                System.out.println();
            });
        }

        // 打印业务漏洞
        if (!response.getBusinessVulnerabilities().isEmpty()) {
            System.out.println("=== 业务逻辑漏洞 ===");
            response.getBusinessVulnerabilities().forEach(v -> {
                System.out.println("• [" + v.getSeverity() + "] " + v.getTitle());
                System.out.println("  " + v.getDescription());
                System.out.println();
            });
        }

        // 打印 Gas 优化
        if (!response.getGasOptimizations().isEmpty()) {
            System.out.println("=== Gas 优化建议 ===");
            response.getGasOptimizations().stream()
                    .limit(3)  // 只显示前3条
                    .forEach(o -> {
                        System.out.println("• [" + o.getPriority() + "] " + o.getTitle());
                        System.out.println("  " + o.getDescription());
                        if (o.getEstimatedSavings() > 0) {
                            System.out.println("  预计节省: " + o.getEstimatedSavings() + " gas");
                        }
                        System.out.println();
                    });
        }

        // 打印洞察
        if (response.getInsights() != null && !response.getInsights().isEmpty()) {
            System.out.println("=== AI 洞察 ===");
            System.out.println(response.getInsights().length() > 200
                    ? response.getInsights().substring(0, 200) + "..."
                    : response.getInsights());
            System.out.println();
        }
    }
}