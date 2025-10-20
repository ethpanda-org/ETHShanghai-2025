//! 核心数据类型定义

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;
use chrono::{DateTime, Utc};

/// 合约生成任务
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContractGenerationTask {
    /// 任务 ID
    pub id: Uuid,
    
    /// 用户需求描述
    pub requirements: String,
    
    /// 任务配置
    pub config: TaskConfig,
    
    /// 是否自动部署
    pub auto_deploy: bool,
    
    /// 部署配置
    pub deployment_config: Option<DeploymentTaskConfig>,
    
    /// 创建时间
    pub created_at: DateTime<Utc>,
    
    /// 更新时间
    pub updated_at: DateTime<Utc>,
    
    /// 任务状态
    pub status: TaskStatus,
}

/// 任务配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskConfig {
    /// 使用的 LLM 模型
    pub model: Option<String>,
    
    /// 安全等级要求
    pub security_level: SecurityLevel,
    
    /// 是否启用 Gas 优化
    pub enable_gas_optimization: bool,
    
    /// 是否生成测试代码
    pub generate_tests: bool,
    
    /// 自定义模板
    pub custom_templates: Vec<String>,
}

/// 部署任务配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeploymentTaskConfig {
    /// 目标网络
    pub network: String,
    
    /// 构造函数参数
    pub constructor_args: Vec<String>,
    
    /// Gas 配置
    pub gas_config: Option<GasConfig>,
    
    /// 是否验证合约
    pub verify_contract: bool,
}

/// Gas 配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GasConfig {
    /// Gas 限制
    pub gas_limit: Option<u64>,
    
    /// Gas 价格（gwei）
    pub gas_price: Option<u64>,
    
    /// 最大费用每 Gas（gwei）
    pub max_fee_per_gas: Option<u64>,
    
    /// 最大优先费用每 Gas（gwei）
    pub max_priority_fee_per_gas: Option<u64>,
}

/// 任务状态
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum TaskStatus {
    /// 待处理
    Pending,
    
    /// 解析需求中
    ParsingRequirements,
    
    /// 生成代码中
    GeneratingCode,
    
    /// 安全审计中
    SecurityAudit,
    
    /// 编译中
    Compiling,
    
    /// 部署中
    Deploying,
    
    /// 已完成
    Completed,
    
    /// 失败
    Failed,
    
    /// 已取消
    Cancelled,
}

/// 安全等级
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum SecurityLevel {
    /// 低安全等级
    Low,
    
    /// 中等安全等级
    Medium,
    
    /// 高安全等级
    High,
    
    /// 关键安全等级
    Critical,
}

/// 合约生成结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContractGenerationResult {
    /// 任务 ID
    pub task_id: Uuid,
    
    /// 合约蓝图
    pub blueprint: ContractBlueprint,
    
    /// 生成的合约代码
    pub contract_code: String,
    
    /// 安全审计结果
    pub audit_result: SecurityAuditResult,
    
    /// 编译结果
    pub compilation_result: CompilationResult,
    
    /// 部署结果（如果有）
    pub deployment_result: Option<DeploymentResult>,
    
    /// 生成报告
    pub report: GenerationReport,
    
    /// 完成时间
    pub completed_at: DateTime<Utc>,
}

/// 合约蓝图
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContractBlueprint {
    /// 合约类型
    pub contract_type: ContractType,
    
    /// 合约名称
    pub name: String,
    
    /// 合约描述
    pub description: String,
    
    /// 代币符号（如适用）
    pub symbol: Option<String>,
    
    /// 函数规范
    pub functions: Vec<FunctionSpec>,
    
    /// 状态变量
    pub state_variables: Vec<StateVariable>,
    
    /// 事件
    pub events: Vec<EventSpec>,
    
    /// 修饰符
    pub modifiers: Vec<ModifierSpec>,
    
    /// 继承的合约
    pub inheritance: Vec<String>,
    
    /// 安全要求
    pub security_requirements: SecurityRequirements,
    
    /// 部署配置
    pub deployment_config: BlueprintDeploymentConfig,
    
    /// Gas 优化建议
    pub gas_optimization: Vec<String>,
    
    /// 升级策略
    pub upgrade_strategy: Option<UpgradeStrategy>,
    
    /// 平台集成配置
    pub platform_integration: Option<PlatformIntegrationConfig>,
}

/// 平台集成配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlatformIntegrationConfig {
    /// 是否集成 NFT 合约
    pub integrates_with_nft: bool,
    
    /// 是否集成租赁管理合约
    pub integrates_with_rental: bool,
    
    /// 是否集成支付处理合约
    pub integrates_with_payment: bool,
    
    /// 是否集成 RWA 金库合约
    pub integrates_with_rwa: bool,
    
    /// 是否集成 TBA 管理合约
    pub integrates_with_tba: bool,
    
    /// 自定义集成合约
    pub custom_integrations: Vec<CustomIntegration>,
}

/// 自定义集成
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomIntegration {
    /// 合约名称
    pub contract_name: String,
    
    /// 合约地址（如果已部署）
    pub contract_address: Option<String>,
    
    /// 集成接口
    pub interface_functions: Vec<String>,
    
    /// 集成描述
    pub description: String,
}

/// 合约类型
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum ContractType {
    /// ERC-20 代币
    ERC20Token,
    
    /// ERC-721 NFT
    ERC721NFT,
    
    /// ERC-1155 多代币
    ERC1155MultiToken,
    
    /// 治理合约
    Governance,
    
    /// 多签钱包
    MultiSig,
    
    /// 金库合约
    Vault,
    
    /// DeFi 合约
    DeFi,
    
    /// 自定义合约
    Custom,
}

/// 函数规范
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FunctionSpec {
    /// 函数名称
    pub name: String,
    
    /// 函数描述
    pub description: String,
    
    /// 参数
    pub parameters: Vec<Parameter>,
    
    /// 返回值
    pub returns: Vec<Parameter>,
    
    /// 可见性
    pub visibility: Visibility,
    
    /// 状态可变性
    pub state_mutability: StateMutability,
    
    /// 修饰符
    pub modifiers: Vec<String>,
    
    /// 是否为构造函数
    pub is_constructor: bool,
    
    /// 是否为回退函数
    pub is_fallback: bool,
}

/// 参数
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Parameter {
    /// 参数名称
    pub name: String,
    
    /// 参数类型
    pub param_type: String,
    
    /// 参数描述
    pub description: Option<String>,
}

/// 可见性
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Visibility {
    Public,
    External,
    Internal,
    Private,
}

/// 状态可变性
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum StateMutability {
    Pure,
    View,
    Nonpayable,
    Payable,
}

/// 状态变量
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateVariable {
    /// 变量名称
    pub name: String,
    
    /// 变量类型
    pub var_type: String,
    
    /// 可见性
    pub visibility: Visibility,
    
    /// 是否为常量
    pub is_constant: bool,
    
    /// 是否为不可变
    pub is_immutable: bool,
    
    /// 初始值
    pub initial_value: Option<String>,
    
    /// 描述
    pub description: Option<String>,
}

/// 事件规范
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventSpec {
    /// 事件名称
    pub name: String,
    
    /// 事件参数
    pub parameters: Vec<EventParameter>,
    
    /// 描述
    pub description: Option<String>,
}

/// 事件参数
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventParameter {
    /// 参数名称
    pub name: String,
    
    /// 参数类型
    pub param_type: String,
    
    /// 是否为索引
    pub indexed: bool,
    
    /// 描述
    pub description: Option<String>,
}

/// 修饰符规范
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModifierSpec {
    /// 修饰符名称
    pub name: String,
    
    /// 参数
    pub parameters: Vec<Parameter>,
    
    /// 描述
    pub description: Option<String>,
}

/// 安全要求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityRequirements {
    /// 重入攻击保护
    pub reentrancy_protection: bool,
    
    /// 访问控制
    pub access_control: Vec<String>,
    
    /// 暂停功能
    pub pausable: bool,
    
    /// 升级功能
    pub upgradeable: bool,
    
    /// 时间锁
    pub timelock: bool,
    
    /// 多签要求
    pub multisig_required: bool,
    
    /// 自定义安全措施
    pub custom_security_measures: Vec<String>,
}

/// 蓝图部署配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlueprintDeploymentConfig {
    /// 目标网络
    pub target_networks: Vec<String>,
    
    /// 构造函数参数
    pub constructor_parameters: Vec<Parameter>,
    
    /// 初始化参数
    pub initialization_parameters: HashMap<String, String>,
    
    /// 依赖合约
    pub dependencies: Vec<String>,
}

/// 升级策略
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum UpgradeStrategy {
    /// 不可升级
    NonUpgradeable,
    
    /// 透明代理
    TransparentProxy,
    
    /// UUPS 代理
    UupsProxy,
    
    /// 钻石代理
    DiamondProxy,
    
    /// 自定义升级策略
    Custom(String),
}

/// 安全审计结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityAuditResult {
    /// 审计 ID
    pub audit_id: Uuid,
    
    /// 审计时间
    pub audit_time: DateTime<Utc>,
    
    /// 总体安全评分（0-100）
    pub security_score: u8,
    
    /// 发现的问题
    pub issues: Vec<SecurityIssue>,
    
    /// 使用的工具
    pub tools_used: Vec<String>,
    
    /// 审计摘要
    pub summary: String,
    
    /// 建议
    pub recommendations: Vec<String>,
}

/// 安全问题
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityIssue {
    /// 问题 ID
    pub id: String,
    
    /// 问题标题
    pub title: String,
    
    /// 问题描述
    pub description: String,
    
    /// 严重程度
    pub severity: IssueSeverity,
    
    /// 问题类型
    pub issue_type: IssueType,
    
    /// 代码位置
    pub location: Option<CodeLocation>,
    
    /// 修复建议
    pub fix_suggestion: Option<String>,
    
    /// CWE 编号
    pub cwe_id: Option<String>,
    
    /// 是否已修复
    pub fixed: bool,
}

/// 问题严重程度
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum IssueSeverity {
    Info,
    Low,
    Medium,
    High,
    Critical,
}

/// 问题类型
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum IssueType {
    /// 重入攻击
    Reentrancy,
    
    /// 整数溢出
    IntegerOverflow,
    
    /// 访问控制
    AccessControl,
    
    /// 未检查的外部调用
    UncheckedExternalCall,
    
    /// 拒绝服务
    DenialOfService,
    
    /// 前端运行
    FrontRunning,
    
    /// 时间戳依赖
    TimestampDependence,
    
    /// 随机数可预测
    WeakRandomness,
    
    /// Gas 限制
    GasLimit,
    
    /// 未初始化的存储
    UninitializedStorage,
    
    /// 自定义问题
    Custom(String),
}

impl std::fmt::Display for IssueType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            IssueType::Reentrancy => write!(f, "Reentrancy"),
            IssueType::IntegerOverflow => write!(f, "IntegerOverflow"),
            IssueType::AccessControl => write!(f, "AccessControl"),
            IssueType::UncheckedExternalCall => write!(f, "UncheckedExternalCall"),
            IssueType::DenialOfService => write!(f, "DenialOfService"),
            IssueType::FrontRunning => write!(f, "FrontRunning"),
            IssueType::TimestampDependence => write!(f, "TimestampDependence"),
            IssueType::WeakRandomness => write!(f, "WeakRandomness"),
            IssueType::GasLimit => write!(f, "GasLimit"),
            IssueType::UninitializedStorage => write!(f, "UninitializedStorage"),
            IssueType::Custom(s) => write!(f, "Custom({})", s),
        }
    }
}

/// 代码位置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodeLocation {
    /// 文件名
    pub file: String,
    
    /// 行号
    pub line: u32,
    
    /// 列号
    pub column: Option<u32>,
    
    /// 函数名
    pub function: Option<String>,
}

/// 编译结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompilationResult {
    /// 编译是否成功
    pub success: bool,
    
    /// 编译时间
    pub compile_time: DateTime<Utc>,
    
    /// 编译器版本
    pub compiler_version: String,
    
    /// 合约 ABI
    pub abi: Option<String>,
    
    /// 字节码
    pub bytecode: Option<String>,
    
    /// 部署字节码
    pub deployed_bytecode: Option<String>,
    
    /// 源码映射
    pub source_map: Option<String>,
    
    /// 编译警告
    pub warnings: Vec<CompilationWarning>,
    
    /// 编译错误
    pub errors: Vec<CompilationError>,
    
    /// Gas 估算
    pub gas_estimates: Option<GasEstimates>,
}

/// 编译警告
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompilationWarning {
    /// 警告消息
    pub message: String,
    
    /// 代码位置
    pub location: Option<CodeLocation>,
    
    /// 警告类型
    pub warning_type: String,
}

/// 编译错误
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompilationError {
    /// 错误消息
    pub message: String,
    
    /// 代码位置
    pub location: Option<CodeLocation>,
    
    /// 错误类型
    pub error_type: String,
}

/// Gas 估算
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GasEstimates {
    /// 部署 Gas 消耗
    pub deployment: u64,
    
    /// 函数 Gas 消耗
    pub functions: HashMap<String, u64>,
    
    /// 总 Gas 限制
    pub gas_limit: u64,
}

/// 部署结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeploymentResult {
    /// 部署是否成功
    pub success: bool,
    
    /// 部署时间
    pub deploy_time: DateTime<Utc>,
    
    /// 合约地址
    pub contract_address: Option<String>,
    
    /// 交易哈希
    pub transaction_hash: String,
    
    /// 部署网络
    pub network: String,
    
    /// 区块号
    pub block_number: u64,
    
    /// Gas 使用量
    pub gas_used: u64,
    
    /// Gas 价格
    pub gas_price: u64,
    
    /// 部署费用（wei）
    pub deployment_cost: String,
    
    /// 验证状态
    pub verification_status: VerificationStatus,
    
    /// 部署错误（如果有）
    pub error: Option<String>,
}

/// 验证状态
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum VerificationStatus {
    /// 未验证
    NotVerified,
    
    /// 验证中
    Pending,
    
    /// 验证成功
    Verified,
    
    /// 验证失败
    Failed(String),
}

/// 生成报告
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerationReport {
    /// 报告 ID
    pub id: Uuid,
    
    /// 生成时间
    pub generated_at: DateTime<Utc>,
    
    /// 任务摘要
    pub summary: String,
    
    /// 使用的模型
    pub models_used: Vec<String>,
    
    /// 处理时间统计
    pub timing: ProcessingTiming,
    
    /// 质量指标
    pub quality_metrics: QualityMetrics,
    
    /// 建议和最佳实践
    pub recommendations: Vec<String>,
    
    /// 附加信息
    pub metadata: HashMap<String, String>,
}

/// 处理时间统计
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessingTiming {
    /// 需求解析时间（秒）
    pub requirements_parsing: f64,
    
    /// 代码生成时间（秒）
    pub code_generation: f64,
    
    /// 安全审计时间（秒）
    pub security_audit: f64,
    
    /// 编译时间（秒）
    pub compilation: f64,
    
    /// 部署时间（秒）
    pub deployment: Option<f64>,
    
    /// 总时间（秒）
    pub total: f64,
}

/// 质量指标
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QualityMetrics {
    /// 代码质量评分（0-100）
    pub code_quality_score: u8,
    
    /// 安全评分（0-100）
    pub security_score: u8,
    
    /// Gas 效率评分（0-100）
    pub gas_efficiency_score: u8,
    
    /// 可读性评分（0-100）
    pub readability_score: u8,
    
    /// 测试覆盖率（0-100）
    pub test_coverage: Option<u8>,
    
    /// 文档完整性（0-100）
    pub documentation_completeness: u8,
}

impl Default for TaskConfig {
    fn default() -> Self {
        Self {
            model: None,
            security_level: SecurityLevel::High,
            enable_gas_optimization: true,
            generate_tests: false,
            custom_templates: Vec::new(),
        }
    }
}

impl Default for SecurityRequirements {
    fn default() -> Self {
        Self {
            reentrancy_protection: true,
            access_control: vec!["Ownable".to_string()],
            pausable: false,
            upgradeable: false,
            timelock: false,
            multisig_required: false,
            custom_security_measures: Vec::new(),
        }
    }
}

impl ContractGenerationTask {
    /// 创建新的合约生成任务
    pub fn new(requirements: String, config: TaskConfig) -> Self {
        let now = Utc::now();
        
        Self {
            id: Uuid::new_v4(),
            requirements,
            config,
            auto_deploy: false,
            deployment_config: None,
            created_at: now,
            updated_at: now,
            status: TaskStatus::Pending,
        }
    }
    
    /// 更新任务状态
    pub fn update_status(&mut self, status: TaskStatus) {
        self.status = status;
        self.updated_at = Utc::now();
    }
}

impl SecurityAuditResult {
    /// 检查是否有关键问题
    pub fn has_critical_issues(&self) -> bool {
        self.issues.iter().any(|issue| issue.severity == IssueSeverity::Critical)
    }
    
    /// 检查是否有高严重程度问题
    pub fn has_high_issues(&self) -> bool {
        self.issues.iter().any(|issue| issue.severity >= IssueSeverity::High)
    }
    
    /// 获取按严重程度分组的问题
    pub fn issues_by_severity(&self) -> HashMap<IssueSeverity, Vec<&SecurityIssue>> {
        let mut grouped = HashMap::new();
        
        for issue in &self.issues {
            grouped.entry(issue.severity.clone()).or_insert_with(Vec::new).push(issue);
        }
        
        grouped
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_task_creation() {
        let config = TaskConfig::default();
        let task = ContractGenerationTask::new("创建一个 ERC-20 代币".to_string(), config);
        
        assert_eq!(task.status, TaskStatus::Pending);
        assert!(!task.auto_deploy);
    }

    #[test]
    fn test_security_audit_result() {
        let audit_result = SecurityAuditResult {
            audit_id: Uuid::new_v4(),
            audit_time: Utc::now(),
            security_score: 85,
            issues: vec![
                SecurityIssue {
                    id: "1".to_string(),
                    title: "测试问题".to_string(),
                    description: "这是一个测试问题".to_string(),
                    severity: IssueSeverity::Critical,
                    issue_type: IssueType::Reentrancy,
                    location: None,
                    fix_suggestion: None,
                    cwe_id: None,
                    fixed: false,
                }
            ],
            tools_used: vec!["Aderyn".to_string()],
            summary: "审计摘要".to_string(),
            recommendations: vec![],
        };
        
        assert!(audit_result.has_critical_issues());
        assert!(audit_result.has_high_issues());
        
        let grouped = audit_result.issues_by_severity();
        assert_eq!(grouped.get(&IssueSeverity::Critical).unwrap().len(), 1);
    }
}