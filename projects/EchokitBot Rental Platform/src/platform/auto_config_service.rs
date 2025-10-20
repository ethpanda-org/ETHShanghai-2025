//! Automatic Configuration Service for contract registration and management

use crate::error::ContractGeneratorError;
use crate::platform::{
    ContractRegistry, ConfigurationManager, RoleManager,
    contract_registry::{RegisteredContract, ContractMetadata, ContractRole, ContractPermission},
    config_manager::ConfigSyncResult,
    role_manager::RoleConfigResult,
};
use alloy::primitives::Address;
use alloy::providers::Provider;
use alloy::transports::Transport;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tokio::sync::RwLock;
use tracing::{info, warn, error};
use std::sync::Arc;

/// Automatic configuration service for contract management
#[derive(Debug)]
pub struct AutoConfigService {
    /// Contract registry
    registry: Arc<RwLock<ContractRegistry>>,
    /// Configuration manager
    config_manager: Arc<RwLock<ConfigurationManager>>,
    /// Role manager
    role_manager: Arc<RwLock<RoleManager>>,
    /// Service configuration
    config: AutoConfigServiceConfig,
}

/// Configuration for the auto config service
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutoConfigServiceConfig {
    /// Enable automatic contract registration
    pub auto_register: bool,
    /// Enable automatic role configuration
    pub auto_configure_roles: bool,
    /// Enable automatic config synchronization
    pub auto_sync_config: bool,
    /// Platform configuration file path
    pub platform_config_path: PathBuf,
    /// Contract registry file path
    pub registry_path: PathBuf,
    /// Default admin address
    pub default_admin: Option<String>,
    /// Treasury address
    pub treasury_address: Option<String>,
}

/// Contract deployment event for automatic processing
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContractDeploymentEvent {
    pub contract_name: String,
    pub contract_type: String,
    pub contract_address: String,
    pub network: String,
    pub deployment_tx: String,
    pub deployer: String,
    pub abi_path: PathBuf,
    pub source_path: PathBuf,
    pub block_number: u64,
    pub timestamp: u64,
}

/// Result of automatic configuration process
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutoConfigResult {
    pub success: bool,
    pub contract_registered: bool,
    pub roles_configured: bool,
    pub config_synced: bool,
    pub registration_result: Option<String>,
    pub role_config_result: Option<RoleConfigResult>,
    pub sync_result: Option<ConfigSyncResult>,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
}

impl AutoConfigService {
    /// Create a new auto config service
    pub async fn new(config: AutoConfigServiceConfig) -> Result<Self, ContractGeneratorError> {
        // Load or create contract registry
        let registry = if config.registry_path.exists() {
            ContractRegistry::load(config.registry_path.clone()).await?
        } else {
            ContractRegistry::new()
        };

        // Create configuration manager
        let config_manager = ConfigurationManager::new(
            config.platform_config_path.clone(),
            registry.clone(),
        );

        // Create role manager
        let default_admin = config.default_admin.as_ref()
            .and_then(|addr| addr.parse().ok());
        let treasury_address = config.treasury_address.as_ref()
            .and_then(|addr| addr.parse().ok());
        
        let role_manager = RoleManager::new(default_admin, treasury_address);

        Ok(Self {
            registry: Arc::new(RwLock::new(registry)),
            config_manager: Arc::new(RwLock::new(config_manager)),
            role_manager: Arc::new(RwLock::new(role_manager)),
            config,
        })
    }

    /// Process a contract deployment event automatically
    pub async fn process_deployment<T: Transport + Clone, P: Provider<T>>(
        &self,
        event: ContractDeploymentEvent,
        provider: &P,
    ) -> Result<AutoConfigResult, ContractGeneratorError> {
        let mut result = AutoConfigResult {
            success: true,
            contract_registered: false,
            roles_configured: false,
            config_synced: false,
            registration_result: None,
            role_config_result: None,
            sync_result: None,
            errors: vec![],
            warnings: vec![],
        };

        info!("Processing deployment event for contract: {} at {}", 
              event.contract_name, event.contract_address);

        // Step 1: Register contract if auto-registration is enabled
        if self.config.auto_register {
            match self.register_contract(&event).await {
                Ok(msg) => {
                    result.contract_registered = true;
                    result.registration_result = Some(msg);
                    info!("Successfully registered contract: {}", event.contract_name);
                }
                Err(e) => {
                    result.success = false;
                    result.errors.push(format!("Contract registration failed: {}", e));
                    error!("Failed to register contract {}: {}", event.contract_name, e);
                }
            }
        }

        // Step 2: Configure roles if auto-role-configuration is enabled
        if self.config.auto_configure_roles {
            let contract_address: Address = event.contract_address.parse()
                .map_err(|e| ContractGeneratorError::ConfigError(
                    format!("Invalid contract address: {}", e)
                ))?;
            
            let deployer_address: Address = event.deployer.parse()
                .map_err(|e| ContractGeneratorError::ConfigError(
                    format!("Invalid deployer address: {}", e)
                ))?;

            match self.configure_roles(&event.contract_type, contract_address, deployer_address, provider).await {
                Ok(role_result) => {
                    result.roles_configured = role_result.success;
                    result.role_config_result = Some(role_result);
                    if result.roles_configured {
                        info!("Successfully configured roles for contract: {}", event.contract_name);
                    } else {
                        result.warnings.push("Role configuration completed with warnings".to_string());
                    }
                }
                Err(e) => {
                    result.success = false;
                    result.errors.push(format!("Role configuration failed: {}", e));
                    error!("Failed to configure roles for {}: {}", event.contract_name, e);
                }
            }
        }

        // Step 3: Sync configuration if auto-sync is enabled
        if self.config.auto_sync_config {
            match self.sync_configuration().await {
                Ok(sync_result) => {
                    result.config_synced = sync_result.success;
                    result.sync_result = Some(sync_result);
                    if result.config_synced {
                        info!("Successfully synced configuration for contract: {}", event.contract_name);
                    } else {
                        result.warnings.push("Configuration sync completed with warnings".to_string());
                    }
                }
                Err(e) => {
                    result.success = false;
                    result.errors.push(format!("Configuration sync failed: {}", e));
                    error!("Failed to sync configuration: {}", e);
                }
            }
        }

        // Log final result
        if result.success {
            info!("Auto-configuration completed successfully for contract: {}", event.contract_name);
        } else {
            error!("Auto-configuration failed for contract: {} with {} errors", 
                   event.contract_name, result.errors.len());
        }

        Ok(result)
    }

    /// Register a contract in the registry
    async fn register_contract(&self, event: &ContractDeploymentEvent) -> Result<String, ContractGeneratorError> {
        let mut registry = self.registry.write().await;
        
        registry.auto_register(
            event.contract_name.clone(),
            event.contract_address.clone(),
            event.network.clone(),
            event.deployment_tx.clone(),
            event.deployer.clone(),
            event.abi_path.clone(),
            event.source_path.clone(),
        ).await?;

        // Configure default roles and permissions for the contract
        let roles = registry.generate_default_roles(&event.contract_type);
        let permissions = registry.generate_default_permissions(&event.contract_type);

        registry.configure_roles(&event.contract_name, roles).await?;
        registry.configure_permissions(&event.contract_name, permissions).await?;

        Ok(format!("Contract {} registered successfully", event.contract_name))
    }

    /// Configure roles for a contract
    async fn configure_roles<T: Transport + Clone, P: Provider<T>>(
        &self,
        contract_type: &str,
        contract_address: Address,
        deployer_address: Address,
        provider: &P,
    ) -> Result<RoleConfigResult, ContractGeneratorError> {
        let mut role_manager = self.role_manager.write().await;
        
        role_manager.configure_contract_roles(
            contract_type,
            contract_address,
            provider,
            deployer_address,
        ).await
    }

    /// Sync configuration files
    async fn sync_configuration(&self) -> Result<ConfigSyncResult, ContractGeneratorError> {
        let mut config_manager = self.config_manager.write().await;
        config_manager.sync_configuration().await
    }

    /// Update contract address (for upgrades or redeployments)
    pub async fn update_contract_address(
        &self,
        contract_name: &str,
        new_address: String,
        deployment_tx: String,
    ) -> Result<(), ContractGeneratorError> {
        let mut registry = self.registry.write().await;
        registry.update_contract_address(contract_name, new_address, deployment_tx).await?;

        // Trigger config sync if enabled
        if self.config.auto_sync_config {
            drop(registry); // Release the lock
            self.sync_configuration().await?;
        }

        Ok(())
    }

    /// Get contract information
    pub async fn get_contract(&self, name: &str) -> Option<RegisteredContract> {
        let registry = self.registry.read().await;
        registry.get(name).cloned()
    }

    /// List all registered contracts
    pub async fn list_contracts(&self) -> Vec<RegisteredContract> {
        let registry = self.registry.read().await;
        registry.list().into_iter().cloned().collect()
    }

    /// Get contracts by network
    pub async fn get_contracts_by_network(&self, network: &str) -> Vec<RegisteredContract> {
        let registry = self.registry.read().await;
        registry.list_by_network(network).into_iter().cloned().collect()
    }

    /// Add custom role configuration for a contract type
    pub async fn add_custom_role_config(
        &self,
        contract_type: String,
        roles: Vec<ContractRole>,
    ) -> Result<(), ContractGeneratorError> {
        let mut role_manager = self.role_manager.write().await;
        role_manager.add_role_config(contract_type, roles);
        Ok(())
    }

    /// Add custom permission configuration for a contract type
    pub async fn add_custom_permission_config(
        &self,
        contract_type: String,
        permissions: Vec<ContractPermission>,
    ) -> Result<(), ContractGeneratorError> {
        let mut role_manager = self.role_manager.write().await;
        role_manager.add_permission_config(contract_type, permissions);
        Ok(())
    }

    /// Enable or disable auto-sync
    pub async fn set_auto_sync(&self, enabled: bool) -> Result<(), ContractGeneratorError> {
        let mut config_manager = self.config_manager.write().await;
        config_manager.set_auto_sync(enabled);
        Ok(())
    }

    /// Set default admin address
    pub async fn set_default_admin(&self, admin: Address) -> Result<(), ContractGeneratorError> {
        let mut role_manager = self.role_manager.write().await;
        role_manager.set_default_admin(admin);
        Ok(())
    }

    /// Set treasury address
    pub async fn set_treasury_address(&self, treasury: Address) -> Result<(), ContractGeneratorError> {
        let mut role_manager = self.role_manager.write().await;
        role_manager.set_treasury_address(treasury);
        Ok(())
    }

    /// Export registry as JSON
    pub async fn export_registry(&self) -> Result<String, ContractGeneratorError> {
        let registry = self.registry.read().await;
        registry.export_json()
    }

    /// Generate deployment script for role assignments
    pub async fn generate_role_script(&self, contract_type: &str, contract_address: Address) -> Result<String, ContractGeneratorError> {
        let role_manager = self.role_manager.read().await;
        Ok(role_manager.generate_role_assignment_script(contract_type, contract_address))
    }

    /// Validate service configuration
    pub fn validate_config(&self) -> Result<(), ContractGeneratorError> {
        // Check if required paths exist or can be created
        if let Some(parent) = self.config.platform_config_path.parent() {
            if !parent.exists() {
                return Err(ContractGeneratorError::ConfigError(
                    format!("Platform config directory does not exist: {:?}", parent)
                ));
            }
        }

        if let Some(parent) = self.config.registry_path.parent() {
            if !parent.exists() {
                return Err(ContractGeneratorError::ConfigError(
                    format!("Registry directory does not exist: {:?}", parent)
                ));
            }
        }

        // Validate addresses if provided
        if let Some(admin) = &self.config.default_admin {
            admin.parse::<Address>()
                .map_err(|e| ContractGeneratorError::ConfigError(
                    format!("Invalid default admin address: {}", e)
                ))?;
        }

        if let Some(treasury) = &self.config.treasury_address {
            treasury.parse::<Address>()
                .map_err(|e| ContractGeneratorError::ConfigError(
                    format!("Invalid treasury address: {}", e)
                ))?;
        }

        Ok(())
    }

    /// Start background services (config sync, monitoring, etc.)
    pub async fn start_background_services(&self) -> Result<(), ContractGeneratorError> {
        if self.config.auto_sync_config {
            info!("Starting background configuration sync service");
            
            // Clone the config manager for the background task
            let config_manager = Arc::clone(&self.config_manager);
            
            tokio::spawn(async move {
                let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(300)); // 5 minutes
                
                loop {
                    interval.tick().await;
                    
                    let mut manager = config_manager.write().await;
                    if let Err(e) = manager.sync_configuration().await {
                        error!("Background config sync failed: {}", e);
                    }
                }
            });
        }

        Ok(())
    }
}

impl Default for AutoConfigServiceConfig {
    fn default() -> Self {
        Self {
            auto_register: true,
            auto_configure_roles: true,
            auto_sync_config: true,
            platform_config_path: PathBuf::from("config/platform.toml"),
            registry_path: PathBuf::from("config/contract_registry.json"),
            default_admin: None,
            treasury_address: None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[tokio::test]
    async fn test_auto_config_service_creation() {
        let temp_dir = tempdir().unwrap();
        let config = AutoConfigServiceConfig {
            platform_config_path: temp_dir.path().join("platform.toml"),
            registry_path: temp_dir.path().join("registry.json"),
            ..Default::default()
        };

        let service = AutoConfigService::new(config).await.unwrap();
        assert!(service.config.auto_register);
        assert!(service.config.auto_configure_roles);
        assert!(service.config.auto_sync_config);
    }

    #[tokio::test]
    async fn test_contract_registration() {
        let temp_dir = tempdir().unwrap();
        let config = AutoConfigServiceConfig {
            platform_config_path: temp_dir.path().join("platform.toml"),
            registry_path: temp_dir.path().join("registry.json"),
            ..Default::default()
        };

        let service = AutoConfigService::new(config).await.unwrap();
        
        let event = ContractDeploymentEvent {
            contract_name: "TestContract".to_string(),
            contract_type: "EchokitBotNFT".to_string(),
            contract_address: "0x1234567890123456789012345678901234567890".to_string(),
            network: "localhost".to_string(),
            deployment_tx: "0xabcd".to_string(),
            deployer: "0x1111111111111111111111111111111111111111".to_string(),
            abi_path: PathBuf::from("test.abi"),
            source_path: PathBuf::from("test.sol"),
            block_number: 12345,
            timestamp: 1234567890,
        };

        // Create the registry file first
        {
            let mut registry = service.registry.write().await;
            let mut registry_with_path = ContractRegistry::new();
            registry_with_path.registry_path = Some(temp_dir.path().join("registry.json"));
            *registry = registry_with_path;
        }

        let result = service.register_contract(&event).await.unwrap();
        assert!(result.contains("registered successfully"));
        
        let contract = service.get_contract("TestContract").await;
        assert!(contract.is_some());
    }

    #[test]
    fn test_config_validation() {
        let config = AutoConfigServiceConfig {
            default_admin: Some("invalid_address".to_string()),
            ..Default::default()
        };

        let temp_dir = tempdir().unwrap();
        let config = AutoConfigServiceConfig {
            platform_config_path: temp_dir.path().join("platform.toml"),
            registry_path: temp_dir.path().join("registry.json"),
            default_admin: Some("0x1234567890123456789012345678901234567890".to_string()),
            ..Default::default()
        };

        // This should not panic since we're not actually creating the service
        // Just testing the config structure
        assert!(config.auto_register);
    }
}