use sqlx::{SqlitePool, Row};
use chrono::Utc;
use crate::shared::errors::AppError;
use super::types::*;

pub struct AuthorizationService {
    db: SqlitePool,
}

impl AuthorizationService {
    pub fn new(db: SqlitePool) -> Self {
        Self { db }
    }

    // ========== 数据源授权管理 ==========
    pub async fn set_authorization(
        &self,
        user_id: &str,
        data_source: &str,
        authorized: bool,
        purpose: Option<&str>,
        ip_address: Option<&str>,
    ) -> Result<(), AppError> {
        let now = Utc::now().to_rfc3339();
        let status = if authorized { "authorized" } else { "revoked" };
        
        // 获取当前状态
        let current_status = self.get_authorization_status(user_id, data_source).await?;
        
        // 更新或插入授权记录
        sqlx::query(
            r#"
            INSERT INTO user_authorizations (user_id, data_source, status, purpose, granted_at, revoked_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id, data_source) DO UPDATE SET
                status = excluded.status,
                purpose = excluded.purpose,
                granted_at = CASE WHEN excluded.status = 'authorized' THEN excluded.granted_at ELSE granted_at END,
                revoked_at = CASE WHEN excluded.status = 'revoked' THEN excluded.revoked_at ELSE revoked_at END,
                updated_at = excluded.updated_at
            "#
        )
        .bind(user_id)
        .bind(data_source)
        .bind(status)
        .bind(purpose)
        .bind(if authorized { Some(&now) } else { None })
        .bind(if !authorized { Some(&now) } else { None })
        .bind(&now)
        .execute(&self.db)
        .await?;
        
        // 记录授权日志
        let action = if authorized {
            AuthorizationAction::Grant
        } else {
            AuthorizationAction::Revoke
        };
        
        self.log_authorization_change(
            user_id,
            data_source,
            &action,
            current_status.as_deref(),
            status,
            None,
            ip_address,
        ).await?;
        
        Ok(())
    }

    pub async fn get_authorization_status(
        &self,
        user_id: &str,
        data_source: &str,
    ) -> Result<Option<String>, AppError> {
        let result = sqlx::query(
            "SELECT status FROM user_authorizations WHERE user_id = ? AND data_source = ?"
        )
        .bind(user_id)
        .bind(data_source)
        .fetch_optional(&self.db)
        .await?;
        
        if let Some(row) = result {
            Ok(Some(row.try_get("status")?))
        } else {
            Ok(None)
        }
    }

    pub async fn get_user_authorizations(
        &self,
        user_id: &str,
    ) -> Result<Vec<AuthorizationInfo>, AppError> {
        let rows = sqlx::query(
            "SELECT data_source, status, purpose, granted_at, revoked_at, updated_at FROM user_authorizations WHERE user_id = ? ORDER BY updated_at DESC"
        )
        .bind(user_id)
        .fetch_all(&self.db)
        .await?;
        
        let mut authorizations = Vec::new();
        for row in rows {
            authorizations.push(AuthorizationInfo {
                data_source: row.try_get("data_source")?,
                status: row.try_get("status")?,
                purpose: row.try_get("purpose")?,
                granted_at: row.try_get("granted_at")?,
                revoked_at: row.try_get("revoked_at")?,
                updated_at: row.try_get("updated_at")?,
            });
        }
        
        Ok(authorizations)
    }

    pub async fn get_authorized_data_sources(
        &self,
        user_id: &str,
    ) -> Result<Vec<String>, AppError> {
        let rows = sqlx::query(
            "SELECT data_source FROM user_authorizations WHERE user_id = ? AND status = 'authorized'"
        )
        .bind(user_id)
        .fetch_all(&self.db)
        .await?;
        
        let data_sources: Vec<String> = rows
            .into_iter()
            .map(|row| row.try_get::<String, _>("data_source").unwrap())
            .collect();
        
        Ok(data_sources)
    }

    pub async fn check_authorization(
        &self,
        user_id: &str,
        data_source: &str,
    ) -> Result<bool, AppError> {
        let status = self.get_authorization_status(user_id, data_source).await?;
        Ok(status == Some("authorized".to_string()))
    }

    pub async fn batch_set_authorizations(
        &self,
        user_id: &str,
        authorizations: Vec<DataSourceAuthorization>,
        ip_address: Option<&str>,
    ) -> Result<usize, AppError> {
        let mut count = 0;
        
        for auth in authorizations {
            self.set_authorization(
                user_id,
                &auth.data_source,
                auth.authorized,
                None,
                ip_address,
            ).await?;
            count += 1;
        }
        
        Ok(count)
    }

    // ========== 授权日志管理 ==========
    async fn log_authorization_change(
        &self,
        user_id: &str,
        data_source: &str,
        action: &AuthorizationAction,
        previous_status: Option<&str>,
        new_status: &str,
        reason: Option<&str>,
        ip_address: Option<&str>,
    ) -> Result<(), AppError> {
        let now = Utc::now().to_rfc3339();
        
        sqlx::query(
            r#"
            INSERT INTO authorization_logs 
            (user_id, data_source, action, previous_status, new_status, reason, ip_address, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            "#
        )
        .bind(user_id)
        .bind(data_source)
        .bind(action.as_str())
        .bind(previous_status)
        .bind(new_status)
        .bind(reason)
        .bind(ip_address)
        .bind(&now)
        .execute(&self.db)
        .await?;
        
        Ok(())
    }

    pub async fn get_authorization_logs(
        &self,
        user_id: &str,
        limit: Option<i64>,
    ) -> Result<Vec<AuthorizationLog>, AppError> {
        let limit_value = limit.unwrap_or(100);
        
        let rows = sqlx::query(
            "SELECT id, user_id, data_source, action, previous_status, new_status, reason, ip_address, created_at FROM authorization_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?"
        )
        .bind(user_id)
        .bind(limit_value)
        .fetch_all(&self.db)
        .await?;
        
        let mut logs = Vec::new();
        for row in rows {
            logs.push(AuthorizationLog {
                id: row.try_get("id")?,
                user_id: row.try_get("user_id")?,
                data_source: row.try_get("data_source")?,
                action: row.try_get("action")?,
                previous_status: row.try_get("previous_status")?,
                new_status: row.try_get("new_status")?,
                reason: row.try_get("reason")?,
                ip_address: row.try_get("ip_address")?,
                created_at: row.try_get("created_at")?,
            });
        }
        
        Ok(logs)
    }

    pub async fn get_data_source_logs(
        &self,
        user_id: &str,
        data_source: &str,
    ) -> Result<Vec<AuthorizationLog>, AppError> {
        let rows = sqlx::query(
            "SELECT id, user_id, data_source, action, previous_status, new_status, reason, ip_address, created_at FROM authorization_logs WHERE user_id = ? AND data_source = ? ORDER BY created_at DESC"
        )
        .bind(user_id)
        .bind(data_source)
        .fetch_all(&self.db)
        .await?;
        
        let mut logs = Vec::new();
        for row in rows {
            logs.push(AuthorizationLog {
                id: row.try_get("id")?,
                user_id: row.try_get("user_id")?,
                data_source: row.try_get("data_source")?,
                action: row.try_get("action")?,
                previous_status: row.try_get("previous_status")?,
                new_status: row.try_get("new_status")?,
                reason: row.try_get("reason")?,
                ip_address: row.try_get("ip_address")?,
                created_at: row.try_get("created_at")?,
            });
        }
        
        Ok(logs)
    }

    // ========== 权限范围管理 ==========
    pub fn get_data_source_scopes() -> Vec<DataSourceScopeInfo> {
        vec![
            DataSourceScopeInfo {
                data_source: "worldid".to_string(),
                scope: vec!["humanity_verification".to_string()],
                description: "仅用于验证用户为真实人类，不获取其他信息".to_string(),
            },
            DataSourceScopeInfo {
                data_source: "github".to_string(),
                scope: vec![
                    "public_profile".to_string(),
                    "public_repos".to_string(),
                    "user_activity".to_string(),
                ],
                description: "仅获取公开的个人资料、仓库数量和活跃度，不访问代码内容".to_string(),
            },
            DataSourceScopeInfo {
                data_source: "twitter".to_string(),
                scope: vec![
                    "public_profile".to_string(),
                    "follower_count".to_string(),
                ],
                description: "仅获取公开的个人资料和关注者数量".to_string(),
            },
            DataSourceScopeInfo {
                data_source: "ethereum_wallet".to_string(),
                scope: vec![
                    "address_ownership".to_string(),
                    "transaction_count".to_string(),
                    "balance".to_string(),
                ],
                description: "仅获取地址归属、交易次数和余额，不获取交易详情".to_string(),
            },
            DataSourceScopeInfo {
                data_source: "did".to_string(),
                scope: vec![
                    "did_document".to_string(),
                    "verification_methods".to_string(),
                ],
                description: "仅获取DID文档的公开信息".to_string(),
            },
            DataSourceScopeInfo {
                data_source: "verifiable_credential".to_string(),
                scope: vec![
                    "credential_type".to_string(),
                    "issuer".to_string(),
                    "issuance_date".to_string(),
                ],
                description: "仅获取凭证类型、颁发者和颁发日期，不获取详细内容".to_string(),
            },
        ]
    }

    // ========== 授权检查和数据访问控制 ==========
    #[allow(dead_code)]
    pub async fn can_access_data_source(
        &self,
        user_id: &str,
        data_source: &str,
    ) -> Result<bool, AppError> {
        self.check_authorization(user_id, data_source).await
    }

    pub async fn revoke_and_cleanup_data(
        &self,
        user_id: &str,
        data_source: &str,
        ip_address: Option<&str>,
    ) -> Result<(), AppError> {
        // 撤销授权
        self.set_authorization(user_id, data_source, false, None, ip_address).await?;
        
        // 根据数据源类型清理数据（可选）
        // 这里可以添加逻辑来删除对应的敏感数据
        println!("⚠️  撤销授权并清理数据: 用户={}, 数据源={}", user_id, data_source);
        
        Ok(())
    }

    // ========== 统计和分析 ==========
    pub async fn get_authorization_stats(
        &self,
        user_id: &str,
    ) -> Result<serde_json::Value, AppError> {
        let total_count: i64 = sqlx::query("SELECT COUNT(*) as count FROM user_authorizations WHERE user_id = ?")
            .bind(user_id)
            .fetch_one(&self.db)
            .await?
            .try_get("count")?;
        
        let authorized_count: i64 = sqlx::query("SELECT COUNT(*) as count FROM user_authorizations WHERE user_id = ? AND status = 'authorized'")
            .bind(user_id)
            .fetch_one(&self.db)
            .await?
            .try_get("count")?;
        
        let revoked_count: i64 = sqlx::query("SELECT COUNT(*) as count FROM user_authorizations WHERE user_id = ? AND status = 'revoked'")
            .bind(user_id)
            .fetch_one(&self.db)
            .await?
            .try_get("count")?;
        
        Ok(serde_json::json!({
            "total": total_count,
            "authorized": authorized_count,
            "revoked": revoked_count,
        }))
    }
}
