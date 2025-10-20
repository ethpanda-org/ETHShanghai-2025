use sqlx::{SqlitePool, Row};
use chrono::Utc;
use crate::shared::errors::AppError;
use super::types::*;

/// 外部数据抓取服务
#[allow(dead_code)]
pub struct DataFetcher {
    db: SqlitePool,
    config: FetchConfig,
}

impl DataFetcher {
    pub fn new(db: SqlitePool) -> Self {
        Self {
            db,
            config: FetchConfig::default(),
        }
    }

    #[allow(dead_code)]
    pub fn with_config(db: SqlitePool, config: FetchConfig) -> Self {
        Self { db, config }
    }

    // ========== GitHub 数据抓取 ==========
    
    pub async fn fetch_github_data(&self, user_id: &str) -> Result<Option<GitHubRawData>, AppError> {
        // 检查是否授权
        if !self.check_authorization(user_id, "github").await? {
            return Ok(None);
        }

        // 检查缓存
        if let Some(cached) = self.get_cached_github_data(user_id).await? {
            return Ok(Some(cached));
        }

        // 获取OAuth绑定信息
        let oauth_row = sqlx::query(
            "SELECT external_id, access_token, profile_data 
             FROM oauth_bindings 
             WHERE user_id = ? AND provider = 'github'"
        )
        .bind(user_id)
        .fetch_optional(&self.db)
        .await?;

        if let Some(row) = oauth_row {
            let profile_data: String = row.try_get("profile_data")?;
            let profile: serde_json::Value = serde_json::from_str(&profile_data)?;

            // 从已存储的数据中提取
            let github_data = GitHubRawData {
                followers: profile["followers"].as_i64().unwrap_or(0),
                following: profile["following"].as_i64().unwrap_or(0),
                public_repos: profile["public_repos"].as_i64().unwrap_or(0),
                public_gists: profile["public_gists"].as_i64().unwrap_or(0),
                total_stars: 0, // 需要额外API调用获取
                contributions_last_year: 0, // 需要额外API调用获取
                account_age_days: self.calculate_account_age(&profile),
            };

            println!("📊 Fetched GitHub data for user {}: {} repos, {} followers", 
                user_id, github_data.public_repos, github_data.followers);

            // 缓存数据（可选：存储到单独的缓存表）
            
            Ok(Some(github_data))
        } else {
            Ok(None)
        }
    }

    fn calculate_account_age(&self, profile: &serde_json::Value) -> i64 {
        if let Some(created_at) = profile["created_at"].as_str() {
            if let Ok(created) = chrono::DateTime::parse_from_rfc3339(created_at) {
                let now = Utc::now();
                let created_utc = created.with_timezone(&Utc);
                return (now - created_utc).num_days();
            }
        }
        0
    }

    async fn get_cached_github_data(&self, _user_id: &str) -> Result<Option<GitHubRawData>, AppError> {
        // TODO: 实现缓存逻辑
        Ok(None)
    }

    // ========== 区块链钱包数据抓取 ==========
    
    pub async fn fetch_wallet_data(&self, user_id: &str) -> Result<Vec<WalletRawData>, AppError> {
        // 检查是否授权钱包数据访问
        if !self.check_authorization(user_id, "ethereum_wallet").await? {
            return Ok(vec![]);
        }

        // 获取用户钱包地址
        let wallet_rows = sqlx::query(
            "SELECT address, chain_type, connected_at 
             FROM wallet_addresses 
             WHERE user_id = ? AND verified = 1"
        )
        .bind(user_id)
        .fetch_all(&self.db)
        .await?;

        let mut wallet_data_list = Vec::new();

        for row in wallet_rows {
            let address: String = row.try_get("address")?;
            let chain_type: String = row.try_get("chain_type")?;
            let connected_at: String = row.try_get("connected_at")?;

            // 模拟链上数据获取（实际应调用链上API）
            let wallet_data = self.fetch_onchain_data(&address, &chain_type, &connected_at).await?;
            
            wallet_data_list.push(wallet_data);
        }

        println!("💰 Fetched {} wallet data for user {}", wallet_data_list.len(), user_id);

        Ok(wallet_data_list)
    }

    async fn fetch_onchain_data(
        &self,
        address: &str,
        chain: &str,
        connected_at: &str,
    ) -> Result<WalletRawData, AppError> {
        // 模拟链上数据抓取
        // 实际应调用：
        // - Etherscan API / Blockchain.com API
        // - Web3 RPC节点
        // - The Graph等索引服务

        let first_tx_days = self.calculate_days_since(connected_at);

        Ok(WalletRawData {
            address: address.to_string(),
            chain: chain.to_string(),
            balance: 1.5,              // ETH
            transaction_count: 150,
            token_count: 5,
            first_transaction_days_ago: first_tx_days,
            nft_count: 3,
        })
    }

    fn calculate_days_since(&self, date_str: &str) -> i64 {
        if let Ok(date) = chrono::DateTime::parse_from_rfc3339(date_str) {
            let now = Utc::now();
            let date_utc = date.with_timezone(&Utc);
            return (now - date_utc).num_days();
        }
        0
    }

    // ========== 社交平台数据抓取 ==========
    
    pub async fn fetch_social_data(&self, user_id: &str) -> Result<Vec<SocialRawData>, AppError> {
        let mut social_data = Vec::new();

        // Twitter
        if self.check_authorization(user_id, "twitter").await? {
            if let Some(twitter_data) = self.fetch_twitter_data(user_id).await? {
                social_data.push(twitter_data);
            }
        }

        // Facebook
        if self.check_authorization(user_id, "facebook").await? {
            if let Some(facebook_data) = self.fetch_facebook_data(user_id).await? {
                social_data.push(facebook_data);
            }
        }

        println!("📱 Fetched {} social platforms data for user {}", social_data.len(), user_id);

        Ok(social_data)
    }

    async fn fetch_twitter_data(&self, user_id: &str) -> Result<Option<SocialRawData>, AppError> {
        let oauth_row = sqlx::query(
            "SELECT profile_data, bound_at 
             FROM oauth_bindings 
             WHERE user_id = ? AND provider = 'twitter'"
        )
        .bind(user_id)
        .fetch_optional(&self.db)
        .await?;

        if let Some(row) = oauth_row {
            let profile_data: String = row.try_get("profile_data")?;
            let bound_at: String = row.try_get("bound_at")?;
            let profile: serde_json::Value = serde_json::from_str(&profile_data)?;

            Ok(Some(SocialRawData {
                platform: "twitter".to_string(),
                followers: profile["followers"].as_i64().unwrap_or(0),
                posts_count: profile["statuses_count"].as_i64().unwrap_or(0),
                verified: profile["verified"].as_bool().unwrap_or(false),
                account_age_days: self.calculate_days_since(&bound_at),
            }))
        } else {
            Ok(None)
        }
    }

    async fn fetch_facebook_data(&self, user_id: &str) -> Result<Option<SocialRawData>, AppError> {
        let oauth_row = sqlx::query(
            "SELECT profile_data, bound_at 
             FROM oauth_bindings 
             WHERE user_id = ? AND provider = 'facebook'"
        )
        .bind(user_id)
        .fetch_optional(&self.db)
        .await?;

        if let Some(row) = oauth_row {
            let profile_data: String = row.try_get("profile_data")?;
            let bound_at: String = row.try_get("bound_at")?;
            let profile: serde_json::Value = serde_json::from_str(&profile_data)?;

            Ok(Some(SocialRawData {
                platform: "facebook".to_string(),
                followers: profile["friends_count"].as_i64().unwrap_or(0),
                posts_count: profile["posts_count"].as_i64().unwrap_or(0),
                verified: profile["verified"].as_bool().unwrap_or(false),
                account_age_days: self.calculate_days_since(&bound_at),
            }))
        } else {
            Ok(None)
        }
    }

    // ========== 身份验证数据抓取 ==========
    
    pub async fn fetch_identity_data(&self, user_id: &str) -> Result<IdentityRawData, AppError> {
        // World ID
        let worldid_verified = if self.check_authorization(user_id, "worldid").await? {
            let count: i64 = sqlx::query(
                "SELECT COUNT(*) as count FROM worldid_verifications WHERE user_id = ?"
            )
            .bind(user_id)
            .fetch_one(&self.db)
            .await?
            .try_get("count")?;
            count > 0
        } else {
            false
        };

        // 可验证凭证
        let credential_count = if self.check_authorization(user_id, "verifiable_credential").await? {
            sqlx::query(
                "SELECT COUNT(*) as count FROM verifiable_credentials WHERE user_id = ?"
            )
            .bind(user_id)
            .fetch_one(&self.db)
            .await?
            .try_get("count")?
        } else {
            0
        };

        // DID
        let did_count: i64 = if self.check_authorization(user_id, "did").await? {
            sqlx::query(
                "SELECT COUNT(*) as count FROM dids WHERE user_id = ?"
            )
            .bind(user_id)
            .fetch_one(&self.db)
            .await?
            .try_get("count")?
        } else {
            0
        };

        println!("🆔 Fetched identity data for user {}: WorldID={}, VCs={}, DIDs={}", 
            user_id, worldid_verified, credential_count, did_count);

        Ok(IdentityRawData {
            worldid_verified,
            credential_count,
            did_count,
        })
    }

    // ========== 辅助方法 ==========
    
    async fn check_authorization(&self, user_id: &str, data_source: &str) -> Result<bool, AppError> {
        let result = sqlx::query(
            "SELECT status FROM user_authorizations 
             WHERE user_id = ? AND data_source = ? AND status = 'authorized'"
        )
        .bind(user_id)
        .bind(data_source)
        .fetch_optional(&self.db)
        .await?;

        Ok(result.is_some())
    }

    /// 获取数据源状态（用于诊断）
    pub async fn get_data_sources_status(&self, user_id: &str) -> Result<Vec<DataSourceStatus>, AppError> {
        let mut statuses = Vec::new();

        let sources = vec![
            "github",
            "twitter",
            "facebook",
            "ethereum_wallet",
            "worldid",
            "verifiable_credential",
            "did",
        ];

        for source in sources {
            let authorized = self.check_authorization(user_id, source).await?;
            
            statuses.push(DataSourceStatus {
                data_source: source.to_string(),
                available: authorized,
                last_fetched: None,
                error: if !authorized {
                    Some("未授权".to_string())
                } else {
                    None
                },
            });
        }

        Ok(statuses)
    }
}

// ========== 重试机制 ==========

#[allow(dead_code)]
pub async fn fetch_with_retry<F, Fut, T>(
    fetch_fn: F,
    retry_count: u32,
) -> Result<T, AppError>
where
    F: Fn() -> Fut,
    Fut: std::future::Future<Output = Result<T, AppError>>,
{
    let mut last_error = None;

    for attempt in 0..=retry_count {
        match fetch_fn().await {
            Ok(result) => return Ok(result),
            Err(e) => {
                last_error = Some(e);
                if attempt < retry_count {
                    println!("⚠️  Fetch attempt {} failed, retrying...", attempt + 1);
                    tokio::time::sleep(tokio::time::Duration::from_secs(2_u64.pow(attempt))).await;
                }
            }
        }
    }

    Err(last_error.unwrap_or_else(|| AppError::ValidationError("Fetch failed".to_string())))
}

