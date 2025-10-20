use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use axum::http::HeaderMap;
use crate::shared::errors::AppError;

pub struct RateLimiterConfig {
    pub burst: usize,
    pub window: Duration,
}

impl Default for RateLimiterConfig {
    fn default() -> Self { Self { burst: 10, window: Duration::from_secs(60) } }
}

pub fn check_rate_limit(
    store: Arc<Mutex<HashMap<String, Vec<Instant>>>>,
    key: String,
    config: &RateLimiterConfig,
) -> Result<(), AppError> {
    let now = Instant::now();
    let mut map = store.lock().unwrap();
    let entry = map.entry(key).or_insert_with(Vec::new);
    // 清理过期窗口
    entry.retain(|t| now.duration_since(*t) < config.window);
    if entry.len() >= config.burst {
        return Err(AppError::TooManyRequests("Too many requests".to_string()));
    }
    entry.push(now);
    Ok(())
}

pub fn client_key(headers: &HeaderMap) -> String {
    headers
        .get("x-forwarded-for")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("unknown")
        .to_string()
}


