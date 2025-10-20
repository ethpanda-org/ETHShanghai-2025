use sqlx::{SqlitePool, Row};
use chrono::Utc;
use crate::shared::errors::AppError;
use std::collections::HashMap;
use std::sync::Arc;
use parking_lot::Mutex;

/// 登录失败追踪
#[allow(dead_code)]
pub struct LoginFailureTracker {
    failures: Arc<Mutex<HashMap<String, Vec<chrono::DateTime<chrono::Utc>>>>>,
}

impl LoginFailureTracker {
    #[allow(dead_code)]
    pub fn new() -> Self {
        Self {
            failures: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// 记录登录失败
    #[allow(dead_code)]
    pub fn record_failure(&self, contact: &str) {
        let mut map = self.failures.lock();
        let entry = map.entry(contact.to_string()).or_insert_with(Vec::new);
        entry.push(Utc::now());
        
        // 清理5分钟前的记录
        let cutoff = Utc::now() - chrono::Duration::minutes(5);
        entry.retain(|t| *t > cutoff);
    }

    /// 检查是否被锁定
    #[allow(dead_code)]
    pub fn is_locked(&self, contact: &str, max_attempts: usize) -> bool {
        let map = self.failures.lock();
        if let Some(failures) = map.get(contact) {
            let cutoff = Utc::now() - chrono::Duration::minutes(5);
            let recent_failures = failures.iter().filter(|t| **t > cutoff).count();
            return recent_failures >= max_attempts;
        }
        false
    }

    /// 清除失败记录（成功登录后）
    #[allow(dead_code)]
    pub fn clear_failures(&self, contact: &str) {
        let mut map = self.failures.lock();
        map.remove(contact);
    }

    /// 获取剩余尝试次数
    #[allow(dead_code)]
    pub fn remaining_attempts(&self, contact: &str, max_attempts: usize) -> usize {
        let map = self.failures.lock();
        if let Some(failures) = map.get(contact) {
            let cutoff = Utc::now() - chrono::Duration::minutes(5);
            let recent_failures = failures.iter().filter(|t| **t > cutoff).count();
            return max_attempts.saturating_sub(recent_failures);
        }
        max_attempts
    }
}

impl Default for LoginFailureTracker {
    fn default() -> Self {
        Self::new()
    }
}

/// 异常行为检测
#[allow(dead_code)]
pub struct RiskDetector {
    db: SqlitePool,
}

impl RiskDetector {
    #[allow(dead_code)]
    pub fn new(db: SqlitePool) -> Self {
        Self { db }
    }

    /// 检测多地点异常登录
    #[allow(dead_code)]
    pub async fn detect_location_anomaly(
        &self,
        user_id: &str,
        current_ip: &str,
    ) -> Result<bool, AppError> {
        // 获取最近的登录IP
        let last_ip = sqlx::query(
            "SELECT details FROM audit_logs 
             WHERE user_id = ? AND action = 'auth.login' 
             ORDER BY created_at DESC LIMIT 1"
        )
        .bind(user_id)
        .fetch_optional(&self.db)
        .await?;

        if let Some(row) = last_ip {
            if let Ok(details_str) = row.try_get::<String, _>("details") {
                if let Ok(details) = serde_json::from_str::<serde_json::Value>(&details_str) {
                    if let Some(last_ip_str) = details["ip"].as_str() {
                        // 简单检查：IP不同即视为异常
                        // 实际应该使用IP地理位置API判断
                        if last_ip_str != current_ip {
                            println!("⚠️  Location anomaly detected: {} -> {}", last_ip_str, current_ip);
                            return Ok(true);
                        }
                    }
                }
            }
        }

        Ok(false)
    }

    /// 检测短时间内多账号操作
    #[allow(dead_code)]
    pub async fn detect_multi_account_activity(
        &self,
        ip_address: &str,
        time_window_minutes: i64,
        threshold: usize,
    ) -> Result<bool, AppError> {
        let cutoff = Utc::now() - chrono::Duration::minutes(time_window_minutes);
        let cutoff_str = cutoff.to_rfc3339();

        let count: i64 = sqlx::query(
            "SELECT COUNT(DISTINCT user_id) as count FROM audit_logs 
             WHERE details LIKE ? AND created_at > ?"
        )
        .bind(format!("%\"ip\":\"{}%", ip_address))
        .bind(&cutoff_str)
        .fetch_one(&self.db)
        .await?
        .try_get("count")?;

        if count as usize > threshold {
            println!("⚠️  Multi-account activity detected from IP {}: {} accounts", ip_address, count);
            return Ok(true);
        }

        Ok(false)
    }

    /// 记录高风险操作
    #[allow(dead_code)]
    pub async fn log_high_risk_operation(
        &self,
        user_id: &str,
        action: &str,
        details: serde_json::Value,
        risk_level: &str,
    ) -> Result<(), AppError> {
        let now = Utc::now().to_rfc3339();
        
        let risk_details = serde_json::json!({
            "risk_level": risk_level,
            "original_details": details
        });

        sqlx::query(
            "INSERT INTO audit_logs (user_id, action, details, created_at) VALUES (?, ?, ?, ?)"
        )
        .bind(user_id)
        .bind(format!("risk.{}", action))
        .bind(risk_details.to_string())
        .bind(&now)
        .execute(&self.db)
        .await?;

        println!("🚨 High risk operation logged: user={}, action={}, level={}", user_id, action, risk_level);

        Ok(())
    }
}

/// 敏感数据脱敏
#[allow(dead_code)]
pub fn mask_email(email: &str) -> String {
    if let Some(at_pos) = email.find('@') {
        let (local, domain) = email.split_at(at_pos);
        if local.len() > 2 {
            format!("{}***{}", &local[..2], domain)
        } else {
            format!("***{}", domain)
        }
    } else {
        "***".to_string()
    }
}

#[allow(dead_code)]
pub fn mask_phone(phone: &str) -> String {
    if phone.len() > 7 {
        format!("{}****{}", &phone[..3], &phone[phone.len()-4..])
    } else {
        "***".to_string()
    }
}

#[allow(dead_code)]
pub fn mask_wallet_address(address: &str) -> String {
    if address.len() > 10 {
        format!("{}...{}", &address[..6], &address[address.len()-4..])
    } else {
        address.to_string()
    }
}

#[allow(dead_code)]
pub fn mask_contact(contact: &str) -> String {
    if contact.contains('@') {
        mask_email(contact)
    } else {
        mask_phone(contact)
    }
}

/// 输入验证
#[allow(dead_code)]
pub struct InputValidator;

impl InputValidator {
    /// 验证邮箱格式
    #[allow(dead_code)]
    pub fn validate_email(email: &str) -> Result<(), AppError> {
        use regex::Regex;
        let email_regex = Regex::new(
            r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        ).unwrap();

        if !email_regex.is_match(email) {
            return Err(AppError::ValidationError("无效的邮箱格式".to_string()));
        }

        Ok(())
    }

    /// 验证手机号格式（中国）
    #[allow(dead_code)]
    pub fn validate_phone(phone: &str) -> Result<(), AppError> {
        let phone_clean = phone.replace(&[' ', '-', '+'][..], "");
        
        if phone_clean.len() < 10 || phone_clean.len() > 15 {
            return Err(AppError::ValidationError("无效的手机号格式".to_string()));
        }

        if !phone_clean.chars().all(|c| c.is_ascii_digit()) {
            return Err(AppError::ValidationError("手机号只能包含数字".to_string()));
        }

        Ok(())
    }

    /// 验证以太坊地址
    #[allow(dead_code)]
    pub fn validate_eth_address(address: &str) -> Result<(), AppError> {
        if !address.starts_with("0x") || address.len() != 42 {
            return Err(AppError::ValidationError("无效的以太坊地址格式".to_string()));
        }

        let hex_part = &address[2..];
        if !hex_part.chars().all(|c| c.is_ascii_hexdigit()) {
            return Err(AppError::ValidationError("地址包含非法字符".to_string()));
        }

        Ok(())
    }

    /// 验证JSON大小（防止过大payload）
    #[allow(dead_code)]
    pub fn validate_json_size(json_str: &str, max_size_kb: usize) -> Result<(), AppError> {
        let size_kb = json_str.len() / 1024;
        if size_kb > max_size_kb {
            return Err(AppError::ValidationError(
                format!("JSON数据过大：{}KB，最大允许{}KB", size_kb, max_size_kb)
            ));
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mask_email() {
        assert_eq!(mask_email("user@example.com"), "us***@example.com");
        assert_eq!(mask_email("ab@test.com"), "***@test.com");
    }

    #[test]
    fn test_mask_phone() {
        assert_eq!(mask_phone("13812345678"), "138****5678");
    }

    #[test]
    fn test_mask_wallet() {
        assert_eq!(
            mask_wallet_address("0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"),
            "0x742d...bEb"
        );
    }

    #[test]
    fn test_login_failure_tracker() {
        let tracker = LoginFailureTracker::new();
        
        assert!(!tracker.is_locked("test@example.com", 3));
        
        tracker.record_failure("test@example.com");
        tracker.record_failure("test@example.com");
        tracker.record_failure("test@example.com");
        
        assert!(tracker.is_locked("test@example.com", 3));
        assert_eq!(tracker.remaining_attempts("test@example.com", 3), 0);
        
        tracker.clear_failures("test@example.com");
        assert!(!tracker.is_locked("test@example.com", 3));
    }
}

