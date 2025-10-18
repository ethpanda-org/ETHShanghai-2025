package com.contractguard.security.annotation;

/**
 * AI策略类型枚举
 */
public enum AIStrategyType {
    AGENTROUTER("agentrouter", "AgentRouter", "免费AI聚合服务,无需邀请码"),
    ANYROUTER("anyrouter", "AnyRouter", "AI聚合服务,需要linux.do邀请码"),
    CLAUDE("claude", "Claude", "Anthropic Claude AI"),
    CHATGPT("chatgpt", "ChatGPT", "OpenAI GPT模型"),
    DEEPSEEK("deepseek", "DeepSeek", "DeepSeek AI模型"),
    GEMINI("gemini", "Gemini", "Google Gemini,完全免费,每天1500次"),
    QWEN("qwen", "通义千问", "阿里云AI,新用户送100万tokens");

    private final String code;
    private final String displayName;
    private final String description;

    AIStrategyType(String code, String displayName, String description) {
        this.code = code;
        this.displayName = displayName;
        this.description = description;
    }

    public String getCode() {
        return code;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getDescription() {
        return description;
    }

    /**
     * 根据code获取策略类型
     */
    public static AIStrategyType fromCode(String code) {
        for (AIStrategyType type : values()) {
            if (type.code.equalsIgnoreCase(code)) {
                return type;
            }
        }
        throw new IllegalArgumentException("Unknown strategy code: " + code);
    }
}