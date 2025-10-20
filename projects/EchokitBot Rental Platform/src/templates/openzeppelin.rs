//! OpenZeppelin 安全组件集成
//! 
//! 自动集成 OpenZeppelin 的安全组件和最佳实践

use crate::error::Result;
use crate::types::{ContractBlueprint, SecurityRequirements};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// OpenZeppelin 组件管理器
pub struct OpenZeppelinIntegration {
    /// 可用的安全组件
    security_components: HashMap<String, SecurityComponent>,
    
    /// 可用的访问控制组件
    access_control_components: HashMap<String, AccessControlComponent>,
    
    /// 可用的代币标准
    token_standards: HashMap<String, TokenStandard>,
}

impl OpenZeppelinIntegration {
    /// 创建新的 OpenZeppelin 集成
    pub fn new() -> Self {
        let mut integration = Self {
            security_components: HashMap::new(),
            access_control_components: HashMap::new(),
            token_standards: HashMap::new(),
        };
        
        integration.load_security_components();
        integration.load_access_control_components();
        integration.load_token_standards();
        
        integration
    }
    
    /// 加载安全组件
    fn load_security_components(&mut self) {
        // ReentrancyGuard
        self.security_components.insert(
            "ReentrancyGuard".to_string(),
            SecurityComponent {
                name: "ReentrancyGuard".to_string(),
                import_path: "@openzeppelin/contracts/utils/ReentrancyGuard.sol".to_string(),
                description: "防止重入攻击的修饰符".to_string(),
                usage: "继承 ReentrancyGuard 并在函数上使用 nonReentrant 修饰符".to_string(),
                modifier: Some("nonReentrant".to_string()),
                required_inheritance: true,
                initialization_code: None,
                example_usage: Some(
                    "function withdraw() public nonReentrant {\n    // 提现逻辑\n}".to_string()
                ),
            },
        );
        
        // Pausable
        self.security_components.insert(
            "Pausable".to_string(),
            SecurityComponent {
                name: "Pausable".to_string(),
                import_path: "@openzeppelin/contracts/utils/Pausable.sol".to_string(),
                description: "允许暂停和恢复合约功能".to_string(),
                usage: "继承 Pausable 并在函数上使用 whenNotPaused 修饰符".to_string(),
                modifier: Some("whenNotPaused".to_string()),
                required_inheritance: true,
                initialization_code: None,
                example_usage: Some(
                    "function transfer() public whenNotPaused {\n    // 转账逻辑\n}".to_string()
                ),
            },
        );
    }
    
    /// 加载访问控制组件
    fn load_access_control_components(&mut self) {
        // Ownable
        self.access_control_components.insert(
            "Ownable".to_string(),
            AccessControlComponent {
                name: "Ownable".to_string(),
                import_path: "@openzeppelin/contracts/access/Ownable.sol".to_string(),
                description: "基本的所有权管理".to_string(),
                modifiers: vec!["onlyOwner".to_string()],
                functions: vec![
                    "transferOwnership".to_string(),
                    "renounceOwnership".to_string(),
                ],
                initialization_code: Some("Ownable(msg.sender)".to_string()),
                example_usage: Some(
                    "function mint() public onlyOwner {\n    // 铸造逻辑\n}".to_string()
                ),
            },
        );
        
        // AccessControl
        self.access_control_components.insert(
            "AccessControl".to_string(),
            AccessControlComponent {
                name: "AccessControl".to_string(),
                import_path: "@openzeppelin/contracts/access/AccessControl.sol".to_string(),
                description: "基于角色的访问控制".to_string(),
                modifiers: vec!["onlyRole".to_string()],
                functions: vec![
                    "grantRole".to_string(),
                    "revokeRole".to_string(),
                    "hasRole".to_string(),
                ],
                initialization_code: None,
                example_usage: Some(
                    "bytes32 public constant MINTER_ROLE = keccak256(\"MINTER_ROLE\");\n\nfunction mint() public onlyRole(MINTER_ROLE) {\n    // 铸造逻辑\n}".to_string()
                ),
            },
        );
    }
    
    /// 加载代币标准
    fn load_token_standards(&mut self) {
        // ERC20
        self.token_standards.insert(
            "ERC20".to_string(),
            TokenStandard {
                name: "ERC20".to_string(),
                import_path: "@openzeppelin/contracts/token/ERC20/ERC20.sol".to_string(),
                description: "标准同质化代币".to_string(),
                extensions: vec![
                    "ERC20Burnable".to_string(),
                    "ERC20Pausable".to_string(),
                    "ERC20Permit".to_string(),
                    "ERC20Votes".to_string(),
                ],
                required_constructor_params: vec![
                    "string memory name".to_string(),
                    "string memory symbol".to_string(),
                ],
            },
        );
        
        // ERC721
        self.token_standards.insert(
            "ERC721".to_string(),
            TokenStandard {
                name: "ERC721".to_string(),
                import_path: "@openzeppelin/contracts/token/ERC721/ERC721.sol".to_string(),
                description: "标准非同质化代币 (NFT)".to_string(),
                extensions: vec![
                    "ERC721URIStorage".to_string(),
                    "ERC721Burnable".to_string(),
                    "ERC721Pausable".to_string(),
                    "ERC721Enumerable".to_string(),
                ],
                required_constructor_params: vec![
                    "string memory name".to_string(),
                    "string memory symbol".to_string(),
                ],
            },
        );
        
        // ERC1155
        self.token_standards.insert(
            "ERC1155".to_string(),
            TokenStandard {
                name: "ERC1155".to_string(),
                import_path: "@openzeppelin/contracts/token/ERC1155/ERC1155.sol".to_string(),
                description: "多代币标准".to_string(),
                extensions: vec![
                    "ERC1155Burnable".to_string(),
                    "ERC1155Pausable".to_string(),
                    "ERC1155Supply".to_string(),
                ],
                required_constructor_params: vec![
                    "string memory uri".to_string(),
                ],
            },
        );
    }
    
    /// 根据安全要求选择组件
    pub fn select_components(
        &self,
        requirements: &SecurityRequirements,
    ) -> SelectedComponents {
        let mut selected = SelectedComponents {
            security_components: Vec::new(),
            access_control: None,
            additional_imports: Vec::new(),
            initialization_code: Vec::new(),
        };
        
        // 选择重入保护
        if requirements.reentrancy_protection {
            if let Some(component) = self.security_components.get("ReentrancyGuard") {
                selected.security_components.push(component.clone());
                selected.additional_imports.push(component.import_path.clone());
            }
        }
        
        // 选择暂停功能
        if requirements.pausable {
            if let Some(component) = self.security_components.get("Pausable") {
                selected.security_components.push(component.clone());
                selected.additional_imports.push(component.import_path.clone());
            }
        }
        
        // 选择访问控制
        if !requirements.access_control.is_empty() {
            let access_control_type = &requirements.access_control[0];
            
            if let Some(component) = self.access_control_components.get(access_control_type) {
                selected.access_control = Some(component.clone());
                selected.additional_imports.push(component.import_path.clone());
                
                if let Some(init_code) = &component.initialization_code {
                    selected.initialization_code.push(init_code.clone());
                }
            }
        }
        
        selected
    }
    
    /// 生成安全组件的继承声明
    pub fn generate_inheritance_declaration(
        &self,
        selected: &SelectedComponents,
    ) -> String {
        let mut inheritance = Vec::new();
        
        // 添加安全组件
        for component in &selected.security_components {
            if component.required_inheritance {
                inheritance.push(component.name.clone());
            }
        }
        
        // 添加访问控制
        if let Some(access_control) = &selected.access_control {
            inheritance.push(access_control.name.clone());
        }
        
        if inheritance.is_empty() {
            String::new()
        } else {
            format!(" is {}", inheritance.join(", "))
        }
    }
    
    /// 生成导入语句
    pub fn generate_imports(&self, selected: &SelectedComponents) -> Vec<String> {
        selected.additional_imports.clone()
    }
    
    /// 生成构造函数初始化代码
    pub fn generate_constructor_initialization(
        &self,
        selected: &SelectedComponents,
    ) -> Vec<String> {
        selected.initialization_code.clone()
    }
    
    /// 为函数添加安全修饰符
    pub fn add_security_modifiers(
        &self,
        function_name: &str,
        selected: &SelectedComponents,
        blueprint: &ContractBlueprint,
    ) -> Vec<String> {
        let mut modifiers = Vec::new();
        
        // 检查是否需要重入保护
        if blueprint.security_requirements.reentrancy_protection {
            // 对于涉及资金转移的函数添加 nonReentrant
            if function_name.contains("withdraw") 
                || function_name.contains("transfer")
                || function_name.contains("claim") {
                modifiers.push("nonReentrant".to_string());
            }
        }
        
        // 检查是否需要暂停保护
        if blueprint.security_requirements.pausable {
            // 对于关键函数添加 whenNotPaused
            if !function_name.contains("pause") 
                && !function_name.contains("unpause") {
                modifiers.push("whenNotPaused".to_string());
            }
        }
        
        // 检查是否需要访问控制
        if let Some(access_control) = &selected.access_control {
            // 对于管理函数添加访问控制
            if function_name.contains("mint")
                || function_name.contains("burn")
                || function_name.contains("set")
                || function_name.contains("update") {
                modifiers.push(access_control.modifiers[0].clone());
            }
        }
        
        modifiers
    }
    
    /// 获取安全组件
    pub fn get_security_component(&self, name: &str) -> Option<&SecurityComponent> {
        self.security_components.get(name)
    }
    
    /// 获取访问控制组件
    pub fn get_access_control_component(&self, name: &str) -> Option<&AccessControlComponent> {
        self.access_control_components.get(name)
    }
    
    /// 获取代币标准
    pub fn get_token_standard(&self, name: &str) -> Option<&TokenStandard> {
        self.token_standards.get(name)
    }
    
    /// 列出所有可用的安全组件
    pub fn list_security_components(&self) -> Vec<&SecurityComponent> {
        self.security_components.values().collect()
    }
    
    /// 列出所有可用的访问控制组件
    pub fn list_access_control_components(&self) -> Vec<&AccessControlComponent> {
        self.access_control_components.values().collect()
    }
}

impl Default for OpenZeppelinIntegration {
    fn default() -> Self {
        Self::new()
    }
}

/// 安全组件
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityComponent {
    /// 组件名称
    pub name: String,
    
    /// 导入路径
    pub import_path: String,
    
    /// 组件描述
    pub description: String,
    
    /// 使用说明
    pub usage: String,
    
    /// 修饰符名称
    pub modifier: Option<String>,
    
    /// 是否需要继承
    pub required_inheritance: bool,
    
    /// 初始化代码
    pub initialization_code: Option<String>,
    
    /// 使用示例
    pub example_usage: Option<String>,
}

/// 访问控制组件
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccessControlComponent {
    /// 组件名称
    pub name: String,
    
    /// 导入路径
    pub import_path: String,
    
    /// 组件描述
    pub description: String,
    
    /// 修饰符列表
    pub modifiers: Vec<String>,
    
    /// 提供的函数
    pub functions: Vec<String>,
    
    /// 初始化代码
    pub initialization_code: Option<String>,
    
    /// 使用示例
    pub example_usage: Option<String>,
}

/// 代币标准
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenStandard {
    /// 标准名称
    pub name: String,
    
    /// 导入路径
    pub import_path: String,
    
    /// 标准描述
    pub description: String,
    
    /// 可用的扩展
    pub extensions: Vec<String>,
    
    /// 必需的构造函数参数
    pub required_constructor_params: Vec<String>,
}

/// 选中的组件
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SelectedComponents {
    /// 选中的安全组件
    pub security_components: Vec<SecurityComponent>,
    
    /// 选中的访问控制
    pub access_control: Option<AccessControlComponent>,
    
    /// 额外的导入
    pub additional_imports: Vec<String>,
    
    /// 初始化代码
    pub initialization_code: Vec<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_openzeppelin_integration_creation() {
        let integration = OpenZeppelinIntegration::new();
        
        assert!(!integration.security_components.is_empty());
        assert!(!integration.access_control_components.is_empty());
        assert!(!integration.token_standards.is_empty());
    }

    #[test]
    fn test_select_components() {
        let integration = OpenZeppelinIntegration::new();
        let requirements = SecurityRequirements {
            reentrancy_protection: true,
            access_control: vec!["Ownable".to_string()],
            pausable: true,
            upgradeable: false,
            timelock: false,
            multisig_required: false,
            custom_security_measures: Vec::new(),
        };
        
        let selected = integration.select_components(&requirements);
        
        assert!(!selected.security_components.is_empty());
        assert!(selected.access_control.is_some());
        assert!(!selected.additional_imports.is_empty());
    }

    #[test]
    fn test_generate_inheritance_declaration() {
        let integration = OpenZeppelinIntegration::new();
        let requirements = SecurityRequirements {
            reentrancy_protection: true,
            access_control: vec!["Ownable".to_string()],
            pausable: false,
            upgradeable: false,
            timelock: false,
            multisig_required: false,
            custom_security_measures: Vec::new(),
        };
        
        let selected = integration.select_components(&requirements);
        let inheritance = integration.generate_inheritance_declaration(&selected);
        
        assert!(inheritance.contains("ReentrancyGuard"));
        assert!(inheritance.contains("Ownable"));
    }

    #[test]
    fn test_get_token_standard() {
        let integration = OpenZeppelinIntegration::new();
        
        let erc20 = integration.get_token_standard("ERC20");
        assert!(erc20.is_some());
        assert_eq!(erc20.unwrap().name, "ERC20");
        
        let erc721 = integration.get_token_standard("ERC721");
        assert!(erc721.is_some());
        
        let erc1155 = integration.get_token_standard("ERC1155");
        assert!(erc1155.is_some());
    }
}
