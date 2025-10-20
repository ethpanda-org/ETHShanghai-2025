//! Role and Permission Management for automatic contract configuration

use crate::error::ContractGeneratorError;
use crate::platform::contract_registry::{ContractRole, ContractPermission, AccessLevel};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use alloy::primitives::{Address, U256};
use alloy::providers::Provider;
use alloy::transports::Transport;
use tracing::{info, warn, error};

/// Role manager for automatic contract role and permission configuration
#[derive(Debug, Clone)]
pub struct RoleManager {
    /// Default admin address
    default_admin: Option<Address>,
    /// Treasury address for financial operations
    treasury_address: Option<Address>,
    /// Role configurations by contract type
    role_configs: HashMap<String, Vec<ContractRole>>,
    /// Permission configurations by contract type
    permission_configs: HashMap<String, Vec<ContractPermission>>,
}

/// Role assignment transaction
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoleAssignment {
    pub contract_address: Address,
    pub role_hash: String,
    pub account: Address,
    pub grant: bool, // true for grant, false for revoke
}

/// Role configuration result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoleConfigResult {
    pub success: bool,
    pub configured_roles: Vec<String>,
    pub assigned_members: Vec<String>,
    pub errors: Vec<String>,
    pub transactions: Vec<String>,
}

impl RoleManager {
    /// Create a new role manager
    pub fn new(default_admin: Option<Address>, treasury_address: Option<Address>) -> Self {
        let mut manager = Self {
            default_admin,
            treasury_address,
            role_configs: HashMap::new(),
            permission_configs: HashMap::new(),
        };

        // Initialize default role configurations
        manager.initialize_default_configs();
        manager
    }

    /// Initialize default role and permission configurations
    fn initialize_default_configs(&mut self) {
        // EchokitBotNFT roles and permissions
        self.role_configs.insert(
            "EchokitBotNFT".to_string(),
            vec![
                ContractRole {
                    name: "DEFAULT_ADMIN_ROLE".to_string(),
                    role_hash: "0x0000000000000000000000000000000000000000000000000000000000000000".to_string(),
                    description: "Default admin role with full access".to_string(),
                    members: vec![],
                },
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
                ContractRole {
                    name: "URI_SETTER_ROLE".to_string(),
                    role_hash: "0x7804d923f43a17d325d77e781528e0793b2edd9890ab45fc64efd7b4b427744c".to_string(),
                    description: "Can set token URIs".to_string(),
                    members: vec![],
                },
            ],
        );

        self.permission_configs.insert(
            "EchokitBotNFT".to_string(),
            vec![
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
                ContractPermission {
                    function_name: "setTokenURI".to_string(),
                    required_role: "URI_SETTER_ROLE".to_string(),
                    access_level: AccessLevel::OnlyRole("URI_SETTER_ROLE".to_string()),
                },
            ],
        );

        // RentalManager roles and permissions
        self.role_configs.insert(
            "RentalManager".to_string(),
            vec![
                ContractRole {
                    name: "DEFAULT_ADMIN_ROLE".to_string(),
                    role_hash: "0x0000000000000000000000000000000000000000000000000000000000000000".to_string(),
                    description: "Default admin role with full access".to_string(),
                    members: vec![],
                },
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
                ContractRole {
                    name: "PAUSER_ROLE".to_string(),
                    role_hash: "0x65d7a28e3265b37a6474929f336521b332c1681b933f6cb9f3376673440d862a".to_string(),
                    description: "Can pause/unpause contract".to_string(),
                    members: vec![],
                },
            ],
        );

        self.permission_configs.insert(
            "RentalManager".to_string(),
            vec![
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
                ContractPermission {
                    function_name: "emergencyStop".to_string(),
                    required_role: "PAUSER_ROLE".to_string(),
                    access_level: AccessLevel::OnlyRole("PAUSER_ROLE".to_string()),
                },
            ],
        );

        // PaymentProcessor roles and permissions
        self.role_configs.insert(
            "PaymentProcessor".to_string(),
            vec![
                ContractRole {
                    name: "DEFAULT_ADMIN_ROLE".to_string(),
                    role_hash: "0x0000000000000000000000000000000000000000000000000000000000000000".to_string(),
                    description: "Default admin role with full access".to_string(),
                    members: vec![],
                },
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
                ContractRole {
                    name: "OPERATOR_ROLE".to_string(),
                    role_hash: "0x97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929".to_string(),
                    description: "Can execute payment operations".to_string(),
                    members: vec![],
                },
            ],
        );

        self.permission_configs.insert(
            "PaymentProcessor".to_string(),
            vec![
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
                ContractPermission {
                    function_name: "processPayment".to_string(),
                    required_role: "OPERATOR_ROLE".to_string(),
                    access_level: AccessLevel::OnlyRole("OPERATOR_ROLE".to_string()),
                },
            ],
        );

        // RWAVault roles and permissions
        self.role_configs.insert(
            "RWAVault".to_string(),
            vec![
                ContractRole {
                    name: "DEFAULT_ADMIN_ROLE".to_string(),
                    role_hash: "0x0000000000000000000000000000000000000000000000000000000000000000".to_string(),
                    description: "Default admin role with full access".to_string(),
                    members: vec![],
                },
                ContractRole {
                    name: "ASSET_MANAGER_ROLE".to_string(),
                    role_hash: "0x12345678901234567890123456789012345678901234567890123456789012".to_string(),
                    description: "Can manage RWA assets".to_string(),
                    members: vec![],
                },
                ContractRole {
                    name: "INVESTOR_ROLE".to_string(),
                    role_hash: "0x23456789012345678901234567890123456789012345678901234567890123".to_string(),
                    description: "Can invest in RWA vault".to_string(),
                    members: vec![],
                },
                ContractRole {
                    name: "TREASURY_ROLE".to_string(),
                    role_hash: "0x3496274819d169b515dd5c514b6e33c5d44c5f5d0e0c5b2b7b7b7b7b7b7b7b7b".to_string(),
                    description: "Can manage treasury operations".to_string(),
                    members: vec![],
                },
            ],
        );

        self.permission_configs.insert(
            "RWAVault".to_string(),
            vec![
                ContractPermission {
                    function_name: "addAsset".to_string(),
                    required_role: "ASSET_MANAGER_ROLE".to_string(),
                    access_level: AccessLevel::OnlyRole("ASSET_MANAGER_ROLE".to_string()),
                },
                ContractPermission {
                    function_name: "removeAsset".to_string(),
                    required_role: "ASSET_MANAGER_ROLE".to_string(),
                    access_level: AccessLevel::OnlyRole("ASSET_MANAGER_ROLE".to_string()),
                },
                ContractPermission {
                    function_name: "invest".to_string(),
                    required_role: "INVESTOR_ROLE".to_string(),
                    access_level: AccessLevel::OnlyRole("INVESTOR_ROLE".to_string()),
                },
                ContractPermission {
                    function_name: "withdraw".to_string(),
                    required_role: "TREASURY_ROLE".to_string(),
                    access_level: AccessLevel::OnlyRole("TREASURY_ROLE".to_string()),
                },
            ],
        );
    }

    /// Configure roles for a specific contract
    pub async fn configure_contract_roles<T: Transport + Clone, P: Provider<T>>(
        &mut self,
        contract_type: &str,
        contract_address: Address,
        provider: &P,
        deployer_address: Address,
    ) -> Result<RoleConfigResult, ContractGeneratorError> {
        let mut result = RoleConfigResult {
            success: true,
            configured_roles: vec![],
            assigned_members: vec![],
            errors: vec![],
            transactions: vec![],
        };

        // Get role configuration for contract type
        let roles = self.role_configs.get(contract_type)
            .ok_or_else(|| ContractGeneratorError::ConfigError(
                format!("No role configuration found for contract type: {}", contract_type)
            ))?
            .clone();

        // Configure each role
        for mut role in roles {
            // Assign default members based on role type
            self.assign_default_members(&mut role, deployer_address);

            // Grant roles to members
            for member_str in &role.members {
                if let Ok(member_address) = member_str.parse::<Address>() {
                    match self.grant_role(
                        contract_address,
                        &role.role_hash,
                        member_address,
                        provider,
                    ).await {
                        Ok(tx_hash) => {
                            result.configured_roles.push(role.name.clone());
                            result.assigned_members.push(format!("{}:{}", role.name, member_str));
                            result.transactions.push(tx_hash);
                            info!("Granted role {} to {} on contract {}", 
                                  role.name, member_str, contract_address);
                        }
                        Err(e) => {
                            result.errors.push(format!("Failed to grant role {}: {}", role.name, e));
                            result.success = false;
                            error!("Failed to grant role {} to {}: {}", role.name, member_str, e);
                        }
                    }
                } else {
                    result.errors.push(format!("Invalid address format: {}", member_str));
                    result.success = false;
                }
            }
        }

        Ok(result)
    }

    /// Assign default members to a role based on role type and available addresses
    fn assign_default_members(&self, role: &mut ContractRole, deployer_address: Address) {
        match role.name.as_str() {
            "DEFAULT_ADMIN_ROLE" => {
                // Always assign deployer as default admin
                role.members.push(deployer_address.to_string());
                
                // Also assign configured default admin if available
                if let Some(admin) = &self.default_admin {
                    if *admin != deployer_address {
                        role.members.push(admin.to_string());
                    }
                }
            }
            "TREASURY_ROLE" => {
                // Assign treasury address if configured
                if let Some(treasury) = &self.treasury_address {
                    role.members.push(treasury.to_string());
                } else {
                    // Fallback to deployer
                    role.members.push(deployer_address.to_string());
                }
            }
            "MINTER_ROLE" | "RENTAL_ADMIN_ROLE" | "PAYMENT_ADMIN_ROLE" | "ASSET_MANAGER_ROLE" => {
                // Assign admin roles to default admin or deployer
                if let Some(admin) = &self.default_admin {
                    role.members.push(admin.to_string());
                } else {
                    role.members.push(deployer_address.to_string());
                }
            }
            "OPERATOR_ROLE" => {
                // Assign operator role to deployer by default
                role.members.push(deployer_address.to_string());
            }
            "PAUSER_ROLE" => {
                // Assign pauser role to admin addresses
                if let Some(admin) = &self.default_admin {
                    role.members.push(admin.to_string());
                }
                role.members.push(deployer_address.to_string());
            }
            "INVESTOR_ROLE" => {
                // Investor role is typically assigned dynamically, not at deployment
                // Leave empty for now
            }
            _ => {
                // For unknown roles, assign to deployer
                role.members.push(deployer_address.to_string());
            }
        }
    }

    /// Grant a role to an account (placeholder for actual blockchain interaction)
    async fn grant_role<T: Transport + Clone, P: Provider<T>>(
        &self,
        contract_address: Address,
        role_hash: &str,
        account: Address,
        _provider: &P,
    ) -> Result<String, ContractGeneratorError> {
        // This is a placeholder implementation
        // In a real implementation, this would:
        // 1. Create the grantRole transaction
        // 2. Sign and send the transaction
        // 3. Wait for confirmation
        // 4. Return the transaction hash

        info!("Granting role {} to {} on contract {}", role_hash, account, contract_address);
        
        // For now, return a mock transaction hash
        Ok(format!("0x{:x}", rand::random::<u64>()))
    }

    /// Revoke a role from an account (placeholder for actual blockchain interaction)
    async fn revoke_role<T: Transport + Clone, P: Provider<T>>(
        &self,
        contract_address: Address,
        role_hash: &str,
        account: Address,
        _provider: &P,
    ) -> Result<String, ContractGeneratorError> {
        // This is a placeholder implementation
        // In a real implementation, this would:
        // 1. Create the revokeRole transaction
        // 2. Sign and send the transaction
        // 3. Wait for confirmation
        // 4. Return the transaction hash

        info!("Revoking role {} from {} on contract {}", role_hash, account, contract_address);
        
        // For now, return a mock transaction hash
        Ok(format!("0x{:x}", rand::random::<u64>()))
    }

    /// Get role configuration for a contract type
    pub fn get_role_config(&self, contract_type: &str) -> Option<&Vec<ContractRole>> {
        self.role_configs.get(contract_type)
    }

    /// Get permission configuration for a contract type
    pub fn get_permission_config(&self, contract_type: &str) -> Option<&Vec<ContractPermission>> {
        self.permission_configs.get(contract_type)
    }

    /// Add custom role configuration
    pub fn add_role_config(&mut self, contract_type: String, roles: Vec<ContractRole>) {
        self.role_configs.insert(contract_type, roles);
    }

    /// Add custom permission configuration
    pub fn add_permission_config(&mut self, contract_type: String, permissions: Vec<ContractPermission>) {
        self.permission_configs.insert(contract_type, permissions);
    }

    /// Generate role assignment script for deployment
    pub fn generate_role_assignment_script(&self, contract_type: &str, contract_address: Address) -> String {
        let mut script = String::new();
        script.push_str("// Auto-generated role assignment script\n");
        script.push_str(&format!("// Contract: {} at {}\n\n", contract_type, contract_address));

        if let Some(roles) = self.role_configs.get(contract_type) {
            for role in roles {
                script.push_str(&format!("// Configure {} ({})\n", role.name, role.description));
                for member in &role.members {
                    script.push_str(&format!(
                        "contract.grantRole({}, {});\n",
                        role.role_hash,
                        member
                    ));
                }
                script.push_str("\n");
            }
        }

        script
    }

    /// Validate role configuration
    pub fn validate_role_config(&self, contract_type: &str) -> Result<(), ContractGeneratorError> {
        // Check if role configuration exists
        let roles = self.role_configs.get(contract_type)
            .ok_or_else(|| ContractGeneratorError::ConfigError(
                format!("No role configuration for contract type: {}", contract_type)
            ))?;

        // Validate that DEFAULT_ADMIN_ROLE exists
        if !roles.iter().any(|r| r.name == "DEFAULT_ADMIN_ROLE") {
            return Err(ContractGeneratorError::ConfigError(
                "DEFAULT_ADMIN_ROLE must be configured for all contracts".to_string()
            ));
        }

        // Validate role hash formats
        for role in roles {
            if !role.role_hash.starts_with("0x") || role.role_hash.len() != 66 {
                return Err(ContractGeneratorError::ConfigError(
                    format!("Invalid role hash format for {}: {}", role.name, role.role_hash)
                ));
            }
        }

        Ok(())
    }

    /// Set default admin address
    pub fn set_default_admin(&mut self, admin: Address) {
        self.default_admin = Some(admin);
    }

    /// Set treasury address
    pub fn set_treasury_address(&mut self, treasury: Address) {
        self.treasury_address = Some(treasury);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_role_manager_creation() {
        let admin = "0x1234567890123456789012345678901234567890".parse().unwrap();
        let treasury = "0x0987654321098765432109876543210987654321".parse().unwrap();
        
        let manager = RoleManager::new(Some(admin), Some(treasury));
        
        assert!(manager.role_configs.contains_key("EchokitBotNFT"));
        assert!(manager.role_configs.contains_key("RentalManager"));
        assert!(manager.role_configs.contains_key("PaymentProcessor"));
        assert!(manager.role_configs.contains_key("RWAVault"));
    }

    #[test]
    fn test_role_config_validation() {
        let manager = RoleManager::new(None, None);
        
        // Should pass for existing contract types
        assert!(manager.validate_role_config("EchokitBotNFT").is_ok());
        assert!(manager.validate_role_config("RentalManager").is_ok());
        
        // Should fail for non-existent contract types
        assert!(manager.validate_role_config("NonExistentContract").is_err());
    }

    #[test]
    fn test_role_assignment_script_generation() {
        let admin = "0x1234567890123456789012345678901234567890".parse().unwrap();
        let mut manager = RoleManager::new(Some(admin), None);
        let contract_address = "0x1234567890123456789012345678901234567890".parse().unwrap();
        
        // Assign members to roles first
        if let Some(roles) = manager.role_configs.get_mut("EchokitBotNFT") {
            for role in roles {
                if role.name == "DEFAULT_ADMIN_ROLE" {
                    role.members.push(admin.to_string());
                }
            }
        }
        
        let script = manager.generate_role_assignment_script("EchokitBotNFT", contract_address);
        
        println!("Generated script: {}", script);
        assert!(script.contains("grantRole"));
        assert!(script.contains("EchokitBotNFT"));
        assert!(script.contains(&contract_address.to_string()));
    }
}