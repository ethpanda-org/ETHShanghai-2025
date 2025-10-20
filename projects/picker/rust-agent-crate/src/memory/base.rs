// 基础记忆接口定义
use anyhow::Error;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use serde_json::Value;
use std::pin::Pin;
use std::future::Future;
use log::info;

// 最小化记忆抽象接口（与langchain-core对齐）
pub trait BaseMemory: Send + Sync {
    // 获取记忆变量名
    fn memory_variables(&self) -> Vec<String>;
    
    // 核心方法：加载记忆变量
    fn load_memory_variables(&self, inputs: &HashMap<String, Value>) -> Pin<Box<dyn Future<Output = Result<HashMap<String, Value>, Error>> + Send>>;
    
    // 核心方法：保存上下文
    fn save_context(&self, inputs: &HashMap<String, Value>, outputs: &HashMap<String, Value>) -> Pin<Box<dyn Future<Output = Result<(), Error>> + Send>>;
    
    // 可选方法：清除记忆
    fn clear(&self) -> Pin<Box<dyn Future<Output = Result<(), Error>> + Send>>;
    
    // 克隆方法
    fn clone_box(&self) -> Box<dyn BaseMemory>;
}

// 简单的内存实现，类似于Langchain的ConversationBufferMemory
#[derive(Debug)]
pub struct SimpleMemory {
    memories: Arc<RwLock<HashMap<String, Value>>>,
    memory_key: String,
}

impl Clone for SimpleMemory {
    fn clone(&self) -> Self {
        Self {
            memories: Arc::clone(&self.memories),
            memory_key: self.memory_key.clone(),
        }
    }
}

impl SimpleMemory {
    pub fn new() -> Self {
        Self {
            memories: Arc::new(RwLock::new(HashMap::new())),
            memory_key: "chat_history".to_string(),
        }
    }
    
    pub fn with_memory_key(memory_key: String) -> Self {
        Self {
            memories: Arc::new(RwLock::new(HashMap::new())),
            memory_key,
        }
    }
    
    pub fn with_memories(memories: HashMap<String, Value>) -> Self {
        Self {
            memories: Arc::new(RwLock::new(memories)),
            memory_key: "chat_history".to_string(),
        }
    }
    
    pub async fn add_message(&self, message: Value) -> Result<(), Error> {
        let mut memories = self.memories.write().await;
        let chat_history = memories.entry(self.memory_key.clone()).or_insert_with(|| Value::Array(vec![]));
        
        if let Value::Array(ref mut arr) = chat_history {
            arr.push(message);
        } else {
            *chat_history = Value::Array(vec![message]);
        }
        
        Ok(())
    }
    
    pub fn get_memory_key(&self) -> String {
        self.memory_key.clone()
    }
}

impl Default for SimpleMemory {
    fn default() -> Self {
        Self::new()
    }
}

impl BaseMemory for SimpleMemory {
    fn memory_variables(&self) -> Vec<String> {
        vec![self.memory_key.clone()]
    }
    
    fn load_memory_variables(&self, _inputs: &HashMap<String, Value>) -> Pin<Box<dyn Future<Output = Result<HashMap<String, Value>, Error>> + Send>> {
        let memories = Arc::clone(&self.memories);
        Box::pin(async move {
            let memories = memories.read().await;
            Ok(memories.clone())
        })
    }
    
    fn save_context(&self, inputs: &HashMap<String, Value>, outputs: &HashMap<String, Value>) -> Pin<Box<dyn Future<Output = Result<(), Error>> + Send>> {
        let memories = Arc::clone(&self.memories);
        let input_clone = inputs.clone();
        let output_clone = outputs.clone();
        let memory_key = self.memory_key.clone();
        
        Box::pin(async move {
            let mut memories = memories.write().await;
            
            // 获取或创建聊天历史数组
            let chat_history = memories.entry(memory_key.clone()).or_insert_with(|| Value::Array(vec![]));
            
            // 确保 chat_history 是数组类型
            if !chat_history.is_array() {
                *chat_history = Value::Array(vec![]);
            }
            
            // 将输入作为人类消息或工具消息添加到聊天历史
            if let Some(input_value) = input_clone.get("input") {
                let user_message = serde_json::json!({
                        "role": "human",
                        "content": input_value
                    });
                
                if let Value::Array(ref mut arr) = chat_history {
                    info!("添加到聊天历史: {:?}", user_message);
                    arr.push(user_message);
                }
            }
            
            // 将输出作为AI消息添加到聊天历史
            if let Some(output_value) = output_clone.get("output") {
                let ai_message = serde_json::json!({
                    "role": "ai",
                    "content": output_value
                });
                
                if let Value::Array(ref mut arr) = chat_history {
                    arr.push(ai_message);
                }
            }
            
            Ok(())
        })
    }
    
    fn clear(&self) -> Pin<Box<dyn Future<Output = Result<(), Error>> + Send>> {
        let memories = Arc::clone(&self.memories);
        Box::pin(async move {
            let mut memories = memories.write().await;
            memories.clear();
            Ok(())
        })
    }
    
    fn clone_box(&self) -> Box<dyn BaseMemory> {
        Box::new(self.clone())
    }
}

// 为 Box<dyn BaseMemory> 实现 Clone trait
impl Clone for Box<dyn BaseMemory> {
    fn clone(&self) -> Self {
        self.as_ref().clone_box()
    }
}