use crate::error::ContractGeneratorError;
use crate::types::{ContractBlueprint, ContractGenerationResult};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

/// Platform integration for EchokitBot contracts
#[derive(Debug, Clone)]
pub struct PlatformIntegration {
    /// Contract registry for tracking deployed contracts
    registry: ContractRegistry,
    /// Dependency manager for contract relationships
    dependency_manager: DependencyManager,
    /// Compatibility checker for upgrades
    compatibility_checker: CompatibilityChecker,
    /// Configuration for platform contracts
    config: PlatformConfig,
}

/// Configuration for platform integration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlatformConfig {
    /// Path to contracts directory
    pub contracts_dir: PathBuf,
    /// Network configurations
    pub networks: HashMap<String, NetworkConfig>,
    /// Deployed contract addresses
    pub deployed_contracts: HashMap<String, ContractAddresses>,
}

/// Network configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkConfig {
    pub name: String,
    pub chain_id: u64,
    pub rpc_url: String,
    pub explorer_url: String,
}

/// Contract addresses for a network
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContractAddresses {
    pub nft_contract: Option<String>,
    pub rental_manager: Option<String>,
    pub payment_processor: Option<String>,
    pub rwa_vault: Option<String>,
    pub tba_manager: Option<String>,
    pub tba_registry: Option<String>,
}

/// Contract registry entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContractRegistry {
    /// Registered contracts by name
    contracts: HashMap<String, RegisteredContract>,
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
}

/// Dependency manager for contract relationships
#[derive(Debug, Clone)]
pub struct DependencyManager {
    /// Dependency graph
    dependencies: HashMap<String, Vec<String>>,
}

/// Compatibility checker for contract upgrades
#[derive(Debug, Clone)]
pub struct CompatibilityChecker {
    /// Known contract interfaces
    interfaces: HashMap<String, ContractInterface>,
}

/// Contract interface definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContractInterface {
    pub name: String,
    pub functions: Vec<FunctionSignature>,
    pub events: Vec<EventSignature>,
}

/// Function signature
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FunctionSignature {
    pub name: String,
    pub inputs: Vec<String>,
    pub outputs: Vec<String>,
    pub visibility: String,
    pub mutability: String,
}

/// Event signature
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventSignature {
    pub name: String,
    pub inputs: Vec<String>,
}

impl PlatformIntegration {
    /// Create a new platform integration instance
    pub fn new(config: PlatformConfig) -> Result<Self, ContractGeneratorError> {
        Ok(Self {
            registry: ContractRegistry::new(),
            dependency_manager: DependencyManager::new(),
            compatibility_checker: CompatibilityChecker::new(),
            config,
        })
    }

    /// Load configuration from file
    pub async fn load_config(path: &PathBuf) -> Result<PlatformConfig, ContractGeneratorError> {
        let content = tokio::fs::read_to_string(path).await
            .map_err(|e| ContractGeneratorError::ConfigError(format!("Failed to read config: {}", e)))?;
        
        let config: PlatformConfig = toml::from_str(&content)
            .map_err(|e| ContractGeneratorError::ConfigError(format!("Failed to parse config: {}", e)))?;
        
        Ok(config)
    }

    /// Get contract addresses for a network
    pub fn get_contract_addresses(&self, network: &str) -> Option<&ContractAddresses> {
        self.config.deployed_contracts.get(network)
    }

    /// Register a new contract
    pub async fn register_contract(
        &mut self,
        contract: RegisteredContract,
    ) -> Result<(), ContractGeneratorError> {
        self.registry.register(contract)?;
        Ok(())
    }

    /// Get registered contract by name
    pub fn get_contract(&self, name: &str) -> Option<&RegisteredContract> {
        self.registry.get(name)
    }

    /// Check if contract exists
    pub fn has_contract(&self, name: &str) -> bool {
        self.registry.has(name)
    }

    /// Add contract dependency
    pub fn add_dependency(&mut self, contract: &str, dependency: &str) -> Result<(), ContractGeneratorError> {
        self.dependency_manager.add_dependency(contract, dependency)
    }

    /// Get contract dependencies
    pub fn get_dependencies(&self, contract: &str) -> Vec<String> {
        self.dependency_manager.get_dependencies(contract)
    }

    /// Check contract compatibility
    pub async fn check_compatibility(
        &self,
        old_contract: &str,
        new_contract: &str,
    ) -> Result<CompatibilityReport, ContractGeneratorError> {
        self.compatibility_checker.check_compatibility(old_contract, new_contract).await
    }

    /// Generate integration code for existing contracts
    pub async fn generate_integration_code(
        &self,
        blueprint: &ContractBlueprint,
    ) -> Result<String, ContractGeneratorError> {
        let mut integration_code = String::new();

        // Add imports for existing contracts based on platform integration config
        if let Some(platform_config) = &blueprint.platform_integration {
            if platform_config.integrates_with_nft {
                integration_code.push_str("import \"./EchokitBotNFT.sol\";\n");
            }
            if platform_config.integrates_with_rental {
                integration_code.push_str("import \"./RentalManager.sol\";\n");
            }
            if platform_config.integrates_with_payment {
                integration_code.push_str("import \"./PaymentProcessor.sol\";\n");
            }
            if platform_config.integrates_with_rwa {
                integration_code.push_str("import \"./RWAVault.sol\";\n");
            }

            // Add contract references
            integration_code.push_str("\n// Platform contract references\n");
            
            if platform_config.integrates_with_nft {
                integration_code.push_str("EchokitBotNFT public immutable nftContract;\n");
            }
            if platform_config.integrates_with_rental {
                integration_code.push_str("RentalManager public immutable rentalManager;\n");
            }
            if platform_config.integrates_with_payment {
                integration_code.push_str("PaymentProcessor public immutable paymentProcessor;\n");
            }
            if platform_config.integrates_with_rwa {
                integration_code.push_str("RWAVault public immutable rwaVault;\n");
            }
        }

        Ok(integration_code)
    }

    /// Update platform configuration file
    pub async fn update_config(&self, path: &PathBuf) -> Result<(), ContractGeneratorError> {
        let content = toml::to_string_pretty(&self.config)
            .map_err(|e| ContractGeneratorError::ConfigError(format!("Failed to serialize config: {}", e)))?;
        
        tokio::fs::write(path, content).await
            .map_err(|e| ContractGeneratorError::ConfigError(format!("Failed to write config: {}", e)))?;
        
        Ok(())
    }
}

impl ContractRegistry {
    pub fn new() -> Self {
        Self {
            contracts: HashMap::new(),
        }
    }

    pub fn register(&mut self, contract: RegisteredContract) -> Result<(), ContractGeneratorError> {
        if self.contracts.contains_key(&contract.name) {
            return Err(ContractGeneratorError::RegistryError(
                format!("Contract {} already registered", contract.name)
            ));
        }
        self.contracts.insert(contract.name.clone(), contract);
        Ok(())
    }

    pub fn get(&self, name: &str) -> Option<&RegisteredContract> {
        self.contracts.get(name)
    }

    pub fn has(&self, name: &str) -> bool {
        self.contracts.contains_key(name)
    }

    pub fn list(&self) -> Vec<&RegisteredContract> {
        self.contracts.values().collect()
    }
}

impl DependencyManager {
    pub fn new() -> Self {
        Self {
            dependencies: HashMap::new(),
        }
    }

    pub fn add_dependency(&mut self, contract: &str, dependency: &str) -> Result<(), ContractGeneratorError> {
        // Check for circular dependencies
        if self.has_circular_dependency(contract, dependency) {
            return Err(ContractGeneratorError::DependencyError(
                format!("Circular dependency detected: {} -> {}", contract, dependency)
            ));
        }

        self.dependencies
            .entry(contract.to_string())
            .or_insert_with(Vec::new)
            .push(dependency.to_string());
        
        Ok(())
    }

    pub fn get_dependencies(&self, contract: &str) -> Vec<String> {
        self.dependencies
            .get(contract)
            .cloned()
            .unwrap_or_default()
    }

    pub fn get_all_dependencies(&self, contract: &str) -> Vec<String> {
        let mut all_deps = Vec::new();
        let mut to_process = vec![contract.to_string()];
        let mut processed = std::collections::HashSet::new();

        while let Some(current) = to_process.pop() {
            if processed.contains(&current) {
                continue;
            }
            processed.insert(current.clone());

            if let Some(deps) = self.dependencies.get(&current) {
                for dep in deps {
                    if !all_deps.contains(dep) {
                        all_deps.push(dep.clone());
                    }
                    to_process.push(dep.clone());
                }
            }
        }

        all_deps
    }

    fn has_circular_dependency(&self, contract: &str, new_dependency: &str) -> bool {
        if contract == new_dependency {
            return true;
        }

        let deps = self.get_all_dependencies(new_dependency);
        deps.contains(&contract.to_string())
    }
}

impl CompatibilityChecker {
    pub fn new() -> Self {
        Self {
            interfaces: HashMap::new(),
        }
    }

    pub fn register_interface(&mut self, interface: ContractInterface) {
        self.interfaces.insert(interface.name.clone(), interface);
    }

    pub async fn check_compatibility(
        &self,
        old_contract: &str,
        new_contract: &str,
    ) -> Result<CompatibilityReport, ContractGeneratorError> {
        // Load contract interfaces
        let old_interface = self.interfaces.get(old_contract)
            .ok_or_else(|| ContractGeneratorError::CompatibilityError(
                format!("Interface not found for {}", old_contract)
            ))?;
        
        let new_interface = self.interfaces.get(new_contract)
            .ok_or_else(|| ContractGeneratorError::CompatibilityError(
                format!("Interface not found for {}", new_contract)
            ))?;

        let mut report = CompatibilityReport {
            is_compatible: true,
            breaking_changes: Vec::new(),
            warnings: Vec::new(),
            additions: Vec::new(),
        };

        // Check for removed or modified functions
        for old_func in &old_interface.functions {
            if let Some(new_func) = new_interface.functions.iter().find(|f| f.name == old_func.name) {
                if old_func.inputs != new_func.inputs || old_func.outputs != new_func.outputs {
                    report.is_compatible = false;
                    report.breaking_changes.push(format!(
                        "Function signature changed: {}",
                        old_func.name
                    ));
                }
            } else {
                report.is_compatible = false;
                report.breaking_changes.push(format!(
                    "Function removed: {}",
                    old_func.name
                ));
            }
        }

        // Check for new functions
        for new_func in &new_interface.functions {
            if !old_interface.functions.iter().any(|f| f.name == new_func.name) {
                report.additions.push(format!(
                    "New function added: {}",
                    new_func.name
                ));
            }
        }

        Ok(report)
    }
}

/// Compatibility report
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompatibilityReport {
    pub is_compatible: bool,
    pub breaking_changes: Vec<String>,
    pub warnings: Vec<String>,
    pub additions: Vec<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_dependency_manager() {
        let mut manager = DependencyManager::new();
        
        manager.add_dependency("ContractA", "ContractB").unwrap();
        manager.add_dependency("ContractB", "ContractC").unwrap();
        
        let deps = manager.get_all_dependencies("ContractA");
        assert_eq!(deps.len(), 2);
        assert!(deps.contains(&"ContractB".to_string()));
        assert!(deps.contains(&"ContractC".to_string()));
    }

    #[test]
    fn test_circular_dependency_detection() {
        let mut manager = DependencyManager::new();
        
        manager.add_dependency("ContractA", "ContractB").unwrap();
        manager.add_dependency("ContractB", "ContractC").unwrap();
        
        let result = manager.add_dependency("ContractC", "ContractA");
        assert!(result.is_err());
    }
}
