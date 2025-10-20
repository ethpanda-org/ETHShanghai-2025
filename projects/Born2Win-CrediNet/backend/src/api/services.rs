use sqlx::Row;
use sqlx::SqlitePool;
use chrono::Utc;
use crate::shared::errors::AppError;

pub struct ApiService {
    pub db: SqlitePool,
}

impl ApiService {
    pub fn new(db: SqlitePool) -> Self { Self { db } }

    pub async fn get_user_profile(&self, user_id: &str) -> Result<serde_json::Value, AppError> {
        // 基础信息
        let user_row = sqlx::query("SELECT contact FROM users WHERE id = ?")
            .bind(user_id)
            .fetch_optional(&self.db)
            .await?;
        let contact: String = user_row
            .ok_or_else(|| AppError::NotFound("User not found".to_string()))?
            .try_get("contact")?;

        // worldid 状态
        let worldid_verified: i64 = sqlx::query("SELECT COUNT(*) as c FROM worldid_verifications WHERE user_id = ?")
            .bind(user_id)
            .fetch_one(&self.db)
            .await?
            .try_get("c")?;

        // 绑定列表（oauth + wallets）
        let oauth_rows = sqlx::query("SELECT provider, external_id, username, bound_at FROM oauth_bindings WHERE user_id = ?")
            .bind(user_id)
            .fetch_all(&self.db)
            .await?;
        let mut bindings: Vec<serde_json::Value> = oauth_rows.into_iter().map(|r| {
            serde_json::json!({
                "type": "oauth",
                "provider": r.try_get::<String, _>("provider").unwrap(),
                "external_id": r.try_get::<String, _>("external_id").unwrap(),
                "username": r.try_get::<Option<String>, _>("username").unwrap(),
                "bound_at": r.try_get::<String, _>("bound_at").unwrap(),
            })
        }).collect();

        let wallet_rows = sqlx::query("SELECT address, chain_type, is_primary, verified, connected_at FROM wallet_addresses WHERE user_id = ?")
            .bind(user_id)
            .fetch_all(&self.db)
            .await?;
        for r in wallet_rows {
            bindings.push(serde_json::json!({
                "type": "wallet",
                "address": r.try_get::<String, _>("address")?,
                "chain_type": r.try_get::<String, _>("chain_type")?,
                "is_primary": r.try_get::<i32, _>("is_primary")? == 1,
                "verified": r.try_get::<i32, _>("verified")? == 1,
                "connected_at": r.try_get::<String, _>("connected_at")?,
            }));
        }

        Ok(serde_json::json!({
            "user_id": user_id,
            "contact": contact,
            "worldid_verified": worldid_verified > 0,
            "bindings": bindings,
        }))
    }

    pub async fn bind_social(&self, user_id: &str, provider: &str, code: &str, redirect_uri: Option<&str>) -> Result<serde_json::Value, AppError> {
        // 复用 identity 的 OAuth 流程：模拟令牌与用户信息
        let access_token = format!("access_token_{}", code);
        let user_info_id = format!("{}_user_123", provider);
        let username = Some(format!("user_{}", provider));
        let profile_data = serde_json::json!({"from_api": true});
        let now = Utc::now().to_rfc3339();

        let _ = redirect_uri; // 目前不使用

        sqlx::query(
            "INSERT OR REPLACE INTO oauth_bindings (user_id, provider, external_id, username, access_token, refresh_token, profile_data, bound_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(user_id)
        .bind(provider)
        .bind(&user_info_id)
        .bind(&username)
        .bind(&access_token)
        .bind(Option::<String>::None)
        .bind(profile_data.to_string())
        .bind(&now)
        .execute(&self.db)
        .await?;

        Ok(serde_json::json!({
            "provider": provider,
            "external_id": user_info_id,
            "username": username,
        }))
    }

    pub async fn get_credit_score(&self, user_id: &str) -> Result<serde_json::Value, AppError> {
        let row = sqlx::query("SELECT score, level, version FROM credit_profiles WHERE user_id = ?")
            .bind(user_id)
            .fetch_optional(&self.db)
            .await?;
        if let Some(r) = row {
            Ok(serde_json::json!({
                "score": r.try_get::<i64, _>("score")?,
                "level": r.try_get::<Option<String>, _>("level")?,
                "version": r.try_get::<Option<String>, _>("version")?,
            }))
        } else {
            Ok(serde_json::json!({
                "score": 0,
                "level": serde_json::Value::Null,
                "version": serde_json::Value::Null,
            }))
        }
    }

    pub async fn issue_sbt(&self, user_id: &str, sbt_type: &str) -> Result<serde_json::Value, AppError> {
        // 插入发放记录，状态 PENDING
        let now = Utc::now().to_rfc3339();
        sqlx::query(
            "INSERT OR IGNORE INTO sbt_issuance (user_id, sbt_type, status, issued_at) VALUES (?, ?, 'PENDING', ?)"
        )
        .bind(user_id)
        .bind(sbt_type)
        .bind(&now)
        .execute(&self.db)
        .await?;

        // 模拟链上提交
        let tx_hash = format!("0x{:x}", seahash::hash(now.as_bytes()));
        sqlx::query("UPDATE sbt_issuance SET status = 'CONFIRMED', tx_hash = ?, confirmed_at = ? WHERE user_id = ? AND sbt_type = ?")
            .bind(&tx_hash)
            .bind(&Utc::now().to_rfc3339())
            .bind(user_id)
            .bind(sbt_type)
            .execute(&self.db)
            .await?;

        Ok(serde_json::json!({ "status": "CONFIRMED", "tx_hash": tx_hash }))
    }
}


