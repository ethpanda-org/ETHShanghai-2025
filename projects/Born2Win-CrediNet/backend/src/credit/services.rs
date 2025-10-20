use sqlx::{SqlitePool, Row};
use chrono::Utc;
use crate::shared::errors::AppError;
use super::types::*;
use super::data_fetcher::DataFetcher;
use super::data_processor::DataProcessor;
use super::scoring_engine::ScoringEngine;

/// 信用评分服务
pub struct CreditService {
    db: SqlitePool,
    fetcher: DataFetcher,
    engine: ScoringEngine,
}

impl CreditService {
    pub fn new(db: SqlitePool) -> Self {
        Self {
            fetcher: DataFetcher::new(db.clone()),
            engine: ScoringEngine::new(),
            db,
        }
    }

    /// 计算用户信用评分
    pub async fn calculate_credit_score(
        &self,
        user_id: &str,
        force_refresh: bool,
    ) -> Result<CreditScore, AppError> {
        println!("🎯 Starting credit score calculation for user: {}", user_id);

        // 1. 检查缓存（如果不强制刷新）
        if !force_refresh {
            if let Some(cached_score) = self.get_cached_score(user_id).await? {
                println!("✅ Using cached score (age: {} seconds)", 
                    self.get_cache_age(user_id).await?);
                return Ok(cached_score);
            }
        }

        // 2. 抓取各维度数据
        println!("📥 Fetching data from authorized sources...");
        
        let github_data = self.fetcher.fetch_github_data(user_id).await?;
        let wallet_data = self.fetcher.fetch_wallet_data(user_id).await?;
        let social_data = self.fetcher.fetch_social_data(user_id).await?;
        let identity_data = self.fetcher.fetch_identity_data(user_id).await?;

        // 3. 计算评分
        let score = self.engine.calculate_score(
            user_id,
            github_data.as_ref(),
            &wallet_data,
            &social_data,
            &identity_data,
        )?;

        // 4. 保存评分到数据库
        self.save_score(user_id, &score).await?;

        // 5. 保存信用画像
        let technical = github_data.as_ref().map(|d| DataProcessor::normalize_github_data(d));
        let financial = Some(DataProcessor::normalize_wallet_data(&wallet_data));
        let social_dim = Some(DataProcessor::normalize_social_data(&social_data));
        let identity_dim = Some(DataProcessor::normalize_identity_data(&identity_data));

        let profile = self.engine.create_profile(
            user_id,
            &score,
            technical,
            financial,
            social_dim,
            identity_dim,
        )?;

        self.save_profile(&profile).await?;

        println!("✅ Credit score calculated: {} ({})", score.total_score, score.level);

        Ok(score)
    }

    /// 获取用户评分
    pub async fn get_user_score(&self, user_id: &str) -> Result<Option<CreditScore>, AppError> {
        self.get_cached_score(user_id).await
    }

    /// 获取用户信用画像
    pub async fn get_user_profile(&self, user_id: &str) -> Result<Option<CreditProfile>, AppError> {
        let row = sqlx::query(
            "SELECT score, level, score_details, version, updated_at 
             FROM credit_profiles 
             WHERE user_id = ?"
        )
        .bind(user_id)
        .fetch_optional(&self.db)
        .await?;

        if let Some(r) = row {
            let score: i64 = r.try_get("score")?;
            let level: String = r.try_get("level").unwrap_or_else(|_| "E".to_string());
            let score_details: String = r.try_get("score_details")?;
            let version: String = r.try_get("version").unwrap_or_else(|_| "1.0".to_string());
            let updated_at: String = r.try_get("updated_at")?;

            let details: serde_json::Value = serde_json::from_str(&score_details)?;

            Ok(Some(CreditProfile {
                user_id: user_id.to_string(),
                score: score as i32,
                level,
                technical_dimension: serde_json::from_value(details["technical"].clone()).ok(),
                financial_dimension: serde_json::from_value(details["financial"].clone()).ok(),
                social_dimension: serde_json::from_value(details["social"].clone()).ok(),
                identity_dimension: serde_json::from_value(details["identity"].clone()).ok(),
                labels: vec![], // 需要从score_details中提取
                score_details,
                version,
                updated_at,
            }))
        } else {
            Ok(None)
        }
    }

    /// 获取评分历史
    pub async fn get_score_history(
        &self,
        user_id: &str,
        _limit: Option<i64>,
    ) -> Result<Vec<CreditScore>, AppError> {
        // 从审计日志或历史表中获取
        // 当前简化实现：返回当前评分
        if let Some(current_score) = self.get_cached_score(user_id).await? {
            Ok(vec![current_score])
        } else {
            Ok(vec![])
        }
    }

    /// 获取数据源状态
    pub async fn get_data_sources_status(&self, user_id: &str) -> Result<Vec<DataSourceStatus>, AppError> {
        self.fetcher.get_data_sources_status(user_id).await
    }

    // ========== 内部方法 ==========

    async fn get_cached_score(&self, user_id: &str) -> Result<Option<CreditScore>, AppError> {
        let row = sqlx::query(
            "SELECT score, level, version, updated_at 
             FROM credit_profiles 
             WHERE user_id = ?"
        )
        .bind(user_id)
        .fetch_optional(&self.db)
        .await?;

        if let Some(r) = row {
            let score: i64 = r.try_get("score")?;
            let level: String = r.try_get("level").unwrap_or_else(|_| "E".to_string());
            let version: String = r.try_get("version").unwrap_or_else(|_| "1.0".to_string());
            let updated_at: String = r.try_get("updated_at")?;

            // 获取详细数据
            let details_row = sqlx::query(
                "SELECT score_details FROM credit_profiles WHERE user_id = ?"
            )
            .bind(user_id)
            .fetch_optional(&self.db)
            .await?;

            let (breakdown, labels) = if let Some(dr) = details_row {
                let score_details: String = dr.try_get("score_details")?;
                let details: serde_json::Value = serde_json::from_str(&score_details)?;
                
                let breakdown = ScoreBreakdown {
                    technical: details["breakdown"]["technical"].as_i64().unwrap_or(0) as i32,
                    financial: details["breakdown"]["financial"].as_i64().unwrap_or(0) as i32,
                    social: details["breakdown"]["social"].as_i64().unwrap_or(0) as i32,
                    identity: details["breakdown"]["identity"].as_i64().unwrap_or(0) as i32,
                };

                let labels = vec![]; // 简化实现

                (breakdown, labels)
            } else {
                (
                    ScoreBreakdown {
                        technical: 0,
                        financial: 0,
                        social: 0,
                        identity: 0,
                    },
                    vec![],
                )
            };

            Ok(Some(CreditScore {
                user_id: user_id.to_string(),
                total_score: score as i32,
                level,
                breakdown,
                labels,
                version,
                generated_at: updated_at,
            }))
        } else {
            Ok(None)
        }
    }

    async fn get_cache_age(&self, user_id: &str) -> Result<i64, AppError> {
        let row = sqlx::query(
            "SELECT updated_at FROM credit_profiles WHERE user_id = ?"
        )
        .bind(user_id)
        .fetch_optional(&self.db)
        .await?;

        if let Some(r) = row {
            let updated_at: String = r.try_get("updated_at")?;
            if let Ok(updated) = chrono::DateTime::parse_from_rfc3339(&updated_at) {
                let now = Utc::now();
                let updated_utc = updated.with_timezone(&Utc);
                return Ok((now - updated_utc).num_seconds());
            }
        }

        Ok(0)
    }

    async fn save_score(&self, user_id: &str, score: &CreditScore) -> Result<(), AppError> {
        let now = Utc::now().to_rfc3339();
        
        sqlx::query(
            "INSERT OR REPLACE INTO credit_profiles 
             (user_id, score, level, version, updated_at) 
             VALUES (?, ?, ?, ?, ?)"
        )
        .bind(user_id)
        .bind(score.total_score as i64)
        .bind(&score.level)
        .bind(&score.version)
        .bind(&now)
        .execute(&self.db)
        .await?;

        Ok(())
    }

    async fn save_profile(&self, profile: &CreditProfile) -> Result<(), AppError> {
        sqlx::query(
            "UPDATE credit_profiles 
             SET score_details = ? 
             WHERE user_id = ?"
        )
        .bind(&profile.score_details)
        .bind(&profile.user_id)
        .execute(&self.db)
        .await?;

        Ok(())
    }

    /// 批量计算评分
    pub async fn batch_calculate_scores(&self, user_ids: Vec<String>) -> Result<Vec<CreditScore>, AppError> {
        let mut scores = Vec::new();

        for user_id in user_ids {
            match self.calculate_credit_score(&user_id, false).await {
                Ok(score) => scores.push(score),
                Err(e) => {
                    println!("⚠️  Failed to calculate score for {}: {}", user_id, e);
                }
            }
        }

        Ok(scores)
    }
}

