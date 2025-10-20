//! 模板库管理系统集成模块
//! 
//! 提供统一的模板管理接口，整合存储、版本控制和推荐功能

use crate::error::{AiContractError, Result};
use crate::templates::{
    storage::{TemplateStorage, StoredTemplate, TemplateSearchQuery},
    version_control::{TemplateVersionControl, TemplateVersion, VersionChangeInfo},
    recommendation::{TemplateRecommendationEngine, RecommendationRequest, RecommendationResponse},
    registry::ContractTemplate,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use std::path::PathBuf;
use uuid::Uuid;
use chrono::{DateTime, Utc};

/// 模板库管理器
/// 
/// 统一管理模板的存储、版本控制、推荐等功能
pub struct TemplateLibraryManager {
    /// 模板存储管理器
    storage: TemplateStorage,
    
    /// 版本控制管理器
    version_control: TemplateVersionControl,
    
    /// 推荐引擎
    recommendation_engine: TemplateRecommendationEngine,
    
    /// 数据库连接池
    db_pool: PgPool,
}

impl TemplateLibraryManager {
    /// 创建新的模板库管理器
    pub async fn new(db_pool: PgPool, storage_path: PathBuf) -> Result<Self> {
        // 初始化各个组件
        let storage = TemplateStorage::new(db_pool.clone(), storage_path).await?;
        let version_control = TemplateVersionControl::new(db_pool.clone(), storage.clone()).await?;
        let recommendation_engine = TemplateRecommendationEngine::new(db_pool.clone(), storage.clone()).await?;
        
        Ok(Self {
            storage,
            version_control,
            recommendation_engine,
            db_pool,
        })
    }
    
    /// 初始化模板库管理系统
    pub async fn initialize(&self) -> Result<()> {
        // 初始化各个组件的数据库表
        self.storage.initialize_database().await?;
        self.version_control.initialize_database().await?;
        self.recommendation_engine.initialize_database().await?;
        
        // 加载默认模板
        self.load_default_templates().await?;
        
        // 计算模板相似度
        self.recommendation_engine.update_template_similarities().await?;
        
        Ok(())
    }
    
    /// 加载默认模板
    async fn load_default_templates(&self) -> Result<()> {
        // 检查是否已有模板
        let existing_templates = self.storage.search_templates(&TemplateSearchQuery {
            limit: Some(1),
            ..Default::default()
        }).await?;
        
        if !existing_templates.is_empty() {
            return Ok(()); // 已有模板，跳过初始化
        }
        
        // 加载预置模板
        let default_templates = self.get_default_templates();
        
        for template in default_templates {
            let template_uuid = self.storage.store_template(&template).await?;
            
            // 创建初始版本
            let change_info = VersionChangeInfo {
                parent_version: None,
                change_type: crate::templates::version_control::VersionChangeType::Major,
                changelog: "初始版本".to_string(),
                breaking_changes: vec![],
                security_fixes: vec![],
                deprecation_warnings: vec![],
                compatibility_info: std::collections::HashMap::new(),
                dependencies: vec![],
                is_stable: true,
            };
            
            self.version_control.create_version(
                &template.id,
                "1.0.0",
                &template,
                change_info,
                Some("system"),
            ).await?;
        }
        
        Ok(())
    }
    
    /// 获取默认模板列表
    fn get_default_templates(&self) -> Vec<ContractTemplate> {
        use crate::templates::registry::{ContractTemplate, TemplateParameter, TemplateComplexity, GasEstimate};
        use crate::types::ContractType;
        
        vec![
            // ERC-20 基础代币模板
            ContractTemplate {
                id: "erc20_basic".to_string(),
                name: "ERC-20 Basic Token".to_string(),
                description: "标准 ERC-20 代币合约，支持铸造、销毁和基本转账功能".to_string(),
                contract_type: ContractType::ERC20Token,
                base_contracts: vec![
                    "ERC20".to_string(),
                    "Ownable".to_string(),
                ],
                required_imports: vec![
                    "@openzeppelin/contracts/token/ERC20/ERC20.sol".to_string(),
                    "@openzeppelin/contracts/access/Ownable.sol".to_string(),
                ],
                template_code: include_str!("../../templates/erc20_basic.sol.template").to_string(),
                parameters: vec![
                    TemplateParameter {
                        name: "name".to_string(),
                        param_type: "string".to_string(),
                        description: "代币名称".to_string(),
                        required: true,
                        default_value: None,
                    },
                    TemplateParameter {
                        name: "symbol".to_string(),
                        param_type: "string".to_string(),
                        description: "代币符号".to_string(),
                        required: true,
                        default_value: None,
                    },
                    TemplateParameter {
                        name: "initialSupply".to_string(),
                        param_type: "uint256".to_string(),
                        description: "初始供应量".to_string(),
                        required: true,
                        default_value: Some("1000000".to_string()),
                    },
                ],
                security_features: vec![
                    "Ownable access control".to_string(),
                    "SafeMath (built-in Solidity 0.8+)".to_string(),
                ],
                tags: vec!["erc20".to_string(), "token".to_string(), "fungible".to_string()],
                complexity: TemplateComplexity::Simple,
                gas_estimate: GasEstimate {
                    deployment: 800000,
                    typical_transaction: 50000,
                },
            },
            
            // ERC-721 NFT 模板
            ContractTemplate {
                id: "erc721_basic".to_string(),
                name: "ERC-721 NFT".to_string(),
                description: "标准 ERC-721 NFT 合约，支持铸造、转账和元数据".to_string(),
                contract_type: ContractType::ERC721NFT,
                base_contracts: vec![
                    "ERC721".to_string(),
                    "ERC721URIStorage".to_string(),
                    "Ownable".to_string(),
                ],
                required_imports: vec![
                    "@openzeppelin/contracts/token/ERC721/ERC721.sol".to_string(),
                    "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol".to_string(),
                    "@openzeppelin/contracts/access/Ownable.sol".to_string(),
                ],
                template_code: include_str!("../../templates/erc721_basic.sol.template").to_string(),
                parameters: vec![
                    TemplateParameter {
                        name: "name".to_string(),
                        param_type: "string".to_string(),
                        description: "NFT 集合名称".to_string(),
                        required: true,
                        default_value: None,
                    },
                    TemplateParameter {
                        name: "symbol".to_string(),
                        param_type: "string".to_string(),
                        description: "NFT 符号".to_string(),
                        required: true,
                        default_value: None,
                    },
                ],
                security_features: vec![
                    "Ownable access control".to_string(),
                    "ERC721 standard compliance".to_string(),
                ],
                tags: vec!["erc721".to_string(), "nft".to_string(), "non-fungible".to_string()],
                complexity: TemplateComplexity::Medium,
                gas_estimate: GasEstimate {
                    deployment: 2500000,
                    typical_transaction: 150000,
                },
            },
            
            // 多签钱包模板
            ContractTemplate {
                id: "multisig_wallet".to_string(),
                name: "Multi-Signature Wallet".to_string(),
                description: "多签钱包合约，支持多重签名验证和安全的资金管理".to_string(),
                contract_type: ContractType::MultiSig,
                base_contracts: vec![
                    "ReentrancyGuard".to_string(),
                ],
                required_imports: vec![
                    "@openzeppelin/contracts/security/ReentrancyGuard.sol".to_string(),
                    "@openzeppelin/contracts/utils/cryptography/ECDSA.sol".to_string(),
                ],
                template_code: r#"
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title {{contract_name}}
 * @dev {{description}}
 */
contract {{contract_name}} is ReentrancyGuard {
    using ECDSA for bytes32;
    
    uint256 public required;
    mapping(address => bool) public isOwner;
    address[] public owners;
    uint256 public transactionCount;
    
    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        bool executed;
        uint256 confirmations;
    }
    
    mapping(uint256 => Transaction) public transactions;
    mapping(uint256 => mapping(address => bool)) public confirmations;
    
    event Deposit(address indexed sender, uint256 amount, uint256 balance);
    event SubmitTransaction(address indexed owner, uint256 indexed txIndex, address indexed to, uint256 value, bytes data);
    event ConfirmTransaction(address indexed owner, uint256 indexed txIndex);
    event RevokeConfirmation(address indexed owner, uint256 indexed txIndex);
    event ExecuteTransaction(address indexed owner, uint256 indexed txIndex);
    
    modifier onlyOwner() {
        require(isOwner[msg.sender], "Not owner");
        _;
    }
    
    modifier txExists(uint256 _txIndex) {
        require(_txIndex < transactionCount, "Transaction does not exist");
        _;
    }
    
    modifier notExecuted(uint256 _txIndex) {
        require(!transactions[_txIndex].executed, "Transaction already executed");
        _;
    }
    
    modifier notConfirmed(uint256 _txIndex) {
        require(!confirmations[_txIndex][msg.sender], "Transaction already confirmed");
        _;
    }
    
    constructor(address[] memory _owners, uint256 _required) {
        require(_owners.length > 0, "Owners required");
        require(_required > 0 && _required <= _owners.length, "Invalid number of required confirmations");
        
        for (uint256 i = 0; i < _owners.length; i++) {
            address owner = _owners[i];
            require(owner != address(0), "Invalid owner");
            require(!isOwner[owner], "Owner not unique");
            
            isOwner[owner] = true;
            owners.push(owner);
        }
        
        required = _required;
    }
    
    receive() external payable {
        emit Deposit(msg.sender, msg.value, address(this).balance);
    }
    
    function submitTransaction(address _to, uint256 _value, bytes memory _data) public onlyOwner {
        uint256 txIndex = transactionCount;
        
        transactions[txIndex] = Transaction({
            to: _to,
            value: _value,
            data: _data,
            executed: false,
            confirmations: 0
        });
        
        transactionCount++;
        
        emit SubmitTransaction(msg.sender, txIndex, _to, _value, _data);
    }
    
    function confirmTransaction(uint256 _txIndex) 
        public 
        onlyOwner 
        txExists(_txIndex) 
        notExecuted(_txIndex) 
        notConfirmed(_txIndex) 
    {
        Transaction storage transaction = transactions[_txIndex];
        transaction.confirmations++;
        confirmations[_txIndex][msg.sender] = true;
        
        emit ConfirmTransaction(msg.sender, _txIndex);
    }
    
    function executeTransaction(uint256 _txIndex) 
        public 
        onlyOwner 
        txExists(_txIndex) 
        notExecuted(_txIndex) 
        nonReentrant
    {
        Transaction storage transaction = transactions[_txIndex];
        
        require(transaction.confirmations >= required, "Cannot execute transaction");
        
        transaction.executed = true;
        
        (bool success, ) = transaction.to.call{value: transaction.value}(transaction.data);
        require(success, "Transaction failed");
        
        emit ExecuteTransaction(msg.sender, _txIndex);
    }
    
    function revokeConfirmation(uint256 _txIndex) 
        public 
        onlyOwner 
        txExists(_txIndex) 
        notExecuted(_txIndex) 
    {
        require(confirmations[_txIndex][msg.sender], "Transaction not confirmed");
        
        Transaction storage transaction = transactions[_txIndex];
        transaction.confirmations--;
        confirmations[_txIndex][msg.sender] = false;
        
        emit RevokeConfirmation(msg.sender, _txIndex);
    }
    
    function getOwners() public view returns (address[] memory) {
        return owners;
    }
    
    function getTransactionCount() public view returns (uint256) {
        return transactionCount;
    }
    
    function getTransaction(uint256 _txIndex) 
        public 
        view 
        returns (address to, uint256 value, bytes memory data, bool executed, uint256 confirmations) 
    {
        Transaction storage transaction = transactions[_txIndex];
        
        return (
            transaction.to,
            transaction.value,
            transaction.data,
            transaction.executed,
            transaction.confirmations
        );
    }
}
"#.to_string(),
                parameters: vec![
                    TemplateParameter {
                        name: "owners".to_string(),
                        param_type: "address[]".to_string(),
                        description: "钱包所有者地址列表".to_string(),
                        required: true,
                        default_value: None,
                    },
                    TemplateParameter {
                        name: "required".to_string(),
                        param_type: "uint256".to_string(),
                        description: "执行交易所需的最少签名数".to_string(),
                        required: true,
                        default_value: Some("2".to_string()),
                    },
                ],
                security_features: vec![
                    "ReentrancyGuard protection".to_string(),
                    "Multi-signature verification".to_string(),
                    "Owner validation".to_string(),
                    "Transaction confirmation system".to_string(),
                ],
                tags: vec!["multisig".to_string(), "wallet".to_string(), "security".to_string()],
                complexity: TemplateComplexity::Complex,
                gas_estimate: GasEstimate {
                    deployment: 3500000,
                    typical_transaction: 200000,
                },
            },
        ]
    }
    
    /// 添加新模板
    pub async fn add_template(
        &self,
        template: ContractTemplate,
        version: String,
        change_info: VersionChangeInfo,
        created_by: Option<String>,
    ) -> Result<TemplateManagementResult> {
        let start_time = std::time::Instant::now();
        
        // 存储模板
        let template_uuid = self.storage.store_template(&template).await?;
        
        // 创建版本
        let template_version = self.version_control.create_version(
            &template.id,
            &version,
            &template,
            change_info,
            created_by.as_deref(),
        ).await?;
        
        // 更新相似度计算
        self.recommendation_engine.update_template_similarities().await?;
        
        let processing_time = start_time.elapsed().as_millis() as u64;
        
        Ok(TemplateManagementResult {
            success: true,
            template_id: Some(template_uuid),
            version_id: Some(template_version.id),
            message: "模板添加成功".to_string(),
            processing_time_ms: processing_time,
        })
    }
    
    /// 更新模板
    pub async fn update_template(
        &self,
        template_id: &str,
        new_version: String,
        updated_template: ContractTemplate,
        change_info: VersionChangeInfo,
        updated_by: Option<String>,
    ) -> Result<TemplateManagementResult> {
        let start_time = std::time::Instant::now();
        
        // 检查模板是否存在
        let existing = self.storage.get_template(template_id).await?;
        if existing.is_none() {
            return Err(AiContractError::serialization_error(format!("模板 {} 不存在", template_id)));
        }
        
        // 存储新版本的模板
        let template_uuid = self.storage.store_template(&updated_template).await?;
        
        // 创建新版本
        let template_version = self.version_control.create_version(
            template_id,
            &new_version,
            &updated_template,
            change_info,
            updated_by.as_deref(),
        ).await?;
        
        // 更新相似度计算
        self.recommendation_engine.update_template_similarities().await?;
        
        let processing_time = start_time.elapsed().as_millis() as u64;
        
        Ok(TemplateManagementResult {
            success: true,
            template_id: Some(template_uuid),
            version_id: Some(template_version.id),
            message: "模板更新成功".to_string(),
            processing_time_ms: processing_time,
        })
    }
    
    /// 获取模板推荐
    pub async fn get_recommendations(
        &self,
        request: RecommendationRequest,
    ) -> Result<RecommendationResponse> {
        self.recommendation_engine.get_recommendations(request).await
    }
    
    /// 搜索模板
    pub async fn search_templates(
        &self,
        query: TemplateSearchQuery,
    ) -> Result<Vec<StoredTemplate>> {
        self.storage.search_templates(&query).await
    }
    
    /// 获取模板详情
    pub async fn get_template_details(
        &self,
        template_id: &str,
        version: Option<&str>,
    ) -> Result<Option<TemplateDetails>> {
        // 获取模板基本信息
        let template = self.storage.get_template(template_id).await?;
        if template.is_none() {
            return Ok(None);
        }
        let template = template.unwrap();
        
        // 获取版本信息
        let template_version = if let Some(ver) = version {
            self.version_control.get_version(template_id, ver).await?
        } else {
            self.version_control.get_latest_stable_version(template_id).await?
        };
        
        // 获取所有版本
        let all_versions = self.version_control.get_all_versions(template_id).await?;
        
        // 获取相似模板
        let similar_templates = self.recommendation_engine.get_similar_templates(
            template.id,
            Some(5),
        ).await?;
        
        Ok(Some(TemplateDetails {
            template,
            current_version: template_version,
            all_versions,
            similar_templates,
            usage_statistics: self.get_template_usage_statistics(template_id).await?,
        }))
    }
    
    /// 获取模板使用统计
    async fn get_template_usage_statistics(&self, template_id: &str) -> Result<TemplateUsageStatistics> {
        let row = sqlx::query(r#"
            SELECT 
                ct.usage_count as total_usage,
                ct.rating as average_rating,
                COALESCE(recent.recent_usage, 0) as recent_usage,
                COALESCE(recent.success_rate, 0) as success_rate
            FROM contract_templates ct
            LEFT JOIN (
                SELECT 
                    template_id,
                    SUM(usage_count) as recent_usage,
                    CASE 
                        WHEN SUM(usage_count + success_count + failure_count) > 0 
                        THEN SUM(success_count)::DECIMAL / SUM(usage_count + success_count + failure_count)
                        ELSE 0 
                    END as success_rate
                FROM template_usage_stats tus
                JOIN contract_templates ct2 ON tus.template_id = ct2.id
                WHERE ct2.template_id = $1 AND tus.usage_date >= CURRENT_DATE - INTERVAL '30 days'
                GROUP BY template_id
            ) recent ON ct.id = recent.template_id
            WHERE ct.template_id = $1
        "#)
        .bind(template_id)
        .fetch_optional(&self.db_pool)
        .await
        .map_err(|e| AiContractError::database_error(format!("查询使用统计失败: {}", e)))?;
        
        if let Some(row) = row {
            use sqlx::Row;
            Ok(TemplateUsageStatistics {
                total_usage: row.get::<i64, _>("total_usage") as u64,
                recent_usage: row.get::<i64, _>("recent_usage") as u64,
                average_rating: row.get("average_rating"),
                success_rate: row.get("success_rate"),
            })
        } else {
            Ok(TemplateUsageStatistics {
                total_usage: 0,
                recent_usage: 0,
                average_rating: None,
                success_rate: 0.0,
            })
        }
    }
    
    /// 记录模板使用
    pub async fn record_template_usage(
        &self,
        template_id: Uuid,
        user_id: Option<&str>,
        success: bool,
        generation_time: Option<f64>,
    ) -> Result<()> {
        self.storage.update_usage_stats(template_id, user_id, success, generation_time).await
    }
    
    /// 提交模板评价
    pub async fn submit_template_rating(
        &self,
        template_id: Uuid,
        user_id: &str,
        rating: u8,
        comment: Option<&str>,
    ) -> Result<()> {
        self.storage.add_rating(template_id, user_id, rating, comment).await
    }
    
    /// 获取模板统计信息
    pub async fn get_library_statistics(&self) -> Result<LibraryStatistics> {
        let stats = sqlx::query(r#"
            SELECT 
                COUNT(*) as total_templates,
                COUNT(CASE WHEN is_verified THEN 1 END) as verified_templates,
                COUNT(CASE WHEN contract_type = 'ERC20Token' THEN 1 END) as erc20_templates,
                COUNT(CASE WHEN contract_type = 'ERC721NFT' THEN 1 END) as erc721_templates,
                COUNT(CASE WHEN contract_type = 'ERC1155MultiToken' THEN 1 END) as erc1155_templates,
                COUNT(CASE WHEN contract_type = 'Governance' THEN 1 END) as governance_templates,
                COUNT(CASE WHEN contract_type = 'MultiSig' THEN 1 END) as multisig_templates,
                SUM(usage_count) as total_usage,
                AVG(rating) as average_rating
            FROM contract_templates
            WHERE is_active = true
        "#)
        .fetch_one(&self.db_pool)
        .await
        .map_err(|e| AiContractError::database_error(format!("查询库统计失败: {}", e)))?;
        
        use sqlx::Row;
        Ok(LibraryStatistics {
            total_templates: stats.get::<i64, _>("total_templates") as u64,
            verified_templates: stats.get::<i64, _>("verified_templates") as u64,
            templates_by_type: std::collections::HashMap::from([
                ("ERC20Token".to_string(), stats.get::<i64, _>("erc20_templates") as u64),
                ("ERC721NFT".to_string(), stats.get::<i64, _>("erc721_templates") as u64),
                ("ERC1155MultiToken".to_string(), stats.get::<i64, _>("erc1155_templates") as u64),
                ("Governance".to_string(), stats.get::<i64, _>("governance_templates") as u64),
                ("MultiSig".to_string(), stats.get::<i64, _>("multisig_templates") as u64),
            ]),
            total_usage: stats.get::<i64, _>("total_usage") as u64,
            average_rating: stats.get("average_rating"),
        })
    }
}

// 数据结构定义

/// 模板管理结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateManagementResult {
    /// 操作是否成功
    pub success: bool,
    
    /// 模板ID
    pub template_id: Option<Uuid>,
    
    /// 版本ID
    pub version_id: Option<Uuid>,
    
    /// 结果消息
    pub message: String,
    
    /// 处理时间（毫秒）
    pub processing_time_ms: u64,
}

/// 模板详情
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateDetails {
    /// 模板信息
    pub template: StoredTemplate,
    
    /// 当前版本
    pub current_version: Option<TemplateVersion>,
    
    /// 所有版本
    pub all_versions: Vec<TemplateVersion>,
    
    /// 相似模板
    pub similar_templates: Vec<crate::templates::recommendation::SimilarTemplate>,
    
    /// 使用统计
    pub usage_statistics: TemplateUsageStatistics,
}

/// 模板使用统计
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateUsageStatistics {
    /// 总使用次数
    pub total_usage: u64,
    
    /// 最近使用次数（30天内）
    pub recent_usage: u64,
    
    /// 平均评分
    pub average_rating: Option<f64>,
    
    /// 成功率
    pub success_rate: f64,
}

/// 库统计信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LibraryStatistics {
    /// 总模板数
    pub total_templates: u64,
    
    /// 已验证模板数
    pub verified_templates: u64,
    
    /// 按类型分组的模板数
    pub templates_by_type: std::collections::HashMap<String, u64>,
    
    /// 总使用次数
    pub total_usage: u64,
    
    /// 平均评分
    pub average_rating: Option<f64>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::PgPool;
    use tempfile::TempDir;

    async fn setup_test_manager() -> (TemplateLibraryManager, TempDir) {
        let temp_dir = TempDir::new().unwrap();
        let db_pool = PgPool::connect("postgresql://test:test@localhost/test").await.unwrap();
        let manager = TemplateLibraryManager::new(db_pool, temp_dir.path().to_path_buf()).await.unwrap();
        manager.initialize().await.unwrap();
        (manager, temp_dir)
    }

    #[tokio::test]
    async fn test_manager_initialization() {
        let (manager, _temp_dir) = setup_test_manager().await;
        
        // 测试获取库统计信息
        let stats = manager.get_library_statistics().await.unwrap();
        assert!(stats.total_templates > 0); // 应该有默认模板
    }

    #[tokio::test]
    async fn test_get_template_details() {
        let (manager, _temp_dir) = setup_test_manager().await;
        
        // 测试获取不存在的模板
        let details = manager.get_template_details("nonexistent", None).await.unwrap();
        assert!(details.is_none());
        
        // 测试获取存在的模板（如果有默认模板）
        let details = manager.get_template_details("erc20_basic", None).await.unwrap();
        if let Some(details) = details {
            assert_eq!(details.template.template_id, "erc20_basic");
        }
    }

    #[tokio::test]
    async fn test_search_templates() {
        let (manager, _temp_dir) = setup_test_manager().await;
        
        let query = TemplateSearchQuery {
            limit: Some(10),
            ..Default::default()
        };
        
        let results = manager.search_templates(query).await.unwrap();
        // 应该有一些默认模板
        assert!(!results.is_empty());
    }
}