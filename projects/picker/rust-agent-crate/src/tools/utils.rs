use crate::tools::Tool;
use std::boxed::Box;
use serde_json::Value;
use std::collections::HashMap;
use crate::agents::{AgentOutput, AgentAction, AgentFinish};

/// 实现工具名称模糊匹配机制，返回匹配的工具名称
pub fn find_matching_tool_index(tools: &[Box<dyn Tool + Send + Sync>], requested_tool: &str) -> Option<String> {
    // 1. 精确匹配 - 优先尝试完全匹配
    if let Some(tool) = tools.iter().find(|t| { 
        t.name() == requested_tool 
    }) {
        return Some(tool.name().to_string());
    }
    
    // 2. 包含匹配 - 检查工具名是否包含请求的工具名（不区分大小写）
    let requested_lower = requested_tool.to_lowercase();
    for tool in tools {
        let tool_name_lower = tool.name().to_lowercase();
        // 例如：当请求"weather"时，匹配"get_weather"
        if tool_name_lower.contains(&requested_lower) || requested_lower.contains(&tool_name_lower) {
            return Some(tool.name().to_string());
        }
    }
    
    // 3. 关键词匹配 - 针对默认模拟工具，天气相关查询，特殊处理
    if requested_lower.contains("weather") || requested_lower.contains("天气") {
        if let Some(tool) = tools.iter().find(|t| t.name().to_lowercase().contains("weather") || t.name().to_lowercase().contains("天气")) {
            return Some(tool.name().to_string());
        }
    }
    
    // 4. 计算工具关键词匹配 - 只有当输入看起来像数学表达式时才匹配计算工具
    // 检查是否包含计算相关的关键词和数学运算符
    let has_calc_keywords = requested_lower.contains("calculate") || requested_lower.contains("计算") || 
                           requested_lower.contains("plus") || requested_lower.contains("minus") || 
                           requested_lower.contains("times") || requested_lower.contains("divided");
    
    let has_math_operators = requested_lower.contains("+") || requested_lower.contains("-") || 
                            requested_lower.contains("*") || requested_lower.contains("/") || 
                            requested_lower.contains("plus") || requested_lower.contains("minus") || 
                            requested_lower.contains("times") || requested_lower.contains("divided");
    
    if has_calc_keywords && has_math_operators {
        if let Some(tool) = tools.iter().find(|t| t.name().to_lowercase().contains("calculate") || t.name().to_lowercase().contains("计算")) {
            return Some(tool.name().to_string());
        }
    }
    
    None
}

// 独立的模型输出解析函数，避免在异步块中引用 self
pub fn parse_model_output(content: &str) -> Result<AgentOutput, anyhow::Error> {
    // 尝试解析 JSON
    if let Ok(value) = serde_json::from_str::<Value>(content) {
        // 检查是否有 call_tool 字段
        if let Some(call_tool) = value.get("call_tool") {
            // 解析工具调用
            if let Some(tool_name) = call_tool.get("name") {
                let tool_name = tool_name.as_str().unwrap_or("unknown").to_string();
                
                // 获取参数
                let parameters = call_tool.get("parameters").cloned().unwrap_or(Value::Object(serde_json::Map::new()));
                
                // 将参数转换为字符串
                let tool_input = parameters.to_string();
                
                return Ok(AgentOutput::Action(AgentAction {
                    tool: tool_name,
                    tool_input,
                    log: "Call tool".to_string(),
                    thought: Some("Call tool based on model output".to_string()),
                }));
            }
        }
        
        // 检查是否有 content 字段
        if let Some(content_value) = value.get("content") {
            let content_text = content_value.as_str().unwrap_or("").to_string();
            let mut return_values = HashMap::new();
            return_values.insert("answer".to_string(), content_text);
            
            return Ok(AgentOutput::Finish(AgentFinish {
                return_values,
            }));
        }
    }
    
    // 如果解析失败，返回错误
    Err(anyhow::anyhow!("Failed to parse model output"))
}
