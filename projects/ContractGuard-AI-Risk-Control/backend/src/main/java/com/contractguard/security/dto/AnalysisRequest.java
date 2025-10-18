package com.contractguard.security.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.List;

/**
 * 合约分析请求
 */
@Data
public class AnalysisRequest {

    @NotEmpty(message = "合约文件列表不能为空")
    private List<ContractFile> contracts;

    @NotNull(message = "业务上下文不能为空")  // ✅ 改为 @NotNull
    @Valid  // ✅ 添加这个，验证内部字段
    private BusinessContext businessContext;

    // 分析类型: security(安全), gas(Gas优化), business(业务逻辑), all(全部)
    private String analysisType = "all";

    // AI策略选择: claude, chatgpt, deepseek等 (可选,不填使用默认)
    private String aiStrategy;

    /**
     * 合约文件
     */
    @Data
    public static class ContractFile {
        @NotBlank(message = "文件名不能为空")
        private String fileName;

        @NotBlank(message = "合约代码不能为空")
        private String code;

        private boolean isMain = false;
    }

    /**
     * 业务上下文
     */
    @Data
    public static class BusinessContext {
        @NotBlank(message = "项目名称不能为空")
        private String projectName;

        private String businessType;

        @NotBlank(message = "业务描述不能为空")
        private String businessDescription;

        @NotBlank(message = "预期行为不能为空")
        private String expectedBehavior;

        private String securityRequirements;
    }
}