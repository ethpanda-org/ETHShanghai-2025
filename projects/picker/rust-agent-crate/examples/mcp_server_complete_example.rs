// 完整的MCP服务器示例，展示实际工具的实现
use rust_agent::{McpServer, Tool};
use std::sync::Arc;
use anyhow::Error;
use std::pin::Pin;

// 天气工具实现
pub struct WeatherTool {
    name: String,
    description: String,
}

impl WeatherTool {
    pub fn new() -> Self {
        Self {
            name: "get_weather".to_string(),
            description: "Get the weather information for a specified city. For example: 'What's the weather like in Beijing?'".to_string(),
        }
    }
}

impl Tool for WeatherTool {
    fn name(&self) -> &str {
        &self.name
    }
    
    fn description(&self) -> &str {
        &self.description
    }
    
    fn invoke(&self, input: &str) -> Pin<Box<dyn std::future::Future<Output = Result<String, Error>> + Send + '_>> {
        // 解析输入参数，客户端可能发送JSON格式的参数
        let city = match serde_json::from_str::<serde_json::Value>(input) {
            Ok(json_value) => {
                // 如果输入是JSON格式，尝试提取city字段
                if let Some(city_value) = json_value.get("city") {
                    city_value.as_str().unwrap_or(input).to_string()
                } else {
                    // 如果没有city字段，使用整个输入作为城市名
                    input.to_string()
                }
            },
            Err(_) => {
                // 如果不是JSON格式，直接使用输入作为城市名
                input.to_string()
            }
        };
        
        Box::pin(async move {
            // 模拟天气API调用
            let weather_data = match city.to_lowercase().as_str() {
                "beijing" => "Sunny, 25°C",
                "shanghai" => "Cloudy, 22°C",
                "guangzhou" => "Rainy, 28°C",
                _ => "Weather data not available",
            };
            
            Ok(format!("Weather in {}: {}", city, weather_data))
        })
    }
    
    fn as_any(&self) -> &dyn std::any::Any {
        self
    }
}

// 计算工具实现
pub struct CalculatorTool {
    name: String,
    description: String,
}

impl CalculatorTool {
    pub fn new() -> Self {
        Self {
            name: "simple_calculate".to_string(),
            description: "Perform simple mathematical calculations. Input should be a mathematical expression with numbers and operators (+, -, *, /). For example: '15.5 + 24.3'".to_string(),
        }
    }
}

impl Tool for CalculatorTool {
    fn name(&self) -> &str {
        &self.name
    }
    
    fn description(&self) -> &str {
        &self.description
    }
    
    fn invoke(&self, input: &str) -> Pin<Box<dyn std::future::Future<Output = Result<String, Error>> + Send + '_>> {
        // 解析输入参数，客户端可能发送不同格式的参数
        let expression = match serde_json::from_str::<serde_json::Value>(input) {
            Ok(json_value) => {
                // 如果输入是JSON格式，尝试提取expression字段
                if let Some(expr_value) = json_value.get("expression") {
                    expr_value.as_str().unwrap_or(input).to_string()
                } else {
                    // 如果没有expression字段，尝试将整个输入作为表达式处理
                    input.to_string()
                }
            },
            Err(_) => {
                // 如果不是有效的JSON，将整个输入作为表达式处理
                input.to_string()
            }
        };
        
        Box::pin(async move {
            // 参考本地工具实现，创建一个更健壮的解析器
            let expression = expression.replace(" ", "");
            
            // 尝试匹配不同的运算符
            for op_char in ["+", "-", "*", "/"].iter() {
                // 使用find方法而不是contains，这样可以获取操作符的位置
                if let Some(pos) = expression.find(op_char) {
                    // 特殊处理减号：确保不是在开头作为负号使用
                    if *op_char == "-" && pos == 0 {
                        // 检查是否还有其他减号
                        if let Some(next_pos) = expression[1..].find("-") {
                            // 有另一个减号，这是减法运算
                            let actual_pos = next_pos + 1;
                            let left_str = &expression[0..actual_pos];
                            let right_str = &expression[actual_pos + 1..];
                            
                            if let (Ok(left), Ok(right)) = (left_str.parse::<f64>(), right_str.parse::<f64>()) {
                                let result = left - right;
                                return Ok(format!("Result: {} (from {} - {})", result, left, right));
                            } else {
                                return Ok(format!("Calculation error: Invalid numbers for subtraction"));
                            }
                        } else {
                            // 只有一个减号且在开头，这是一个负数
                            if let Ok(num) = expression.parse::<f64>() {
                                return Ok(format!("Result: {}", num));
                            } else {
                                return Ok(format!("Calculation error: Invalid number"));
                            }
                        }
                    }
                    
                    // 提取左右操作数
                    let left_str = &expression[0..pos];
                    let right_str = &expression[pos + 1..];
                    
                    // 转换为浮点数
                    let left_result = left_str.parse::<f64>();
                    let right_result = right_str.parse::<f64>();
                    
                    match (left_result, right_result) {
                        (Ok(left), Ok(right)) => {
                            // 执行相应的运算
                            let result = match *op_char {
                                "+" => left + right,
                                "-" => left - right,
                                "*" => left * right,
                                "/" => {
                                    if right == 0.0 {
                                        return Ok(format!("Calculation error: Division by zero"));
                                    }
                                    left / right
                                },
                                _ => unreachable!()
                            };
                            return Ok(format!("Result: {} (from {} {} {})", result, left, op_char, right));
                        },
                        _ => {
                            // 解析失败，继续尝试其他操作符
                            continue;
                        }
                    }
                }
            }
            
            // 如果没有找到运算符，尝试将整个表达式解析为数字
            if let Ok(number) = expression.parse::<f64>() {
                return Ok(format!("Result: {}", number));
            }
            
            // 如果所有尝试都失败了，返回错误
            Ok(format!("Calculation error: Failed to parse expression: {}", expression))
        })
    }
    
    fn as_any(&self) -> &dyn std::any::Any {
        self
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("=== Rust Agent Complete MCP Server Example ===");
    
    // 创建MCP服务器实例
    let server = rust_agent::SimpleMcpServer::new().with_address("127.0.0.1:3000".to_string());
    
    // 创建实际的工具实现
    let weather_tool = WeatherTool::new();
    let calculator_tool = CalculatorTool::new();
    
    // 注册工具
    server.register_tool(Arc::new(weather_tool))?;
    server.register_tool(Arc::new(calculator_tool))?;
    
    // 启动服务器
    server.start("127.0.0.1:3000").await?;
    
    println!("MCP服务器已启动，地址: 127.0.0.1:3000");
    println!("已注册工具:");
    println!("  1. get_weather: Get the weather information for a specified city. For example: 'What's the weather like in Beijing?'");
    println!("  2. simple_calculate: Perform simple mathematical calculations. Input should be a mathematical expression with numbers and operators (+, -, *, /). For example: '15.5 + 24.3'");
    println!("服务器正在运行中，按 Ctrl+C 停止服务器");
    
    // 保持服务器持续运行
    // tokio::time::sleep(tokio::time::Duration::from_secs(30)).await;
    // 这里我们使用 tokio::signal 来等待 Ctrl+C 信号
    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .unwrap()
            .recv()
            .await;
    };
    
    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();
    
    tokio::select! {
        _ = tokio::signal::ctrl_c() => {
            println!("收到 Ctrl+C 信号，正在停止服务器...");
        },
        _ = terminate => {
            println!("收到终止信号，正在停止服务器...");
        },
    }
    
    // 停止服务器
    // server.stop().await?;
    println!("MCP服务器已停止");
    
    Ok(())
}