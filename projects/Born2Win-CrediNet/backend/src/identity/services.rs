use sqlx::{SqlitePool, Row};
use chrono::Utc;
use crate::shared::errors::AppError;
use super::types::*;

pub struct IdentityService {
    db: SqlitePool,
}

impl IdentityService {
    pub fn new(db: SqlitePool) -> Self {
        Self { db }
    }

    // ========== World ID 验证 ==========
    pub async fn verify_worldid(
        &self,
        user_id: &str,
        proof: &WorldIdProof,
        action: &str,
        signal: &str,
    ) -> Result<bool, AppError> {
        // 调用 Worldcoin API 验证证明
        let verified = self.call_worldcoin_api(proof, action, signal).await?;
        
        if verified {
            // 存储验证结果
            let now = Utc::now().to_rfc3339();
            sqlx::query(
                "INSERT OR REPLACE INTO worldid_verifications (user_id, nullifier_hash, verification_level, verified_at) VALUES (?, ?, ?, ?)"
            )
            .bind(user_id)
            .bind(&proof.nullifier_hash)
            .bind(&proof.verification_level)
            .bind(&now)
            .execute(&self.db)
            .await?;
        }
        
        Ok(verified)
    }

    async fn call_worldcoin_api(
        &self,
        proof: &WorldIdProof,
        action: &str,
        signal: &str,
    ) -> Result<bool, AppError> {
        // 模拟 Worldcoin API 调用
        // 实际实现需要调用 https://developer.worldcoin.org/api/v1/verify
        
        // 验证逻辑：
        // 1. 检查 merkle_root 是否有效
        // 2. 验证 nullifier_hash 是否已使用
        // 3. 验证零知识证明
        
        // 这里返回模拟结果
        println!("🌍 Verifying World ID proof:");
        println!("  Merkle Root: {}", proof.merkle_root);
        println!("  Nullifier Hash: {}", proof.nullifier_hash);
        println!("  Action: {}", action);
        println!("  Signal: {}", signal);
        
        // 模拟验证成功
        Ok(true)
    }

    pub async fn check_worldid_status(&self, user_id: &str) -> Result<bool, AppError> {
        let result = sqlx::query("SELECT COUNT(*) as count FROM worldid_verifications WHERE user_id = ?")
            .bind(user_id)
            .fetch_one(&self.db)
            .await?;
        
        let count: i64 = result.try_get("count")?;
        Ok(count > 0)
    }

    // ========== 可验证凭证验证 ==========
    pub async fn verify_credential(
        &self,
        user_id: &str,
        credential_str: &str,
    ) -> Result<(bool, Option<VerifiableCredential>), AppError> {
        // 解析凭证
        let credential: VerifiableCredential = serde_json::from_str(credential_str)
            .map_err(|e| AppError::ValidationError(format!("Invalid credential format: {}", e)))?;
        
        // 验证凭证
        let verified = self.verify_vc_signature(&credential).await?;
        
        if verified {
            // 存储凭证
            let now = Utc::now().to_rfc3339();
            let vc_types = serde_json::to_string(&credential.vc_type)?;
            
            sqlx::query(
                "INSERT INTO verifiable_credentials (user_id, credential_id, issuer, vc_type, credential_data, verified_at) VALUES (?, ?, ?, ?, ?, ?)"
            )
            .bind(user_id)
            .bind(&credential.id)
            .bind(&credential.issuer)
            .bind(&vc_types)
            .bind(credential_str)
            .bind(&now)
            .execute(&self.db)
            .await?;
            
            Ok((true, Some(credential)))
        } else {
            Ok((false, None))
        }
    }

    async fn verify_vc_signature(&self, credential: &VerifiableCredential) -> Result<bool, AppError> {
        // 验证逻辑：
        // 1. 检查颁发者DID是否可信
        // 2. 验证签名
        // 3. 检查凭证是否过期
        // 4. 检查凭证是否被吊销
        
        println!("🔐 Verifying VC:");
        println!("  Issuer: {}", credential.issuer);
        println!("  Type: {:?}", credential.vc_type);
        
        // 检查过期时间
        if let Some(exp_date) = &credential.expiration_date {
            // 简单的日期比较
            if exp_date < &Utc::now().to_rfc3339() {
                return Ok(false);
            }
        }
        
        // 模拟验证成功
        Ok(true)
    }

    pub async fn get_user_credentials(&self, user_id: &str) -> Result<Vec<VcSummary>, AppError> {
        let rows = sqlx::query(
            "SELECT credential_id, issuer, vc_type, verified_at FROM verifiable_credentials WHERE user_id = ?"
        )
        .bind(user_id)
        .fetch_all(&self.db)
        .await?;
        
        let mut credentials = Vec::new();
        for row in rows {
            let vc_type_str: String = row.try_get("vc_type")?;
            let vc_type: Vec<String> = serde_json::from_str(&vc_type_str)?;
            
            credentials.push(VcSummary {
                id: row.try_get("credential_id")?,
                issuer: row.try_get("issuer")?,
                vc_type,
                verified_at: row.try_get("verified_at")?,
            });
        }
        
        Ok(credentials)
    }

    // ========== OAuth 绑定 ==========
    pub async fn bind_oauth(
        &self,
        user_id: &str,
        provider: &str,
        code: &str,
        redirect_uri: &str,
    ) -> Result<OAuthUserInfo, AppError> {
        // 交换授权码获取访问令牌
        let (access_token, refresh_token) = self.exchange_oauth_code(provider, code, redirect_uri).await?;
        
        // 获取用户信息
        let user_info = self.fetch_oauth_user_info(provider, &access_token).await?;
        
        // 存储绑定信息
        let now = Utc::now().to_rfc3339();
        let profile_data = serde_json::to_string(&user_info.profile_data)?;
        
        sqlx::query(
            "INSERT OR REPLACE INTO oauth_bindings (user_id, provider, external_id, username, access_token, refresh_token, profile_data, bound_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(user_id)
        .bind(provider)
        .bind(&user_info.id)
        .bind(&user_info.username)
        .bind(&access_token)
        .bind(&refresh_token)
        .bind(&profile_data)
        .bind(&now)
        .execute(&self.db)
        .await?;
        
        Ok(user_info)
    }

    async fn exchange_oauth_code(
        &self,
        provider: &str,
        code: &str,
        redirect_uri: &str,
    ) -> Result<(String, Option<String>), AppError> {
        // 模拟OAuth授权码交换
        println!("🔑 Exchanging OAuth code:");
        println!("  Provider: {}", provider);
        println!("  Code: {}", code);
        println!("  Redirect URI: {}", redirect_uri);
        
        // 实际实现需要调用各平台的OAuth API
        // 返回模拟的访问令牌
        Ok((format!("access_token_{}", code), Some(format!("refresh_token_{}", code))))
    }

    async fn fetch_oauth_user_info(
        &self,
        provider: &str,
        access_token: &str,
    ) -> Result<OAuthUserInfo, AppError> {
        // 模拟获取用户信息
        println!("👤 Fetching OAuth user info:");
        println!("  Provider: {}", provider);
        println!("  Token: {}...", &access_token[..20]);
        
        // 实际实现需要调用各平台的用户信息API
        Ok(OAuthUserInfo {
            id: format!("{}_user_123", provider),
            username: Some(format!("user_{}", provider)),
            email: Some(format!("user@{}.com", provider)),
            avatar_url: Some(format!("https://avatar.{}.com/user.jpg", provider)),
            profile_data: serde_json::json!({
                "followers": 100,
                "following": 50,
            }),
        })
    }

    pub async fn unbind_oauth(&self, user_id: &str, provider: &str) -> Result<(), AppError> {
        sqlx::query("DELETE FROM oauth_bindings WHERE user_id = ? AND provider = ?")
            .bind(user_id)
            .bind(provider)
            .execute(&self.db)
            .await?;
        
        Ok(())
    }

    pub async fn get_oauth_bindings(&self, user_id: &str) -> Result<Vec<OAuthBinding>, AppError> {
        let rows = sqlx::query(
            "SELECT provider, external_id, username, bound_at FROM oauth_bindings WHERE user_id = ?"
        )
        .bind(user_id)
        .fetch_all(&self.db)
        .await?;
        
        let mut bindings = Vec::new();
        for row in rows {
            bindings.push(OAuthBinding {
                provider: row.try_get("provider")?,
                external_id: row.try_get("external_id")?,
                username: row.try_get("username")?,
                bound_at: row.try_get("bound_at")?,
            });
        }
        
        Ok(bindings)
    }

    // ========== 钱包地址关联 ==========
    pub async fn connect_wallet(
        &self,
        user_id: &str,
        address: &str,
        chain_type: &str,
        signature: Option<&str>,
        message: Option<&str>,
    ) -> Result<bool, AppError> {
        // 验证签名（如果提供）
        let verified = if let (Some(sig), Some(msg)) = (signature, message) {
            self.verify_wallet_signature(address, msg, sig, chain_type)?
        } else {
            false
        };
        
        // 检查地址是否已被其他用户使用
        let existing = sqlx::query("SELECT user_id FROM wallet_addresses WHERE address = ?")
            .bind(address)
            .fetch_optional(&self.db)
            .await?;
        
        if let Some(row) = existing {
            let existing_user_id: String = row.try_get("user_id")?;
            if existing_user_id != user_id {
                return Err(AppError::ValidationError("Address already bound to another user".to_string()));
            }
        }
        
        // 存储钱包地址
        let now = Utc::now().to_rfc3339();
        sqlx::query(
            "INSERT OR REPLACE INTO wallet_addresses (user_id, address, chain_type, verified, connected_at) VALUES (?, ?, ?, ?, ?)"
        )
        .bind(user_id)
        .bind(address)
        .bind(chain_type)
        .bind(verified)
        .bind(&now)
        .execute(&self.db)
        .await?;
        
        Ok(verified)
    }

    fn verify_wallet_signature(
        &self,
        address: &str,
        message: &str,
        _signature: &str,
        chain_type: &str,
    ) -> Result<bool, AppError> {
        // 验证签名
        println!("✍️ Verifying wallet signature:");
        println!("  Address: {}", address);
        println!("  Chain: {}", chain_type);
        println!("  Message: {}", message);
        
        // 实际实现需要根据不同链类型验证签名
        // 以太坊: 使用 secp256k1 验证
        // Solana: 使用 ed25519 验证
        
        // 模拟验证成功
        Ok(true)
    }

    pub async fn set_primary_wallet(&self, user_id: &str, address: &str) -> Result<(), AppError> {
        // 清除当前主地址
        sqlx::query("UPDATE wallet_addresses SET is_primary = 0 WHERE user_id = ?")
            .bind(user_id)
            .execute(&self.db)
            .await?;
        
        // 设置新的主地址
        sqlx::query("UPDATE wallet_addresses SET is_primary = 1 WHERE user_id = ? AND address = ?")
            .bind(user_id)
            .bind(address)
            .execute(&self.db)
            .await?;
        
        Ok(())
    }

    pub async fn get_user_wallets(&self, user_id: &str) -> Result<Vec<WalletInfo>, AppError> {
        let rows = sqlx::query(
            "SELECT address, chain_type, is_primary, verified, connected_at FROM wallet_addresses WHERE user_id = ?"
        )
        .bind(user_id)
        .fetch_all(&self.db)
        .await?;
        
        let mut wallets = Vec::new();
        for row in rows {
            wallets.push(WalletInfo {
                address: row.try_get("address")?,
                chain_type: row.try_get("chain_type")?,
                is_primary: row.try_get::<i32, _>("is_primary")? == 1,
                verified: row.try_get::<i32, _>("verified")? == 1,
                connected_at: row.try_get("connected_at")?,
            });
        }
        
        Ok(wallets)
    }

    pub async fn get_primary_wallet(&self, user_id: &str) -> Result<Option<String>, AppError> {
        let result = sqlx::query("SELECT address FROM wallet_addresses WHERE user_id = ? AND is_primary = 1")
            .bind(user_id)
            .fetch_optional(&self.db)
            .await?;
        
        if let Some(row) = result {
            Ok(Some(row.try_get("address")?))
        } else {
            Ok(None)
        }
    }

    // ========== 综合查询 ==========
    pub async fn get_user_identity_info(&self, user_id: &str) -> Result<UserIdentityInfo, AppError> {
        let worldid_verified = self.check_worldid_status(user_id).await?;
        
        let worldid_nullifier = if worldid_verified {
            let row = sqlx::query("SELECT nullifier_hash FROM worldid_verifications WHERE user_id = ?")
                .bind(user_id)
                .fetch_optional(&self.db)
                .await?;
            row.and_then(|r| r.try_get("nullifier_hash").ok())
        } else {
            None
        };
        
        let verified_credentials = self.get_user_credentials(user_id).await?;
        let oauth_bindings = self.get_oauth_bindings(user_id).await?;
        let wallets = self.get_user_wallets(user_id).await?;
        
        Ok(UserIdentityInfo {
            user_id: user_id.to_string(),
            worldid_verified,
            worldid_nullifier,
            verified_credentials,
            oauth_bindings,
            wallets,
        })
    }
}
