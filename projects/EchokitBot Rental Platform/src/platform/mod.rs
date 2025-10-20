// Platform integration module
pub mod integration;
pub mod contract_registry;
pub mod dependency_manager;
pub mod compatibility_checker;
pub mod business_scenarios;
pub mod config_manager;
pub mod role_manager;
pub mod auto_config_service;

pub use integration::PlatformIntegration;
pub use contract_registry::ContractRegistry;
pub use dependency_manager::DependencyManager;
pub use compatibility_checker::CompatibilityChecker;
pub use business_scenarios::BusinessScenarioGenerator;
pub use config_manager::ConfigurationManager;
pub use role_manager::RoleManager;
pub use auto_config_service::{AutoConfigService, AutoConfigServiceConfig, ContractDeploymentEvent, AutoConfigResult};
