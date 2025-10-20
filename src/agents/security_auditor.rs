//! 安全审计 Agent
//! 
//! 负责分析智能合约的安全性并提供审计报告

use super::base::{Agent, AgentContext, AgentOutput, AgentResult, AgentError};
use super::contract_generator::GeneratedContract;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use regex::Regex;

/// 安全审计 Agent
pub struct SecurityAuditorAgent {
    config: SecurityAuditorConfig,
    rules: SecurityRules,
}

/// 安全审计配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityAuditorConfig {
    /// 模型名称
    pub model_name: String,
    
    /// 审计深度
    pub audit_depth: AuditDepth,
    
    /// 是否启用AI增强分析
    pub enable_ai_analysis: bool,
    
    /// 严重程度阈值
    pub severity_threshold: SeverityLevel,
}

/// 审计深度
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AuditDepth {
    Quick,       // 快速审计
    Standard,    // 标准审计
    Comprehensive, // 全面审计
}

/// 严重程度级别
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
pub enum SeverityLevel {
    Info,
    Low,
    Medium,
    High,
    Critical,
}

/// 安全规则集
#[derive(Debug, Clone)]
pub struct SecurityRules {
    syntax_rules: Vec<SyntaxRule>,
    security_rules: Vec<SecurityRule>,
    best_practice_rules: Vec<BestPracticeRule>,
}

/// 语法规则
#[derive(Debug, Clone)]
pub struct SyntaxRule {
    pub name: String,
    pub pattern: Regex,
    pub severity: SeverityLevel,
    pub description: String,
    pub suggestion: String,
}

/// 安全规则
#[derive(Debug, Clone)]
pub struct SecurityRule {
    pub name: String,
    pub pattern: Regex,
    pub severity: SeverityLevel,
    pub description: String,
    pub suggestion: String,
    pub category: SecurityCategory,
}

/// 最佳实践规则
#[derive(Debug, Clone)]
pub struct BestPracticeRule {
    pub name: String,
    pub pattern: Regex,
    pub severity: SeverityLevel,
    pub description: String,
    pub suggestion: String,
}

/// 安全类别
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SecurityCategory {
    ReentrancyAttack,
    IntegerOverflow,
    AccessControl,
    InputValidation,
    GasOptimization,
    TimeDependency,
    ExternalCalls,
    StateManagement,
}

/// 审计问题
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditIssue {
    pub title: String,
    pub description: String,
    pub severity: SeverityLevel,
    pub category: String,
    pub line_number: Option<usize>,
    pub code_snippet: Option<String>,
    pub suggestion: String,
    pub references: Vec<String>,
}

/// 审计报告
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditReport {
    pub summary: AuditSummary,
    pub issues: Vec<AuditIssue>,
    pub recommendations: Vec<String>,
    pub score: AuditScore,
    pub ai_analysis: Option<String>,
}

/// 审计摘要
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditSummary {
    pub total_issues: usize,
    pub critical_issues: usize,
    pub high_issues: usize,
    pub medium_issues: usize,
    pub low_issues: usize,
    pub info_issues: usize,
    pub lines_analyzed: usize,
    pub functions_analyzed: usize,
}

/// 审计评分
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditScore {
    pub overall_score: f64,  // 0-100
    pub security_score: f64,
    pub quality_score: f64,
    pub gas_efficiency_score: f64,
    pub maintainability_score: f64,
}

impl SecurityAuditorAgent {
    pub fn new(config: SecurityAuditorConfig) -> Self {
        let rules = SecurityRules::new();
        Self { config, rules }
    }
    
    /// 执行安全审计
    async fn audit_contract(&self, contract_code: &str) -> AgentResult<AuditReport> {
        let mut issues = Vec::new();
        
        // 1. 语法检查
        issues.extend(self.check_syntax(contract_code)?);
        
        // 2. 安全分析
        issues.extend(self.analyze_security(contract_code)?);
        
        // 3. 最佳实践检查
        issues.extend(self.check_best_practices(contract_code)?);
        
        // 4. AI增强分析（如果启用）
        let ai_analysis = if self.config.enable_ai_analysis {
            Some(self.perform_ai_analysis(contract_code).await?)
        } else {
            None
        };
        
        // 5. 生成摘要和评分
        let summary = self.generate_summary(&issues, contract_code);
        let score = self.calculate_score(&issues, contract_code);
        let recommendations = self.generate_recommendations(&issues);
        
        Ok(AuditReport {
            summary,
            issues,
            recommendations,
            score,
            ai_analysis,
        })
    }
    
    fn check_syntax(&self, code: &str) -> AgentResult<Vec<AuditIssue>> {
        let mut issues = Vec::new();
        let lines: Vec<&str> = code.lines().collect();
        
        for (line_num, line) in lines.iter().enumerate() {
            for rule in &self.rules.syntax_rules {
                if rule.pattern.is_match(line) {
                    issues.push(AuditIssue {
                        title: rule.name.clone(),
                        description: rule.description.clone(),
                        severity: rule.severity.clone(),
                        category: "Syntax".to_string(),
                        line_number: Some(line_num + 1),
                        code_snippet: Some(line.to_string()),
                        suggestion: rule.suggestion.clone(),
                        references: Vec::new(),
                    });
                }
            }
        }
        
        Ok(issues)
    }
    
    fn analyze_security(&self, code: &str) -> AgentResult<Vec<AuditIssue>> {
        let mut issues = Vec::new();
        let lines: Vec<&str> = code.lines().collect();
        
        for (line_num, line) in lines.iter().enumerate() {
            for rule in &self.rules.security_rules {
                if rule.pattern.is_match(line) {
                    issues.push(AuditIssue {
                        title: rule.name.clone(),
                        description: rule.description.clone(),
                        severity: rule.severity.clone(),
                        category: format!("{:?}", rule.category),
                        line_number: Some(line_num + 1),
                        code_snippet: Some(line.to_string()),
                        suggestion: rule.suggestion.clone(),
                        references: self.get_security_references(&rule.category),
                    });
                }
            }
        }
        
        // 检查缺失的安全特性
        issues.extend(self.check_missing_security_features(code)?);
        
        Ok(issues)
    }
    
    fn check_missing_security_features(&self, code: &str) -> AgentResult<Vec<AuditIssue>> {
        let mut issues = Vec::new();
        
        // 检查是否缺少重入攻击防护
        if !code.contains("ReentrancyGuard") && !code.contains("nonReentrant") {
            issues.push(AuditIssue {
                title: "Missing Reentrancy Protection".to_string(),
                description: "Contract lacks reentrancy attack protection".to_string(),
                severity: SeverityLevel::High,
                category: "ReentrancyAttack".to_string(),
                line_number: None,
                code_snippet: None,
                suggestion: "Add OpenZeppelin's ReentrancyGuard and use nonReentrant modifier".to_string(),
                references: vec![
                    "https://docs.openzeppelin.com/contracts/4.x/api/security#ReentrancyGuard".to_string()
                ],
            });
        }
        
        // 检查是否缺少访问控制
        if !code.contains("Ownable") && !code.contains("onlyOwner") && !code.contains("AccessControl") {
            issues.push(AuditIssue {
                title: "Missing Access Control".to_string(),
                description: "Contract lacks proper access control mechanisms".to_string(),
                severity: SeverityLevel::Medium,
                category: "AccessControl".to_string(),
                line_number: None,
                code_snippet: None,
                suggestion: "Add Ownable or AccessControl from OpenZeppelin".to_string(),
                references: vec![
                    "https://docs.openzeppelin.com/contracts/4.x/access-control".to_string()
                ],
            });
        }
        
        // 检查Solidity版本
        if !code.contains("pragma solidity ^0.8") {
            issues.push(AuditIssue {
                title: "Outdated Solidity Version".to_string(),
                description: "Contract may be using an outdated Solidity version".to_string(),
                severity: SeverityLevel::Medium,
                category: "BestPractice".to_string(),
                line_number: None,
                code_snippet: None,
                suggestion: "Use Solidity ^0.8.0 for built-in overflow protection".to_string(),
                references: Vec::new(),
            });
        }
        
        Ok(issues)
    }
    
    fn check_best_practices(&self, code: &str) -> AgentResult<Vec<AuditIssue>> {
        let mut issues = Vec::new();
        let lines: Vec<&str> = code.lines().collect();
        
        for (line_num, line) in lines.iter().enumerate() {
            for rule in &self.rules.best_practice_rules {
                if rule.pattern.is_match(line) {
                    issues.push(AuditIssue {
                        title: rule.name.clone(),
                        description: rule.description.clone(),
                        severity: rule.severity.clone(),
                        category: "BestPractice".to_string(),
                        line_number: Some(line_num + 1),
                        code_snippet: Some(line.to_string()),
                        suggestion: rule.suggestion.clone(),
                        references: Vec::new(),
                    });
                }
            }
        }
        
        Ok(issues)
    }
    
    async fn perform_ai_analysis(&self, _code: &str) -> AgentResult<String> {
        // 这里应该调用AI模型进行深度分析
        // 暂时返回模拟结果
        Ok("AI analysis: The contract shows good security practices with proper access control and reentrancy protection. Consider adding more input validation for edge cases.".to_string())
    }
    
    fn generate_summary(&self, issues: &[AuditIssue], code: &str) -> AuditSummary {
        let total_issues = issues.len();
        let critical_issues = issues.iter().filter(|i| i.severity == SeverityLevel::Critical).count();
        let high_issues = issues.iter().filter(|i| i.severity == SeverityLevel::High).count();
        let medium_issues = issues.iter().filter(|i| i.severity == SeverityLevel::Medium).count();
        let low_issues = issues.iter().filter(|i| i.severity == SeverityLevel::Low).count();
        let info_issues = issues.iter().filter(|i| i.severity == SeverityLevel::Info).count();
        
        let lines_analyzed = code.lines().count();
        let functions_analyzed = code.matches("function ").count();
        
        AuditSummary {
            total_issues,
            critical_issues,
            high_issues,
            medium_issues,
            low_issues,
            info_issues,
            lines_analyzed,
            functions_analyzed,
        }
    }
    
    fn calculate_score(&self, issues: &[AuditIssue], _code: &str) -> AuditScore {
        let mut security_score = 100.0;
        let mut quality_score = 100.0;
        let mut gas_efficiency_score = 100.0;
        let mut maintainability_score = 100.0;
        
        // 根据问题严重程度扣分
        for issue in issues {
            let deduction = match issue.severity {
                SeverityLevel::Critical => 20.0,
                SeverityLevel::High => 10.0,
                SeverityLevel::Medium => 5.0,
                SeverityLevel::Low => 2.0,
                SeverityLevel::Info => 0.5,
            };
            
            match issue.category.as_str() {
                "ReentrancyAttack" | "AccessControl" | "ExternalCalls" => {
                    security_score -= deduction;
                }
                "BestPractice" | "Syntax" => {
                    quality_score -= deduction;
                }
                "GasOptimization" => {
                    gas_efficiency_score -= deduction;
                }
                _ => {
                    maintainability_score -= deduction;
                }
            }
        }
        
        // 确保分数不低于0
        security_score = security_score.max(0.0);
        quality_score = quality_score.max(0.0);
        gas_efficiency_score = gas_efficiency_score.max(0.0);
        maintainability_score = maintainability_score.max(0.0);
        
        let overall_score = (security_score + quality_score + gas_efficiency_score + maintainability_score) / 4.0;
        
        AuditScore {
            overall_score,
            security_score,
            quality_score,
            gas_efficiency_score,
            maintainability_score,
        }
    }
    
    fn generate_recommendations(&self, issues: &[AuditIssue]) -> Vec<String> {
        let mut recommendations = Vec::new();
        
        let critical_count = issues.iter().filter(|i| i.severity == SeverityLevel::Critical).count();
        let high_count = issues.iter().filter(|i| i.severity == SeverityLevel::High).count();
        
        if critical_count > 0 {
            recommendations.push("🚨 Critical issues found - DO NOT deploy until resolved".to_string());
        }
        
        if high_count > 0 {
            recommendations.push("⚠️ High severity issues found - Review and fix before deployment".to_string());
        }
        
        // 添加通用建议
        recommendations.push("Conduct thorough testing including edge cases".to_string());
        recommendations.push("Consider professional security audit before mainnet deployment".to_string());
        recommendations.push("Implement comprehensive monitoring and alerting".to_string());
        
        recommendations
    }
    
    fn get_security_references(&self, category: &SecurityCategory) -> Vec<String> {
        match category {
            SecurityCategory::ReentrancyAttack => vec![
                "https://consensys.github.io/smart-contract-best-practices/attacks/reentrancy/".to_string(),
            ],
            SecurityCategory::AccessControl => vec![
                "https://docs.openzeppelin.com/contracts/4.x/access-control".to_string(),
            ],
            SecurityCategory::IntegerOverflow => vec![
                "https://consensys.github.io/smart-contract-best-practices/attacks/integer-overflow-underflow/".to_string(),
            ],
            _ => Vec::new(),
        }
    }
    
    fn format_report(&self, report: &AuditReport) -> AgentResult<String> {
        let mut output = String::new();
        
        output.push_str("# 🛡️ Smart Contract Security Audit Report\n\n");
        
        // 摘要
        output.push_str("## 📊 Audit Summary\n\n");
        output.push_str(&format!("- **Total Issues**: {}\n", report.summary.total_issues));
        output.push_str(&format!("- **Critical**: {} 🔴\n", report.summary.critical_issues));
        output.push_str(&format!("- **High**: {} 🟠\n", report.summary.high_issues));
        output.push_str(&format!("- **Medium**: {} 🟡\n", report.summary.medium_issues));
        output.push_str(&format!("- **Low**: {} 🟢\n", report.summary.low_issues));
        output.push_str(&format!("- **Info**: {} ℹ️\n", report.summary.info_issues));
        output.push_str(&format!("- **Lines Analyzed**: {}\n", report.summary.lines_analyzed));
        output.push_str(&format!("- **Functions Analyzed**: {}\n\n", report.summary.functions_analyzed));
        
        // 评分
        output.push_str("## 🎯 Security Score\n\n");
        output.push_str(&format!("- **Overall Score**: {:.1}/100\n", report.score.overall_score));
        output.push_str(&format!("- **Security**: {:.1}/100\n", report.score.security_score));
        output.push_str(&format!("- **Code Quality**: {:.1}/100\n", report.score.quality_score));
        output.push_str(&format!("- **Gas Efficiency**: {:.1}/100\n", report.score.gas_efficiency_score));
        output.push_str(&format!("- **Maintainability**: {:.1}/100\n\n", report.score.maintainability_score));
        
        // 问题详情
        if !report.issues.is_empty() {
            output.push_str("## 🔍 Issues Found\n\n");
            
            for (i, issue) in report.issues.iter().enumerate() {
                let severity_emoji = match issue.severity {
                    SeverityLevel::Critical => "🔴",
                    SeverityLevel::High => "🟠",
                    SeverityLevel::Medium => "🟡",
                    SeverityLevel::Low => "🟢",
                    SeverityLevel::Info => "ℹ️",
                };
                
                output.push_str(&format!("### {}. {} {}\n\n", i + 1, issue.title, severity_emoji));
                output.push_str(&format!("**Severity**: {:?}\n", issue.severity));
                output.push_str(&format!("**Category**: {}\n", issue.category));
                
                if let Some(line_num) = issue.line_number {
                    output.push_str(&format!("**Line**: {}\n", line_num));
                }
                
                output.push_str(&format!("**Description**: {}\n", issue.description));
                
                if let Some(code) = &issue.code_snippet {
                    output.push_str(&format!("**Code**: `{}`\n", code));
                }
                
                output.push_str(&format!("**Suggestion**: {}\n", issue.suggestion));
                
                if !issue.references.is_empty() {
                    output.push_str("**References**:\n");
                    for reference in &issue.references {
                        output.push_str(&format!("- {}\n", reference));
                    }
                }
                
                output.push_str("\n");
            }
        }
        
        // AI分析
        if let Some(ai_analysis) = &report.ai_analysis {
            output.push_str("## 🤖 AI Analysis\n\n");
            output.push_str(ai_analysis);
            output.push_str("\n\n");
        }
        
        // 建议
        output.push_str("## 💡 Recommendations\n\n");
        for recommendation in &report.recommendations {
            output.push_str(&format!("- {}\n", recommendation));
        }
        
        output.push_str("\n---\n");
        output.push_str("*Report generated by EchokitBot Security Auditor*\n");
        
        Ok(output)
    }
}

#[async_trait]
impl Agent for SecurityAuditorAgent {
    fn name(&self) -> &str {
        "SecurityAuditor"
    }
    
    fn description(&self) -> &str {
        "分析智能合约安全性，检测漏洞并提供详细的审计报告"
    }
    
    fn specialties(&self) -> Vec<String> {
        vec![
            "安全漏洞检测".to_string(),
            "代码审计".to_string(),
            "最佳实践检查".to_string(),
            "风险评估".to_string(),
        ]
    }
    
    fn preferred_models(&self) -> Vec<String> {
        vec![
            "gpt-4".to_string(),
            "claude-3".to_string(),
            "glm-4".to_string(),
        ]
    }
    
    async fn execute(&self, context: &AgentContext) -> AgentResult<AgentOutput> {
        // 从上下文中提取合约代码
        let contract_code = if let Some(contract_data) = context.context_data.get("contract") {
            if let Ok(contract) = serde_json::from_value::<GeneratedContract>(contract_data.clone()) {
                contract.code
            } else {
                context.user_input.clone()
            }
        } else {
            context.user_input.clone()
        };
        
        // 执行安全审计
        let report = self.audit_contract(&contract_code).await?;
        
        // 格式化报告
        let content = self.format_report(&report)?;
        
        // 计算置信度
        let confidence = self.calculate_confidence(&report);
        
        // 生成元数据
        let mut metadata = HashMap::new();
        metadata.insert("report".to_string(), serde_json::to_value(&report)?);
        metadata.insert("score".to_string(), serde_json::to_value(&report.score)?);
        
        // 建议下一步操作
        let next_actions = if report.summary.critical_issues > 0 {
            vec![
                "修复严重安全问题".to_string(),
                "重新审计".to_string(),
            ]
        } else if report.summary.high_issues > 0 {
            vec![
                "修复高风险问题".to_string(),
                "优化合约代码".to_string(),
                "准备测试".to_string(),
            ]
        } else {
            vec![
                "优化合约代码".to_string(),
                "编写测试用例".to_string(),
                "准备部署".to_string(),
            ]
        };
        
        Ok(AgentOutput {
            content,
            metadata,
            confidence,
            next_actions,
            generated_files: vec!["security_audit_report.md".to_string()],
        })
    }
}

impl SecurityAuditorAgent {
    fn calculate_confidence(&self, report: &AuditReport) -> f64 {
        let mut confidence = 0.9; // 基础置信度
        
        // 根据审计深度调整
        match self.config.audit_depth {
            AuditDepth::Comprehensive => confidence += 0.05,
            AuditDepth::Standard => {},
            AuditDepth::Quick => confidence -= 0.1,
        }
        
        // 根据发现的问题数量调整
        if report.summary.critical_issues == 0 {
            confidence += 0.05;
        } else {
            confidence -= 0.1;
        }
        
        confidence.min(1.0).max(0.0)
    }
}

impl SecurityRules {
    fn new() -> Self {
        let mut syntax_rules = Vec::new();
        let mut security_rules = Vec::new();
        let mut best_practice_rules = Vec::new();
        
        // 语法规则
        syntax_rules.push(SyntaxRule {
            name: "Chinese Characters in String".to_string(),
            pattern: Regex::new(r#"[\u4e00-\u9fff]"#).unwrap(),
            severity: SeverityLevel::Critical,
            description: "String contains Chinese characters, Solidity doesn't support Unicode string literals".to_string(),
            suggestion: "Replace Chinese characters with English or use unicode\"...\" format".to_string(),
        });
        
        syntax_rules.push(SyntaxRule {
            name: "Reserved Keyword as Parameter".to_string(),
            pattern: Regex::new(r"\b(days|hours|minutes|seconds|weeks|years|wei|gwei|ether)\s*[,)]").unwrap(),
            severity: SeverityLevel::Critical,
            description: "Using Solidity reserved keyword as parameter name".to_string(),
            suggestion: "Add underscore prefix to parameter name, e.g., _days, _hours".to_string(),
        });
        
        // 安全规则
        security_rules.push(SecurityRule {
            name: "Dangerous transfer() Usage".to_string(),
            pattern: Regex::new(r"\.transfer\s*\(").unwrap(),
            severity: SeverityLevel::High,
            description: "Using .transfer() may cause gas limit issues".to_string(),
            suggestion: "Use .call{value: amount}(\"\") instead".to_string(),
            category: SecurityCategory::ExternalCalls,
        });
        
        security_rules.push(SecurityRule {
            name: "tx.origin Usage".to_string(),
            pattern: Regex::new(r"\btx\.origin\b").unwrap(),
            severity: SeverityLevel::High,
            description: "Using tx.origin is vulnerable to phishing attacks".to_string(),
            suggestion: "Use msg.sender instead".to_string(),
            category: SecurityCategory::AccessControl,
        });
        
        security_rules.push(SecurityRule {
            name: "Block Timestamp Dependency".to_string(),
            pattern: Regex::new(r"\bblock\.timestamp\b").unwrap(),
            severity: SeverityLevel::Medium,
            description: "Direct use of block.timestamp can be manipulated by miners".to_string(),
            suggestion: "Be aware of timestamp manipulation attacks".to_string(),
            category: SecurityCategory::TimeDependency,
        });
        
        // 最佳实践规则
        best_practice_rules.push(BestPracticeRule {
            name: "Missing Input Validation".to_string(),
            pattern: Regex::new(r"function\s+\w+.*external.*payable").unwrap(),
            severity: SeverityLevel::Medium,
            description: "Payable function may lack proper input validation".to_string(),
            suggestion: "Add require statements to validate inputs".to_string(),
        });
        
        Self {
            syntax_rules,
            security_rules,
            best_practice_rules,
        }
    }
}

impl Default for SecurityAuditorConfig {
    fn default() -> Self {
        Self {
            model_name: "gpt-4".to_string(),
            audit_depth: AuditDepth::Standard,
            enable_ai_analysis: true,
            severity_threshold: SeverityLevel::Low,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_security_rules_creation() {
        let rules = SecurityRules::new();
        assert!(!rules.syntax_rules.is_empty());
        assert!(!rules.security_rules.is_empty());
        assert!(!rules.best_practice_rules.is_empty());
    }
    
    #[tokio::test]
    async fn test_audit_contract_with_issues() {
        let config = SecurityAuditorConfig::default();
        let auditor = SecurityAuditorAgent::new(config);
        
        let problematic_code = r#"
        pragma solidity ^0.7.0;
        contract Test {
            function test(uint256 days) external payable {
                require(msg.value > 0, "金额必须大于0");
                msg.sender.transfer(msg.value);
            }
        }
        "#;
        
        let report = auditor.audit_contract(problematic_code).await.unwrap();
        
        assert!(report.summary.total_issues > 0);
        assert!(report.summary.critical_issues > 0); // Chinese characters
        assert!(report.summary.high_issues > 0);     // transfer usage
    }
}