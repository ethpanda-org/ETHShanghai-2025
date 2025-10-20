//! 需求解析 Agent
//! 
//! 负责分析用户需求并生成技术规格

use super::base::{Agent, AgentContext, AgentOutput, AgentResult, AgentError};
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// 需求解析 Agent
pub struct RequirementsParserAgent {
    config: RequirementsParserConfig,
}

/// 需求解析配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RequirementsParserConfig {
    /// 模型名称
    pub model_name: String,
    
    /// 分析深度级别
    pub analysis_depth: AnalysisDepth,
    
    /// 是否包含技术建议
    pub include_tech_recommendations: bool,
    
    /// 是否生成用例图
    pub generate_use_cases: bool,
}

/// 分析深度级别
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AnalysisDepth {
    Basic,      // 基础分析
    Detailed,   // 详细分析
    Comprehensive, // 全面分析
}

/// 解析结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RequirementsAnalysis {
    /// 核心功能需求
    pub core_requirements: Vec<String>,
    
    /// 技术规格
    pub technical_specs: TechnicalSpecs,
    
    /// 安全要求
    pub security_requirements: Vec<String>,
    
    /// 性能要求
    pub performance_requirements: Vec<String>,
    
    /// 建议的架构
    pub suggested_architecture: String,
    
    /// 风险评估
    pub risk_assessment: Vec<RiskItem>,
    
    /// 开发建议
    pub development_recommendations: Vec<String>,
}

/// 技术规格
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TechnicalSpecs {
    /// Solidity 版本
    pub solidity_version: String,
    
    /// 需要的库和依赖
    pub dependencies: Vec<String>,
    
    /// 合约类型
    pub contract_type: ContractType,
    
    /// 预估复杂度
    pub complexity_level: ComplexityLevel,
    
    /// 预估开发时间
    pub estimated_dev_time: String,
}

/// 合约类型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ContractType {
    Token,          // 代币合约
    NFT,           // NFT合约
    DeFi,          // DeFi协议
    Governance,    // 治理合约
    Rental,        // 租赁合约
    Marketplace,   // 市场合约
    Custom,        // 自定义合约
}

/// 复杂度级别
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ComplexityLevel {
    Simple,     // 简单 (< 100 行)
    Medium,     // 中等 (100-300 行)
    Complex,    // 复杂 (300-500 行)
    VeryComplex, // 非常复杂 (> 500 行)
}

/// 风险项
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskItem {
    pub category: String,
    pub description: String,
    pub severity: RiskSeverity,
    pub mitigation: String,
}

/// 风险严重程度
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RiskSeverity {
    Low,
    Medium,
    High,
    Critical,
}

impl RequirementsParserAgent {
    pub fn new(config: RequirementsParserConfig) -> Self {
        Self { config }
    }
    
    /// 解析用户需求
    async fn parse_requirements(&self, input: &str) -> AgentResult<RequirementsAnalysis> {
        // 基础需求提取
        let core_requirements = self.extract_core_requirements(input);
        
        // 技术规格分析
        let technical_specs = self.analyze_technical_specs(input, &core_requirements);
        
        // 安全要求分析
        let security_requirements = self.analyze_security_requirements(input, &core_requirements);
        
        // 性能要求分析
        let performance_requirements = self.analyze_performance_requirements(input);
        
        // 架构建议
        let suggested_architecture = self.suggest_architecture(&core_requirements, &technical_specs);
        
        // 风险评估
        let risk_assessment = self.assess_risks(&core_requirements, &technical_specs);
        
        // 开发建议
        let development_recommendations = self.generate_recommendations(&technical_specs, &risk_assessment);
        
        Ok(RequirementsAnalysis {
            core_requirements,
            technical_specs,
            security_requirements,
            performance_requirements,
            suggested_architecture,
            risk_assessment,
            development_recommendations,
        })
    }
    
    fn extract_core_requirements(&self, input: &str) -> Vec<String> {
        let mut requirements = Vec::new();
        
        // 关键词匹配
        let keywords = [
            ("租赁", "设备租赁功能"),
            ("支付", "支付处理功能"),
            ("NFT", "NFT代币化功能"),
            ("投票", "投票治理功能"),
            ("交易", "交易处理功能"),
            ("存储", "数据存储功能"),
            ("权限", "访问控制功能"),
        ];
        
        for (keyword, requirement) in keywords.iter() {
            if input.contains(keyword) {
                requirements.push(requirement.to_string());
            }
        }
        
        // 如果没有匹配到关键词，添加通用需求
        if requirements.is_empty() {
            requirements.push("基础智能合约功能".to_string());
        }
        
        requirements
    }
    
    fn analyze_technical_specs(&self, input: &str, requirements: &[String]) -> TechnicalSpecs {
        // 根据需求确定合约类型
        let contract_type = if input.contains("租赁") || input.contains("rental") {
            ContractType::Rental
        } else if input.contains("NFT") || input.contains("721") {
            ContractType::NFT
        } else if input.contains("代币") || input.contains("token") {
            ContractType::Token
        } else if input.contains("投票") || input.contains("governance") {
            ContractType::Governance
        } else if input.contains("市场") || input.contains("marketplace") {
            ContractType::Marketplace
        } else if input.contains("DeFi") || input.contains("defi") {
            ContractType::DeFi
        } else {
            ContractType::Custom
        };
        
        // 根据需求数量估算复杂度
        let complexity_level = match requirements.len() {
            1..=2 => ComplexityLevel::Simple,
            3..=5 => ComplexityLevel::Medium,
            6..=8 => ComplexityLevel::Complex,
            _ => ComplexityLevel::VeryComplex,
        };
        
        // 根据合约类型确定依赖
        let dependencies = match contract_type {
            ContractType::NFT => vec![
                "@openzeppelin/contracts/token/ERC721/ERC721.sol".to_string(),
                "@openzeppelin/contracts/access/Ownable.sol".to_string(),
            ],
            ContractType::Token => vec![
                "@openzeppelin/contracts/token/ERC20/ERC20.sol".to_string(),
                "@openzeppelin/contracts/access/Ownable.sol".to_string(),
            ],
            ContractType::Rental => vec![
                "@openzeppelin/contracts/security/ReentrancyGuard.sol".to_string(),
                "@openzeppelin/contracts/access/Ownable.sol".to_string(),
            ],
            _ => vec![
                "@openzeppelin/contracts/access/Ownable.sol".to_string(),
                "@openzeppelin/contracts/security/ReentrancyGuard.sol".to_string(),
            ],
        };
        
        let estimated_dev_time = match complexity_level {
            ComplexityLevel::Simple => "1-2 天".to_string(),
            ComplexityLevel::Medium => "3-5 天".to_string(),
            ComplexityLevel::Complex => "1-2 周".to_string(),
            ComplexityLevel::VeryComplex => "2-4 周".to_string(),
        };
        
        TechnicalSpecs {
            solidity_version: "^0.8.0".to_string(),
            dependencies,
            contract_type,
            complexity_level,
            estimated_dev_time,
        }
    }
    
    fn analyze_security_requirements(&self, _input: &str, requirements: &[String]) -> Vec<String> {
        let mut security_reqs = vec![
            "重入攻击防护".to_string(),
            "访问控制机制".to_string(),
            "输入验证".to_string(),
        ];
        
        // 根据功能需求添加特定安全要求
        for req in requirements {
            if req.contains("支付") || req.contains("转账") {
                security_reqs.push("安全的资金转移".to_string());
                security_reqs.push("整数溢出防护".to_string());
            }
            if req.contains("权限") || req.contains("管理") {
                security_reqs.push("多重签名验证".to_string());
            }
        }
        
        security_reqs.sort();
        security_reqs.dedup();
        security_reqs
    }
    
    fn analyze_performance_requirements(&self, input: &str) -> Vec<String> {
        let mut perf_reqs = vec![
            "Gas 优化".to_string(),
            "存储效率".to_string(),
        ];
        
        if input.contains("高频") || input.contains("大量") {
            perf_reqs.push("批量操作支持".to_string());
            perf_reqs.push("事件索引优化".to_string());
        }
        
        perf_reqs
    }
    
    fn suggest_architecture(&self, requirements: &[String], specs: &TechnicalSpecs) -> String {
        match specs.contract_type {
            ContractType::Rental => {
                "采用模块化架构，分离设备管理、租赁逻辑和支付处理模块".to_string()
            }
            ContractType::NFT => {
                "基于 ERC-721 标准，实现元数据管理和权限控制".to_string()
            }
            ContractType::Token => {
                "基于 ERC-20 标准，实现代币发行和转移逻辑".to_string()
            }
            ContractType::DeFi => {
                "采用代理模式实现可升级性，分离核心逻辑和存储".to_string()
            }
            _ => {
                format!("基于 {} 个核心功能模块的分层架构", requirements.len())
            }
        }
    }
    
    fn assess_risks(&self, requirements: &[String], specs: &TechnicalSpecs) -> Vec<RiskItem> {
        let mut risks = Vec::new();
        
        // 基础风险
        risks.push(RiskItem {
            category: "安全风险".to_string(),
            description: "智能合约一旦部署难以修改".to_string(),
            severity: RiskSeverity::High,
            mitigation: "充分测试和代码审计".to_string(),
        });
        
        // 复杂度相关风险
        match specs.complexity_level {
            ComplexityLevel::Complex | ComplexityLevel::VeryComplex => {
                risks.push(RiskItem {
                    category: "复杂度风险".to_string(),
                    description: "合约复杂度高，增加出错概率".to_string(),
                    severity: RiskSeverity::Medium,
                    mitigation: "模块化设计和单元测试".to_string(),
                });
            }
            _ => {}
        }
        
        // 功能相关风险
        for req in requirements {
            if req.contains("支付") {
                risks.push(RiskItem {
                    category: "资金安全".to_string(),
                    description: "涉及资金转移的安全风险".to_string(),
                    severity: RiskSeverity::Critical,
                    mitigation: "使用安全的转账模式和重入防护".to_string(),
                });
            }
        }
        
        risks
    }
    
    fn generate_recommendations(&self, specs: &TechnicalSpecs, risks: &[RiskItem]) -> Vec<String> {
        let mut recommendations = Vec::new();
        
        // 基础建议
        recommendations.push("使用最新稳定版本的 Solidity".to_string());
        recommendations.push("集成 OpenZeppelin 安全库".to_string());
        recommendations.push("实施全面的单元测试".to_string());
        
        // 复杂度相关建议
        match specs.complexity_level {
            ComplexityLevel::Complex | ComplexityLevel::VeryComplex => {
                recommendations.push("考虑使用代理模式实现可升级性".to_string());
                recommendations.push("分阶段开发和部署".to_string());
            }
            _ => {}
        }
        
        // 风险相关建议
        for risk in risks {
            if risk.severity == RiskSeverity::Critical {
                recommendations.push(format!("重点关注: {}", risk.mitigation));
            }
        }
        
        recommendations.sort();
        recommendations.dedup();
        recommendations
    }
}

#[async_trait]
impl Agent for RequirementsParserAgent {
    fn name(&self) -> &str {
        "RequirementsParser"
    }
    
    fn description(&self) -> &str {
        "分析用户需求并生成详细的技术规格和开发建议"
    }
    
    fn specialties(&self) -> Vec<String> {
        vec![
            "需求分析".to_string(),
            "技术规格设计".to_string(),
            "风险评估".to_string(),
            "架构建议".to_string(),
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
        // 解析需求
        let analysis = self.parse_requirements(&context.user_input).await?;
        
        // 生成输出内容
        let content = self.format_analysis(&analysis)?;
        
        // 计算置信度
        let confidence = self.calculate_confidence(&analysis);
        
        // 生成元数据
        let mut metadata = HashMap::new();
        metadata.insert("analysis".to_string(), serde_json::to_value(&analysis)?);
        metadata.insert("contract_type".to_string(), serde_json::to_value(&analysis.technical_specs.contract_type)?);
        metadata.insert("complexity".to_string(), serde_json::to_value(&analysis.technical_specs.complexity_level)?);
        
        // 建议下一步操作
        let next_actions = vec![
            "生成智能合约代码".to_string(),
            "创建测试用例".to_string(),
            "准备部署脚本".to_string(),
        ];
        
        Ok(AgentOutput {
            content,
            metadata,
            confidence,
            next_actions,
            generated_files: vec!["requirements_analysis.json".to_string()],
        })
    }
}

impl RequirementsParserAgent {
    fn format_analysis(&self, analysis: &RequirementsAnalysis) -> AgentResult<String> {
        let mut output = String::new();
        
        output.push_str("# 需求分析报告\n\n");
        
        // 核心需求
        output.push_str("## 核心功能需求\n");
        for req in &analysis.core_requirements {
            output.push_str(&format!("- {}\n", req));
        }
        output.push('\n');
        
        // 技术规格
        output.push_str("## 技术规格\n");
        output.push_str(&format!("- **Solidity 版本**: {}\n", analysis.technical_specs.solidity_version));
        output.push_str(&format!("- **合约类型**: {:?}\n", analysis.technical_specs.contract_type));
        output.push_str(&format!("- **复杂度级别**: {:?}\n", analysis.technical_specs.complexity_level));
        output.push_str(&format!("- **预估开发时间**: {}\n", analysis.technical_specs.estimated_dev_time));
        output.push('\n');
        
        // 依赖库
        output.push_str("### 依赖库\n");
        for dep in &analysis.technical_specs.dependencies {
            output.push_str(&format!("- {}\n", dep));
        }
        output.push('\n');
        
        // 安全要求
        output.push_str("## 安全要求\n");
        for req in &analysis.security_requirements {
            output.push_str(&format!("- {}\n", req));
        }
        output.push('\n');
        
        // 性能要求
        output.push_str("## 性能要求\n");
        for req in &analysis.performance_requirements {
            output.push_str(&format!("- {}\n", req));
        }
        output.push('\n');
        
        // 架构建议
        output.push_str("## 建议架构\n");
        output.push_str(&format!("{}\n\n", analysis.suggested_architecture));
        
        // 风险评估
        output.push_str("## 风险评估\n");
        for risk in &analysis.risk_assessment {
            output.push_str(&format!("### {} ({:?})\n", risk.category, risk.severity));
            output.push_str(&format!("**描述**: {}\n", risk.description));
            output.push_str(&format!("**缓解措施**: {}\n\n", risk.mitigation));
        }
        
        // 开发建议
        output.push_str("## 开发建议\n");
        for rec in &analysis.development_recommendations {
            output.push_str(&format!("- {}\n", rec));
        }
        
        Ok(output)
    }
    
    fn calculate_confidence(&self, analysis: &RequirementsAnalysis) -> f64 {
        let mut confidence = 0.7; // 基础置信度
        
        // 根据需求数量调整
        if analysis.core_requirements.len() >= 3 {
            confidence += 0.1;
        }
        
        // 根据风险评估调整
        let critical_risks = analysis.risk_assessment.iter()
            .filter(|r| matches!(r.severity, RiskSeverity::Critical))
            .count();
        
        if critical_risks == 0 {
            confidence += 0.1;
        } else {
            confidence -= 0.05 * critical_risks as f64;
        }
        
        // 根据分析深度调整
        match self.config.analysis_depth {
            AnalysisDepth::Comprehensive => confidence += 0.1,
            AnalysisDepth::Detailed => confidence += 0.05,
            AnalysisDepth::Basic => {}
        }
        
        confidence.min(1.0).max(0.0)
    }
}

impl Default for RequirementsParserConfig {
    fn default() -> Self {
        Self {
            model_name: "gpt-4".to_string(),
            analysis_depth: AnalysisDepth::Detailed,
            include_tech_recommendations: true,
            generate_use_cases: false,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_extract_core_requirements() {
        let config = RequirementsParserConfig::default();
        let agent = RequirementsParserAgent::new(config);
        
        let requirements = agent.extract_core_requirements("创建一个设备租赁合约，支持NFT和支付功能");
        
        assert!(requirements.len() >= 2);
        assert!(requirements.iter().any(|r| r.contains("租赁")));
        assert!(requirements.iter().any(|r| r.contains("NFT")));
    }
    
    #[test]
    fn test_analyze_technical_specs() {
        let config = RequirementsParserConfig::default();
        let agent = RequirementsParserAgent::new(config);
        
        let requirements = vec!["设备租赁功能".to_string(), "支付处理功能".to_string()];
        let specs = agent.analyze_technical_specs("设备租赁合约", &requirements);
        
        assert_eq!(specs.solidity_version, "^0.8.0");
        assert!(matches!(specs.contract_type, ContractType::Rental));
        assert!(matches!(specs.complexity_level, ComplexityLevel::Medium));
    }
}