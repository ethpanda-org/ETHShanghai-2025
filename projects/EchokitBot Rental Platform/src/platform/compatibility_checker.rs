use crate::error::ContractGeneratorError;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

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
    pub state_variables: Vec<StateVariable>,
}

/// Function signature
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct FunctionSignature {
    pub name: String,
    pub inputs: Vec<Parameter>,
    pub outputs: Vec<Parameter>,
    pub visibility: Visibility,
    pub mutability: Mutability,
}

/// Event signature
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct EventSignature {
    pub name: String,
    pub inputs: Vec<Parameter>,
    pub indexed_count: usize,
}

/// State variable
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct StateVariable {
    pub name: String,
    pub type_name: String,
    pub visibility: Visibility,
}

/// Parameter definition
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Parameter {
    pub name: String,
    pub type_name: String,
}

/// Function visibility
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum Visibility {
    Public,
    External,
    Internal,
    Private,
}

/// Function mutability
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum Mutability {
    Pure,
    View,
    Payable,
    NonPayable,
}

/// Compatibility report
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompatibilityReport {
    pub is_compatible: bool,
    pub breaking_changes: Vec<BreakingChange>,
    pub warnings: Vec<Warning>,
    pub additions: Vec<Addition>,
    pub compatibility_score: f64,
}

/// Breaking change
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BreakingChange {
    pub category: ChangeCategory,
    pub description: String,
    pub severity: Severity,
    pub affected_item: String,
}

/// Warning
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Warning {
    pub category: ChangeCategory,
    pub description: String,
    pub recommendation: String,
}

/// Addition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Addition {
    pub category: ChangeCategory,
    pub description: String,
    pub item_name: String,
}

/// Change category
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ChangeCategory {
    Function,
    Event,
    StateVariable,
    Modifier,
    Interface,
}

/// Severity level
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum Severity {
    Critical,
    High,
    Medium,
    Low,
}

impl CompatibilityChecker {
    /// Create a new compatibility checker
    pub fn new() -> Self {
        Self {
            interfaces: HashMap::new(),
        }
    }

    /// Register a contract interface
    pub fn register_interface(&mut self, interface: ContractInterface) {
        self.interfaces.insert(interface.name.clone(), interface);
    }

    /// Load platform contract interfaces
    pub fn load_platform_interfaces(&mut self) {
        // Register EchokitBotNFT interface
        self.register_interface(Self::create_nft_interface());
        
        // Register RentalManager interface
        self.register_interface(Self::create_rental_manager_interface());
        
        // Register PaymentProcessor interface
        self.register_interface(Self::create_payment_processor_interface());
        
        // Register RWAVault interface
        self.register_interface(Self::create_rwa_vault_interface());
    }

    /// Check compatibility between two contracts
    pub async fn check_compatibility(
        &self,
        old_contract: &str,
        new_contract: &str,
    ) -> Result<CompatibilityReport, ContractGeneratorError> {
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
            compatibility_score: 100.0,
        };

        // Check functions
        self.check_functions(old_interface, new_interface, &mut report);
        
        // Check events
        self.check_events(old_interface, new_interface, &mut report);
        
        // Check state variables
        self.check_state_variables(old_interface, new_interface, &mut report);

        // Calculate compatibility score
        report.compatibility_score = self.calculate_compatibility_score(&report);

        Ok(report)
    }

    /// Check function compatibility
    fn check_functions(
        &self,
        old_interface: &ContractInterface,
        new_interface: &ContractInterface,
        report: &mut CompatibilityReport,
    ) {
        // Check for removed or modified functions
        for old_func in &old_interface.functions {
            if let Some(new_func) = new_interface.functions.iter().find(|f| f.name == old_func.name) {
                // Check if signature changed
                if old_func.inputs != new_func.inputs {
                    report.is_compatible = false;
                    report.breaking_changes.push(BreakingChange {
                        category: ChangeCategory::Function,
                        description: format!(
                            "Function '{}' input parameters changed",
                            old_func.name
                        ),
                        severity: Severity::Critical,
                        affected_item: old_func.name.clone(),
                    });
                }

                if old_func.outputs != new_func.outputs {
                    report.is_compatible = false;
                    report.breaking_changes.push(BreakingChange {
                        category: ChangeCategory::Function,
                        description: format!(
                            "Function '{}' return values changed",
                            old_func.name
                        ),
                        severity: Severity::High,
                        affected_item: old_func.name.clone(),
                    });
                }

                // Check visibility changes
                if old_func.visibility != new_func.visibility {
                    let severity = match (&old_func.visibility, &new_func.visibility) {
                        (Visibility::Public, _) | (Visibility::External, _) => Severity::Critical,
                        _ => Severity::Medium,
                    };

                    let is_critical = severity == Severity::Critical;
                    
                    report.breaking_changes.push(BreakingChange {
                        category: ChangeCategory::Function,
                        description: format!(
                            "Function '{}' visibility changed from {:?} to {:?}",
                            old_func.name, old_func.visibility, new_func.visibility
                        ),
                        severity,
                        affected_item: old_func.name.clone(),
                    });

                    if is_critical {
                        report.is_compatible = false;
                    }
                }

                // Check mutability changes
                if old_func.mutability != new_func.mutability {
                    report.warnings.push(Warning {
                        category: ChangeCategory::Function,
                        description: format!(
                            "Function '{}' mutability changed from {:?} to {:?}",
                            old_func.name, old_func.mutability, new_func.mutability
                        ),
                        recommendation: "Verify that callers handle the new mutability correctly".to_string(),
                    });
                }
            } else {
                // Function was removed
                report.is_compatible = false;
                report.breaking_changes.push(BreakingChange {
                    category: ChangeCategory::Function,
                    description: format!("Function '{}' was removed", old_func.name),
                    severity: Severity::Critical,
                    affected_item: old_func.name.clone(),
                });
            }
        }

        // Check for new functions
        for new_func in &new_interface.functions {
            if !old_interface.functions.iter().any(|f| f.name == new_func.name) {
                report.additions.push(Addition {
                    category: ChangeCategory::Function,
                    description: format!(
                        "New function '{}' added with visibility {:?}",
                        new_func.name, new_func.visibility
                    ),
                    item_name: new_func.name.clone(),
                });
            }
        }
    }

    /// Check event compatibility
    fn check_events(
        &self,
        old_interface: &ContractInterface,
        new_interface: &ContractInterface,
        report: &mut CompatibilityReport,
    ) {
        // Check for removed or modified events
        for old_event in &old_interface.events {
            if let Some(new_event) = new_interface.events.iter().find(|e| e.name == old_event.name) {
                if old_event.inputs != new_event.inputs || old_event.indexed_count != new_event.indexed_count {
                    report.warnings.push(Warning {
                        category: ChangeCategory::Event,
                        description: format!("Event '{}' signature changed", old_event.name),
                        recommendation: "Update event listeners to handle the new signature".to_string(),
                    });
                }
            } else {
                report.warnings.push(Warning {
                    category: ChangeCategory::Event,
                    description: format!("Event '{}' was removed", old_event.name),
                    recommendation: "Remove or update event listeners".to_string(),
                });
            }
        }

        // Check for new events
        for new_event in &new_interface.events {
            if !old_interface.events.iter().any(|e| e.name == new_event.name) {
                report.additions.push(Addition {
                    category: ChangeCategory::Event,
                    description: format!("New event '{}' added", new_event.name),
                    item_name: new_event.name.clone(),
                });
            }
        }
    }

    /// Check state variable compatibility
    fn check_state_variables(
        &self,
        old_interface: &ContractInterface,
        new_interface: &ContractInterface,
        report: &mut CompatibilityReport,
    ) {
        // Check for removed or modified state variables
        for old_var in &old_interface.state_variables {
            if let Some(new_var) = new_interface.state_variables.iter().find(|v| v.name == old_var.name) {
                if old_var.type_name != new_var.type_name {
                    report.is_compatible = false;
                    report.breaking_changes.push(BreakingChange {
                        category: ChangeCategory::StateVariable,
                        description: format!(
                            "State variable '{}' type changed from {} to {}",
                            old_var.name, old_var.type_name, new_var.type_name
                        ),
                        severity: Severity::Critical,
                        affected_item: old_var.name.clone(),
                    });
                }

                if old_var.visibility != new_var.visibility {
                    report.warnings.push(Warning {
                        category: ChangeCategory::StateVariable,
                        description: format!(
                            "State variable '{}' visibility changed",
                            old_var.name
                        ),
                        recommendation: "Verify access patterns are still valid".to_string(),
                    });
                }
            } else {
                report.warnings.push(Warning {
                    category: ChangeCategory::StateVariable,
                    description: format!("State variable '{}' was removed", old_var.name),
                    recommendation: "Ensure no external dependencies on this variable".to_string(),
                });
            }
        }

        // Check for new state variables
        for new_var in &new_interface.state_variables {
            if !old_interface.state_variables.iter().any(|v| v.name == new_var.name) {
                report.additions.push(Addition {
                    category: ChangeCategory::StateVariable,
                    description: format!("New state variable '{}' of type {}", new_var.name, new_var.type_name),
                    item_name: new_var.name.clone(),
                });
            }
        }
    }

    /// Calculate compatibility score
    fn calculate_compatibility_score(&self, report: &CompatibilityReport) -> f64 {
        let mut score = 100.0;

        // Deduct points for breaking changes
        for change in &report.breaking_changes {
            score -= match change.severity {
                Severity::Critical => 25.0,
                Severity::High => 15.0,
                Severity::Medium => 10.0,
                Severity::Low => 5.0,
            };
        }

        // Deduct points for warnings
        score -= report.warnings.len() as f64 * 2.0;

        score.max(0.0)
    }

    // Platform interface definitions
    fn create_nft_interface() -> ContractInterface {
        ContractInterface {
            name: "EchokitBotNFT".to_string(),
            functions: vec![
                FunctionSignature {
                    name: "mintDevice".to_string(),
                    inputs: vec![
                        Parameter { name: "to".to_string(), type_name: "address".to_string() },
                        Parameter { name: "deviceId".to_string(), type_name: "string".to_string() },
                        Parameter { name: "model".to_string(), type_name: "string".to_string() },
                        Parameter { name: "serialNumber".to_string(), type_name: "string".to_string() },
                        Parameter { name: "tokenMetadataURI".to_string(), type_name: "string".to_string() },
                    ],
                    outputs: vec![Parameter { name: "tokenId".to_string(), type_name: "uint256".to_string() }],
                    visibility: Visibility::Public,
                    mutability: Mutability::NonPayable,
                },
                FunctionSignature {
                    name: "ownerOf".to_string(),
                    inputs: vec![Parameter { name: "tokenId".to_string(), type_name: "uint256".to_string() }],
                    outputs: vec![Parameter { name: "owner".to_string(), type_name: "address".to_string() }],
                    visibility: Visibility::Public,
                    mutability: Mutability::View,
                },
                FunctionSignature {
                    name: "isDeviceRentable".to_string(),
                    inputs: vec![Parameter { name: "tokenId".to_string(), type_name: "uint256".to_string() }],
                    outputs: vec![Parameter { name: "rentable".to_string(), type_name: "bool".to_string() }],
                    visibility: Visibility::Public,
                    mutability: Mutability::View,
                },
            ],
            events: vec![
                EventSignature {
                    name: "DeviceRegistered".to_string(),
                    inputs: vec![
                        Parameter { name: "tokenId".to_string(), type_name: "uint256".to_string() },
                        Parameter { name: "deviceId".to_string(), type_name: "string".to_string() },
                        Parameter { name: "owner".to_string(), type_name: "address".to_string() },
                    ],
                    indexed_count: 3,
                },
            ],
            state_variables: vec![],
        }
    }

    fn create_rental_manager_interface() -> ContractInterface {
        ContractInterface {
            name: "RentalManager".to_string(),
            functions: vec![
                FunctionSignature {
                    name: "createRentalContract".to_string(),
                    inputs: vec![
                        Parameter { name: "deviceId".to_string(), type_name: "uint256".to_string() },
                        Parameter { name: "durationHours".to_string(), type_name: "uint256".to_string() },
                    ],
                    outputs: vec![Parameter { name: "rentalId".to_string(), type_name: "uint256".to_string() }],
                    visibility: Visibility::External,
                    mutability: Mutability::Payable,
                },
                FunctionSignature {
                    name: "completeRental".to_string(),
                    inputs: vec![Parameter { name: "rentalId".to_string(), type_name: "uint256".to_string() }],
                    outputs: vec![],
                    visibility: Visibility::External,
                    mutability: Mutability::NonPayable,
                },
            ],
            events: vec![
                EventSignature {
                    name: "RentalContractCreated".to_string(),
                    inputs: vec![
                        Parameter { name: "rentalId".to_string(), type_name: "uint256".to_string() },
                        Parameter { name: "deviceId".to_string(), type_name: "uint256".to_string() },
                        Parameter { name: "renter".to_string(), type_name: "address".to_string() },
                    ],
                    indexed_count: 3,
                },
            ],
            state_variables: vec![],
        }
    }

    fn create_payment_processor_interface() -> ContractInterface {
        ContractInterface {
            name: "PaymentProcessor".to_string(),
            functions: vec![
                FunctionSignature {
                    name: "processPayment".to_string(),
                    inputs: vec![
                        Parameter { name: "recipient".to_string(), type_name: "address".to_string() },
                        Parameter { name: "currency".to_string(), type_name: "address".to_string() },
                        Parameter { name: "amount".to_string(), type_name: "uint256".to_string() },
                        Parameter { name: "externalRef".to_string(), type_name: "bytes32".to_string() },
                    ],
                    outputs: vec![Parameter { name: "paymentId".to_string(), type_name: "uint256".to_string() }],
                    visibility: Visibility::External,
                    mutability: Mutability::Payable,
                },
            ],
            events: vec![
                EventSignature {
                    name: "PaymentProcessed".to_string(),
                    inputs: vec![
                        Parameter { name: "paymentId".to_string(), type_name: "uint256".to_string() },
                        Parameter { name: "payer".to_string(), type_name: "address".to_string() },
                        Parameter { name: "recipient".to_string(), type_name: "address".to_string() },
                    ],
                    indexed_count: 3,
                },
            ],
            state_variables: vec![],
        }
    }

    fn create_rwa_vault_interface() -> ContractInterface {
        ContractInterface {
            name: "RWAVault".to_string(),
            functions: vec![
                FunctionSignature {
                    name: "deposit".to_string(),
                    inputs: vec![
                        Parameter { name: "assets".to_string(), type_name: "uint256".to_string() },
                        Parameter { name: "receiver".to_string(), type_name: "address".to_string() },
                    ],
                    outputs: vec![Parameter { name: "shares".to_string(), type_name: "uint256".to_string() }],
                    visibility: Visibility::Public,
                    mutability: Mutability::NonPayable,
                },
                FunctionSignature {
                    name: "withdraw".to_string(),
                    inputs: vec![
                        Parameter { name: "assets".to_string(), type_name: "uint256".to_string() },
                        Parameter { name: "receiver".to_string(), type_name: "address".to_string() },
                        Parameter { name: "owner".to_string(), type_name: "address".to_string() },
                    ],
                    outputs: vec![Parameter { name: "shares".to_string(), type_name: "uint256".to_string() }],
                    visibility: Visibility::Public,
                    mutability: Mutability::NonPayable,
                },
            ],
            events: vec![
                EventSignature {
                    name: "YieldDistributed".to_string(),
                    inputs: vec![
                        Parameter { name: "amount".to_string(), type_name: "uint256".to_string() },
                        Parameter { name: "timestamp".to_string(), type_name: "uint256".to_string() },
                    ],
                    indexed_count: 0,
                },
            ],
            state_variables: vec![],
        }
    }
}

impl Default for CompatibilityChecker {
    fn default() -> Self {
        let mut checker = Self::new();
        checker.load_platform_interfaces();
        checker
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_function_compatibility() {
        let checker = CompatibilityChecker::default();
        
        // Test that platform interfaces are loaded
        assert!(checker.interfaces.contains_key("EchokitBotNFT"));
        assert!(checker.interfaces.contains_key("RentalManager"));
        assert!(checker.interfaces.contains_key("PaymentProcessor"));
        assert!(checker.interfaces.contains_key("RWAVault"));
    }
}
