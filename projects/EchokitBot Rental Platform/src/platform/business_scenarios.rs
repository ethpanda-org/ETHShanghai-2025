use crate::error::ContractGeneratorError;
use crate::types::{ContractBlueprint, ContractType, FunctionSpec, Parameter, Visibility, StateMutability};
use serde::{Deserialize, Serialize};

/// Business scenario customization for EchokitBot platform
#[derive(Debug, Clone)]
pub struct BusinessScenarioGenerator {
    /// Configuration for scenario generation
    config: ScenarioConfig,
}

/// Scenario configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScenarioConfig {
    /// Enable device rental scenarios
    pub enable_device_rental: bool,
    /// Enable RWA investment scenarios
    pub enable_rwa_investment: bool,
    /// Enable multi-currency payment scenarios
    pub enable_multi_currency: bool,
    /// Custom scenario templates
    pub custom_scenarios: Vec<String>,
}

/// Device rental contract specification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceRentalSpec {
    /// Device NFT contract address
    pub nft_contract: String,
    /// Rental manager contract address
    pub rental_manager: Option<String>,
    /// Payment processor contract address
    pub payment_processor: Option<String>,
    /// Hourly rate in wei
    pub hourly_rate: u64,
    /// Minimum rental duration in hours
    pub min_duration: u64,
    /// Maximum rental duration in hours
    pub max_duration: u64,
    /// Security deposit required
    pub deposit_required: u64,
    /// Supported payment tokens
    pub payment_tokens: Vec<String>,
}

/// RWA investment contract specification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RWAInvestmentSpec {
    /// Underlying asset token address
    pub asset_token: String,
    /// RWA vault contract address
    pub vault_contract: Option<String>,
    /// Expected annual yield (basis points)
    pub expected_yield: u64,
    /// Minimum investment amount
    pub min_investment: u64,
    /// Maximum investment amount
    pub max_investment: u64,
    /// Lock-up period in days
    pub lockup_period: u64,
    /// Performance fee (basis points)
    pub performance_fee: u64,
}

/// Multi-currency payment specification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MultiCurrencyPaymentSpec {
    /// Payment processor contract address
    pub payment_processor: Option<String>,
    /// Supported currencies
    pub supported_currencies: Vec<CurrencyConfig>,
    /// Processing fee (basis points)
    pub processing_fee: u64,
    /// Enable escrow functionality
    pub enable_escrow: bool,
}

/// Currency configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CurrencyConfig {
    /// Currency symbol (ETH, BTC, USDT, etc.)
    pub symbol: String,
    /// Token address (address(0) for ETH)
    pub token_address: String,
    /// Decimals
    pub decimals: u8,
    /// Price oracle address
    pub price_oracle: Option<String>,
}

impl BusinessScenarioGenerator {
    /// Create a new business scenario generator
    pub fn new(config: ScenarioConfig) -> Self {
        Self { config }
    }

    /// Generate device rental contract
    pub async fn generate_device_rental_contract(
        &self,
        spec: DeviceRentalSpec,
    ) -> Result<ContractBlueprint, ContractGeneratorError> {
        let mut blueprint = ContractBlueprint {
            contract_type: ContractType::Custom,
            name: "DeviceRentalContract".to_string(),
            description: "Customized device rental contract for EchokitBot platform".to_string(),
            symbol: None,
            functions: Vec::new(),
            state_variables: Vec::new(),
            events: Vec::new(),
            modifiers: Vec::new(),
            inheritance: vec![
                "AccessControl".to_string(),
                "ReentrancyGuard".to_string(),
                "Pausable".to_string(),
            ],
            security_requirements: Default::default(),
            deployment_config: Default::default(),
            gas_optimization: Vec::new(),
            upgrade_strategy: None,
            platform_integration: Some(crate::types::PlatformIntegrationConfig {
                integrates_with_nft: true,
                integrates_with_rental: true,
                integrates_with_payment: true,
                integrates_with_rwa: false,
                integrates_with_tba: false,
                custom_integrations: Vec::new(),
            }),
        };

        // Add state variables
        blueprint.state_variables.push(crate::types::StateVariable {
            name: "nftContract".to_string(),
            var_type: "EchokitBotNFT".to_string(),
            visibility: Visibility::Public,
            is_constant: false,
            is_immutable: true,
            initial_value: None,
            description: Some("Reference to the NFT contract".to_string()),
        });

        if let Some(rental_manager) = &spec.rental_manager {
            blueprint.state_variables.push(crate::types::StateVariable {
                name: "rentalManager".to_string(),
                var_type: "RentalManager".to_string(),
                visibility: Visibility::Public,
                is_constant: false,
                is_immutable: true,
                initial_value: None,
                description: Some("Reference to the rental manager contract".to_string()),
            });
        }

        // Add rental creation function
        blueprint.functions.push(FunctionSpec {
            name: "createRental".to_string(),
            description: "Create a new device rental".to_string(),
            parameters: vec![
                Parameter {
                    name: "deviceId".to_string(),
                    param_type: "uint256".to_string(),
                    description: Some("Device NFT token ID".to_string()),
                },
                Parameter {
                    name: "durationHours".to_string(),
                    param_type: "uint256".to_string(),
                    description: Some("Rental duration in hours".to_string()),
                },
            ],
            returns: vec![Parameter {
                name: "rentalId".to_string(),
                param_type: "uint256".to_string(),
                description: Some("Created rental ID".to_string()),
            }],
            visibility: Visibility::External,
            state_mutability: StateMutability::Payable,
            modifiers: vec!["nonReentrant".to_string(), "whenNotPaused".to_string()],
            is_constructor: false,
            is_fallback: false,
        });

        // Add rental completion function
        blueprint.functions.push(FunctionSpec {
            name: "completeRental".to_string(),
            description: "Complete an active rental".to_string(),
            parameters: vec![Parameter {
                name: "rentalId".to_string(),
                param_type: "uint256".to_string(),
                description: Some("Rental ID to complete".to_string()),
            }],
            returns: vec![],
            visibility: Visibility::External,
            state_mutability: StateMutability::Nonpayable,
            modifiers: vec!["nonReentrant".to_string()],
            is_constructor: false,
            is_fallback: false,
        });

        // Add events
        blueprint.events.push(crate::types::EventSpec {
            name: "RentalCreated".to_string(),
            parameters: vec![
                crate::types::EventParameter {
                    name: "rentalId".to_string(),
                    param_type: "uint256".to_string(),
                    indexed: true,
                    description: Some("Rental ID".to_string()),
                },
                crate::types::EventParameter {
                    name: "deviceId".to_string(),
                    param_type: "uint256".to_string(),
                    indexed: true,
                    description: Some("Device ID".to_string()),
                },
                crate::types::EventParameter {
                    name: "renter".to_string(),
                    param_type: "address".to_string(),
                    indexed: true,
                    description: Some("Renter address".to_string()),
                },
            ],
            description: Some("Emitted when a new rental is created".to_string()),
        });

        Ok(blueprint)
    }

    /// Generate RWA investment contract
    pub async fn generate_rwa_investment_contract(
        &self,
        spec: RWAInvestmentSpec,
    ) -> Result<ContractBlueprint, ContractGeneratorError> {
        let mut blueprint = ContractBlueprint {
            contract_type: ContractType::Vault,
            name: "RWAInvestmentVault".to_string(),
            description: "Customized RWA investment vault for rental income".to_string(),
            symbol: Some("RWAV".to_string()),
            functions: Vec::new(),
            state_variables: Vec::new(),
            events: Vec::new(),
            modifiers: Vec::new(),
            inheritance: vec![
                "ERC4626".to_string(),
                "Ownable".to_string(),
                "ReentrancyGuard".to_string(),
                "Pausable".to_string(),
            ],
            security_requirements: Default::default(),
            deployment_config: Default::default(),
            gas_optimization: Vec::new(),
            upgrade_strategy: None,
            platform_integration: Some(crate::types::PlatformIntegrationConfig {
                integrates_with_nft: false,
                integrates_with_rental: true,
                integrates_with_payment: true,
                integrates_with_rwa: true,
                integrates_with_tba: false,
                custom_integrations: Vec::new(),
            }),
        };

        // Add state variables
        blueprint.state_variables.push(crate::types::StateVariable {
            name: "expectedYield".to_string(),
            var_type: "uint256".to_string(),
            visibility: Visibility::Public,
            is_constant: false,
            is_immutable: false,
            initial_value: Some(spec.expected_yield.to_string()),
            description: Some("Expected annual yield in basis points".to_string()),
        });

        blueprint.state_variables.push(crate::types::StateVariable {
            name: "performanceFee".to_string(),
            var_type: "uint256".to_string(),
            visibility: Visibility::Public,
            is_constant: false,
            is_immutable: false,
            initial_value: Some(spec.performance_fee.to_string()),
            description: Some("Performance fee in basis points".to_string()),
        });

        // Add investment function
        blueprint.functions.push(FunctionSpec {
            name: "invest".to_string(),
            description: "Invest in the RWA vault".to_string(),
            parameters: vec![Parameter {
                name: "amount".to_string(),
                param_type: "uint256".to_string(),
                description: Some("Investment amount".to_string()),
            }],
            returns: vec![Parameter {
                name: "shares".to_string(),
                param_type: "uint256".to_string(),
                description: Some("Shares received".to_string()),
            }],
            visibility: Visibility::External,
            state_mutability: StateMutability::Nonpayable,
            modifiers: vec!["nonReentrant".to_string(), "whenNotPaused".to_string()],
            is_constructor: false,
            is_fallback: false,
        });

        // Add yield distribution function
        blueprint.functions.push(FunctionSpec {
            name: "distributeYield".to_string(),
            description: "Distribute yield to investors".to_string(),
            parameters: vec![Parameter {
                name: "yieldAmount".to_string(),
                param_type: "uint256".to_string(),
                description: Some("Yield amount to distribute".to_string()),
            }],
            returns: vec![],
            visibility: Visibility::External,
            state_mutability: StateMutability::Nonpayable,
            modifiers: vec!["onlyOwner".to_string(), "nonReentrant".to_string()],
            is_constructor: false,
            is_fallback: false,
        });

        // Add events
        blueprint.events.push(crate::types::EventSpec {
            name: "InvestmentMade".to_string(),
            parameters: vec![
                crate::types::EventParameter {
                    name: "investor".to_string(),
                    param_type: "address".to_string(),
                    indexed: true,
                    description: Some("Investor address".to_string()),
                },
                crate::types::EventParameter {
                    name: "amount".to_string(),
                    param_type: "uint256".to_string(),
                    indexed: false,
                    description: Some("Investment amount".to_string()),
                },
                crate::types::EventParameter {
                    name: "shares".to_string(),
                    param_type: "uint256".to_string(),
                    indexed: false,
                    description: Some("Shares received".to_string()),
                },
            ],
            description: Some("Emitted when an investment is made".to_string()),
        });

        Ok(blueprint)
    }

    /// Generate multi-currency payment contract
    pub async fn generate_multi_currency_payment_contract(
        &self,
        spec: MultiCurrencyPaymentSpec,
    ) -> Result<ContractBlueprint, ContractGeneratorError> {
        let mut blueprint = ContractBlueprint {
            contract_type: ContractType::Custom,
            name: "MultiCurrencyPaymentProcessor".to_string(),
            description: "Customized multi-currency payment processor".to_string(),
            symbol: None,
            functions: Vec::new(),
            state_variables: Vec::new(),
            events: Vec::new(),
            modifiers: Vec::new(),
            inheritance: vec![
                "AccessControl".to_string(),
                "ReentrancyGuard".to_string(),
                "Pausable".to_string(),
            ],
            security_requirements: Default::default(),
            deployment_config: Default::default(),
            gas_optimization: Vec::new(),
            upgrade_strategy: None,
            platform_integration: Some(crate::types::PlatformIntegrationConfig {
                integrates_with_nft: false,
                integrates_with_rental: true,
                integrates_with_payment: true,
                integrates_with_rwa: false,
                integrates_with_tba: false,
                custom_integrations: Vec::new(),
            }),
        };

        // Add state variables
        blueprint.state_variables.push(crate::types::StateVariable {
            name: "processingFee".to_string(),
            var_type: "uint256".to_string(),
            visibility: Visibility::Public,
            is_constant: false,
            is_immutable: false,
            initial_value: Some(spec.processing_fee.to_string()),
            description: Some("Processing fee in basis points".to_string()),
        });

        // Add payment processing function
        blueprint.functions.push(FunctionSpec {
            name: "processPayment".to_string(),
            description: "Process a multi-currency payment".to_string(),
            parameters: vec![
                Parameter {
                    name: "recipient".to_string(),
                    param_type: "address".to_string(),
                    description: Some("Payment recipient".to_string()),
                },
                Parameter {
                    name: "currency".to_string(),
                    param_type: "address".to_string(),
                    description: Some("Currency token address".to_string()),
                },
                Parameter {
                    name: "amount".to_string(),
                    param_type: "uint256".to_string(),
                    description: Some("Payment amount".to_string()),
                },
            ],
            returns: vec![Parameter {
                name: "paymentId".to_string(),
                param_type: "uint256".to_string(),
                description: Some("Payment ID".to_string()),
            }],
            visibility: Visibility::External,
            state_mutability: StateMutability::Payable,
            modifiers: vec!["nonReentrant".to_string(), "whenNotPaused".to_string()],
            is_constructor: false,
            is_fallback: false,
        });

        if spec.enable_escrow {
            // Add escrow functions
            blueprint.functions.push(FunctionSpec {
                name: "createEscrow".to_string(),
                description: "Create an escrow account".to_string(),
                parameters: vec![
                    Parameter {
                        name: "escrowId".to_string(),
                        param_type: "bytes32".to_string(),
                        description: Some("Escrow identifier".to_string()),
                    },
                    Parameter {
                        name: "owner".to_string(),
                        param_type: "address".to_string(),
                        description: Some("Escrow owner".to_string()),
                    },
                ],
                returns: vec![],
                visibility: Visibility::External,
                state_mutability: StateMutability::Nonpayable,
                modifiers: vec!["onlyRole(PAYMENT_MANAGER_ROLE)".to_string()],
                is_constructor: false,
                is_fallback: false,
            });
        }

        // Add events
        blueprint.events.push(crate::types::EventSpec {
            name: "PaymentProcessed".to_string(),
            parameters: vec![
                crate::types::EventParameter {
                    name: "paymentId".to_string(),
                    param_type: "uint256".to_string(),
                    indexed: true,
                    description: Some("Payment ID".to_string()),
                },
                crate::types::EventParameter {
                    name: "payer".to_string(),
                    param_type: "address".to_string(),
                    indexed: true,
                    description: Some("Payer address".to_string()),
                },
                crate::types::EventParameter {
                    name: "recipient".to_string(),
                    param_type: "address".to_string(),
                    indexed: true,
                    description: Some("Recipient address".to_string()),
                },
                crate::types::EventParameter {
                    name: "currency".to_string(),
                    param_type: "address".to_string(),
                    indexed: false,
                    description: Some("Currency address".to_string()),
                },
                crate::types::EventParameter {
                    name: "amount".to_string(),
                    param_type: "uint256".to_string(),
                    indexed: false,
                    description: Some("Payment amount".to_string()),
                },
            ],
            description: Some("Emitted when a payment is processed".to_string()),
        });

        Ok(blueprint)
    }

    /// Generate contract based on business scenario
    pub async fn generate_scenario_contract(
        &self,
        scenario: BusinessScenario,
    ) -> Result<ContractBlueprint, ContractGeneratorError> {
        match scenario {
            BusinessScenario::DeviceRental(spec) => {
                self.generate_device_rental_contract(spec).await
            }
            BusinessScenario::RWAInvestment(spec) => {
                self.generate_rwa_investment_contract(spec).await
            }
            BusinessScenario::MultiCurrencyPayment(spec) => {
                self.generate_multi_currency_payment_contract(spec).await
            }
        }
    }
}

/// Business scenario types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum BusinessScenario {
    DeviceRental(DeviceRentalSpec),
    RWAInvestment(RWAInvestmentSpec),
    MultiCurrencyPayment(MultiCurrencyPaymentSpec),
}

impl Default for ScenarioConfig {
    fn default() -> Self {
        Self {
            enable_device_rental: true,
            enable_rwa_investment: true,
            enable_multi_currency: true,
            custom_scenarios: Vec::new(),
        }
    }
}

impl Default for crate::types::BlueprintDeploymentConfig {
    fn default() -> Self {
        Self {
            target_networks: vec!["localhost".to_string()],
            constructor_parameters: Vec::new(),
            initialization_parameters: std::collections::HashMap::new(),
            dependencies: Vec::new(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_generate_device_rental_contract() {
        let generator = BusinessScenarioGenerator::new(ScenarioConfig::default());
        
        let spec = DeviceRentalSpec {
            nft_contract: "0x1234".to_string(),
            rental_manager: Some("0x5678".to_string()),
            payment_processor: Some("0x9abc".to_string()),
            hourly_rate: 1000000000000000, // 0.001 ETH
            min_duration: 1,
            max_duration: 720, // 30 days
            deposit_required: 10000000000000000, // 0.01 ETH
            payment_tokens: vec!["ETH".to_string(), "USDT".to_string()],
        };
        
        let result = generator.generate_device_rental_contract(spec).await;
        assert!(result.is_ok());
        
        let blueprint = result.unwrap();
        assert_eq!(blueprint.name, "DeviceRentalContract");
        assert!(blueprint.platform_integration.is_some());
        assert!(blueprint.platform_integration.unwrap().integrates_with_nft);
    }

    #[tokio::test]
    async fn test_generate_rwa_investment_contract() {
        let generator = BusinessScenarioGenerator::new(ScenarioConfig::default());
        
        let spec = RWAInvestmentSpec {
            asset_token: "0x1234".to_string(),
            vault_contract: Some("0x5678".to_string()),
            expected_yield: 500, // 5%
            min_investment: 1000000000000000000, // 1 token
            max_investment: 1000000000000000000, // 1 token with 18 decimals
            lockup_period: 30,
            performance_fee: 200, // 2%
        };
        
        let result = generator.generate_rwa_investment_contract(spec).await;
        assert!(result.is_ok());
        
        let blueprint = result.unwrap();
        assert_eq!(blueprint.name, "RWAInvestmentVault");
        assert_eq!(blueprint.contract_type, ContractType::Vault);
    }
}
