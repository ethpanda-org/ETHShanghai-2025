// 混合模式MCP Agent示例 - 同时支持本地工具和MCP服务器工具
use rust_agent::{run_agent, OpenAIChatModel, McpClient, SimpleMcpClient, McpTool, McpAgent, SimpleMemory, BaseMemory, Agent};
use std::sync::Arc;
use std::collections::HashMap;
use chrono;
use serde_json::{Value, json};

// 初始化日志记录器
use log::LevelFilter;
use env_logger;
use tokio;
use log::{info, error};

#[tokio::main]
async fn main() {
    // 初始化日志记录器
    env_logger::Builder::new()
        .filter_level(LevelFilter::Error)  // 设置日志级别为Info以便查看详细信息
        .init();
    
    info!("=== Rust Agent 混合模式示例 ===");
    
    // 从环境变量获取API密钥和基本URL
    let api_key = std::env::var("OPENAI_API_KEY").unwrap_or_else(|_| "OPENAI_API_KEY".to_string());
    let base_url = std::env::var("OPENAI_API_URL").ok();
    let mcp_url = std::env::var("MCP_URL").unwrap_or("http://127.0.0.1:3000".to_string());  // 默认MCP服务器地址
    
    // 创建OpenAI模型实例 - 支持Openai兼容 API
    let model = OpenAIChatModel::new(api_key.clone(), base_url)
        .with_model(std::env::var("OPENAI_API_MODEL").unwrap_or_else(|_| "gpt-3.5-turbo".to_string()))
        .with_temperature(0.7)
        .with_max_tokens(8*1024);
    
    // 初始化MCP客户端
    let mut mcp_client = SimpleMcpClient::new(mcp_url.clone());
    
    // 清空默认工具（可选）
    mcp_client.clear_tools();
    
    // 添加本地自定义工具定义
    mcp_client.add_tools(vec![
        McpTool {
            name: "get_local_time".to_string(),
            description: "Get the current local time and date. For example: 'What time is it?'".to_string(),
        },
    ]);
    
    // 注册本地工具处理器
    mcp_client.register_tool_handler("get_local_time".to_string(), |_params: HashMap<String, Value>| async move {
        let now = chrono::Local::now();
        Ok(json!({
            "current_time": now.format("%Y-%m-%d %H:%M:%S").to_string(),
            "timezone": "Local"
        }))
    });
    
    // 不注册calculate_expression的本地处理器，让其使用服务端工具
    info!("Using local 'get_local_time' tool and server-side calculation tools...");
    
    // 尝试连接到 MCP 服务器
    match mcp_client.connect(&mcp_url).await {
        Ok(_) => {
            info!("Successfully connected to MCP server at {}", mcp_url);
        },
        Err(e) => {
            error!("Failed to connect to MCP server: {}", e);
        }
    }

    info!("Using model: {}", model.model_name().map_or("Model not specified", |v| v));
    info!("----------------------------------------");
    
    let client_arc: Arc<dyn McpClient> = Arc::new(mcp_client);
    
    // 创建记忆模块实例
    let memory = SimpleMemory::new();

    // 创建Agent实例
    let mut agent = McpAgent::with_openai_model_and_memory(
        client_arc.clone(),
        "You are an AI assistant that can use both local tools and remote MCP server tools. Please decide whether to use tools based on the user's needs.".to_string(),
        model.clone(),
        Box::new(memory.clone())
    );
    
    // 自动从MCP客户端获取工具并添加到Agent
    // 这会同时添加MCP服务器工具和本地工具
    if let Err(e) = agent.auto_add_tools().await {
        error!("Warning: Failed to auto add tools to McpAgent: {}", e);
    }
    
    println!("基于MCP的混合模式AI Agent聊天机器人已启动！");
    println!("输入'退出'结束对话");
    println!("----------------------------------------");
    
    // 显示可用工具
    println!("Available tools:");
    let tools = agent.tools();
    if tools.is_empty() {
        println!("No tools available");
    } else {
        for (index, tool) in tools.iter().enumerate() {
            println!("{}. {}: {}", index + 1, tool.name(), tool.description());
        }
    }
    println!("----------------------------------------");
    
    // 示例对话
    println!("示例对话:");
    let examples = vec![
        "What time is it?",
        "What is 15.5 plus 24.3?",
    ];
    
    for example in examples {
        println!("你: {}", example);
        
        // 创建输入上下文
        let mut inputs = HashMap::new();
        inputs.insert("input".to_string(), serde_json::Value::String(example.to_string()));
        
        // 运行Agent
        match run_agent(&agent, example.to_string()).await {
            Ok(response) => {
                // 尝试解析response为JSON并提取content字段
                if let Ok(json_value) = serde_json::from_str::<serde_json::Value>(&response) {
                    if let Some(content) = json_value.get("content").and_then(|v| v.as_str()) {
                        println!("助手: {}", content);
                    } else {
                        println!("助手: {}", response);
                    }
                } else {
                    println!("助手: {}", response);
                }
            },
            Err(e) => {
                println!("助手: 抱歉，处理您的请求时出现错误: {}", e);
            },
        }
        
        info!("----------------------------------------");
    }
    
    // 交互式对话循环
    println!("现在开始交互式对话（输入'退出'结束对话）:");
    loop {
        let mut user_input = String::new();
        println!("你: ");
        std::io::stdin().read_line(&mut user_input).expect("读取输入失败");
        let user_input = user_input.trim();
        
        if user_input.to_lowercase() == "退出" || user_input.to_lowercase() == "exit" {
            println!("再见！");
            break;
        }
        
        if user_input.is_empty() {
            continue;
        }
        
        // 运行Agent
        match run_agent(&agent, user_input.to_string()).await {
            Ok(response) => {
                // 尝试解析response为JSON并提取content字段
                if let Ok(json_value) = serde_json::from_str::<serde_json::Value>(&response) {
                    if let Some(content) = json_value.get("content").and_then(|v| v.as_str()) {
                        println!("助手: {}", content);
                    } else {
                        println!("助手: {}", response);
                    }
                } else {
                    println!("助手: {}", response);
                }
            },
            Err(e) => {
                println!("助手: 抱歉，处理您的请求时出现错误: {}", e);
            },
        }
        
        info!("----------------------------------------");
    }
    
    // 打印对话历史
    info!("对话历史:");
    match memory.load_memory_variables(&HashMap::new()).await {
        Ok(memories) => {
            if let Some(chat_history) = memories.get("chat_history") {
                if let serde_json::Value::Array(messages) = chat_history {
                    for (i, message) in messages.iter().enumerate() {
                        if let serde_json::Value::Object(msg) = message {
                            let role = msg.get("role").and_then(|v| v.as_str()).unwrap_or("unknown");
                            let content = msg.get("content").and_then(|v| v.as_str()).unwrap_or("");
                            info!("{}. {}: {}", i + 1, role, content);
                        }
                    }
                }
            }
        },
        Err(e) => {
            info!("Failed to load memory variables: {}", e);
        }
    }
    
    // 断开MCP连接
    if let Err(e) = client_arc.disconnect().await {
        error!("Failed to disconnect MCP client: {}", e);
    }
}