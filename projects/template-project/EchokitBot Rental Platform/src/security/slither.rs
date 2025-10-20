//! Slither 安全审计工具集成
//! 
//! Slither 是一个 Python 静态分析工具，通过进程调用集成

use crate::config::SlitherConfig;
use crate::error::{AiContractError, Result};
use crate::types::{SecurityAuditResult, SecurityIssue, IssueSeverity, IssueType, CodeLocation};
use serde::{Deserialize, Serialize};
use std::process::Command;
use tokio::fs;
use uuid::Uuid;

/// Slither 分析器
#[derive(Clone)]
pub struct SlitherAnalyzer {
    config: SlitherConfig,
}

/// Slither JSON 输出格式
#[derive(Debug, Deserialize, Serialize)]
struct SlitherOutput {
    success: bool,
    error: Option<String>,
    results: SlitherResults,
}

#[derive(Debug, Deserialize, Serialize)]
struct SlitherResults {
    detectors: Vec<SlitherDetector>,
}

#[derive(Debug, Deserialize, Serialize)]
struct SlitherDetector {
    check: String,
    impact: String,
    confidence: String,
    description: String,
    elements: Vec<SlitherElement>,
}

#[derive(Debug, Deserialize, Serialize)]
struct SlitherElement {
    #[serde(rename = "type")]
    element_type: String,
    name: String,
    source_mapping: Option<SlitherSourceMapping>,
}

#[derive(Debug, Deserialize, Serialize)]
struct SlitherSourceMapping {
    filename_relative: String,
    lines: Vec<u32>,
}

impl SlitherAnalyzer {
    /// 创建新的 Slither 分析器
    pub fn new(config: SlitherConfig) -> Self {
        Self { config }
    }
    
    /// 分析 Solidity 合约代码
    pub async fn analyze_contract(&self, contract_code: &str, contract_name: &str) -> Result<SecurityAuditResult> {
        if !self.config.enabled {
            return Err(AiContractError::internal_error("Slither 分析器未启用"));
        }
        
        // 检查 Slither 是否可用
        if !self.check_availability().await? {
            return Err(AiContractError::internal_error("Slither 未安装或不可用"));
        }
        
        // 创建临时目录和文件
        let temp_dir = tempfile::tempdir()
            .map_err(|e| AiContractError::internal_error(format!("创建临时目录失败: {}", e)))?;
        
        let contract_path = temp_dir.path().join(format!("{}.sol", contract_name));
        
        // 写入合约代码到临时文件
        fs::write(&contract_path, contract_code).await
            .map_err(|e| AiContractError::internal_error(format!("写入合约文件失败: {}", e)))?;
        
        // 运行 Slither
        let output = self.run_slither(&contract_path).await?;
        
        // 解析结果
        let issues = self.parse_slither_output(&output, contract_name)?;
        
        // 计算安全评分
        let security_score = self.calculate_security_score(&issues);
        
        Ok(SecurityAuditResult {
            audit_id: Uuid::new_v4(),
            audit_time: chrono::Utc::now(),
            security_score,
            issues: issues.clone(),
            tools_used: vec!["Slither".to_string()],
            summary: format!("Slither 分析完成，发现 {} 个问题", issues.len()),
            recommendations: self.generate_recommendations(&issues),
        })
    }
    
    /// 运行 Slither 命令
    async fn run_slither(&self, contract_path: &std::path::Path) -> Result<String> {
        let mut cmd = Command::new(&self.config.executable_path);
        
        cmd.arg(contract_path)
            .arg("--json")
            .arg("-");
        
        // 添加排除的检测器
        for detector in &self.config.exclude_detectors {
            cmd.arg("--exclude").arg(detector);
        }
        
        // 添加包含的检测器
        if !self.config.include_detectors.is_empty() {
            for detector in &self.config.include_detectors {
                cmd.arg("--detect").arg(detector);
            }
        }
        
        let output = cmd.output()
            .map_err(|e| AiContractError::internal_error(format!("执行 Slither 失败: {}", e)))?;
        
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            tracing::warn!("Slither 执行警告: {}", stderr);
        }
        
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        Ok(stdout)
    }
    
    /// 解析 Slither 输出
    fn parse_slither_output(&self, output: &str, contract_name: &str) -> Result<Vec<SecurityIssue>> {
        let mut issues = Vec::new();
        
        // 尝试解析 JSON 输出
        match serde_json::from_str::<SlitherOutput>(output) {
            Ok(slither_output) => {
                for detector in slither_output.results.detectors {
                    let severity = self.map_impact_to_severity(&detector.impact);
                    let issue_type = self.map_check_to_issue_type(&detector.check);
                    
                    // 提取位置信息
                    let location = detector.elements.first().and_then(|elem| {
                        elem.source_mapping.as_ref().map(|mapping| CodeLocation {
                            file: mapping.filename_relative.clone(),
                            line: mapping.lines.first().copied().unwrap_or(0),
                            column: None,
                            function: Some(elem.name.clone()),
                        })
                    });
                    
                    issues.push(SecurityIssue {
                        id: Uuid::new_v4().to_string(),
                        title: detector.check.clone(),
                        description: detector.description.clone(),
                        severity,
                        issue_type,
                        location,
                        fix_suggestion: None,
                        cwe_id: None,
                        fixed: false,
                    });
                }
            }
            Err(e) => {
                tracing::warn!("解析 Slither JSON 输出失败: {}, 输出: {}", e, output);
                // 如果 JSON 解析失败，尝试文本解析
                issues = self.parse_slither_text_output(output, contract_name)?;
            }
        }
        
        Ok(issues)
    }
    
    /// 解析 Slither 文本输出（备用方案）
    fn parse_slither_text_output(&self, output: &str, contract_name: &str) -> Result<Vec<SecurityIssue>> {
        let mut issues = Vec::new();
        
        // 简单的文本解析逻辑
        for line in output.lines() {
            if line.contains("Impact:") || line.contains("Confidence:") {
                issues.push(SecurityIssue {
                    id: Uuid::new_v4().to_string(),
                    title: "Slither 检测到问题".to_string(),
                    description: line.to_string(),
                    severity: IssueSeverity::Medium,
                    issue_type: IssueType::Custom("slither-detection".to_string()),
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
    
    /// 映射 Slither impact 到严重程度
    fn map_impact_to_severity(&self, impact: &str) -> IssueSeverity {
        match impact.to_lowercase().as_str() {
            "high" => IssueSeverity::High,
            "medium" => IssueSeverity::Medium,
            "low" => IssueSeverity::Low,
            "informational" => IssueSeverity::Info,
            _ => IssueSeverity::Medium,
        }
    }
    
    /// 映射 Slither check 到问题类型
    fn map_check_to_issue_type(&self, check: &str) -> IssueType {
        match check.to_lowercase().as_str() {
            s if s.contains("reentrancy") => IssueType::Reentrancy,
            s if s.contains("overflow") || s.contains("underflow") => IssueType::IntegerOverflow,
            s if s.contains("access") || s.contains("auth") => IssueType::AccessControl,
            s if s.contains("external") || s.contains("call") => IssueType::UncheckedExternalCall,
            s if s.contains("timestamp") => IssueType::TimestampDependence,
            s if s.contains("random") => IssueType::WeakRandomness,
            s if s.contains("gas") => IssueType::GasLimit,
            _ => IssueType::Custom(check.to_string()),
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
        
        recommendations.push("建议进行全面的代码审查".to_string());
        
        recommendations
    }
    
    /// 检查 Slither 是否可用
    pub async fn check_availability(&self) -> Result<bool> {
        let output = Command::new(&self.config.executable_path)
            .arg("--version")
            .output();
        
        match output {
            Ok(output) => Ok(output.status.success()),
            Err(_) => Ok(false),
        }
    }
    
    /// 获取 Slither 版本
    pub async fn get_version(&self) -> Result<String> {
        let output = Command::new(&self.config.executable_path)
            .arg("--version")
            .output()
            .map_err(|e| AiContractError::internal_error(format!("获取 Slither 版本失败: {}", e)))?;
        
        let version = String::from_utf8_lossy(&output.stdout).to_string();
        Ok(version.trim().to_string())
    }
}