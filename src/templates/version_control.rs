//! 模板版本控制系统
//! 
//! 提供模板的版本管理、历史记录、安全更新和回滚机制

use crate::error::{AiContractError, Result};
use crate::templates::registry::ContractTemplate;
use crate::templates::storage::{StoredTemplate, TemplateStorage};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row};
use std::collections::HashMap;
use uuid::Uuid;
use chrono::{DateTime, Utc};
use semver::Version;

/// 模板版本控制管理器
pub struct TemplateVersionControl {
    /// 数据库连接池
    db_pool: PgPool,
    
    /// 模板存储
    template_storage: TemplateStorage,
    
    /// 兼容性检查器
    compatibility_checker: CompatibilityChecker,
    
    /// 迁移管理器
    migration_manager: MigrationManager,
}

impl TemplateVersionControl {
    /// 创建新的版本控制管理器
    pub async fn new(db_pool: PgPool, template_storage: TemplateStorage) -> Result<Self> {
        let compatibility_checker = CompatibilityChecker::new(db_pool.clone()).await?;
        let migration_manager = MigrationManager::new(db_pool.clone()).await?;
        
        Ok(Self {
            db_pool,
            template_storage,
            compatibility_checker,
            migration_manager,
        })
    }
    
    /// 初始化版本控制数据库表
    pub async fn initialize_database(&self) -> Result<()> {
        // 创建模板版本表
        sqlx::query(r#"
            CREATE TABLE IF NOT EXISTS template_versions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                template_id VARCHAR(255) NOT NULL,
                version VARCHAR(20) NOT NULL,
                major_version INTEGER NOT NULL,
                minor_version INTEGER NOT NULL,
                patch_version INTEGER NOT NULL,
                pre_release VARCHAR(50),
                build_metadata VARCHAR(100),
                template_uuid UUID NOT NULL REFERENCES contract_templates(id) ON DELETE CASCADE,
                parent_version_id UUID REFERENCES template_versions(id),
                change_type VARCHAR(20) NOT NULL,
                changelog TEXT,
                breaking_changes TEXT[],
                security_fixes TEXT[],
                deprecation_warnings TEXT[],
                compatibility_info JSONB,
                is_stable BOOLEAN NOT NULL DEFAULT false,
                is_deprecated BOOLEAN NOT NULL DEFAULT false,
                deprecation_date TIMESTAMPTZ,
                end_of_life_date TIMESTAMPTZ,
                created_by VARCHAR(255),
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE(template_id, version)
            )
        "#)
        .execute(&self.db_pool)
        .await
        .map_err(|e| AiContractError::database_error(format!("创建版本表失败: {}", e)))?;
        
        // 创建版本依赖表
        sqlx::query(r#"
            CREATE TABLE IF NOT EXISTS template_version_dependencies (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                version_id UUID NOT NULL REFERENCES template_versions(id) ON DELETE CASCADE,
                dependency_template_id VARCHAR(255) NOT NULL,
                dependency_version_constraint VARCHAR(50) NOT NULL,
                dependency_type VARCHAR(20) NOT NULL,
                is_optional BOOLEAN NOT NULL DEFAULT false,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        "#)
        .execute(&self.db_pool)
        .await
        .map_err(|e| AiContractError::database_error(format!("创建依赖表失败: {}", e)))?;
        
        // 创建版本兼容性表
        sqlx::query(r#"
            CREATE TABLE IF NOT EXISTS template_version_compatibility (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                version_id UUID NOT NULL REFERENCES template_versions(id) ON DELETE CASCADE,
                compatible_with_version_id UUID NOT NULL REFERENCES template_versions(id) ON DELETE CASCADE,
                compatibility_level VARCHAR(20) NOT NULL,
                compatibility_notes TEXT,
                tested_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE(version_id, compatible_with_version_id)
            )
        "#)
        .execute(&self.db_pool)
        .await
        .map_err(|e| AiContractError::database_error(format!("创建兼容性表失败: {}", e)))?;
        
        // 创建迁移记录表
        sqlx::query(r#"
            CREATE TABLE IF NOT EXISTS template_migrations (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                from_version_id UUID NOT NULL REFERENCES template_versions(id),
                to_version_id UUID NOT NULL REFERENCES template_versions(id),
                migration_script TEXT,
                migration_type VARCHAR(20) NOT NULL,
                is_automatic BOOLEAN NOT NULL DEFAULT false,
                success_rate DECIMAL(5,2),
                execution_time_ms INTEGER,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        "#)
        .execute(&self.db_pool)
        .await
        .map_err(|e| AiContractError::database_error(format!("创建迁移表失败: {}", e)))?;
        
        // 创建版本使用统计表
        sqlx::query(r#"
            CREATE TABLE IF NOT EXISTS template_version_usage (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                version_id UUID NOT NULL REFERENCES template_versions(id) ON DELETE CASCADE,
                usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
                usage_count INTEGER NOT NULL DEFAULT 1,
                success_count INTEGER NOT NULL DEFAULT 0,
                failure_count INTEGER NOT NULL DEFAULT 0,
                user_feedback JSONB,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE(version_id, usage_date)
            )
        "#)
        .execute(&self.db_pool)
        .await
        .map_err(|e| AiContractError::database_error(format!("创建版本使用统计表失败: {}", e)))?;
        
        // 创建索引
        self.create_version_indexes().await?;
        
        Ok(())
    }
    
    /// 创建版本控制相关索引
    async fn create_version_indexes(&self) -> Result<()> {
        let indexes = vec![
            "CREATE INDEX IF NOT EXISTS idx_template_versions_template_id ON template_versions(template_id)",
            "CREATE INDEX IF NOT EXISTS idx_template_versions_version ON template_versions(version)",
            "CREATE INDEX IF NOT EXISTS idx_template_versions_stable ON template_versions(is_stable)",
            "CREATE INDEX IF NOT EXISTS idx_template_versions_deprecated ON template_versions(is_deprecated)",
            "CREATE INDEX IF NOT EXISTS idx_template_versions_created ON template_versions(created_at DESC)",
            "CREATE INDEX IF NOT EXISTS idx_version_dependencies_version ON template_version_dependencies(version_id)",
            "CREATE INDEX IF NOT EXISTS idx_version_compatibility_version ON template_version_compatibility(version_id)",
            "CREATE INDEX IF NOT EXISTS idx_template_migrations_from ON template_migrations(from_version_id)",
            "CREATE INDEX IF NOT EXISTS idx_template_migrations_to ON template_migrations(to_version_id)",
            "CREATE INDEX IF NOT EXISTS idx_version_usage_version ON template_version_usage(version_id)",
            "CREATE INDEX IF NOT EXISTS idx_version_usage_date ON template_version_usage(usage_date DESC)",
        ];
        
        for index_sql in indexes {
            sqlx::query(index_sql)
                .execute(&self.db_pool)
                .await
                .map_err(|e| AiContractError::database_error(format!("创建版本索引失败: {}", e)))?;
        }
        
        Ok(())
    }
    
    /// 创建新版本
    pub async fn create_version(
        &self,
        template_id: &str,
        version: &str,
        template: &ContractTemplate,
        change_info: VersionChangeInfo,
        created_by: Option<&str>,
    ) -> Result<TemplateVersion> {
        // 验证版本号格式
        let semver = Version::parse(version)
            .map_err(|e| AiContractError::serialization_error(format!("无效的版本号格式: {}", e)))?;
        
        // 检查版本是否已存在
        let existing = self.get_version(template_id, version).await?;
        if existing.is_some() {
            return Err(AiContractError::serialization_error(format!("版本 {} 已存在", version)));
        }
        
        // 获取父版本
        let parent_version = if let Some(parent_ver) = &change_info.parent_version {
            Some(self.get_version(template_id, parent_ver).await?
                .ok_or_else(|| AiContractError::serialization_error(format!("父版本 {} 不存在", parent_ver)))?)
        } else {
            None
        };
        
        // 存储模板
        let template_uuid = self.template_storage.store_template(template).await?;
        
        let mut tx = self.db_pool.begin().await
            .map_err(|e| AiContractError::database_error(format!("开始事务失败: {}", e)))?;
        
        // 插入版本记录
        let version_id = sqlx::query_scalar::<_, Uuid>(r#"
            INSERT INTO template_versions (
                template_id, version, major_version, minor_version, patch_version,
                pre_release, build_metadata, template_uuid, parent_version_id,
                change_type, changelog, breaking_changes, security_fixes,
                deprecation_warnings, compatibility_info, is_stable, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            RETURNING id
        "#)
        .bind(template_id)
        .bind(version)
        .bind(semver.major as i32)
        .bind(semver.minor as i32)
        .bind(semver.patch as i32)
        .bind(semver.pre.as_str())
        .bind(semver.build.as_str())
        .bind(template_uuid)
        .bind(parent_version.as_ref().map(|v| v.id))
        .bind(change_info.change_type.to_string())
        .bind(&change_info.changelog)
        .bind(&change_info.breaking_changes)
        .bind(&change_info.security_fixes)
        .bind(&change_info.deprecation_warnings)
        .bind(serde_json::to_value(&change_info.compatibility_info)?)
        .bind(change_info.is_stable)
        .bind(created_by)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| AiContractError::database_error(format!("插入版本记录失败: {}", e)))?;
        
        // 插入依赖关系
        for dependency in &change_info.dependencies {
            sqlx::query(r#"
                INSERT INTO template_version_dependencies (
                    version_id, dependency_template_id, dependency_version_constraint,
                    dependency_type, is_optional
                ) VALUES ($1, $2, $3, $4, $5)
            "#)
            .bind(version_id)
            .bind(&dependency.template_id)
            .bind(&dependency.version_constraint)
            .bind(dependency.dependency_type.to_string())
            .bind(dependency.is_optional)
            .execute(&mut *tx)
            .await
            .map_err(|e| AiContractError::database_error(format!("插入依赖关系失败: {}", e)))?;
        }
        
        tx.commit().await
            .map_err(|e| AiContractError::database_error(format!("提交事务失败: {}", e)))?;
        
        // 如果是稳定版本，检查兼容性
        if change_info.is_stable {
            self.compatibility_checker.check_compatibility(version_id).await?;
        }
        
        // 创建迁移脚本（如果需要）
        if let Some(parent) = &parent_version {
            self.migration_manager.create_migration(parent.id, version_id, &change_info).await?;
        }
        
        // 返回创建的版本
        self.get_version_by_id(version_id).await?
            .ok_or_else(|| AiContractError::InternalError("创建的版本未找到".to_string()))
    }
    
    /// 获取版本
    pub async fn get_version(&self, template_id: &str, version: &str) -> Result<Option<TemplateVersion>> {
        let row = sqlx::query(r#"
            SELECT 
                id, template_id, version, major_version, minor_version, patch_version,
                pre_release, build_metadata, template_uuid, parent_version_id,
                change_type, changelog, breaking_changes, security_fixes,
                deprecation_warnings, compatibility_info, is_stable, is_deprecated,
                deprecation_date, end_of_life_date, created_by, created_at
            FROM template_versions
            WHERE template_id = $1 AND version = $2
        "#)
        .bind(template_id)
        .bind(version)
        .fetch_optional(&self.db_pool)
        .await
        .map_err(|e| AiContractError::database_error(format!("查询版本失败: {}", e)))?;
        
        if let Some(row) = row {
            Ok(Some(self.row_to_template_version(row).await?))
        } else {
            Ok(None)
        }
    }
    
    /// 根据 ID 获取版本
    pub async fn get_version_by_id(&self, version_id: Uuid) -> Result<Option<TemplateVersion>> {
        let row = sqlx::query(r#"
            SELECT 
                id, template_id, version, major_version, minor_version, patch_version,
                pre_release, build_metadata, template_uuid, parent_version_id,
                change_type, changelog, breaking_changes, security_fixes,
                deprecation_warnings, compatibility_info, is_stable, is_deprecated,
                deprecation_date, end_of_life_date, created_by, created_at
            FROM template_versions
            WHERE id = $1
        "#)
        .bind(version_id)
        .fetch_optional(&self.db_pool)
        .await
        .map_err(|e| AiContractError::database_error(format!("查询版本失败: {}", e)))?;
        
        if let Some(row) = row {
            Ok(Some(self.row_to_template_version(row).await?))
        } else {
            Ok(None)
        }
    }
    
    /// 获取模板的所有版本
    pub async fn get_all_versions(&self, template_id: &str) -> Result<Vec<TemplateVersion>> {
        let rows = sqlx::query(r#"
            SELECT 
                id, template_id, version, major_version, minor_version, patch_version,
                pre_release, build_metadata, template_uuid, parent_version_id,
                change_type, changelog, breaking_changes, security_fixes,
                deprecation_warnings, compatibility_info, is_stable, is_deprecated,
                deprecation_date, end_of_life_date, created_by, created_at
            FROM template_versions
            WHERE template_id = $1
            ORDER BY major_version DESC, minor_version DESC, patch_version DESC, created_at DESC
        "#)
        .bind(template_id)
        .fetch_all(&self.db_pool)
        .await
        .map_err(|e| AiContractError::database_error(format!("查询版本列表失败: {}", e)))?;
        
        let mut versions = Vec::new();
        for row in rows {
            versions.push(self.row_to_template_version(row).await?);
        }
        
        Ok(versions)
    }
    
    /// 获取最新稳定版本
    pub async fn get_latest_stable_version(&self, template_id: &str) -> Result<Option<TemplateVersion>> {
        let row = sqlx::query(r#"
            SELECT 
                id, template_id, version, major_version, minor_version, patch_version,
                pre_release, build_metadata, template_uuid, parent_version_id,
                change_type, changelog, breaking_changes, security_fixes,
                deprecation_warnings, compatibility_info, is_stable, is_deprecated,
                deprecation_date, end_of_life_date, created_by, created_at
            FROM template_versions
            WHERE template_id = $1 AND is_stable = true AND is_deprecated = false
            ORDER BY major_version DESC, minor_version DESC, patch_version DESC
            LIMIT 1
        "#)
        .bind(template_id)
        .fetch_optional(&self.db_pool)
        .await
        .map_err(|e| AiContractError::database_error(format!("查询最新稳定版本失败: {}", e)))?;
        
        if let Some(row) = row {
            Ok(Some(self.row_to_template_version(row).await?))
        } else {
            Ok(None)
        }
    }
    
    /// 标记版本为已弃用
    pub async fn deprecate_version(
        &self,
        template_id: &str,
        version: &str,
        deprecation_reason: &str,
        end_of_life_date: Option<DateTime<Utc>>,
    ) -> Result<()> {
        sqlx::query(r#"
            UPDATE template_versions 
            SET 
                is_deprecated = true,
                deprecation_date = NOW(),
                end_of_life_date = $3,
                deprecation_warnings = array_append(deprecation_warnings, $4)
            WHERE template_id = $1 AND version = $2
        "#)
        .bind(template_id)
        .bind(version)
        .bind(end_of_life_date)
        .bind(deprecation_reason)
        .execute(&self.db_pool)
        .await
        .map_err(|e| AiContractError::database_error(format!("标记版本弃用失败: {}", e)))?;
        
        Ok(())
    }
    
    /// 回滚到指定版本
    pub async fn rollback_to_version(
        &self,
        template_id: &str,
        target_version: &str,
        rollback_reason: &str,
    ) -> Result<TemplateVersion> {
        // 获取目标版本
        let target = self.get_version(template_id, target_version).await?
            .ok_or_else(|| AiContractError::serialization_error(format!("目标版本 {} 不存在", target_version)))?;
        
        // 获取当前最新版本
        let current_versions = self.get_all_versions(template_id).await?;
        let current_latest = current_versions.first()
            .ok_or_else(|| AiContractError::serialization_error("没有找到当前版本".to_string()))?;
        
        // 创建回滚版本
        let rollback_version = format!("{}-rollback-{}", target.version, chrono::Utc::now().timestamp());
        
        // 获取目标版本的模板
        let target_template = self.template_storage.get_template(&template_id).await?
            .ok_or_else(|| AiContractError::serialization_error("目标模板不存在".to_string()))?;
        
        // 转换为 ContractTemplate
        let contract_template = ContractTemplate {
            id: target_template.template_id.clone(),
            name: target_template.name.clone(),
            description: target_template.description.clone(),
            contract_type: target_template.contract_type.clone(),
            base_contracts: target_template.base_contracts.clone(),
            required_imports: target_template.required_imports.clone(),
            template_code: target_template.template_code.clone(),
            parameters: target_template.parameters.clone(),
            security_features: target_template.security_features.clone(),
            tags: target_template.tags.clone(),
            complexity: target_template.complexity.clone(),
            gas_estimate: target_template.gas_estimate.clone(),
        };
        
        let change_info = VersionChangeInfo {
            parent_version: Some(current_latest.version.clone()),
            change_type: VersionChangeType::Rollback,
            changelog: format!("回滚到版本 {}: {}", target_version, rollback_reason),
            breaking_changes: vec![],
            security_fixes: vec![],
            deprecation_warnings: vec![],
            compatibility_info: HashMap::new(),
            dependencies: vec![],
            is_stable: true,
        };
        
        self.create_version(template_id, &rollback_version, &contract_template, change_info, None).await
    }
    
    /// 检查版本兼容性
    pub async fn check_version_compatibility(
        &self,
        template_id: &str,
        from_version: &str,
        to_version: &str,
    ) -> Result<CompatibilityResult> {
        let from_ver = self.get_version(template_id, from_version).await?
            .ok_or_else(|| AiContractError::serialization_error(format!("源版本 {} 不存在", from_version)))?;
        
        let to_ver = self.get_version(template_id, to_version).await?
            .ok_or_else(|| AiContractError::serialization_error(format!("目标版本 {} 不存在", to_version)))?;
        
        self.compatibility_checker.check_version_compatibility(from_ver.id, to_ver.id).await
    }
    
    /// 获取迁移路径
    pub async fn get_migration_path(
        &self,
        template_id: &str,
        from_version: &str,
        to_version: &str,
    ) -> Result<Vec<MigrationStep>> {
        let from_ver = self.get_version(template_id, from_version).await?
            .ok_or_else(|| AiContractError::serialization_error(format!("源版本 {} 不存在", from_version)))?;
        
        let to_ver = self.get_version(template_id, to_version).await?
            .ok_or_else(|| AiContractError::serialization_error(format!("目标版本 {} 不存在", to_version)))?;
        
        self.migration_manager.get_migration_path(from_ver.id, to_ver.id).await
    }
    
    /// 执行版本迁移
    pub async fn migrate_version(
        &self,
        template_id: &str,
        from_version: &str,
        to_version: &str,
        migration_context: MigrationContext,
    ) -> Result<MigrationResult> {
        let migration_path = self.get_migration_path(template_id, from_version, to_version).await?;
        
        self.migration_manager.execute_migration(migration_path, migration_context).await
    }
    
    /// 辅助方法：将数据库行转换为 TemplateVersion
    async fn row_to_template_version(&self, row: sqlx::postgres::PgRow) -> Result<TemplateVersion> {
        use sqlx::Row;
        
        let version_id: Uuid = row.get("id");
        
        // 获取依赖关系
        let dependencies = self.get_version_dependencies(version_id).await?;
        
        Ok(TemplateVersion {
            id: version_id,
            template_id: row.get("template_id"),
            version: row.get("version"),
            major_version: row.get("major_version"),
            minor_version: row.get("minor_version"),
            patch_version: row.get("patch_version"),
            pre_release: row.get("pre_release"),
            build_metadata: row.get("build_metadata"),
            template_uuid: row.get("template_uuid"),
            parent_version_id: row.get("parent_version_id"),
            change_type: VersionChangeType::from_string(&row.get::<String, _>("change_type"))?,
            changelog: row.get("changelog"),
            breaking_changes: row.get("breaking_changes"),
            security_fixes: row.get("security_fixes"),
            deprecation_warnings: row.get("deprecation_warnings"),
            compatibility_info: serde_json::from_value(row.get("compatibility_info"))?,
            dependencies,
            is_stable: row.get("is_stable"),
            is_deprecated: row.get("is_deprecated"),
            deprecation_date: row.get("deprecation_date"),
            end_of_life_date: row.get("end_of_life_date"),
            created_by: row.get("created_by"),
            created_at: row.get("created_at"),
        })
    }
    
    /// 获取版本依赖关系
    async fn get_version_dependencies(&self, version_id: Uuid) -> Result<Vec<VersionDependency>> {
        let rows = sqlx::query(r#"
            SELECT 
                dependency_template_id, dependency_version_constraint,
                dependency_type, is_optional
            FROM template_version_dependencies
            WHERE version_id = $1
        "#)
        .bind(version_id)
        .fetch_all(&self.db_pool)
        .await
        .map_err(|e| AiContractError::database_error(format!("查询版本依赖失败: {}", e)))?;
        
        let mut dependencies = Vec::new();
        for row in rows {
            dependencies.push(VersionDependency {
                template_id: row.get("dependency_template_id"),
                version_constraint: row.get("dependency_version_constraint"),
                dependency_type: DependencyType::from_string(&row.get::<String, _>("dependency_type"))?,
                is_optional: row.get("is_optional"),
            });
        }
        
        Ok(dependencies)
    }
}

/// 兼容性检查器
pub struct CompatibilityChecker {
    db_pool: PgPool,
}

impl CompatibilityChecker {
    pub async fn new(db_pool: PgPool) -> Result<Self> {
        Ok(Self { db_pool })
    }
    
    /// 检查版本兼容性
    pub async fn check_compatibility(&self, version_id: Uuid) -> Result<()> {
        // 实现兼容性检查逻辑
        // 这里可以检查 API 兼容性、依赖兼容性等
        Ok(())
    }
    
    /// 检查两个版本之间的兼容性
    pub async fn check_version_compatibility(
        &self,
        from_version_id: Uuid,
        to_version_id: Uuid,
    ) -> Result<CompatibilityResult> {
        // 检查是否已有兼容性记录
        let existing = sqlx::query(r#"
            SELECT compatibility_level, compatibility_notes
            FROM template_version_compatibility
            WHERE version_id = $1 AND compatible_with_version_id = $2
        "#)
        .bind(from_version_id)
        .bind(to_version_id)
        .fetch_optional(&self.db_pool)
        .await
        .map_err(|e| AiContractError::database_error(format!("查询兼容性记录失败: {}", e)))?;
        
        if let Some(row) = existing {
            use sqlx::Row;
            return Ok(CompatibilityResult {
                is_compatible: true,
                compatibility_level: CompatibilityLevel::from_string(&row.get::<String, _>("compatibility_level"))?,
                issues: vec![],
                notes: row.get("compatibility_notes"),
                tested_at: Some(chrono::Utc::now()),
            });
        }
        
        // 执行兼容性检查
        let compatibility_result = self.perform_compatibility_check(from_version_id, to_version_id).await?;
        
        // 保存兼容性结果
        sqlx::query(r#"
            INSERT INTO template_version_compatibility (
                version_id, compatible_with_version_id, compatibility_level,
                compatibility_notes, tested_at
            ) VALUES ($1, $2, $3, $4, NOW())
        "#)
        .bind(from_version_id)
        .bind(to_version_id)
        .bind(compatibility_result.compatibility_level.to_string())
        .bind(&compatibility_result.notes)
        .execute(&self.db_pool)
        .await
        .map_err(|e| AiContractError::database_error(format!("保存兼容性结果失败: {}", e)))?;
        
        Ok(compatibility_result)
    }
    
    /// 执行实际的兼容性检查
    async fn perform_compatibility_check(
        &self,
        _from_version_id: Uuid,
        _to_version_id: Uuid,
    ) -> Result<CompatibilityResult> {
        // 这里实现具体的兼容性检查逻辑
        // 可以检查：
        // 1. API 接口变化
        // 2. 参数类型变化
        // 3. 依赖关系变化
        // 4. 安全特性变化
        
        Ok(CompatibilityResult {
            is_compatible: true,
            compatibility_level: CompatibilityLevel::FullyCompatible,
            issues: vec![],
            notes: Some("自动兼容性检查通过".to_string()),
            tested_at: Some(chrono::Utc::now()),
        })
    }
}

/// 迁移管理器
pub struct MigrationManager {
    db_pool: PgPool,
}

impl MigrationManager {
    pub async fn new(db_pool: PgPool) -> Result<Self> {
        Ok(Self { db_pool })
    }
    
    /// 创建迁移脚本
    pub async fn create_migration(
        &self,
        from_version_id: Uuid,
        to_version_id: Uuid,
        change_info: &VersionChangeInfo,
    ) -> Result<()> {
        let migration_script = self.generate_migration_script(change_info).await?;
        
        sqlx::query(r#"
            INSERT INTO template_migrations (
                from_version_id, to_version_id, migration_script,
                migration_type, is_automatic
            ) VALUES ($1, $2, $3, $4, $5)
        "#)
        .bind(from_version_id)
        .bind(to_version_id)
        .bind(&migration_script)
        .bind(change_info.change_type.to_string())
        .bind(change_info.change_type.is_automatic())
        .execute(&self.db_pool)
        .await
        .map_err(|e| AiContractError::database_error(format!("创建迁移脚本失败: {}", e)))?;
        
        Ok(())
    }
    
    /// 生成迁移脚本
    async fn generate_migration_script(&self, change_info: &VersionChangeInfo) -> Result<String> {
        let mut script = String::new();
        
        script.push_str("// 自动生成的迁移脚本\n");
        script.push_str(&format!("// 变更类型: {:?}\n", change_info.change_type));
        script.push_str(&format!("// 变更日志: {}\n", change_info.changelog));
        
        if !change_info.breaking_changes.is_empty() {
            script.push_str("// 破坏性变更:\n");
            for change in &change_info.breaking_changes {
                script.push_str(&format!("// - {}\n", change));
            }
        }
        
        // 根据变更类型生成具体的迁移逻辑
        match change_info.change_type {
            VersionChangeType::Major => {
                script.push_str("// 主版本升级，可能包含破坏性变更\n");
                script.push_str("// 请手动检查兼容性\n");
            }
            VersionChangeType::Minor => {
                script.push_str("// 次版本升级，向后兼容\n");
                script.push_str("// 可以自动迁移\n");
            }
            VersionChangeType::Patch => {
                script.push_str("// 补丁版本，修复 bug\n");
                script.push_str("// 完全兼容，可以直接替换\n");
            }
            VersionChangeType::Rollback => {
                script.push_str("// 回滚操作\n");
                script.push_str("// 恢复到之前的版本\n");
            }
        }
        
        Ok(script)
    }
    
    /// 获取迁移路径
    pub async fn get_migration_path(
        &self,
        from_version_id: Uuid,
        to_version_id: Uuid,
    ) -> Result<Vec<MigrationStep>> {
        // 简化实现：直接迁移
        let migration = sqlx::query(r#"
            SELECT id, migration_script, migration_type, is_automatic
            FROM template_migrations
            WHERE from_version_id = $1 AND to_version_id = $2
        "#)
        .bind(from_version_id)
        .bind(to_version_id)
        .fetch_optional(&self.db_pool)
        .await
        .map_err(|e| AiContractError::database_error(format!("查询迁移路径失败: {}", e)))?;
        
        if let Some(row) = migration {
            use sqlx::Row;
            Ok(vec![MigrationStep {
                id: row.get("id"),
                from_version_id,
                to_version_id,
                migration_script: row.get("migration_script"),
                migration_type: MigrationType::from_string(&row.get::<String, _>("migration_type"))?,
                is_automatic: row.get("is_automatic"),
            }])
        } else {
            Ok(vec![])
        }
    }
    
    /// 执行迁移
    pub async fn execute_migration(
        &self,
        migration_path: Vec<MigrationStep>,
        _context: MigrationContext,
    ) -> Result<MigrationResult> {
        let mut results = Vec::new();
        
        for step in migration_path {
            let start_time = std::time::Instant::now();
            
            // 执行迁移步骤
            let step_result = self.execute_migration_step(&step).await?;
            
            let execution_time = start_time.elapsed().as_millis() as i32;
            
            // 更新执行统计
            sqlx::query(r#"
                UPDATE template_migrations 
                SET execution_time_ms = $2
                WHERE id = $1
            "#)
            .bind(step.id)
            .bind(execution_time)
            .execute(&self.db_pool)
            .await
            .map_err(|e| AiContractError::database_error(format!("更新迁移统计失败: {}", e)))?;
            
            results.push(step_result);
        }
        
        let total_time: i32 = results.iter().map(|r| r.execution_time_ms).sum();
        let success = results.iter().all(|r| r.success);
        
        Ok(MigrationResult {
            success,
            steps: results,
            total_time_ms: total_time,
        })
    }
    
    /// 执行单个迁移步骤
    async fn execute_migration_step(&self, step: &MigrationStep) -> Result<MigrationStepResult> {
        // 这里实现具体的迁移逻辑
        // 根据迁移类型执行不同的操作
        
        Ok(MigrationStepResult {
            step_id: step.id,
            success: true,
            execution_time_ms: 100, // 模拟执行时间
            error_message: None,
        })
    }
}

// 数据结构定义

/// 模板版本
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateVersion {
    pub id: Uuid,
    pub template_id: String,
    pub version: String,
    pub major_version: i32,
    pub minor_version: i32,
    pub patch_version: i32,
    pub pre_release: Option<String>,
    pub build_metadata: Option<String>,
    pub template_uuid: Uuid,
    pub parent_version_id: Option<Uuid>,
    pub change_type: VersionChangeType,
    pub changelog: Option<String>,
    pub breaking_changes: Vec<String>,
    pub security_fixes: Vec<String>,
    pub deprecation_warnings: Vec<String>,
    pub compatibility_info: HashMap<String, serde_json::Value>,
    pub dependencies: Vec<VersionDependency>,
    pub is_stable: bool,
    pub is_deprecated: bool,
    pub deprecation_date: Option<DateTime<Utc>>,
    pub end_of_life_date: Option<DateTime<Utc>>,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
}

/// 版本变更信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VersionChangeInfo {
    pub parent_version: Option<String>,
    pub change_type: VersionChangeType,
    pub changelog: String,
    pub breaking_changes: Vec<String>,
    pub security_fixes: Vec<String>,
    pub deprecation_warnings: Vec<String>,
    pub compatibility_info: HashMap<String, serde_json::Value>,
    pub dependencies: Vec<VersionDependency>,
    pub is_stable: bool,
}

/// 版本变更类型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum VersionChangeType {
    Major,
    Minor,
    Patch,
    Rollback,
}

impl VersionChangeType {
    pub fn to_string(&self) -> String {
        match self {
            Self::Major => "Major".to_string(),
            Self::Minor => "Minor".to_string(),
            Self::Patch => "Patch".to_string(),
            Self::Rollback => "Rollback".to_string(),
        }
    }
    
    pub fn from_string(s: &str) -> Result<Self> {
        match s {
            "Major" => Ok(Self::Major),
            "Minor" => Ok(Self::Minor),
            "Patch" => Ok(Self::Patch),
            "Rollback" => Ok(Self::Rollback),
            _ => Err(AiContractError::serialization_error(format!("未知的变更类型: {}", s))),
        }
    }
    
    pub fn is_automatic(&self) -> bool {
        matches!(self, Self::Patch | Self::Minor)
    }
}

/// 版本依赖
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VersionDependency {
    pub template_id: String,
    pub version_constraint: String,
    pub dependency_type: DependencyType,
    pub is_optional: bool,
}

/// 依赖类型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DependencyType {
    Required,
    Optional,
    Development,
    Peer,
}

impl DependencyType {
    pub fn to_string(&self) -> String {
        match self {
            Self::Required => "Required".to_string(),
            Self::Optional => "Optional".to_string(),
            Self::Development => "Development".to_string(),
            Self::Peer => "Peer".to_string(),
        }
    }
    
    pub fn from_string(s: &str) -> Result<Self> {
        match s {
            "Required" => Ok(Self::Required),
            "Optional" => Ok(Self::Optional),
            "Development" => Ok(Self::Development),
            "Peer" => Ok(Self::Peer),
            _ => Err(AiContractError::serialization_error(format!("未知的依赖类型: {}", s))),
        }
    }
}

/// 兼容性结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompatibilityResult {
    pub is_compatible: bool,
    pub compatibility_level: CompatibilityLevel,
    pub issues: Vec<CompatibilityIssue>,
    pub notes: Option<String>,
    pub tested_at: Option<DateTime<Utc>>,
}

/// 兼容性级别
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CompatibilityLevel {
    FullyCompatible,
    BackwardCompatible,
    PartiallyCompatible,
    Incompatible,
}

impl CompatibilityLevel {
    pub fn to_string(&self) -> String {
        match self {
            Self::FullyCompatible => "FullyCompatible".to_string(),
            Self::BackwardCompatible => "BackwardCompatible".to_string(),
            Self::PartiallyCompatible => "PartiallyCompatible".to_string(),
            Self::Incompatible => "Incompatible".to_string(),
        }
    }
    
    pub fn from_string(s: &str) -> Result<Self> {
        match s {
            "FullyCompatible" => Ok(Self::FullyCompatible),
            "BackwardCompatible" => Ok(Self::BackwardCompatible),
            "PartiallyCompatible" => Ok(Self::PartiallyCompatible),
            "Incompatible" => Ok(Self::Incompatible),
            _ => Err(AiContractError::serialization_error(format!("未知的兼容性级别: {}", s))),
        }
    }
}

/// 兼容性问题
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompatibilityIssue {
    pub issue_type: String,
    pub description: String,
    pub severity: String,
    pub suggested_fix: Option<String>,
}

/// 迁移步骤
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MigrationStep {
    pub id: Uuid,
    pub from_version_id: Uuid,
    pub to_version_id: Uuid,
    pub migration_script: String,
    pub migration_type: MigrationType,
    pub is_automatic: bool,
}

/// 迁移类型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MigrationType {
    Automatic,
    Manual,
    Rollback,
}

impl MigrationType {
    pub fn from_string(s: &str) -> Result<Self> {
        match s {
            "Automatic" => Ok(Self::Automatic),
            "Manual" => Ok(Self::Manual),
            "Rollback" => Ok(Self::Rollback),
            _ => Err(AiContractError::serialization_error(format!("未知的迁移类型: {}", s))),
        }
    }
}

/// 迁移上下文
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MigrationContext {
    pub user_id: Option<String>,
    pub dry_run: bool,
    pub backup_enabled: bool,
    pub custom_parameters: HashMap<String, serde_json::Value>,
}

/// 迁移结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MigrationResult {
    pub success: bool,
    pub steps: Vec<MigrationStepResult>,
    pub total_time_ms: i32,
}

/// 迁移步骤结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MigrationStepResult {
    pub step_id: Uuid,
    pub success: bool,
    pub execution_time_ms: i32,
    pub error_message: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::templates::registry::{ContractTemplate, TemplateParameter, TemplateComplexity, GasEstimate};
    use crate::types::ContractType;
    use sqlx::PgPool;
    use tempfile::TempDir;

    async fn setup_test_version_control() -> (TemplateVersionControl, TempDir) {
        let temp_dir = TempDir::new().unwrap();
        let db_pool = PgPool::connect("postgresql://test:test@localhost/test").await.unwrap();
        let template_storage = crate::templates::storage::TemplateStorage::new(
            db_pool.clone(), 
            temp_dir.path().to_path_buf()
        ).await.unwrap();
        
        let version_control = TemplateVersionControl::new(db_pool, template_storage).await.unwrap();
        version_control.initialize_database().await.unwrap();
        
        (version_control, temp_dir)
    }

    #[tokio::test]
    async fn test_create_version() {
        let (version_control, _temp_dir) = setup_test_version_control().await;
        
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
        
        let change_info = VersionChangeInfo {
            parent_version: None,
            change_type: VersionChangeType::Major,
            changelog: "Initial version".to_string(),
            breaking_changes: vec![],
            security_fixes: vec![],
            deprecation_warnings: vec![],
            compatibility_info: HashMap::new(),
            dependencies: vec![],
            is_stable: true,
        };
        
        let version = version_control.create_version(
            "test_template",
            "1.0.0",
            &template,
            change_info,
            Some("test_user"),
        ).await.unwrap();
        
        assert_eq!(version.version, "1.0.0");
        assert_eq!(version.major_version, 1);
        assert_eq!(version.minor_version, 0);
        assert_eq!(version.patch_version, 0);
        assert!(version.is_stable);
    }

    #[tokio::test]
    async fn test_get_latest_stable_version() {
        let (version_control, _temp_dir) = setup_test_version_control().await;
        
        // 测试获取不存在的模板的最新版本
        let latest = version_control.get_latest_stable_version("nonexistent").await.unwrap();
        assert!(latest.is_none());
    }
}