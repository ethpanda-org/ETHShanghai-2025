use serde::{Deserialize, Serialize};

// ========== SBT 类型定义 ==========

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum SbtType {
    CreditScoreGold,     // 金牌信用徽章 (>800)
    CreditScoreSilver,   // 银牌信用徽章 (>600)
    CreditScoreBronze,   // 铜牌信用徽章 (>400)
    DeveloperBadge,      // 开发者证明
    ActiveTraderBadge,   // 活跃交易者
    SocialInfluencer,    // 社交影响力
    VerifiedHuman,       // 真人验证（World ID）
    EarlyAdopter,        // 早期采用者
}

impl SbtType {
    pub fn as_str(&self) -> &str {
        match self {
            SbtType::CreditScoreGold => "credit_score_gold",
            SbtType::CreditScoreSilver => "credit_score_silver",
            SbtType::CreditScoreBronze => "credit_score_bronze",
            SbtType::DeveloperBadge => "developer_badge",
            SbtType::ActiveTraderBadge => "active_trader_badge",
            SbtType::SocialInfluencer => "social_influencer",
            SbtType::VerifiedHuman => "verified_human",
            SbtType::EarlyAdopter => "early_adopter",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "credit_score_gold" => Some(SbtType::CreditScoreGold),
            "credit_score_silver" => Some(SbtType::CreditScoreSilver),
            "credit_score_bronze" => Some(SbtType::CreditScoreBronze),
            "developer_badge" => Some(SbtType::DeveloperBadge),
            "active_trader_badge" => Some(SbtType::ActiveTraderBadge),
            "social_influencer" => Some(SbtType::SocialInfluencer),
            "verified_human" => Some(SbtType::VerifiedHuman),
            "early_adopter" => Some(SbtType::EarlyAdopter),
            _ => None,
        }
    }

    pub fn token_id(&self) -> u64 {
        match self {
            SbtType::CreditScoreGold => 1,
            SbtType::CreditScoreSilver => 2,
            SbtType::CreditScoreBronze => 3,
            SbtType::DeveloperBadge => 10,
            SbtType::ActiveTraderBadge => 11,
            SbtType::SocialInfluencer => 12,
            SbtType::VerifiedHuman => 20,
            SbtType::EarlyAdopter => 21,
        }
    }

    pub fn description(&self) -> &str {
        match self {
            SbtType::CreditScoreGold => "信用评分金牌徽章 - 评分800以上",
            SbtType::CreditScoreSilver => "信用评分银牌徽章 - 评分600以上",
            SbtType::CreditScoreBronze => "信用评分铜牌徽章 - 评分400以上",
            SbtType::DeveloperBadge => "开发者证明 - 活跃的代码贡献者",
            SbtType::ActiveTraderBadge => "活跃交易者 - 链上交易活跃",
            SbtType::SocialInfluencer => "社交影响力 - 拥有大量粉丝",
            SbtType::VerifiedHuman => "真人验证 - 通过World ID验证",
            SbtType::EarlyAdopter => "早期采用者 - CrediNet先驱用户",
        }
    }
}

// ========== SBT 发放状态 ==========

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum SbtStatus {
    Pending,      // 待发放
    Processing,   // 处理中（链上交易已提交）
    Confirmed,    // 已确认
    Failed,       // 失败
}

impl SbtStatus {
    #[allow(dead_code)]
    pub fn as_str(&self) -> &str {
        match self {
            SbtStatus::Pending => "PENDING",
            SbtStatus::Processing => "PROCESSING",
            SbtStatus::Confirmed => "CONFIRMED",
            SbtStatus::Failed => "FAILED",
        }
    }

    #[allow(dead_code)]
    pub fn from_str(s: &str) -> Self {
        match s {
            "PROCESSING" => SbtStatus::Processing,
            "CONFIRMED" => SbtStatus::Confirmed,
            "FAILED" => SbtStatus::Failed,
            _ => SbtStatus::Pending,
        }
    }
}

// ========== API 请求/响应类型 ==========

#[derive(Deserialize)]
#[allow(dead_code)]
pub struct IssueSbtRequest {
    pub user_id: String,
    pub sbt_types: Option<Vec<String>>, // 可选：指定SBT类型，否则自动判断
}

#[derive(Serialize)]
pub struct IssueSbtResponse {
    pub success: bool,
    pub issued_sbts: Vec<SbtIssuanceInfo>,
    pub message: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SbtIssuanceInfo {
    pub sbt_type: String,
    pub token_id: Option<u64>,
    pub tx_hash: Option<String>,
    pub status: String,
    pub recipient_address: String,
    pub issued_at: String,
    pub confirmed_at: Option<String>,
}

#[derive(Serialize)]
pub struct GetUserSbtsResponse {
    pub user_id: String,
    pub sbts: Vec<SbtIssuanceInfo>,
    pub count: usize,
}

#[derive(Serialize)]
pub struct SbtStatusResponse {
    pub sbt_type: String,
    pub status: String,
    pub tx_hash: Option<String>,
    pub block_number: Option<i64>,
    pub confirmed_at: Option<String>,
    pub error: Option<String>,
}

#[derive(Serialize)]
pub struct SbtTypesResponse {
    pub types: Vec<SbtTypeInfo>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct SbtTypeInfo {
    pub sbt_type: String,
    pub token_id: u64,
    pub description: String,
    pub eligibility: String,
}

// ========== 合约配置 ==========

#[derive(Clone, Debug)]
#[allow(dead_code)]
pub struct ContractConfig {
    pub contract_address: String,
    pub chain_id: u64,
    pub rpc_url: String,
    pub private_key: Option<String>,
}

impl ContractConfig {
    pub fn from_env() -> Self {
        Self {
            contract_address: std::env::var("SBT_CONTRACT_ADDRESS")
                .unwrap_or_else(|_| "0x0000000000000000000000000000000000000000".to_string()),
            chain_id: std::env::var("CHAIN_ID")
                .unwrap_or_else(|_| "1".to_string())
                .parse()
                .unwrap_or(1),
            rpc_url: std::env::var("RPC_URL")
                .unwrap_or_else(|_| "https://eth-mainnet.g.alchemy.com/v2/demo".to_string()),
            private_key: std::env::var("SIGNER_PRIVATE_KEY").ok(),
        }
    }
}

