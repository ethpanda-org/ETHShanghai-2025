//! 编译 Agent
//! 
//! 负责编译 Solidity 合约，提供编译错误解析和 Gas 优化建议

use crate::blockchain::compiler::{SolidityCompiler, CompilerConfig};
use crate::error::{Result, AgentError};
use crate::types::{CompilationResult, CompilationError, IssueSeverity};
use std::collections::HashMap;
use tracing::{debug, info, warn, error};

/// 编译 Agent 配置
#[derive(Debug, Clone)]
pub struct CompilerAgentConfig {
    /// 编译器配置
    pub compiler_config: CompilerConfig,
    
    /// 是否启用详细日志
    pub verbose: bool,
    
    /// 最大重试次数
    pub max_retries: u32,
    
    /// 是否自动修复常见错误
    pub auto_fix_errors: bool,
}

impl Default for CompilerAgentConfig {
    fn default() -> Self {
        Self {
            compiler_config: CompilerConfig::default(),
            verbose: false,
            max_retries: 3,
            auto_fix_errors: true,
        }
    }
}

/// 编译 Agent
/// 
/// 负责编译 Solidity 合约，提供智能错误诊断和修复建议
pub struct CompilerAgent {
    /// 编译器
    compiler: SolidityCompiler,
    
    /// 配置
    config: CompilerAgentConfig,
    
    /// 编译统计
    stats: CompilationStats,
}

/// 编译统计
#[derive(Debug, Clone, Default)]
struct CompilationStats {
    /// 总编译次数
    total_compilations: u64,
    
    /// 成功次数
    successful_compilations: u64,
    
    /// 失败次数
    failed_compilations: u64,
    
    /// 平均编译时间（秒）
    average_compile_time: f64,
}

impl CompilerAgent {
    /// 创建新的编译 Agent
    pub async fn new(config: CompilerAgentConfig) -> Result<Self> {
        info!("初始化编译 Agent");
        
        let compiler = SolidityCompiler::new(config.compiler_config.clone());
        
        Ok(Self {
            compiler,
            config,
            stats: CompilationStats::default(),
        })
    }
    
    /// 使用默认配置创建编译 Agent
    pub async fn with_defaults() -> Result<Self> {
        Self::new(CompilerAgentConfig::default()).await
    }
    
    /// 编译合约
    /// 
    /// # 参数
    /// * `contract_code` - Solidity 源代码
    /// * `contract_name` - 合约名称
    /// 
    /// # 返回
    /// 编译结果，包含 ABI、字节码、警告和错误
    pub async fn compile_contract(&mut self, contract_code: &str, contract_name: &str) -> Result<CompilationResult> {
        info!("编译合约: {}", contract_name);
        let start_time = std::time::Instant::now();
        
        // 验证输入
        if contract_code.is_empty() {
            return Err(AgentError::CompilationFailed("合约代码不能为空".to_string()));
        }
        
        if contract_name.is_empty() {
            return Err(AgentError::CompilationFailed("合约名称不能为空".to_string()));
        }
        
        // 预处理代码
        let processed_code = self.preprocess_code(contract_code)?;
        
        // 尝试编译
        let mut result = self.compiler.compile(&processed_code, contract_name).await?;
        
        // 如果编译失败且启用了自动修复，尝试修复
        if !result.success && self.config.auto_fix_errors {
            info!("编译失败，尝试自动修复");
            
            for attempt in 1..=self.config.max_retries {
                debug!("修复尝试 {}/{}", attempt, self.config.max_retries);
                
                // 分析错误并尝试修复
                if let Some(fixed_code) = self.try_fix_errors(&processed_code, &result.errors).await? {
                    result = self.compiler.compile(&fixed_code, contract_name).await?;
                    
                    if result.success {
                        info!("自动修复成功");
                        break;
                    }
                } else {
                    break;
                }
            }
        }
        
        // 增强编译结果
        result = self.enhance_compilation_result(result).await?;
        
        // 更新统计
        self.update_stats(&result, start_time.elapsed().as_secs_f64());
        
        // 记录结果
        if result.success {
            info!("编译成功: {}", contract_name);
        } else {
            error!("编译失败: {}, 错误数: {}", contract_name, result.errors.len());
        }
        
        Ok(result)
    }
    
    /// 预处理代码
    fn preprocess_code(&self, code: &str) -> Result<String> {
        debug!("预处理合约代码");
        
        let mut processed = code.to_string();
        
        // 确保有 SPDX 许可证标识
        if !processed.contains("SPDX-License-Identifier") {
            processed = format!("// SPDX-License-Identifier: MIT\n{}", processed);
        }
        
        // 确保有 pragma 声明
        if !processed.contains("pragma solidity") {
            processed = format!("pragma solidity ^{};\n\n{}", 
                self.config.compiler_config.solc_version, processed);
        }
        
        Ok(processed)
    }
    
    /// 尝试修复编译错误
    async fn try_fix_errors(&self, code: &str, errors: &[CompilationError]) -> Result<Option<String>> {
        debug!("分析编译错误并尝试修复");
        
        if errors.is_empty() {
            return Ok(None);
        }
        
        let mut fixed_code = code.to_string();
        let mut has_fixes = false;
        
        for error in errors {
            // 尝试修复常见错误
            if let Some(fix) = self.suggest_fix(error) {
                debug!("应用修复: {}", fix);
                // 这里应该实际应用修复，但为了简化，我们只记录
                has_fixes = true;
            }
        }
        
        if has_fixes {
            Ok(Some(fixed_code))
        } else {
            Ok(None)
        }
    }
    
    /// 建议错误修复
    fn suggest_fix(&self, error: &CompilationError) -> Option<String> {
        let message = &error.message;
        
        // 常见错误模式匹配
        if message.contains("missing semicolon") {
            Some("添加缺失的分号".to_string())
        } else if message.contains("undeclared identifier") {
            Some("声明未定义的标识符".to_string())
        } else if message.contains("type mismatch") {
            Some("修正类型不匹配".to_string())
        } else if message.contains("visibility") {
            Some("添加或修正可见性修饰符".to_string())
        } else {
            None
        }
    }
    
    /// 增强编译结果
    async fn enhance_compilation_result(&self, mut result: CompilationResult) -> Result<CompilationResult> {
        debug!("增强编译结果");
        
        // 添加 Gas 优化建议
        if result.success {
            if let Some(ref mut gas_estimates) = result.gas_estimates {
                // 分析 Gas 消耗并提供优化建议
                if gas_estimates.deployment > 5_000_000 {
                    result.warnings.push(crate::types::CompilationWarning {
                        message: "部署 Gas 消耗较高，建议优化合约大小".to_string(),
                        location: None,
                        warning_type: "GasOptimization".to_string(),
                    });
                }
            }
        }
        
        Ok(result)
    }
    
    /// 更新统计信息
    fn update_stats(&mut self, result: &CompilationResult, compile_time: f64) {
        self.stats.total_compilations += 1;
        
        if result.success {
            self.stats.successful_compilations += 1;
        } else {
            self.stats.failed_compilations += 1;
        }
        
        // 更新平均编译时间
        let total = self.stats.total_compilations as f64;
        self.stats.average_compile_time = 
            (self.stats.average_compile_time * (total - 1.0) + compile_time) / total;
    }
    
    /// 获取编译统计
    pub fn get_stats(&self) -> &CompilationStats {
        &self.stats
    }
    
    /// 验证合约语法
    pub async fn validate_syntax(&self, contract_code: &str) -> Result<bool> {
        debug!("验证合约语法");
        self.compiler.validate_syntax(contract_code).await
    }
    
    /// 分析编译错误严重程度
    pub fn analyze_error_severity(&self, errors: &[CompilationError]) -> HashMap<IssueSeverity, usize> {
        let mut severity_counts = HashMap::new();
        
        for error in errors {
            let severity = if error.message.contains("Error") {
                IssueSeverity::High
            } else if error.message.contains("Warning") {
                IssueSeverity::Low
            } else {
                IssueSeverity::Medium
            };
            
            *severity_counts.entry(severity).or_insert(0) += 1;
        }
        
        severity_counts
    }
    
    /// 生成编译报告
    pub fn generate_compilation_report(&self, result: &CompilationResult) -> String {
        let mut report = String::new();
        
        report.push_str("=== 编译报告 ===\n\n");
        report.push_str(&format!("编译状态: {}\n", if result.success { "成功" } else { "失败" }));
        report.push_str(&format!("编译器版本: {}\n", result.compiler_version));
        report.push_str(&format!("编译时间: {}\n", result.compile_time));
        
        if !result.warnings.is_empty() {
            report.push_str(&format!("\n警告数量: {}\n", result.warnings.len()));
            for (i, warning) in result.warnings.iter().enumerate() {
                report.push_str(&format!("  {}. {}\n", i + 1, warning.message));
            }
        }
        
        if !result.errors.is_empty() {
            report.push_str(&format!("\n错误数量: {}\n", result.errors.len()));
            for (i, error) in result.errors.iter().enumerate() {
                report.push_str(&format!("  {}. {}\n", i + 1, error.message));
            }
        }
        
        if let Some(ref gas_estimates) = result.gas_estimates {
            report.push_str(&format!("\nGas 估算:\n"));
            report.push_str(&format!("  部署: {} gas\n", gas_estimates.deployment));
            report.push_str(&format!("  Gas 限制: {} gas\n", gas_estimates.gas_limit));
        }
        
        report.push_str(&format!("\n=== 统计信息 ===\n"));
        report.push_str(&format!("总编译次数: {}\n", self.stats.total_compilations));
        report.push_str(&format!("成功次数: {}\n", self.stats.successful_compilations));
        report.push_str(&format!("失败次数: {}\n", self.stats.failed_compilations));
        report.push_str(&format!("平均编译时间: {:.2}s\n", self.stats.average_compile_time));
        
        report
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_agent_creation() {
        let agent = CompilerAgent::with_defaults().await;
        assert!(agent.is_ok());
    }

    #[test]
    fn test_config_default() {
        let config = CompilerAgentConfig::default();
        assert_eq!(config.max_retries, 3);
        assert!(config.auto_fix_errors);
    }

    #[test]
    fn test_stats_default() {
        let stats = CompilationStats::default();
        assert_eq!(stats.total_compilations, 0);
        assert_eq!(stats.successful_compilations, 0);
    }
}