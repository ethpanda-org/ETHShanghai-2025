use crate::error::ContractGeneratorError;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use tokio::fs;
use chrono::{DateTime, Utc};

/// Contract registry for managing deployed contracts
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContractRegistry {
    /// Registered contracts by name
    contracts: HashMap<String, RegisteredContract>,
    /// Registry file path
    #[serde(skip)]
    pub registry_path: Option<PathBuf>,
}

/// Registered contract information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegisteredContract {
    pub name: String,
    pub address: String,
    pub network: String,
    pub abi_path: PathBuf,
    pub source_path: PathBuf,
    pub version: String,
    pub deployed_at: u64,
    pub dependencies: Vec<String>,
    pub metadata: ContractMetadata,
}

/// Contract metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContractMetadata {
    pub compiler_version: String,
    pub optimization_enabled: bool,
    pub optimization_runs: u32,
    pub constructor_args: Vec<String>,
    pub deployment_tx: String,
    pub deployer: String,
    pub roles: Vec<ContractRole>,
    pub permissions: Vec<ContractPermission>,
    pub auto_registered: bool,
    pub last_updated: DateTime<Utc>,
}

/// Contract role definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContractRole {
    pub name: String,
    pub role_hash: String,
    pub description: String,
    pub members: Vec<String>,
}

/// Contract permission definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContractPermission {
    pub function_name: String,
    pub required_role: String,
    pub access_level: AccessLevel,
}

/// Access level for contract functions
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AccessLevel {
    Public,
    Internal,
    External,
    Private,
    OnlyOwner,
    OnlyRole(String),
}

impl ContractRegistry {
    /// Create a new contract registry
    pub fn new() -> Self {
        Self {
            contracts: HashMap::new(),
            registry_path: None,
        }
    }

    /// Create a new contract registry with a specific path
    pub fn with_path(path: PathBuf) -> Self {
        Self {
            contracts: HashMap::new(),
            registry_path: Some(path),
        }
    }

    /// Load registry from file
    pub async fn load(path: PathBuf) -> Result<Self, ContractGeneratorError> {
        let content = tokio::fs::read_to_string(&path).await
            .map_err(|e| ContractGeneratorError::RegistryError(
                format!("Failed to read registry: {}", e)
            ))?;
        
        let mut registry: Self = serde_json::from_str(&content)
            .map_err(|e| ContractGeneratorError::RegistryError(
                format!("Failed to parse registry: {}", e)
            ))?;
        
        registry.registry_path = Some(path);
        Ok(registry)
    }

    /// Save registry to file
    pub async fn save(&self) -> Result<(), ContractGeneratorError> {
        let path = self.registry_path.as_ref()
            .ok_or_else(|| ContractGeneratorError::RegistryError(
                "Registry path not set".to_string()
            ))?;
        
        let content = serde_json::to_string_pretty(&self)
            .map_err(|e| ContractGeneratorError::RegistryError(
                format!("Failed to serialize registry: {}", e)
            ))?;
        
        tokio::fs::write(path, content).await
            .map_err(|e| ContractGeneratorError::RegistryError(
                format!("Failed to write registry: {}", e)
            ))?;
        
        Ok(())
    }

    /// Register a new contract
    pub fn register(&mut self, contract: RegisteredContract) -> Result<(), ContractGeneratorError> {
        if self.contracts.contains_key(&contract.name) {
            return Err(ContractGeneratorError::RegistryError(
                format!("Contract {} already registered", contract.name)
            ));
        }
        self.contracts.insert(contract.name.clone(), contract);
        Ok(())
    }

    /// Update an existing contract
    pub fn update(&mut self, contract: RegisteredContract) -> Result<(), ContractGeneratorError> {
        if !self.contracts.contains_key(&contract.name) {
            return Err(ContractGeneratorError::RegistryError(
                format!("Contract {} not found", contract.name)
            ));
        }
        self.contracts.insert(contract.name.clone(), contract);
        Ok(())
    }

    /// Unregister a contract
    pub fn unregister(&mut self, name: &str) -> Result<RegisteredContract, ContractGeneratorError> {
        self.contracts.remove(name)
            .ok_or_else(|| ContractGeneratorError::RegistryError(
                format!("Contract {} not found", name)
            ))
    }

    /// Get a registered contract
    pub fn get(&self, name: &str) -> Option<&RegisteredContract> {
        self.contracts.get(name)
    }

    /// Check if contract exists
    pub fn has(&self, name: &str) -> bool {
        self.contracts.contains_key(name)
    }

    /// List all registered contracts
    pub fn list(&self) -> Vec<&RegisteredContract> {
        self.contracts.values().collect()
    }

    /// List contracts by network
    pub fn list_by_network(&self, network: &str) -> Vec<&RegisteredContract> {
        self.contracts.values()
            .filter(|c| c.network == network)
            .collect()
    }

    /// Find contracts by dependency
    pub fn find_by_dependency(&self, dependency: &str) -> Vec<&RegisteredContract> {
        self.contracts.values()
            .filter(|c| c.dependencies.contains(&dependency.to_string()))
            .collect()
    }

    /// Get contract by address
    pub fn get_by_address(&self, address: &str, network: &str) -> Option<&RegisteredContract> {
        self.contracts.values()
            .find(|c| c.address.eq_ignore_ascii_case(address) && c.network == network)
    }

    /// Automatically register contract with deployment information
    pub async fn auto_register(
        &mut self,
        name: String,
        address: String,
        network: String,
        deployment_tx: String,
        deployer: String,
        abi_path: PathBuf,
        source_path: PathBuf,
    ) -> Result<(), ContractGeneratorError> {
        let contract = RegisteredContract {
            name: name.clone(),
            address,
            network,
            abi_path,
            source_path,
            version: "1.0.0".to_string(),
            deployed_at: Utc::now().timestamp() as u64,
            dependencies: vec![],
            metadata: ContractMetadata {
                compiler_version: "0.8.21".to_string(),
                optimization_enabled: true,
                optimization_runs: 200,
                constructor_args: vec![],
                deployment_tx,
                deployer,
                roles: vec![],
                permissions: vec![],
                auto_registered: true,
                last_updated: Utc::now(),
            },
        };

        let contract_address = contract.address.clone();
        self.register(contract)?;
        self.save().await?;
        
        tracing::info!("Auto-registered contract: {} at {}", name, contract_address);
        Ok(())
    }

    /// Update contract address and metadata
    pub async fn update_contract_address(
        &mut self,
        name: &str,
        new_address: String,
        deployment_tx: String,
    ) -> Result<(), ContractGeneratorError> {
        {
            let contract = self.contracts.get_mut(name)
                .ok_or_else(|| ContractGeneratorError::RegistryError(
                    format!("Contract {} not found", name)
                ))?;

            contract.address = new_address.clone();
            contract.metadata.deployment_tx = deployment_tx;
            contract.metadata.last_updated = Utc::now();
            contract.deployed_at = Utc::now().timestamp() as u64;
        }

        self.save().await?;
        
        tracing::info!("Updated contract address: {} -> {}", name, new_address);
        Ok(())
    }

    /// Configure contract roles automatically
    pub async fn configure_roles(
        &mut self,
        contract_name: &str,
        roles: Vec<ContractRole>,
    ) -> Result<(), ContractGeneratorError> {
        let contract = self.contracts.get_mut(contract_name)
            .ok_or_else(|| ContractGeneratorError::RegistryError(
                format!("Contract {} not found", contract_name)
            ))?;

        contract.metadata.roles = roles;
        contract.metadata.last_updated = Utc::now();

        self.save().await?;
        
        tracing::info!("Configured roles for contract: {}", contract_name);
        Ok(())
    }

    /// Configure contract permissions automatically
    pub async fn configure_permissions(
        &mut self,
        contract_name: &str,
        permissions: Vec<ContractPermission>,
    ) -> Result<(), ContractGeneratorError> {
        let contract = self.contracts.get_mut(contract_name)
            .ok_or_else(|| ContractGeneratorError::RegistryError(
                format!("Contract {} not found", contract_name)
            ))?;

        contract.metadata.permissions = permissions;
        contract.metadata.last_updated = Utc::now();

        self.save().await?;
        
        tracing::info!("Configured permissions for contract: {}", contract_name);
        Ok(())
    }

    /// Sync registry with platform configuration files
    pub async fn sync_with_platform_config(
        &self,
        config_path: &PathBuf,
    ) -> Result<(), ContractGeneratorError> {
        let mut platform_config = self.load_platform_config(config_path).await?;
        
        // Update contract addresses in platform config
        for contract in self.contracts.values() {
            match contract.name.as_str() {
                "EchokitBotNFT" => {
                    platform_config.deployed_contracts
                        .entry(contract.network.clone())
                        .or_insert_with(|| PlatformContractAddresses::default())
                        .nft_contract = Some(contract.address.clone());
                }
                "RentalManager" => {
                    platform_config.deployed_contracts
                        .entry(contract.network.clone())
                        .or_insert_with(|| PlatformContractAddresses::default())
                        .rental_manager = Some(contract.address.clone());
                }
                "PaymentProcessor" => {
                    platform_config.deployed_contracts
                        .entry(contract.network.clone())
                        .or_insert_with(|| PlatformContractAddresses::default())
                        .payment_processor = Some(contract.address.clone());
                }
                "RWAVault" => {
                    platform_config.deployed_contracts
                        .entry(contract.network.clone())
                        .or_insert_with(|| PlatformContractAddresses::default())
                        .rwa_vault = Some(contract.address.clone());
                }
                "TokenBoundAccountManager" => {
                    platform_config.deployed_contracts
                        .entry(contract.network.clone())
                        .or_insert_with(|| PlatformContractAddresses::default())
                        .tba_manager = Some(contract.address.clone());
                }
                "TokenBoundAccountRegistry" => {
                    platform_config.deployed_contracts
                        .entry(contract.network.clone())
                        .or_insert_with(|| PlatformContractAddresses::default())
                        .tba_registry = Some(contract.address.clone());
                }
                _ => {} // Custom contracts don't need to be in platform config
            }
        }

        self.save_platform_config(&platform_config, config_path).await?;
        
        tracing::info!("Synced registry with platform configuration");
        Ok(())
    }

    /// Load platform configuration
    async fn load_platform_config(
        &self,
        config_path: &PathBuf,
    ) -> Result<PlatformConfiguration, ContractGeneratorError> {
        if !config_path.exists() {
            return Ok(PlatformConfiguration::default());
        }

        let content = fs::read_to_string(config_path).await
            .map_err(|e| ContractGeneratorError::RegistryError(
                format!("Failed to read platform config: {}", e)
            ))?;

        toml::from_str(&content)
            .map_err(|e| ContractGeneratorError::RegistryError(
                format!("Failed to parse platform config: {}", e)
            ))
    }

    /// Save platform configuration
    async fn save_platform_config(
        &self,
        config: &PlatformConfiguration,
        config_path: &PathBuf,
    ) -> Result<(), ContractGeneratorError> {
        let content = toml::to_string_pretty(config)
            .map_err(|e| ContractGeneratorError::RegistryError(
                format!("Failed to serialize platform config: {}", e)
            ))?;

        // Ensure directory exists
        if let Some(parent) = config_path.parent() {
            fs::create_dir_all(parent).await
                .map_err(|e| ContractGeneratorError::RegistryError(
                    format!("Failed to create config directory: {}", e)
                ))?;
        }

        fs::write(config_path, content).await
            .map_err(|e| ContractGeneratorError::RegistryError(
                format!("Failed to write platform config: {}", e)
            ))?;

        Ok(())
    }

    /// Generate role configuration for common EchokitBot contracts
    pub fn generate_default_roles(&self, contract_type: &str) -> Vec<ContractRole> {
        match contract_type {
            "EchokitBotNFT" => vec![
                ContractRole {
                    name: "MINTER_ROLE".to_string(),
                    role_hash: "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6".to_string(),
                    description: "Can mint new NFTs".to_string(),
                    members: vec![],
                },
                ContractRole {
                    name: "PAUSER_ROLE".to_string(),
                    role_hash: "0x65d7a28e3265b37a6474929f336521b332c1681b933f6cb9f3376673440d862a".to_string(),
                    description: "Can pause/unpause contract".to_string(),
                    members: vec![],
                },
            ],
            "RentalManager" => vec![
                ContractRole {
                    name: "RENTAL_ADMIN_ROLE".to_string(),
                    role_hash: "0x8502233096d909befbda0999bb8ea2f3a6be3c138b9fbf003752a4c8bce86f6c".to_string(),
                    description: "Can manage rental configurations".to_string(),
                    members: vec![],
                },
                ContractRole {
                    name: "OPERATOR_ROLE".to_string(),
                    role_hash: "0x97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929".to_string(),
                    description: "Can execute rental operations".to_string(),
                    members: vec![],
                },
            ],
            "PaymentProcessor" => vec![
                ContractRole {
                    name: "PAYMENT_ADMIN_ROLE".to_string(),
                    role_hash: "0x71840dc4906352362b0cdaf79870196c8e42acafade72d5d5a6d59291253ceb1".to_string(),
                    description: "Can manage payment configurations".to_string(),
                    members: vec![],
                },
                ContractRole {
                    name: "TREASURY_ROLE".to_string(),
                    role_hash: "0x3496274819d169b515dd5c514b6e33c5d44c5f5d0e0c5b2b7b7b7b7b7b7b7b7b".to_string(),
                    description: "Can manage treasury operations".to_string(),
                    members: vec![],
                },
            ],
            _ => vec![
                ContractRole {
                    name: "DEFAULT_ADMIN_ROLE".to_string(),
                    role_hash: "0x0000000000000000000000000000000000000000000000000000000000000000".to_string(),
                    description: "Default admin role".to_string(),
                    members: vec![],
                },
            ],
        }
    }

    /// Generate permission configuration for common EchokitBot contracts
    pub fn generate_default_permissions(&self, contract_type: &str) -> Vec<ContractPermission> {
        match contract_type {
            "EchokitBotNFT" => vec![
                ContractPermission {
                    function_name: "mint".to_string(),
                    required_role: "MINTER_ROLE".to_string(),
                    access_level: AccessLevel::OnlyRole("MINTER_ROLE".to_string()),
                },
                ContractPermission {
                    function_name: "pause".to_string(),
                    required_role: "PAUSER_ROLE".to_string(),
                    access_level: AccessLevel::OnlyRole("PAUSER_ROLE".to_string()),
                },
                ContractPermission {
                    function_name: "unpause".to_string(),
                    required_role: "PAUSER_ROLE".to_string(),
                    access_level: AccessLevel::OnlyRole("PAUSER_ROLE".to_string()),
                },
            ],
            "RentalManager" => vec![
                ContractPermission {
                    function_name: "setRentalRate".to_string(),
                    required_role: "RENTAL_ADMIN_ROLE".to_string(),
                    access_level: AccessLevel::OnlyRole("RENTAL_ADMIN_ROLE".to_string()),
                },
                ContractPermission {
                    function_name: "processRental".to_string(),
                    required_role: "OPERATOR_ROLE".to_string(),
                    access_level: AccessLevel::OnlyRole("OPERATOR_ROLE".to_string()),
                },
            ],
            "PaymentProcessor" => vec![
                ContractPermission {
                    function_name: "setPaymentToken".to_string(),
                    required_role: "PAYMENT_ADMIN_ROLE".to_string(),
                    access_level: AccessLevel::OnlyRole("PAYMENT_ADMIN_ROLE".to_string()),
                },
                ContractPermission {
                    function_name: "withdrawTreasury".to_string(),
                    required_role: "TREASURY_ROLE".to_string(),
                    access_level: AccessLevel::OnlyRole("TREASURY_ROLE".to_string()),
                },
            ],
            _ => vec![],
        }
    }

    /// Export registry to JSON
    pub fn export_json(&self) -> Result<String, ContractGeneratorError> {
        serde_json::to_string_pretty(&self)
            .map_err(|e| ContractGeneratorError::RegistryError(
                format!("Failed to export registry: {}", e)
            ))
    }

    /// Import registry from JSON
    pub fn import_json(json: &str) -> Result<Self, ContractGeneratorError> {
        serde_json::from_str(json)
            .map_err(|e| ContractGeneratorError::RegistryError(
                format!("Failed to import registry: {}", e)
            ))
    }
}

/// Platform configuration structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlatformConfiguration {
    pub version: String,
    pub networks: HashMap<String, NetworkConfiguration>,
    pub deployed_contracts: HashMap<String, PlatformContractAddresses>,
    pub global_settings: GlobalSettings,
}

/// Network configuration for platform
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkConfiguration {
    pub name: String,
    pub chain_id: u64,
    pub rpc_url: String,
    pub explorer_url: Option<String>,
    pub is_testnet: bool,
    pub gas_settings: GasSettings,
}

/// Platform contract addresses for a specific network
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlatformContractAddresses {
    pub nft_contract: Option<String>,
    pub rental_manager: Option<String>,
    pub payment_processor: Option<String>,
    pub rwa_vault: Option<String>,
    pub tba_manager: Option<String>,
    pub tba_registry: Option<String>,
}

/// Gas settings for network
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GasSettings {
    pub gas_limit: u64,
    pub gas_price: Option<u64>,
    pub max_fee_per_gas: Option<u64>,
    pub max_priority_fee_per_gas: Option<u64>,
}

/// Global platform settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GlobalSettings {
    pub auto_register_contracts: bool,
    pub auto_configure_roles: bool,
    pub auto_sync_config: bool,
    pub default_admin: Option<String>,
    pub treasury_address: Option<String>,
}

impl Default for PlatformConfiguration {
    fn default() -> Self {
        let mut networks = HashMap::new();
        networks.insert(
            "localhost".to_string(),
            NetworkConfiguration {
                name: "Localhost".to_string(),
                chain_id: 31337,
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
        );

        Self {
            version: "1.0.0".to_string(),
            networks,
            deployed_contracts: HashMap::new(),
            global_settings: GlobalSettings {
                auto_register_contracts: true,
                auto_configure_roles: true,
                auto_sync_config: true,
                default_admin: None,
                treasury_address: None,
            },
        }
    }
}

impl Default for PlatformContractAddresses {
    fn default() -> Self {
        Self {
            nft_contract: None,
            rental_manager: None,
            payment_processor: None,
            rwa_vault: None,
            tba_manager: None,
            tba_registry: None,
        }
    }
}

impl Default for ContractRegistry {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_contract() -> RegisteredContract {
        RegisteredContract {
            name: "TestContract".to_string(),
            address: "0x1234567890123456789012345678901234567890".to_string(),
            network: "localhost".to_string(),
            abi_path: PathBuf::from("test.abi"),
            source_path: PathBuf::from("test.sol"),
            version: "1.0.0".to_string(),
            deployed_at: 1234567890,
            dependencies: vec![],
            metadata: ContractMetadata {
                compiler_version: "0.8.21".to_string(),
                optimization_enabled: true,
                optimization_runs: 200,
                constructor_args: vec![],
                deployment_tx: "0xabcd".to_string(),
                deployer: "0x1111".to_string(),
                roles: vec![],
                permissions: vec![],
                auto_registered: false,
                last_updated: Utc::now(),
            },
        }
    }

    #[test]
    fn test_register_contract() {
        let mut registry = ContractRegistry::new();
        let contract = create_test_contract();
        
        assert!(registry.register(contract.clone()).is_ok());
        assert!(registry.has("TestContract"));
        assert_eq!(registry.get("TestContract").unwrap().name, "TestContract");
    }

    #[test]
    fn test_duplicate_registration() {
        let mut registry = ContractRegistry::new();
        let contract = create_test_contract();
        
        registry.register(contract.clone()).unwrap();
        assert!(registry.register(contract).is_err());
    }

    #[test]
    fn test_unregister_contract() {
        let mut registry = ContractRegistry::new();
        let contract = create_test_contract();
        
        registry.register(contract).unwrap();
        assert!(registry.unregister("TestContract").is_ok());
        assert!(!registry.has("TestContract"));
    }

    #[test]
    fn test_list_by_network() {
        let mut registry = ContractRegistry::new();
        let mut contract1 = create_test_contract();
        contract1.name = "Contract1".to_string();
        contract1.network = "mainnet".to_string();
        
        let mut contract2 = create_test_contract();
        contract2.name = "Contract2".to_string();
        contract2.network = "testnet".to_string();
        
        registry.register(contract1).unwrap();
        registry.register(contract2).unwrap();
        
        let mainnet_contracts = registry.list_by_network("mainnet");
        assert_eq!(mainnet_contracts.len(), 1);
        assert_eq!(mainnet_contracts[0].name, "Contract1");
    }
}
