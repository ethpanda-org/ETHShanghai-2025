use app_lib::commands::users::{get_user_info, update_user_info, change_password};
use app_lib::api::client::ApiClient;
use app_lib::api::models::*;
use mockall::predicate::*;
use mockall::*;

// 模拟ApiClient
mock! {
    pub ApiClient {
        pub async fn get_user_info(&self, token: &str) -> Result<UserInfo, ApiError>;
        pub async fn update_user_info(&self, token: &str, user_info: &UserUpdate) -> Result<UserInfo, ApiError>;
        pub async fn change_password(&self, token: &str, current_password: &str, new_password: &str) -> Result<(), ApiError>;
    }
}

#[tokio::test]
async fn test_get_user_info_success() {
    // 配置模拟ApiClient返回成功响应
    let mut mock_api_client = MockApiClient::new();
    mock_api_client.expect_get_user_info()
        .with(eq("test_token"))
        .returning(|_| Ok(UserInfo {
            id: 1,
            username: "testuser".to_string(),
            email: "test@example.com".to_string(),
            role: "user".to_string(),
            created_at: "2023-01-01T10:00:00Z".to_string(),
            updated_at: "2023-01-02T10:00:00Z".to_string(),
        }));
    
    // 调用get_user_info函数
    let result = get_user_info(
        Box::new(mock_api_client),
        "test_token"
    ).await;
    
    // 验证结果
    assert!(result.is_ok());
    let user_info = result.unwrap();
    assert_eq!(user_info.id, 1);
    assert_eq!(user_info.username, "testuser");
    assert_eq!(user_info.email, "test@example.com");
}

#[tokio::test]
async fn test_get_user_info_api_error() {
    // 配置模拟ApiClient返回错误
    let mut mock_api_client = MockApiClient::new();
    mock_api_client.expect_get_user_info()
        .with(eq("invalid_token"))
        .returning(|_| Err(ApiError::AuthError("Invalid or expired token".to_string())));
    
    // 调用get_user_info函数
    let result = get_user_info(
        Box::new(mock_api_client),
        "invalid_token"
    ).await;
    
    // 验证结果
    assert!(result.is_err());
    assert!(result.err().unwrap().contains("Failed to get user info"));
}

#[tokio::test]
async fn test_update_user_info_success() {
    // 准备更新用户信息
    let user_update = UserUpdate {
        username: Some("updateduser".to_string()),
        email: Some("updated@example.com".to_string()),
    };
    
    // 配置模拟ApiClient返回成功响应
    let mut mock_api_client = MockApiClient::new();
    mock_api_client.expect_update_user_info()
        .with(eq("test_token"), eq(user_update.clone()))
        .returning(|_, _| Ok(UserInfo {
            id: 1,
            username: "updateduser".to_string(),
            email: "updated@example.com".to_string(),
            role: "user".to_string(),
            created_at: "2023-01-01T10:00:00Z".to_string(),
            updated_at: "2023-01-03T10:00:00Z".to_string(),
        }));
    
    // 调用update_user_info函数
    let result = update_user_info(
        Box::new(mock_api_client),
        "test_token",
        user_update
    ).await;
    
    // 验证结果
    assert!(result.is_ok());
    let user_info = result.unwrap();
    assert_eq!(user_info.username, "updateduser");
    assert_eq!(user_info.email, "updated@example.com");
}

#[tokio::test]
async fn test_update_user_info_partial() {
    // 准备部分更新用户信息（只更新email）
    let user_update = UserUpdate {
        username: None,
        email: Some("partial@example.com".to_string()),
    };
    
    // 配置模拟ApiClient返回成功响应
    let mut mock_api_client = MockApiClient::new();
    mock_api_client.expect_update_user_info()
        .with(eq("test_token"), eq(user_update.clone()))
        .returning(|_, _| Ok(UserInfo {
            id: 1,
            username: "testuser".to_string(),
            email: "partial@example.com".to_string(),
            role: "user".to_string(),
            created_at: "2023-01-01T10:00:00Z".to_string(),
            updated_at: "2023-01-04T10:00:00Z".to_string(),
        }));
    
    // 调用update_user_info函数
    let result = update_user_info(
        Box::new(mock_api_client),
        "test_token",
        user_update
    ).await;
    
    // 验证结果
    assert!(result.is_ok());
    let user_info = result.unwrap();
    assert_eq!(user_info.username, "testuser"); // 未更新
    assert_eq!(user_info.email, "partial@example.com"); // 已更新
}

#[tokio::test]
async fn test_update_user_info_validation_error() {
    // 准备无效的用户信息
    let user_update = UserUpdate {
        username: Some("u".to_string()), // 太短的用户名
        email: Some("invalid-email".to_string()), // 无效的邮箱格式
    };
    
    // 配置模拟ApiClient返回验证错误
    let mut mock_api_client = MockApiClient::new();
    mock_api_client.expect_update_user_info()
        .with(eq("test_token"), eq(user_update.clone()))
        .returning(|_, _| Err(ApiError::ValidationError(
            "Username must be at least 3 characters and Email is invalid".to_string()
        )));
    
    // 调用update_user_info函数
    let result = update_user_info(
        Box::new(mock_api_client),
        "test_token",
        user_update
    ).await;
    
    // 验证结果
    assert!(result.is_err());
    assert!(result.err().unwrap().contains("Failed to update user info"));
}

#[tokio::test]
async fn test_change_password_success() {
    // 配置模拟ApiClient返回成功响应
    let mut mock_api_client = MockApiClient::new();
    mock_api_client.expect_change_password()
        .with(eq("test_token"), eq("current123"), eq("newpassword123"))
        .returning(|_, _, _| Ok(()));
    
    // 调用change_password函数
    let result = change_password(
        Box::new(mock_api_client),
        "test_token",
        "current123".to_string(),
        "newpassword123".to_string()
    ).await;
    
    // 验证结果
    assert!(result.is_ok());
    assert!(result.unwrap());
}

#[tokio::test]
async fn test_change_password_wrong_current_password() {
    // 配置模拟ApiClient返回错误
    let mut mock_api_client = MockApiClient::new();
    mock_api_client.expect_change_password()
        .with(eq("test_token"), eq("wrongpassword"), eq("newpassword123"))
        .returning(|_, _, _| Err(ApiError::AuthError("Current user_password is incorrect".to_string())));
    
    // 调用change_password函数
    let result = change_password(
        Box::new(mock_api_client),
        "test_token",
        "wrongpassword".to_string(),
        "newpassword123".to_string()
    ).await;
    
    // 验证结果
    assert!(result.is_err());
    assert!(result.err().unwrap().contains("Failed to change user_password"));
}

#[tokio::test]
async fn test_change_password_invalid_new_password() {
    // 配置模拟ApiClient返回验证错误
    let mut mock_api_client = MockApiClient::new();
    mock_api_client.expect_change_password()
        .with(eq("test_token"), eq("current123"), eq("weak"))
        .returning(|_, _, _| Err(ApiError::ValidationError(
            "New user_password must be at least 8 characters".to_string()
        )));
    
    // 调用change_password函数
    let result = change_password(
        Box::new(mock_api_client),
        "test_token",
        "current123".to_string(),
        "weak".to_string()
    ).await;
    
    // 验证结果
    assert!(result.is_err());
    assert!(result.err().unwrap().contains("Failed to change user_password"));
}