// MCP 客户端调用服务端工具的端到端示例
// 此示例演示了如何使用 MCP 客户端连接到 MCP 服务器并调用其注册的工具

use rust_agent::{run_agent, OpenAIChatModel, McpClient, SimpleMcpClient, McpTool, McpAgent, SimpleMemory, BaseMemory};
use std::sync::Arc;
use std::collections::HashMap;
use serde_json::{Value, json};

// 初始化日志记录器
use log::LevelFilter;
use env_logger;
use log::{info, error};

#[tokio::main]
async fn main() {
    // 初始化日志记录器
    env_logger::Builder::new()
        .filter_level(LevelFilter::Info)
        .init();
    
    info!("=== Rust Agent MCP 客户端调用服务端工具示例 ===");
    
    // 从环境变量获取 MCP 服务器 URL
    let mcp_url = std::env::var("MCP_URL").unwrap_or("http://127.0.0.1:3000".to_string());
    
    // 创建 OpenAI 模型实例（可选，用于智能决策是否调用工具）
    // 如果没有设置 API 密钥，则使用一个占位符
    let api_key = std::env::var("OPENAI_API_KEY").unwrap_or_else(|_| "sk-00000".to_string());
    let base_url = std::env::var("OPENAI_API_URL").unwrap_or("https://api.deepseek.com/v1".to_string());
    let model = OpenAIChatModel::new(api_key.clone(), Some(base_url))
        .with_model(std::env::var("OPENAI_API_MODEL").unwrap_or_else(|_| "deepseek-chat".to_string()))
        .with_temperature(0.7)
        .with_max_tokens(8*1024);
    
    // 初始化 MCP 客户端
    let mut mcp_client = SimpleMcpClient::new(mcp_url.clone());
    
    // 清空默认工具（可选）
    mcp_client.clear_tools();
    
    // 不添加任何本地工具，完全依赖服务端工具
    info!("Not adding any local tools, will use server-side tools only...");
    
    // 注意：客户端不需要实现工具处理器，因为工具实际在服务端执行
    // 客户端只需要知道工具的名称和描述即可
    
    // 连接到 MCP 服务器
    info!("正在连接到 MCP 服务器: {}", mcp_url);
    if let Err(e) = mcp_client.connect(&mcp_url).await {
        error!("连接到 MCP 服务器失败: {}", e);
        return;
    }
    info!("成功连接到 MCP 服务器");
    
    let model_name = model.model_name().map_or("未指定模型".to_string(), |v| v.to_string());
    
    info!("----------------------------------------");
    
    let client_arc: Arc<dyn McpClient> = Arc::new(mcp_client);
    
    // 创建记忆模块实例
    let memory = SimpleMemory::new();

    // 创建 Agent 实例
    let mut agent = McpAgent::with_openai_model_and_memory(
        client_arc.clone(),
        "You are an AI assistant that can use tools to answer user questions. Please decide whether to use tools based on the user's needs.".to_string(),
        model.clone(),
        Box::new(memory.clone())
    );
    
    // 自动从 MCP 客户端获取工具并添加到 Agent
    if let Err(e) = agent.auto_add_tools().await {
        error!("自动添加工具到 Agent 失败: {}", e);
        return;
    }
    
    println!("MCP 客户端 Agent 已启动！");
    println!("输入'退出'结束对话");
    println!("----------------------------------------");
    
    // 获取并显示可用工具
    let tools = client_arc.get_tools().await.unwrap_or_else(|e| {
        error!("获取工具列表失败: {}", e);
        vec![]
    });
    
    println!("可用工具:");
    for (index, tool) in tools.iter().enumerate() {
        println!("{}. {}: {}", index + 1, tool.name, tool.description);
    }
    
    println!("----------------------------------------");
    
    // 演示直接调用工具
    println!("演示直接调用工具:");
    
    // 调用天气工具
    println!("\n1. 调用天气工具获取北京天气: What's the weather like in Beijing?");
    let mut weather_params = HashMap::new();
    weather_params.insert("city".to_string(), Value::String("Beijing".to_string()));
    
    match client_arc.call_tool("get_weather", weather_params).await {
        Ok(result) => {
            println!("天气查询结果: {}", serde_json::to_string_pretty(&result).unwrap_or_else(|_| "无法格式化结果".to_string()));
        },
        Err(e) => {
            println!("调用天气工具失败: {}", e);
        }
    }
    
    // 调用计算工具
    println!("\n2. 调用计算工具计算: 'What is 15.5 plus 24.3?'");
    let calc_params = json!({
        "expression": "15.5 + 24.3"
    });
    let calc_params_map: HashMap<String, Value> = serde_json::from_value(calc_params).unwrap();
    
    match client_arc.call_tool("simple_calculate", calc_params_map).await {
        Ok(result) => {
            println!("计算结果: {}", serde_json::to_string_pretty(&result).unwrap_or_else(|_| "无法格式化结果".to_string()));
        },
        Err(e) => {
            println!("调用计算工具失败: {}", e);
        }
    }
    
    println!("----------------------------------------");
    
    // 交互式对话循环
    println!("现在进入交互模式，您可以询问天气或数学计算问题:");
    loop {
        println!("\n您: ");
        let mut user_input = String::new();
        std::io::stdin().read_line(&mut user_input).expect("读取输入失败");
        let user_input = user_input.trim();
        
        if user_input.to_lowercase() == "退出" || user_input.to_lowercase() == "exit" {
            println!("再见！");
            break;
        }
        
        if user_input.is_empty() {
            continue;
        }
        
        // 运行 Agent
        match run_agent(&agent, user_input.to_string()).await {
            Ok(response) => {
                // 尝试解析 response 为 JSON 并提取 content 字段
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
    }
    
    // 打印对话历史
    info!("\n对话历史:");
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
            error!("加载记忆变量失败: {}", e);
        }
    }
    
    // 断开 MCP 连接
    if let Err(e) = client_arc.disconnect().await {
        error!("断开 MCP 客户端连接失败: {}", e);
    }
    
    info!("\nMCP 客户端示例结束");
}