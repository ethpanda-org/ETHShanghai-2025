//! Solidity 编译器
//! 
//! 提供 Solidity 合约编译功能，集成 Foundry 的 solc 编译器

use crate::error::{Result, AgentError};
use crate::types::{CompilationResult, CompilationWarning, CompilationError, CodeLocation, GasEstimates};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::process::Command;
use tempfile::TempDir;
use tokio::fs;
use tracing::{debug, info, warn, error};

/// Solidity 编译器配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompilerConfig {
    /// Solidity 编译器版本
    pub solc_version: String,
    
    /// 优化运行次数
    pub optimizer_runs: u32,
    
    /// 是否启用优化
    pub optimizer_enabled: bool,
    
    /// EVM 版本
    pub evm_version: String,
    
    /// 是否生成源码映射
    pub generate_source_map: bool,
    
    /// 是否生成 Gas 估算
    pub generate_gas_estimates: bool,
    
    /// 额外的编译器参数
    pub extra_args: Vec<String>,
}

impl Default for CompilerConfig {
    fn default() -> Self {
        Self {
            solc_version: "0.8.21".to_string(),
            optimizer_runs: 200,
            optimizer_enabled: true,
            evm_version: "paris".to_string(),
            generate_source_map: true,
            generate_gas_estimates: true,
            extra_args: Vec::new(),
        }
    }
}

/// Solidity 编译器
pub struct SolidityCompiler {
    /// 编译器配置
    config: CompilerConfig,
    
    /// 临时工作目录
    temp_dir: Option<TempDir>,
}

impl SolidityCompiler {
    /// 创建新的编译器
    pub fn new(config: CompilerConfig) -> Self {
        Self {
            config,
            temp_dir: None,
        }
    }
    
    /// 使用默认配置创建编译器
    pub fn with_defaults() -> Self {
        Self::new(CompilerConfig::default())
    }
    
    /// 编译 Solidity 代码
    pub async fn compile(&mut self, source_code: &str, contract_name: &str) -> Result<CompilationResult> {
        info!("开始编译合约: {}", contract_name);
        let start_time = std::time::Instant::now();
        
        // 创建临时目录
        let temp_dir = TempDir::new()
            .map_err(|e| AgentError::CompilationFailed(format!("创建临时目录失败: {}", e)))?;
        
        // 写入源代码到临时文件
        let source_file = temp_dir.path().join(format!("{}.sol", contract_name));
        fs::write(&source_file, source_code).await
            .map_err(|e| AgentError::CompilationFailed(format!("写入源文件失败: {}", e)))?;
        
        debug!("源文件路径: {:?}", source_file);
        
        // 使用 forge 编译合约
        let compilation_output = self.compile_with_forge(&source_file, contract_name).await?;
        
        // 解析编译输出
        let result = self.parse_compilation_output(compilation_output, contract_name).await?;
        
        let elapsed = start_time.elapsed();
        info!("编译完成，耗时: {:?}", elapsed);
        
        // 保存临时目录引用
        self.temp_dir = Some(temp_dir);
        
        Ok(result)
    }
    
    /// 使用 forge 编译合约
    async fn compile_with_forge(&self, source_file: &Path, contract_name: &str) -> Result<String> {
        debug!("使用 forge 编译合约");
        
        // 检查 forge 是否可用
        let forge_check = Command::new("forge")
            .arg("--version")
            .output();
        
        if forge_check.is_err() {
            return Err(AgentError::CompilationFailed(
                "Foundry (forge) 未安装或不在 PATH 中。请安装 Foundry: https://book.getfoundry.sh/getting-started/installation".to_string()
            ));
        }
        
        // 构建编译命令
        let mut cmd = Command::new("forge");
        cmd.arg("build")
            .arg("--contracts")
            .arg(source_file.parent().unwrap())
            .arg("--force")
            .arg("--json");
        
        // 添加优化器配置
        if self.config.optimizer_enabled {
            cmd.arg("--optimize")
                .arg("--optimizer-runs")
                .arg(self.config.optimizer_runs.to_string());
        }
        
        // 添加 EVM 版本
        cmd.arg("--evm-version")
            .arg(&self.config.evm_version);
        
        // 添加额外参数
        for arg in &self.config.extra_args {
            cmd.arg(arg);
        }
        
        debug!("执行命令: {:?}", cmd);
        
        // 执行编译
        let output = cmd.output()
            .map_err(|e| AgentError::CompilationFailed(format!("执行 forge 失败: {}", e)))?;
        
        let stdout = String::from_utf8_lossy(&output.stdout);
        let stderr = String::from_utf8_lossy(&output.stderr);
        
        debug!("编译输出 (stdout): {}", stdout);
        if !stderr.is_empty() {
            debug!("编译输出 (stderr): {}", stderr);
        }
        
        if !output.status.success() {
            return Err(AgentError::CompilationFailed(format!(
                "编译失败: {}\n{}",
                stdout, stderr
            )));
        }
        
        Ok(format!("{}\n{}", stdout, stderr))
    }
    
    /// 解析编译输出
    async fn parse_compilation_output(&self, output: String, contract_name: &str) -> Result<CompilationResult> {
        debug!("解析编译输出");
        
        let mut warnings = Vec::new();
        let mut errors = Vec::new();
        let mut success = true;
        
        // 解析警告和错误
        for line in output.lines() {
            if line.contains("Warning:") {
                warnings.push(self.parse_warning(line));
            } else if line.contains("Error:") {
                errors.push(self.parse_error(line));
                success = false;
            }
        }
        
        // 如果编译成功，尝试读取编译产物
        let (abi, bytecode, deployed_bytecode, source_map) = if success {
            self.read_compilation_artifacts(contract_name).await?
        } else {
            (None, None, None, None)
        };
        
        // 估算 Gas
        let gas_estimates = if success && self.config.generate_gas_estimates {
            self.estimate_gas(&bytecode, &abi).await?
        } else {
            None
        };
        
        Ok(CompilationResult {
            success,
            compile_time: Utc::now(),
            compiler_version: self.config.solc_version.clone(),
            abi,
            bytecode,
            deployed_bytecode,
            source_map,
            warnings,
            errors,
            gas_estimates,
        })
    }
    
    /// 解析警告信息
    fn parse_warning(&self, line: &str) -> CompilationWarning {
        // 简单的警告解析
        CompilationWarning {
            message: line.to_string(),
            location: None,
            warning_type: "General".to_string(),
        }
    }
    
    /// 解析错误信息
    fn parse_error(&self, line: &str) -> CompilationError {
        // 简单的错误解析
        CompilationError {
            message: line.to_string(),
            location: None,
            error_type: "CompilationError".to_string(),
        }
    }
    
    /// 读取编译产物
    async fn read_compilation_artifacts(&self, contract_name: &str) -> Result<(Option<String>, Option<String>, Option<String>, Option<String>)> {
        debug!("读取编译产物");
        
        // 在实际实现中，这里应该从 forge 的输出目录读取 JSON 文件
        // 由于我们使用临时目录，这里返回模拟数据
        // 在生产环境中，需要解析 out/ 目录下的 JSON 文件
        
        // TODO: 实现实际的产物读取逻辑
        // 这需要解析 forge 生成的 JSON 文件
        
        Ok((
            Some("[]".to_string()), // ABI
            Some("0x".to_string()), // Bytecode
            Some("0x".to_string()), // Deployed bytecode
            if self.config.generate_source_map {
                Some("".to_string()) // Source map
            } else {
                None
            },
        ))
    }
    
    /// 估算 Gas 消耗
    async fn estimate_gas(&self, bytecode: &Option<String>, abi: &Option<String>) -> Result<Option<GasEstimates>> {
        debug!("估算 Gas 消耗");
        
        if bytecode.is_none() || abi.is_none() {
            return Ok(None);
        }
        
        // 简单的 Gas 估算
        // 在实际实现中，应该使用更精确的方法
        let deployment_gas = bytecode.as_ref().unwrap().len() as u64 * 200;
        
        Ok(Some(GasEstimates {
            deployment: deployment_gas,
            functions: HashMap::new(),
            gas_limit: 30_000_000, // 默认 Gas 限制
        }))
    }
    
    /// 验证合约语法
    pub async fn validate_syntax(&self, source_code: &str) -> Result<bool> {
        debug!("验证合约语法");
        
        // 创建临时文件
        let temp_dir = TempDir::new()
            .map_err(|e| AgentError::CompilationFailed(format!("创建临时目录失败: {}", e)))?;
        
        let source_file = temp_dir.path().join("temp.sol");
        fs::write(&source_file, source_code).await
            .map_err(|e| AgentError::CompilationFailed(format!("写入源文件失败: {}", e)))?;
        
        // 使用 solc 验证语法
        let output = Command::new("forge")
            .arg("build")
            .arg("--contracts")
            .arg(temp_dir.path())
            .arg("--force")
            .output()
            .map_err(|e| AgentError::CompilationFailed(format!("执行验证失败: {}", e)))?;
        
        Ok(output.status.success())
    }
    
    /// 获取编译器版本
    pub async fn get_compiler_version(&self) -> Result<String> {
        let output = Command::new("forge")
            .arg("--version")
            .output()
            .map_err(|e| AgentError::CompilationFailed(format!("获取版本失败: {}", e)))?;
        
        let version = String::from_utf8_lossy(&output.stdout);
        Ok(version.trim().to_string())
    }
}

impl Drop for SolidityCompiler {
    fn drop(&mut self) {
        // 临时目录会自动清理
        debug!("清理编译器资源");
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_compiler_creation() {
        let compiler = SolidityCompiler::with_defaults();
        assert_eq!(compiler.config.solc_version, "0.8.21");
        assert!(compiler.config.optimizer_enabled);
    }

    #[tokio::test]
    async fn test_config_default() {
        let config = CompilerConfig::default();
        assert_eq!(config.optimizer_runs, 200);
        assert_eq!(config.evm_version, "paris");
    }
}