package com.contractguard.security.service.ai;

import com.contractguard.security.annotation.AIStrategy;
import com.contractguard.security.annotation.AIStrategyType;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import java.util.*;
import java.util.stream.Collectors;

/**
 * AI策略工厂 - 基于注解自动扫描
 */
@Component
@Slf4j
public class AIStrategyFactory {

    @Value("${ai.strategy:claude}")
    private String defaultStrategy;

    @Autowired
    private ApplicationContext applicationContext;

    private Map<AIStrategyType, AIAnalysisStrategy> strategyMap = new HashMap<>();

    /**
     * 初始化 - 扫描所有带@AIStrategy注解的Bean
     */
    @PostConstruct
    public void init() {
        log.info("🔍 开始扫描AI策略...");

        // 获取所有带@AIStrategy注解的Bean
        Map<String, Object> beans = applicationContext.getBeansWithAnnotation(AIStrategy.class);

        List<StrategyHolder> holders = new ArrayList<>();

        for (Object bean : beans.values()) {
            if (bean instanceof AIAnalysisStrategy) {
                AIStrategy annotation = bean.getClass().getAnnotation(AIStrategy.class);
                holders.add(new StrategyHolder(
                        annotation.value(),
                        annotation.priority(),
                        (AIAnalysisStrategy) bean
                ));
            }
        }

        // 按优先级排序
        holders.sort(Comparator.comparingInt(h -> h.priority));

        // 构建策略Map
        for (StrategyHolder holder : holders) {
            strategyMap.put(holder.type, holder.strategy);
            log.info("✅ 注册AI策略: {} (优先级: {}, 可用: {})",
                    holder.type.getDisplayName(),
                    holder.priority,
                    holder.strategy.isAvailable());
        }

        log.info("🎯 共注册 {} 个AI策略", strategyMap.size());
    }

    /**
     * 获取AI策略
     * @param strategyName 策略名称 (claude/chatgpt/deepseek)
     */
    public AIAnalysisStrategy getStrategy(String strategyName) {
        AIStrategyType targetType;

        try {
            // 解析策略类型
            targetType = strategyName != null ?
                    AIStrategyType.fromCode(strategyName) :
                    AIStrategyType.fromCode(defaultStrategy);

            log.info("🎯 请求AI策略: {}", targetType.getDisplayName());

            // 尝试获取指定策略
            AIAnalysisStrategy strategy = strategyMap.get(targetType);
            if (strategy != null && strategy.isAvailable()) {
                log.info("✅ 使用AI策略: {}", targetType.getDisplayName());
                return strategy;
            }

            log.warn("⚠️ AI策略 {} 不可用,尝试备用策略", targetType.getDisplayName());

        } catch (IllegalArgumentException e) {
            log.warn("⚠️ 未知的策略名称: {}, 使用默认策略", strategyName);
        }

        // 按优先级查找可用策略
        return strategyMap.values().stream()
                .filter(AIAnalysisStrategy::isAvailable)
                .findFirst()
                .orElseThrow(() -> new RuntimeException("❌ 没有可用的AI策略,请检查配置"));
    }

    /**
     * 根据类型获取策略
     */
    public AIAnalysisStrategy getStrategy(AIStrategyType type) {
        AIAnalysisStrategy strategy = strategyMap.get(type);
        if (strategy != null && strategy.isAvailable()) {
            return strategy;
        }

        // 返回任何可用的策略
        return strategyMap.values().stream()
                .filter(AIAnalysisStrategy::isAvailable)
                .findFirst()
                .orElseThrow(() -> new RuntimeException("没有可用的AI策略"));
    }

    /**
     * 获取所有可用的策略
     */
    public List<String> getAvailableStrategies() {
        return strategyMap.entrySet().stream()
                .filter(entry -> entry.getValue().isAvailable())
                .map(entry -> entry.getKey().getCode())
                .collect(Collectors.toList());
    }

    /**
     * 获取策略详情
     */
    public Map<String, Object> getStrategyInfo() {
        Map<String, Object> info = new HashMap<>();

        List<Map<String, Object>> strategies = new ArrayList<>();
        for (Map.Entry<AIStrategyType, AIAnalysisStrategy> entry : strategyMap.entrySet()) {
            Map<String, Object> strategyInfo = new HashMap<>();
            strategyInfo.put("code", entry.getKey().getCode());
            strategyInfo.put("name", entry.getKey().getDisplayName());
            strategyInfo.put("available", entry.getValue().isAvailable());
            strategies.add(strategyInfo);
        }

        info.put("defaultStrategy", defaultStrategy);
        info.put("totalStrategies", strategyMap.size());
        info.put("strategies", strategies);

        return info;
    }

    /**
     * 策略持有者
     */
    private static class StrategyHolder {
        AIStrategyType type;
        int priority;
        AIAnalysisStrategy strategy;

        StrategyHolder(AIStrategyType type, int priority, AIAnalysisStrategy strategy) {
            this.type = type;
            this.priority = priority;
            this.strategy = strategy;
        }
    }
}