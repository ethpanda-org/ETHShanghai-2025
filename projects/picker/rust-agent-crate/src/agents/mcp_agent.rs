use anyhow::anyhow;
use std::pin::Pin;
use std::sync::Arc;
use log::info;

use crate::{
    Agent, AgentAction, AgentFinish, AgentOutput, BaseMemory, ChatMessage, ChatMessageContent, ChatModel,
    McpClient, McpToolAdapter, OpenAIChatModel, Runnable, Tool, parse_model_output
};
use serde_json::Value;

/// McpAgent 是一个基于 MCP 服务的智能体实现
/// 它能够连接 MCP 服务器，处理用户输入，调用工具，并生成响应
pub struct McpAgent {
    client: Arc<dyn McpClient>,
    tools: Vec<Box<dyn Tool + Send + Sync>>,
    system_prompt: String,
    openai_model: Option<OpenAIChatModel>,
    memory: Option<Box<dyn BaseMemory>>,
}

impl McpAgent {
    /// 创建一个新的 McpAgent 实例
    pub fn new(client: Arc<dyn McpClient>, system_prompt: String) -> Self {
        Self {
            client,
            tools: Vec::new(),
            system_prompt,
            openai_model: None, // 默认不设置OpenAI模型
            memory: None, // 默认不设置记忆模块
        }
    }
    
    /// 创建一个新的 McpAgent 实例，并指定 OpenAIChatModel
    pub fn with_openai_model(client: Arc<dyn McpClient>, system_prompt: String, openai_model: OpenAIChatModel) -> Self {
        Self {
            client,
            tools: Vec::new(),
            system_prompt,
            openai_model: Some(openai_model),
            memory: None, // 默认不设置记忆模块
        }
    }
    
    /// 创建一个新的 McpAgent 实例，并指定记忆模块
    pub fn with_memory(client: Arc<dyn McpClient>, system_prompt: String, memory: Box<dyn BaseMemory>) -> Self {
        Self {
            client,
            tools: Vec::new(),
            system_prompt,
            openai_model: None,
            memory: Some(memory),
        }
    }
    
    /// 创建一个新的 McpAgent 实例，并指定 OpenAIChatModel 和记忆模块
    pub fn with_openai_model_and_memory(client: Arc<dyn McpClient>, system_prompt: String, openai_model: OpenAIChatModel, memory: Box<dyn BaseMemory>) -> Self {
        Self {
            client,
            tools: Vec::new(),
            system_prompt,
            openai_model: Some(openai_model),
            memory: Some(memory),
        }
    }

    /// 获取记忆模块的引用
    pub fn get_memory(&self) -> Option<&Box<dyn BaseMemory>> {
        self.memory.as_ref()
    }

    /// 向 Agent 添加一个工具
    pub fn add_tool(&mut self, tool: Box<dyn Tool + Send + Sync>) {
        self.tools.push(tool);
    }
    
    /// 自动从 MCP 客户端获取工具并添加到 Agent
    /// 这个方法会从 MCP 客户端获取所有可用工具，并将它们包装为 McpToolAdapter 后添加到 Agent
    /// 本地工具的注册与添加由调用者处理
    pub async fn auto_add_tools(&mut self) -> Result<(), anyhow::Error> {
        use crate::McpToolAdapter;
        
        // 从 MCP 客户端获取工具列表
        let tools = self.client.get_tools().await?;

        // 打印获取到的工具信息
        for tool in &tools {
            info!("MCP Client Get Tool: {} - {}", tool.name, tool.description);
        }
        
        // 将每个工具包装为 McpToolAdapter 并添加到 Agent
        for tool in tools {
            let tool_adapter = McpToolAdapter::new(
                self.client.clone(),
                tool
            );
            self.add_tool(Box::new(tool_adapter));
        }
        
        Ok(())
    }
}

impl Agent for McpAgent {
    fn tools(&self) -> Vec<Box<dyn Tool + Send + Sync>> {
        // 返回工具列表的克隆版本
        // 为了解决 Box<dyn Tool> 不能直接克隆的问题，我们创建新的工具适配器实例
        let mut cloned_tools: Vec<Box<dyn Tool + Send + Sync>> = Vec::new();

        // 由于 McpToolAdapter 可以通过 client 和 McpTool 重新创建，
        // 我们遍历现有工具并为每个工具创建新的适配器实例
        for tool in &self.tools {
            // 检查工具是否为 McpToolAdapter 类型
            if let Some(mcp_tool_adapter) = tool.as_any().downcast_ref::<McpToolAdapter>() {
                // 重新创建 McpToolAdapter 实例
                let cloned_adapter = McpToolAdapter::new(
                    mcp_tool_adapter.get_client(),
                    mcp_tool_adapter.get_mcp_tool(),
                );
                cloned_tools.push(Box::new(cloned_adapter));
            } else {
                // 对于其他类型的工具，我们暂时跳过或需要实现其他克隆机制
                // 这里可以添加日志或错误处理
                info!(
                    "Warning: Unable to clone non-McpToolAdapter type tool: {}",
                    tool.name()
                );
            }
        }

        cloned_tools
    }

    fn execute(
        &self,
        _action: &AgentAction,
    ) -> std::pin::Pin<
        Box<dyn std::future::Future<Output = Result<String, anyhow::Error>> + Send + '_>,
    > {
        Box::pin(async move {
            // 在实际应用中，这里应该有一个机制来查找和调用工具
            // 由于我们不能克隆工具列表，这里简化实现
            Err(anyhow!("Tool execution functionality is not implemented yet"))
        })
    }

    fn clone_agent(&self) -> Box<dyn Agent> {
        // 创建一个新的 McpAgent 实例，复制基本字段，但不复制工具（简化实现）
        let new_agent = McpAgent::new(
            self.client.clone(),
            self.system_prompt.clone(),
        );

        // 注意：这里我们不复制工具，因为 Box<dyn Tool> 不能直接克隆
        Box::new(new_agent)
    }
}

impl Clone for McpAgent {
    fn clone(&self) -> Self {
        // 创建一个新的 McpAgent 实例，但不复制工具列表（简化实现）
        Self {
            client: Arc::clone(&self.client),
            tools: Vec::new(), // 不复制工具，因为 Box<dyn Tool> 不能直接克隆
            system_prompt: self.system_prompt.clone(),
            openai_model: self.openai_model.clone(), // 克隆OpenAI模型实例
            memory: self.memory.clone(), // 克隆记忆模块
        }
    }
}

impl Runnable<std::collections::HashMap<String, String>, AgentOutput> for McpAgent {
    fn invoke(
        &self,
        input: std::collections::HashMap<String, String>,
    ) -> Pin<Box<dyn std::future::Future<Output = Result<AgentOutput, anyhow::Error>> + Send>> {
        // 提前捕获系统提示词
        let system_prompt = self.system_prompt.clone();
        let input_text = input
            .get("input")
            .cloned()
            .unwrap_or_default()
            .to_string()
            .trim()
            .to_string();

        // 提前捕获工具描述，避免在async move中使用self
        let tool_descriptions: String = if !self.tools.is_empty() {
            let mut descriptions = String::new();
            for tool in &self.tools {
                descriptions.push_str(&format!("- {}: {}\n", tool.name(), tool.description()));
            }
            descriptions
        } else {
            String::new()
        };

        // 提前捕获记忆模块，避免在async move中使用self
        let memory_clone = self.memory.clone();

        // 构建增强的系统提示词，采用ReAct框架格式
        let enhanced_system_prompt = if !tool_descriptions.is_empty() {
            format!("{}
You are an AI assistant that follows the ReAct (Reasoning and Acting) framework. 
You should think step by step and decide whether to use tools based on user needs.
You should carefully review and when confirming the use of the tool, if there are omissions, errors, or other issues with the parameters, you should reply and remind the user.
Available tools:\n{}\n\nWhen you need to use a tool, please respond in the following JSON format:
            \n{{\"call_tool\": {{\"name\": \"Tool Name\", \"parameters\": {{\"parameter_name\": \"parameter_value\"}}}}}}
        When you don't need to use a tool, please respond in the following JSON format:\n{{\"content\": \"Your answer\"}}
        Please think carefully about whether the user's request requires a tool to be used, and only use tools when necessary.", 
            system_prompt, tool_descriptions)
        } else {
            system_prompt
        };

        // 提前捕获OpenAI模型实例，避免在async move中使用self
        let openai_model_clone = self.openai_model.clone();

        Box::pin(async move {
            // 检查输入是否为空
            if input_text.is_empty() {
                let mut return_values = std::collections::HashMap::new();
                return_values.insert("answer".to_string(), "Please enter valid content".to_string());
                // 从OpenAI模型获取模型名称，如果没有则使用默认值
                let model_name = if let Some(ref openai_model) = openai_model_clone {
                    openai_model.model_name().map(|s| s.to_string()).unwrap_or("unknown".to_string())
                } else {
                    "unknown".to_string()
                };
                return_values.insert("model".to_string(), model_name);
                return Ok(AgentOutput::Finish(AgentFinish { return_values }));
            }

            // 使用传入的OpenAI模型实例或创建新的实例
            let model = if let Some(ref openai_model) = openai_model_clone {
                // 使用传入的OpenAI模型实例
                openai_model
            } else {
                // 如果没有提供OpenAI模型实例，则返回错误
                let mut return_values = std::collections::HashMap::new();
                return_values.insert("answer".to_string(), "No OpenAI model provided".to_string());
                return_values.insert("model".to_string(), "unknown".to_string());
                return Ok(AgentOutput::Finish(AgentFinish { return_values }));
            };

            // 构建消息列表
            let mut messages = Vec::new();

            // 添加系统消息
            messages.push(ChatMessage::System(ChatMessageContent {
                content: enhanced_system_prompt,
                name: None,
                additional_kwargs: std::collections::HashMap::new(),
            }));

            // 如果有记忆模块，加载记忆变量并添加到消息列表中
            if let Some(memory) = &memory_clone {
                match memory.load_memory_variables(&std::collections::HashMap::new()).await {
                    Ok(memories) => {
                        info!("加载记忆变量: {:?}", memories);
                        if let Some(chat_history) = memories.get("chat_history") {
                            if let serde_json::Value::Array(messages_array) = chat_history {
                                for message in messages_array {
                                    if let serde_json::Value::Object(msg_obj) = message {
                                        let role = msg_obj.get("role").and_then(|v| v.as_str()).unwrap_or("unknown");
                                        let content = msg_obj.get("content").and_then(|v| v.as_str()).unwrap_or("");
                                        
                                        // 添加调试日志
                                        log::info!("加载消息: role={}, content={}", role, content);
                                        
                                        match role {
                                            "human" => {
                                                // 添加调试日志
                                                log::info!("加载人类消息: content={}", content);
                                                messages.push(ChatMessage::Human(ChatMessageContent {
                                                    content: content.to_string(),
                                                    name: None,
                                                    additional_kwargs: std::collections::HashMap::new(),
                                                }));
                                            },
                                            "ai" => {
                                                // 添加调试日志
                                                log::info!("加载AI消息: content={}", content);
                                                messages.push(ChatMessage::AIMessage(ChatMessageContent {
                                                    content: content.to_string(),
                                                    name: None,
                                                    additional_kwargs: std::collections::HashMap::new(),
                                                }));
                                            },
                                            "tool" => {
                                                // 处理工具消息
                                                let content_str = content.to_string();
                                                // 添加调试日志
                                                log::info!("加载工具消息: content={}", content_str);
                                                messages.push(ChatMessage::ToolMessage(ChatMessageContent {
                                                    content: content_str,
                                                    name: None,
                                                    additional_kwargs: std::collections::HashMap::new(),
                                                }));
                                            },
                                            _ => {
                                                // 添加调试日志
                                                log::info!("加载未知角色消息: role={}, content={}", role, content);
                                                // 忽略未知角色的消息
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    Err(e) => {
                        // 如果加载记忆失败，记录错误但继续执行
                        log::warn!("Failed to load memory variables: {}", e);
                    }
                }
            }

            // 添加当前用户消息
            messages.push(ChatMessage::Human(ChatMessageContent {
                content: input_text.clone(),
                name: None,
                additional_kwargs: std::collections::HashMap::new(),
            }));
            info!("添加当前用户消息: role=user, content={}", input_text);
            
            // 添加调试日志，显示所有消息
            log::info!("准备发送给模型的消息:");
            for (i, msg) in messages.iter().enumerate() {
                match msg {
                    ChatMessage::System(content) => {
                        log::info!("  {}. role=system, content={}", i+1, content.content);
                    },
                    ChatMessage::Human(content) => {
                        log::info!("  {}. role=user, content={}", i+1, content.content);
                    },
                    ChatMessage::AIMessage(content) => {
                        log::info!("  {}. role=assistant, content={}", i+1, content.content);
                    },
                    ChatMessage::ToolMessage(content) => {
                        log::info!("  {}. role=tool, content={}", i+1, content.content);
                    },
                }
            }

            // 调用语言模型
            let result = model.invoke(messages).await;

            match result {
                Ok(completion) => {
                    // 解析模型输出
                    let content = match completion.message {
                        ChatMessage::AIMessage(content) => content.content,
                        _ => { format!("{},{:?}", "Non-AI message received", completion.message) }
                    };

                    // 从OpenAI模型获取模型名称，如果没有则使用默认值
                    let model_name = model.model_name().map(|s| s.to_string()).unwrap_or("unknown".to_string());

                    // 如果有记忆模块，保存当前对话到记忆中
                    if let Some(memory) = &memory_clone {
                        let mut inputs = std::collections::HashMap::new();
                        inputs.insert("input".to_string(), serde_json::Value::String(input_text.clone()));
                        
                        let mut outputs = std::collections::HashMap::new();
                        outputs.insert("output".to_string(), serde_json::Value::String(content.clone()));
                        
                        if let Err(e) = memory.save_context(&inputs, &outputs).await {
                            log::warn!("Failed to save context to memory: {}", e);
                        }
                    }

                    // 解析模型输出，判断是否需要调用工具
                    // 这里应该正确解析模型输出的JSON格式
                    if let Ok(parsed_output) = parse_model_output(&content) {
                        match parsed_output {
                            AgentOutput::Action(action) => {
                                // 直接返回模型解析出的Action
                                return Ok(AgentOutput::Action(action));
                            }
                            AgentOutput::Finish(_) => {
                                // 直接返回回答
                                let mut return_values = std::collections::HashMap::new();
                                return_values.insert("answer".to_string(), content.clone());
                                return_values.insert("model".to_string(), model_name);
                                return Ok(AgentOutput::Finish(AgentFinish { return_values }));
                            }
                        }
                    } else {
                        // 如果解析失败，尝试提取工具调用信息
                        // 检查是否包含工具调用关键词
                        if content.contains("call_tool") {
                            // 尝试从内容中提取JSON格式的工具调用
                            // 这里应该更智能地解析工具调用，而不是使用默认工具
                            if let Ok(agent_action) = parse_tool_call_from_content(&content) {
                                Ok(AgentOutput::Action(agent_action))
                            } else {
                                // 如果无法解析工具调用，直接返回回答
                                let mut return_values = std::collections::HashMap::new();
                                return_values.insert("answer".to_string(), content.clone());
                                return_values.insert("model".to_string(), model_name);
                                Ok(AgentOutput::Finish(AgentFinish { return_values }))
                            }
                        } else {
                            // 直接返回回答
                            let mut return_values = std::collections::HashMap::new();
                            return_values.insert("answer".to_string(), content.clone());
                            return_values.insert("model".to_string(), model_name);
                            Ok(AgentOutput::Finish(AgentFinish { return_values }))
                        }
                    }
                }
                Err(e) => {
                    // 出错时返回错误信息
                    // 从OpenAI模型获取模型名称，如果没有则使用默认值
                    let model_name = if let Some(ref model) = openai_model_clone {
                        model.model_name().map(|s| s.to_string()).unwrap_or("unknown".to_string())
                    } else {
                        "unknown".to_string()
                    };
                    let mut return_values = std::collections::HashMap::new();
                    return_values.insert("answer".to_string(), format!("Model invocation failed: {}", e));
                    return_values.insert("model".to_string(), model_name);
                    Ok(AgentOutput::Finish(AgentFinish { return_values }))
                }
            }
        })
    }

    fn clone_to_owned(
        &self,
    ) -> Box<dyn Runnable<std::collections::HashMap<String, String>, AgentOutput> + Send + Sync>
    {
        Box::new(self.clone())
    }
}

/// 从内容中提取JSON对象字符串
fn extract_json_object(content: &str) -> Option<String> {
    // 查找第一个 '{' 和最后一个 '}'
    if let Some(start) = content.find('{') {
        if let Some(end) = content.rfind('}') {
            if end > start {
                // 提取可能的JSON对象
                let json_str = &content[start..=end];
                
                // 验证是否是有效的JSON对象
                if let Ok(value) = serde_json::from_str::<serde_json::Value>(json_str) {
                    if value.is_object() {
                        return Some(json_str.to_string());
                    }
                }
            }
        }
    }
    None
}

/// 从内容中解析工具调用
fn parse_tool_call_from_content(content: &str) -> Result<AgentAction, anyhow::Error> {
    // 尝试提取JSON对象
    if let Some(json_str) = extract_json_object(content) {
        // 解析JSON
        let value: Value = serde_json::from_str(&json_str)?;
        
        // 检查是否有call_tool字段
        if let Some(call_tool) = value.get("call_tool").and_then(|v| v.as_object()) {
            // 提取工具名称
            let tool_name = call_tool
                .get("name")
                .and_then(|v| v.as_str())
                .ok_or_else(|| anyhow::anyhow!("Missing tool name"))?
                .to_string();
            
            // 提取参数并转换为字符串
            let tool_input = call_tool
                .get("parameters")
                .cloned()
                .unwrap_or(Value::Object(serde_json::Map::new()))
                .to_string();
            
            // 创建AgentAction
            let action = AgentAction {
                tool: tool_name,
                tool_input,
                log: content.to_string(),
                thought: None,
            };
            
            return Ok(action);
        }
    }
    
    // 如果无法解析，返回错误
    Err(anyhow::anyhow!("Failed to parse tool call from content"))
}
