// Agent使用示例
use rust_agent::{ExampleTool, SimpleAgent, SimpleAgentRunner, AgentOutput, Runnable};
use std::collections::HashMap;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("=== Rust Agent v0.0.1 - Agent使用示例 ===");
    
    // 创建一个简单的Agent
    let mut agent = SimpleAgent::new();
    
    // 添加一些示例工具
    let weather_tool = Box::new(ExampleTool::new(
        "get_weather".to_string(),
        "获取指定城市的天气信息".to_string(),
    ));
    
    agent.add_tool(weather_tool);
    
    // 创建Agent运行器
    let agent_runner = SimpleAgentRunner::new(agent);
    
    // 测试调用工具
    println!("\n1. 测试调用工具:");
    test_tool_invocation(&agent_runner).await?;
    
    // 测试直接完成
    println!("\n2. 测试直接完成:");
    test_direct_completion(&agent_runner).await?;
    
    println!("\n示例完成！");
    Ok(())
}

/// 测试工具调用功能
async fn test_tool_invocation(agent_runner: &SimpleAgentRunner) -> Result<(), Box<dyn std::error::Error>> {
    let mut tool_inputs = HashMap::new();
    tool_inputs.insert("tool".to_string(), "get_weather".to_string());
    tool_inputs.insert("input".to_string(), "北京".to_string());
    
    match agent_runner.invoke(tool_inputs).await {
        Ok(output) => match output {
            AgentOutput::Action(action) => {
                println!("思考过程: {}", action.thought.unwrap_or("无".to_string()));
                println!("工具: {}", action.tool);
                println!("输入: {}", action.tool_input);
                println!("日志: {}", action.log);
            },
            AgentOutput::Finish(finish) => {
                println!("完成结果: {:?}", finish.return_values);
            }
        },
        Err(e) => println!("错误: {}", e),
    }
    
    Ok(())
}

/// 测试直接完成功能
async fn test_direct_completion(agent_runner: &SimpleAgentRunner) -> Result<(), Box<dyn std::error::Error>> {
    let mut finish_inputs = HashMap::new();
    finish_inputs.insert("input".to_string(), "北京的天气如何".to_string());
    
    match agent_runner.invoke(finish_inputs).await {
        Ok(output) => match output {
            AgentOutput::Action(action) => {
                println!("思考过程: {}", action.thought.unwrap_or("无".to_string()));
                println!("工具: {}", action.tool);
                println!("输入: {}", action.tool_input);
                println!("日志: {}", action.log);
            },
            AgentOutput::Finish(finish) => {
                println!("完成结果: {:?}", finish.return_values);
            }
        },
        Err(e) => println!("错误: {}", e),
    }
    
    Ok(())
}