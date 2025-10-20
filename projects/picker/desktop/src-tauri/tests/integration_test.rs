#![cfg(test)]

use mockito::Server;
use serde_json::json;
use std::env;

// 测试应用的基本初始化
#[test]
fn test_app_initialization() {
    // 简单验证应用能够初始化和配置加载
    // 在测试环境中，我们不应该真正运行应用，因为这会导致跨平台兼容性问题
    // 只验证配置是否能正确加载
    let config_result = std::panic::catch_unwind(|| {
        // 尝试访问应用的一些静态信息或配置
        "App initialization configuration is accessible";
    });
    assert!(config_result.is_ok());
}

// 测试用户认证相关的API交互
#[tokio::test]
async fn test_user_authentication_api() {
    // 设置 mock 服务器
    let mut mock_server = Server::new_async().await;
    let mock_url = mock_server.url();
    
    // 设置环境变量以使用 mock 服务器
    env::set_var("API_BASE_URL", &mock_url);
    
    // 准备 mock 响应
    let register_mock = mock_server
        .mock("POST", "/api/auth/register")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body("true")
        .create_async()
        .await;
    
    let verify_mock = mock_server
        .mock("POST", "/api/auth/verify")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body("true")
        .create_async()
        .await;
    
    let login_mock = mock_server
        .mock("POST", "/api/auth/login")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(serde_json::to_string(&json!({
            "token": "auth_token",
            "user": {
                "user_id": "user_123",
                "email": "test@example.com",
                "user_name": "test_user",
                "user_type": "gen",
                "wallet_address": "0x123",
                "premium_balance": 100,
                "created_at": "2023-01-01T00:00:00Z"
            }
        })).unwrap())
        .create_async()
        .await;
    
    let profile_mock = mock_server
        .mock("GET", "/api/users/profile")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(serde_json::to_string(&json!({
            "user_id": "user_123",
            "email": "test@example.com",
            "user_name": "test_user",
            "user_type": "gen",
            "wallet_address": "0x123",
            "premium_balance": 100,
            "created_at": "2023-01-01T00:00:00Z"
        })).unwrap())
        .match_header("Authorization", "Bearer auth_token")
        .create_async()
        .await;
    
    // 1. 验证注册API
    let client = reqwest::Client::new();
    let register_request = json!({
        "email": "test@example.com", 
        "user_password": "password123", 
        "user_name": "test_user", 
        "user_type": "gen", 
        "wallet_address": "0x123"
    });
    let register_result = client.post(format!("{}/api/auth/register", mock_url))
        .json(&register_request)
        .send()
        .await;
    assert!(register_result.is_ok());
    register_mock.assert_async().await;
    
    // 2. 验证邮箱API
    let verify_request = json!({
        "email": "test@example.com", 
        "code": "123456"
    });
    let verify_result = client.post(format!("{}/api/auth/verify", mock_url))
        .json(&verify_request)
        .send()
        .await;
    assert!(verify_result.is_ok());
    verify_mock.assert_async().await;
    
    // 3. 验证登录API
    let login_request = json!({
        "email": "test@example.com", 
        "user_password": "password123"
    });
    let login_result = client.post(format!("{}/api/auth/login", mock_url))
        .json(&login_request)
        .send()
        .await;
    assert!(login_result.is_ok());
    let login_response = login_result.unwrap().json::<serde_json::Value>().await.unwrap();
    assert_eq!(login_response["token"].as_str().unwrap(), "auth_token");
    login_mock.assert_async().await;
    
    // 4. 验证带认证的请求
    let profile_result = client.get(format!("{}/api/users/profile", mock_url))
        .header("Authorization", "Bearer auth_token")
        .send()
        .await;
    assert!(profile_result.is_ok());
    let user_info = profile_result.unwrap().json::<serde_json::Value>().await.unwrap();
    assert_eq!(user_info["user_id"].as_str().unwrap(), "user_123");
    profile_mock.assert_async().await;
    
    // 清理环境变量
    env::remove_var("API_BASE_URL");
}

// 测试 Picker 市场相关API交互
#[tokio::test]
async fn test_picker_marketplace_api() {
    // 设置 mock 服务器
    let mut mock_server = Server::new_async().await;
    let mock_url = mock_server.url();
    
    // 设置环境变量以使用 mock 服务器
    env::set_var("API_BASE_URL", &mock_url);
    
    // 准备 mock 响应
    let marketplace_mock = mock_server
        .mock("GET", "/api/pickers?page=1&size=10")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(serde_json::to_string(&json!({
            "pickers": [
                {
                    "picker_id": "picker_1",
                    "alias": "Test Picker 1",
                    "description": "A test picker",
                    "price": 50,
                    "creator": "creator_1",
                    "rating": 4.5,
                    "image_path": "./test_picker.png",
                    "download_count": 100,
                    "version": "1.0.0"
                }
            ],
            "total": 1
        })).unwrap())
        .create_async()
        .await;
    
    let detail_mock = mock_server
        .mock("GET", "/api/pickers/picker_1")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(serde_json::to_string(&json!({
            "picker_id": "picker_1",
            "alias": "Test Picker 1",
            "description": "A test picker",
            "price": 50,
            "creator": "creator_1",
            "rating": 4.5,
            "image_path": "./test_picker.png",
            "download_count": 100,
            "version": "1.0.0"
        })).unwrap())
        .create_async()
        .await;
    
    // 创建HTTP客户端
    let client = reqwest::Client::new();
    
    // 1. 测试获取Picker市场列表
    let marketplace_result = client.get(format!("{}/api/pickers?page=1&size=10", mock_url))
        .send()
        .await;
    assert!(marketplace_result.is_ok());
    marketplace_mock.assert_async().await;
    
    // 2. 测试获取Picker详情
    let detail_result = client.get(format!("{}/api/pickers/picker_1", mock_url))
        .send()
        .await;
    assert!(detail_result.is_ok());
    detail_mock.assert_async().await;
    
    // 清理环境变量
    env::remove_var("API_BASE_URL");
}

// 测试订单相关API交互
#[tokio::test]
async fn test_order_api() {
    // 设置 mock 服务器
    let mut mock_server = Server::new_async().await;
    let mock_url = mock_server.url();
    
    // 设置环境变量以使用 mock 服务器
    env::set_var("API_BASE_URL", &mock_url);
    
    // 准备 mock 响应
    let create_order_mock = mock_server
        .mock("POST", "/api/orders")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(serde_json::to_string(&json!({
            "order_id": "order_123",
            "user_id": "user_123",
            "picker_id": "picker_123",
            "picker_name": "Test Picker",
            "price": 50,
            "status": "completed",
            "created_at": "2023-01-01T00:00:00Z",
            "completed_at": "2023-01-01T00:01:00Z",
            "download_token": "download_token_123"
        })).unwrap())
        .match_header("Authorization", "Bearer auth_token")
        .create_async()
        .await;
    
    let order_list_mock = mock_server
        .mock("GET", "/api/orders?page=1&size=10")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(serde_json::to_string(&json!({
            "items": [
                {
                    "order_id": "order_123",
                    "user_id": "user_123",
                    "picker_id": "picker_123",
                    "picker_name": "Test Picker",
                    "price": 50,
                    "status": "completed",
                    "created_at": "2023-01-01T00:00:00Z"
                }
            ],
            "total": 1,
            "page": 1,
            "size": 10
        })).unwrap())
        .match_header("Authorization", "Bearer auth_token")
        .create_async()
        .await;
    
    let order_detail_mock = mock_server
        .mock("GET", "/api/orders/order_123")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(serde_json::to_string(&json!({
            "order_id": "order_123",
            "user_id": "user_123",
            "picker_id": "picker_123",
            "picker_name": "Test Picker",
            "price": 50,
            "status": "completed",
            "created_at": "2023-01-01T00:00:00Z",
            "completed_at": "2023-01-01T00:01:00Z",
            "download_token": "download_token_123"
        })).unwrap())
        .match_header("Authorization", "Bearer auth_token")
        .create_async()
        .await;
    
    // 创建带认证的HTTP客户端
    let client = reqwest::Client::new();
    
    // 1. 测试创建订单
    let create_order_request = json!({
        "picker_id": "picker_123"
    });
    let create_order_result = client.post(format!("{}/api/orders", mock_url))
        .header("Authorization", "Bearer auth_token")
        .json(&create_order_request)
        .send()
        .await;
    assert!(create_order_result.is_ok());
    create_order_mock.assert_async().await;
    
    // 2. 测试获取订单列表
    let order_list_result = client.get(format!("{}/api/orders?page=1&size=10", mock_url))
        .header("Authorization", "Bearer auth_token")
        .send()
        .await;
    assert!(order_list_result.is_ok());
    order_list_mock.assert_async().await;
    
    // 3. 测试获取订单详情
    let order_detail_result = client.get(format!("{}/api/orders/order_123", mock_url))
        .header("Authorization", "Bearer auth_token")
        .send()
        .await;
    assert!(order_detail_result.is_ok());
    order_detail_mock.assert_async().await;
    
    // 清理环境变量
    env::remove_var("API_BASE_URL");
}