//! 故障转移管理器

use crate::config::FailoverConfig;
use crate::error::AiContractError;
use std::time::Duration;

/// 故障转移管理器
pub struct FailoverManager {
    config: FailoverConfig,
}

impl FailoverManager {
    /// 创建新的故障转移管理器
    pub fn new(config: FailoverConfig) -> Self {
        Self { config }
    }
    
    /// 判断是否应该进行故障转移
    pub fn should_failover(&self, error: &AiContractError) -> bool {
        if !self.config.auto_failover {
            return false;
        }
        
        // 检查错误是否可重试
        error.is_retryable()
    }
    
    /// 获取最大重试次数
    pub fn max_retries(&self) -> usize {
        self.config.max_retries as usize
    }
    
    /// 获取重试延迟
    pub fn retry_delay(&self) -> Duration {
        Duration::from_secs(self.config.retry_interval)
    }
    
    /// 获取超时时间
    pub fn timeout(&self) -> Duration {
        Duration::from_secs(self.config.timeout)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_failover_manager() {
        let config = FailoverConfig {
            max_retries: 3,
            retry_interval: 5,
            timeout: 30,
            auto_failover: true,
        };
        
        let manager = FailoverManager::new(config);
        
        // 测试可重试的错误
        let retryable_error = AiContractError::llm_provider_error("网络错误");
        assert!(manager.should_failover(&retryable_error));
        
        // 测试不可重试的错误
        let non_retryable_error = AiContractError::config_error("配置错误");
        assert!(!manager.should_failover(&non_retryable_error));
        
        assert_eq!(manager.max_retries(), 3);
        assert_eq!(manager.retry_delay(), Duration::from_secs(5));
        assert_eq!(manager.timeout(), Duration::from_secs(30));
    }
}