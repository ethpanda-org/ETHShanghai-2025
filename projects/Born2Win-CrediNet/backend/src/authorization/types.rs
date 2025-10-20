use serde::{Deserialize, Serialize};

// ========== 数据源类型 ==========
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum DataSourceType {
    WorldId,
    VerifiableCredential,
    GitHub,
    Twitter,
    Facebook,
    WeChat,
    EthereumWallet,
    PolygonWallet,
    SolanaWallet,
    BitcoinWallet,
    Did,
}

impl DataSourceType {
    #[allow(dead_code)]
    pub fn as_str(&self) -> &str {
        match self {
            DataSourceType::WorldId => "worldid",
            DataSourceType::VerifiableCredential => "verifiable_credential",
            DataSourceType::GitHub => "github",
            DataSourceType::Twitter => "twitter",
            DataSourceType::Facebook => "facebook",
            DataSourceType::WeChat => "wechat",
            DataSourceType::EthereumWallet => "ethereum_wallet",
            DataSourceType::PolygonWallet => "polygon_wallet",
            DataSourceType::SolanaWallet => "solana_wallet",
            DataSourceType::BitcoinWallet => "bitcoin_wallet",
            DataSourceType::Did => "did",
        }
    }
    
    #[allow(dead_code)]
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "worldid" => Some(DataSourceType::WorldId),
            "verifiable_credential" => Some(DataSourceType::VerifiableCredential),
            "github" => Some(DataSourceType::GitHub),
            "twitter" => Some(DataSourceType::Twitter),
            "facebook" => Some(DataSourceType::Facebook),
            "wechat" => Some(DataSourceType::WeChat),
            "ethereum_wallet" => Some(DataSourceType::EthereumWallet),
            "polygon_wallet" => Some(DataSourceType::PolygonWallet),
            "solana_wallet" => Some(DataSourceType::SolanaWallet),
            "bitcoin_wallet" => Some(DataSourceType::BitcoinWallet),
            "did" => Some(DataSourceType::Did),
            _ => None,
        }
    }
}

// ========== 授权状态 ==========
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum AuthorizationStatus {
    Authorized,
    Revoked,
}

impl AuthorizationStatus {
    #[allow(dead_code)]
    pub fn as_str(&self) -> &str {
        match self {
            AuthorizationStatus::Authorized => "authorized",
            AuthorizationStatus::Revoked => "revoked",
        }
    }
}

// ========== 授权动作类型 ==========
#[derive(Serialize, Deserialize, Clone, Debug)]
pub enum AuthorizationAction {
    Grant,      // 授权
    Revoke,     // 撤销
    Update,     // 更新
}

impl AuthorizationAction {
    pub fn as_str(&self) -> &str {
        match self {
            AuthorizationAction::Grant => "grant",
            AuthorizationAction::Revoke => "revoke",
            AuthorizationAction::Update => "update",
        }
    }
}

// ========== API请求/响应类型 ==========
#[derive(Serialize, Deserialize)]
pub struct SetAuthorizationRequest {
    pub user_id: String,
    pub data_source: String,
    pub authorized: bool,
    pub purpose: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct SetAuthorizationResponse {
    pub success: bool,
    pub data_source: String,
    pub status: String,
    pub message: String,
}

#[derive(Serialize, Deserialize)]
pub struct BatchAuthorizationRequest {
    pub user_id: String,
    pub authorizations: Vec<DataSourceAuthorization>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct DataSourceAuthorization {
    pub data_source: String,
    pub authorized: bool,
}

#[derive(Serialize, Deserialize)]
pub struct AuthorizationInfo {
    pub data_source: String,
    pub status: String,
    pub purpose: Option<String>,
    pub granted_at: Option<String>,
    pub revoked_at: Option<String>,
    pub updated_at: String,
}

#[derive(Serialize, Deserialize)]
pub struct UserAuthorizationsResponse {
    pub user_id: String,
    pub authorizations: Vec<AuthorizationInfo>,
}

#[derive(Serialize, Deserialize)]
pub struct AuthorizationLog {
    pub id: i64,
    pub user_id: String,
    pub data_source: String,
    pub action: String,
    pub previous_status: Option<String>,
    pub new_status: String,
    pub reason: Option<String>,
    pub ip_address: Option<String>,
    pub created_at: String,
}

#[derive(Serialize, Deserialize)]
pub struct AuthorizationLogsResponse {
    pub user_id: String,
    pub logs: Vec<AuthorizationLog>,
}

#[derive(Serialize, Deserialize)]
pub struct AuthorizedDataSourcesResponse {
    pub user_id: String,
    pub data_sources: Vec<String>,
    pub count: usize,
}

#[derive(Serialize, Deserialize)]
pub struct DataSourceScopeInfo {
    pub data_source: String,
    pub scope: Vec<String>,
    pub description: String,
}

#[derive(Serialize, Deserialize)]
pub struct DataSourceScopesResponse {
    pub scopes: Vec<DataSourceScopeInfo>,
}
