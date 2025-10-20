// 提示模板实现
use anyhow::Error;
use std::collections::HashMap;

// 提示模板接口
pub trait PromptTemplate: Send + Sync {
    // 获取模板输入变量名
    fn input_variables(&self) -> Vec<String> {
        unimplemented!();
    }
    
    // 格式化模板
    fn format(&self, inputs: HashMap<String, String>) -> Result<String, Error> {
        let _inputs = inputs;
        unimplemented!();
    }
}