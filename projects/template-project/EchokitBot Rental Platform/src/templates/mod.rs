//! 模板引擎模块
//! 
//! 基于Askama模板引擎的智能合约代码生成系统

use askama::Template;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use crate::error::{AiContractError, Result};

/// 合约模板类型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ContractTemplate {
    ERC20Basic,
    ERC721Basic,
    ERC1155Multi,
    EchokitBotRental,
    Custom(String),
}

/// 模板变量
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateVariables {
    pub contract_name: String,
    pub description: String,
    pub solidity_version: String,
    pub custom_vars: HashMap<String, String>,
}

/// ERC20 基础模板
#[derive(Template)]
#[template(path = "erc20_basic.sol.template")]
pub struct ERC20BasicTemplate {
    pub contract_name: String,
    pub description: String,
    pub token_name: String,
    pub token_symbol: String,
    pub initial_supply: String,
    pub decimals: u8,
}

/// ERC721 基础模板
#[derive(Template)]
#[template(path = "erc721_basic.sol.template")]
pub struct ERC721BasicTemplate {
    pub contract_name: String,
    pub description: String,
    pub collection_name: String,
    pub collection_symbol: String,
}

/// ERC1155 多代币模板
#[derive(Template)]
#[template(path = "erc1155_multi.sol.template")]
pub struct ERC1155MultiTemplate {
    pub contract_name: String,
    pub description: String,
    pub base_uri: String,
}

/// EchokitBot 租赁合约模板
#[derive(Template)]
#[template(path = "echokitbot_rental.sol.template")]
pub struct EchokitBotRentalTemplate {
    pub contract_name: String,
    pub description: String,
    pub solidity_version: String,
    pub enable_advanced_features: bool,
    pub max_rental_duration: String,
    pub min_deposit_percentage: u8,
}

/// 模板引擎
pub struct TemplateEngine {
    template_cache: HashMap<String, String>,
}

impl TemplateEngine {
    pub fn new() -> Self {
        Self {
            template_cache: HashMap::new(),
        }
    }
    
    /// 渲染合约模板
    pub fn render_contract(
        &mut self,
        template_type: ContractTemplate,
        variables: TemplateVariables,
    ) -> Result<String> {
        match template_type {
            ContractTemplate::ERC20Basic => {
                self.render_erc20_template(variables)
            }
            ContractTemplate::ERC721Basic => {
                self.render_erc721_template(variables)
            }
            ContractTemplate::ERC1155Multi => {
                self.render_erc1155_template(variables)
            }
            ContractTemplate::EchokitBotRental => {
                self.render_rental_template(variables)
            }
            ContractTemplate::Custom(template_name) => {
                self.render_custom_template(template_name, variables)
            }
        }
    }
    
    fn render_erc20_template(&mut self, vars: TemplateVariables) -> Result<String> {
        let template = ERC20BasicTemplate {
            contract_name: vars.contract_name.clone(),
            description: vars.description,
            token_name: vars.custom_vars.get("token_name")
                .cloned()
                .unwrap_or_else(|| vars.contract_name.clone()),
            token_symbol: vars.custom_vars.get("token_symbol")
                .cloned()
                .unwrap_or_else(|| "TKN".to_string()),
            initial_supply: vars.custom_vars.get("initial_supply")
                .cloned()
                .unwrap_or_else(|| "1000000".to_string()),
            decimals: vars.custom_vars.get("decimals")
                .and_then(|d| d.parse().ok())
                .unwrap_or(18),
        };
        
        template.render()
            .map_err(|e| AiContractError::TemplateError(e.to_string()))
    }
    
    fn render_erc721_template(&mut self, vars: TemplateVariables) -> Result<String> {
        let template = ERC721BasicTemplate {
            contract_name: vars.contract_name.clone(),
            description: vars.description,
            collection_name: vars.custom_vars.get("collection_name")
                .cloned()
                .unwrap_or_else(|| vars.contract_name.clone()),
            collection_symbol: vars.custom_vars.get("collection_symbol")
                .cloned()
                .unwrap_or_else(|| "NFT".to_string()),
        };
        
        template.render()
            .map_err(|e| AiContractError::TemplateError(e.to_string()))
    }
    
    fn render_erc1155_template(&mut self, vars: TemplateVariables) -> Result<String> {
        let template = ERC1155MultiTemplate {
            contract_name: vars.contract_name.clone(),
            description: vars.description,
            base_uri: vars.custom_vars.get("base_uri")
                .cloned()
                .unwrap_or_else(|| "https://api.example.com/metadata/".to_string()),
        };
        
        template.render()
            .map_err(|e| AiContractError::TemplateError(e.to_string()))
    }
    
    fn render_rental_template(&mut self, vars: TemplateVariables) -> Result<String> {
        let template = EchokitBotRentalTemplate {
            contract_name: vars.contract_name.clone(),
            description: vars.description,
            solidity_version: vars.solidity_version,
            enable_advanced_features: vars.custom_vars.get("enable_advanced_features")
                .and_then(|v| v.parse().ok())
                .unwrap_or(true),
            max_rental_duration: vars.custom_vars.get("max_rental_duration")
                .cloned()
                .unwrap_or_else(|| "30 days".to_string()),
            min_deposit_percentage: vars.custom_vars.get("min_deposit_percentage")
                .and_then(|v| v.parse().ok())
                .unwrap_or(10),
        };
        
        template.render()
            .map_err(|e| AiContractError::TemplateError(e.to_string()))
    }
    
    fn render_custom_template(&mut self, template_name: String, vars: TemplateVariables) -> Result<String> {
        // 实现自定义模板渲染逻辑
        Err(AiContractError::TemplateError(format!("Custom template {} not implemented", template_name)))
    }
    
    /// 获取可用的模板列表
    pub fn available_templates(&self) -> Vec<ContractTemplate> {
        vec![
            ContractTemplate::ERC20Basic,
            ContractTemplate::ERC721Basic,
            ContractTemplate::ERC1155Multi,
            ContractTemplate::EchokitBotRental,
        ]
    }
    
    /// 验证模板变量
    pub fn validate_variables(
        &self,
        template_type: &ContractTemplate,
        variables: &TemplateVariables,
    ) -> Result<()> {
        // 基础验证
        if variables.contract_name.is_empty() {
            return Err(AiContractError::ValidationError("Contract name cannot be empty".to_string()));
        }
        
        // 模板特定验证
        match template_type {
            ContractTemplate::ERC20Basic => {
                if let Some(supply) = variables.custom_vars.get("initial_supply") {
                    supply.parse::<u64>()
                        .map_err(|_| AiContractError::ValidationError("Invalid initial supply".to_string()))?;
                }
            }
            ContractTemplate::EchokitBotRental => {
                if let Some(percentage) = variables.custom_vars.get("min_deposit_percentage") {
                    let pct: u8 = percentage.parse()
                        .map_err(|_| AiContractError::ValidationError("Invalid deposit percentage".to_string()))?;
                    if pct > 100 {
                        return Err(AiContractError::ValidationError("Deposit percentage cannot exceed 100".to_string()));
                    }
                }
            }
            _ => {}
        }
        
        Ok(())
    }
}

impl Default for TemplateEngine {
    fn default() -> Self {
        Self::new()
    }
}

impl Default for TemplateVariables {
    fn default() -> Self {
        Self {
            contract_name: "MyContract".to_string(),
            description: "A smart contract generated by EchokitBot".to_string(),
            solidity_version: "^0.8.0".to_string(),
            custom_vars: HashMap::new(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_template_engine_creation() {
        let engine = TemplateEngine::new();
        let templates = engine.available_templates();
        assert_eq!(templates.len(), 4);
    }
    
    #[test]
    fn test_template_variables_validation() {
        let engine = TemplateEngine::new();
        let mut vars = TemplateVariables::default();
        vars.contract_name = "TestContract".to_string();
        
        let result = engine.validate_variables(&ContractTemplate::ERC20Basic, &vars);
        assert!(result.is_ok());
        
        // Test empty contract name
        vars.contract_name = "".to_string();
        let result = engine.validate_variables(&ContractTemplate::ERC20Basic, &vars);
        assert!(result.is_err());
    }
    
    #[test]
    fn test_rental_template_variables() {
        let engine = TemplateEngine::new();
        let mut vars = TemplateVariables::default();
        vars.contract_name = "EchokitBotRental".to_string();
        vars.custom_vars.insert("min_deposit_percentage".to_string(), "150".to_string());
        
        let result = engine.validate_variables(&ContractTemplate::EchokitBotRental, &vars);
        assert!(result.is_err()); // Should fail because percentage > 100
    }
}