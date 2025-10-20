// Rust Agent: 与LangChain-Core对齐的AI Agent框架

mod core;
mod models;
pub mod tools;
mod memory;
mod agents;
mod callbacks;
mod mcp;

// 重新导出主要组件供外部使用
pub use core::{Runnable, RunnableExt, RunnableSequence};
pub use models::{ChatModel, ChatMessage, ChatMessageContent, ChatCompletion, TokenUsage, OpenAIChatModel};
pub use tools::{Tool, Toolkit, ExampleTool, ExampleToolkit, find_matching_tool_index, parse_model_output};
pub use memory::{BaseMemory, SimpleMemory};
pub use agents::{Agent, McpAgent, AgentAction, AgentFinish, AgentOutput, AgentRunner, SimpleAgent, SimpleAgentRunner};
pub use callbacks::CallbackHandler;
pub use mcp::{McpClient, SimpleMcpClient, McpTool, McpToolAdapter, McpServer, SimpleMcpServer};
use anyhow::Error;
use std::collections::HashMap;

// 实用函数和错误处理
pub use core::pipe;
// 导出anyhow错误处理库，确保第三方用户可以一致地处理错误
pub use anyhow;

// 运行Agent的主函数
pub async fn run_agent(agent: &McpAgent, input: String) -> Result<String, Error> {
    let mut inputs = HashMap::new();
    inputs.insert("input".to_string(), input);
    let output = agent.invoke(inputs).await?;
    
    match output {
        AgentOutput::Action(action) => {
            // 查找对应的工具，使用模糊匹配机制
            let tools = agent.tools();
            match find_matching_tool_index(&tools, &action.tool) {
                Some(matched_name) => {
                    // 找到匹配的工具名称后，再次查找具体的工具
                    if let Some(tool) = tools.iter().find(|t| t.name() == matched_name) {
                        // 调用工具
                        let tool_result = tool.invoke(&action.tool_input).await?;
                        
                        // 将工具执行结果反馈给Agent进行进一步处理
                        let mut new_inputs = HashMap::new();
                        new_inputs.insert("input".to_string(), format!("[CUSTOMIZE_TOOL_RESULT] {{\"tool\": \"{}\", \"result\": {}}}", matched_name, tool_result));
                        let new_output = agent.invoke(new_inputs).await?;
                        
                        match new_output {
                            AgentOutput::Finish(finish) => {
                                Ok(finish.return_values.get("answer").map(|s| s.clone()).unwrap_or_else(|| "".to_string()))
                            },
                            _ => {
                                // 如果还是Action，先简单返回工具结果
                                Ok(format!("Tool {} executed successfully, result: {}", matched_name, tool_result))
                            }
                        }
                    } else {
                        Err(Error::msg(format!("Tool {} does not exist", matched_name)))
                    }
                },
                None => {
                    Err(Error::msg(format!("Tool {} does not exist", action.tool)))
                }
            }
        },
        AgentOutput::Finish(finish) => {
            Ok(finish.return_values.get("answer").map(|s| s.clone()).unwrap_or_else(|| "".to_string()))
        },
    }
}
