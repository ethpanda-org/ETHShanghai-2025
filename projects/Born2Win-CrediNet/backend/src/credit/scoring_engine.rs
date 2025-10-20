use chrono::Utc;
use crate::shared::errors::AppError;
use super::types::*;
use super::data_processor::DataProcessor;

/// 信用评分引擎
pub struct ScoringEngine {
    weights: ScoringWeights,
    version: String,
}

impl ScoringEngine {
    pub fn new() -> Self {
        Self {
            weights: ScoringWeights::default(),
            version: "1.0".to_string(),
        }
    }

    #[allow(dead_code)]
    pub fn with_weights(weights: ScoringWeights) -> Self {
        Self {
            weights,
            version: "1.0".to_string(),
        }
    }

    /// 计算综合信用评分
    pub fn calculate_score(
        &self,
        user_id: &str,
        github: Option<&GitHubRawData>,
        wallets: &[WalletRawData],
        social: &[SocialRawData],
        identity: &IdentityRawData,
    ) -> Result<CreditScore, AppError> {
        println!("🔢 Calculating credit score for user {}", user_id);

        // 1. 标准化各维度数据
        let technical = if let Some(gh_data) = github {
            DataProcessor::normalize_github_data(gh_data)
        } else {
            Self::empty_technical_dimension()
        };

        let financial = DataProcessor::normalize_wallet_data(wallets);
        let social_dim = DataProcessor::normalize_social_data(social);
        let identity_dim = DataProcessor::normalize_identity_data(identity);

        println!("  📐 Technical: {:.2}", technical.total_score);
        println!("  💰 Financial: {:.2}", financial.total_score);
        println!("  📱 Social: {:.2}", social_dim.total_score);
        println!("  🆔 Identity: {:.2}", identity_dim.total_score);

        // 2. 加权计算总分（0-1000）
        let total_score = self.calculate_weighted_score(
            technical.total_score,
            financial.total_score,
            social_dim.total_score,
            identity_dim.total_score,
        );

        println!("  ⭐ Total Score: {}", total_score);

        // 3. 确定评分等级
        let level = CreditLevel::from_score(total_score);

        // 4. 生成用户标签
        let labels = DataProcessor::generate_labels(github, wallets, social, identity);

        // 5. 创建评分细分
        let breakdown = ScoreBreakdown {
            technical: (technical.total_score * 10.0) as i32,  // 转换到0-1000
            financial: (financial.total_score * 10.0) as i32,
            social: (social_dim.total_score * 10.0) as i32,
            identity: (identity_dim.total_score * 10.0) as i32,
        };

        // 6. 生成最终评分结果
        let score = CreditScore {
            user_id: user_id.to_string(),
            total_score,
            level: level.as_str().to_string(),
            breakdown,
            labels: labels.iter().map(|l| l.as_str().to_string()).collect(),
            version: self.version.clone(),
            generated_at: Utc::now().to_rfc3339(),
        };

        Ok(score)
    }

    /// 加权计算总分
    fn calculate_weighted_score(
        &self,
        technical: f64,
        financial: f64,
        social: f64,
        identity: f64,
    ) -> i32 {
        let weighted_sum = 
            technical * self.weights.technical +
            financial * self.weights.financial +
            social * self.weights.social +
            identity * self.weights.identity;

        // 转换到 0-1000 区间
        let total = weighted_sum * 10.0;

        // 确保在有效范围内
        total.round().max(0.0).min(1000.0) as i32
    }

    /// 创建信用画像
    pub fn create_profile(
        &self,
        user_id: &str,
        score: &CreditScore,
        technical: Option<TechnicalDimension>,
        financial: Option<FinancialDimension>,
        social: Option<SocialDimension>,
        identity: Option<IdentityDimension>,
    ) -> Result<CreditProfile, AppError> {
        // 将详细数据序列化为JSON
        let details = serde_json::json!({
            "technical": technical,
            "financial": financial,
            "social": social,
            "identity": identity,
            "breakdown": score.breakdown,
            "raw_scores": {
                "technical": technical.as_ref().map(|t| t.total_score),
                "financial": financial.as_ref().map(|f| f.total_score),
                "social": social.as_ref().map(|s| s.total_score),
                "identity": identity.as_ref().map(|i| i.total_score),
            }
        });

        Ok(CreditProfile {
            user_id: user_id.to_string(),
            score: score.total_score,
            level: score.level.clone(),
            technical_dimension: technical,
            financial_dimension: financial,
            social_dimension: social,
            identity_dimension: identity,
            labels: score.labels.clone(),
            score_details: details.to_string(),
            version: score.version.clone(),
            updated_at: score.generated_at.clone(),
        })
    }

    // ========== 默认空维度 ==========
    
    fn empty_technical_dimension() -> TechnicalDimension {
        TechnicalDimension {
            github_activity: NormalizedScore { value: 0.0, original_value: 0.0, weight: 0.40 },
            code_quality: NormalizedScore { value: 0.0, original_value: 0.0, weight: 0.30 },
            community_impact: NormalizedScore { value: 0.0, original_value: 0.0, weight: 0.30 },
            total_score: 0.0,
        }
    }

    // ========== 评分解释 ==========
    
    /// 生成评分解释
    #[allow(dead_code)]
    pub fn explain_score(&self, score: &CreditScore) -> String {
        let mut explanation = vec![
            format!("信用评分: {} (等级: {})", score.total_score, score.level),
            String::new(),
            "评分细分:".to_string(),
        ];

        explanation.push(format!("  • 技术贡献: {} (权重 {}%)", 
            score.breakdown.technical, (self.weights.technical * 100.0) as i32));
        explanation.push(format!("  • 财务信用: {} (权重 {}%)", 
            score.breakdown.financial, (self.weights.financial * 100.0) as i32));
        explanation.push(format!("  • 社交信誉: {} (权重 {}%)", 
            score.breakdown.social, (self.weights.social * 100.0) as i32));
        explanation.push(format!("  • 身份可信: {} (权重 {}%)", 
            score.breakdown.identity, (self.weights.identity * 100.0) as i32));

        if !score.labels.is_empty() {
            explanation.push(String::new());
            explanation.push("用户标签:".to_string());
            for label in &score.labels {
                explanation.push(format!("  • {}", label));
            }
        }

        explanation.join("\n")
    }
}

impl Default for ScoringEngine {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_score_with_github() {
        let engine = ScoringEngine::new();
        
        let github_data = GitHubRawData {
            followers: 100,
            following: 50,
            public_repos: 20,
            public_gists: 5,
            total_stars: 50,
            contributions_last_year: 200,
            account_age_days: 1000,
        };

        let identity_data = IdentityRawData {
            worldid_verified: true,
            credential_count: 2,
            did_count: 1,
        };

        let score = engine.calculate_score(
            "test_user",
            Some(&github_data),
            &[],
            &[],
            &identity_data,
        ).unwrap();

        assert!(score.total_score > 0);
        assert!(!score.labels.is_empty());
    }

    #[test]
    fn test_credit_level() {
        assert_eq!(CreditLevel::from_score(950), CreditLevel::S);
        assert_eq!(CreditLevel::from_score(850), CreditLevel::A);
        assert_eq!(CreditLevel::from_score(750), CreditLevel::B);
        assert_eq!(CreditLevel::from_score(650), CreditLevel::C);
        assert_eq!(CreditLevel::from_score(550), CreditLevel::D);
        assert_eq!(CreditLevel::from_score(400), CreditLevel::E);
    }
}

