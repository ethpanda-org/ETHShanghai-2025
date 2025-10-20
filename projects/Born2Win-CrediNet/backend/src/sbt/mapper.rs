use sqlx::{SqlitePool, Row};
use crate::shared::errors::AppError;
use super::types::*;

/// 用户画像到SBT类型的映射器
pub struct SbtMapper {
    db: SqlitePool,
}

impl SbtMapper {
    pub fn new(db: SqlitePool) -> Self {
        Self { db }
    }

    /// 根据用户信用画像确定应发放的SBT类型
    pub async fn determine_eligible_sbts(&self, user_id: &str) -> Result<Vec<SbtType>, AppError> {
        let mut eligible_sbts = Vec::new();

        // 1. 获取信用评分
        let score = self.get_user_score(user_id).await?;
        
        // 根据评分发放信用徽章
        if score >= 800 {
            eligible_sbts.push(SbtType::CreditScoreGold);
        } else if score >= 600 {
            eligible_sbts.push(SbtType::CreditScoreSilver);
        } else if score >= 400 {
            eligible_sbts.push(SbtType::CreditScoreBronze);
        }

        // 2. 获取用户标签
        let labels = self.get_user_labels(user_id).await?;

        // 根据标签发放特定SBT
        if labels.contains(&"code_contributor".to_string()) {
            eligible_sbts.push(SbtType::DeveloperBadge);
        }

        if labels.contains(&"active_trader".to_string()) {
            eligible_sbts.push(SbtType::ActiveTraderBadge);
        }

        if labels.contains(&"social_influencer".to_string()) {
            eligible_sbts.push(SbtType::SocialInfluencer);
        }

        if labels.contains(&"early_adopter".to_string()) {
            eligible_sbts.push(SbtType::EarlyAdopter);
        }

        // 3. 检查World ID验证
        if self.is_worldid_verified(user_id).await? {
            eligible_sbts.push(SbtType::VerifiedHuman);
        }

        println!("🎯 Determined {} eligible SBTs for user {}", eligible_sbts.len(), user_id);

        Ok(eligible_sbts)
    }

    /// 过滤已发放的SBT（防止重复发放）
    pub async fn filter_unissued_sbts(
        &self,
        user_id: &str,
        eligible_sbts: Vec<SbtType>,
    ) -> Result<Vec<SbtType>, AppError> {
        let mut unissued = Vec::new();

        for sbt_type in eligible_sbts {
            let already_issued = self.check_already_issued(user_id, &sbt_type).await?;
            
            if !already_issued {
                unissued.push(sbt_type);
            } else {
                println!("  ⏭️  Skipping {} - already issued", sbt_type.as_str());
            }
        }

        println!("📋 {} SBTs to issue (after filtering)", unissued.len());

        Ok(unissued)
    }

    /// 检查SBT是否已发放
    async fn check_already_issued(
        &self,
        user_id: &str,
        sbt_type: &SbtType,
    ) -> Result<bool, AppError> {
        let result = sqlx::query(
            "SELECT COUNT(*) as count FROM sbt_issuance 
             WHERE user_id = ? AND sbt_type = ? AND status IN ('CONFIRMED', 'PROCESSING')"
        )
        .bind(user_id)
        .bind(sbt_type.as_str())
        .fetch_one(&self.db)
        .await?;

        let count: i64 = result.try_get("count")?;
        Ok(count > 0)
    }

    /// 获取用户信用评分
    async fn get_user_score(&self, user_id: &str) -> Result<i32, AppError> {
        let result = sqlx::query(
            "SELECT score FROM credit_profiles WHERE user_id = ?"
        )
        .bind(user_id)
        .fetch_optional(&self.db)
        .await?;

        if let Some(row) = result {
            let score: i64 = row.try_get("score")?;
            Ok(score as i32)
        } else {
            Ok(0)
        }
    }

    /// 获取用户标签
    async fn get_user_labels(&self, user_id: &str) -> Result<Vec<String>, AppError> {
        let result = sqlx::query(
            "SELECT score_details FROM credit_profiles WHERE user_id = ?"
        )
        .bind(user_id)
        .fetch_optional(&self.db)
        .await?;

        if let Some(row) = result {
            let details_str: Option<String> = row.try_get("score_details").ok();
            if let Some(details) = details_str {
                let data: serde_json::Value = serde_json::from_str(&details)?;
                if let Some(labels_array) = data.get("labels") {
                    if let Some(labels) = labels_array.as_array() {
                        return Ok(labels.iter()
                            .filter_map(|v| v.as_str().map(|s| s.to_string()))
                            .collect());
                    }
                }
            }
        }

        Ok(Vec::new())
    }

    /// 检查World ID验证状态
    async fn is_worldid_verified(&self, user_id: &str) -> Result<bool, AppError> {
        let result = sqlx::query(
            "SELECT COUNT(*) as count FROM worldid_verifications WHERE user_id = ?"
        )
        .bind(user_id)
        .fetch_one(&self.db)
        .await?;

        let count: i64 = result.try_get("count")?;
        Ok(count > 0)
    }

    /// 获取SBT类型信息
    pub fn get_sbt_type_info(sbt_type: &SbtType) -> SbtTypeInfo {
        SbtTypeInfo {
            sbt_type: sbt_type.as_str().to_string(),
            token_id: sbt_type.token_id(),
            description: sbt_type.description().to_string(),
            eligibility: Self::get_eligibility_criteria(sbt_type),
        }
    }

    fn get_eligibility_criteria(sbt_type: &SbtType) -> String {
        match sbt_type {
            SbtType::CreditScoreGold => "信用评分 ≥ 800".to_string(),
            SbtType::CreditScoreSilver => "信用评分 ≥ 600".to_string(),
            SbtType::CreditScoreBronze => "信用评分 ≥ 400".to_string(),
            SbtType::DeveloperBadge => "拥有 'code_contributor' 标签".to_string(),
            SbtType::ActiveTraderBadge => "拥有 'active_trader' 标签".to_string(),
            SbtType::SocialInfluencer => "拥有 'social_influencer' 标签".to_string(),
            SbtType::VerifiedHuman => "通过 World ID 真人验证".to_string(),
            SbtType::EarlyAdopter => "拥有 'early_adopter' 标签".to_string(),
        }
    }

    /// 获取所有SBT类型列表
    pub fn get_all_sbt_types() -> Vec<SbtTypeInfo> {
        vec![
            SbtType::CreditScoreGold,
            SbtType::CreditScoreSilver,
            SbtType::CreditScoreBronze,
            SbtType::DeveloperBadge,
            SbtType::ActiveTraderBadge,
            SbtType::SocialInfluencer,
            SbtType::VerifiedHuman,
            SbtType::EarlyAdopter,
        ]
        .into_iter()
        .map(|sbt| Self::get_sbt_type_info(&sbt))
        .collect()
    }
}

