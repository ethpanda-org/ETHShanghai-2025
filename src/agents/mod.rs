//! AI Agent 模块
//! 
//! 基于 Rig 框架实现的多智能体系统，用于智能合约生成和分析

pub mod base;
pub mod requirements_parser;
pub mod contract_generator;
pub mod security_auditor;
pub mod optimizer;
pub mod deployment;
pub mod llm_agent;

pub use base::*;
pub use requirements_parser::RequirementsParserAgent;
pub use contract_generator::ContractGeneratorAgent;
pub use security_auditor::SecurityAuditorAgent;
pub use optimizer::OptimizerAgent;
pub use deployment::DeploymentAgent;