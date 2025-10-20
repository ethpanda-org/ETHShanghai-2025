# Rust Agent: Next Generation AI Agent Framework for Web3

Rust Agent is a powerful and flexible AI Agent framework built with Rust, designed to be aligned with LangChain-Core. It provides a comprehensive set of tools and components for building sophisticated AI agents that can interact with various systems and perform complex tasks.

## Features

- **Modular Architecture**: Clean separation of concerns with well-defined modules for agents, tools, memory, models, and more.
- **MCP Integration**: Built-in support for Model Context Protocol (MCP) client and server implementations.
- **Flexible Tool System**: Extensible tool interface with support for custom implementations and MCP tool adapters.
- **Multiple Model Support**: Integration with various AI models, including OpenAI-compatible APIs.
- **Memory Management**: Built-in memory components for maintaining context across interactions.
- **Asynchronous Design**: Fully async architecture leveraging Tokio for high-performance operations.
- **Error Handling**: Comprehensive error handling using the anyhow crate.

## Architecture Overview

The framework is organized into several key modules:

### 1. Core Layer (Core)
Defines the fundamental `Runnable` trait and related components that form the basis of all executable components in the framework.

### 2. Model Layer (Models)
Provides interfaces and implementations for various AI models:
- `ChatModel`: Interface for chat-based models
- `OpenAIChatModel`: Implementation for OpenAI-compatible APIs

### 3. Agent Layer (Agents)
Implements the core agent logic with the `Agent` interface and `AgentRunner` interface:
- `McpAgent`: Main agent implementation with MCP service integration
- `SimpleAgent`: Basic agent implementation for simpler use cases

### 4. Tool Layer (Tools)
Defines the tool interface and implementation mechanisms:
- `Tool`: Core tool interface
- `Toolkit`: Interface for managing groups of related tools
- `ExampleTool`: Sample tool implementation for demonstration

### 5. MCP Integration Layer (MCP)
Provides components for interacting with MCP services:
- `McpClient`: Interface for MCP client implementations
- `SimpleMcpClient`: Basic MCP client implementation
- `McpServer`: Interface for MCP server implementations
- `SimpleMcpServer`: Basic MCP server implementation
- `McpToolAdapter`: Adapter to integrate MCP tools with the framework's tool system

## Installation

Add this to your `Cargo.toml`:

```toml
[dependencies]
rust-agent = "0.0.5"
```

## Quick Start

Here's a simple example of how to use the framework to create an AI agent:

```rust
use rust_agent::{McpAgent, SimpleMcpClient, McpTool, ChatMessage, ChatMessageContent, AgentOutput};
use std::sync::Arc;
use std::collections::HashMap;

// Create MCP client
let mut mcp_client = SimpleMcpClient::new("http://localhost:8080".to_string());

// Add some MCP tools
mcp_client.add_tools(vec![
    McpTool {
        name: "get_weather".to_string(),
        description: "Get weather information for a specified city".to_string(),
    }
]);

// Wrap MCP client as Arc
let mcp_client_arc = Arc::new(mcp_client);

// Create McpAgent instance
let mut agent = McpAgent::new(
    mcp_client_arc.clone(),
    "You are a helpful assistant".to_string()
);

// Auto-add tools from MCP client
if let Err(e) = agent.auto_add_tools().await {
    println!("Failed to auto-add tools to McpAgent: {}", e);
}

// Build user input
let mut input = HashMap::new();
input.insert("input".to_string(), "What's the weather like in Beijing?".to_string());

// Call agent to process input
let result = agent.invoke(input).await;

// Process result
match result {
    Ok(AgentOutput::Finish(finish)) => {
        if let Some(answer) = finish.return_values.get("answer") {
            println!("AI Response: {}", answer);
        }
    },
    Ok(AgentOutput::Action(action)) => {
        println!("Need to call tool: {}", action.tool);
        // Execute tool call...
        if let Some(thought) = &action.thought {
            println!("Thought: {}", thought);
        }
    },
    Err(e) => {
        println!("Error occurred: {}", e);
    }
}
```

## MCP Server Implementation

The framework now includes a built-in MCP server implementation:

```rust
use rust_agent::{SimpleMcpServer, McpServer, ExampleTool};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Create MCP server instance
    let server = SimpleMcpServer::new().with_address("127.0.0.1:3000".to_string());
    
    // Create example tools
    let weather_tool = ExampleTool::new(
        "get_weather".to_string(),
        "Get weather information for a specified city".to_string()
    );
    
    let calculator_tool = ExampleTool::new(
        "calculate".to_string(),
        "Perform simple mathematical calculations".to_string()
    );
    
    // Register tools with the server
    server.register_tool(Box::new(weather_tool))?;
    server.register_tool(Box::new(calculator_tool))?;
    
    // Start the server
    server.start("127.0.0.1:3000").await?;
    
    println!("MCP server started at 127.0.0.1:3000");
    println!("Registered tools: get_weather, calculate");
    
    // Simulate server running for a while
    tokio::time::sleep(tokio::time::Duration::from_secs(10)).await;
    
    // Stop the server
    server.stop().await?;
    println!("MCP server stopped");
    
    Ok(())
}
```

### MCP Server API

The MCP server implementation provides the following core functionality:

1. **Server Management**:
   - `start()`: Start the MCP server on a specified address
   - `stop()`: Stop the running MCP server
   - `with_address()`: Configure the server address

2. **Tool Registration**:
   - `register_tool()`: Register a tool with the server for use by MCP clients

3. **Implementation Details**:
   - The server uses a simple in-memory store for registered tools
   - Thread-safe implementation using Arc and Mutex for concurrent access
   - Built on top of the standard `Tool` trait for maximum flexibility

### Creating Custom Tools

To create custom tools for use with the MCP server, you need to implement the `Tool` trait:

```rust
use rust_agent::Tool;
use anyhow::Error;
use std::pin::Pin;

pub struct CustomTool {
    name: String,
    description: String,
}

impl CustomTool {
    pub fn new(name: String, description: String) -> Self {
        Self { name, description }
    }
}

impl Tool for CustomTool {
    fn name(&self) -> &str {
        &self.name
    }
    
    fn description(&self) -> &str {
        &self.description
    }
    
    fn invoke(&self, input: &str) -> Pin<Box<dyn std::future::Future<Output = Result<String, Error>> + Send + '_>> {
        let input_str = input.to_string();
        let name = self.name.clone();
        
        Box::pin(async move {
            // Your custom tool logic here
            Ok(format!("Custom tool {} processed: {}", name, input_str))
        })
    }
    
    fn as_any(&self) -> &dyn std::any::Any {
        self
    }
}
```

## Examples

The project provides several examples demonstrating how to use the framework to build different types of AI agents. Examples are located in the `examples/` directory.

- `agent_example.rs`: Basic agent usage example
- `mcp_agent_client_chatbot.rs`: MCP client chatbot example (uses server-side tools only)
- `mcp_agent_hybrid_chatbot.rs`: Hybrid mode MCP agent example (local get_local_time tool + server-side tools)
- `mcp_agent_local_chatbot.rs`: Local MCP agent chatbot example (uses local tools only)
- `mcp_server_complete_example.rs`: Complete MCP server example with real tool implementations (provides get_weather and simple_calculate tools)

### 1. Basic Agent Example (`agent_example.rs`)

Shows how to create a simple agent with custom tools:

```bash
# Run the example
cargo run --example agent_example
```

### 2. MCP Agent Client Chatbot (`mcp_agent_client_chatbot.rs`)

Demonstrates how to use `McpAgent` to build a simple chatbot that connects to an MCP server and uses server-side tools only. This example shows a pure client implementation that relies entirely on remote tools:

- No local tools are implemented
- All tools are provided by the MCP server (e.g., `get_weather`, `simple_calculate`)

```bash
# Run the example
cargo run --example mcp_agent_client_chatbot
```

### 3. Hybrid Mode MCP Agent Chatbot (`mcp_agent_hybrid_chatbot.rs`)

Demonstrates how to use `McpAgent` in hybrid mode, combining local tools (like get_local_time) with server-side tools. This example shows how an agent can use both local and remote tools based on the task requirements:

- Local tool: `get_local_time` - Gets the current local time and date
- Remote tools: All tools provided by the MCP server (e.g., `get_weather`, `simple_calculate`)

```bash
# Run the example
cargo run --example mcp_agent_hybrid_chatbot
```

### 4. Local MCP Agent Chatbot (`mcp_agent_local_chatbot.rs`)

Demonstrates how to use `McpAgent` with local tools only. This example shows how an agent can function without connecting to any remote MCP server, using only locally implemented tools:

- Local tools: 
  - `get_weather` - Gets weather information for a specified city
  - `simple_calculate` - Performs simple mathematical calculations

```bash
# Run the example
cargo run --example mcp_agent_local_chatbot
```

### 5. Complete MCP Server (`mcp_server_complete_example.rs`)

A more complete example showing how to implement custom tools with actual functionality such as get_weather and simple_calculate:

```bash
# Run the example
cargo run --example mcp_server_complete_example
```

## Running Tests

The project includes unit tests to verify the functionality of the framework:

```bash
# Run all tests
cargo test
```

## Building the Project

To build the project, simply run:

```bash
# Build the project
cargo build
```

The project builds successfully with only warnings about unused fields in some structs, which don't affect functionality.

## Project Demo

The project includes demonstration scripts to showcase all functionality:

### Bash Script (Linux/macOS)
```bash
# Run the demo script
./demo.sh
```

### PowerShell Script (Windows)
```powershell
# Run the demo script
.\demo.ps1
```

These scripts will run all tests and examples to demonstrate the capabilities of the Rust Agent framework.

## Configuration and Environment Variables

When using the framework, you may need to configure the following environment variables:

- `OPENAI_API_KEY`: OpenAI API key
- `OPENAI_API_URL`: OpenAI API base URL (optional, defaults to official OpenAI API)

## Notes

- The framework uses asynchronous programming model, requiring Tokio runtime
- Tool invocation requires implementing the `Tool` interface or using the `McpToolAdapter`
- The current version may have some unimplemented features or simplified implementations, please note when using

## Development and Contribution

If you'd like to contribute to the project, please follow these steps:

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

[GPL-3.0](LICENSE)