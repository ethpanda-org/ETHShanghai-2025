//! 模板引擎
//! 
//! 基于 Askama 的模板渲染引擎

use crate::error::{AiContractError, Result};
use crate::types::ContractBlueprint;
use askama::Template;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// 模板引擎
pub struct TemplateEngine {
    /// 模板缓存
    template_cache: HashMap<String, String>,
}

impl TemplateEngine {
    /// 创建新的模板引擎
    pub fn new() -> Self {
        Self {
            template_cache: HashMap::new(),
        }
    }
    
    /// 渲染 Solidity 合约模板
    pub fn render_contract(
        &self,
        template_code: &str,
        context: &ContractContext,
    ) -> Result<String> {
        // 使用简单的字符串替换进行模板渲染
        let mut rendered = template_code.to_string();
        
        // 替换合约名称
        rendered = rendered.replace("{{contract_name}}", &context.contract_name);
        
        // 替换描述
        if let Some(description) = &context.description {
            rendered = rendered.replace("{{description}}", description);
        }
        
        // 替换其他参数
        for (key, value) in &context.parameters {
            let placeholder = format!("{{{{{}}}}}", key);
            rendered = rendered.replace(&placeholder, value);
        }
        
        Ok(rendered)
    }
    
    /// 渲染函数模板
    pub fn render_function(
        &self,
        function_template: &FunctionTemplate,
    ) -> Result<String> {
        let mut code = String::new();
        
        // 添加 NatSpec 注释
        if let Some(description) = &function_template.description {
            code.push_str(&format!("    /**\n     * @dev {}\n", description));
            
            // 添加参数注释
            for param in &function_template.parameters {
                code.push_str(&format!("     * @param {} {}\n", 
                    param.name, 
                    param.description.as_deref().unwrap_or("")
                ));
            }
            
            // 添加返回值注释
            if !function_template.returns.is_empty() {
                for ret in &function_template.returns {
                    code.push_str(&format!("     * @return {} {}\n", 
                        ret.name, 
                        ret.description.as_deref().unwrap_or("")
                    ));
                }
            }
            
            code.push_str("     */\n");
        }
        
        // 函数签名
        code.push_str(&format!("    function {}(", function_template.name));
        
        // 参数列表
        let params: Vec<String> = function_template.parameters
            .iter()
            .map(|p| format!("{} {}", p.param_type, p.name))
            .collect();
        code.push_str(&params.join(", "));
        
        code.push_str(") ");
        
        // 可见性
        code.push_str(&format!("{} ", function_template.visibility));
        
        // 状态可变性
        if !function_template.state_mutability.is_empty() {
            code.push_str(&format!("{} ", function_template.state_mutability));
        }
        
        // 修饰符
        for modifier in &function_template.modifiers {
            code.push_str(&format!("{} ", modifier));
        }
        
        // 返回值
        if !function_template.returns.is_empty() {
            code.push_str("returns (");
            let returns: Vec<String> = function_template.returns
                .iter()
                .map(|r| format!("{} {}", r.param_type, r.name))
                .collect();
            code.push_str(&returns.join(", "));
            code.push_str(") ");
        }
        
        code.push_str("{\n");
        
        // 函数体
        if let Some(body) = &function_template.body {
            for line in body.lines() {
                code.push_str(&format!("        {}\n", line));
            }
        } else {
            code.push_str("        // TODO: Implement function logic\n");
        }
        
        code.push_str("    }\n");
        
        Ok(code)
    }
    
    /// 渲染事件模板
    pub fn render_event(&self, event: &EventTemplate) -> Result<String> {
        let mut code = String::new();
        
        // 添加注释
        if let Some(description) = &event.description {
            code.push_str(&format!("    /// {}\n", description));
        }
        
        // 事件声明
        code.push_str(&format!("    event {}(", event.name));
        
        // 参数列表
        let params: Vec<String> = event.parameters
            .iter()
            .map(|p| {
                let indexed = if p.indexed { "indexed " } else { "" };
                format!("{}{} {}", indexed, p.param_type, p.name)
            })
            .collect();
        code.push_str(&params.join(", "));
        
        code.push_str(");\n");
        
        Ok(code)
    }
    
    /// 渲染状态变量模板
    pub fn render_state_variable(&self, var: &StateVariableTemplate) -> Result<String> {
        let mut code = String::new();
        
        // 添加注释
        if let Some(description) = &var.description {
            code.push_str(&format!("    /// {}\n", description));
        }
        
        // 变量声明
        code.push_str("    ");
        
        // 可见性
        code.push_str(&format!("{} ", var.visibility));
        
        // 常量或不可变
        if var.is_constant {
            code.push_str("constant ");
        } else if var.is_immutable {
            code.push_str("immutable ");
        }
        
        // 类型和名称
        code.push_str(&format!("{} {}", var.var_type, var.name));
        
        // 初始值
        if let Some(initial_value) = &var.initial_value {
            code.push_str(&format!(" = {}", initial_value));
        }
        
        code.push_str(";\n");
        
        Ok(code)
    }
    
    /// 渲染修饰符模板
    pub fn render_modifier(&self, modifier: &ModifierTemplate) -> Result<String> {
        let mut code = String::new();
        
        // 添加注释
        if let Some(description) = &modifier.description {
            code.push_str(&format!("    /**\n     * @dev {}\n     */\n", description));
        }
        
        // 修饰符声明
        code.push_str(&format!("    modifier {}(", modifier.name));
        
        // 参数列表
        let params: Vec<String> = modifier.parameters
            .iter()
            .map(|p| format!("{} {}", p.param_type, p.name))
            .collect();
        code.push_str(&params.join(", "));
        
        code.push_str(") {\n");
        
        // 修饰符体
        if let Some(body) = &modifier.body {
            for line in body.lines() {
                code.push_str(&format!("        {}\n", line));
            }
        }
        
        code.push_str("        _;\n");
        code.push_str("    }\n");
        
        Ok(code)
    }
    
    /// 从蓝图生成完整合约
    pub fn generate_from_blueprint(
        &self,
        blueprint: &ContractBlueprint,
        template_code: &str,
    ) -> Result<String> {
        let context = ContractContext {
            contract_name: blueprint.name.clone(),
            description: Some(blueprint.description.clone()),
            parameters: HashMap::new(),
        };
        
        self.render_contract(template_code, &context)
    }
    
    /// 组合多个代码片段
    pub fn combine_code_sections(&self, sections: &[String]) -> String {
        sections.join("\n\n")
    }
    
    /// 格式化 Solidity 代码
    pub fn format_solidity_code(&self, code: &str) -> Result<String> {
        // 简单的代码格式化
        let mut formatted = String::new();
        let mut indent_level: i32 = 0;
        
        for line in code.lines() {
            let trimmed = line.trim();
            
            // 减少缩进
            if trimmed.starts_with('}') {
                indent_level = indent_level.saturating_sub(1);
            }
            
            // 添加缩进
            if !trimmed.is_empty() {
                formatted.push_str(&"    ".repeat(indent_level as usize));
                formatted.push_str(trimmed);
                formatted.push('\n');
            } else {
                formatted.push('\n');
            }
            
            // 增加缩进
            if trimmed.ends_with('{') {
                indent_level += 1;
            }
        }
        
        Ok(formatted)
    }
}

impl Default for TemplateEngine {
    fn default() -> Self {
        Self::new()
    }
}

/// 合约上下文
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContractContext {
    /// 合约名称
    pub contract_name: String,
    
    /// 合约描述
    pub description: Option<String>,
    
    /// 模板参数
    pub parameters: HashMap<String, String>,
}

/// 函数模板
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FunctionTemplate {
    /// 函数名称
    pub name: String,
    
    /// 函数描述
    pub description: Option<String>,
    
    /// 参数
    pub parameters: Vec<ParameterTemplate>,
    
    /// 返回值
    pub returns: Vec<ParameterTemplate>,
    
    /// 可见性
    pub visibility: String,
    
    /// 状态可变性
    pub state_mutability: String,
    
    /// 修饰符
    pub modifiers: Vec<String>,
    
    /// 函数体
    pub body: Option<String>,
}

/// 参数模板
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParameterTemplate {
    /// 参数名称
    pub name: String,
    
    /// 参数类型
    pub param_type: String,
    
    /// 参数描述
    pub description: Option<String>,
}

/// 事件模板
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventTemplate {
    /// 事件名称
    pub name: String,
    
    /// 事件描述
    pub description: Option<String>,
    
    /// 参数
    pub parameters: Vec<EventParameterTemplate>,
}

/// 事件参数模板
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventParameterTemplate {
    /// 参数名称
    pub name: String,
    
    /// 参数类型
    pub param_type: String,
    
    /// 是否索引
    pub indexed: bool,
}

/// 状态变量模板
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateVariableTemplate {
    /// 变量名称
    pub name: String,
    
    /// 变量类型
    pub var_type: String,
    
    /// 可见性
    pub visibility: String,
    
    /// 是否常量
    pub is_constant: bool,
    
    /// 是否不可变
    pub is_immutable: bool,
    
    /// 初始值
    pub initial_value: Option<String>,
    
    /// 描述
    pub description: Option<String>,
}

/// 修饰符模板
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModifierTemplate {
    /// 修饰符名称
    pub name: String,
    
    /// 参数
    pub parameters: Vec<ParameterTemplate>,
    
    /// 修饰符体
    pub body: Option<String>,
    
    /// 描述
    pub description: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_render_contract() {
        let engine = TemplateEngine::new();
        let template = "contract {{contract_name}} { }";
        let context = ContractContext {
            contract_name: "MyToken".to_string(),
            description: None,
            parameters: HashMap::new(),
        };
        
        let result = engine.render_contract(template, &context).unwrap();
        assert!(result.contains("MyToken"));
    }

    #[test]
    fn test_render_function() {
        let engine = TemplateEngine::new();
        let function = FunctionTemplate {
            name: "transfer".to_string(),
            description: Some("Transfer tokens".to_string()),
            parameters: vec![
                ParameterTemplate {
                    name: "to".to_string(),
                    param_type: "address".to_string(),
                    description: Some("Recipient address".to_string()),
                },
                ParameterTemplate {
                    name: "amount".to_string(),
                    param_type: "uint256".to_string(),
                    description: Some("Amount to transfer".to_string()),
                },
            ],
            returns: vec![
                ParameterTemplate {
                    name: "success".to_string(),
                    param_type: "bool".to_string(),
                    description: Some("Transfer success".to_string()),
                },
            ],
            visibility: "public".to_string(),
            state_mutability: "".to_string(),
            modifiers: vec![],
            body: Some("return true;".to_string()),
        };
        
        let result = engine.render_function(&function).unwrap();
        assert!(result.contains("function transfer"));
        assert!(result.contains("address to"));
        assert!(result.contains("uint256 amount"));
    }

    #[test]
    fn test_render_event() {
        let engine = TemplateEngine::new();
        let event = EventTemplate {
            name: "Transfer".to_string(),
            description: Some("Emitted when tokens are transferred".to_string()),
            parameters: vec![
                EventParameterTemplate {
                    name: "from".to_string(),
                    param_type: "address".to_string(),
                    indexed: true,
                },
                EventParameterTemplate {
                    name: "to".to_string(),
                    param_type: "address".to_string(),
                    indexed: true,
                },
                EventParameterTemplate {
                    name: "value".to_string(),
                    param_type: "uint256".to_string(),
                    indexed: false,
                },
            ],
        };
        
        let result = engine.render_event(&event).unwrap();
        assert!(result.contains("event Transfer"));
        assert!(result.contains("indexed address from"));
    }

    #[test]
    fn test_format_solidity_code() {
        let engine = TemplateEngine::new();
        let code = "contract Test {\nfunction test() public {\nreturn true;\n}\n}";
        
        let result = engine.format_solidity_code(code).unwrap();
        assert!(result.contains("    function test()"));
    }
}