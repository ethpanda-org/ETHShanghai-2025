//! 合约生成 Agent
//! 
//! 负责根据技术规格生成 Solidity 智能合约代码

use super::base::{Agent, AgentContext, AgentOutput, AgentResult, AgentError};
use super::requirements_parser::{RequirementsAnalysis, ContractType, TechnicalSpecs};
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// 合约生成 Agent
pub struct ContractGeneratorAgent {
    config: ContractGeneratorConfig,
    templates: ContractTemplates,
}

/// 合约生成配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContractGeneratorConfig {
    /// 模型名称
    pub model_name: String,
    
    /// 代码风格
    pub code_style: CodeStyle,
    
    /// 是否包含注释
    pub include_comments: bool,
    
    /// 是否使用模板
    pub use_templates: bool,
    
    /// 安全级别
    pub security_level: SecurityLevel,
}

/// 代码风格
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CodeStyle {
    Minimal,     // 最小化代码
    Standard,    // 标准风格
    Verbose,     // 详细注释
}

/// 安全级别
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SecurityLevel {
    Basic,       // 基础安全
    Enhanced,    // 增强安全
    Maximum,     // 最大安全
}

/// 合约模板管理器
#[derive(Debug, Clone)]
pub struct ContractTemplates {
    templates: HashMap<ContractType, String>,
}

/// 生成的合约信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneratedContract {
    /// 合约代码
    pub code: String,
    
    /// 合约名称
    pub name: String,
    
    /// 构造函数参数
    pub constructor_params: Vec<ConstructorParam>,
    
    /// 主要函数列表
    pub functions: Vec<FunctionInfo>,
    
    /// 事件列表
    pub events: Vec<EventInfo>,
    
    /// 使用的库
    pub imports: Vec<String>,
    
    /// 代码统计
    pub stats: CodeStats,
}

/// 构造函数参数
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConstructorParam {
    pub name: String,
    pub param_type: String,
    pub description: String,
}

/// 函数信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FunctionInfo {
    pub name: String,
    pub visibility: String,
    pub mutability: String,
    pub parameters: Vec<String>,
    pub returns: Vec<String>,
    pub description: String,
}

/// 事件信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventInfo {
    pub name: String,
    pub parameters: Vec<String>,
    pub description: String,
}

/// 代码统计
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodeStats {
    pub total_lines: usize,
    pub code_lines: usize,
    pub comment_lines: usize,
    pub function_count: usize,
    pub event_count: usize,
}

impl ContractGeneratorAgent {
    pub fn new(config: ContractGeneratorConfig) -> Self {
        let templates = ContractTemplates::new();
        Self { config, templates }
    }
    
    /// 生成智能合约
    async fn generate_contract(&self, analysis: &RequirementsAnalysis) -> AgentResult<GeneratedContract> {
        let contract_name = self.generate_contract_name(&analysis.technical_specs.contract_type);
        
        let code = if self.config.use_templates {
            self.generate_from_template(analysis).await?
        } else {
            self.generate_from_scratch(analysis).await?
        };
        
        let contract = self.analyze_generated_code(&code, &contract_name)?;
        
        Ok(contract)
    }
    
    fn generate_contract_name(&self, contract_type: &ContractType) -> String {
        match contract_type {
            ContractType::Token => "EchokitBotToken".to_string(),
            ContractType::NFT => "EchokitBotNFT".to_string(),
            ContractType::Rental => "EchokitBotRental".to_string(),
            ContractType::Governance => "EchokitBotGovernance".to_string(),
            ContractType::Marketplace => "EchokitBotMarketplace".to_string(),
            ContractType::DeFi => "EchokitBotDeFi".to_string(),
            ContractType::Custom => "EchokitBotContract".to_string(),
        }
    }
    
    async fn generate_from_template(&self, analysis: &RequirementsAnalysis) -> AgentResult<String> {
        // 临时实现：直接生成代码，等待templates模块完成后切换到Askama
        // TODO: 集成 crate::templates::TemplateEngine
        
        let contract_name = self.generate_contract_name(&analysis.technical_specs.contract_type);
        let solidity_version = &analysis.technical_specs.solidity_version;
        
        // 根据合约类型生成代码
        match analysis.technical_specs.contract_type {
            ContractType::Rental => {
                self.generate_rental_contract_from_template(&contract_name, solidity_version)
            }
            ContractType::Token => {
                self.generate_token_contract_from_template(&contract_name, solidity_version)
            }
            ContractType::NFT => {
                self.generate_nft_contract_from_template(&contract_name, solidity_version)
            }
            _ => {
                // 默认生成租赁合约
                self.generate_rental_contract_from_template(&contract_name, solidity_version)
            }
        }
    }
    
    fn generate_rental_contract_from_template(&self, contract_name: &str, solidity_version: &str) -> AgentResult<String> {
        let enable_advanced = matches!(self.config.security_level, SecurityLevel::Maximum);
        
        let mut code = format!(
            r#"// SPDX-License-Identifier: MIT
pragma solidity {};

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title {}
 * @dev EchokitBot device rental smart contract
 */
contract {} is ReentrancyGuard, Ownable {{
    
    struct Device {{
        uint256 id;
        address owner;
        bool isAvailable;
        uint256 hourlyRate;
        uint256 deposit;
        string description;
    }}

    struct Rental {{
        uint256 deviceId;
        address renter;
        uint256 startTime;
        uint256 endTime;
        bool active;
    }}

    uint256 public deviceCount;
    mapping(uint256 => Device) public devices;
    mapping(address => uint256[]) public ownerDevices;
    mapping(address => Rental[]) public rentals;

    event DeviceRegistered(uint256 indexed deviceId, address indexed owner);
    event RentalBooked(uint256 indexed deviceId, address indexed renter, uint256 startTime, uint256 endTime);
    event RentalCompleted(uint256 indexed deviceId, address indexed renter, uint256 amountPaid);

    function registerDevice(
        uint256 _hourlyRate,
        uint256 _deposit,
        string calldata _description
    ) external {{
        require(_hourlyRate > 0, "Hourly rate must be greater than zero");
        
        deviceCount++;
        devices[deviceCount] = Device({{
            id: deviceCount,
            owner: msg.sender,
            isAvailable: true,
            hourlyRate: _hourlyRate,
            deposit: _deposit,
            description: _description
        }});
        
        ownerDevices[msg.sender].push(deviceCount);
        emit DeviceRegistered(deviceCount, msg.sender);
    }}

    function bookDevice(
        uint256 _deviceId,
        uint256 _startTime,
        uint256 _endTime
    ) external payable nonReentrant {{
        Device storage device = devices[_deviceId];
        require(device.owner != address(0), "Device does not exist");
        require(device.isAvailable, "Device not available");
        require(_endTime > _startTime, "Invalid time range");

        uint256 durationHours = (_endTime - _startTime) / 1 hours;
        require(durationHours > 0, "Rental duration must be at least one hour");

        uint256 totalCost = durationHours * device.hourlyRate;
        require(msg.value >= totalCost + device.deposit, "Insufficient payment");

        device.isAvailable = false;

        rentals[msg.sender].push(Rental({{
            deviceId: _deviceId,
            renter: msg.sender,
            startTime: _startTime,
            endTime: _endTime,
            active: true
        }}));

        emit RentalBooked(_deviceId, msg.sender, _startTime, _endTime);
    }}

    function getDevice(uint256 _deviceId) external view returns (Device memory) {{
        return devices[_deviceId];
    }}

    function getUserRentals(address _user) external view returns (Rental[] memory) {{
        return rentals[_user];
    }}
}}
"#,
            solidity_version, contract_name, contract_name
        );
        
        if enable_advanced {
            // 添加高级功能的注释
            code.push_str("\n// Advanced features enabled\n");
        }
        
        Ok(code)
    }
    
    fn generate_token_contract_from_template(&self, contract_name: &str, solidity_version: &str) -> AgentResult<String> {
        Ok(format!(
            r#"// SPDX-License-Identifier: MIT
pragma solidity {};

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract {} is ERC20, Ownable {{
    constructor(uint256 initialSupply) ERC20("{}", "EKB") {{
        _mint(msg.sender, initialSupply);
    }}

    function mint(address to, uint256 amount) external onlyOwner {{
        _mint(to, amount);
    }}
}}
"#,
            solidity_version, contract_name, contract_name
        ))
    }
    
    fn generate_nft_contract_from_template(&self, contract_name: &str, solidity_version: &str) -> AgentResult<String> {
        Ok(format!(
            r#"// SPDX-License-Identifier: MIT
pragma solidity {};

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract {} is ERC721, Ownable {{
    uint256 private _nextTokenId;

    constructor() ERC721("{}", "EKNFT") {{}}

    function safeMint(address to) external onlyOwner returns (uint256) {{
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        return tokenId;
    }}
}}
"#,
            solidity_version, contract_name, contract_name
        ))
    }
    
    async fn generate_from_scratch(&self, analysis: &RequirementsAnalysis) -> AgentResult<String> {
        let mut code = String::new();
        
        // SPDX 许可证标识符
        code.push_str("// SPDX-License-Identifier: MIT\n");
        
        // Solidity 版本
        code.push_str(&format!("pragma solidity {};\n\n", analysis.technical_specs.solidity_version));
        
        // 导入语句
        for import in &analysis.technical_specs.dependencies {
            code.push_str(&format!("import \"{}\";\n", import));
        }
        code.push('\n');
        
        // 合约声明
        let contract_name = self.generate_contract_name(&analysis.technical_specs.contract_type);
        let inheritance = self.get_inheritance(&analysis.technical_specs);
        
        if inheritance.is_empty() {
            code.push_str(&format!("contract {} {{\n", contract_name));
        } else {
            code.push_str(&format!("contract {} is {} {{\n", contract_name, inheritance.join(", ")));
        }
        
        // 状态变量
        code.push_str(&self.generate_state_variables(analysis)?);
        
        // 事件
        code.push_str(&self.generate_events(analysis)?);
        
        // 修饰符
        code.push_str(&self.generate_modifiers(analysis)?);
        
        // 构造函数
        code.push_str(&self.generate_constructor(analysis)?);
        
        // 主要函数
        code.push_str(&self.generate_main_functions(analysis)?);
        
        // 辅助函数
        code.push_str(&self.generate_helper_functions(analysis)?);
        
        code.push_str("}\n");
        
        Ok(code)
    }
    
    fn get_inheritance(&self, specs: &TechnicalSpecs) -> Vec<String> {
        let mut inheritance = Vec::new();
        
        match specs.contract_type {
            ContractType::Token => {
                inheritance.push("ERC20".to_string());
                inheritance.push("Ownable".to_string());
            }
            ContractType::NFT => {
                inheritance.push("ERC721".to_string());
                inheritance.push("Ownable".to_string());
            }
            ContractType::Rental => {
                inheritance.push("ReentrancyGuard".to_string());
                inheritance.push("Ownable".to_string());
            }
            _ => {
                inheritance.push("Ownable".to_string());
            }
        }
        
        // 根据安全级别添加额外继承
        match self.config.security_level {
            SecurityLevel::Enhanced | SecurityLevel::Maximum => {
                if !inheritance.contains(&"ReentrancyGuard".to_string()) {
                    inheritance.push("ReentrancyGuard".to_string());
                }
            }
            _ => {}
        }
        
        inheritance
    }
    
    fn generate_state_variables(&self, analysis: &RequirementsAnalysis) -> AgentResult<String> {
        let mut code = String::new();
        
        code.push_str("    // State variables\n");
        
        match analysis.technical_specs.contract_type {
            ContractType::Rental => {
                code.push_str("    struct Device {\n");
                code.push_str("        uint256 id;\n");
                code.push_str("        address owner;\n");
                code.push_str("        bool isAvailable;\n");
                code.push_str("        uint256 hourlyRate;\n");
                code.push_str("        uint256 deposit;\n");
                code.push_str("        string description;\n");
                code.push_str("    }\n\n");
                
                code.push_str("    struct Rental {\n");
                code.push_str("        uint256 deviceId;\n");
                code.push_str("        address renter;\n");
                code.push_str("        uint256 startTime;\n");
                code.push_str("        uint256 endTime;\n");
                code.push_str("        bool active;\n");
                code.push_str("    }\n\n");
                
                code.push_str("    uint256 public deviceCount;\n");
                code.push_str("    mapping(uint256 => Device) public devices;\n");
                code.push_str("    mapping(address => uint256[]) public ownerDevices;\n");
                code.push_str("    mapping(address => Rental[]) public rentals;\n\n");
            }
            ContractType::Token => {
                code.push_str("    uint256 private _totalSupply;\n");
                code.push_str("    mapping(address => uint256) private _balances;\n");
                code.push_str("    mapping(address => mapping(address => uint256)) private _allowances;\n\n");
            }
            _ => {
                code.push_str("    uint256 public totalItems;\n");
                code.push_str("    mapping(address => bool) public authorized;\n\n");
            }
        }
        
        Ok(code)
    }
    
    fn generate_events(&self, analysis: &RequirementsAnalysis) -> AgentResult<String> {
        let mut code = String::new();
        
        code.push_str("    // Events\n");
        
        match analysis.technical_specs.contract_type {
            ContractType::Rental => {
                code.push_str("    event DeviceRegistered(uint256 indexed deviceId, address indexed owner);\n");
                code.push_str("    event RentalBooked(uint256 indexed deviceId, address indexed renter, uint256 startTime, uint256 endTime);\n");
                code.push_str("    event RentalCompleted(uint256 indexed deviceId, address indexed renter, uint256 amountPaid);\n");
                code.push_str("    event DepositWithdrawn(address indexed renter, uint256 amount);\n\n");
            }
            ContractType::Token => {
                code.push_str("    event Transfer(address indexed from, address indexed to, uint256 value);\n");
                code.push_str("    event Approval(address indexed owner, address indexed spender, uint256 value);\n\n");
            }
            _ => {
                code.push_str("    event ItemCreated(uint256 indexed itemId, address indexed creator);\n");
                code.push_str("    event ItemUpdated(uint256 indexed itemId, address indexed updater);\n\n");
            }
        }
        
        Ok(code)
    }
    
    fn generate_modifiers(&self, _analysis: &RequirementsAnalysis) -> AgentResult<String> {
        let mut code = String::new();
        
        code.push_str("    // Modifiers\n");
        code.push_str("    modifier validAddress(address _addr) {\n");
        code.push_str("        require(_addr != address(0), \"Invalid address\");\n");
        code.push_str("        _;\n");
        code.push_str("    }\n\n");
        
        code.push_str("    modifier nonZeroAmount(uint256 _amount) {\n");
        code.push_str("        require(_amount > 0, \"Amount must be greater than zero\");\n");
        code.push_str("        _;\n");
        code.push_str("    }\n\n");
        
        Ok(code)
    }
    
    fn generate_constructor(&self, analysis: &RequirementsAnalysis) -> AgentResult<String> {
        let mut code = String::new();
        
        code.push_str("    // Constructor\n");
        
        match analysis.technical_specs.contract_type {
            ContractType::Token => {
                code.push_str("    constructor(\n");
                code.push_str("        string memory _name,\n");
                code.push_str("        string memory _symbol,\n");
                code.push_str("        uint256 _initialSupply\n");
                code.push_str("    ) ERC20(_name, _symbol) {\n");
                code.push_str("        _mint(msg.sender, _initialSupply);\n");
                code.push_str("    }\n\n");
            }
            ContractType::NFT => {
                code.push_str("    constructor(\n");
                code.push_str("        string memory _name,\n");
                code.push_str("        string memory _symbol\n");
                code.push_str("    ) ERC721(_name, _symbol) {}\n\n");
            }
            _ => {
                code.push_str("    constructor() {}\n\n");
            }
        }
        
        Ok(code)
    }
    
    fn generate_main_functions(&self, analysis: &RequirementsAnalysis) -> AgentResult<String> {
        let mut code = String::new();
        
        code.push_str("    // Main functions\n");
        
        match analysis.technical_specs.contract_type {
            ContractType::Rental => {
                code.push_str(&self.generate_rental_functions()?);
            }
            ContractType::Token => {
                code.push_str(&self.generate_token_functions()?);
            }
            ContractType::NFT => {
                code.push_str(&self.generate_nft_functions()?);
            }
            _ => {
                code.push_str(&self.generate_generic_functions()?);
            }
        }
        
        Ok(code)
    }
    
    fn generate_rental_functions(&self) -> AgentResult<String> {
        let mut code = String::new();
        
        code.push_str("    function registerDevice(\n");
        code.push_str("        uint256 _hourlyRate,\n");
        code.push_str("        uint256 _deposit,\n");
        code.push_str("        string calldata _description\n");
        code.push_str("    ) external nonZeroAmount(_hourlyRate) {\n");
        code.push_str("        deviceCount++;\n");
        code.push_str("        devices[deviceCount] = Device({\n");
        code.push_str("            id: deviceCount,\n");
        code.push_str("            owner: msg.sender,\n");
        code.push_str("            isAvailable: true,\n");
        code.push_str("            hourlyRate: _hourlyRate,\n");
        code.push_str("            deposit: _deposit,\n");
        code.push_str("            description: _description\n");
        code.push_str("        });\n");
        code.push_str("        ownerDevices[msg.sender].push(deviceCount);\n");
        code.push_str("        emit DeviceRegistered(deviceCount, msg.sender);\n");
        code.push_str("    }\n\n");
        
        code.push_str("    function bookDevice(\n");
        code.push_str("        uint256 _deviceId,\n");
        code.push_str("        uint256 _startTime,\n");
        code.push_str("        uint256 _endTime\n");
        code.push_str("    ) external payable nonReentrant {\n");
        code.push_str("        Device storage device = devices[_deviceId];\n");
        code.push_str("        require(device.owner != address(0), \"Device does not exist\");\n");
        code.push_str("        require(device.isAvailable, \"Device not available\");\n");
        code.push_str("        require(_endTime > _startTime, \"Invalid time range\");\n");
        code.push_str("        \n");
        code.push_str("        uint256 durationHours = (_endTime - _startTime) / 1 hours;\n");
        code.push_str("        require(durationHours > 0, \"Rental duration must be at least one hour\");\n");
        code.push_str("        \n");
        code.push_str("        uint256 totalCost = durationHours * device.hourlyRate;\n");
        code.push_str("        require(msg.value >= totalCost + device.deposit, \"Insufficient payment\");\n");
        code.push_str("        \n");
        code.push_str("        device.isAvailable = false;\n");
        code.push_str("        \n");
        code.push_str("        rentals[msg.sender].push(Rental({\n");
        code.push_str("            deviceId: _deviceId,\n");
        code.push_str("            renter: msg.sender,\n");
        code.push_str("            startTime: _startTime,\n");
        code.push_str("            endTime: _endTime,\n");
        code.push_str("            active: true\n");
        code.push_str("        }));\n");
        code.push_str("        \n");
        code.push_str("        emit RentalBooked(_deviceId, msg.sender, _startTime, _endTime);\n");
        code.push_str("    }\n\n");
        
        Ok(code)
    }
    
    fn generate_token_functions(&self) -> AgentResult<String> {
        let mut code = String::new();
        
        code.push_str("    function mint(address _to, uint256 _amount) external onlyOwner {\n");
        code.push_str("        _mint(_to, _amount);\n");
        code.push_str("    }\n\n");
        
        code.push_str("    function burn(uint256 _amount) external {\n");
        code.push_str("        _burn(msg.sender, _amount);\n");
        code.push_str("    }\n\n");
        
        Ok(code)
    }
    
    fn generate_nft_functions(&self) -> AgentResult<String> {
        let mut code = String::new();
        
        code.push_str("    function mint(address _to, uint256 _tokenId) external onlyOwner {\n");
        code.push_str("        _mint(_to, _tokenId);\n");
        code.push_str("    }\n\n");
        
        code.push_str("    function setTokenURI(uint256 _tokenId, string memory _tokenURI) external onlyOwner {\n");
        code.push_str("        _setTokenURI(_tokenId, _tokenURI);\n");
        code.push_str("    }\n\n");
        
        Ok(code)
    }
    
    fn generate_generic_functions(&self) -> AgentResult<String> {
        let mut code = String::new();
        
        code.push_str("    function createItem(string memory _data) external {\n");
        code.push_str("        totalItems++;\n");
        code.push_str("        emit ItemCreated(totalItems, msg.sender);\n");
        code.push_str("    }\n\n");
        
        Ok(code)
    }
    
    fn generate_helper_functions(&self, _analysis: &RequirementsAnalysis) -> AgentResult<String> {
        let mut code = String::new();
        
        code.push_str("    // Helper functions\n");
        code.push_str("    function getContractBalance() external view returns (uint256) {\n");
        code.push_str("        return address(this).balance;\n");
        code.push_str("    }\n\n");
        
        code.push_str("    function emergencyWithdraw() external onlyOwner {\n");
        code.push_str("        (bool success, ) = payable(owner()).call{value: address(this).balance}(\"\");\n");
        code.push_str("        require(success, \"Withdrawal failed\");\n");
        code.push_str("    }\n\n");
        
        Ok(code)
    }
    
    // 这些方法已被新的模板生成方法替代，保留用于向后兼容
    #[allow(dead_code)]
    fn add_required_functions(&self, code: &str, _analysis: &RequirementsAnalysis) -> AgentResult<String> {
        Ok(code.to_string())
    }
    
    #[allow(dead_code)]
    fn add_security_features(&self, code: &str, _analysis: &RequirementsAnalysis) -> AgentResult<String> {
        Ok(code.to_string())
    }
    
    fn analyze_generated_code(&self, code: &str, name: &str) -> AgentResult<GeneratedContract> {
        let lines: Vec<&str> = code.lines().collect();
        let total_lines = lines.len();
        
        let comment_lines = lines.iter().filter(|line| {
            let trimmed = line.trim();
            trimmed.starts_with("//") || trimmed.starts_with("/*") || trimmed.starts_with("*")
        }).count();
        
        let code_lines = total_lines - comment_lines;
        
        // 分析函数
        let functions = self.extract_functions(code)?;
        let events = self.extract_events(code)?;
        let imports = self.extract_imports(code)?;
        let constructor_params = self.extract_constructor_params(code)?;
        
        let stats = CodeStats {
            total_lines,
            code_lines,
            comment_lines,
            function_count: functions.len(),
            event_count: events.len(),
        };
        
        Ok(GeneratedContract {
            code: code.to_string(),
            name: name.to_string(),
            constructor_params,
            functions,
            events,
            imports,
            stats,
        })
    }
    
    fn extract_functions(&self, code: &str) -> AgentResult<Vec<FunctionInfo>> {
        let mut functions = Vec::new();
        
        // 简单的函数提取逻辑
        for line in code.lines() {
            let trimmed = line.trim();
            if trimmed.starts_with("function ") {
                if let Some(func_info) = self.parse_function_signature(trimmed) {
                    functions.push(func_info);
                }
            }
        }
        
        Ok(functions)
    }
    
    fn parse_function_signature(&self, line: &str) -> Option<FunctionInfo> {
        // 简化的函数签名解析
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 2 && parts[0] == "function" {
            let name = parts[1].split('(').next().unwrap_or("unknown").to_string();
            
            Some(FunctionInfo {
                name,
                visibility: "public".to_string(),
                mutability: "nonpayable".to_string(),
                parameters: Vec::new(),
                returns: Vec::new(),
                description: "Generated function".to_string(),
            })
        } else {
            None
        }
    }
    
    fn extract_events(&self, code: &str) -> AgentResult<Vec<EventInfo>> {
        let mut events = Vec::new();
        
        for line in code.lines() {
            let trimmed = line.trim();
            if trimmed.starts_with("event ") {
                if let Some(event_info) = self.parse_event_signature(trimmed) {
                    events.push(event_info);
                }
            }
        }
        
        Ok(events)
    }
    
    fn parse_event_signature(&self, line: &str) -> Option<EventInfo> {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 2 && parts[0] == "event" {
            let name = parts[1].split('(').next().unwrap_or("unknown").to_string();
            
            Some(EventInfo {
                name,
                parameters: Vec::new(),
                description: "Generated event".to_string(),
            })
        } else {
            None
        }
    }
    
    fn extract_imports(&self, code: &str) -> AgentResult<Vec<String>> {
        let mut imports = Vec::new();
        
        for line in code.lines() {
            let trimmed = line.trim();
            if trimmed.starts_with("import ") {
                imports.push(trimmed.to_string());
            }
        }
        
        Ok(imports)
    }
    
    fn extract_constructor_params(&self, _code: &str) -> AgentResult<Vec<ConstructorParam>> {
        // 简化实现，实际应该解析构造函数参数
        Ok(Vec::new())
    }
}

#[async_trait]
impl Agent for ContractGeneratorAgent {
    fn name(&self) -> &str {
        "ContractGenerator"
    }
    
    fn description(&self) -> &str {
        "根据技术规格生成安全的 Solidity 智能合约代码"
    }
    
    fn specialties(&self) -> Vec<String> {
        vec![
            "Solidity 编程".to_string(),
            "智能合约架构".to_string(),
            "代码生成".to_string(),
            "模板应用".to_string(),
        ]
    }
    
    fn preferred_models(&self) -> Vec<String> {
        vec![
            "qwen".to_string(),
            "gpt-4".to_string(),
            "claude-3".to_string(),
        ]
    }
    
    async fn execute(&self, context: &AgentContext) -> AgentResult<AgentOutput> {
        // 从上下文中提取需求分析
        let analysis: RequirementsAnalysis = context.context_data
            .get("analysis")
            .and_then(|v| serde_json::from_value(v.clone()).ok())
            .ok_or_else(|| AgentError::ValidationError("需求分析数据未找到".to_string()))?;
        
        // 生成合约
        let contract = self.generate_contract(&analysis).await?;
        
        // 计算置信度
        let confidence = self.calculate_confidence(&contract);
        
        // 生成元数据
        let mut metadata = HashMap::new();
        metadata.insert("contract".to_string(), serde_json::to_value(&contract)?);
        metadata.insert("stats".to_string(), serde_json::to_value(&contract.stats)?);
        
        // 建议下一步操作
        let next_actions = vec![
            "进行安全审计".to_string(),
            "编写测试用例".to_string(),
            "优化代码".to_string(),
        ];
        
        Ok(AgentOutput {
            content: contract.code,
            metadata,
            confidence,
            next_actions,
            generated_files: vec![format!("{}.sol", contract.name)],
        })
    }
}

impl ContractGeneratorAgent {
    fn calculate_confidence(&self, contract: &GeneratedContract) -> f64 {
        let mut confidence = 0.8; // 基础置信度
        
        // 根据代码质量调整
        if contract.stats.function_count >= 3 {
            confidence += 0.05;
        }
        
        if contract.stats.event_count >= 2 {
            confidence += 0.05;
        }
        
        // 根据安全级别调整
        match self.config.security_level {
            SecurityLevel::Maximum => confidence += 0.1,
            SecurityLevel::Enhanced => confidence += 0.05,
            SecurityLevel::Basic => {}
        }
        
        confidence.min(1.0).max(0.0)
    }
}

impl ContractTemplates {
    fn new() -> Self {
        Self {
            templates: HashMap::new(),
        }
    }
    
    fn get_template(&self, _contract_type: &ContractType) -> Option<&String> {
        // 这个方法现在被弃用，使用 TemplateEngine 替代
        None
    }
}

impl Default for ContractGeneratorConfig {
    fn default() -> Self {
        Self {
            model_name: "qwen".to_string(),
            code_style: CodeStyle::Standard,
            include_comments: true,
            use_templates: true,
            security_level: SecurityLevel::Enhanced,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::agents::requirements_parser::*;
    
    #[test]
    fn test_generate_contract_name() {
        let config = ContractGeneratorConfig::default();
        let agent = ContractGeneratorAgent::new(config);
        
        assert_eq!(agent.generate_contract_name(&ContractType::Rental), "EchokitBotRental");
        assert_eq!(agent.generate_contract_name(&ContractType::Token), "EchokitBotToken");
        assert_eq!(agent.generate_contract_name(&ContractType::NFT), "EchokitBotNFT");
    }
    
    #[test]
    fn test_get_inheritance() {
        let config = ContractGeneratorConfig::default();
        let agent = ContractGeneratorAgent::new(config);
        
        let specs = TechnicalSpecs {
            solidity_version: "^0.8.0".to_string(),
            dependencies: Vec::new(),
            contract_type: ContractType::Rental,
            complexity_level: super::super::requirements_parser::ComplexityLevel::Medium,
            estimated_dev_time: "3-5 天".to_string(),
        };
        
        let inheritance = agent.get_inheritance(&specs);
        assert!(inheritance.contains(&"ReentrancyGuard".to_string()));
        assert!(inheritance.contains(&"Ownable".to_string()));
    }
}