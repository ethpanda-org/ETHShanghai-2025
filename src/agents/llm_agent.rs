//! LLM集成Agent
//! 
//! 基于Rig框架的真实LLM调用实现

use super::base::{Agent, AgentContext, AgentOutput, AgentResult, AgentError};
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use reqwest::Client;
use serde_json::Value;

/// LLM Agent配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LLMAgentConfig {
    /// 模型名称
    pub model_name: String,
    
    /// API基础URL
    pub base_url: String,
    
    /// API密钥
    pub api_key: String,
    
    /// 温度参数
    pub temperature: f32,
    
    /// 最大token数
    pub max_tokens: u32,
    
    /// 超时时间（秒）
    pub timeout: u64,
}

/// LLM Agent实现
pub struct LLMAgent {
    config: LLMAgentConfig,
    client: Client,
    agent_type: String,
}

/// LLM请求结构
#[derive(Debug, Serialize)]
struct LLMRequest {
    model: String,
    messages: Vec<LLMMessage>,
    temperature: f32,
    max_tokens: u32,
    stream: bool,
}

/// LLM消息结构
#[derive(Debug, Serialize)]
struct LLMMessage {
    role: String,
    content: String,
}

/// LLM响应结构
#[derive(Debug, Deserialize)]
struct LLMResponse {
    choices: Vec<LLMChoice>,
    usage: Option<LLMUsage>,
}

#[derive(Debug, Deserialize)]
struct LLMChoice {
    message: LLMResponseMessage,
    finish_reason: Option<String>,
}

#[derive(Debug, Deserialize)]
struct LLMResponseMessage {
    role: String,
    content: String,
}

#[derive(Debug, Deserialize)]
struct LLMUsage {
    prompt_tokens: u32,
    completion_tokens: u32,
    total_tokens: u32,
}

impl LLMAgent {
    pub fn new(config: LLMAgentConfig, agent_type: String) -> Self {
        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(config.timeout))
            .build()
            .expect("Failed to create HTTP client");
            
        Self {
            config,
            client,
            agent_type,
        }
    }
    
    /// 调用LLM API
    async fn call_llm(&self, prompt: &str, context: &str) -> AgentResult<String> {
        let messages = vec![
            LLMMessage {
                role: "system".to_string(),
                content: self.get_system_prompt(),
            },
            LLMMessage {
                role: "user".to_string(),
                content: format!("Context: {}\n\nTask: {}", context, prompt),
            },
        ];
        
        let request = LLMRequest {
            model: self.config.model_name.clone(),
            messages,
            temperature: self.config.temperature,
            max_tokens: self.config.max_tokens,
            stream: false,
        };
        
        let response = self.client
            .post(&format!("{}/chat/completions", self.config.base_url))
            .header("Authorization", format!("Bearer {}", self.config.api_key))
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await
            .map_err(|e| AgentError::ExecutionError(format!("HTTP request failed: {}", e)))?;
            
        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(AgentError::ExecutionError(format!(
                "LLM API error {}: {}", status, error_text
            )));
        }
        
        let llm_response: LLMResponse = response
            .json()
            .await
            .map_err(|e| AgentError::ExecutionError(format!("Failed to parse response: {}", e)))?;
            
        if llm_response.choices.is_empty() {
            return Err(AgentError::ExecutionError("No response from LLM".to_string()));
        }
        
        Ok(llm_response.choices[0].message.content.clone())
    }
    
    /// 获取系统提示词
    fn get_system_prompt(&self) -> String {
        match self.agent_type.as_str() {
            "requirements_parser" => {
                r#"You are an expert blockchain requirements analyst. Your task is to analyze user requirements and generate detailed technical specifications for smart contracts.

Focus on:
1. Extracting core functional requirements
2. Identifying security requirements
3. Suggesting appropriate Solidity patterns
4. Estimating complexity and development time
5. Risk assessment

Respond in structured markdown format with clear sections."#.to_string()
            }
            "contract_generator" => {
                r#"You are an expert Solidity smart contract developer. Your task is to generate secure, efficient, and well-documented smart contracts based on technical specifications.

Focus on:
1. Writing clean, secure Solidity code
2. Following best practices and patterns
3. Implementing proper access controls
4. Adding comprehensive comments
5. Using OpenZeppelin libraries when appropriate

Generate complete, compilable Solidity contracts."#.to_string()
            }
            "security_auditor" => {
                r#"You are an expert smart contract security auditor. Your task is to analyze smart contracts for security vulnerabilities and provide detailed audit reports.

Focus on:
1. Identifying common vulnerabilities (reentrancy, overflow, etc.)
2. Checking access control mechanisms
3. Analyzing gas optimization opportunities
4. Verifying business logic correctness
5. Providing actionable recommendations

Provide detailed security analysis with severity ratings."#.to_string()
            }
            "optimizer" => {
                r#"You are an expert smart contract optimizer. Your task is to analyze contracts and suggest optimizations for gas efficiency, security, and maintainability.

Focus on:
1. Gas optimization techniques
2. Code structure improvements
3. Security enhancements
4. Readability improvements
5. Performance optimizations

Provide specific optimization suggestions with code examples."#.to_string()
            }
            "deployment" => {
                r#"You are an expert blockchain deployment specialist. Your task is to generate deployment scripts, configurations, and documentation for smart contracts.

Focus on:
1. Creating deployment scripts
2. Network configuration
3. Gas estimation
4. Verification procedures
5. Monitoring setup

Generate complete deployment packages with documentation."#.to_string()
            }
            _ => {
                "You are an AI assistant specialized in blockchain and smart contract development. Provide helpful, accurate, and detailed responses.".to_string()
            }
        }
    }
}

#[async_trait]
impl Agent for LLMAgent {
    fn name(&self) -> &str {
        &self.agent_type
    }
    
    fn description(&self) -> &str {
        match self.agent_type.as_str() {
            "requirements_parser" => "AI-powered requirements analysis using LLM",
            "contract_generator" => "AI-powered smart contract generation using LLM",
            "security_auditor" => "AI-powered security audit using LLM",
            "optimizer" => "AI-powered code optimization using LLM",
            "deployment" => "AI-powered deployment configuration using LLM",
            _ => "AI-powered assistant using LLM",
        }
    }
    
    fn specialties(&self) -> Vec<String> {
        match self.agent_type.as_str() {
            "requirements_parser" => vec![
                "需求分析".to_string(),
                "技术规格设计".to_string(),
                "风险评估".to_string(),
                "架构建议".to_string(),
            ],
            "contract_generator" => vec![
                "Solidity编程".to_string(),
                "智能合约架构".to_string(),
                "代码生成".to_string(),
                "最佳实践".to_string(),
            ],
            "security_auditor" => vec![
                "安全漏洞检测".to_string(),
                "代码审计".to_string(),
                "风险评估".to_string(),
                "安全建议".to_string(),
            ],
            "optimizer" => vec![
                "Gas优化".to_string(),
                "代码重构".to_string(),
                "性能优化".to_string(),
                "最佳实践".to_string(),
            ],
            "deployment" => vec![
                "部署脚本".to_string(),
                "网络配置".to_string(),
                "成本估算".to_string(),
                "监控配置".to_string(),
            ],
            _ => vec!["通用AI助手".to_string()],
        }
    }
    
    fn preferred_models(&self) -> Vec<String> {
        match self.agent_type.as_str() {
            "requirements_parser" => vec!["gpt-4".to_string(), "qwen-max".to_string()],
            "contract_generator" => vec!["qwen-max".to_string(), "gpt-4".to_string()],
            "security_auditor" => vec!["gpt-4".to_string(), "claude-3".to_string()],
            "optimizer" => vec!["gpt-4".to_string(), "claude-3".to_string()],
            "deployment" => vec!["gpt-4".to_string(), "qwen-max".to_string()],
            _ => vec!["gpt-4".to_string()],
        }
    }
    
    async fn execute(&self, context: &AgentContext) -> AgentResult<AgentOutput> {
        let prompt = match self.agent_type.as_str() {
            "requirements_parser" => {
                format!("Analyze the following requirements and generate a detailed technical specification:\n\n{}", context.user_input)
            }
            "contract_generator" => {
                format!("Generate a Solidity smart contract based on the following specifications:\n\n{}", context.user_input)
            }
            "security_auditor" => {
                format!("Perform a security audit on the following smart contract:\n\n{}", context.user_input)
            }
            "optimizer" => {
                format!("Analyze and optimize the following smart contract:\n\n{}", context.user_input)
            }
            "deployment" => {
                format!("Generate deployment configuration for the following contract:\n\n{}", context.user_input)
            }
            _ => context.user_input.clone(),
        };
        
        // 调用LLM
        let response = self.call_llm(&prompt, "").await?;
        
        // 生成元数据
        let mut metadata = HashMap::new();
        metadata.insert("model".to_string(), serde_json::Value::String(self.config.model_name.clone()));
        metadata.insert("agent_type".to_string(), serde_json::Value::String(self.agent_type.clone()));
        metadata.insert("temperature".to_string(), serde_json::Value::Number(serde_json::Number::from_f64(self.config.temperature as f64).unwrap()));
        
        // 计算置信度（基于响应长度和内容质量的简单启发式）
        let confidence = self.calculate_confidence(&response);
        
        // 建议下一步操作
        let next_actions = match self.agent_type.as_str() {
            "requirements_parser" => vec!["生成智能合约代码".to_string()],
            "contract_generator" => vec!["进行安全审计".to_string()],
            "security_auditor" => vec!["优化代码".to_string()],
            "optimizer" => vec!["准备部署".to_string()],
            "deployment" => vec!["执行部署".to_string()],
            _ => vec!["继续处理".to_string()],
        };
        
        Ok(AgentOutput {
            content: response,
            metadata,
            confidence,
            next_actions,
            generated_files: vec![],
        })
    }
}

impl LLMAgent {
    fn calculate_confidence(&self, response: &str) -> f64 {
        let mut confidence = 0.5; // 基础置信度
        
        // 基于响应长度
        let length = response.len();
        if length > 1000 {
            confidence += 0.2;
        } else if length > 500 {
            confidence += 0.1;
        }
        
        // 基于内容质量指标
        if response.contains("```") {
            confidence += 0.1; // 包含代码块
        }
        if response.contains("##") || response.contains("###") {
            confidence += 0.1; // 结构化内容
        }
        if response.contains("function") || response.contains("contract") {
            confidence += 0.1; // 包含Solidity关键词
        }
        
        confidence.min(1.0)
    }
}

/// 创建LLM Agent工厂
pub struct LLMAgentFactory;

impl LLMAgentFactory {
    /// 从配置文件创建LLM Agent
    pub async fn create_from_config(
        agent_type: &str,
        config_path: &str,
    ) -> AgentResult<LLMAgent> {
        // 读取配置文件
        let config_content = tokio::fs::read_to_string(config_path)
            .await
            .map_err(|e| AgentError::ConfigError(format!("Failed to read config: {}", e)))?;
            
        let config: serde_json::Value = serde_json::from_str(&config_content)
            .map_err(|e| AgentError::ConfigError(format!("Failed to parse config: {}", e)))?;
            
        // 获取启用的供应商
        let providers = config["providers"].as_array()
            .ok_or_else(|| AgentError::ConfigError("No providers found".to_string()))?;
            
        let enabled_provider = providers
            .iter()
            .find(|p| p["enabled"].as_bool().unwrap_or(false))
            .ok_or_else(|| AgentError::ConfigError("No enabled provider found".to_string()))?;
            
        // 解析供应商配置
        let provider_type = enabled_provider["type"].as_str()
            .ok_or_else(|| AgentError::ConfigError("Provider type not found".to_string()))?;
            
        let api_key = enabled_provider["api_key"].as_str()
            .ok_or_else(|| AgentError::ConfigError("API key not found".to_string()))?;
            
        // 解析环境变量
        let api_key = if api_key.starts_with("${") && api_key.ends_with('}') {
            let var_name = &api_key[2..api_key.len()-1];
            std::env::var(var_name)
                .map_err(|_| AgentError::ConfigError(format!("Environment variable {} not set", var_name)))?
        } else {
            api_key.to_string()
        };
        
        // 获取基础URL
        let base_url = match provider_type {
            "alibaba_bailian" => "https://dashscope.aliyuncs.com/compatible-mode/v1",
            "open_a_i" => "https://api.openai.com/v1",
            "zhipu_g_l_m" => "https://open.bigmodel.cn/api/paas/v4",
            "anthropic_claude" => "https://api.anthropic.com/v1",
            _ => return Err(AgentError::ConfigError(format!("Unknown provider type: {}", provider_type))),
        };
        
        // 获取模型映射
        let model_mapping = enabled_provider["model_mapping"].as_object()
            .ok_or_else(|| AgentError::ConfigError("Model mapping not found".to_string()))?;
            
        // 根据Agent类型选择合适的模型
        let preferred_models = match agent_type {
            "requirements_parser" => vec!["gpt-4", "qwen-max"],
            "contract_generator" => vec!["qwen-max", "gpt-4"],
            "security_auditor" => vec!["gpt-4", "claude-3"],
            "optimizer" => vec!["gpt-4", "claude-3"],
            "deployment" => vec!["gpt-4", "qwen-max"],
            _ => vec!["gpt-4"],
        };
        
        let model_name = preferred_models
            .iter()
            .find_map(|model| model_mapping.get(*model))
            .and_then(|v| v.as_str())
            .unwrap_or("qwen-max")
            .to_string();
        
        let llm_config = LLMAgentConfig {
            model_name,
            base_url: base_url.to_string(),
            api_key,
            temperature: 0.3,
            max_tokens: 4000,
            timeout: enabled_provider["timeout"].as_u64().unwrap_or(30),
        };
        
        Ok(LLMAgent::new(llm_config, agent_type.to_string()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_llm_agent_creation() {
        let config = LLMAgentConfig {
            model_name: "qwen-max".to_string(),
            base_url: "https://dashscope.aliyuncs.com/compatible-mode/v1".to_string(),
            api_key: "test-key".to_string(),
            temperature: 0.3,
            max_tokens: 2000,
            timeout: 30,
        };
        
        let agent = LLMAgent::new(config, "requirements_parser".to_string());
        assert_eq!(agent.name(), "requirements_parser");
        assert_eq!(agent.description(), "AI-powered requirements analysis using LLM");
    }
    
    #[test]
    fn test_system_prompts() {
        let config = LLMAgentConfig {
            model_name: "qwen-max".to_string(),
            base_url: "https://dashscope.aliyuncs.com/compatible-mode/v1".to_string(),
            api_key: "test-key".to_string(),
            temperature: 0.3,
            max_tokens: 2000,
            timeout: 30,
        };
        
        let agent = LLMAgent::new(config, "requirements_parser".to_string());
        let prompt = agent.get_system_prompt();
        assert!(prompt.contains("requirements analyst"));
        assert!(prompt.contains("technical specifications"));
    }
    
    #[test]
    fn test_confidence_calculation() {
        let config = LLMAgentConfig {
            model_name: "qwen-max".to_string(),
            base_url: "https://dashscope.aliyuncs.com/compatible-mode/v1".to_string(),
            api_key: "test-key".to_string(),
            temperature: 0.3,
            max_tokens: 2000,
            timeout: 30,
        };
        
        let agent = LLMAgent::new(config, "contract_generator".to_string());
        
        // 短响应
        let short_response = "Short response";
        let confidence = agent.calculate_confidence(short_response);
        assert!(confidence >= 0.5 && confidence <= 1.0);
        
        // 长响应带代码
        let long_response = "This is a long response with code:\n```solidity\ncontract Test {\n    function test() public {}\n}\n```\n## Analysis\nDetailed analysis here...".repeat(10);
        let confidence = agent.calculate_confidence(&long_response);
        assert!(confidence > 0.5);
    }
}