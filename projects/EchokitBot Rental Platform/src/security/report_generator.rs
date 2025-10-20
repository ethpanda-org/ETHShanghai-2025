//! 安全报告生成器
//! 
//! 生成详细的安全审计报告，支持多种格式

use crate::error::{AiContractError, Result};
use crate::types::{SecurityAuditResult, SecurityIssue, IssueSeverity, IssueType};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

/// 报告格式
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum ReportFormat {
    /// HTML 格式
    Html,
    
    /// Markdown 格式
    Markdown,
    
    /// JSON 格式
    Json,
    
    /// PDF 格式（需要额外的依赖）
    Pdf,
}

/// 安全报告
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityReport {
    /// 报告 ID
    pub id: Uuid,
    
    /// 生成时间
    pub generated_at: DateTime<Utc>,
    
    /// 合约名称
    pub contract_name: String,
    
    /// 审计结果
    pub audit_result: SecurityAuditResult,
    
    /// 风险评估
    pub risk_assessment: RiskAssessment,
    
    /// 统计信息
    pub statistics: SecurityStatistics,
    
    /// 详细分析
    pub detailed_analysis: Vec<IssueAnalysis>,
    
    /// 建议摘要
    pub recommendations_summary: String,
    
    /// 合规性检查
    pub compliance_checks: Vec<ComplianceCheck>,
}

/// 风险评估
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskAssessment {
    /// 总体风险等级
    pub overall_risk_level: RiskLevel,
    
    /// 风险评分（0-100）
    pub risk_score: u8,
    
    /// 关键风险
    pub critical_risks: Vec<String>,
    
    /// 高风险
    pub high_risks: Vec<String>,
    
    /// 中风险
    pub medium_risks: Vec<String>,
    
    /// 建议行动
    pub recommended_actions: Vec<String>,
}

/// 风险等级
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum RiskLevel {
    /// 低风险
    Low,
    
    /// 中等风险
    Medium,
    
    /// 高风险
    High,
    
    /// 关键风险
    Critical,
}

/// 安全统计
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityStatistics {
    /// 总问题数
    pub total_issues: usize,
    
    /// 按严重程度分类
    pub by_severity: HashMap<String, usize>,
    
    /// 按类型分类
    pub by_type: HashMap<String, usize>,
    
    /// 已修复问题数
    pub fixed_issues: usize,
    
    /// 待修复问题数
    pub pending_issues: usize,
    
    /// 使用的工具
    pub tools_used: Vec<String>,
    
    /// 扫描时间（秒）
    pub scan_duration: f64,
}

/// 问题分析
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IssueAnalysis {
    /// 问题信息
    pub issue: SecurityIssue,
    
    /// 影响分析
    pub impact_analysis: String,
    
    /// 利用场景
    pub exploitation_scenario: Option<String>,
    
    /// 修复优先级
    pub fix_priority: u8,
    
    /// 相关 CWE
    pub related_cwe: Vec<String>,
    
    /// 参考资料
    pub references: Vec<String>,
}

/// 合规性检查
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComplianceCheck {
    /// 标准名称
    pub standard: String,
    
    /// 是否合规
    pub compliant: bool,
    
    /// 检查项
    pub checks: Vec<ComplianceCheckItem>,
    
    /// 合规性评分（0-100）
    pub compliance_score: u8,
}

/// 合规性检查项
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComplianceCheckItem {
    /// 检查项名称
    pub name: String,
    
    /// 是否通过
    pub passed: bool,
    
    /// 描述
    pub description: String,
    
    /// 建议
    pub recommendation: Option<String>,
}

/// 安全报告生成器
pub struct SecurityReportGenerator {
    /// 报告模板
    templates: HashMap<ReportFormat, String>,
}

impl SecurityReportGenerator {
    /// 创建新的报告生成器
    pub fn new() -> Self {
        let mut templates = HashMap::new();
        
        // 加载默认模板
        templates.insert(ReportFormat::Html, Self::default_html_template());
        templates.insert(ReportFormat::Markdown, Self::default_markdown_template());
        
        Self { templates }
    }
    
    /// 生成安全报告
    pub fn generate_report(
        &self,
        audit_result: SecurityAuditResult,
        contract_name: &str,
    ) -> Result<SecurityReport> {
        // 计算风险评估
        let risk_assessment = self.calculate_risk_assessment(&audit_result);
        
        // 生成统计信息
        let statistics = self.generate_statistics(&audit_result);
        
        // 生成详细分析
        let detailed_analysis = self.generate_detailed_analysis(&audit_result);
        
        // 生成建议摘要
        let recommendations_summary = self.generate_recommendations_summary(&audit_result);
        
        // 生成合规性检查
        let compliance_checks = self.generate_compliance_checks(&audit_result);
        
        Ok(SecurityReport {
            id: Uuid::new_v4(),
            generated_at: Utc::now(),
            contract_name: contract_name.to_string(),
            audit_result,
            risk_assessment,
            statistics,
            detailed_analysis,
            recommendations_summary,
            compliance_checks,
        })
    }
    
    /// 导出报告
    pub fn export_report(
        &self,
        report: &SecurityReport,
        format: ReportFormat,
    ) -> Result<String> {
        match format {
            ReportFormat::Html => self.export_html(report),
            ReportFormat::Markdown => self.export_markdown(report),
            ReportFormat::Json => self.export_json(report),
            ReportFormat::Pdf => Err(AiContractError::internal_error("PDF 导出暂未实现")),
        }
    }
    
    /// 计算风险评估
    fn calculate_risk_assessment(&self, audit_result: &SecurityAuditResult) -> RiskAssessment {
        let mut critical_risks = Vec::new();
        let mut high_risks = Vec::new();
        let mut medium_risks = Vec::new();
        
        for issue in &audit_result.issues {
            let risk_desc = format!("{}: {}", issue.title, issue.description);
            
            match issue.severity {
                IssueSeverity::Critical => critical_risks.push(risk_desc),
                IssueSeverity::High => high_risks.push(risk_desc),
                IssueSeverity::Medium => medium_risks.push(risk_desc),
                _ => {}
            }
        }
        
        // 计算总体风险等级
        let overall_risk_level = if !critical_risks.is_empty() {
            RiskLevel::Critical
        } else if !high_risks.is_empty() {
            RiskLevel::High
        } else if !medium_risks.is_empty() {
            RiskLevel::Medium
        } else {
            RiskLevel::Low
        };
        
        // 计算风险评分（100 - 安全评分）
        let risk_score = 100 - audit_result.security_score;
        
        // 生成建议行动
        let recommended_actions = self.generate_recommended_actions(&critical_risks, &high_risks, &medium_risks);
        
        RiskAssessment {
            overall_risk_level,
            risk_score,
            critical_risks,
            high_risks,
            medium_risks,
            recommended_actions,
        }
    }
    
    /// 生成建议行动
    fn generate_recommended_actions(
        &self,
        critical_risks: &[String],
        high_risks: &[String],
        medium_risks: &[String],
    ) -> Vec<String> {
        let mut actions = Vec::new();
        
        if !critical_risks.is_empty() {
            actions.push(format!("立即修复 {} 个关键安全问题", critical_risks.len()));
            actions.push("在修复关键问题前不要部署到主网".to_string());
        }
        
        if !high_risks.is_empty() {
            actions.push(format!("优先修复 {} 个高危安全问题", high_risks.len()));
        }
        
        if !medium_risks.is_empty() {
            actions.push(format!("计划修复 {} 个中等安全问题", medium_risks.len()));
        }
        
        actions.push("进行全面的代码审查".to_string());
        actions.push("在测试网络上进行充分测试".to_string());
        actions.push("考虑进行专业的第三方安全审计".to_string());
        
        actions
    }
    
    /// 生成统计信息
    fn generate_statistics(&self, audit_result: &SecurityAuditResult) -> SecurityStatistics {
        let mut by_severity = HashMap::new();
        let mut by_type = HashMap::new();
        
        for issue in &audit_result.issues {
            *by_severity.entry(format!("{:?}", issue.severity)).or_insert(0) += 1;
            *by_type.entry(format!("{}", issue.issue_type)).or_insert(0) += 1;
        }
        
        let fixed_issues = audit_result.issues.iter().filter(|i| i.fixed).count();
        let pending_issues = audit_result.issues.len() - fixed_issues;
        
        SecurityStatistics {
            total_issues: audit_result.issues.len(),
            by_severity,
            by_type,
            fixed_issues,
            pending_issues,
            tools_used: audit_result.tools_used.clone(),
            scan_duration: 0.0, // TODO: 实际计算扫描时间
        }
    }
    
    /// 生成详细分析
    fn generate_detailed_analysis(&self, audit_result: &SecurityAuditResult) -> Vec<IssueAnalysis> {
        audit_result.issues.iter().map(|issue| {
            let impact_analysis = self.analyze_impact(issue);
            let exploitation_scenario = self.generate_exploitation_scenario(issue);
            let fix_priority = self.calculate_fix_priority(issue);
            let related_cwe = self.get_related_cwe(issue);
            let references = self.get_references(issue);
            
            IssueAnalysis {
                issue: issue.clone(),
                impact_analysis,
                exploitation_scenario,
                fix_priority,
                related_cwe,
                references,
            }
        }).collect()
    }
    
    /// 分析影响
    fn analyze_impact(&self, issue: &SecurityIssue) -> String {
        match issue.issue_type {
            IssueType::Reentrancy => {
                "重入攻击可能导致资金被盗取，攻击者可以在合约状态更新前重复调用函数".to_string()
            }
            IssueType::AccessControl => {
                "访问控制问题可能允许未授权用户执行敏感操作，导致合约被恶意控制".to_string()
            }
            IssueType::IntegerOverflow => {
                "整数溢出可能导致计算错误，影响代币余额或其他关键数值".to_string()
            }
            IssueType::UncheckedExternalCall => {
                "未检查的外部调用可能导致静默失败，影响合约逻辑的正确执行".to_string()
            }
            _ => format!("{} 类型的问题可能影响合约的安全性和可靠性", issue.issue_type),
        }
    }
    
    /// 生成利用场景
    fn generate_exploitation_scenario(&self, issue: &SecurityIssue) -> Option<String> {
        match issue.issue_type {
            IssueType::Reentrancy => Some(
                "攻击者可以创建一个恶意合约，在接收以太币时重新调用目标合约的提款函数，\
                在余额更新前多次提取资金".to_string()
            ),
            IssueType::AccessControl => Some(
                "攻击者可以直接调用未受保护的敏感函数，执行只有管理员才应该执行的操作".to_string()
            ),
            _ => None,
        }
    }
    
    /// 计算修复优先级
    fn calculate_fix_priority(&self, issue: &SecurityIssue) -> u8 {
        match issue.severity {
            IssueSeverity::Critical => 10,
            IssueSeverity::High => 8,
            IssueSeverity::Medium => 5,
            IssueSeverity::Low => 3,
            IssueSeverity::Info => 1,
        }
    }
    
    /// 获取相关 CWE
    fn get_related_cwe(&self, issue: &SecurityIssue) -> Vec<String> {
        let mut cwes = Vec::new();
        
        if let Some(cwe_id) = &issue.cwe_id {
            cwes.push(cwe_id.clone());
        }
        
        // 根据问题类型添加相关 CWE
        match issue.issue_type {
            IssueType::Reentrancy => cwes.push("CWE-841".to_string()),
            IssueType::IntegerOverflow => cwes.push("CWE-190".to_string()),
            IssueType::AccessControl => cwes.push("CWE-284".to_string()),
            IssueType::UncheckedExternalCall => cwes.push("CWE-252".to_string()),
            _ => {}
        }
        
        cwes
    }
    
    /// 获取参考资料
    fn get_references(&self, issue: &SecurityIssue) -> Vec<String> {
        let mut references = Vec::new();
        
        match issue.issue_type {
            IssueType::Reentrancy => {
                references.push("https://consensys.github.io/smart-contract-best-practices/attacks/reentrancy/".to_string());
                references.push("https://docs.openzeppelin.com/contracts/4.x/api/security#ReentrancyGuard".to_string());
            }
            IssueType::AccessControl => {
                references.push("https://docs.openzeppelin.com/contracts/4.x/access-control".to_string());
            }
            IssueType::IntegerOverflow => {
                references.push("https://docs.soliditylang.org/en/latest/080-breaking-changes.html".to_string());
            }
            _ => {}
        }
        
        references
    }
    
    /// 生成建议摘要
    fn generate_recommendations_summary(&self, audit_result: &SecurityAuditResult) -> String {
        let mut summary = String::new();
        
        summary.push_str(&format!("安全评分：{}/100\n\n", audit_result.security_score));
        
        if audit_result.has_critical_issues() {
            summary.push_str("⚠️ 发现关键安全问题，强烈建议在部署前修复所有关键问题。\n\n");
        }
        
        summary.push_str("主要建议：\n");
        for (i, recommendation) in audit_result.recommendations.iter().enumerate() {
            summary.push_str(&format!("{}. {}\n", i + 1, recommendation));
        }
        
        summary
    }
    
    /// 生成合规性检查
    fn generate_compliance_checks(&self, audit_result: &SecurityAuditResult) -> Vec<ComplianceCheck> {
        vec![
            self.check_openzeppelin_compliance(audit_result),
            self.check_security_best_practices(audit_result),
        ]
    }
    
    /// 检查 OpenZeppelin 合规性
    fn check_openzeppelin_compliance(&self, audit_result: &SecurityAuditResult) -> ComplianceCheck {
        let mut checks = Vec::new();
        
        // 检查是否使用 ReentrancyGuard
        let has_reentrancy_protection = !audit_result.issues.iter()
            .any(|i| matches!(i.issue_type, IssueType::Reentrancy));
        
        checks.push(ComplianceCheckItem {
            name: "重入攻击保护".to_string(),
            passed: has_reentrancy_protection,
            description: "使用 ReentrancyGuard 或检查-效果-交互模式".to_string(),
            recommendation: if !has_reentrancy_protection {
                Some("建议使用 OpenZeppelin 的 ReentrancyGuard".to_string())
            } else {
                None
            },
        });
        
        // 检查访问控制
        let has_access_control = !audit_result.issues.iter()
            .any(|i| matches!(i.issue_type, IssueType::AccessControl));
        
        checks.push(ComplianceCheckItem {
            name: "访问控制".to_string(),
            passed: has_access_control,
            description: "使用 Ownable 或 AccessControl".to_string(),
            recommendation: if !has_access_control {
                Some("建议使用 OpenZeppelin 的访问控制合约".to_string())
            } else {
                None
            },
        });
        
        let passed_checks = checks.iter().filter(|c| c.passed).count();
        let compliance_score = (passed_checks * 100 / checks.len()) as u8;
        
        ComplianceCheck {
            standard: "OpenZeppelin 最佳实践".to_string(),
            compliant: compliance_score >= 80,
            checks,
            compliance_score,
        }
    }
    
    /// 检查安全最佳实践
    fn check_security_best_practices(&self, audit_result: &SecurityAuditResult) -> ComplianceCheck {
        let mut checks = Vec::new();
        
        // 检查是否有高危问题
        let no_high_severity = !audit_result.has_high_issues();
        
        checks.push(ComplianceCheckItem {
            name: "无高危安全问题".to_string(),
            passed: no_high_severity,
            description: "合约不应包含高危或关键安全问题".to_string(),
            recommendation: if !no_high_severity {
                Some("修复所有高危和关键安全问题".to_string())
            } else {
                None
            },
        });
        
        let passed_checks = checks.iter().filter(|c| c.passed).count();
        let compliance_score = (passed_checks * 100 / checks.len()) as u8;
        
        ComplianceCheck {
            standard: "安全最佳实践".to_string(),
            compliant: compliance_score >= 80,
            checks,
            compliance_score,
        }
    }
    
    /// 导出 HTML 格式
    fn export_html(&self, report: &SecurityReport) -> Result<String> {
        let template = self.templates.get(&ReportFormat::Html)
            .ok_or_else(|| AiContractError::internal_error("HTML 模板未找到"))?;
        
        let html = template
            .replace("{{REPORT_ID}}", &report.id.to_string())
            .replace("{{CONTRACT_NAME}}", &report.contract_name)
            .replace("{{GENERATED_AT}}", &report.generated_at.to_rfc3339())
            .replace("{{SECURITY_SCORE}}", &report.audit_result.security_score.to_string())
            .replace("{{RISK_LEVEL}}", &format!("{:?}", report.risk_assessment.overall_risk_level))
            .replace("{{TOTAL_ISSUES}}", &report.statistics.total_issues.to_string())
            .replace("{{ISSUES_TABLE}}", &self.generate_issues_table_html(&report.detailed_analysis))
            .replace("{{RECOMMENDATIONS}}", &report.recommendations_summary);
        
        Ok(html)
    }
    
    /// 导出 Markdown 格式
    fn export_markdown(&self, report: &SecurityReport) -> Result<String> {
        let mut md = String::new();
        
        md.push_str(&format!("# 安全审计报告\n\n"));
        md.push_str(&format!("**合约名称:** {}\n\n", report.contract_name));
        md.push_str(&format!("**报告 ID:** {}\n\n", report.id));
        md.push_str(&format!("**生成时间:** {}\n\n", report.generated_at.to_rfc3339()));
        
        md.push_str("## 总体评估\n\n");
        md.push_str(&format!("- **安全评分:** {}/100\n", report.audit_result.security_score));
        md.push_str(&format!("- **风险等级:** {:?}\n", report.risk_assessment.overall_risk_level));
        md.push_str(&format!("- **总问题数:** {}\n\n", report.statistics.total_issues));
        
        md.push_str("## 问题统计\n\n");
        md.push_str("### 按严重程度\n\n");
        for (severity, count) in &report.statistics.by_severity {
            md.push_str(&format!("- {}: {}\n", severity, count));
        }
        
        md.push_str("\n### 按类型\n\n");
        for (issue_type, count) in &report.statistics.by_type {
            md.push_str(&format!("- {}: {}\n", issue_type, count));
        }
        
        md.push_str("\n## 详细问题\n\n");
        for (i, analysis) in report.detailed_analysis.iter().enumerate() {
            md.push_str(&format!("### {}. {}\n\n", i + 1, analysis.issue.title));
            md.push_str(&format!("**严重程度:** {:?}\n\n", analysis.issue.severity));
            md.push_str(&format!("**描述:** {}\n\n", analysis.issue.description));
            md.push_str(&format!("**影响分析:** {}\n\n", analysis.impact_analysis));
            
            if let Some(fix) = &analysis.issue.fix_suggestion {
                md.push_str(&format!("**修复建议:** {}\n\n", fix));
            }
        }
        
        md.push_str("## 建议\n\n");
        md.push_str(&report.recommendations_summary);
        
        Ok(md)
    }
    
    /// 导出 JSON 格式
    fn export_json(&self, report: &SecurityReport) -> Result<String> {
        serde_json::to_string_pretty(report)
            .map_err(|e| AiContractError::internal_error(format!("JSON 序列化失败: {}", e)))
    }
    
    /// 生成问题表格 HTML
    fn generate_issues_table_html(&self, analyses: &[IssueAnalysis]) -> String {
        let mut table = String::from("<table class=\"issues-table\">\n");
        table.push_str("<thead><tr><th>严重程度</th><th>问题</th><th>描述</th><th>位置</th></tr></thead>\n");
        table.push_str("<tbody>\n");
        
        for analysis in analyses {
            let severity_class = match analysis.issue.severity {
                IssueSeverity::Critical => "critical",
                IssueSeverity::High => "high",
                IssueSeverity::Medium => "medium",
                IssueSeverity::Low => "low",
                IssueSeverity::Info => "info",
            };
            
            let location = analysis.issue.location.as_ref()
                .map(|l| format!("{}:{}", l.file, l.line))
                .unwrap_or_else(|| "未知".to_string());
            
            table.push_str(&format!(
                "<tr class=\"{}\">\n<td>{:?}</td>\n<td>{}</td>\n<td>{}</td>\n<td>{}</td>\n</tr>\n",
                severity_class,
                analysis.issue.severity,
                analysis.issue.title,
                analysis.issue.description,
                location
            ));
        }
        
        table.push_str("</tbody>\n</table>\n");
        table
    }
    
    /// 默认 HTML 模板
    fn default_html_template() -> String {
        r#"<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>安全审计报告 - {{CONTRACT_NAME}}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
        .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; }
        .issues-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .issues-table th, .issues-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .issues-table th { background-color: #4CAF50; color: white; }
        .critical { background-color: #ffebee; }
        .high { background-color: #fff3e0; }
        .medium { background-color: #fff9c4; }
        .low { background-color: #e8f5e9; }
        .info { background-color: #e3f2fd; }
    </style>
</head>
<body>
    <h1>安全审计报告</h1>
    <div class="summary">
        <p><strong>合约名称:</strong> {{CONTRACT_NAME}}</p>
        <p><strong>报告 ID:</strong> {{REPORT_ID}}</p>
        <p><strong>生成时间:</strong> {{GENERATED_AT}}</p>
        <p><strong>安全评分:</strong> {{SECURITY_SCORE}}/100</p>
        <p><strong>风险等级:</strong> {{RISK_LEVEL}}</p>
        <p><strong>总问题数:</strong> {{TOTAL_ISSUES}}</p>
    </div>
    
    <h2>详细问题</h2>
    {{ISSUES_TABLE}}
    
    <h2>建议</h2>
    <pre>{{RECOMMENDATIONS}}</pre>
</body>
</html>"#.to_string()
    }
    
    /// 默认 Markdown 模板
    fn default_markdown_template() -> String {
        "# 安全审计报告\n\n{{CONTENT}}".to_string()
    }
}

impl Default for SecurityReportGenerator {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{SecurityIssue, CodeLocation};

    #[test]
    fn test_report_generator_creation() {
        let generator = SecurityReportGenerator::new();
        assert!(generator.templates.contains_key(&ReportFormat::Html));
        assert!(generator.templates.contains_key(&ReportFormat::Markdown));
    }

    #[test]
    fn test_risk_assessment_calculation() {
        let generator = SecurityReportGenerator::new();
        
        let audit_result = SecurityAuditResult {
            audit_id: Uuid::new_v4(),
            audit_time: Utc::now(),
            security_score: 75,
            issues: vec![
                SecurityIssue {
                    id: "1".to_string(),
                    title: "Critical Issue".to_string(),
                    description: "A critical security issue".to_string(),
                    severity: IssueSeverity::Critical,
                    issue_type: IssueType::Reentrancy,
                    location: None,
                    fix_suggestion: None,
                    cwe_id: None,
                    fixed: false,
                },
            ],
            tools_used: vec!["Aderyn".to_string()],
            summary: "Test audit".to_string(),
            recommendations: vec![],
        };
        
        let risk_assessment = generator.calculate_risk_assessment(&audit_result);
        
        assert_eq!(risk_assessment.overall_risk_level, RiskLevel::Critical);
        assert_eq!(risk_assessment.risk_score, 25);
        assert_eq!(risk_assessment.critical_risks.len(), 1);
    }
}
