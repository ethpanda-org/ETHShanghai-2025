//! 供应商适配器模块
//! 
//! 提供统一的供应商接口和配置管理

pub mod config;
pub mod adapter;
pub mod openai;
pub mod alibaba_bailian;
pub mod registry;

pub use config::{
    ProviderType, 
    ProviderConfig, 
    MultiProviderConfig, 
    RoutingStrategy
};

pub use adapter::{ProviderAdapter, StreamResponse};
pub use openai::OpenAIAdapter;
pub use alibaba_bailian::AlibabaBailianAdapter;
pub use registry::{ProviderRegistry, HealthStatus};

// TODO: Task 6, 8 - 添加其他供应商实现
// pub mod zhipu_glm;
// pub mod anthropic_claude;
