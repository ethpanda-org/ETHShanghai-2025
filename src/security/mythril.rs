//! Mythril 安全审计工具集成
//! 
//! Mythril 是一个符号执行分析工具，用于深度安全分析

use crate::config::MythrilConfig;
use crate::error::{AiContractError, Result};
use crate::types::{SecurityAuditResult, SecurityIssue, IssueSeverity, IssueType, CodeLocation};
use serde::{Deserialize, Serialize};
use std::process::Command;
use std::time::Duration;
use tokio::fs;
use uuid::Uuid;

/// Mythril 分析器
#[derive(Clone)]
pub struct MythrilAnalyzer {
    config: MythrilConfig,
}

/// Mythril JSON 输出格式
#[derive(Debug, Deserialize, Serialize)]
struct MythrilOutput {
    success: bool,
    error: Option<String>,
    issues: Vec<MythrilIssue>,
}

#[derive(Debug, Deserialize, Serialize)]
struct MythrilIssue {
    title: String,
    description: String,
    #[serde(rename = "swc-id")]
    swc_id: Option<String>,
    severity: String,
    contract: String,
    function: Option<String>,
    address: Option<u64>,
    lineno: Option<u32>,
}

impl MythrilAnalyzer {
    /// 创建新的 Mythril 分析器
    pub fn new(config: MythrilConfig) -> Self {
        Self { config }
    }
    
    /// 分析 Solidity 合约代码
    pub async fn analyze_contract(&self, contract_code: &str, contract_name: &str) -> Result<SecurityAuditResult> {
        if !self.config.enabled {
            return Err(AiContractError::internal_error("Mythril 分析器未启用"));
        }
        
        // 检查 Mythril 是否可用
        if !self.check_availability().await? {
            return Err(AiContractError::internal_error("Mythril 未安装或不可用"));
        }
        
        // 创建临时目录和文件
        let temp_dir = tempfile::tempdir()
            .map_err(|e| AiContractError::internal_error(format!("创建临时目录失败: {}", e)))?;
        
        let contract_path = temp_dir.path().join(format!("{}.sol", contract_name));
        
        // 写入合约代码到临时文件
        fs::write(&contract_path, contract_code).await
            .map_err(|e| AiContractError::internal_error(format!("写入合约文件失败: {}", e)))?;
        
        // 运行 Mythril
        let output = self.run_mythril(&contract_path).await?;
        
        // 解析结果
        let issues = self.parse_mythril_output(&output, contract_name)?;
        
        // 计算安全评分
        let security_score = self.calculate_security_score(&issues);
        
        Ok(SecurityAuditResult {
            audit_id: Uuid::new_v4(),
            audit_time: chrono::Utc::now(),
            security_score,
            issues: issues.clone(),
            tools_used: vec!["Mythril".to_string()],
            summary: format!("Mythril 符号执行分析完成，发现 {} 个问题", issues.len()),
            recommendations: self.generate_recommendations(&issues),
        })
    }
    
    /// 运行 Mythril 命令
    async fn run_mythril(&self, contract_path: &std::path::Path) -> Result<String> {
        let mut cmd = Command::new(&self.config.executable_path);
        
        cmd.arg("analyze")
            .arg(contract_path)
            .arg("--solv")
            .arg("0.8.0")
            .arg("--execution-timeout")
            .arg(self.config.timeout.to_string())
            .arg("--max-depth")
            .arg(self.config.max_depth.to_string())
            .arg("-o")
            .arg("json");
        
        // 设置超时
        let output = tokio::time::timeout(
            Duration::from_secs(self.config.timeout as u64 + 10),
            tokio::task::spawn_blocking(move || cmd.output())
        )
        .await
        .map_err(|_| AiContractError::internal_error("Mythril 执行超时"))?
        .map_err(|e| AiContractError::internal_error(format!("Mythril 任务执行失败: {}", e)))?
        .map_err(|e| AiContractError::internal_error(format!("执行 Mythril 失败: {}", e)))?;
        
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            tracing::warn!("Mythril 执行警告: {}", stderr);
        }
        
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        Ok(stdout)
    }
    
    /// 解析 Mythril 输出
    fn parse_mythril_output(&self, output: &str, contract_name: &str) -> Result<Vec<SecurityIssue>> {
        let mut issues = Vec::new();
        
        // 尝试解析 JSON 输出
        match serde_json::from_str::<MythrilOutput>(output) {
            Ok(mythril_output) => {
                for issue in mythril_output.issues {
                    let severity = self.map_severity(&issue.severity);
                    let issue_type = self.map_swc_to_issue_type(issue.swc_id.as_deref());
                    
                    issues.push(SecurityIssue {
                        id: Uuid::new_v4().to_string(),
                        title: issue.title.clone(),
                        description: issue.description.clone(),
                        severity,
                        issue_type,
                        location: Some(CodeLocation {
                            file: format!("{}.sol", contract_name),
                            line: issue.lineno.unwrap_or(0),
                            column: None,
                            function: issue.function.clone(),
                        }),
                        fix_suggestion: None,
                        cwe_id: issue.swc_id.clone(),
                        fixed: false,
                    });
                }
            }
            Err(e) => {
                tracing::warn!("解析 Mythril JSON 输出失败: {}, 输出: {}", e, output);
                // 如果 JSON 解析失败，尝试文本解析
                issues = self.parse_mythril_text_output(output, contract_name)?;
            }
        }
        
        Ok(issues)
    }
    
    /// 解析 Mythril 文本输出（备用方案）
    fn parse_mythril_text_output(&self, output: &str, contract_name: &str) -> Result<Vec<SecurityIssue>> {
        let mut issues = Vec::new();
        
        // 简单的文本解析逻辑
        for line in output.lines() {
            if line.contains("SWC ID:") || line.contains("Severity:") {
                issues.push(SecurityIssue {
                    id: Uuid::new_v4().to_string(),
                    title: "Mythril 检测到问题".to_string(),
                    description: line.to_string(),
                    severity: IssueSeverity::Medium,
                    issue_type: IssueType::Custom("mythril-detection".to_string()),
                    location: Some(CodeLocation {
                        file: format!("{}.sol", contract_name),
                        line: 0,
                        column: None,
                        function: None,
                    }),
                    fix_suggestion: None,
                    cwe_id: None,
                    fixed: false,
                });
            }
        }
        
        Ok(issues)
    }
    
    /// 映射严重程度
    fn map_severity(&self, severity: &str) -> IssueSeverity {
        match severity.to_lowercase().as_str() {
            "high" => IssueSeverity::High,
            "medium" => IssueSeverity::Medium,
            "low" => IssueSeverity::Low,
            _ => IssueSeverity::Medium,
        }
    }
    
    /// 映射 SWC ID 到问题类型
    fn map_swc_to_issue_type(&self, swc_id: Option<&str>) -> IssueType {
        match swc_id {
            Some("107") => IssueType::Reentrancy,
            Some("101") => IssueType::IntegerOverflow,
            Some("105") => IssueType::UncheckedExternalCall,
            Some("116") => IssueType::TimestampDependence,
            Some("120") => IssueType::WeakRandomness,
            Some("115") => IssueType::AccessControl,
            Some(id) => IssueType::Custom(format!("SWC-{}", id)),
            None => IssueType::Custom("unknown".to_string()),
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
                IssueSeverity::Critical => 25,
                IssueSeverity::High => 15,
                IssueSeverity::Medium => 8,
                IssueSeverity::Low => 3,
                IssueSeverity::Info => 1,
            };
            
            score = score.saturating_sub(deduction);
        }
        
        score
    }
    
    /// 生成建议
    fn generate_recommendations(&self, issues: &[SecurityIssue]) -> Vec<String> {
        let mut recommendations = Vec::new();
        
        if issues.iter().any(|i| matches!(i.severity, IssueSeverity::High)) {
            recommendations.push("发现高危安全问题，建议在部署前修复".to_string());
        }
        
        if issues.iter().any(|i| matches!(i.issue_type, IssueType::Reentrancy)) {
            recommendations.push("发现重入攻击风险，建议使用 ReentrancyGuard".to_string());
        }
        
        recommendations.push("建议进行全面的代码审查和测试".to_string());
        
        recommendations
    }
    
    /// 检查 Mythril 是否可用
    pub async fn check_availability(&self) -> Result<bool> {
        let output = Command::new(&self.config.executable_path)
            .arg("version")
            .output();
        
        match output {
            Ok(output) => Ok(output.status.success()),
            Err(_) => Ok(false),
        }
    }
    
    /// 获取 Mythril 版本
    pub async fn get_version(&self) -> Result<String> {
        let output = Command::new(&self.config.executable_path)
            .arg("version")
            .output()
            .map_err(|e| AiContractError::internal_error(format!("获取 Mythril 版本失败: {}", e)))?;
        
        let version = String::from_utf8_lossy(&output.stdout).to_string();
        Ok(version.trim().to_string())
    }
}