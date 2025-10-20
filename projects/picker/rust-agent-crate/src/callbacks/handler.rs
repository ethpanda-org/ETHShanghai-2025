// 回调处理器接口定义
use crate::agents::{AgentAction, AgentFinish};

// 最小化回调系统（与langchain-core对齐）
pub trait CallbackHandler: Send + Sync {
    // LLM相关回调（核心）
    fn on_llm_start(&self, _model_name: &str, _prompts: &[String]) {}
    
    fn on_llm_new_token(&self, _token: &str) {}
    
    fn on_llm_end(&self, _model_name: &str) {}
    
    fn on_llm_error(&self, _model_name: &str, _error: &str) {}
    
    // 工具相关回调（核心）
    fn on_tool_start(&self, _tool_name: &str, _input: &str) {}
    
    fn on_tool_end(&self, _tool_name: &str, _output: &str) {}
    
    fn on_tool_error(&self, _tool_name: &str, _error: &str) {}
    
    // 链相关回调（核心）
    fn on_chain_start(&self, _chain_name: &str) {}
    
    fn on_chain_end(&self, _chain_name: &str) {}
    
    fn on_chain_error(&self, _chain_name: &str, _error: &str) {}
    
    // Agent相关回调
    fn on_agent_action(&self, _action: &AgentAction) {}
    
    fn on_agent_finish(&self, _finish: &AgentFinish) {}
}