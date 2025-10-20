//! 统一的安全分析器接口
//! 
//! 协调多个安全审计工具的使用

use crate::config::SecurityConfig;
use crate::error::Result;
use crate::security::{AderynAnalyzer, SlitherAnalyzer, MythrilAnalyzer};
use crate::types::{SecurityAuditResult, SecurityIssue};
use uuid::Uuid;

/// 统一的安全分析器
pub struct SecurityAnalyzer {
    aderyn: Option<AderynAnalyzer>,
    slither: Option<SlitherAnalyzer>,
    mythril: Option<MythrilAnalyzer>,
}

impl SecurityAnalyzer {
    /// 创建新的安全分析器
    pub fn new(config: SecurityConfig) -> Self {
        let aderyn = if config.aderyn.enabled {
            Some(AderynAnalyzer::new(config.aderyn.clone()))
        } else {
            None
        };
        
        let slither = if config.slither.enabled {
            Some(SlitherAnalyzer::new(config.slither.clone()))
        } else {
            None
        };
        
        let mythril = if config.mythril.enabled {
            Some(MythrilAnalyzer::new(config.mythril.clone()))
        } else {
            None
        };
        
        Self {
            aderyn,
            slither,
            mythril,
        }
    }
    
    /// 分析合约代码（并行执行）
    pub async fn analyze_contract(&self, contract_code: &str, contract_name: &str) -> Result<SecurityAuditResult> {
        let mut tasks = Vec::new();
        
        // 创建并行任务
        if let Some(aderyn) = &self.aderyn {
            let aderyn = aderyn.clone();
            let code = contract_code.to_string();
            let name = contract_name.to_string();
            tasks.push(tokio::spawn(async move {
                aderyn.analyze_contract(&code, &name).await
            }));
        }
        
        if let Some(slither) = &self.slither {
            let slither = slither.clone();
            let code = contract_code.to_string();
            let name = contract_name.to_string();
            tasks.push(tokio::spawn(async move {
                slither.analyze_contract(&code, &name).await
            }));
        }
        
        if let Some(mythril) = &self.mythril {
            let mythril = mythril.clone();
            let code = contract_code.to_string();
            let name = contract_name.to_string();
            tasks.push(tokio::spawn(async move {
                mythril.analyze_contract(&code, &name).await
            }));
        }
        
        // 等待所有任务完成
        let mut all_issues = Vec::new();
        let mut tools_used = Vec::new();
        
        for task in tasks {
            match task.await {
                Ok(Ok(result)) => {
                    all_issues.extend(result.issues);
                    tools_used.extend(result.tools_used);
                }
                Ok(Err(e)) => {
                    tracing::warn!("安全分析工具执行失败: {}", e);
                }
                Err(e) => {
                    tracing::warn!("安全分析任务失败: {}", e);
                }
            }
        }
        
        // 去重和排序问题
        all_issues = self.deduplicate_issues(all_issues);
        all_issues = self.prioritize_issues(all_issues);
        
        // 计算安全评分
        let security_score = self.calculate_security_score(&all_issues);
        let tools_count = tools_used.len();
        
        Ok(SecurityAuditResult {
            audit_id: Uuid::new_v4(),
            audit_time: chrono::Utc::now(),
            security_score,
            issues: all_issues.clone(),
            tools_used,
            summary: format!("综合安全分析完成，使用 {} 个工具，发现 {} 个问题", tools_count, all_issues.len()),
            recommendations: self.generate_recommendations(&all_issues),
        })
    }
    
    /// 分析合约代码（顺序执行，用于调试）
    pub async fn analyze_contract_sequential(&self, contract_code: &str, contract_name: &str) -> Result<SecurityAuditResult> {
        let mut all_issues = Vec::new();
        let mut tools_used = Vec::new();
        
        // 运行 Aderyn 分析
        if let Some(aderyn) = &self.aderyn {
            match aderyn.analyze_contract(contract_code, contract_name).await {
                Ok(result) => {
                    all_issues.extend(result.issues);
                    tools_used.extend(result.tools_used);
                }
                Err(e) => {
                    tracing::warn!("Aderyn 分析失败: {}", e);
                }
            }
        }
        
        // 运行 Slither 分析
        if let Some(slither) = &self.slither {
            match slither.analyze_contract(contract_code, contract_name).await {
                Ok(result) => {
                    all_issues.extend(result.issues);
                    tools_used.extend(result.tools_used);
                }
                Err(e) => {
                    tracing::warn!("Slither 分析失败: {}", e);
                }
            }
        }
        
        // 运行 Mythril 分析
        if let Some(mythril) = &self.mythril {
            match mythril.analyze_contract(contract_code, contract_name).await {
                Ok(result) => {
                    all_issues.extend(result.issues);
                    tools_used.extend(result.tools_used);
                }
                Err(e) => {
                    tracing::warn!("Mythril 分析失败: {}", e);
                }
            }
        }
        
        // 去重和排序问题
        all_issues = self.deduplicate_issues(all_issues);
        all_issues = self.prioritize_issues(all_issues);
        
        // 计算安全评分
        let security_score = self.calculate_security_score(&all_issues);
        
        Ok(SecurityAuditResult {
            audit_id: Uuid::new_v4(),
            audit_time: chrono::Utc::now(),
            security_score,
            issues: all_issues.clone(),
            tools_used,
            summary: format!("综合安全分析完成，发现 {} 个问题", all_issues.len()),
            recommendations: self.generate_recommendations(&all_issues),
        })
    }
    
    /// 去重问题（智能去重）
    fn deduplicate_issues(&self, issues: Vec<SecurityIssue>) -> Vec<SecurityIssue> {
        use std::collections::HashMap;
        
        let mut issue_map: HashMap<String, SecurityIssue> = HashMap::new();
        
        for issue in issues {
            // 创建更智能的去重键
            let key = format!(
                "{}:{}:{}:{}",
                issue.issue_type.to_string(),
                issue.location.as_ref().map(|l| l.file.clone()).unwrap_or_default(),
                issue.location.as_ref().map(|l| l.line).unwrap_or(0),
                issue.location.as_ref().map(|l| l.function.clone().unwrap_or_default()).unwrap_or_default()
            );
            
            // 如果已存在相同的问题，保留严重程度更高的
            if let Some(existing) = issue_map.get(&key) {
                if Self::severity_priority(&issue.severity) > Self::severity_priority(&existing.severity) {
                    issue_map.insert(key, issue);
                }
            } else {
                issue_map.insert(key, issue);
            }
        }
        
        issue_map.into_values().collect()
    }
    
    /// 优先级排序问题
    fn prioritize_issues(&self, mut issues: Vec<SecurityIssue>) -> Vec<SecurityIssue> {
        issues.sort_by(|a, b| {
            // 首先按严重程度排序
            let severity_cmp = Self::severity_priority(&b.severity).cmp(&Self::severity_priority(&a.severity));
            if severity_cmp != std::cmp::Ordering::Equal {
                return severity_cmp;
            }
            
            // 然后按问题类型排序（某些类型更重要）
            let type_cmp = Self::issue_type_priority(&b.issue_type).cmp(&Self::issue_type_priority(&a.issue_type));
            if type_cmp != std::cmp::Ordering::Equal {
                return type_cmp;
            }
            
            // 最后按标题排序
            a.title.cmp(&b.title)
        });
        
        issues
    }
    
    /// 严重程度优先级
    fn severity_priority(severity: &crate::types::IssueSeverity) -> u8 {
        match severity {
            crate::types::IssueSeverity::Critical => 5,
            crate::types::IssueSeverity::High => 4,
            crate::types::IssueSeverity::Medium => 3,
            crate::types::IssueSeverity::Low => 2,
            crate::types::IssueSeverity::Info => 1,
        }
    }
    
    /// 问题类型优先级
    fn issue_type_priority(issue_type: &crate::types::IssueType) -> u8 {
        match issue_type {
            crate::types::IssueType::Reentrancy => 10,
            crate::types::IssueType::AccessControl => 9,
            crate::types::IssueType::IntegerOverflow => 8,
            crate::types::IssueType::UncheckedExternalCall => 7,
            crate::types::IssueType::DenialOfService => 6,
            crate::types::IssueType::FrontRunning => 5,
            crate::types::IssueType::WeakRandomness => 4,
            crate::types::IssueType::TimestampDependence => 3,
            crate::types::IssueType::GasLimit => 2,
            crate::types::IssueType::UninitializedStorage => 2,
            crate::types::IssueType::Custom(_) => 1,
        }
    }
    
    /// 计算安全评分
    fn calculate_security_score(&self, issues: &[SecurityIssue]) -> u8 {
        if issues.is_empty() {
            return 100;
        }
        
        let mut score = 100u8;
        
        for issue in issues {
            let deduction = match issue.severity {
                crate::types::IssueSeverity::Critical => 25,
                crate::types::IssueSeverity::High => 15,
                crate::types::IssueSeverity::Medium => 8,
                crate::types::IssueSeverity::Low => 3,
                crate::types::IssueSeverity::Info => 1,
            };
            
            score = score.saturating_sub(deduction);
        }
        
        score
    }
    
    /// 生成建议
    fn generate_recommendations(&self, issues: &[SecurityIssue]) -> Vec<String> {
        let mut recommendations = Vec::new();
        
        if issues.iter().any(|i| matches!(i.severity, crate::types::IssueSeverity::Critical | crate::types::IssueSeverity::High)) {
            recommendations.push("发现高危安全问题，建议在部署前修复所有关键和高危问题".to_string());
        }
        
        if issues.iter().any(|i| matches!(i.issue_type, crate::types::IssueType::Reentrancy)) {
            recommendations.push("建议使用 ReentrancyGuard 修饰符防止重入攻击".to_string());
        }
        
        if issues.iter().any(|i| matches!(i.issue_type, crate::types::IssueType::AccessControl)) {
            recommendations.push("建议实现适当的访问控制机制".to_string());
        }
        
        if issues.iter().any(|i| matches!(i.issue_type, crate::types::IssueType::GasLimit)) {
            recommendations.push("建议优化 Gas 使用，避免 Gas 限制问题".to_string());
        }
        
        recommendations.push("建议进行全面的代码审查和测试".to_string());
        recommendations.push("建议在测试网络上进行充分测试后再部署到主网".to_string());
        
        recommendations
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::{SecurityConfig, AderynConfig, SlitherConfig, MythrilConfig, CustomRulesConfig, SecurityLevel};

    #[test]
    fn test_security_analyzer_creation() {
        let config = SecurityConfig {
            aderyn: AderynConfig {
                enabled: true,
                config_path: None,
                exclude_detectors: vec![],
                include_detectors: vec![],
                severity_filter: vec![],
            },
            slither: SlitherConfig {
                enabled: false,
                executable_path: "slither".to_string(),
                exclude_detectors: vec![],
                include_detectors: vec![],
            },
            mythril: MythrilConfig {
                enabled: false,
                executable_path: "myth".to_string(),
                timeout: 300,
                max_depth: 22,
            },
            custom_rules: CustomRulesConfig {
                enabled: false,
                rules_path: "rules".to_string(),
                custom_detectors: vec![],
            },
            security_level: SecurityLevel::High,
        };
        
        let analyzer = SecurityAnalyzer::new(config);
        
        assert!(analyzer.aderyn.is_some());
        assert!(analyzer.slither.is_none());
        assert!(analyzer.mythril.is_none());
    }
}