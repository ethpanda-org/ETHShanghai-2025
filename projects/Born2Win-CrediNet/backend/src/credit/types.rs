use serde::{Deserialize, Serialize};

// ========== 原始数据类型 ==========

/// GitHub 原始数据
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct GitHubRawData {
    pub followers: i64,
    pub following: i64,
    pub public_repos: i64,
    pub public_gists: i64,
    pub total_stars: i64,
    pub contributions_last_year: i64,
    pub account_age_days: i64,
}

/// 钱包原始数据
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct WalletRawData {
    pub address: String,
    pub chain: String,
    pub balance: f64,
    pub transaction_count: i64,
    pub token_count: i64,
    pub first_transaction_days_ago: i64,
    pub nft_count: i64,
}

/// 社交平台原始数据
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SocialRawData {
    pub platform: String,
    pub followers: i64,
    pub posts_count: i64,
    pub verified: bool,
    pub account_age_days: i64,
}

/// 身份验证数据
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct IdentityRawData {
    pub worldid_verified: bool,
    pub credential_count: i64,
    pub did_count: i64,
}

// ========== 标准化数据类型 ==========

/// 标准化分数（0-100）
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct NormalizedScore {
    pub value: f64,          // 0-100
    pub original_value: f64, // 原始值
    pub weight: f64,         // 权重
}

/// 数据标签
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum UserLabel {
    CodeContributor,      // 代码贡献者
    ActiveTrader,         // 活跃交易者
    SocialInfluencer,     // 社交影响力
    VerifiedIdentity,     // 已验证身份
    LongTermUser,         // 长期用户
    HighNetWorth,         // 高净值
    EarlyAdopter,         // 早期采用者
}

impl UserLabel {
    pub fn as_str(&self) -> &str {
        match self {
            UserLabel::CodeContributor => "code_contributor",
            UserLabel::ActiveTrader => "active_trader",
            UserLabel::SocialInfluencer => "social_influencer",
            UserLabel::VerifiedIdentity => "verified_identity",
            UserLabel::LongTermUser => "long_term_user",
            UserLabel::HighNetWorth => "high_net_worth",
            UserLabel::EarlyAdopter => "early_adopter",
        }
    }
}

// ========== 评分维度 ==========

/// 技术贡献维度
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TechnicalDimension {
    pub github_activity: NormalizedScore,
    pub code_quality: NormalizedScore,
    pub community_impact: NormalizedScore,
    pub total_score: f64,
}

/// 财务信用维度
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FinancialDimension {
    pub asset_value: NormalizedScore,
    pub transaction_history: NormalizedScore,
    pub account_longevity: NormalizedScore,
    pub total_score: f64,
}

/// 社交信誉维度
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SocialDimension {
    pub influence_score: NormalizedScore,
    pub engagement_rate: NormalizedScore,
    pub account_credibility: NormalizedScore,
    pub total_score: f64,
}

/// 身份可信度维度
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct IdentityDimension {
    pub verification_level: NormalizedScore,
    pub credential_count: NormalizedScore,
    pub did_presence: NormalizedScore,
    pub total_score: f64,
}

// ========== 信用评分结果 ==========

/// 评分等级
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum CreditLevel {
    S,  // 900-1000 优秀
    A,  // 800-899  良好
    B,  // 700-799  中等
    C,  // 600-699  一般
    D,  // 500-599  较差
    E,  // 0-499    很差
}

impl CreditLevel {
    pub fn from_score(score: i32) -> Self {
        match score {
            900..=1000 => CreditLevel::S,
            800..=899 => CreditLevel::A,
            700..=799 => CreditLevel::B,
            600..=699 => CreditLevel::C,
            500..=599 => CreditLevel::D,
            _ => CreditLevel::E,
        }
    }

    pub fn as_str(&self) -> &str {
        match self {
            CreditLevel::S => "S",
            CreditLevel::A => "A",
            CreditLevel::B => "B",
            CreditLevel::C => "C",
            CreditLevel::D => "D",
            CreditLevel::E => "E",
        }
    }
}

/// 信用评分详细结果
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CreditScore {
    pub user_id: String,
    pub total_score: i32,          // 0-1000
    pub level: String,              // S/A/B/C/D/E
    pub breakdown: ScoreBreakdown,
    pub labels: Vec<String>,
    pub version: String,
    pub generated_at: String,
}

/// 评分细分
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ScoreBreakdown {
    pub technical: i32,
    pub financial: i32,
    pub social: i32,
    pub identity: i32,
}

/// 用户信用画像
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CreditProfile {
    pub user_id: String,
    pub score: i32,
    pub level: String,
    pub technical_dimension: Option<TechnicalDimension>,
    pub financial_dimension: Option<FinancialDimension>,
    pub social_dimension: Option<SocialDimension>,
    pub identity_dimension: Option<IdentityDimension>,
    pub labels: Vec<String>,
    pub score_details: String,  // JSON格式的详细数据
    pub version: String,
    pub updated_at: String,
}

// ========== API 请求/响应类型 ==========

#[derive(Deserialize)]
#[allow(dead_code)]
pub struct CalculateScoreRequest {
    pub user_id: String,
    pub force_refresh: Option<bool>,
}

#[derive(Serialize)]
pub struct CalculateScoreResponse {
    pub success: bool,
    pub score: CreditScore,
    pub message: String,
}

#[derive(Serialize)]
pub struct GetScoreResponse {
    pub user_id: String,
    pub score: Option<CreditScore>,
}

#[derive(Serialize)]
pub struct DataSourceStatus {
    pub data_source: String,
    pub available: bool,
    pub last_fetched: Option<String>,
    pub error: Option<String>,
}

#[derive(Serialize)]
pub struct DataSourcesStatusResponse {
    pub user_id: String,
    pub sources: Vec<DataSourceStatus>,
}

// ========== 配置类型 ==========

/// 评分权重配置
#[derive(Clone, Debug)]
pub struct ScoringWeights {
    pub technical: f64,
    pub financial: f64,
    pub social: f64,
    pub identity: f64,
}

impl Default for ScoringWeights {
    fn default() -> Self {
        Self {
            technical: 0.30,
            financial: 0.35,
            social: 0.20,
            identity: 0.15,
        }
    }
}

/// 数据抓取配置
#[derive(Clone, Debug)]
#[allow(dead_code)]
pub struct FetchConfig {
    pub cache_duration_seconds: i64,
    pub retry_count: u32,
    pub timeout_seconds: u64,
}

impl Default for FetchConfig {
    fn default() -> Self {
        Self {
            cache_duration_seconds: 3600, // 1小时
            retry_count: 3,
            timeout_seconds: 30,
        }
    }
}

