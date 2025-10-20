//! 合约蓝图验证和约束检查模块

use crate::error::AgentError;
use crate::types::*;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

/// 蓝图验证器
pub struct BlueprintValidator {
    rules: Vec<Box<dyn ValidationRule>>,
}

impl BlueprintValidator {
    /// 创建新的蓝图验证器
    pub fn new() -> Self {
        Self {
            rules: vec![
                Box::new(NameValidationRule),
                Box::new(FunctionValidationRule),
                Box::new(StateVariableValidationRule),
                Box::new(SecurityValidationRule),
                Box::new(ContractTypeValidationRule),
                Box::new(InheritanceValidationRule),
            ],
        }
    }

    /// 验证蓝图
    pub fn validate(&self, blueprint: &ContractBlueprint) -> Result<(), AgentError> {
        for rule in &self.rules {
            rule.validate(blueprint)?;
        }
        Ok(())
    }

    /// 添加自定义验证规则
    pub fn add_rule(&mut self, rule: Box<dyn ValidationRule>) {
        self.rules.push(rule);
    }
}

impl Default for BlueprintValidator {
    fn default() -> Self {
        Self::new()
    }
}

/// 验证规则 trait
pub trait ValidationRule: Send + Sync {
    fn validate(&self, blueprint: &ContractBlueprint) -> Result<(), AgentError>;
}

/// 名称验证规则
struct NameValidationRule;

impl ValidationRule for NameValidationRule {
    fn validate(&self, blueprint: &ContractBlueprint) -> Result<(), AgentError> {
        // 检查合约名称
        if blueprint.name.is_empty() {
            return Err(AgentError::requirements_parsing_error("合约名称不能为空".to_string()));
        }

        // 检查名称格式（必须以字母开头，只包含字母、数字和下划线）
        if !blueprint.name.chars().next().unwrap().is_alphabetic() {
            return Err(AgentError::requirements_parsing_error(
                "合约名称必须以字母开头".to_string(),
            ));
        }

        if !blueprint.name.chars().all(|c| c.is_alphanumeric() || c == '_') {
            return Err(AgentError::requirements_parsing_error(
                "合约名称只能包含字母、数字和下划线".to_string(),
            ));
        }

        // 检查名称长度
        if blueprint.name.len() > 50 {
            return Err(AgentError::requirements_parsing_error(
                "合约名称长度不能超过 50 个字符".to_string(),
            ));
        }

        Ok(())
    }
}

/// 函数验证规则
struct FunctionValidationRule;

impl ValidationRule for FunctionValidationRule {
    fn validate(&self, blueprint: &ContractBlueprint) -> Result<(), AgentError> {
        // 检查是否有函数（自定义合约除外）
        if blueprint.functions.is_empty() && blueprint.contract_type != ContractType::Custom {
            return Err(AgentError::requirements_parsing_error(
                "合约必须包含至少一个函数".to_string(),
            ));
        }

        // 检查函数名称唯一性
        let mut function_names = HashSet::new();
        for func in &blueprint.functions {
            if !function_names.insert(&func.name) {
                return Err(AgentError::requirements_parsing_error(format!(
                    "函数名称重复: {}",
                    func.name
                )));
            }

            // 验证函数名称格式
            if func.name.is_empty() {
                return Err(AgentError::requirements_parsing_error("函数名称不能为空".to_string()));
            }

            // 验证参数
            for param in &func.parameters {
                if param.name.is_empty() {
                    return Err(AgentError::requirements_parsing_error(format!(
                        "函数 {} 的参数名称不能为空",
                        func.name
                    )));
                }

                if param.param_type.is_empty() {
                    return Err(AgentError::requirements_parsing_error(format!(
                        "函数 {} 的参数 {} 类型不能为空",
                        func.name, param.name
                    )));
                }
            }

            // 验证返回值
            for ret in &func.returns {
                if ret.param_type.is_empty() {
                    return Err(AgentError::requirements_parsing_error(format!(
                        "函数 {} 的返回值类型不能为空",
                        func.name
                    )));
                }
            }
        }

        Ok(())
    }
}

/// 状态变量验证规则
struct StateVariableValidationRule;

impl ValidationRule for StateVariableValidationRule {
    fn validate(&self, blueprint: &ContractBlueprint) -> Result<(), AgentError> {
        // 检查状态变量名称唯一性
        let mut var_names = HashSet::new();
        for var in &blueprint.state_variables {
            if !var_names.insert(&var.name) {
                return Err(AgentError::requirements_parsing_error(format!(
                    "状态变量名称重复: {}",
                    var.name
                )));
            }

            // 验证变量名称
            if var.name.is_empty() {
                return Err(AgentError::requirements_parsing_error(
                    "状态变量名称不能为空".to_string(),
                ));
            }

            // 验证变量类型
            if var.var_type.is_empty() {
                return Err(AgentError::requirements_parsing_error(format!(
                    "状态变量 {} 的类型不能为空",
                    var.name
                )));
            }

            // 常量和不可变变量不能同时设置
            if var.is_constant && var.is_immutable {
                return Err(AgentError::requirements_parsing_error(format!(
                    "状态变量 {} 不能同时是常量和不可变",
                    var.name
                )));
            }

            // 常量必须有初始值
            if var.is_constant && var.initial_value.is_none() {
                return Err(AgentError::requirements_parsing_error(format!(
                    "常量 {} 必须有初始值",
                    var.name
                )));
            }
        }

        Ok(())
    }
}

/// 安全验证规则
struct SecurityValidationRule;

impl ValidationRule for SecurityValidationRule {
    fn validate(&self, blueprint: &ContractBlueprint) -> Result<(), AgentError> {
        let security = &blueprint.security_requirements;

        // 如果合约涉及资金转移，必须有重入保护
        let has_payable_functions = blueprint
            .functions
            .iter()
            .any(|f| matches!(f.state_mutability, StateMutability::Payable));

        if has_payable_functions && !security.reentrancy_protection {
            return Err(AgentError::requirements_parsing_error(
                "涉及资金转移的合约必须启用重入保护".to_string(),
            ));
        }

        // 如果合约可升级，必须有访问控制
        if security.upgradeable && security.access_control.is_empty() {
            return Err(AgentError::requirements_parsing_error(
                "可升级合约必须配置访问控制".to_string(),
            ));
        }

        // 多签合约必须有多签要求
        if blueprint.contract_type == ContractType::MultiSig && !security.multisig_required {
            return Err(AgentError::requirements_parsing_error(
                "多签合约必须启用多签要求".to_string(),
            ));
        }

        Ok(())
    }
}

/// 合约类型验证规则
struct ContractTypeValidationRule;

impl ValidationRule for ContractTypeValidationRule {
    fn validate(&self, blueprint: &ContractBlueprint) -> Result<(), AgentError> {
        match blueprint.contract_type {
            ContractType::ERC20Token => {
                // ERC-20 必须有 symbol
                if blueprint.symbol.is_none() {
                    return Err(AgentError::requirements_parsing_error(
                        "ERC-20 代币必须有 symbol".to_string(),
                    ));
                }

                // 检查必需的函数
                let required_functions = vec![
                    "totalSupply",
                    "balanceOf",
                    "transfer",
                    "allowance",
                    "approve",
                    "transferFrom",
                ];

                for required in required_functions {
                    if !blueprint.functions.iter().any(|f| f.name == required) {
                        return Err(AgentError::requirements_parsing_error(format!(
                            "ERC-20 代币缺少必需的函数: {}",
                            required
                        )));
                    }
                }
            }
            ContractType::ERC721NFT => {
                // ERC-721 必须有 symbol
                if blueprint.symbol.is_none() {
                    return Err(AgentError::requirements_parsing_error(
                        "ERC-721 NFT 必须有 symbol".to_string(),
                    ));
                }

                // 检查必需的函数
                let required_functions = vec![
                    "balanceOf",
                    "ownerOf",
                    "safeTransferFrom",
                    "transferFrom",
                    "approve",
                    "setApprovalForAll",
                    "getApproved",
                    "isApprovedForAll",
                ];

                for required in required_functions {
                    if !blueprint.functions.iter().any(|f| f.name == required) {
                        return Err(AgentError::requirements_parsing_error(format!(
                            "ERC-721 NFT 缺少必需的函数: {}",
                            required
                        )));
                    }
                }
            }
            ContractType::ERC1155MultiToken => {
                // 检查必需的函数
                let required_functions = vec![
                    "balanceOf",
                    "balanceOfBatch",
                    "setApprovalForAll",
                    "isApprovedForAll",
                    "safeTransferFrom",
                    "safeBatchTransferFrom",
                ];

                for required in required_functions {
                    if !blueprint.functions.iter().any(|f| f.name == required) {
                        return Err(AgentError::requirements_parsing_error(format!(
                            "ERC-1155 多代币缺少必需的函数: {}",
                            required
                        )));
                    }
                }
            }
            _ => {}
        }

        Ok(())
    }
}

/// 继承验证规则
struct InheritanceValidationRule;

impl ValidationRule for InheritanceValidationRule {
    fn validate(&self, blueprint: &ContractBlueprint) -> Result<(), AgentError> {
        // 检查继承的合约是否有效
        let valid_base_contracts = vec![
            "ERC20",
            "ERC721",
            "ERC1155",
            "Ownable",
            "AccessControl",
            "Pausable",
            "ReentrancyGuard",
            "ERC20Burnable",
            "ERC20Pausable",
            "ERC721Enumerable",
            "ERC721URIStorage",
            "ERC721Burnable",
            "Governor",
            "TimelockController",
        ];

        for inherited in &blueprint.inheritance {
            // 检查是否是已知的 OpenZeppelin 合约
            let is_valid = valid_base_contracts
                .iter()
                .any(|&valid| inherited.contains(valid));

            if !is_valid && !inherited.starts_with("I") {
                // 如果不是接口（以 I 开头），发出警告
                tracing::warn!("未知的基础合约: {}", inherited);
            }
        }

        Ok(())
    }
}

/// 蓝图约束检查器
pub struct BlueprintConstraintChecker;

impl BlueprintConstraintChecker {
    /// 检查蓝图约束
    pub fn check_constraints(blueprint: &ContractBlueprint) -> Result<Vec<String>, AgentError> {
        let mut warnings = Vec::new();

        // 检查 Gas 优化建议
        if blueprint.gas_optimization.is_empty() {
            warnings.push("建议添加 Gas 优化措施".to_string());
        }

        // 检查事件
        if blueprint.events.is_empty() {
            warnings.push("建议添加事件以便追踪合约状态变化".to_string());
        }

        // 检查修饰符
        if blueprint.modifiers.is_empty()
            && !blueprint.functions.is_empty()
            && blueprint.contract_type != ContractType::Custom
        {
            warnings.push("建议添加修饰符以增强代码可读性和安全性".to_string());
        }

        // 检查文档
        if blueprint.description.is_empty() {
            warnings.push("建议添加合约描述".to_string());
        }

        // 检查函数文档
        for func in &blueprint.functions {
            if func.description.is_empty() {
                warnings.push(format!("建议为函数 {} 添加描述", func.name));
            }
        }

        // 检查部署配置
        if blueprint.deployment_config.target_networks.is_empty() {
            warnings.push("建议指定目标部署网络".to_string());
        }

        Ok(warnings)
    }

    /// 检查安全约束
    pub fn check_security_constraints(
        blueprint: &ContractBlueprint,
    ) -> Result<Vec<String>, AgentError> {
        let mut warnings = Vec::new();
        let security = &blueprint.security_requirements;

        // 检查访问控制
        if security.access_control.is_empty() {
            warnings.push("建议配置访问控制机制".to_string());
        }

        // 检查可支付函数
        let has_payable = blueprint
            .functions
            .iter()
            .any(|f| matches!(f.state_mutability, StateMutability::Payable));

        if has_payable {
            if !security.reentrancy_protection {
                warnings.push("可支付函数应启用重入保护".to_string());
            }

            if !security.pausable {
                warnings.push("涉及资金的合约建议添加暂停功能".to_string());
            }
        }

        // 检查外部调用
        for func in &blueprint.functions {
            if matches!(func.visibility, Visibility::External | Visibility::Public) {
                if func.modifiers.is_empty() {
                    warnings.push(format!(
                        "外部函数 {} 建议添加访问控制修饰符",
                        func.name
                    ));
                }
            }
        }

        Ok(warnings)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_blueprint() -> ContractBlueprint {
        ContractBlueprint {
            contract_type: ContractType::ERC20Token,
            name: "TestToken".to_string(),
            description: "A test token".to_string(),
            symbol: Some("TEST".to_string()),
            functions: vec![
                FunctionSpec {
                    name: "totalSupply".to_string(),
                    description: "Returns total supply".to_string(),
                    parameters: vec![],
                    returns: vec![Parameter {
                        name: "".to_string(),
                        param_type: "uint256".to_string(),
                        description: None,
                    }],
                    visibility: Visibility::Public,
                    state_mutability: StateMutability::View,
                    modifiers: vec![],
                    is_constructor: false,
                    is_fallback: false,
                },
                FunctionSpec {
                    name: "balanceOf".to_string(),
                    description: "Returns balance".to_string(),
                    parameters: vec![Parameter {
                        name: "account".to_string(),
                        param_type: "address".to_string(),
                        description: None,
                    }],
                    returns: vec![Parameter {
                        name: "".to_string(),
                        param_type: "uint256".to_string(),
                        description: None,
                    }],
                    visibility: Visibility::Public,
                    state_mutability: StateMutability::View,
                    modifiers: vec![],
                    is_constructor: false,
                    is_fallback: false,
                },
                FunctionSpec {
                    name: "transfer".to_string(),
                    description: "Transfers tokens".to_string(),
                    parameters: vec![
                        Parameter {
                            name: "to".to_string(),
                            param_type: "address".to_string(),
                            description: None,
                        },
                        Parameter {
                            name: "amount".to_string(),
                            param_type: "uint256".to_string(),
                            description: None,
                        },
                    ],
                    returns: vec![Parameter {
                        name: "".to_string(),
                        param_type: "bool".to_string(),
                        description: None,
                    }],
                    visibility: Visibility::Public,
                    state_mutability: StateMutability::Nonpayable,
                    modifiers: vec![],
                    is_constructor: false,
                    is_fallback: false,
                },
                FunctionSpec {
                    name: "allowance".to_string(),
                    description: "Returns allowance".to_string(),
                    parameters: vec![
                        Parameter {
                            name: "owner".to_string(),
                            param_type: "address".to_string(),
                            description: None,
                        },
                        Parameter {
                            name: "spender".to_string(),
                            param_type: "address".to_string(),
                            description: None,
                        },
                    ],
                    returns: vec![Parameter {
                        name: "".to_string(),
                        param_type: "uint256".to_string(),
                        description: None,
                    }],
                    visibility: Visibility::Public,
                    state_mutability: StateMutability::View,
                    modifiers: vec![],
                    is_constructor: false,
                    is_fallback: false,
                },
                FunctionSpec {
                    name: "approve".to_string(),
                    description: "Approves spending".to_string(),
                    parameters: vec![
                        Parameter {
                            name: "spender".to_string(),
                            param_type: "address".to_string(),
                            description: None,
                        },
                        Parameter {
                            name: "amount".to_string(),
                            param_type: "uint256".to_string(),
                            description: None,
                        },
                    ],
                    returns: vec![Parameter {
                        name: "".to_string(),
                        param_type: "bool".to_string(),
                        description: None,
                    }],
                    visibility: Visibility::Public,
                    state_mutability: StateMutability::Nonpayable,
                    modifiers: vec![],
                    is_constructor: false,
                    is_fallback: false,
                },
                FunctionSpec {
                    name: "transferFrom".to_string(),
                    description: "Transfers from".to_string(),
                    parameters: vec![
                        Parameter {
                            name: "from".to_string(),
                            param_type: "address".to_string(),
                            description: None,
                        },
                        Parameter {
                            name: "to".to_string(),
                            param_type: "address".to_string(),
                            description: None,
                        },
                        Parameter {
                            name: "amount".to_string(),
                            param_type: "uint256".to_string(),
                            description: None,
                        },
                    ],
                    returns: vec![Parameter {
                        name: "".to_string(),
                        param_type: "bool".to_string(),
                        description: None,
                    }],
                    visibility: Visibility::Public,
                    state_mutability: StateMutability::Nonpayable,
                    modifiers: vec![],
                    is_constructor: false,
                    is_fallback: false,
                },
            ],
            state_variables: vec![],
            events: vec![],
            modifiers: vec![],
            inheritance: vec!["ERC20".to_string()],
            security_requirements: SecurityRequirements::default(),
            deployment_config: BlueprintDeploymentConfig {
                target_networks: vec!["ethereum".to_string()],
                constructor_parameters: vec![],
                initialization_parameters: std::collections::HashMap::new(),
                dependencies: vec![],
            },
            gas_optimization: vec![],
            upgrade_strategy: None,
            platform_integration: None,
        }
    }

    #[test]
    fn test_blueprint_validation() {
        let blueprint = create_test_blueprint();
        let validator = BlueprintValidator::new();

        assert!(validator.validate(&blueprint).is_ok());
    }

    #[test]
    fn test_empty_name_validation() {
        let mut blueprint = create_test_blueprint();
        blueprint.name = String::new();

        let validator = BlueprintValidator::new();
        assert!(validator.validate(&blueprint).is_err());
    }

    #[test]
    fn test_constraint_checking() {
        let blueprint = create_test_blueprint();
        let warnings = BlueprintConstraintChecker::check_constraints(&blueprint).unwrap();

        assert!(!warnings.is_empty());
    }
}
