//! Configuration Manager for automatic platform configuration synchronization

use crate::error::ContractGeneratorError;
use crate::platform::contract_registry::{
    ContractRegistry, PlatformConfiguration, PlatformContractAddresses,
    NetworkConfiguration, GlobalSettings, GasSettings,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use tokio::fs;
use tracing::{info, warn, error};

/// Configuration manager for automatic synchronization
#[derive(Debug, Clone)]
pub struct ConfigurationManager {
    /// Platform configuration file path
    config_path: PathBuf,
    /// Contract registry reference
    registry: ContractRegistry,
    /// Auto-sync settings
    auto_sync_enabled: bool,
}

/// Configuration sync result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigSyncResult {
    pub success: bool,
    pub updated_contracts: Vec<String>,
    pub updated_networks: Vec<String>,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
}

impl ConfigurationManager {
    /// Create a new configuration manager
    pub fn new(config_path: PathBuf, registry: ContractRegistry) -> Self {
        Self {
            config_path,
            registry,
            auto_sync_enabled: true,
        }
    }

    /// Enable or disable auto-sync
    pub fn set_auto_sync(&mut self, enabled: bool) {
        self.auto_sync_enabled = enabled;
        info!("Auto-sync {}", if enabled { "enabled" } else { "disabled" });
    }

    /// Perform full configuration synchronization
    pub async fn sync_configuration(&mut self) -> Result<ConfigSyncResult, ContractGeneratorError> {
        let mut result = ConfigSyncResult {
            success: true,
            updated_contracts: vec![],
            updated_networks: vec![],
            errors: vec![],
            warnings: vec![],
        };

        // Load existing platform configuration
        let mut platform_config = self.load_or_create_platform_config().await?;

        // Sync contract addresses
        self.sync_contract_addresses(&mut platform_config, &mut result).await?;

        // Sync network configurations
        self.sync_network_configurations(&mut platform_config, &mut result).await?;

        // Sync global settings
        self.sync_global_settings(&mut platform_config, &mut result).await?;

        // Save updated configuration
        self.save_platform_config(&platform_config).await?;

        // Sync with external configuration files
        self.sync_external_configs(&platform_config, &mut result).await?;

        info!("Configuration sync completed: {} contracts, {} networks updated", 
              result.updated_contracts.len(), result.updated_networks.len());

        Ok(result)
    }

    /// Load or create platform configuration
    async fn load_or_create_platform_config(&self) -> Result<PlatformConfiguration, ContractGeneratorError> {
        if self.config_path.exists() {
            let content = fs::read_to_string(&self.config_path).await
                .map_err(|e| ContractGeneratorError::ConfigError(
                    format!("Failed to read config file: {}", e)
                ))?;

            toml::from_str(&content)
                .map_err(|e| ContractGeneratorError::ConfigError(
                    format!("Failed to parse config file: {}", e)
                ))
        } else {
            info!("Creating new platform configuration file");
            Ok(PlatformConfiguration::default())
        }
    }

    /// Sync contract addresses from registry to platform config
    async fn sync_contract_addresses(
        &self,
        platform_config: &mut PlatformConfiguration,
        result: &mut ConfigSyncResult,
    ) -> Result<(), ContractGeneratorError> {
        for contract in self.registry.list() {
            let network_addresses = platform_config.deployed_contracts
                .entry(contract.network.clone())
                .or_insert_with(PlatformContractAddresses::default);

            let updated = match contract.name.as_str() {
                "EchokitBotNFT" => {
                    let old_address = network_addresses.nft_contract.clone();
                    network_addresses.nft_contract = Some(contract.address.clone());
                    old_address.as_ref() != Some(&contract.address)
                }
                "RentalManager" => {
                    let old_address = network_addresses.rental_manager.clone();
                    network_addresses.rental_manager = Some(contract.address.clone());
                    old_address.as_ref() != Some(&contract.address)
                }
                "PaymentProcessor" => {
                    let old_address = network_addresses.payment_processor.clone();
                    network_addresses.payment_processor = Some(contract.address.clone());
                    old_address.as_ref() != Some(&contract.address)
                }
                "RWAVault" => {
                    let old_address = network_addresses.rwa_vault.clone();
                    network_addresses.rwa_vault = Some(contract.address.clone());
                    old_address.as_ref() != Some(&contract.address)
                }
                "TokenBoundAccountManager" => {
                    let old_address = network_addresses.tba_manager.clone();
                    network_addresses.tba_manager = Some(contract.address.clone());
                    old_address.as_ref() != Some(&contract.address)
                }
                "TokenBoundAccountRegistry" => {
                    let old_address = network_addresses.tba_registry.clone();
                    network_addresses.tba_registry = Some(contract.address.clone());
                    old_address.as_ref() != Some(&contract.address)
                }
                _ => false, // Custom contracts don't go in platform config
            };

            if updated {
                result.updated_contracts.push(format!("{}:{}", contract.name, contract.network));
                info!("Updated contract address: {} on {} -> {}", 
                      contract.name, contract.network, contract.address);
            }
        }

        Ok(())
    }

    /// Sync network configurations
    async fn sync_network_configurations(
        &self,
        platform_config: &mut PlatformConfiguration,
        result: &mut ConfigSyncResult,
    ) -> Result<(), ContractGeneratorError> {
        // Get unique networks from registry
        let registry_networks: std::collections::HashSet<String> = self.registry.list()
            .iter()
            .map(|c| c.network.clone())
            .collect();

        for network in registry_networks {
            if !platform_config.networks.contains_key(&network) {
                // Add default network configuration
                let network_config = self.create_default_network_config(&network);
                platform_config.networks.insert(network.clone(), network_config);
                result.updated_networks.push(network.clone());
                result.warnings.push(format!(
                    "Added default configuration for network: {}. Please review and update RPC settings.",
                    network
                ));
            }
        }

        Ok(())
    }

    /// Create default network configuration
    fn create_default_network_config(&self, network: &str) -> NetworkConfiguration {
        match network {
            "mainnet" => NetworkConfiguration {
                name: "Ethereum Mainnet".to_string(),
                chain_id: 1,
                rpc_url: "https://mainnet.infura.io/v3/YOUR_PROJECT_ID".to_string(),
                explorer_url: Some("https://etherscan.io".to_string()),
                is_testnet: false,
                gas_settings: GasSettings {
                    gas_limit: 8000000,
                    gas_price: None,
                    max_fee_per_gas: Some(50),
                    max_priority_fee_per_gas: Some(2),
                },
            },
            "sepolia" => NetworkConfiguration {
                name: "Sepolia Testnet".to_string(),
                chain_id: 11155111,
                rpc_url: "https://sepolia.infura.io/v3/YOUR_PROJECT_ID".to_string(),
                explorer_url: Some("https://sepolia.etherscan.io".to_string()),
                is_testnet: true,
                gas_settings: GasSettings {
                    gas_limit: 8000000,
                    gas_price: None,
                    max_fee_per_gas: Some(20),
                    max_priority_fee_per_gas: Some(2),
                },
            },
            "arbitrum" => NetworkConfiguration {
                name: "Arbitrum One".to_string(),
                chain_id: 42161,
                rpc_url: "https://arbitrum-mainnet.infura.io/v3/YOUR_PROJECT_ID".to_string(),
                explorer_url: Some("https://arbiscan.io".to_string()),
                is_testnet: false,
                gas_settings: GasSettings {
                    gas_limit: 8000000,
                    gas_price: None,
                    max_fee_per_gas: Some(1),
                    max_priority_fee_per_gas: Some(0),
                },
            },
            "polygon" => NetworkConfiguration {
                name: "Polygon Mainnet".to_string(),
                chain_id: 137,
                rpc_url: "https://polygon-mainnet.infura.io/v3/YOUR_PROJECT_ID".to_string(),
                explorer_url: Some("https://polygonscan.com".to_string()),
                is_testnet: false,
                gas_settings: GasSettings {
                    gas_limit: 8000000,
                    gas_price: Some(30),
                    max_fee_per_gas: None,
                    max_priority_fee_per_gas: None,
                },
            },
            _ => NetworkConfiguration {
                name: format!("Custom Network: {}", network),
                chain_id: 31337, // Default to localhost chain ID
                rpc_url: "http://localhost:8545".to_string(),
                explorer_url: None,
                is_testnet: true,
                gas_settings: GasSettings {
                    gas_limit: 8000000,
                    gas_price: None,
                    max_fee_per_gas: Some(20),
                    max_priority_fee_per_gas: Some(2),
                },
            },
        }
    }

    /// Sync global settings
    async fn sync_global_settings(
        &self,
        platform_config: &mut PlatformConfiguration,
        _result: &mut ConfigSyncResult,
    ) -> Result<(), ContractGeneratorError> {
        // Ensure auto-sync settings are properly configured
        platform_config.global_settings.auto_register_contracts = self.auto_sync_enabled;
        platform_config.global_settings.auto_configure_roles = self.auto_sync_enabled;
        platform_config.global_settings.auto_sync_config = self.auto_sync_enabled;

        Ok(())
    }

    /// Save platform configuration
    async fn save_platform_config(
        &self,
        config: &PlatformConfiguration,
    ) -> Result<(), ContractGeneratorError> {
        let content = toml::to_string_pretty(config)
            .map_err(|e| ContractGeneratorError::ConfigError(
                format!("Failed to serialize config: {}", e)
            ))?;

        // Ensure directory exists
        if let Some(parent) = self.config_path.parent() {
            fs::create_dir_all(parent).await
                .map_err(|e| ContractGeneratorError::ConfigError(
                    format!("Failed to create config directory: {}", e)
                ))?;
        }

        fs::write(&self.config_path, content).await
            .map_err(|e| ContractGeneratorError::ConfigError(
                format!("Failed to write config file: {}", e)
            ))?;

        Ok(())
    }

    /// Sync with external configuration files (e.g., frontend config, deployment scripts)
    async fn sync_external_configs(
        &self,
        platform_config: &PlatformConfiguration,
        result: &mut ConfigSyncResult,
    ) -> Result<(), ContractGeneratorError> {
        // Sync with frontend configuration
        if let Err(e) = self.sync_frontend_config(platform_config).await {
            result.errors.push(format!("Failed to sync frontend config: {}", e));
            result.success = false;
        }

        // Sync with deployment scripts
        if let Err(e) = self.sync_deployment_scripts(platform_config).await {
            result.errors.push(format!("Failed to sync deployment scripts: {}", e));
            result.success = false;
        }

        // Sync with monitoring configuration
        if let Err(e) = self.sync_monitoring_config(platform_config).await {
            result.errors.push(format!("Failed to sync monitoring config: {}", e));
            result.success = false;
        }

        Ok(())
    }

    /// Sync frontend configuration
    async fn sync_frontend_config(
        &self,
        platform_config: &PlatformConfiguration,
    ) -> Result<(), ContractGeneratorError> {
        let frontend_config_path = PathBuf::from("frontend/src/config/contracts.ts");
        
        if !frontend_config_path.exists() {
            return Ok(()); // Frontend config doesn't exist, skip
        }

        let mut frontend_config = FrontendContractConfig::new();
        
        for (network, addresses) in &platform_config.deployed_contracts {
            if let Some(network_config) = platform_config.networks.get(network) {
                frontend_config.add_network(
                    network.clone(),
                    network_config.chain_id,
                    addresses.clone(),
                );
            }
        }

        let typescript_content = frontend_config.generate_typescript();
        fs::write(&frontend_config_path, typescript_content).await
            .map_err(|e| ContractGeneratorError::ConfigError(
                format!("Failed to write frontend config: {}", e)
            ))?;

        info!("Synced frontend configuration");
        Ok(())
    }

    /// Sync deployment scripts
    async fn sync_deployment_scripts(
        &self,
        platform_config: &PlatformConfiguration,
    ) -> Result<(), ContractGeneratorError> {
        let deployment_config_path = PathBuf::from("contracts/script/DeploymentConfig.sol");
        
        let deployment_config = DeploymentScriptConfig::from_platform_config(platform_config);
        let solidity_content = deployment_config.generate_solidity();
        
        // Ensure directory exists
        if let Some(parent) = deployment_config_path.parent() {
            fs::create_dir_all(parent).await
                .map_err(|e| ContractGeneratorError::ConfigError(
                    format!("Failed to create deployment script directory: {}", e)
                ))?;
        }

        fs::write(&deployment_config_path, solidity_content).await
            .map_err(|e| ContractGeneratorError::ConfigError(
                format!("Failed to write deployment script: {}", e)
            ))?;

        info!("Synced deployment scripts");
        Ok(())
    }

    /// Sync monitoring configuration
    async fn sync_monitoring_config(
        &self,
        platform_config: &PlatformConfiguration,
    ) -> Result<(), ContractGeneratorError> {
        let monitoring_config_path = PathBuf::from("monitoring/contract-addresses.yml");
        
        let monitoring_config = MonitoringConfig::from_platform_config(platform_config);
        let yaml_content = monitoring_config.generate_yaml()
            .map_err(|e| ContractGeneratorError::ConfigError(
                format!("Failed to generate monitoring config: {}", e)
            ))?;
        
        // Ensure directory exists
        if let Some(parent) = monitoring_config_path.parent() {
            fs::create_dir_all(parent).await
                .map_err(|e| ContractGeneratorError::ConfigError(
                    format!("Failed to create monitoring config directory: {}", e)
                ))?;
        }

        fs::write(&monitoring_config_path, yaml_content).await
            .map_err(|e| ContractGeneratorError::ConfigError(
                format!("Failed to write monitoring config: {}", e)
            ))?;

        info!("Synced monitoring configuration");
        Ok(())
    }

    /// Watch for registry changes and auto-sync if enabled
    pub async fn watch_and_sync(&mut self) -> Result<(), ContractGeneratorError> {
        if !self.auto_sync_enabled {
            return Ok(());
        }

        // This would typically use a file watcher or event system
        // For now, we'll implement a simple periodic sync
        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(60));
        
        loop {
            interval.tick().await;
            
            if let Err(e) = self.sync_configuration().await {
                error!("Auto-sync failed: {}", e);
            }
        }
    }
}

/// Frontend contract configuration generator
#[derive(Debug, Clone)]
struct FrontendContractConfig {
    networks: HashMap<String, FrontendNetworkConfig>,
}

#[derive(Debug, Clone)]
struct FrontendNetworkConfig {
    chain_id: u64,
    contracts: PlatformContractAddresses,
}

impl FrontendContractConfig {
    fn new() -> Self {
        Self {
            networks: HashMap::new(),
        }
    }

    fn add_network(&mut self, name: String, chain_id: u64, contracts: PlatformContractAddresses) {
        self.networks.insert(name, FrontendNetworkConfig {
            chain_id,
            contracts,
        });
    }

    fn generate_typescript(&self) -> String {
        let mut content = String::from("// Auto-generated contract configuration\n");
        content.push_str("// DO NOT EDIT MANUALLY - This file is automatically updated\n\n");
        content.push_str("export interface ContractAddresses {\n");
        content.push_str("  nftContract?: string;\n");
        content.push_str("  rentalManager?: string;\n");
        content.push_str("  paymentProcessor?: string;\n");
        content.push_str("  rwaVault?: string;\n");
        content.push_str("  tbaManager?: string;\n");
        content.push_str("  tbaRegistry?: string;\n");
        content.push_str("}\n\n");
        
        content.push_str("export const CONTRACT_ADDRESSES: Record<number, ContractAddresses> = {\n");
        
        for (network, config) in &self.networks {
            content.push_str(&format!("  // {}\n", network));
            content.push_str(&format!("  {}: {{\n", config.chain_id));
            
            if let Some(addr) = &config.contracts.nft_contract {
                content.push_str(&format!("    nftContract: '{}',\n", addr));
            }
            if let Some(addr) = &config.contracts.rental_manager {
                content.push_str(&format!("    rentalManager: '{}',\n", addr));
            }
            if let Some(addr) = &config.contracts.payment_processor {
                content.push_str(&format!("    paymentProcessor: '{}',\n", addr));
            }
            if let Some(addr) = &config.contracts.rwa_vault {
                content.push_str(&format!("    rwaVault: '{}',\n", addr));
            }
            if let Some(addr) = &config.contracts.tba_manager {
                content.push_str(&format!("    tbaManager: '{}',\n", addr));
            }
            if let Some(addr) = &config.contracts.tba_registry {
                content.push_str(&format!("    tbaRegistry: '{}',\n", addr));
            }
            
            content.push_str("  },\n");
        }
        
        content.push_str("};\n");
        content
    }
}

/// Deployment script configuration generator
#[derive(Debug, Clone)]
struct DeploymentScriptConfig {
    networks: HashMap<String, PlatformContractAddresses>,
}

impl DeploymentScriptConfig {
    fn from_platform_config(config: &PlatformConfiguration) -> Self {
        Self {
            networks: config.deployed_contracts.clone(),
        }
    }

    fn generate_solidity(&self) -> String {
        let mut content = String::from("// SPDX-License-Identifier: MIT\n");
        content.push_str("pragma solidity ^0.8.21;\n\n");
        content.push_str("// Auto-generated deployment configuration\n");
        content.push_str("// DO NOT EDIT MANUALLY - This file is automatically updated\n\n");
        content.push_str("library DeploymentConfig {\n");
        
        for (network, addresses) in &self.networks {
            content.push_str(&format!("    // {} Network Addresses\n", network));
            
            if let Some(addr) = &addresses.nft_contract {
                content.push_str(&format!("    address constant {}_NFT_CONTRACT = {};\n", 
                                        network.to_uppercase(), addr));
            }
            if let Some(addr) = &addresses.rental_manager {
                content.push_str(&format!("    address constant {}_RENTAL_MANAGER = {};\n", 
                                        network.to_uppercase(), addr));
            }
            if let Some(addr) = &addresses.payment_processor {
                content.push_str(&format!("    address constant {}_PAYMENT_PROCESSOR = {};\n", 
                                        network.to_uppercase(), addr));
            }
            if let Some(addr) = &addresses.rwa_vault {
                content.push_str(&format!("    address constant {}_RWA_VAULT = {};\n", 
                                        network.to_uppercase(), addr));
            }
            if let Some(addr) = &addresses.tba_manager {
                content.push_str(&format!("    address constant {}_TBA_MANAGER = {};\n", 
                                        network.to_uppercase(), addr));
            }
            if let Some(addr) = &addresses.tba_registry {
                content.push_str(&format!("    address constant {}_TBA_REGISTRY = {};\n", 
                                        network.to_uppercase(), addr));
            }
            
            content.push_str("\n");
        }
        
        content.push_str("}\n");
        content
    }
}

/// Monitoring configuration generator
#[derive(Debug, Clone)]
struct MonitoringConfig {
    networks: HashMap<String, PlatformContractAddresses>,
}

impl MonitoringConfig {
    fn from_platform_config(config: &PlatformConfiguration) -> Self {
        Self {
            networks: config.deployed_contracts.clone(),
        }
    }

    fn generate_yaml(&self) -> Result<String, serde_yaml::Error> {
        let mut config = serde_yaml::Value::Mapping(serde_yaml::Mapping::new());
        
        for (network, addresses) in &self.networks {
            let mut network_config = serde_yaml::Mapping::new();
            
            if let Some(addr) = &addresses.nft_contract {
                network_config.insert(
                    serde_yaml::Value::String("nft_contract".to_string()),
                    serde_yaml::Value::String(addr.clone()),
                );
            }
            if let Some(addr) = &addresses.rental_manager {
                network_config.insert(
                    serde_yaml::Value::String("rental_manager".to_string()),
                    serde_yaml::Value::String(addr.clone()),
                );
            }
            if let Some(addr) = &addresses.payment_processor {
                network_config.insert(
                    serde_yaml::Value::String("payment_processor".to_string()),
                    serde_yaml::Value::String(addr.clone()),
                );
            }
            if let Some(addr) = &addresses.rwa_vault {
                network_config.insert(
                    serde_yaml::Value::String("rwa_vault".to_string()),
                    serde_yaml::Value::String(addr.clone()),
                );
            }
            if let Some(addr) = &addresses.tba_manager {
                network_config.insert(
                    serde_yaml::Value::String("tba_manager".to_string()),
                    serde_yaml::Value::String(addr.clone()),
                );
            }
            if let Some(addr) = &addresses.tba_registry {
                network_config.insert(
                    serde_yaml::Value::String("tba_registry".to_string()),
                    serde_yaml::Value::String(addr.clone()),
                );
            }
            
            if let serde_yaml::Value::Mapping(ref mut map) = config {
                map.insert(
                    serde_yaml::Value::String(network.clone()),
                    serde_yaml::Value::Mapping(network_config),
                );
            }
        }
        
        serde_yaml::to_string(&config)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[tokio::test]
    async fn test_config_manager_creation() {
        let temp_dir = tempdir().unwrap();
        let config_path = temp_dir.path().join("platform.toml");
        let registry = ContractRegistry::new();
        
        let manager = ConfigurationManager::new(config_path, registry);
        assert!(manager.auto_sync_enabled);
    }

    #[tokio::test]
    async fn test_sync_configuration() {
        let temp_dir = tempdir().unwrap();
        let config_path = temp_dir.path().join("platform.toml");
        let registry_path = temp_dir.path().join("registry.json");
        let mut registry = ContractRegistry::new();
        registry.registry_path = Some(registry_path);
        
        // Add a test contract to registry
        registry.auto_register(
            "EchokitBotNFT".to_string(),
            "0x1234567890123456789012345678901234567890".to_string(),
            "localhost".to_string(),
            "0xabcd".to_string(),
            "0x1111".to_string(),
            PathBuf::from("test.abi"),
            PathBuf::from("test.sol"),
        ).await.unwrap();
        
        let mut manager = ConfigurationManager::new(config_path, registry);
        let result = manager.sync_configuration().await.unwrap();
        
        assert!(result.success);
        assert!(!result.updated_contracts.is_empty());
    }
}