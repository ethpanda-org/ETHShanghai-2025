use super::types::*;

/// 数据处理和标准化服务
pub struct DataProcessor;

impl DataProcessor {
    // ========== 数据标准化（归一化到 0-100）==========
    
    /// 标准化 GitHub 数据
    pub fn normalize_github_data(data: &GitHubRawData) -> TechnicalDimension {
        // GitHub活跃度评分（0-100）
        let github_score = Self::normalize_github_activity(data);
        
        // 代码质量评分（基于stars等）
        let quality_score = Self::normalize_code_quality(data);
        
        // 社区影响力评分
        let impact_score = Self::normalize_community_impact(data);
        
        let total = (github_score.value + quality_score.value + impact_score.value) / 3.0;
        
        TechnicalDimension {
            github_activity: github_score,
            code_quality: quality_score,
            community_impact: impact_score,
            total_score: total,
        }
    }

    fn normalize_github_activity(data: &GitHubRawData) -> NormalizedScore {
        let original = data.public_repos as f64 + (data.contributions_last_year as f64 / 10.0);
        
        // 使用对数缩放，避免极端值
        let normalized = Self::log_normalize(original, 1.0, 200.0);
        
        NormalizedScore {
            value: normalized,
            original_value: original,
            weight: 0.40,
        }
    }

    fn normalize_code_quality(data: &GitHubRawData) -> NormalizedScore {
        let original = data.total_stars as f64 + (data.public_gists as f64 * 2.0);
        let normalized = Self::log_normalize(original, 1.0, 500.0);
        
        NormalizedScore {
            value: normalized,
            original_value: original,
            weight: 0.30,
        }
    }

    fn normalize_community_impact(data: &GitHubRawData) -> NormalizedScore {
        let original = data.followers as f64;
        let normalized = Self::log_normalize(original, 1.0, 1000.0);
        
        NormalizedScore {
            value: normalized,
            original_value: original,
            weight: 0.30,
        }
    }

    /// 标准化钱包数据
    pub fn normalize_wallet_data(data: &[WalletRawData]) -> FinancialDimension {
        if data.is_empty() {
            return Self::empty_financial_dimension();
        }

        // 计算总资产价值
        let total_balance: f64 = data.iter().map(|w| w.balance).sum();
        let asset_score = Self::normalize_asset_value(total_balance);
        
        // 交易历史评分
        let total_txs: i64 = data.iter().map(|w| w.transaction_count).sum();
        let tx_score = Self::normalize_transaction_history(total_txs);
        
        // 账户时长评分
        let max_age = data.iter().map(|w| w.first_transaction_days_ago).max().unwrap_or(0);
        let longevity_score = Self::normalize_account_longevity(max_age);
        
        let total = (asset_score.value + tx_score.value + longevity_score.value) / 3.0;
        
        FinancialDimension {
            asset_value: asset_score,
            transaction_history: tx_score,
            account_longevity: longevity_score,
            total_score: total,
        }
    }

    fn normalize_asset_value(balance: f64) -> NormalizedScore {
        let normalized = Self::log_normalize(balance, 0.1, 100.0);
        
        NormalizedScore {
            value: normalized,
            original_value: balance,
            weight: 0.40,
        }
    }

    fn normalize_transaction_history(tx_count: i64) -> NormalizedScore {
        let original = tx_count as f64;
        let normalized = Self::log_normalize(original, 1.0, 1000.0);
        
        NormalizedScore {
            value: normalized,
            original_value: original,
            weight: 0.35,
        }
    }

    fn normalize_account_longevity(days: i64) -> NormalizedScore {
        let original = days as f64;
        let normalized = Self::linear_normalize(original, 0.0, 365.0 * 3.0); // 3年满分
        
        NormalizedScore {
            value: normalized,
            original_value: original,
            weight: 0.25,
        }
    }

    /// 标准化社交数据
    pub fn normalize_social_data(data: &[SocialRawData]) -> SocialDimension {
        if data.is_empty() {
            return Self::empty_social_dimension();
        }

        // 影响力评分
        let total_followers: i64 = data.iter().map(|s| s.followers).sum();
        let influence_score = Self::normalize_social_influence(total_followers);
        
        // 参与度评分
        let total_posts: i64 = data.iter().map(|s| s.posts_count).sum();
        let engagement_score = Self::normalize_social_engagement(total_posts);
        
        // 可信度评分
        let verified_count = data.iter().filter(|s| s.verified).count() as i64;
        let credibility_score = Self::normalize_social_credibility(verified_count, data.len() as i64);
        
        let total = (influence_score.value + engagement_score.value + credibility_score.value) / 3.0;
        
        SocialDimension {
            influence_score,
            engagement_rate: engagement_score,
            account_credibility: credibility_score,
            total_score: total,
        }
    }

    fn normalize_social_influence(followers: i64) -> NormalizedScore {
        let original = followers as f64;
        let normalized = Self::log_normalize(original, 10.0, 10000.0);
        
        NormalizedScore {
            value: normalized,
            original_value: original,
            weight: 0.50,
        }
    }

    fn normalize_social_engagement(posts: i64) -> NormalizedScore {
        let original = posts as f64;
        let normalized = Self::log_normalize(original, 10.0, 5000.0);
        
        NormalizedScore {
            value: normalized,
            original_value: original,
            weight: 0.30,
        }
    }

    fn normalize_social_credibility(verified: i64, total: i64) -> NormalizedScore {
        let original = if total > 0 {
            (verified as f64 / total as f64) * 100.0
        } else {
            0.0
        };
        
        NormalizedScore {
            value: original.min(100.0),
            original_value: original,
            weight: 0.20,
        }
    }

    /// 标准化身份数据
    pub fn normalize_identity_data(data: &IdentityRawData) -> IdentityDimension {
        // 验证级别评分
        let verification_score = Self::normalize_verification_level(data.worldid_verified);
        
        // 凭证数量评分
        let credential_score = Self::normalize_credential_count(data.credential_count);
        
        // DID存在性评分
        let did_score = Self::normalize_did_presence(data.did_count);
        
        let total = (verification_score.value + credential_score.value + did_score.value) / 3.0;
        
        IdentityDimension {
            verification_level: verification_score,
            credential_count: credential_score,
            did_presence: did_score,
            total_score: total,
        }
    }

    fn normalize_verification_level(worldid: bool) -> NormalizedScore {
        let value = if worldid { 100.0 } else { 0.0 };
        
        NormalizedScore {
            value,
            original_value: if worldid { 1.0 } else { 0.0 },
            weight: 0.50,
        }
    }

    fn normalize_credential_count(count: i64) -> NormalizedScore {
        let original = count as f64;
        let normalized = Self::linear_normalize(original, 0.0, 10.0); // 10个凭证满分
        
        NormalizedScore {
            value: normalized,
            original_value: original,
            weight: 0.30,
        }
    }

    fn normalize_did_presence(count: i64) -> NormalizedScore {
        let original = count as f64;
        let normalized = Self::linear_normalize(original, 0.0, 3.0); // 3个DID满分
        
        NormalizedScore {
            value: normalized,
            original_value: original,
            weight: 0.20,
        }
    }

    // ========== 归一化辅助函数 ==========
    
    /// 线性归一化（0-100）
    fn linear_normalize(value: f64, min: f64, max: f64) -> f64 {
        if value <= min {
            return 0.0;
        }
        if value >= max {
            return 100.0;
        }
        ((value - min) / (max - min)) * 100.0
    }

    /// 对数归一化（0-100）- 适用于指数增长的数据
    fn log_normalize(value: f64, min: f64, max: f64) -> f64 {
        if value <= min {
            return 0.0;
        }
        if value >= max {
            return 100.0;
        }
        
        let log_value = (value.max(1.0)).ln();
        let log_min = min.ln();
        let log_max = max.ln();
        
        ((log_value - log_min) / (log_max - log_min)) * 100.0
    }

    // ========== 空维度默认值 ==========
    
    fn empty_financial_dimension() -> FinancialDimension {
        FinancialDimension {
            asset_value: NormalizedScore { value: 0.0, original_value: 0.0, weight: 0.40 },
            transaction_history: NormalizedScore { value: 0.0, original_value: 0.0, weight: 0.35 },
            account_longevity: NormalizedScore { value: 0.0, original_value: 0.0, weight: 0.25 },
            total_score: 0.0,
        }
    }

    fn empty_social_dimension() -> SocialDimension {
        SocialDimension {
            influence_score: NormalizedScore { value: 0.0, original_value: 0.0, weight: 0.50 },
            engagement_rate: NormalizedScore { value: 0.0, original_value: 0.0, weight: 0.30 },
            account_credibility: NormalizedScore { value: 0.0, original_value: 0.0, weight: 0.20 },
            total_score: 0.0,
        }
    }

    // ========== 标签生成 ==========
    
    /// 根据数据生成用户标签
    pub fn generate_labels(
        github: Option<&GitHubRawData>,
        wallets: &[WalletRawData],
        social: &[SocialRawData],
        identity: &IdentityRawData,
    ) -> Vec<UserLabel> {
        let mut labels = Vec::new();

        // 代码贡献者
        if let Some(gh) = github {
            if gh.public_repos >= 10 || gh.contributions_last_year >= 100 {
                labels.push(UserLabel::CodeContributor);
            }
        }

        // 活跃交易者
        if wallets.iter().any(|w| w.transaction_count >= 100) {
            labels.push(UserLabel::ActiveTrader);
        }

        // 高净值
        let total_balance: f64 = wallets.iter().map(|w| w.balance).sum();
        if total_balance >= 10.0 {
            labels.push(UserLabel::HighNetWorth);
        }

        // 社交影响力
        let total_followers: i64 = social.iter().map(|s| s.followers).sum();
        if total_followers >= 1000 {
            labels.push(UserLabel::SocialInfluencer);
        }

        // 已验证身份
        if identity.worldid_verified || identity.credential_count > 0 {
            labels.push(UserLabel::VerifiedIdentity);
        }

        // 长期用户
        if wallets.iter().any(|w| w.first_transaction_days_ago >= 365) {
            labels.push(UserLabel::LongTermUser);
        }

        // 早期采用者
        if let Some(gh) = github {
            if gh.account_age_days >= 365 * 5 {
                labels.push(UserLabel::EarlyAdopter);
            }
        }

        println!("🏷️  Generated {} labels", labels.len());

        labels
    }
}

