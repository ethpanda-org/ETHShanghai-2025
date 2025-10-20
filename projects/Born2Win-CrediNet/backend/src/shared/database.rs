use sqlx::{SqlitePool, Row};
use crate::shared::errors::AppError;

pub async fn init_database(pool: &SqlitePool) -> Result<(), AppError> {
    // 用户表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            contact TEXT UNIQUE NOT NULL,
            email TEXT,
            phone TEXT,
            is_email_verified INTEGER NOT NULL DEFAULT 0,
            is_phone_verified INTEGER NOT NULL DEFAULT 0,
            role TEXT NOT NULL DEFAULT 'user',
            status TEXT NOT NULL DEFAULT 'active',
            last_login_at TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT
        );
        "#,
    )
    .execute(pool)
    .await?;

    // DID表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS dids (
            did TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            method TEXT NOT NULL DEFAULT 'credinet',
            current_version INTEGER NOT NULL DEFAULT 1,
            on_chain_registered INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id)
        );
        "#,
    )
    .execute(pool)
    .await?;

    // DID Document版本表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS did_documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            did TEXT NOT NULL,
            version INTEGER NOT NULL,
            document TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (did) REFERENCES dids (did),
            UNIQUE(did, version)
        );
        "#,
    )
    .execute(pool)
    .await?;

    // 区块链注册记录表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS blockchain_registrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            did TEXT NOT NULL,
            tx_hash TEXT,
            block_number INTEGER,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (did) REFERENCES dids (did)
        );
        "#,
    )
    .execute(pool)
    .await?;

    // World ID 验证表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS worldid_verifications (
            user_id TEXT PRIMARY KEY,
            nullifier_hash TEXT NOT NULL UNIQUE,
            verification_level TEXT NOT NULL,
            verified_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id)
        );
        "#,
    )
    .execute(pool)
    .await?;

    // 可验证凭证表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS verifiable_credentials (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            credential_id TEXT NOT NULL,
            issuer TEXT NOT NULL,
            vc_type TEXT NOT NULL,
            credential_data TEXT NOT NULL,
            verified_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id),
            UNIQUE(user_id, credential_id)
        );
        "#,
    )
    .execute(pool)
    .await?;

    // OAuth 绑定表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS oauth_bindings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            provider TEXT NOT NULL,
            external_id TEXT NOT NULL,
            username TEXT,
            access_token TEXT NOT NULL,
            refresh_token TEXT,
            profile_data TEXT,
            bound_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id),
            UNIQUE(user_id, provider)
        );
        "#,
    )
    .execute(pool)
    .await?;

    // 钱包地址表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS wallet_addresses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            address TEXT NOT NULL UNIQUE,
            chain_type TEXT NOT NULL,
            is_primary INTEGER NOT NULL DEFAULT 0,
            verified INTEGER NOT NULL DEFAULT 0,
            connected_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id)
        );
        "#,
    )
    .execute(pool)
    .await?;

    // 用户授权偏好表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS user_authorizations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            data_source TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'revoked',
            purpose TEXT,
            granted_at TEXT,
            revoked_at TEXT,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id),
            UNIQUE(user_id, data_source)
        );
        "#,
    )
    .execute(pool)
    .await?;

    // 授权变更日志表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS authorization_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            data_source TEXT NOT NULL,
            action TEXT NOT NULL,
            previous_status TEXT,
            new_status TEXT NOT NULL,
            reason TEXT,
            ip_address TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id)
        );
        "#,
    )
    .execute(pool)
    .await?;

    // 信用画像表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS credit_profiles (
            user_id TEXT PRIMARY KEY,
            score INTEGER NOT NULL DEFAULT 0,
            level TEXT,
            score_details TEXT,
            version TEXT,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id)
        );
        "#,
    )
    .execute(pool)
    .await?;

    // SBT 发放记录表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS sbt_issuance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            sbt_type TEXT NOT NULL,
            token_id TEXT,
            tx_hash TEXT,
            status TEXT NOT NULL DEFAULT 'PENDING',
            issued_at TEXT NOT NULL,
            confirmed_at TEXT,
            UNIQUE(user_id, sbt_type),
            FOREIGN KEY (user_id) REFERENCES users (id)
        );
        "#,
    )
    .execute(pool)
    .await?;

    // 审计日志表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            action TEXT NOT NULL,
            details TEXT,
            created_at TEXT NOT NULL
        );
        "#,
    )
    .execute(pool)
    .await?;

    // Refresh Token表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS refresh_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            token TEXT NOT NULL UNIQUE,
            expires_at TEXT NOT NULL,
            revoked INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id)
        );
        "#,
    )
    .execute(pool)
    .await?;

    // 为refresh_tokens创建索引以提高查询性能
    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
        CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
        CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
        "#,
    )
    .execute(pool)
    .await?;

    // 为其他常用查询创建索引
    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_users_contact ON users(contact);
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
        CREATE INDEX IF NOT EXISTS idx_dids_user_id ON dids(user_id);
        CREATE INDEX IF NOT EXISTS idx_did_documents_did ON did_documents(did);
        CREATE INDEX IF NOT EXISTS idx_oauth_bindings_user_id ON oauth_bindings(user_id);
        CREATE INDEX IF NOT EXISTS idx_wallet_addresses_user_id ON wallet_addresses(user_id);
        CREATE INDEX IF NOT EXISTS idx_wallet_addresses_is_primary ON wallet_addresses(user_id, is_primary);
        CREATE INDEX IF NOT EXISTS idx_user_authorizations_user_id ON user_authorizations(user_id);
        CREATE INDEX IF NOT EXISTS idx_credit_profiles_score ON credit_profiles(score DESC);
        CREATE INDEX IF NOT EXISTS idx_sbt_issuance_user_id ON sbt_issuance(user_id);
        CREATE INDEX IF NOT EXISTS idx_sbt_issuance_status ON sbt_issuance(status);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
        "#,
    )
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn find_or_create_user(pool: &SqlitePool, contact: &str) -> Result<String, AppError> {
    if let Some(row) = sqlx::query("SELECT id FROM users WHERE contact = ?")
        .bind(contact)
        .fetch_optional(pool)
        .await? 
    {
        // 更新最后登录时间
        let now = chrono::Utc::now().to_rfc3339();
        let user_id: String = row.try_get("id")?;
        sqlx::query("UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?")
            .bind(&now)
            .bind(&now)
            .bind(&user_id)
            .execute(pool)
            .await?;
        
        return Ok(user_id);
    }

    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    
    // 判断contact是邮箱还是手机号
    let (email, phone, is_email_verified, is_phone_verified) = if contact.contains('@') {
        (Some(contact), None, 1, 0)
    } else {
        (None, Some(contact), 0, 1)
    };
    
    sqlx::query(
        "INSERT INTO users (id, contact, email, phone, is_email_verified, is_phone_verified, role, status, last_login_at, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&id)
    .bind(contact)
    .bind(email)
    .bind(phone)
    .bind(is_email_verified)
    .bind(is_phone_verified)
    .bind("user")
    .bind("active")
    .bind(&now)
    .bind(&now)
    .bind(&now)
    .execute(pool)
    .await?;

    Ok(id)
}
