//! 智能模板注册表
//! 
//! 基于 RAG 的模板推荐和管理系统

use crate::agents::rag::{TemplateRecommender, TemplateRecommendation};
use crate::error::{AgentError, Result};
use crate::types::{ContractType, ContractBlueprint, SecurityRequirements};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// 智能模板注册表
pub struct TemplateRegistry {
    /// 模板推荐器
    recommender: TemplateRecommender,
    
    /// 标准模板库
    standard_templates: HashMap<String, ContractTemplate>,
    
    /// 自定义模板库
    custom_templates: HashMap<String, ContractTemplate>,
}

impl TemplateRegistry {
    /// 创建新的模板注册表
    pub async fn new() -> Result<Self> {
        let recommender = TemplateRecommender::new().await?;
        let mut registry = Self {
            recommender,
            standard_templates: HashMap::new(),
            custom_templates: HashMap::new(),
        };
        
        // 加载标准模板
        registry.load_standard_templates()?;
        
        Ok(registry)
    }
    
    /// 加载标准模板
    fn load_standard_templates(&mut self) -> Result<()> {
        // ERC-20 基础代币模板
        self.register_standard_template(ContractTemplate {
            id: "erc20_basic".to_string(),
            name: "ERC-20 Basic Token".to_string(),
            description: "标准 ERC-20 代币合约，支持铸造、销毁和基本转账功能".to_string(),
            contract_type: ContractType::ERC20Token,
            base_contracts: vec![
                "ERC20".to_string(),
                "Ownable".to_string(),
            ],
            required_imports: vec![
                "@openzeppelin/contracts/token/ERC20/ERC20.sol".to_string(),
                "@openzeppelin/contracts/access/Ownable.sol".to_string(),
            ],
            template_code: include_str!("../../templates/erc20_basic.sol.template").to_string(),
            parameters: vec![
                TemplateParameter {
                    name: "name".to_string(),
                    param_type: "string".to_string(),
                    description: "代币名称".to_string(),
                    required: true,
                    default_value: None,
                },
                TemplateParameter {
                    name: "symbol".to_string(),
                    param_type: "string".to_string(),
                    description: "代币符号".to_string(),
                    required: true,
                    default_value: None,
                },
                TemplateParameter {
                    name: "initialSupply".to_string(),
                    param_type: "uint256".to_string(),
                    description: "初始供应量".to_string(),
                    required: true,
                    default_value: Some("1000000".to_string()),
                },
            ],
            security_features: vec![
                "Ownable access control".to_string(),
                "SafeMath (built-in Solidity 0.8+)".to_string(),
            ],
            tags: vec!["erc20".to_string(), "token".to_string(), "fungible".to_string()],
            complexity: TemplateComplexity::Simple,
            gas_estimate: GasEstimate {
                deployment: 800000,
                typical_transaction: 50000,
            },
        })?;
        
        // ERC-721 NFT 模板
        self.register_standard_template(ContractTemplate {
            id: "erc721_basic".to_string(),
            name: "ERC-721 NFT".to_string(),
            description: "标准 ERC-721 NFT 合约，支持铸造、转账和元数据".to_string(),
            contract_type: ContractType::ERC721NFT,
            base_contracts: vec![
                "ERC721".to_string(),
                "ERC721URIStorage".to_string(),
                "Ownable".to_string(),
            ],
            required_imports: vec![
                "@openzeppelin/contracts/token/ERC721/ERC721.sol".to_string(),
                "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol".to_string(),
                "@openzeppelin/contracts/access/Ownable.sol".to_string(),
            ],
            template_code: include_str!("../../templates/erc721_basic.sol.template").to_string(),
            parameters: vec![
                TemplateParameter {
                    name: "name".to_string(),
                    param_type: "string".to_string(),
                    description: "NFT 集合名称".to_string(),
                    required: true,
                    default_value: None,
                },
                TemplateParameter {
                    name: "symbol".to_string(),
                    param_type: "string".to_string(),
                    description: "NFT 符号".to_string(),
                    required: true,
                    default_value: None,
                },
            ],
            security_features: vec![
                "Ownable access control".to_string(),
                "ERC721 standard compliance".to_string(),
            ],
            tags: vec!["erc721".to_string(), "nft".to_string(), "non-fungible".to_string()],
            complexity: TemplateComplexity::Medium,
            gas_estimate: GasEstimate {
                deployment: 2500000,
                typical_transaction: 150000,
            },
        })?;
        
        // ERC-1155 多代币模板
        self.register_standard_template(ContractTemplate {
            id: "erc1155_multi".to_string(),
            name: "ERC-1155 Multi-Token".to_string(),
            description: "ERC-1155 多代币合约，支持同质化和非同质化代币".to_string(),
            contract_type: ContractType::ERC1155MultiToken,
            base_contracts: vec![
                "ERC1155".to_string(),
                "Ownable".to_string(),
            ],
            required_imports: vec![
                "@openzeppelin/contracts/token/ERC1155/ERC1155.sol".to_string(),
                "@openzeppelin/contracts/access/Ownable.sol".to_string(),
            ],
            template_code: include_str!("../../templates/erc1155_multi.sol.template").to_string(),
            parameters: vec![
                TemplateParameter {
                    name: "uri".to_string(),
                    param_type: "string".to_string(),
                    description: "元数据 URI".to_string(),
                    required: true,
                    default_value: Some("https://api.example.com/metadata/{id}".to_string()),
                },
            ],
            security_features: vec![
                "Ownable access control".to_string(),
                "ERC1155 standard compliance".to_string(),
            ],
            tags: vec!["erc1155".to_string(), "multi-token".to_string()],
            complexity: TemplateComplexity::Medium,
            gas_estimate: GasEstimate {
                deployment: 2000000,
                typical_transaction: 100000,
            },
        })?;
        
        Ok(())
    }
    
    /// 注册标准模板
    fn register_standard_template(&mut self, template: ContractTemplate) -> Result<()> {
        let id = template.id.clone();
        self.standard_templates.insert(id, template);
        Ok(())
    }
    
    /// 注册自定义模板
    pub fn register_custom_template(&mut self, template: ContractTemplate) -> Result<()> {
        let id = template.id.clone();
        self.custom_templates.insert(id, template);
        Ok(())
    }
    
    /// 推荐模板
    pub async fn recommend_templates(
        &self,
        requirements: &str,
        max_results: usize,
    ) -> Result<Vec<TemplateRecommendation>> {
        self.recommender.recommend_templates(requirements).await
    }
    
    /// 获取模板
    pub fn get_template(&self, template_id: &str) -> Option<&ContractTemplate> {
        self.standard_templates.get(template_id)
            .or_else(|| self.custom_templates.get(template_id))
    }
    
    /// 按类型获取模板
    pub fn get_templates_by_type(&self, contract_type: ContractType) -> Vec<&ContractTemplate> {
        self.standard_templates
            .values()
            .chain(self.custom_templates.values())
            .filter(|t| t.contract_type == contract_type)
            .collect()
    }
    
    /// 组合模板
    pub fn combine_templates(
        &self,
        template_ids: &[String],
        blueprint: &ContractBlueprint,
    ) -> Result<CombinedTemplate> {
        let mut templates = Vec::new();
        
        for id in template_ids {
            let template = self.get_template(id)
                .ok_or_else(|| AgentError::TemplateNotFound(id.clone()))?;
            templates.push(template.clone());
        }
        
        // 合并基础合约
        let mut base_contracts = Vec::new();
        let mut required_imports = Vec::new();
        let mut security_features = Vec::new();
        
        for template in &templates {
            base_contracts.extend(template.base_contracts.clone());
            required_imports.extend(template.required_imports.clone());
            security_features.extend(template.security_features.clone());
        }
        
        // 去重
        base_contracts.sort();
        base_contracts.dedup();
        required_imports.sort();
        required_imports.dedup();
        security_features.sort();
        security_features.dedup();
        
        Ok(CombinedTemplate {
            templates,
            base_contracts,
            required_imports,
            security_features,
            blueprint: blueprint.clone(),
        })
    }
    
    /// 定制化模板
    pub fn customize_template(
        &self,
        template_id: &str,
        customizations: TemplateCustomization,
    ) -> Result<ContractTemplate> {
        let base_template = self.get_template(template_id)
            .ok_or_else(|| AgentError::TemplateNotFound(template_id.to_string()))?
            .clone();
        
        let mut customized = base_template;
        
        // 应用定制化
        if let Some(name) = customizations.name {
            customized.name = name;
        }
        
        if let Some(description) = customizations.description {
            customized.description = description;
        }
        
        // 添加额外的基础合约
        if let Some(additional_bases) = customizations.additional_base_contracts {
            customized.base_contracts.extend(additional_bases);
        }
        
        // 添加额外的导入
        if let Some(additional_imports) = customizations.additional_imports {
            customized.required_imports.extend(additional_imports);
        }
        
        // 添加安全特性
        if let Some(additional_security) = customizations.additional_security_features {
            customized.security_features.extend(additional_security);
        }
        
        Ok(customized)
    }
    
    /// 列出所有模板
    pub fn list_all_templates(&self) -> Vec<&ContractTemplate> {
        self.standard_templates
            .values()
            .chain(self.custom_templates.values())
            .collect()
    }
    
    /// 搜索模板
    pub fn search_templates(&self, query: &str) -> Vec<&ContractTemplate> {
        let query_lower = query.to_lowercase();
        
        self.list_all_templates()
            .into_iter()
            .filter(|t| {
                t.name.to_lowercase().contains(&query_lower)
                    || t.description.to_lowercase().contains(&query_lower)
                    || t.tags.iter().any(|tag| tag.to_lowercase().contains(&query_lower))
            })
            .collect()
    }
}

/// 合约模板
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContractTemplate {
    /// 模板 ID
    pub id: String,
    
    /// 模板名称
    pub name: String,
    
    /// 模板描述
    pub description: String,
    
    /// 合约类型
    pub contract_type: ContractType,
    
    /// 基础合约
    pub base_contracts: Vec<String>,
    
    /// 必需的导入
    pub required_imports: Vec<String>,
    
    /// 模板代码
    pub template_code: String,
    
    /// 模板参数
    pub parameters: Vec<TemplateParameter>,
    
    /// 安全特性
    pub security_features: Vec<String>,
    
    /// 标签
    pub tags: Vec<String>,
    
    /// 复杂度
    pub complexity: TemplateComplexity,
    
    /// Gas 估算
    pub gas_estimate: GasEstimate,
}

/// 模板参数
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateParameter {
    /// 参数名称
    pub name: String,
    
    /// 参数类型
    pub param_type: String,
    
    /// 参数描述
    pub description: String,
    
    /// 是否必需
    pub required: bool,
    
    /// 默认值
    pub default_value: Option<String>,
}

/// 模板复杂度
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum TemplateComplexity {
    Simple,
    Medium,
    Complex,
    Advanced,
}

/// Gas 估算
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GasEstimate {
    /// 部署 Gas
    pub deployment: u64,
    
    /// 典型交易 Gas
    pub typical_transaction: u64,
}

/// 组合模板
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CombinedTemplate {
    /// 组合的模板
    pub templates: Vec<ContractTemplate>,
    
    /// 合并后的基础合约
    pub base_contracts: Vec<String>,
    
    /// 合并后的导入
    pub required_imports: Vec<String>,
    
    /// 合并后的安全特性
    pub security_features: Vec<String>,
    
    /// 合约蓝图
    pub blueprint: ContractBlueprint,
}

/// 模板定制化
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct TemplateCustomization {
    /// 自定义名称
    pub name: Option<String>,
    
    /// 自定义描述
    pub description: Option<String>,
    
    /// 额外的基础合约
    pub additional_base_contracts: Option<Vec<String>>,
    
    /// 额外的导入
    pub additional_imports: Option<Vec<String>>,
    
    /// 额外的安全特性
    pub additional_security_features: Option<Vec<String>>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_registry_creation() {
        let result = TemplateRegistry::new().await;
        assert!(result.is_ok());
        
        let registry = result.unwrap();
        assert!(!registry.list_all_templates().is_empty());
    }

    #[tokio::test]
    async fn test_get_template() {
        let registry = TemplateRegistry::new().await.unwrap();
        
        let template = registry.get_template("erc20_basic");
        assert!(template.is_some());
        assert_eq!(template.unwrap().contract_type, ContractType::ERC20Token);
    }

    #[tokio::test]
    async fn test_get_templates_by_type() {
        let registry = TemplateRegistry::new().await.unwrap();
        
        let templates = registry.get_templates_by_type(ContractType::ERC20Token);
        assert!(!templates.is_empty());
    }

    #[tokio::test]
    async fn test_search_templates() {
        let registry = TemplateRegistry::new().await.unwrap();
        
        let results = registry.search_templates("ERC-20");
        assert!(!results.is_empty());
    }

    #[tokio::test]
    async fn test_recommend_templates() {
        let registry = TemplateRegistry::new().await.unwrap();
        
        let recommendations = registry
            .recommend_templates("I need an ERC-20 token", 3)
            .await
            .unwrap();
        
        assert!(!recommendations.is_empty());
    }
}
