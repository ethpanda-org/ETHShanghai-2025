use chrono::Utc;
use sqlx::SqlitePool;

pub async fn write_audit(pool: &SqlitePool, user_id: Option<&str>, action: &str, details: serde_json::Value) {
    let now = Utc::now().to_rfc3339();
    let _ = sqlx::query(
        "INSERT INTO audit_logs (user_id, action, details, created_at) VALUES (?, ?, ?, ?)"
    )
    .bind(user_id)
    .bind(action)
    .bind(details.to_string())
    .bind(now)
    .execute(pool)
    .await;
}


