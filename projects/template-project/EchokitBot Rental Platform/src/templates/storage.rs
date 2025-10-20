//! 模板存储和索引系统
//! 
//! 提供模板的数据库存储、文件管理、元数据索引和搜索功能

use crate::error::{AiContractError, Result};
use crate::templates::registry::{ContractTemplate, TemplateParameter, TemplateComplexity, GasEstimate};
use crate::types::ContractType;
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row};
use std::collections::HashMap;
use uuid::Uuid;
use chrono::{DateTime, Utc};
use tokio::fs;
use std::path::{Path, PathBuf};

/// 模板存储管理器
#[derive(Clone)]
pub struct TemplateStorage {
    /// 数据库连接池
    db_pool: PgPool,
    
    /// 模板文件存储路径
    storage_path: PathBuf,
    
    /// 索引管理器
    index_manager: TemplateIndexManager,
    
    /// 分类管理器
    category_manager: CategoryManager,
}

impl TemplateStorage {
    /// 创建新的模板存储管理器
    pub async fn new(db_pool: PgPool, storage_path: PathBuf) -> Result<Self> {
        // 确保存储目录存在
        fs::create_dir_all(&storage_path).await
            .map_err(|e| AiContractError::storage_error(format!("创建存储目录失败: {}", e)))?;
        
        let index_manager = TemplateIndexManager::new(db_pool.clone()).await?;
        let category_manager = CategoryManager::new(db_pool.clone()).await?;
        
        Ok(Self {
            db_pool,
            storage_path,
            index_manager,
            category_manager,
        })
    }
    
    /// 初始化数据库表
    pub async fn initialize_database(&self) -> Result<()> {
        // 创建模板表
        sqlx::query(r#"
            CREATE TABLE IF NOT EXISTS contract_templates (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                template_id VARCHAR(255) UNIQUE NOT NULL,
                name VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                contract_type VARCHAR(50) NOT NULL,
                version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
                author VARCHAR(255),
                license VARCHAR(100),
                base_contracts TEXT[] NOT NULL DEFAULT '{}',
                required_imports TEXT[] NOT NULL DEFAULT '{}',
                security_features TEXT[] NOT NULL DEFAULT '{}',
                tags TEXT[] NOT NULL DEFAULT '{}',
                complexity VARCHAR(20) NOT NULL,
                deployment_gas BIGINT NOT NULL,
                transaction_gas BIGINT NOT NULL,
                file_path VARCHAR(500) NOT NULL,
                checksum VARCHAR(64) NOT NULL,
                is_active BOOLEAN NOT NULL DEFAULT true,
                is_verified BOOLEAN NOT NULL DEFAULT false,
                usage_count BIGINT NOT NULL DEFAULT 0,
                rating DECIMAL(3,2) DEFAULT 0.0,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        "#)
        .execute(&self.db_pool)
        .await
        .map_err(|e| AiContractError::database_error(format!("创建模板表失败: {}", e)))?;
        
        // 创建模板参数表
        sqlx::query(r#"
            CREATE TABLE IF NOT EXISTS template_parameters (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                template_id UUID NOT NULL REFERENCES contract_templates(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                param_type VARCHAR(100) NOT NULL,
                description TEXT,
                is_required BOOLEAN NOT NULL DEFAULT true,
                default_value TEXT,
                validation_rules JSONB,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        "#)
        .execute(&self.db_pool)
        .await
        .map_err(|e| AiContractError::database_error(format!("创建参数表失败: {}", e)))?;
        
        // 创建模板分类表
        sqlx::query(r#"
            CREATE TABLE IF NOT EXISTS template_categories (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(255) UNIQUE NOT NULL,
                description TEXT,
                parent_id UUID REFERENCES template_categories(id),
                sort_order INTEGER NOT NULL DEFAULT 0,
                is_active BOOLEAN NOT NULL DEFAULT true,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        "#)
        .execute(&self.db_pool)
        .await
        .map_err(|e| AiContractError::database_error(format!("创建分类表失败: {}", e)))?;
        
        // 创建模板分类关联表
        sqlx::query(r#"
            CREATE TABLE IF NOT EXISTS template_category_mappings (
                template_id UUID NOT NULL REFERENCES contract_templates(id) ON DELETE CASCADE,
                category_id UUID NOT NULL REFERENCES template_categories(id) ON DELETE CASCADE,
                PRIMARY KEY (template_id, category_id)
            )
        "#)
        .execute(&self.db_pool)
        .await
        .map_err(|e| AiContractError::database_error(format!("创建分类关联表失败: {}", e)))?;
        
        // 创建模板使用统计表
        sqlx::query(r#"
            CREATE TABLE IF NOT EXISTS template_usage_stats (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                template_id UUID NOT NULL REFERENCES contract_templates(id) ON DELETE CASCADE,
                user_id VARCHAR(255),
                usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
                usage_count INTEGER NOT NULL DEFAULT 1,
                success_count INTEGER NOT NULL DEFAULT 0,
                failure_count INTEGER NOT NULL DEFAULT 0,
                avg_generation_time DECIMAL(10,3),
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE(template_id, user_id, usage_date)
            )
        "#)
        .execute(&self.db_pool)
        .await
        .map_err(|e| AiContractError::database_error(format!("创建使用统计表失败: {}", e)))?;
        
        // 创建模板评价表
        sqlx::query(r#"
            CREATE TABLE IF NOT EXISTS template_ratings (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                template_id UUID NOT NULL REFERENCES contract_templates(id) ON DELETE CASCADE,
                user_id VARCHAR(255) NOT NULL,
                rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
                comment TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE(template_id, user_id)
            )
        "#)
        .execute(&self.db_pool)
        .await
        .map_err(|e| AiContractError::database_error(format!("创建评价表失败: {}", e)))?;
        
        // 创建索引
        self.create_indexes().await?;
        
        // 初始化默认分类
        self.category_manager.initialize_default_categories().await?;
        
        Ok(())
    }
    
    /// 创建数据库索引
    async fn create_indexes(&self) -> Result<()> {
        let indexes = vec![
            "CREATE INDEX IF NOT EXISTS idx_templates_type ON contract_templates(contract_type)",
            "CREATE INDEX IF NOT EXISTS idx_templates_tags ON contract_templates USING GIN(tags)",
            "CREATE INDEX IF NOT EXISTS idx_templates_active ON contract_templates(is_active)",
            "CREATE INDEX IF NOT EXISTS idx_templates_usage ON contract_templates(usage_count DESC)",
            "CREATE INDEX IF NOT EXISTS idx_templates_rating ON contract_templates(rating DESC)",
            "CREATE INDEX IF NOT EXISTS idx_templates_created ON contract_templates(created_at DESC)",
            "CREATE INDEX IF NOT EXISTS idx_parameters_template ON template_parameters(template_id)",
            "CREATE INDEX IF NOT EXISTS idx_usage_stats_template ON template_usage_stats(template_id)",
            "CREATE INDEX IF NOT EXISTS idx_usage_stats_date ON template_usage_stats(usage_date DESC)",
            "CREATE INDEX IF NOT EXISTS idx_ratings_template ON template_ratings(template_id)",
        ];
        
        for index_sql in indexes {
            sqlx::query(index_sql)
                .execute(&self.db_pool)
                .await
                .map_err(|e| AiContractError::database_error(format!("创建索引失败: {}", e)))?;
        }
        
        Ok(())
    }
    
    /// 存储模板
    pub async fn store_template(&self, template: &ContractTemplate) -> Result<Uuid> {
        let mut tx = self.db_pool.begin().await
            .map_err(|e| AiContractError::database_error(format!("开始事务失败: {}", e)))?;
        
        // 计算文件校验和
        let checksum = self.calculate_checksum(&template.template_code)?;
        
        // 存储模板文件
        let file_path = self.store_template_file(&template.id, &template.template_code).await?;
        
        // 插入模板记录
        let template_uuid = sqlx::query_scalar::<_, Uuid>(r#"
            INSERT INTO contract_templates (
                template_id, name, description, contract_type, base_contracts,
                required_imports, security_features, tags, complexity,
                deployment_gas, transaction_gas, file_path, checksum
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING id
        "#)
        .bind(&template.id)
        .bind(&template.name)
        .bind(&template.description)
        .bind(self.contract_type_to_string(&template.contract_type))
        .bind(&template.base_contracts)
        .bind(&template.required_imports)
        .bind(&template.security_features)
        .bind(&template.tags)
        .bind(self.complexity_to_string(&template.complexity))
        .bind(template.gas_estimate.deployment as i64)
        .bind(template.gas_estimate.typical_transaction as i64)
        .bind(file_path.to_string_lossy().to_string())
        .bind(&checksum)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| AiContractError::database_error(format!("插入模板失败: {}", e)))?;
        
        // 插入模板参数
        for param in &template.parameters {
            sqlx::query(r#"
                INSERT INTO template_parameters (
                    template_id, name, param_type, description, is_required, default_value
                ) VALUES ($1, $2, $3, $4, $5, $6)
            "#)
            .bind(template_uuid)
            .bind(&param.name)
            .bind(&param.param_type)
            .bind(&param.description)
            .bind(param.required)
            .bind(&param.default_value)
            .execute(&mut *tx)
            .await
            .map_err(|e| AiContractError::database_error(format!("插入参数失败: {}", e)))?;
        }
        
        tx.commit().await
            .map_err(|e| AiContractError::database_error(format!("提交事务失败: {}", e)))?;
        
        // 更新索引
        self.index_manager.index_template(template_uuid, template).await?;
        
        Ok(template_uuid)
    }
    
    /// 存储模板文件
    async fn store_template_file(&self, template_id: &str, content: &str) -> Result<PathBuf> {
        let file_path = self.storage_path.join(format!("{}.sol", template_id));
        
        fs::write(&file_path, content).await
            .map_err(|e| AiContractError::storage_error(format!("写入模板文件失败: {}", e)))?;
        
        Ok(file_path)
    }
    
    /// 计算文件校验和
    fn calculate_checksum(&self, content: &str) -> Result<String> {
        use sha2::{Sha256, Digest};
        
        let mut hasher = Sha256::new();
        hasher.update(content.as_bytes());
        let result = hasher.finalize();
        
        Ok(format!("{:x}", result))
    }
    
    /// 获取模板
    pub async fn get_template(&self, template_id: &str) -> Result<Option<StoredTemplate>> {
        let row = sqlx::query(r#"
            SELECT 
                id, template_id, name, description, contract_type, version,
                author, license, base_contracts, required_imports, security_features,
                tags, complexity, deployment_gas, transaction_gas, file_path,
                checksum, is_active, is_verified, usage_count, rating,
                created_at, updated_at
            FROM contract_templates 
            WHERE template_id = $1 AND is_active = true
        "#)
        .bind(template_id)
        .fetch_optional(&self.db_pool)
        .await
        .map_err(|e| AiContractError::database_error(format!("查询模板失败: {}", e)))?;
        
        if let Some(row) = row {
            let template_uuid: Uuid = row.get("id");
            
            // 获取参数
            let parameters = self.get_template_parameters(template_uuid).await?;
            
            // 读取模板文件内容
            let file_path: String = row.get("file_path");
            let template_code = fs::read_to_string(&file_path).await
                .map_err(|e| AiContractError::storage_error(format!("读取模板文件失败: {}", e)))?;
            
            let stored_template = StoredTemplate {
                id: template_uuid,
                template_id: row.get("template_id"),
                name: row.get("name"),
                description: row.get("description"),
                contract_type: self.string_to_contract_type(&row.get::<String, _>("contract_type"))?,
                version: row.get("version"),
                author: row.get("author"),
                license: row.get("license"),
                base_contracts: row.get("base_contracts"),
                required_imports: row.get("required_imports"),
                security_features: row.get("security_features"),
                tags: row.get("tags"),
                complexity: self.string_to_complexity(&row.get::<String, _>("complexity"))?,
                gas_estimate: GasEstimate {
                    deployment: row.get::<i64, _>("deployment_gas") as u64,
                    typical_transaction: row.get::<i64, _>("transaction_gas") as u64,
                },
                template_code,
                parameters,
                file_path: PathBuf::from(file_path),
                checksum: row.get("checksum"),
                is_active: row.get("is_active"),
                is_verified: row.get("is_verified"),
                usage_count: row.get::<i64, _>("usage_count") as u64,
                rating: row.get("rating"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
            };
            
            Ok(Some(stored_template))
        } else {
            Ok(None)
        }
    }
    
    /// 获取模板参数
    async fn get_template_parameters(&self, template_id: Uuid) -> Result<Vec<TemplateParameter>> {
        let rows = sqlx::query(r#"
            SELECT name, param_type, description, is_required, default_value
            FROM template_parameters
            WHERE template_id = $1
            ORDER BY name
        "#)
        .bind(template_id)
        .fetch_all(&self.db_pool)
        .await
        .map_err(|e| AiContractError::database_error(format!("查询参数失败: {}", e)))?;
        
        let mut parameters = Vec::new();
        for row in rows {
            parameters.push(TemplateParameter {
                name: row.get("name"),
                param_type: row.get("param_type"),
                description: row.get("description"),
                required: row.get("is_required"),
                default_value: row.get("default_value"),
            });
        }
        
        Ok(parameters)
    }
    
    /// 搜索模板
    pub async fn search_templates(&self, query: &TemplateSearchQuery) -> Result<Vec<StoredTemplate>> {
        let mut sql = String::from(r#"
            SELECT 
                id, template_id, name, description, contract_type, version,
                author, license, base_contracts, required_imports, security_features,
                tags, complexity, deployment_gas, transaction_gas, file_path,
                checksum, is_active, is_verified, usage_count, rating,
                created_at, updated_at
            FROM contract_templates 
            WHERE is_active = true
        "#);
        
        let mut conditions = Vec::new();
        let mut bind_values: Vec<Box<dyn sqlx::Encode<'_, sqlx::Postgres> + Send + Sync>> = Vec::new();
        let mut param_count = 1;
        
        // 添加搜索条件
        if let Some(text) = &query.text {
            conditions.push(format!(
                "(name ILIKE ${} OR description ILIKE ${} OR ${} = ANY(tags))",
                param_count, param_count + 1, param_count + 2
            ));
            let pattern = format!("%{}%", text);
            bind_values.push(Box::new(pattern.clone()));
            bind_values.push(Box::new(pattern));
            bind_values.push(Box::new(text.clone()));
            param_count += 3;
        }
        
        if let Some(contract_type) = &query.contract_type {
            conditions.push(format!("contract_type = ${}", param_count));
            bind_values.push(Box::new(self.contract_type_to_string(contract_type)));
            param_count += 1;
        }
        
        if let Some(complexity) = &query.complexity {
            conditions.push(format!("complexity = ${}", param_count));
            bind_values.push(Box::new(self.complexity_to_string(complexity)));
            param_count += 1;
        }
        
        if let Some(tags) = &query.tags {
            if !tags.is_empty() {
                conditions.push(format!("tags && ${}", param_count));
                bind_values.push(Box::new(tags.clone()));
                param_count += 1;
            }
        }
        
        if query.verified_only {
            conditions.push("is_verified = true".to_string());
        }
        
        if let Some(min_rating) = query.min_rating {
            conditions.push(format!("rating >= ${}", param_count));
            bind_values.push(Box::new(min_rating));
            param_count += 1;
        }
        
        // 添加条件到 SQL
        if !conditions.is_empty() {
            sql.push_str(" AND ");
            sql.push_str(&conditions.join(" AND "));
        }
        
        // 添加排序
        match query.sort_by {
            TemplateSortBy::Name => sql.push_str(" ORDER BY name"),
            TemplateSortBy::CreatedAt => sql.push_str(" ORDER BY created_at DESC"),
            TemplateSortBy::Usage => sql.push_str(" ORDER BY usage_count DESC"),
            TemplateSortBy::Rating => sql.push_str(" ORDER BY rating DESC"),
            TemplateSortBy::Relevance => sql.push_str(" ORDER BY usage_count DESC, rating DESC"),
        }
        
        // 添加分页
        if let Some(limit) = query.limit {
            sql.push_str(&format!(" LIMIT {}", limit));
        }
        
        if let Some(offset) = query.offset {
            sql.push_str(&format!(" OFFSET {}", offset));
        }
        
        // 执行查询
        // TODO: 实现动态参数绑定
        // let mut query_builder = sqlx::query(&sql);
        // for value in bind_values {
        //     query_builder = query_builder.bind(value);
        // }
        
        // 简化版本：直接执行基础查询
        let rows = sqlx::query(&format!(r#"
            SELECT 
                id, template_id, name, description, contract_type, version,
                author, license, base_contracts, required_imports, security_features,
                tags, complexity, deployment_gas, transaction_gas, file_path,
                checksum, is_active, is_verified, usage_count, rating,
                created_at, updated_at
            FROM contract_templates 
            WHERE is_active = true
            ORDER BY usage_count DESC, rating DESC
            LIMIT {}
        "#, query.limit.unwrap_or(50)))
        .fetch_all(&self.db_pool)
        .await
        .map_err(|e| AiContractError::database_error(format!("搜索模板失败: {}", e)))?;
        
        let mut templates = Vec::new();
        for row in rows {
            let template_uuid: Uuid = row.get("id");
            let parameters = self.get_template_parameters(template_uuid).await?;
            
            let file_path: String = row.get("file_path");
            let template_code = fs::read_to_string(&file_path).await
                .unwrap_or_default();
            
            templates.push(StoredTemplate {
                id: template_uuid,
                template_id: row.get("template_id"),
                name: row.get("name"),
                description: row.get("description"),
                contract_type: self.string_to_contract_type(&row.get::<String, _>("contract_type"))?,
                version: row.get("version"),
                author: row.get("author"),
                license: row.get("license"),
                base_contracts: row.get("base_contracts"),
                required_imports: row.get("required_imports"),
                security_features: row.get("security_features"),
                tags: row.get("tags"),
                complexity: self.string_to_complexity(&row.get::<String, _>("complexity"))?,
                gas_estimate: GasEstimate {
                    deployment: row.get::<i64, _>("deployment_gas") as u64,
                    typical_transaction: row.get::<i64, _>("transaction_gas") as u64,
                },
                template_code,
                parameters,
                file_path: PathBuf::from(file_path),
                checksum: row.get("checksum"),
                is_active: row.get("is_active"),
                is_verified: row.get("is_verified"),
                usage_count: row.get::<i64, _>("usage_count") as u64,
                rating: row.get("rating"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
            });
        }
        
        Ok(templates)
    }
    
    /// 更新模板使用统计
    pub async fn update_usage_stats(&self, template_id: Uuid, user_id: Option<&str>, success: bool, generation_time: Option<f64>) -> Result<()> {
        let user_id_str = user_id.unwrap_or("anonymous");
        
        // 更新或插入使用统计
        sqlx::query(r#"
            INSERT INTO template_usage_stats (template_id, user_id, usage_count, success_count, failure_count, avg_generation_time)
            VALUES ($1, $2, 1, $3, $4, $5)
            ON CONFLICT (template_id, user_id, usage_date)
            DO UPDATE SET
                usage_count = template_usage_stats.usage_count + 1,
                success_count = template_usage_stats.success_count + $3,
                failure_count = template_usage_stats.failure_count + $4,
                avg_generation_time = CASE 
                    WHEN $5 IS NOT NULL THEN 
                        (COALESCE(template_usage_stats.avg_generation_time, 0) * template_usage_stats.usage_count + $5) / (template_usage_stats.usage_count + 1)
                    ELSE template_usage_stats.avg_generation_time
                END,
                updated_at = NOW()
        "#)
        .bind(template_id)
        .bind(user_id_str)
        .bind(if success { 1 } else { 0 })
        .bind(if success { 0 } else { 1 })
        .bind(generation_time)
        .execute(&self.db_pool)
        .await
        .map_err(|e| AiContractError::database_error(format!("更新使用统计失败: {}", e)))?;
        
        // 更新模板总使用次数
        sqlx::query(r#"
            UPDATE contract_templates 
            SET usage_count = usage_count + 1, updated_at = NOW()
            WHERE id = $1
        "#)
        .bind(template_id)
        .execute(&self.db_pool)
        .await
        .map_err(|e| AiContractError::database_error(format!("更新模板使用次数失败: {}", e)))?;
        
        Ok(())
    }
    
    /// 添加模板评价
    pub async fn add_rating(&self, template_id: Uuid, user_id: &str, rating: u8, comment: Option<&str>) -> Result<()> {
        if rating < 1 || rating > 5 {
            return Err(AiContractError::config_error("评分必须在 1-5 之间"));
        }
        
        // 插入或更新评价
        sqlx::query(r#"
            INSERT INTO template_ratings (template_id, user_id, rating, comment)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (template_id, user_id)
            DO UPDATE SET rating = $3, comment = $4, created_at = NOW()
        "#)
        .bind(template_id)
        .bind(user_id)
        .bind(rating as i32)
        .bind(comment)
        .execute(&self.db_pool)
        .await
        .map_err(|e| AiContractError::database_error(format!("添加评价失败: {}", e)))?;
        
        // 重新计算平均评分
        self.update_template_rating(template_id).await?;
        
        Ok(())
    }
    
    /// 更新模板平均评分
    async fn update_template_rating(&self, template_id: Uuid) -> Result<()> {
        sqlx::query(r#"
            UPDATE contract_templates 
            SET rating = (
                SELECT COALESCE(AVG(rating::DECIMAL), 0.0)
                FROM template_ratings 
                WHERE template_id = $1
            ),
            updated_at = NOW()
            WHERE id = $1
        "#)
        .bind(template_id)
        .execute(&self.db_pool)
        .await
        .map_err(|e| AiContractError::database_error(format!("更新平均评分失败: {}", e)))?;
        
        Ok(())
    }
    
    // 辅助方法
    fn contract_type_to_string(&self, contract_type: &ContractType) -> String {
        match contract_type {
            ContractType::ERC20Token => "ERC20Token".to_string(),
            ContractType::ERC721NFT => "ERC721NFT".to_string(),
            ContractType::ERC1155MultiToken => "ERC1155MultiToken".to_string(),
            ContractType::Governance => "Governance".to_string(),
            ContractType::MultiSig => "MultiSig".to_string(),
            ContractType::Vault => "Vault".to_string(),
            ContractType::DeFi => "DeFi".to_string(),
            ContractType::Custom => "Custom".to_string(),
        }
    }
    
    fn string_to_contract_type(&self, s: &str) -> Result<ContractType> {
        match s {
            "ERC20Token" => Ok(ContractType::ERC20Token),
            "ERC721NFT" => Ok(ContractType::ERC721NFT),
            "ERC1155MultiToken" => Ok(ContractType::ERC1155MultiToken),
            "Governance" => Ok(ContractType::Governance),
            "MultiSig" => Ok(ContractType::MultiSig),
            "Vault" => Ok(ContractType::Vault),
            "DeFi" => Ok(ContractType::DeFi),
            "Custom" => Ok(ContractType::Custom),
            _ => Err(AiContractError::serialization_error(format!("未知的合约类型: {}", s))),
        }
    }
    
    fn complexity_to_string(&self, complexity: &TemplateComplexity) -> String {
        match complexity {
            TemplateComplexity::Simple => "Simple".to_string(),
            TemplateComplexity::Medium => "Medium".to_string(),
            TemplateComplexity::Complex => "Complex".to_string(),
            TemplateComplexity::Advanced => "Advanced".to_string(),
        }
    }
    
    fn string_to_complexity(&self, s: &str) -> Result<TemplateComplexity> {
        match s {
            "Simple" => Ok(TemplateComplexity::Simple),
            "Medium" => Ok(TemplateComplexity::Medium),
            "Complex" => Ok(TemplateComplexity::Complex),
            "Advanced" => Ok(TemplateComplexity::Advanced),
            _ => Err(AiContractError::serialization_error(format!("未知的复杂度: {}", s))),
        }
    }
}

/// 模板索引管理器
#[derive(Clone)]
pub struct TemplateIndexManager {
    db_pool: PgPool,
}

impl TemplateIndexManager {
    pub async fn new(db_pool: PgPool) -> Result<Self> {
        Ok(Self { db_pool })
    }
    
    /// 为模板建立索引
    pub async fn index_template(&self, template_id: Uuid, template: &ContractTemplate) -> Result<()> {
        // 这里可以实现全文搜索索引、向量索引等
        // 目前使用数据库的基础索引功能
        Ok(())
    }
    
    /// 重建所有索引
    pub async fn rebuild_indexes(&self) -> Result<()> {
        // 重建索引的实现
        Ok(())
    }
}

/// 分类管理器
#[derive(Clone)]
pub struct CategoryManager {
    db_pool: PgPool,
}

impl CategoryManager {
    pub async fn new(db_pool: PgPool) -> Result<Self> {
        Ok(Self { db_pool })
    }
    
    /// 初始化默认分类
    pub async fn initialize_default_categories(&self) -> Result<()> {
        let categories = vec![
            ("代币合约", "Token Contracts", None),
            ("ERC-20", "ERC-20 Tokens", Some("代币合约")),
            ("ERC-721", "ERC-721 NFTs", Some("代币合约")),
            ("ERC-1155", "ERC-1155 Multi-Tokens", Some("代币合约")),
            ("治理合约", "Governance Contracts", None),
            ("DAO", "Decentralized Autonomous Organization", Some("治理合约")),
            ("投票", "Voting Systems", Some("治理合约")),
            ("金融合约", "Financial Contracts", None),
            ("DeFi", "Decentralized Finance", Some("金融合约")),
            ("借贷", "Lending Protocols", Some("金融合约")),
            ("交易", "Trading Protocols", Some("金融合约")),
            ("安全合约", "Security Contracts", None),
            ("多签钱包", "Multi-Signature Wallets", Some("安全合约")),
            ("时间锁", "Timelocks", Some("安全合约")),
        ];
        
        for (name, description, parent) in categories {
            // 检查分类是否已存在
            let exists = sqlx::query_scalar::<_, bool>(
                "SELECT EXISTS(SELECT 1 FROM template_categories WHERE name = $1)"
            )
            .bind(name)
            .fetch_one(&self.db_pool)
            .await
            .map_err(|e| AiContractError::database_error(format!("检查分类失败: {}", e)))?;
            
            if !exists {
                let parent_id = if let Some(parent_name) = parent {
                    sqlx::query_scalar::<_, Option<Uuid>>(
                        "SELECT id FROM template_categories WHERE name = $1"
                    )
                    .bind(parent_name)
                    .fetch_one(&self.db_pool)
                    .await
                    .map_err(|e| AiContractError::database_error(format!("查找父分类失败: {}", e)))?
                } else {
                    None
                };
                
                sqlx::query(r#"
                    INSERT INTO template_categories (name, description, parent_id)
                    VALUES ($1, $2, $3)
                "#)
                .bind(name)
                .bind(description)
                .bind(parent_id)
                .execute(&self.db_pool)
                .await
                .map_err(|e| AiContractError::database_error(format!("创建分类失败: {}", e)))?;
            }
        }
        
        Ok(())
    }
}

/// 存储的模板
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoredTemplate {
    pub id: Uuid,
    pub template_id: String,
    pub name: String,
    pub description: String,
    pub contract_type: ContractType,
    pub version: String,
    pub author: Option<String>,
    pub license: Option<String>,
    pub base_contracts: Vec<String>,
    pub required_imports: Vec<String>,
    pub security_features: Vec<String>,
    pub tags: Vec<String>,
    pub complexity: TemplateComplexity,
    pub gas_estimate: GasEstimate,
    pub template_code: String,
    pub parameters: Vec<TemplateParameter>,
    pub file_path: PathBuf,
    pub checksum: String,
    pub is_active: bool,
    pub is_verified: bool,
    pub usage_count: u64,
    pub rating: Option<f64>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 模板搜索查询
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct TemplateSearchQuery {
    /// 搜索文本
    pub text: Option<String>,
    
    /// 合约类型
    pub contract_type: Option<ContractType>,
    
    /// 复杂度
    pub complexity: Option<TemplateComplexity>,
    
    /// 标签
    pub tags: Option<Vec<String>>,
    
    /// 只显示已验证的模板
    pub verified_only: bool,
    
    /// 最低评分
    pub min_rating: Option<f64>,
    
    /// 排序方式
    pub sort_by: TemplateSortBy,
    
    /// 限制数量
    pub limit: Option<i64>,
    
    /// 偏移量
    pub offset: Option<i64>,
}

/// 模板排序方式
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TemplateSortBy {
    /// 按名称排序
    Name,
    
    /// 按创建时间排序
    CreatedAt,
    
    /// 按使用次数排序
    Usage,
    
    /// 按评分排序
    Rating,
    
    /// 按相关性排序
    Relevance,
}

impl Default for TemplateSortBy {
    fn default() -> Self {
        Self::Relevance
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::PgPool;
    use tempfile::TempDir;

    async fn setup_test_storage() -> (TemplateStorage, TempDir) {
        let temp_dir = TempDir::new().unwrap();
        let db_pool = PgPool::connect("postgresql://test:test@localhost/test").await.unwrap();
        let storage = TemplateStorage::new(db_pool, temp_dir.path().to_path_buf()).await.unwrap();
        storage.initialize_database().await.unwrap();
        (storage, temp_dir)
    }

    #[tokio::test]
    async fn test_store_and_get_template() {
        let (storage, _temp_dir) = setup_test_storage().await;
        
        let template = ContractTemplate {
            id: "test_template".to_string(),
            name: "Test Template".to_string(),
            description: "A test template".to_string(),
            contract_type: ContractType::ERC20Token,
            base_contracts: vec!["ERC20".to_string()],
            required_imports: vec!["@openzeppelin/contracts/token/ERC20/ERC20.sol".to_string()],
            template_code: "contract TestToken is ERC20 { }".to_string(),
            parameters: vec![],
            security_features: vec!["Ownable".to_string()],
            tags: vec!["test".to_string()],
            complexity: TemplateComplexity::Simple,
            gas_estimate: GasEstimate {
                deployment: 800000,
                typical_transaction: 50000,
            },
        };
        
        let template_uuid = storage.store_template(&template).await.unwrap();
        assert!(!template_uuid.is_nil());
        
        let retrieved = storage.get_template("test_template").await.unwrap();
        assert!(retrieved.is_some());
        
        let retrieved_template = retrieved.unwrap();
        assert_eq!(retrieved_template.name, "Test Template");
        assert_eq!(retrieved_template.contract_type, ContractType::ERC20Token);
    }

    #[tokio::test]
    async fn test_search_templates() {
        let (storage, _temp_dir) = setup_test_storage().await;
        
        let query = TemplateSearchQuery {
            contract_type: Some(ContractType::ERC20Token),
            ..Default::default()
        };
        
        let results = storage.search_templates(&query).await.unwrap();
        // 结果应该为空，因为我们还没有存储任何模板
        assert!(results.is_empty());
    }
}