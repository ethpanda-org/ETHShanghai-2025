//! 供应商注册表和路由
//! 
//! 管理所有供应商实例，执行路由策略，处理健康检查和故障转移

use std::collections::HashMap;
use std::sync::Arc;
use std::sync::atomic::{AtomicUsize, Ordering};
use tokio::sync::RwLock;

use crate::api::{ApiResult, ApiError};
use super::{
    ProviderAdapter, ProviderConfig, ProviderType, 
    RoutingStrategy, MultiProviderConfig,
    OpenAIAdapter, AlibabaBailianAdapter,
};

/// 供应商健康状态
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HealthStatus {
    /// 健康
    Healthy,
    /// 不健康
    Unhealthy,
    /// 未知（尚未检查）
    Unknown,
}

/// 供应商实例
/// 
/// 包含适配器、配置和健康状态
struct ProviderInstance {
    /// 供应商类型
    provider_type: ProviderType,
    /// 适配器实例
    adapter: Arc<dyn ProviderAdapter>,
    /// 配置
    config: ProviderConfig,
    /// 健康状态
    health_status: HealthStatus,
    /// 连续失败次数
    consecutive_failures: u32,
}

/// 供应商注册表
/// 
/// 管理所有供应商实例，执行路由策略
pub struct ProviderRegistry {
    /// 供应商实例列表
    providers: Arc<RwLock<Vec<ProviderInstance>>>,
    /// 路由策略
    routing_strategy: RoutingStrategy,
    /// Round Robin 计数器
    round_robin_counter: AtomicUsize,
    /// 最大连续失败次数（超过此值标记为不健康）
    max_consecutive_failures: u32,
}

impl ProviderRegistry {
    /// 创建新的供应商注册表
    /// 
    /// # 参数
    /// 
    /// * `config` - 多供应商配置
    /// 
    /// # 返回
    /// 
    /// 返回初始化好的注册表
    /// 
    /// # 错误
    /// 
    /// 当配置无效或供应商初始化失败时返回错误
    pub fn new(config: MultiProviderConfig) -> ApiResult<Self> {
        // 验证配置
        config.validate()
            .map_err(|e| ApiError::invalid_request(format!("Invalid config: {}", e)))?;
        
        // 初始化供应商实例
        let mut providers = Vec::new();
        
        for provider_config in config.providers {
            if !provider_config.enabled {
                continue;
            }
            
            // 创建适配器实例
            let adapter: Arc<dyn ProviderAdapter> = match provider_config.provider_type {
                ProviderType::OpenAI => Arc::new(OpenAIAdapter::new()),
                ProviderType::AlibabaBailian => Arc::new(AlibabaBailianAdapter::new()),
                ProviderType::ZhipuGLM => {
                    // TODO: Task 6 - 实现智谱 GLM 适配器
                    return Err(ApiError::invalid_request(
                        "ZhipuGLM adapter not yet implemented"
                    ));
                }
                ProviderType::AnthropicClaude => {
                    // TODO: Task 8 - 实现 Anthropic Claude 适配器
                    return Err(ApiError::invalid_request(
                        "AnthropicClaude adapter not yet implemented"
                    ));
                }
            };
            
            providers.push(ProviderInstance {
                provider_type: provider_config.provider_type,
                adapter,
                config: provider_config,
                health_status: HealthStatus::Unknown,
                consecutive_failures: 0,
            });
        }
        
        if providers.is_empty() {
            return Err(ApiError::invalid_request("No enabled providers found"));
        }
        
        Ok(Self {
            providers: Arc::new(RwLock::new(providers)),
            routing_strategy: config.routing_strategy,
            round_robin_counter: AtomicUsize::new(0),
            max_consecutive_failures: 3,
        })
    }
    
    /// 选择供应商
    /// 
    /// 根据配置的路由策略选择一个健康的供应商
    /// 
    /// # 返回
    /// 
    /// 返回选中的供应商适配器和配置
    /// 
    /// # 错误
    /// 
    /// 当没有可用的健康供应商时返回错误
    pub async fn select_provider(&self) -> ApiResult<(Arc<dyn ProviderAdapter>, ProviderConfig)> {
        let providers = self.providers.read().await;
        
        // 过滤出健康的供应商
        let healthy_providers: Vec<_> = providers
            .iter()
            .filter(|p| p.health_status != HealthStatus::Unhealthy)
            .collect();
        
        if healthy_providers.is_empty() {
            return Err(ApiError::service_unavailable(
                "No healthy providers available"
            ));
        }
        
        // 根据路由策略选择供应商
        let selected = match self.routing_strategy {
            RoutingStrategy::Priority => self.select_by_priority(&healthy_providers)?,
            RoutingStrategy::RoundRobin => self.select_by_round_robin(&healthy_providers)?,
        };
        
        Ok((selected.adapter.clone(), selected.config.clone()))
    }
    
    /// 按优先级选择供应商
    /// 
    /// 选择优先级最高（priority 值最小）的供应商
    fn select_by_priority<'a>(
        &self,
        providers: &[&'a ProviderInstance],
    ) -> ApiResult<&'a ProviderInstance> {
        providers
            .iter()
            .min_by_key(|p| p.config.priority)
            .copied()
            .ok_or_else(|| ApiError::service_unavailable("No providers available"))
    }
    
    /// 按轮询选择供应商
    /// 
    /// 依次轮流选择供应商
    fn select_by_round_robin<'a>(
        &self,
        providers: &[&'a ProviderInstance],
    ) -> ApiResult<&'a ProviderInstance> {
        if providers.is_empty() {
            return Err(ApiError::service_unavailable("No providers available"));
        }
        
        let index = self.round_robin_counter.fetch_add(1, Ordering::Relaxed) % providers.len();
        Ok(providers[index])
    }
    
    /// 记录供应商成功
    /// 
    /// 重置失败计数，标记为健康
    /// 
    /// # 参数
    /// 
    /// * `provider_type` - 供应商类型
    pub async fn record_success(&self, provider_type: ProviderType) {
        let mut providers = self.providers.write().await;
        
        if let Some(provider) = providers.iter_mut().find(|p| p.provider_type == provider_type) {
            provider.health_status = HealthStatus::Healthy;
            provider.consecutive_failures = 0;
        }
    }
    
    /// 记录供应商失败
    /// 
    /// 增加失败计数，超过阈值后标记为不健康
    /// 
    /// # 参数
    /// 
    /// * `provider_type` - 供应商类型
    pub async fn record_failure(&self, provider_type: ProviderType) {
        let mut providers = self.providers.write().await;
        
        if let Some(provider) = providers.iter_mut().find(|p| p.provider_type == provider_type) {
            provider.consecutive_failures += 1;
            
            if provider.consecutive_failures >= self.max_consecutive_failures {
                provider.health_status = HealthStatus::Unhealthy;
                tracing::warn!(
                    "Provider {} marked as unhealthy after {} consecutive failures",
                    provider_type.name(),
                    provider.consecutive_failures
                );
            }
        }
    }
    
    /// 获取所有供应商的健康状态
    /// 
    /// # 返回
    /// 
    /// 返回供应商类型到健康状态的映射
    pub async fn get_health_status(&self) -> HashMap<ProviderType, HealthStatus> {
        let providers = self.providers.read().await;
        
        providers
            .iter()
            .map(|p| (p.provider_type, p.health_status))
            .collect()
    }
    
    /// 手动设置供应商健康状态
    /// 
    /// # 参数
    /// 
    /// * `provider_type` - 供应商类型
    /// * `status` - 健康状态
    pub async fn set_health_status(&self, provider_type: ProviderType, status: HealthStatus) {
        let mut providers = self.providers.write().await;
        
        if let Some(provider) = providers.iter_mut().find(|p| p.provider_type == provider_type) {
            provider.health_status = status;
            if status == HealthStatus::Healthy {
                provider.consecutive_failures = 0;
            }
        }
    }
    
    /// 获取启用的供应商数量
    pub async fn provider_count(&self) -> usize {
        let providers = self.providers.read().await;
        providers.len()
    }
    
    /// 获取健康的供应商数量
    pub async fn healthy_provider_count(&self) -> usize {
        let providers = self.providers.read().await;
        providers
            .iter()
            .filter(|p| p.health_status != HealthStatus::Unhealthy)
            .count()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    
    fn create_test_config(routing_strategy: RoutingStrategy) -> MultiProviderConfig {
        MultiProviderConfig {
            providers: vec![
                ProviderConfig {
                    provider_type: ProviderType::OpenAI,
                    enabled: true,
                    base_url: Some("https://api.openai.com/v1".to_string()),
                    api_key: "test-key-1".to_string(),
                    model_mapping: HashMap::new(),
                    timeout: 30,
                    priority: 1,
                    weight: 3,
                },
                ProviderConfig {
                    provider_type: ProviderType::AlibabaBailian,
                    enabled: true,
                    base_url: Some("https://dashscope.aliyuncs.com/compatible-mode/v1".to_string()),
                    api_key: "test-key-2".to_string(),
                    model_mapping: HashMap::new(),
                    timeout: 30,
                    priority: 2,
                    weight: 2,
                },
            ],
            routing_strategy,
        }
    }
    
    #[tokio::test]
    async fn test_registry_creation() {
        let config = create_test_config(RoutingStrategy::Priority);
        let registry = ProviderRegistry::new(config).unwrap();
        
        assert_eq!(registry.provider_count().await, 2);
        assert_eq!(registry.routing_strategy, RoutingStrategy::Priority);
    }
    
    #[tokio::test]
    async fn test_registry_empty_config() {
        let config = MultiProviderConfig {
            providers: vec![],
            routing_strategy: RoutingStrategy::Priority,
        };
        
        let result = ProviderRegistry::new(config);
        assert!(result.is_err());
    }
    
    #[tokio::test]
    async fn test_registry_all_disabled() {
        let config = MultiProviderConfig {
            providers: vec![
                ProviderConfig {
                    provider_type: ProviderType::OpenAI,
                    enabled: false,
                    base_url: Some("https://api.openai.com/v1".to_string()),
                    api_key: "test-key".to_string(),
                    model_mapping: HashMap::new(),
                    timeout: 30,
                    priority: 1,
                    weight: 1,
                },
            ],
            routing_strategy: RoutingStrategy::Priority,
        };
        
        let result = ProviderRegistry::new(config);
        assert!(result.is_err());
    }
    
    #[tokio::test]
    async fn test_select_provider_priority() {
        let config = create_test_config(RoutingStrategy::Priority);
        let registry = ProviderRegistry::new(config).unwrap();
        
        // 第一次选择应该返回优先级最高的（priority=1）
        let (adapter, config) = registry.select_provider().await.unwrap();
        assert_eq!(adapter.name(), "openai");
        assert_eq!(config.priority, 1);
        
        // 再次选择应该返回相同的供应商
        let (adapter, config) = registry.select_provider().await.unwrap();
        assert_eq!(adapter.name(), "openai");
        assert_eq!(config.priority, 1);
    }
    
    #[tokio::test]
    async fn test_select_provider_round_robin() {
        let config = create_test_config(RoutingStrategy::RoundRobin);
        let registry = ProviderRegistry::new(config).unwrap();
        
        // 第一次选择
        let (adapter1, _) = registry.select_provider().await.unwrap();
        
        // 第二次选择应该是不同的供应商
        let (adapter2, _) = registry.select_provider().await.unwrap();
        
        // 第三次选择应该回到第一个
        let (adapter3, _) = registry.select_provider().await.unwrap();
        
        // 验证轮询行为
        assert_ne!(adapter1.name(), adapter2.name());
        assert_eq!(adapter1.name(), adapter3.name());
    }
    
    #[tokio::test]
    async fn test_health_status_management() {
        let config = create_test_config(RoutingStrategy::Priority);
        let registry = ProviderRegistry::new(config).unwrap();
        
        // 初始状态应该是 Unknown
        let status = registry.get_health_status().await;
        assert_eq!(status.get(&ProviderType::OpenAI), Some(&HealthStatus::Unknown));
        
        // 记录成功
        registry.record_success(ProviderType::OpenAI).await;
        let status = registry.get_health_status().await;
        assert_eq!(status.get(&ProviderType::OpenAI), Some(&HealthStatus::Healthy));
        
        // 记录失败
        registry.record_failure(ProviderType::OpenAI).await;
        registry.record_failure(ProviderType::OpenAI).await;
        registry.record_failure(ProviderType::OpenAI).await;
        
        let status = registry.get_health_status().await;
        assert_eq!(status.get(&ProviderType::OpenAI), Some(&HealthStatus::Unhealthy));
        
        // 健康供应商数量应该减少
        assert_eq!(registry.healthy_provider_count().await, 1);
    }
    
    #[tokio::test]
    async fn test_record_success_resets_failures() {
        let config = create_test_config(RoutingStrategy::Priority);
        let registry = ProviderRegistry::new(config).unwrap();
        
        // 记录一些失败
        registry.record_failure(ProviderType::OpenAI).await;
        registry.record_failure(ProviderType::OpenAI).await;
        
        // 记录成功应该重置失败计数
        registry.record_success(ProviderType::OpenAI).await;
        
        let status = registry.get_health_status().await;
        assert_eq!(status.get(&ProviderType::OpenAI), Some(&HealthStatus::Healthy));
        
        // 再次失败不应该立即标记为不健康
        registry.record_failure(ProviderType::OpenAI).await;
        let status = registry.get_health_status().await;
        assert_ne!(status.get(&ProviderType::OpenAI), Some(&HealthStatus::Unhealthy));
    }
    
    #[tokio::test]
    async fn test_select_provider_skips_unhealthy() {
        let config = create_test_config(RoutingStrategy::Priority);
        let registry = ProviderRegistry::new(config).unwrap();
        
        // 标记优先级最高的供应商为不健康
        registry.set_health_status(ProviderType::OpenAI, HealthStatus::Unhealthy).await;
        
        // 选择应该返回第二个供应商
        let (adapter, config) = registry.select_provider().await.unwrap();
        assert_eq!(adapter.name(), "alibaba_bailian");
        assert_eq!(config.priority, 2);
    }
    
    #[tokio::test]
    async fn test_select_provider_all_unhealthy() {
        let config = create_test_config(RoutingStrategy::Priority);
        let registry = ProviderRegistry::new(config).unwrap();
        
        // 标记所有供应商为不健康
        registry.set_health_status(ProviderType::OpenAI, HealthStatus::Unhealthy).await;
        registry.set_health_status(ProviderType::AlibabaBailian, HealthStatus::Unhealthy).await;
        
        // 选择应该失败
        let result = registry.select_provider().await;
        assert!(result.is_err());
        
        if let Err(e) = result {
            assert!(matches!(e, ApiError::ServiceUnavailable(_)));
        }
    }
    
    #[tokio::test]
    async fn test_manual_health_status_update() {
        let config = create_test_config(RoutingStrategy::Priority);
        let registry = ProviderRegistry::new(config).unwrap();
        
        // 手动设置健康状态
        registry.set_health_status(ProviderType::OpenAI, HealthStatus::Unhealthy).await;
        
        let status = registry.get_health_status().await;
        assert_eq!(status.get(&ProviderType::OpenAI), Some(&HealthStatus::Unhealthy));
        
        // 恢复健康
        registry.set_health_status(ProviderType::OpenAI, HealthStatus::Healthy).await;
        
        let status = registry.get_health_status().await;
        assert_eq!(status.get(&ProviderType::OpenAI), Some(&HealthStatus::Healthy));
    }
}
