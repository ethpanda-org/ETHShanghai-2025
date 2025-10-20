// 认证相关工具
use tauri::{Wry};
use tauri_plugin_store::Store;
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use serde_json::Value;
use std::sync::Arc;

// Token 存储键名
pub const TOKEN_STORAGE_KEY: &str = "auth_token";
pub const USER_INFO_KEY: &str = "user_info";
pub const SYSTEM_INFO_KEY: &str = "system_info";
pub const STORE_FILE_NAME: &str = "auth.json";

// 认证管理器
#[derive(Clone)]
pub struct AuthManager {
    token_storage: Arc<Store<Wry>>,
}

impl AuthManager {
    pub fn new(token_storage: Arc<Store<Wry>>) -> Self {
        Self {
            token_storage,
        }
    }
    
    // 获取认证头
    pub fn get_auth_header(&self) -> Option<String> {
        if let Some(token) = self.get_token() {
            Some(format!("Bearer {}", token))
        } else {
            None
        }
    }
    
    // 设置 token 和用户信息
    pub fn set_token(&self, token: &str) -> Result<(), anyhow::Error> {
        self.token_storage.set(TOKEN_STORAGE_KEY, serde_json::Value::String(token.to_string()));
        self.token_storage.save()?;
        Ok(())
    }
    
    // 获取 token
    pub fn get_token(&self) -> Option<String> {
        self.token_storage
            .get(TOKEN_STORAGE_KEY)
            .and_then(|value| value.as_str().map(String::from))
    }
    
    // 清除 token 和用户信息
    pub fn clear_token(&self) -> Result<(), anyhow::Error> {
        if self.token_storage.has(TOKEN_STORAGE_KEY) {
            self.token_storage.delete(TOKEN_STORAGE_KEY);
        }
        if self.token_storage.has(USER_INFO_KEY) {
            self.token_storage.delete(USER_INFO_KEY);
        }
        self.token_storage.save()?;
        Ok(())
    }
    
    // 检查是否已登录
    pub fn is_logged_in(&self) -> bool {
        self.get_user_info().is_some()
    }
    
    // 保存用户信息
    pub fn save_user_info(&self, user_info: &serde_json::Value) -> Result<(), anyhow::Error> {
        self.token_storage.set(USER_INFO_KEY, user_info.clone());
        self.token_storage.save()?;
        Ok(())
    }

    // 保存系统信息
    pub fn save_system_info(&self, system_info: &serde_json::Value) -> Result<(), anyhow::Error> {
        self.token_storage.set(SYSTEM_INFO_KEY, system_info.clone());
        self.token_storage.save()?;
        Ok(())
    }
    
    // 获取用户信息
    pub fn get_user_info(&self) -> Option<Value> {
        self.token_storage.get(USER_INFO_KEY).map(|v| v.clone())
    }

    // 获取系统信息
    pub fn get_system_info(&self) -> Option<Value> {
        self.token_storage.get(SYSTEM_INFO_KEY).map(|v| v.clone())
    }
    
    // 从 JWT token 中解析过期时间
    pub fn get_token_expiry(&self) -> Option<i64> {
        if let Some(token) = self.get_token() {
            // 简单的 JWT 解析逻辑
            if let Some(claims_part) = token.split('.').nth(1) {
                if let Ok(decoded) = URL_SAFE_NO_PAD.decode(claims_part) {
                    if let Ok(claims_str) = String::from_utf8(decoded) {
                        if let Ok(claims) = serde_json::from_str::<serde_json::Value>(&claims_str) {
                            return claims.get("exp").and_then(|v| v.as_i64());
                        }
                    }
                }
            }
        }
        None
    }
    
    // 检查 token 是否已过期
    pub fn is_token_expired(&self) -> bool {
        if let Some(expiry) = self.get_token_expiry() {
            let current_time = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs() as i64;
            current_time > expiry
        } else {
            false
        }
    }
}