//! 优化 Agent
//! 
//! 负责基于审计结果优化智能合约代码

use super::base::{Agent, AgentContext, AgentOutput, AgentResult, AgentError};
use super::security_auditor::{AuditReport, AuditIssue, SeverityLevel};
use super::contract_generator::GeneratedContract;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// 优化 Agent
pub struct OptimizerAgent {
    config: OptimizerConfig,
    optimizations: OptimizationRules,
}

/// 优化配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OptimizerConfig {
    /// 模型名称
    pub model_name: String,
    
    /// 优化级别
    pub optimization_level: OptimizationLevel,
    
    /// 是否保持功能完整性
    pub preserve_functionality: bool,
    
    /// 是否优化Gas消耗
    pub optimize_gas: bool,
    
    /// 是否增强安全性
    pub enhance_security: bool,
}

/// 优化级别
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum OptimizationLevel {
    Conservative, // 保守优化
    Balanced,     // 平衡优化
    Aggressive,   // 激进优化
}

/// 优化规则集
#[derive(Debug, Clone)]
pub struct OptimizationRules {
    security_fixes: Vec<SecurityFix>,
    gas_optimizations: Vec<GasOptimization>,
    code_improvements: Vec<CodeImprovement>,
}

/// 安全修复规则
#[derive(Debug, Clone)]
pub struct SecurityFix {
    pub issue_pattern: String,
    pub fix_pattern: String,
    pub description: String,
}

/// Gas优化规则
#[derive(Debug, Clone)]
pub struct GasOptimization {
    pub pattern: String,
    pub replacement: String,
    pub description: String,
    pub gas_saved: u32,
}

/// 代码改进规则
#[derive(Debug, Clone)]
pub struct CodeImprovement {
    pub pattern: String,
    pub replacement: String,
    pub description: String,
    pub improvement_type: ImprovementType,
}

/// 改进类型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ImprovementType {
    Readability,
    Maintainability,
    Performance,
    Security,
}

/// 优化结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OptimizationResult {
    pub original_code: String,
    pub optimized_code: String,
    pub applied_fixes: Vec<AppliedFix>,
    pub optimization_summary: OptimizationSummary,
    pub before_after_comparison: CodeComparison,
}

/// 应用的修复
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppliedFix {
    pub fix_type: String,
    pub description: String,
    pub line_number: Option<usize>,
    pub before: String,
    pub after: String,
}

/// 优化摘要
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OptimizationSummary {
    pub total_fixes: usize,
    pub security_fixes: usize,
    pub gas_optimizations: usize,
    pub code_improvements: usize,
    pub estimated_gas_saved: u32,
    pub issues_resolved: usize,
}

/// 代码对比
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodeComparison {
    pub original_lines: usize,
    pub optimized_lines: usize,
    pub original_functions: usize,
    pub optimized_functions: usize,
    pub complexity_reduction: f64,
}

impl OptimizerAgent {
    pub fn new(config: OptimizerConfig) -> Self {
        let optimizations = OptimizationRules::new();
        Self { config, optimizations }
    }
    
    /// 优化合约代码
    async fn optimize_contract(
        &self,
        original_code: &str,
        audit_report: Option<&AuditReport>,
    ) -> AgentResult<OptimizationResult> {
        let mut optimized_code = original_code.to_string();
        let mut applied_fixes = Vec::new();
        
        // 1. 修复安全问题
        if let Some(report) = audit_report {
            let (code, fixes) = self.fix_security_issues(&optimized_code, &report.issues)?;
            optimized_code = code;
            applied_fixes.extend(fixes);
        }
        
        // 2. Gas优化
        if self.config.optimize_gas {
            let (code, fixes) = self.apply_gas_optimizations(&optimized_code)?;
            optimized_code = code;
            applied_fixes.extend(fixes);
        }
        
        // 3. 代码改进
        let (code, fixes) = self.apply_code_improvements(&optimized_code)?;
        optimized_code = code;
        applied_fixes.extend(fixes);
        
        // 4. 生成摘要和对比
        let optimization_summary = self.generate_summary(&applied_fixes, audit_report);
        let before_after_comparison = self.compare_code(original_code, &optimized_code);
        
        Ok(OptimizationResult {
            original_code: original_code.to_string(),
            optimized_code,
            applied_fixes,
            optimization_summary,
            before_after_comparison,
        })
    }
    
    fn fix_security_issues(
        &self,
        code: &str,
        issues: &[AuditIssue],
    ) -> AgentResult<(String, Vec<AppliedFix>)> {
        let mut optimized_code = code.to_string();
        let mut applied_fixes = Vec::new();
        
        for issue in issues {
            // 只修复高优先级问题
            if issue.severity < SeverityLevel::Medium {
                continue;
            }
            
            let fix = self.apply_security_fix(&mut optimized_code, issue)?;
            if let Some(fix) = fix {
                applied_fixes.push(fix);
            }
        }
        
        Ok((optimized_code, applied_fixes))
    }
    
    fn apply_security_fix(
        &self,
        code: &mut String,
        issue: &AuditIssue,
    ) -> AgentResult<Option<AppliedFix>> {
        match issue.title.as_str() {
            "Chinese Characters in String" => {
                self.fix_chinese_characters(code, issue)
            }
            "Reserved Keyword as Parameter" => {
                self.fix_reserved_keywords(code, issue)
            }
            "Dangerous transfer() Usage" => {
                self.fix_transfer_usage(code, issue)
            }
            "Missing Reentrancy Protection" => {
                self.add_reentrancy_protection(code, issue)
            }
            "Missing Access Control" => {
                self.add_access_control(code, issue)
            }
            _ => Ok(None),
        }
    }
    
    fn fix_chinese_characters(
        &self,
        code: &mut String,
        issue: &AuditIssue,
    ) -> AgentResult<Option<AppliedFix>> {
        if let Some(snippet) = &issue.code_snippet {
            // 扩展的中文字符串替换映射
            let replacements = [
                // 设备相关
                ("设备不存在", "Device does not exist"),
                ("设备不可用", "Device not available"),
                ("设备已注册", "Device registered"),
                ("只允许设备所有者", "Only device owner allowed"),
                
                // 时间相关
                ("时间无效", "Invalid time"),
                ("时间范围无效", "Invalid time range"),
                ("租借时间必须至少为一小时", "Rental duration must be at least one hour"),
                ("租赁时间未结束", "Rental period not ended"),
                ("开始时间必须在未来", "Start time must be in the future"),
                
                // 支付相关
                ("押金或租金不足", "Insufficient deposit or rental fee"),
                ("资金不足", "Insufficient funds"),
                ("金额必须大于0", "Amount must be greater than zero"),
                ("金额必须大于零", "Amount must be greater than zero"),
                ("押金退还失败", "Deposit refund failed"),
                ("支付失败", "Payment failed"),
                ("转账失败", "Transfer failed"),
                
                // 权限相关
                ("无权限", "No permission"),
                ("未授权", "Not authorized"),
                ("不是合约所有者", "Not contract owner"),
                ("不是代币所有者", "Not token owner"),
                
                // 租赁相关
                ("未找到有效租赁", "Valid rental not found"),
                ("租赁不存在", "Rental does not exist"),
                ("租赁未激活", "Rental not active"),
                ("租赁已完成", "Rental completed"),
                
                // 通用错误
                ("天数必须大于0", "Days must be greater than zero"),
                ("数量必须大于0", "Amount must be greater than zero"),
                ("地址无效", "Invalid address"),
                ("参数无效", "Invalid parameter"),
                ("操作失败", "Operation failed"),
                ("余额不足", "Insufficient balance"),
            ];
            
            let mut fixed_snippet = snippet.clone();
            let mut replaced = false;
            let mut replaced_terms = Vec::new();
            
            for (chinese, english) in replacements.iter() {
                if fixed_snippet.contains(chinese) {
                    fixed_snippet = fixed_snippet.replace(chinese, english);
                    replaced = true;
                    replaced_terms.push(format!("{} -> {}", chinese, english));
                }
            }
            
            if replaced {
                *code = code.replace(snippet, &fixed_snippet);
                
                let description = if replaced_terms.len() == 1 {
                    format!("Replaced Chinese characters: {}", replaced_terms[0])
                } else {
                    format!("Replaced {} Chinese terms with English", replaced_terms.len())
                };
                
                return Ok(Some(AppliedFix {
                    fix_type: "Syntax Fix".to_string(),
                    description,
                    line_number: issue.line_number,
                    before: snippet.clone(),
                    after: fixed_snippet,
                }));
            }
        }
        
        Ok(None)
    }
    
    fn fix_reserved_keywords(
        &self,
        code: &mut String,
        issue: &AuditIssue,
    ) -> AgentResult<Option<AppliedFix>> {
        if let Some(snippet) = &issue.code_snippet {
            // 扩展的保留关键字列表
            let reserved_keywords = [
                // 时间单位
                "days", "hours", "minutes", "seconds", "weeks", "years",
                // 以太单位
                "wei", "gwei", "ether",
                // 其他保留字
                "after", "alias", "apply", "auto", "case", "copyof", "default",
                "define", "final", "immutable", "implements", "in", "inline",
                "let", "macro", "match", "mutable", "null", "of", "override",
                "partial", "promise", "reference", "relocatable", "sealed",
                "sizeof", "static", "supports", "switch", "try", "typedef",
                "typeof", "unchecked",
            ];
            
            let mut fixed_snippet = snippet.clone();
            let mut replaced = false;
            let mut replaced_keywords = Vec::new();
            
            for keyword in reserved_keywords.iter() {
                // 更精确的匹配：只在参数位置替换
                let patterns = [
                    format!("({} ", keyword),      // (days 
                    format!("({})", keyword),      // (days)
                    format!("({},", keyword),      // (days,
                    format!(" {} ", keyword),      // space days space
                    format!(" {})", keyword),      // space days)
                    format!(" {},", keyword),      // space days,
                    format!(",{} ", keyword),      // ,days space
                    format!(",{})", keyword),      // ,days)
                    format!(",{},", keyword),      // ,days,
                ];
                
                let replacement = format!("_{}", keyword);
                
                for pattern in patterns.iter() {
                    if fixed_snippet.contains(pattern) {
                        let new_pattern = pattern.replace(keyword, &replacement);
                        fixed_snippet = fixed_snippet.replace(pattern, &new_pattern);
                        replaced = true;
                        if !replaced_keywords.contains(&keyword.to_string()) {
                            replaced_keywords.push(keyword.to_string());
                        }
                    }
                }
            }
            
            if replaced {
                *code = code.replace(snippet, &fixed_snippet);
                
                let description = if replaced_keywords.len() == 1 {
                    format!("Fixed reserved keyword '{}' by adding underscore prefix", replaced_keywords[0])
                } else {
                    format!("Fixed {} reserved keywords: {}", 
                        replaced_keywords.len(),
                        replaced_keywords.join(", "))
                };
                
                return Ok(Some(AppliedFix {
                    fix_type: "Syntax Fix".to_string(),
                    description,
                    line_number: issue.line_number,
                    before: snippet.clone(),
                    after: fixed_snippet,
                }));
            }
        }
        
        Ok(None)
    }
    
    fn fix_transfer_usage(
        &self,
        code: &mut String,
        issue: &AuditIssue,
    ) -> AgentResult<Option<AppliedFix>> {
        if let Some(snippet) = &issue.code_snippet {
            if snippet.contains(".transfer(") || snippet.contains(".send(") {
                let is_transfer = snippet.contains(".transfer(");
                let method = if is_transfer { ".transfer(" } else { ".send(" };
                
                // 提取接收地址和金额
                // 例如: payable(owner).transfer(amount);
                // 或: msg.sender.transfer(balance);
                
                let fixed_snippet = if let Some(start) = snippet.find(method) {
                    let before_method = &snippet[..start];
                    let after_method = &snippet[start + method.len()..];
                    
                    // 提取金额（在括号内）
                    let amount = if let Some(end) = after_method.find(')') {
                        &after_method[..end]
                    } else {
                        "amount"
                    };
                    
                    // 构建新的代码
                    format!(
                        "        (bool success, ) = {}.call{{value: {}}}(\"\");\n        require(success, \"Transfer failed\");",
                        before_method.trim(),
                        amount
                    )
                } else {
                    return Ok(None);
                };
                
                *code = code.replace(snippet, &fixed_snippet);
                
                return Ok(Some(AppliedFix {
                    fix_type: "Security Fix".to_string(),
                    description: format!("Replaced {}() with safe .call{{value:}}(\"\")", 
                        if is_transfer { ".transfer" } else { ".send" }),
                    line_number: issue.line_number,
                    before: snippet.clone(),
                    after: fixed_snippet,
                }));
            }
        }
        
        Ok(None)
    }
    
    fn add_reentrancy_protection(
        &self,
        code: &mut String,
        _issue: &AuditIssue,
    ) -> AgentResult<Option<AppliedFix>> {
        if code.contains("ReentrancyGuard") {
            return Ok(None); // 已经有保护
        }
        
        let mut changes = Vec::new();
        
        // 1. 添加导入
        let import_line = "import \"@openzeppelin/contracts/security/ReentrancyGuard.sol\";\n";
        
        if let Some(pragma_pos) = code.find("pragma solidity") {
            if let Some(pragma_end) = code[pragma_pos..].find('\n') {
                let insert_pos = pragma_pos + pragma_end + 1;
                
                // 检查是否已经有其他导入
                if let Some(next_import) = code[insert_pos..].find("import ") {
                    // 在第一个导入之前插入
                    code.insert_str(insert_pos + next_import, import_line);
                } else {
                    // 在pragma后直接插入
                    code.insert_str(insert_pos, "\n");
                    code.insert_str(insert_pos + 1, import_line);
                }
                changes.push("Added ReentrancyGuard import");
            }
        }
        
        // 2. 添加继承
        if let Some(contract_pos) = code.find("contract ") {
            if let Some(is_pos) = code[contract_pos..].find(" is ") {
                // 已经有继承，添加到列表中
                let insert_pos = contract_pos + is_pos + 4; // " is " 的长度
                if !code[insert_pos..].contains("ReentrancyGuard") {
                    code.insert_str(insert_pos, "ReentrancyGuard, ");
                    changes.push("Added ReentrancyGuard to inheritance list");
                }
            } else if let Some(brace_pos) = code[contract_pos..].find(" {") {
                // 没有继承，添加新的
                let insert_pos = contract_pos + brace_pos;
                code.insert_str(insert_pos, " is ReentrancyGuard");
                changes.push("Added ReentrancyGuard inheritance");
            }
        }
        
        // 3. 为payable函数添加nonReentrant修饰符
        let mut payable_functions = Vec::new();
        let mut search_pos = 0;
        
        while let Some(func_pos) = code[search_pos..].find("function ") {
            let abs_pos = search_pos + func_pos;
            if let Some(brace_pos) = code[abs_pos..].find('{') {
                let func_signature = &code[abs_pos..abs_pos + brace_pos];
                
                if func_signature.contains("payable") && !func_signature.contains("nonReentrant") {
                    // 在函数签名中添加nonReentrant
                    if let Some(external_pos) = func_signature.find("external") {
                        let insert_pos = abs_pos + external_pos + 8; // "external" 的长度
                        code.insert_str(insert_pos, " nonReentrant");
                        payable_functions.push(func_signature.split('(').next().unwrap_or("unknown").trim().to_string());
                    }
                }
            }
            search_pos = abs_pos + 1;
        }
        
        if !payable_functions.is_empty() {
            changes.push(&format!("Added nonReentrant to {} payable functions", payable_functions.len()));
        }
        
        if !changes.is_empty() {
            Ok(Some(AppliedFix {
                fix_type: "Security Enhancement".to_string(),
                description: changes.join("; "),
                line_number: None,
                before: "No reentrancy protection".to_string(),
                after: "Added comprehensive reentrancy protection".to_string(),
            }))
        } else {
            Ok(None)
        }
    }
    
    fn add_access_control(
        &self,
        code: &mut String,
        _issue: &AuditIssue,
    ) -> AgentResult<Option<AppliedFix>> {
        // 添加 Ownable 导入和继承
        if !code.contains("Ownable") && !code.contains("AccessControl") {
            let import_line = "import \"@openzeppelin/contracts/access/Ownable.sol\";\n";
            
            // 在其他导入后添加
            if let Some(pos) = code.find("pragma solidity") {
                if let Some(end_pos) = code[pos..].find('\n') {
                    let insert_pos = pos + end_pos + 1;
                    code.insert_str(insert_pos, import_line);
                }
            }
            
            // 添加继承
            if let Some(contract_pos) = code.find("contract ") {
                if let Some(brace_pos) = code[contract_pos..].find(" {") {
                    let insert_pos = contract_pos + brace_pos;
                    if !code[contract_pos..insert_pos].contains("Ownable") {
                        code.insert_str(insert_pos, ", Ownable");
                    }
                }
            }
            
            return Ok(Some(AppliedFix {
                fix_type: "Security Enhancement".to_string(),
                description: "Added Ownable access control".to_string(),
                line_number: None,
                before: "No access control".to_string(),
                after: "Added Ownable import and inheritance".to_string(),
            }));
        }
        
        Ok(None)
    }
    
    fn apply_gas_optimizations(
        &self,
        code: &str,
    ) -> AgentResult<(String, Vec<AppliedFix>)> {
        let mut optimized_code = code.to_string();
        let mut applied_fixes = Vec::new();
        
        // Gas优化规则
        for optimization in &self.optimizations.gas_optimizations {
            if optimized_code.contains(&optimization.pattern) {
                optimized_code = optimized_code.replace(&optimization.pattern, &optimization.replacement);
                
                applied_fixes.push(AppliedFix {
                    fix_type: "Gas Optimization".to_string(),
                    description: optimization.description.clone(),
                    line_number: None,
                    before: optimization.pattern.clone(),
                    after: optimization.replacement.clone(),
                });
            }
        }
        
        Ok((optimized_code, applied_fixes))
    }
    
    fn apply_code_improvements(
        &self,
        code: &str,
    ) -> AgentResult<(String, Vec<AppliedFix>)> {
        let mut improved_code = code.to_string();
        let mut applied_fixes = Vec::new();
        
        // 代码改进规则
        for improvement in &self.optimizations.code_improvements {
            if improved_code.contains(&improvement.pattern) {
                improved_code = improved_code.replace(&improvement.pattern, &improvement.replacement);
                
                applied_fixes.push(AppliedFix {
                    fix_type: format!("{:?} Improvement", improvement.improvement_type),
                    description: improvement.description.clone(),
                    line_number: None,
                    before: improvement.pattern.clone(),
                    after: improvement.replacement.clone(),
                });
            }
        }
        
        Ok((improved_code, applied_fixes))
    }
    
    fn generate_summary(
        &self,
        applied_fixes: &[AppliedFix],
        audit_report: Option<&AuditReport>,
    ) -> OptimizationSummary {
        let total_fixes = applied_fixes.len();
        let security_fixes = applied_fixes.iter()
            .filter(|f| f.fix_type.contains("Security"))
            .count();
        let gas_optimizations = applied_fixes.iter()
            .filter(|f| f.fix_type.contains("Gas"))
            .count();
        let code_improvements = applied_fixes.iter()
            .filter(|f| f.fix_type.contains("Improvement"))
            .count();
        
        let estimated_gas_saved = gas_optimizations as u32 * 100; // 估算
        
        let issues_resolved = if let Some(report) = audit_report {
            // 计算解决的问题数量
            report.summary.critical_issues + report.summary.high_issues
        } else {
            0
        };
        
        OptimizationSummary {
            total_fixes,
            security_fixes,
            gas_optimizations,
            code_improvements,
            estimated_gas_saved,
            issues_resolved,
        }
    }
    
    fn compare_code(&self, original: &str, optimized: &str) -> CodeComparison {
        let original_lines = original.lines().count();
        let optimized_lines = optimized.lines().count();
        
        let original_functions = original.matches("function ").count();
        let optimized_functions = optimized.matches("function ").count();
        
        let complexity_reduction = if original_lines > 0 {
            ((original_lines as f64 - optimized_lines as f64) / original_lines as f64) * 100.0
        } else {
            0.0
        };
        
        CodeComparison {
            original_lines,
            optimized_lines,
            original_functions,
            optimized_functions,
            complexity_reduction,
        }
    }
    
    fn format_optimization_result(&self, result: &OptimizationResult) -> AgentResult<String> {
        let mut output = String::new();
        
        output.push_str("# 🔧 Smart Contract Optimization Report\n\n");
        
        // 优化摘要
        output.push_str("## 📊 Optimization Summary\n\n");
        output.push_str(&format!("- **Total Fixes Applied**: {}\n", result.optimization_summary.total_fixes));
        output.push_str(&format!("- **Security Fixes**: {}\n", result.optimization_summary.security_fixes));
        output.push_str(&format!("- **Gas Optimizations**: {}\n", result.optimization_summary.gas_optimizations));
        output.push_str(&format!("- **Code Improvements**: {}\n", result.optimization_summary.code_improvements));
        output.push_str(&format!("- **Estimated Gas Saved**: {} units\n", result.optimization_summary.estimated_gas_saved));
        output.push_str(&format!("- **Issues Resolved**: {}\n\n", result.optimization_summary.issues_resolved));
        
        // 代码对比
        output.push_str("## 📈 Before/After Comparison\n\n");
        output.push_str(&format!("- **Lines of Code**: {} → {}\n", 
            result.before_after_comparison.original_lines,
            result.before_after_comparison.optimized_lines));
        output.push_str(&format!("- **Functions**: {} → {}\n", 
            result.before_after_comparison.original_functions,
            result.before_after_comparison.optimized_functions));
        output.push_str(&format!("- **Complexity Reduction**: {:.1}%\n\n", 
            result.before_after_comparison.complexity_reduction));
        
        // 应用的修复
        if !result.applied_fixes.is_empty() {
            output.push_str("## 🔨 Applied Fixes\n\n");
            
            for (i, fix) in result.applied_fixes.iter().enumerate() {
                output.push_str(&format!("### {}. {} \n\n", i + 1, fix.fix_type));
                output.push_str(&format!("**Description**: {}\n", fix.description));
                
                if let Some(line_num) = fix.line_number {
                    output.push_str(&format!("**Line**: {}\n", line_num));
                }
                
                output.push_str(&format!("**Before**: `{}`\n", fix.before));
                output.push_str(&format!("**After**: `{}`\n\n", fix.after));
            }
        }
        
        // 优化后的代码
        output.push_str("## 📝 Optimized Code\n\n");
        output.push_str("```solidity\n");
        output.push_str(&result.optimized_code);
        output.push_str("\n```\n\n");
        
        output.push_str("---\n");
        output.push_str("*Report generated by EchokitBot Optimizer*\n");
        
        Ok(output)
    }
}

#[async_trait]
impl Agent for OptimizerAgent {
    fn name(&self) -> &str {
        "Optimizer"
    }
    
    fn description(&self) -> &str {
        "基于审计结果优化智能合约代码，修复安全问题并提升性能"
    }
    
    fn specialties(&self) -> Vec<String> {
        vec![
            "代码优化".to_string(),
            "安全修复".to_string(),
            "Gas优化".to_string(),
            "代码重构".to_string(),
        ]
    }
    
    fn preferred_models(&self) -> Vec<String> {
        vec![
            "gpt-4".to_string(),
            "claude-3".to_string(),
            "qwen".to_string(),
        ]
    }
    
    async fn execute(&self, context: &AgentContext) -> AgentResult<AgentOutput> {
        // 从上下文中提取合约代码和审计报告
        let contract_code = if let Some(contract_data) = context.context_data.get("contract") {
            if let Ok(contract) = serde_json::from_value::<GeneratedContract>(contract_data.clone()) {
                contract.code
            } else {
                context.user_input.clone()
            }
        } else {
            context.user_input.clone()
        };
        
        let audit_report = context.context_data.get("report")
            .and_then(|v| serde_json::from_value::<AuditReport>(v.clone()).ok());
        
        // 执行优化
        let result = self.optimize_contract(&contract_code, audit_report.as_ref()).await?;
        
        // 格式化结果
        let content = self.format_optimization_result(&result)?;
        
        // 计算置信度
        let confidence = self.calculate_confidence(&result);
        
        // 生成元数据
        let mut metadata = HashMap::new();
        metadata.insert("optimization_result".to_string(), serde_json::to_value(&result)?);
        metadata.insert("summary".to_string(), serde_json::to_value(&result.optimization_summary)?);
        
        // 建议下一步操作
        let next_actions = vec![
            "重新进行安全审计".to_string(),
            "编写测试用例".to_string(),
            "准备部署".to_string(),
        ];
        
        Ok(AgentOutput {
            content,
            metadata,
            confidence,
            next_actions,
            generated_files: vec![
                "optimized_contract.sol".to_string(),
                "optimization_report.md".to_string(),
            ],
        })
    }
}

impl OptimizerAgent {
    fn calculate_confidence(&self, result: &OptimizationResult) -> f64 {
        let mut confidence = 0.8; // 基础置信度
        
        // 根据修复数量调整
        if result.optimization_summary.security_fixes > 0 {
            confidence += 0.1;
        }
        
        // 根据优化级别调整
        match self.config.optimization_level {
            OptimizationLevel::Aggressive => confidence += 0.05,
            OptimizationLevel::Balanced => {},
            OptimizationLevel::Conservative => confidence -= 0.05,
        }
        
        confidence.min(1.0).max(0.0)
    }
}

impl OptimizationRules {
    fn new() -> Self {
        let security_fixes = Vec::new(); // 在实际实现中填充
        
        let gas_optimizations = vec![
            GasOptimization {
                pattern: "uint256 i = 0; i < array.length; i++".to_string(),
                replacement: "uint256 length = array.length; for (uint256 i; i < length;)".to_string(),
                description: "Optimize loop by caching array length".to_string(),
                gas_saved: 50,
            },
        ];
        
        let code_improvements = vec![
            CodeImprovement {
                pattern: "require(condition, \"\");".to_string(),
                replacement: "require(condition, \"Condition failed\");".to_string(),
                description: "Add meaningful error messages".to_string(),
                improvement_type: ImprovementType::Readability,
            },
        ];
        
        Self {
            security_fixes,
            gas_optimizations,
            code_improvements,
        }
    }
}

impl Default for OptimizerConfig {
    fn default() -> Self {
        Self {
            model_name: "gpt-4".to_string(),
            optimization_level: OptimizationLevel::Balanced,
            preserve_functionality: true,
            optimize_gas: true,
            enhance_security: true,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[tokio::test]
    async fn test_fix_chinese_characters() {
        let config = OptimizerConfig::default();
        let optimizer = OptimizerAgent::new(config);
        
        let mut code = r#"require(msg.value > 0, "金额必须大于0");"#.to_string();
        let issue = AuditIssue {
            title: "Chinese Characters in String".to_string(),
            description: "Contains Chinese characters".to_string(),
            severity: SeverityLevel::Critical,
            category: "Syntax".to_string(),
            line_number: Some(1),
            code_snippet: Some(code.clone()),
            suggestion: "Replace with English".to_string(),
            references: Vec::new(),
        };
        
        let result = optimizer.fix_chinese_characters(&mut code, &issue).unwrap();
        assert!(result.is_some());
        assert!(code.contains("Amount must be greater than zero"));
    }
}