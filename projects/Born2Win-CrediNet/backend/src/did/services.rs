use sha2::{Sha256, Digest};
use chrono::Utc;
use sqlx::{SqlitePool, Row};
use rand::Rng;
use crate::shared::errors::AppError;
use super::types::*;

pub struct DidService {
    db: SqlitePool,
}

impl DidService {
    pub fn new(db: SqlitePool) -> Self {
        Self { db }
    }

    pub fn generate_did(user_id: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(user_id.as_bytes());
        hasher.update(Utc::now().timestamp().to_string().as_bytes());
        let hash = hasher.finalize();
        let hash_hex = hex::encode(&hash[..16]);
        
        format!("did:credinet:{}", hash_hex)
    }

    pub fn generate_did_document(
        did: &str,
        _user_id: &str,
        public_key: &str,
        services: Option<Vec<Service>>,
        version: i32,
    ) -> DidDocument {
        let now = Utc::now().to_rfc3339();
        let verification_method_id = format!("{}#key-1", did);
        
        DidDocument {
            context: vec![
                "https://www.w3.org/ns/did/v1".to_string(),
                "https://w3id.org/security/suites/ed25519-2020/v1".to_string(),
            ],
            id: did.to_string(),
            version,
            created: now.clone(),
            updated: now,
            verification_method: vec![VerificationMethod {
                id: verification_method_id.clone(),
                vm_type: "Ed25519VerificationKey2020".to_string(),
                controller: did.to_string(),
                public_key_multibase: public_key.to_string(),
            }],
            authentication: vec![verification_method_id],
            service: services.unwrap_or_default(),
        }
    }

    pub async fn create_did_for_user(
        &self,
        user_id: &str,
        public_key: &str,
        services: Option<Vec<Service>>,
    ) -> Result<String, AppError> {
        let did = Self::generate_did(user_id);
        let now = Utc::now().to_rfc3339();
        
        // 检查DID是否已存在
        if sqlx::query("SELECT did FROM dids WHERE did = ?")
            .bind(&did)
            .fetch_optional(&self.db)
            .await?
            .is_some()
        {
            return Ok(did);
        }
        
        // 创建DID记录
        sqlx::query("INSERT INTO dids (did, user_id, method, current_version, on_chain_registered, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
            .bind(&did)
            .bind(user_id)
            .bind("credinet")  // DID方法
            .bind(1)
            .bind(0)  // 初始未上链
            .bind(&now)
            .bind(&now)
            .execute(&self.db)
            .await?;
        
        // 创建初始DID Document
        let document = Self::generate_did_document(&did, user_id, public_key, services, 1);
        let document_json = serde_json::to_string(&document)?;
        
        sqlx::query("INSERT INTO did_documents (did, version, document, created_at) VALUES (?, ?, ?, ?)")
            .bind(&did)
            .bind(1)
            .bind(&document_json)
            .bind(&now)
            .execute(&self.db)
            .await?;
        
        Ok(did)
    }

    pub async fn get_did_document(&self, did: &str) -> Result<Option<DidDocument>, AppError> {
        if let Some(row) = sqlx::query("SELECT d.current_version, dd.document FROM dids d JOIN did_documents dd ON d.did = dd.did AND d.current_version = dd.version WHERE d.did = ?")
            .bind(did)
            .fetch_optional(&self.db)
            .await?
        {
            let document_json: String = row.try_get("document")?;
            let document: DidDocument = serde_json::from_str(&document_json)?;
            Ok(Some(document))
        } else {
            Ok(None)
        }
    }

    pub async fn get_did_document_version(
        &self,
        did: &str,
        version: i32,
    ) -> Result<Option<DidDocument>, AppError> {
        if let Some(row) = sqlx::query("SELECT document FROM did_documents WHERE did = ? AND version = ?")
            .bind(did)
            .bind(version)
            .fetch_optional(&self.db)
            .await?
        {
            let document_json: String = row.try_get("document")?;
            let document: DidDocument = serde_json::from_str(&document_json)?;
            Ok(Some(document))
        } else {
            Ok(None)
        }
    }

    pub async fn update_did_document(
        &self,
        did: &str,
        public_key: Option<String>,
        services: Option<Vec<Service>>,
    ) -> Result<(), AppError> {
        // 获取当前版本
        let current_version: i32 = sqlx::query("SELECT current_version FROM dids WHERE did = ?")
            .bind(did)
            .fetch_one(&self.db)
            .await?
            .try_get("current_version")?;
        
        let new_version = current_version + 1;
        let now = Utc::now().to_rfc3339();
        
        // 获取当前文档
        let current_doc = self.get_did_document(did).await?.unwrap();
        
        // 创建新版本文档
        let mut new_doc = current_doc;
        new_doc.version = new_version;
        new_doc.updated = now.clone();
        
        // 更新公钥
        if let Some(pk) = public_key {
            if let Some(vm) = new_doc.verification_method.first_mut() {
                vm.public_key_multibase = pk;
            }
        }
        
        // 更新服务
        if let Some(services) = services {
            new_doc.service = services;
        }
        
        // 保存新版本
        let document_json = serde_json::to_string(&new_doc)?;
        sqlx::query("INSERT INTO did_documents (did, version, document, created_at) VALUES (?, ?, ?, ?)")
            .bind(did)
            .bind(new_version)
            .bind(&document_json)
            .bind(&now)
            .execute(&self.db)
            .await?;
        
        // 更新DID记录
        sqlx::query("UPDATE dids SET current_version = ?, updated_at = ? WHERE did = ?")
            .bind(new_version)
            .bind(&now)
            .bind(did)
            .execute(&self.db)
            .await?;
        
        Ok(())
    }

    pub async fn get_did_versions(&self, did: &str) -> Result<Vec<DidVersionResponse>, AppError> {
        let rows = sqlx::query("SELECT version, document, created_at FROM did_documents WHERE did = ? ORDER BY version DESC")
            .bind(did)
            .fetch_all(&self.db)
            .await?;
        
        let mut versions = Vec::new();
        for row in rows {
            let version: i32 = row.try_get("version")?;
            let document_json: String = row.try_get("document")?;
            let created_at: String = row.try_get("created_at")?;
            let document: DidDocument = serde_json::from_str(&document_json)?;
            
            versions.push(DidVersionResponse {
                did: did.to_string(),
                version,
                document,
                created_at,
            });
        }
        
        Ok(versions)
    }

    pub async fn get_user_dids(&self, user_id: &str) -> Result<Vec<String>, AppError> {
        let rows = sqlx::query("SELECT did FROM dids WHERE user_id = ?")
            .bind(user_id)
            .fetch_all(&self.db)
            .await?;
        
        let dids: Vec<String> = rows.into_iter()
            .map(|row| row.try_get::<String, _>("did").unwrap())
            .collect();
        
        Ok(dids)
    }

    pub async fn register_did_on_chain(&self, did: &str) -> Result<String, AppError> {
        // 模拟区块链交易
        let tx_hash = format!("0x{}", hex::encode(rand::thread_rng().gen::<[u8; 32]>()));
        let block_number = rand::thread_rng().gen_range(1000000..9999999);
        let now = Utc::now().to_rfc3339();
        
        // 记录到区块链注册表
        sqlx::query("INSERT INTO blockchain_registrations (did, tx_hash, block_number, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
            .bind(did)
            .bind(&tx_hash)
            .bind(block_number)
            .bind("confirmed")
            .bind(&now)
            .bind(&now)
            .execute(&self.db)
            .await?;
        
        // 更新DID表的on_chain_registered标志
        sqlx::query("UPDATE dids SET on_chain_registered = 1, updated_at = ? WHERE did = ?")
            .bind(&now)
            .bind(did)
            .execute(&self.db)
            .await?;
        
        Ok(tx_hash)
    }

    pub async fn get_blockchain_status(&self, did: &str) -> Result<Option<serde_json::Value>, AppError> {
        if let Some(row) = sqlx::query("SELECT tx_hash, block_number, status, created_at FROM blockchain_registrations WHERE did = ?")
            .bind(did)
            .fetch_optional(&self.db)
            .await?
        {
            let response = serde_json::json!({
                "did": did,
                "tx_hash": row.try_get::<String, _>("tx_hash").unwrap_or_default(),
                "block_number": row.try_get::<i64, _>("block_number").unwrap_or(0),
                "status": row.try_get::<String, _>("status").unwrap_or_default(),
                "created_at": row.try_get::<String, _>("created_at").unwrap_or_default()
            });
            Ok(Some(response))
        } else {
            Ok(None)
        }
    }
}
