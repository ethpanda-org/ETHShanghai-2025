use axum::{
    body::Body,
    http::{Request, StatusCode},
    Router,
};
use pickers_server::{
    config::AppState,
    database::{create_pool, init_database},
    handlers::create_routes,
};
use serde_json::json;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tower::ServiceExt;

async fn create_test_app() -> Router {
    let pool = create_pool().await.expect("Failed to create test database pool");
    init_database(&pool).await.expect("Failed to initialize test database");

    let state = AppState {
        db: pool,
        jwt_secret: "test_secret_key_for_testing_purposes_only".to_string(),
        password_salt: "test_salt_for_testing_purposes_only".to_string(),
        password_master_key: "openpickopenpickopenpickopenpick".to_string(),
        password_nonce: "openpickopen".to_string(),
        pending_registration_cleanup_minutes: 10,
        verification_codes: Arc::new(Mutex::new(HashMap::new())),
        download_tokens: Arc::new(Mutex::new(HashMap::new())),
        pending_registrations: Arc::new(Mutex::new(HashMap::new())),
        blockchain_name: "Sepolia ETH".to_string(),
        blockchain_rpc_url: "https://sepolia.infura.io/v3/7cb673f9a1324974899fc4cd4429b450".to_string(),
        blockchain_explorer_url: "https://sepolia.etherscan.io".to_string(),
        blockchain_token_usdt_url: "https://www.okx.com/api/v5/market/ticker?instId=USDC-USDT".to_string(),
        blockchain_authorized_contract_address: "0x2ed3dddae5b2f321af0806181fbfa6d049be47d8".to_string(),
        blockchain_retry_times: 5,
        blockchain_retry_interval_seconds: 10,
        premium_payment_rate: 5,
        premium_to_usd: 1,
        premium_free: 30,
        premium_period: 30,
        premium_start: true,
    };

    create_routes().with_state(state)
}

#[tokio::test]
async fn test_user_registration_flow() {
    let app = create_test_app().await;
    
    let timestamp = chrono::Utc::now().timestamp();
    let test_email = format!("test{}@example.com", timestamp);
    
    // 测试用户注册
    let register_request = Request::builder()
        .method("POST")
        .uri("/api/users/register")
        .header("content-type", "application/json")
        .body(Body::from(
            json!({
                "email": test_email,
                "user_name": "Test User",
                "user_password": "test123456",
                "user_password": "test123456",
                "user_type": "gen"
            })
            .to_string(),
        ))
        .unwrap();

    let response = app.clone().oneshot(register_request).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn test_user_registration_duplicate_email() {
    let app = create_test_app().await;
    
    let timestamp = chrono::Utc::now().timestamp();
    let test_email = format!("duplicate{}@example.com", timestamp);
    
    // 第一次注册
    let register_request1 = Request::builder()
        .method("POST")
        .uri("/api/users/register")
        .header("content-type", "application/json")
        .body(Body::from(
            json!({
                "email": test_email,
                "user_name": "Test User 1",
        "user_password": "test123456",
                "user_type": "gen"
            })
            .to_string(),
        ))
        .unwrap();

    let response1 = app.clone().oneshot(register_request1).await.unwrap();
    assert_eq!(response1.status(), StatusCode::OK);

    // 第二次注册相同邮箱
    let register_request2 = Request::builder()
        .method("POST")
        .uri("/api/users/register")
        .header("content-type", "application/json")
        .body(Body::from(
            json!({
                "email": test_email,
                "user_name": "Test User 2",
                "user_type": "gen"
            })
            .to_string(),
        ))
        .unwrap();

    let response2 = app.oneshot(register_request2).await.unwrap();
    assert_eq!(response2.status(), StatusCode::UNPROCESSABLE_ENTITY);
}

#[tokio::test]
async fn test_user_registration_invalid_user_type() {
    let app = create_test_app().await;
    
    let timestamp = chrono::Utc::now().timestamp();
    let test_email = format!("invalid{}@example.com", timestamp);
    
    let register_request = Request::builder()
        .method("POST")
        .uri("/api/users/register")
        .header("content-type", "application/json")
        .body(Body::from(
            json!({
                "email": test_email,
                "user_name": "Test User",
                "user_password": "test123456",
                "user_type": "InvalidType"
            })
            .to_string(),
        ))
        .unwrap();

    let response = app.oneshot(register_request).await.unwrap();
    assert_eq!(response.status(), StatusCode::UNPROCESSABLE_ENTITY);
}

#[tokio::test]
async fn test_user_registration_invalid_email() {
    let app = create_test_app().await;
    
    let register_request = Request::builder()
        .method("POST")
        .uri("/api/users/register")
        .header("content-type", "application/json")
        .body(Body::from(
            json!({
                "email": "invalid-email",
                "user_name": "Test User",
                "user_password": "test123456",
                "user_type": "gen"
            })
            .to_string(),
        ))
        .unwrap();

    let response = app.oneshot(register_request).await.unwrap();
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn test_get_pickers_list() {
    let app = create_test_app().await;
    
    let request = Request::builder()
        .method("GET")
        .uri("/api/pickers")
        .body(Body::empty())
        .unwrap();

    let response = app.oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn test_get_pickers_with_pagination() {
    let app = create_test_app().await;
    
    let request = Request::builder()
        .method("GET")
        .uri("/api/pickers?page=1&limit=10")
        .body(Body::empty())
        .unwrap();

    let response = app.oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn test_get_pickers_with_search() {
    let app = create_test_app().await;
    
    let request = Request::builder()
        .method("GET")
        .uri("/api/pickers?search=test")
        .body(Body::empty())
        .unwrap();

    let response = app.oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn test_unauthorized_access() {
    let app = create_test_app().await;
    
    // 测试不存在的端点
    let request = Request::builder()
        .method("GET")
        .uri("/api/nonexistent")
        .body(Body::empty())
        .unwrap();

    let response = app.oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn test_invalid_endpoint() {
    let app = create_test_app().await;
    
    let request = Request::builder()
        .method("GET")
        .uri("/api/nonexistent")
        .body(Body::empty())
        .unwrap();

    let response = app.oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn test_cors_headers() {
    let app = create_test_app().await;
    
    let request = Request::builder()
        .method("OPTIONS")
        .uri("/api/pickers")
        .header("Origin", "http://localhost:3000")
        .header("Access-Control-Request-Method", "GET")
        .body(Body::empty())
        .unwrap();

    let response = app.oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    
    let headers = response.headers();
    assert!(headers.contains_key("access-control-allow-origin"));
    assert!(headers.contains_key("access-control-allow-methods"));
}

#[tokio::test]
async fn test_malformed_json_request() {
    let app = create_test_app().await;
    
    let request = Request::builder()
        .method("POST")
        .uri("/api/users/register")
        .header("content-type", "application/json")
        .body(Body::from("invalid json"))
        .unwrap();

    let response = app.oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn test_missing_required_fields() {
    let app = create_test_app().await;
    
    let request = Request::builder()
        .method("POST")
        .uri("/api/users/register")
        .header("content-type", "application/json")
        .body(Body::from(
            json!({
                "email": "test@example.com"
                // 缺少 user_name �?user_type
            })
            .to_string(),
        ))
        .unwrap();

    let response = app.oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::UNPROCESSABLE_ENTITY);
}

#[tokio::test]
async fn test_health_check() {
    let app = create_test_app().await;
    
    let request = Request::builder()
        .method("GET")
        .uri("/")
        .body(Body::empty())
        .unwrap();

    let response = app.oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);
}
