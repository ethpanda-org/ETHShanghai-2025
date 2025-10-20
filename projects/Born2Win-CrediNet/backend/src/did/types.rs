use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DidDocument {
    #[serde(rename = "@context")]
    pub context: Vec<String>,
    pub id: String,
    pub version: i32,
    pub created: String,
    pub updated: String,
    pub verification_method: Vec<VerificationMethod>,
    pub authentication: Vec<String>,
    pub service: Vec<Service>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct VerificationMethod {
    pub id: String,
    #[serde(rename = "type")]
    pub vm_type: String,
    pub controller: String,
    pub public_key_multibase: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Service {
    pub id: String,
    #[serde(rename = "type")]
    pub service_type: String,
    pub service_endpoint: String,
}

#[derive(Serialize, Deserialize)]
pub struct CreateDidRequest {
    pub user_id: String,
    pub public_key: String,
    pub services: Option<Vec<Service>>,
}

#[derive(Serialize, Deserialize)]
pub struct UpdateDidRequest {
    pub public_key: Option<String>,
    pub services: Option<Vec<Service>>,
}

#[derive(Serialize, Deserialize)]
pub struct DidResponse {
    pub did: String,
    pub document: DidDocument,
}

#[derive(Serialize, Deserialize)]
pub struct DidVersionResponse {
    pub did: String,
    pub version: i32,
    pub document: DidDocument,
    pub created_at: String,
}
