use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct BindSocialRequest {
    pub provider: String,
    pub code: String,
    pub redirect_uri: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct UserProfileResponse {
    pub user_id: String,
    pub contact: String,
    pub worldid_verified: bool,
    pub bindings: Vec<serde_json::Value>,
}

#[derive(Serialize, Deserialize)]
pub struct CreditScoreResponse {
    pub score: i64,
    pub level: Option<String>,
    pub version: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct IssueSbtRequest {
    pub sbt_type: String,
}

#[derive(Serialize, Deserialize)]
pub struct IssueSbtResponse {
    pub status: String,
    pub tx_hash: Option<String>,
}

