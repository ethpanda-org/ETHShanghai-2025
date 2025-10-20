use app_lib::commands::orders::{get_user_orders, create_order, get_order_detail};
use app_lib::api::client::ApiClient;
use app_lib::api::models::*;
use mockall::predicate::*;
use mockall::*;

// 模拟ApiClient
mock! {
    pub ApiClient {
        pub async fn get_user_orders(&self, user_id: i64, token: &str, page: i64, limit: i64) -> Result<OrderListResponse, ApiError>;
        pub async fn create_order(&self, picker_id: i64, token: &str, parameters: Option<&str>) -> Result<OrderInfo, ApiError>;
        pub async fn get_order_detail(&self, order_id: i64, token: &str) -> Result<OrderInfo, ApiError>;
    }
}

#[tokio::test]
async fn test_get_user_orders_success() {
    // 配置模拟ApiClient返回成功响应
    let mut mock_api_client = MockApiClient::new();
    mock_api_client.expect_get_user_orders()
        .with(eq(1), eq("test_token"), eq(1), eq(10))
        .returning(|_, _, _, _| Ok(OrderListResponse {
            items: vec![
                OrderInfo {
                    id: 1,
                    picker_id: 2,
                    user_id: 1,
                    status: OrderStatus::Completed,
                    created_at: "2023-01-01T10:00:00Z".to_string(),
                    updated_at: "2023-01-02T10:00:00Z".to_string(),
                    parameters: "{}".to_string(),
                },
                OrderInfo {
                    id: 2,
                    picker_id: 3,
                    user_id: 1,
                    status: OrderStatus::Pending,
                    created_at: "2023-01-03T10:00:00Z".to_string(),
                    updated_at: "2023-01-03T10:00:00Z".to_string(),
                    parameters: "{}".to_string(),
                }
            ],
            total: 2,
            page: 1,
            limit: 10,
        }));
    
    // 调用get_user_orders函数
    let result = get_user_orders(
        Box::new(mock_api_client),
        1,
        "test_token",
        1,
        10
    ).await;
    
    // 验证结果
    assert!(result.is_ok());
    let order_list = result.unwrap();
    assert_eq!(order_list.items.len(), 2);
    assert_eq!(order_list.total, 2);
}

#[tokio::test]
async fn test_get_user_orders_api_error() {
    // 配置模拟ApiClient返回错误
    let mut mock_api_client = MockApiClient::new();
    mock_api_client.expect_get_user_orders()
        .with(eq(1), eq("invalid_token"), eq(1), eq(10))
        .returning(|_, _, _, _| Err(ApiError::AuthError("Invalid token".to_string())));
    
    // 调用get_user_orders函数
    let result = get_user_orders(
        Box::new(mock_api_client),
        1,
        "invalid_token",
        1,
        10
    ).await;
    
    // 验证结果
    assert!(result.is_err());
    assert!(result.err().unwrap().contains("Failed to get user orders"));
}

#[tokio::test]
async fn test_create_order_success() {
    // 配置模拟ApiClient返回成功响应
    let mut mock_api_client = MockApiClient::new();
    mock_api_client.expect_create_order()
        .with(eq(1), eq("test_token"), eq(Some("{\"param\":\"value\"}")))
        .returning(|_, _, _| Ok(OrderInfo {
            id: 3,
            picker_id: 1,
            user_id: 1,
            status: OrderStatus::Pending,
            created_at: "2023-01-04T10:00:00Z".to_string(),
            updated_at: "2023-01-04T10:00:00Z".to_string(),
            parameters: "{\"param\":\"value\"}".to_string(),
        }));
    
    // 调用create_order函数
    let result = create_order(
        Box::new(mock_api_client),
        1,
        "test_token",
        Some("{\"param\":\"value\"}")
    ).await;
    
    // 验证结果
    assert!(result.is_ok());
    let order = result.unwrap();
    assert_eq!(order.id, 3);
    assert_eq!(order.status, OrderStatus::Pending);
}

#[tokio::test]
async fn test_create_order_api_error() {
    // 配置模拟ApiClient返回错误
    let mut mock_api_client = MockApiClient::new();
    mock_api_client.expect_create_order()
        .with(eq(999), eq("test_token"), eq(None))
        .returning(|_, _, _| Err(ApiError::NotFound));
    
    // 调用create_order函数
    let result = create_order(
        Box::new(mock_api_client),
        999,
        "test_token",
        None
    ).await;
    
    // 验证结果
    assert!(result.is_err());
    assert!(result.err().unwrap().contains("Failed to create order"));
}

#[tokio::test]
async fn test_get_order_detail_success() {
    // 配置模拟ApiClient返回成功响应
    let mut mock_api_client = MockApiClient::new();
    mock_api_client.expect_get_order_detail()
        .with(eq(1), eq("test_token"))
        .returning(|_, _| Ok(OrderInfo {
            id: 1,
            picker_id: 2,
            user_id: 1,
            status: OrderStatus::Completed,
            created_at: "2023-01-01T10:00:00Z".to_string(),
            updated_at: "2023-01-02T10:00:00Z".to_string(),
            parameters: "{}".to_string(),
        }));
    
    // 调用get_order_detail函数
    let result = get_order_detail(
        Box::new(mock_api_client),
        1,
        "test_token"
    ).await;
    
    // 验证结果
    assert!(result.is_ok());
    let order = result.unwrap();
    assert_eq!(order.id, 1);
    assert_eq!(order.status, OrderStatus::Completed);
}

#[tokio::test]
async fn test_get_order_detail_api_error() {
    // 配置模拟ApiClient返回错误
    let mut mock_api_client = MockApiClient::new();
    mock_api_client.expect_get_order_detail()
        .with(eq(999), eq("test_token"))
        .returning(|_, _| Err(ApiError::NotFound));
    
    // 调用get_order_detail函数
    let result = get_order_detail(
        Box::new(mock_api_client),
        999,
        "test_token"
    ).await;
    
    // 验证结果
    assert!(result.is_err());
    assert!(result.err().unwrap().contains("Failed to get order detail"));
}