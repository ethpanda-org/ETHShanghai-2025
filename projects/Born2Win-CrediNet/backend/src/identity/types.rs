use serde::{Deserialize, Serialize};

// ========== World ID 相关类型 ==========
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct WorldIdProof {
    pub merkle_root: String,
    pub nullifier_hash: String,
    pub proof: String,
    pub verification_level: String,
}

#[derive(Serialize, Deserialize)]
pub struct WorldIdVerifyRequest {
    pub user_id: String,
    pub proof: WorldIdProof,
    pub action: String,
    pub signal: String,
}

#[derive(Serialize, Deserialize)]
pub struct WorldIdVerifyResponse {
    pub success: bool,
    pub verified: bool,
    pub message: String,
}

// ========== 可验证凭证（VC）相关类型 ==========
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct VerifiableCredential {
    #[serde(rename = "@context")]
    pub context: Vec<String>,
    pub id: String,
    #[serde(rename = "type")]
    pub vc_type: Vec<String>,
    pub issuer: String,
    pub issuance_date: String,
    pub expiration_date: Option<String>,
    pub credential_subject: serde_json::Value,
    pub proof: VcProof,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct VcProof {
    #[serde(rename = "type")]
    pub proof_type: String,
    pub created: String,
    pub verification_method: String,
    pub proof_purpose: String,
    pub jws: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct VcVerifyRequest {
    pub user_id: String,
    pub credential: String, // JWT or JSON-LD format
}

#[derive(Serialize, Deserialize)]
pub struct VcVerifyResponse {
    pub success: bool,
    pub verified: bool,
    pub credential_data: Option<serde_json::Value>,
    pub message: String,
}

// ========== OAuth 相关类型 ==========
#[derive(Serialize, Deserialize, Clone, Debug)]
pub enum OAuthProvider {
    Twitter,
    GitHub,
    Facebook,
    WeChat,
}

impl OAuthProvider {
    #[allow(dead_code)]
    pub fn as_str(&self) -> &str {
        match self {
            OAuthProvider::Twitter => "twitter",
            OAuthProvider::GitHub => "github",
            OAuthProvider::Facebook => "facebook",
            OAuthProvider::WeChat => "wechat",
        }
    }
}

#[derive(Serialize, Deserialize)]
pub struct OAuthBindRequest {
    pub user_id: String,
    pub provider: String,
    pub code: String,
    pub redirect_uri: String,
}

#[derive(Serialize, Deserialize)]
pub struct OAuthBindResponse {
    pub success: bool,
    pub provider: String,
    pub external_id: String,
    pub message: String,
}

#[derive(Serialize, Deserialize)]
pub struct OAuthUnbindRequest {
    pub user_id: String,
    pub provider: String,
}

#[derive(Serialize, Deserialize)]
pub struct OAuthUserInfo {
    pub id: String,
    pub username: Option<String>,
    pub email: Option<String>,
    pub avatar_url: Option<String>,
    pub profile_data: serde_json::Value,
}

// ========== 钱包地址相关类型 ==========
#[derive(Serialize, Deserialize, Clone, Debug)]
pub enum ChainType {
    Ethereum,
    Polygon,
    BSC,
    Solana,
    Bitcoin,
}

impl ChainType {
    #[allow(dead_code)]
    pub fn as_str(&self) -> &str {
        match self {
            ChainType::Ethereum => "ethereum",
            ChainType::Polygon => "polygon",
            ChainType::BSC => "bsc",
            ChainType::Solana => "solana",
            ChainType::Bitcoin => "bitcoin",
        }
    }
}

#[derive(Serialize, Deserialize)]
pub struct WalletConnectRequest {
    pub user_id: String,
    pub address: String,
    pub chain_type: String,
    pub signature: Option<String>,
    pub message: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct WalletConnectResponse {
    pub success: bool,
    pub address: String,
    pub verified: bool,
    pub message: String,
}

#[derive(Serialize, Deserialize)]
pub struct SetPrimaryWalletRequest {
    pub user_id: String,
    pub address: String,
}

#[derive(Serialize, Deserialize)]
pub struct WalletListResponse {
    pub wallets: Vec<WalletInfo>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct WalletInfo {
    pub address: String,
    pub chain_type: String,
    pub is_primary: bool,
    pub verified: bool,
    pub connected_at: String,
}

// ========== 用户身份绑定信息 ==========
#[derive(Serialize, Deserialize)]
pub struct UserIdentityInfo {
    pub user_id: String,
    pub worldid_verified: bool,
    pub worldid_nullifier: Option<String>,
    pub verified_credentials: Vec<VcSummary>,
    pub oauth_bindings: Vec<OAuthBinding>,
    pub wallets: Vec<WalletInfo>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct VcSummary {
    pub id: String,
    pub issuer: String,
    pub vc_type: Vec<String>,
    pub verified_at: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct OAuthBinding {
    pub provider: String,
    pub external_id: String,
    pub username: Option<String>,
    pub bound_at: String,
}
