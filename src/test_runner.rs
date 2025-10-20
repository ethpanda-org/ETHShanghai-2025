//! 集成测试运行器
//! 
//! 提供统一的测试执行入口，支持不同类型的测试套件执行

use crate::{
    integration_tests::{
        IntegrationTestSuite, 
        TestResults, 
        DeploymentValidationResults, 
        SecurityTestResults
    },
    config::AiContractGeneratorConfig,
    error::Result,
};
use std::time::{Duration, Instant};
use tracing::{info, warn, error};
use serde::{Serialize, Deserialize};
use tokio::fs;

/// 测试运行器配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestRunnerConfig {
    /// 是否运行端到端测试
    pub run_e2e_tests: bool,
    /// 是否运行部署验证
    pub run_deployment_validation: bool,
    /// 是否运行安全测试
    pub run_security_tests: bool,
    /// 测试超时时间（秒）
    pub test_timeout_seconds: u64,
    /// 测试报告输出路径
    pub report_output_path: String,
}

impl Default for TestRunnerConfig {
    fn default() -> Self {
        Self {
            run_e2e_tests: true,
            run_deployment_validation: true,
            run_security_tests: true,
            test_timeout_seconds: 300,
            report_output_path: "test_reports".to_string(),
        }
    }
}

/// 完整测试报告
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FullTestReport {
    pub timestamp: String,
    pub duration_secs: u64,
    pub e2e_results: Option<TestResults>,
    pub deployment_results: Option<DeploymentValidationResults>,
    pub security_results: Option<SecurityTestResults>,
    pub overall_status: TestStatus,
}

/// 测试状态
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum TestStatus {
    Passed,
    Failed,
    PartiallyPassed,
    Skipped,
}

/// 集成测试运行器
pub struct IntegrationTestRunner {
    config: TestRunnerConfig,
    system_config: AiContractGeneratorConfig,
    test_suite: IntegrationTestSuite,
}

impl IntegrationTestRunner {
    /// 创建新的测试运行器
    pub async fn new(
        test_config: TestRunnerConfig,
        system_config: AiContractGeneratorConfig,
    ) -> Result<Self> {
        info!("初始化集成测试运行器");
        
        let test_suite = IntegrationTestSuite::new(system_config.clone()).await?;
        
        Ok(Self {
            config: test_config,
            system_config,
            test_suite,
        })
    }

    /// 运行所有测试
    pub async fn run_all_tests(&self) -> Result<FullTestReport> {
        info!("开始运行所有集成测试");
        let start_time = Instant::now();
        
        let mut report = FullTestReport {
            timestamp: chrono::Utc::now().to_rfc3339(),
            duration_secs: 0,
            e2e_results: None,
            deployment_results: None,
            security_results: None,
            overall_status: TestStatus::Passed,
        };

        // 运行端到端测试
        if self.config.run_e2e_tests {
            info!("运行端到端测试...");
            match self.test_suite.run_e2e_tests().await {
                Ok(results) => {
                    info!("端到端测试完成: {}/{} 通过", results.passed, results.total);
                    if results.failed > 0 {
                        report.overall_status = TestStatus::PartiallyPassed;
                    }
                    report.e2e_results = Some(results);
                }
                Err(e) => {
                    error!("端到端测试失败: {}", e);
                    report.overall_status = TestStatus::Failed;
                }
            }
        }

        // 运行部署验证
        if self.config.run_deployment_validation {
            info!("运行部署验证...");
            match self.test_suite.run_deployment_validation().await {
                Ok(results) => {
                    info!("部署验证完成: {}/{} 通过", 
                          results.network_tests_passed, results.total_tests);
                    if results.network_tests_failed > 0 {
                        report.overall_status = TestStatus::PartiallyPassed;
                    }
                    report.deployment_results = Some(results);
                }
                Err(e) => {
                    error!("部署验证失败: {}", e);
                    report.overall_status = TestStatus::Failed;
                }
            }
        }

        // 运行安全测试
        if self.config.run_security_tests {
            info!("运行安全测试...");
            match self.test_suite.run_security_tests().await {
                Ok(results) => {
                    info!("安全测试完成: {}/{} 通过", results.passed, results.total);
                    if results.failed > 0 {
                        report.overall_status = TestStatus::PartiallyPassed;
                    }
                    report.security_results = Some(results);
                }
                Err(e) => {
                    error!("安全测试失败: {}", e);
                    report.overall_status = TestStatus::Failed;
                }
            }
        }

        report.duration_secs = start_time.elapsed().as_secs();
        
        // 保存报告
        self.save_report(&report).await?;
        
        info!("所有测试完成，总耗时: {} 秒", report.duration_secs);
        Ok(report)
    }

    /// 保存测试报告
    async fn save_report(&self, report: &FullTestReport) -> Result<()> {
        // 创建报告目录
        fs::create_dir_all(&self.config.report_output_path).await
            .map_err(|e| crate::error::AiContractError::storage_error(
                format!("创建报告目录失败: {}", e)
            ))?;

        // 生成报告文件名
        let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
        let report_path = format!("{}/integration_test_report_{}.json", 
                                 self.config.report_output_path, timestamp);

        // 序列化并保存报告
        let report_json = serde_json::to_string_pretty(report)
            .map_err(|e| crate::error::AiContractError::serialization_error(
                format!("序列化报告失败: {}", e)
            ))?;

        fs::write(&report_path, report_json).await
            .map_err(|e| crate::error::AiContractError::storage_error(
                format!("写入报告文件失败: {}", e)
            ))?;

        info!("测试报告已保存到: {}", report_path);
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_runner_creation() {
        let test_config = TestRunnerConfig::default();
        let system_config = AiContractGeneratorConfig::default();
        
        let result = IntegrationTestRunner::new(test_config, system_config).await;
        assert!(result.is_ok());
    }
}
