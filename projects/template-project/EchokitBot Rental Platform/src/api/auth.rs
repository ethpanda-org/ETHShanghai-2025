// 认证和授权服务
use crate::error::Result;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc, Duration};
use std::collections::HashMap;
use tokio::sync::RwLock;
use std::sync::Arc;

/// API 密钥
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiKey {
    pub key: String,
    pub user_id: Uuid,
    pub name: String,
    pub permissions: Vec<Permission>,
    pub rate_limit: RateLimit,
    pub created_at: DateTime<Utc>,
    pub expires_at: Option<DateTime<Utc>>,
    pub last_used_at: Option<DateTime<Utc>>,
}

/// 权限
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum Permission {
    GenerateContract,
    ViewContract,
    DeleteContract,
    DeployContract,
    ManageTemplates,
    ViewReports,
    Admin,
}

/// 速率限制
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RateLimit {
    pub requests_per_minute: u32,
    pub requests_per_hour: u32,
    pub requests_per_day: u32,
}

impl Default for RateLimit {
    fn default() -> Self {
        Self {
            requests_per_minute: 10,
            requests_per_hour: 100,
            requests_per_day: 1000,
        }
    }
}

/// 认证服务
pub struct AuthService {
    api_keys: Arc<RwLock<HashMap<String, ApiKey>>>,
    usage_tracker: Arc<RwLock<UsageTracker>>,
}

impl AuthService {
    pub fn new() -> Self {
        Self {
            api_keys: Arc::new(RwLock::new(HashMap::new())),
            usage_tracker: Arc::new(RwLock::new(UsageTracker::new())),
        }
    }

    /// 验证 API 密钥
    pub async fn validate_api_key(&self, key: &str) -> Result<ApiKey> {
        let api_keys = self.api_keys.read().await;
        
        let api_key = api_keys
            .get(key)
            .ok_or_else(|| crate::error::AgentError::Unauthorized("Invalid API key".to_string()))?;

        // 检查是否过期
        if let Some(expires_at) = api_key.expires_at {
            if expires_at < Utc::now() {
                return Err(crate::error::AgentError::Unauthorized("API key expired".to_string()));
            }
        }

        Ok(api_key.clone())
    }

    /// 检查权限
    pub fn check_permission(&self, api_key: &ApiKey, permission: Permission) -> Result<()> {
        if api_key.permissions.contains(&Permission::Admin) || api_key.permissions.contains(&permission) {
            Ok(())
        } else {
            Err(crate::error::AgentError::Forbidden(
                format!("Missing permission: {:?}", permission)
            ))
        }
    }

    /// 检查速率限制
    pub async fn check_rate_limit(&self, api_key: &ApiKey) -> Result<()> {
        let mut tracker = self.usage_tracker.write().await;
        tracker.check_rate_limit(&api_key.key, &api_key.rate_limit)
    }

    /// 创建 API 密钥
    pub async fn create_api_key(
        &self,
        user_id: Uuid,
        name: String,
        permissions: Vec<Permission>,
        rate_limit: Option<RateLimit>,
    ) -> Result<ApiKey> {
        let key = format!("ak_{}", Uuid::new_v4().to_string().replace("-", ""));
        
        let api_key = ApiKey {
            key: key.clone(),
            user_id,
            name,
            permissions,
            rate_limit: rate_limit.unwrap_or_default(),
            created_at: Utc::now(),
            expires_at: None,
            last_used_at: None,
        };

        let mut api_keys = self.api_keys.write().await;
        api_keys.insert(key, api_key.clone());

        Ok(api_key)
    }

    /// 撤销 API 密钥
    pub async fn revoke_api_key(&self, key: &str) -> Result<()> {
        let mut api_keys = self.api_keys.write().await;
        api_keys.remove(key);
        Ok(())
    }

    /// 更新最后使用时间
    pub async fn update_last_used(&self, key: &str) -> Result<()> {
        let mut api_keys = self.api_keys.write().await;
        if let Some(api_key) = api_keys.get_mut(key) {
            api_key.last_used_at = Some(Utc::now());
        }
        Ok(())
    }
}

/// 使用追踪器
struct UsageTracker {
    usage: HashMap<String, UsageRecord>,
}

impl UsageTracker {
    fn new() -> Self {
        Self {
            usage: HashMap::new(),
        }
    }

    fn check_rate_limit(&mut self, key: &str, limit: &RateLimit) -> Result<()> {
        let now = Utc::now();
        let record = self.usage.entry(key.to_string()).or_insert_with(|| UsageRecord::new());

        // 清理过期的记录
        record.cleanup(now);

        // 检查每分钟限制
        if record.requests_last_minute >= limit.requests_per_minute {
            return Err(crate::error::AgentError::RateLimitExceeded(
                "Rate limit exceeded: requests per minute".to_string()
            ));
        }

        // 检查每小时限制
        if record.requests_last_hour >= limit.requests_per_hour {
            return Err(crate::error::AgentError::RateLimitExceeded(
                "Rate limit exceeded: requests per hour".to_string()
            ));
        }

        // 检查每天限制
        if record.requests_last_day >= limit.requests_per_day {
            return Err(crate::error::AgentError::RateLimitExceeded(
                "Rate limit exceeded: requests per day".to_string()
            ));
        }

        // 记录请求
        record.add_request(now);

        Ok(())
    }
}

/// 使用记录
struct UsageRecord {
    requests_last_minute: u32,
    requests_last_hour: u32,
    requests_last_day: u32,
    minute_window: DateTime<Utc>,
    hour_window: DateTime<Utc>,
    day_window: DateTime<Utc>,
}

impl UsageRecord {
    fn new() -> Self {
        let now = Utc::now();
        Self {
            requests_last_minute: 0,
            requests_last_hour: 0,
            requests_last_day: 0,
            minute_window: now,
            hour_window: now,
            day_window: now,
        }
    }

    fn cleanup(&mut self, now: DateTime<Utc>) {
        // 重置分钟窗口
        if now - self.minute_window > Duration::minutes(1) {
            self.requests_last_minute = 0;
            self.minute_window = now;
        }

        // 重置小时窗口
        if now - self.hour_window > Duration::hours(1) {
            self.requests_last_hour = 0;
            self.hour_window = now;
        }

        // 重置天窗口
        if now - self.day_window > Duration::days(1) {
            self.requests_last_day = 0;
            self.day_window = now;
        }
    }

    fn add_request(&mut self, now: DateTime<Utc>) {
        self.requests_last_minute += 1;
        self.requests_last_hour += 1;
        self.requests_last_day += 1;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_create_and_validate_api_key() {
        let auth_service = AuthService::new();
        
        let api_key = auth_service
            .create_api_key(
                Uuid::new_v4(),
                "Test Key".to_string(),
                vec![Permission::GenerateContract],
                None,
            )
            .await
            .unwrap();

        let validated = auth_service.validate_api_key(&api_key.key).await.unwrap();
        assert_eq!(validated.key, api_key.key);
    }

    #[tokio::test]
    async fn test_check_permission() {
        let auth_service = AuthService::new();
        
        let api_key = ApiKey {
            key: "test_key".to_string(),
            user_id: Uuid::new_v4(),
            name: "Test".to_string(),
            permissions: vec![Permission::GenerateContract],
            rate_limit: RateLimit::default(),
            created_at: Utc::now(),
            expires_at: None,
            last_used_at: None,
        };

        assert!(auth_service.check_permission(&api_key, Permission::GenerateContract).is_ok());
        assert!(auth_service.check_permission(&api_key, Permission::Admin).is_err());
    }
}
