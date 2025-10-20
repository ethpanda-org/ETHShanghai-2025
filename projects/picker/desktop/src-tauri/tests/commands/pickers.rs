use app_lib::commands::pickers::{get_picker_marketplace, get_picker_detail, upload_picker};
use app_lib::api::client::ApiClient;
use app_lib::api::models::*;
use mockall::predicate::*;
use mockall::*;

// 模拟ApiClient
mock! {
    pub ApiClient {
        pub async fn get_picker_marketplace(&self, token: &str, page: i64, limit: i64) -> Result<PickerListResponse, ApiError>;
        pub async fn get_picker_detail(&self, picker_id: i64, token: &str) -> Result<PickerDetail, ApiError>;
        pub async fn upload_file(&self, endpoint: &str, alias: &str, description: &str, size: i64, version: &str, content: &[u8], image: Option<&[u8]>) -> Result<serde_json::Value, ApiError>;
    }
}

#[tokio::test]
async fn test_get_picker_marketplace_success() {
    // 配置模拟ApiClient返回成功响应
    let mut mock_api_client = MockApiClient::new();
    mock_api_client.expect_get_picker_marketplace()
        .with(eq("test_token"), eq(1), eq(10))
        .returning(|_, _, _| Ok(PickerListResponse {
            items: vec![
                PickerBasic {
                    id: 1,
                    alias: "test-picker-1".to_string(),
                    description: "First test picker".to_string(),
                    size: 1000,
                    version: "1.0.0".to_string(),
                    creator_id: 1,
                    created_at: "2023-01-01T10:00:00Z".to_string(),
                    updated_at: "2023-01-02T10:00:00Z".to_string(),
                },
                PickerBasic {
                    id: 2,
                    alias: "test-picker-2".to_string(),
                    description: "Second test picker".to_string(),
                    size: 2000,
                    version: "1.1.0".to_string(),
                    creator_id: 2,
                    created_at: "2023-01-03T10:00:00Z".to_string(),
                    updated_at: "2023-01-04T10:00:00Z".to_string(),
                }
            ],
            total: 2,
            page: 1,
            limit: 10,
        }));
    
    // 调用get_picker_marketplace函数
    let result = get_picker_marketplace(
        Box::new(mock_api_client),
        "test_token",
        1,
        10
    ).await;
    
    // 验证结果
    assert!(result.is_ok());
    let picker_list = result.unwrap();
    assert_eq!(picker_list.items.len(), 2);
    assert_eq!(picker_list.total, 2);
}

#[tokio::test]
async fn test_get_picker_marketplace_api_error() {
    // 配置模拟ApiClient返回错误
    let mut mock_api_client = MockApiClient::new();
    mock_api_client.expect_get_picker_marketplace()
        .with(eq("invalid_token"), eq(1), eq(10))
        .returning(|_, _, _| Err(ApiError::AuthError("Invalid token".to_string())));
    
    // 调用get_picker_marketplace函数
    let result = get_picker_marketplace(
        Box::new(mock_api_client),
        "invalid_token",
        1,
        10
    ).await;
    
    // 验证结果
    assert!(result.is_err());
    assert!(result.err().unwrap().contains("Failed to get picker marketplace"));
}

#[tokio::test]
async fn test_get_picker_marketplace_without_params() {
    // 配置模拟ApiClient返回成功响应（使用默认参数）
    let mut mock_api_client = MockApiClient::new();
    mock_api_client.expect_get_picker_marketplace()
        .with(eq("test_token"), eq(1), eq(10))
        .returning(|_, _, _| Ok(PickerListResponse {
            items: vec![],
            total: 0,
            page: 1,
            limit: 10,
        }));
    
    // 调用get_picker_marketplace函数，不提供page和limit参数
    let result = get_picker_marketplace(
        Box::new(mock_api_client),
        "test_token",
        1,  // 默认page
        10  // 默认limit
    ).await;
    
    // 验证结果
    assert!(result.is_ok());
    let picker_list = result.unwrap();
    assert_eq!(picker_list.items.len(), 0);
    assert_eq!(picker_list.total, 0);
}

#[tokio::test]
async fn test_get_picker_detail_success() {
    // 配置模拟ApiClient返回成功响应
    let mut mock_api_client = MockApiClient::new();
    mock_api_client.expect_get_picker_detail()
        .with(eq(1), eq("test_token"))
        .returning(|_, _| Ok(PickerDetail {
            id: 1,
            alias: "test-picker".to_string(),
            description: "A test picker with details".to_string(),
            size: 1000,
            version: "1.0.0".to_string(),
            creator_id: 101,
            created_at: "2023-01-01T10:00:00Z".to_string(),
            updated_at: "2023-01-02T10:00:00Z".to_string(),
            content: "console.log('Hello world!');".to_string(),
            image_url: Some("https://example.com/image.jpg".to_string()),
        }));
    
    // 调用get_picker_detail函数
    let result = get_picker_detail(
        Box::new(mock_api_client),
        1,
        "test_token"
    ).await;
    
    // 验证结果
    assert!(result.is_ok());
    let picker = result.unwrap();
    assert_eq!(picker.id, 1);
    assert_eq!(picker.alias, "test-picker");
    assert!(picker.image_url.is_some());
}

#[tokio::test]
async fn test_get_picker_detail_api_error() {
    // 配置模拟ApiClient返回错误
    let mut mock_api_client = MockApiClient::new();
    mock_api_client.expect_get_picker_detail()
        .with(eq(999), eq("test_token"))
        .returning(|_, _| Err(ApiError::NotFound));
    
    // 调用get_picker_detail函数
    let result = get_picker_detail(
        Box::new(mock_api_client),
        999,
        "test_token"
    ).await;
    
    // 验证结果
    assert!(result.is_err());
    assert!(result.err().unwrap().contains("Failed to get picker detail"));
}

#[tokio::test]
async fn test_upload_picker_success() {
    // 准备上传文件内容
    let file_content = b"console.log('Uploaded picker content');";
    let image_content = Some(b"image data");
    
    // 配置模拟ApiClient返回成功响应
    let mut mock_api_client = MockApiClient::new();
    mock_api_client.expect_upload_file()
        .with(
            eq("/api/pickers"),
            eq("uploaded-picker"),
            eq("An uploaded test picker"),
            eq(100),
            eq("1.0.0"),
            eq(file_content.as_ref()),
            eq(image_content.as_deref())
        )
        .returning(|_, _, _, _, _, _, _| Ok(PickerDetail {
            id: 3,
            alias: "uploaded-picker".to_string(),
            description: "An uploaded test picker".to_string(),
            size: 100,
            version: "1.0.0".to_string(),
            creator_id: 1,
            created_at: "2023-01-05T10:00:00Z".to_string(),
            updated_at: "2023-01-05T10:00:00Z".to_string(),
            content: "console.log('Uploaded picker content');".to_string(),
            image_url: Some("https://example.com/uploaded-image.jpg".to_string()),
        }));
    
    // 调用upload_picker函数
    let result = upload_picker(
        Box::new(mock_api_client),
        "uploaded-picker",
        "An uploaded test picker",
        file_content.to_vec(),
        image_content.map(|d| d.to_vec()),
        "test_token"
    ).await;
    
    // 验证结果
    assert!(result.is_ok());
    let picker = result.unwrap();
    assert_eq!(picker.id, 3);
    assert_eq!(picker.alias, "uploaded-picker");
    assert!(picker.image_url.is_some());
}

#[tokio::test]
async fn test_upload_picker_without_image() {
    // 准备上传文件内容，但不提供图片
    let file_content = b"console.log('Uploaded picker without image');";
    
    // 配置模拟ApiClient返回成功响应
    let mut mock_api_client = MockApiClient::new();
    mock_api_client.expect_upload_file()
        .with(
            eq("/api/pickers"),
            eq("no-image-picker"),
            eq("A picker without image"),
            eq(100),
            eq("1.0.0"),
            eq(file_content.as_ref()),
            eq(None)
        )
        .returning(|_, _, _, _, _, _, _| Ok(PickerDetail {
            id: 4,
            alias: "no-image-picker".to_string(),
            description: "A picker without image".to_string(),
            size: 100,
            version: "1.0.0".to_string(),
            creator_id: 1,
            created_at: "2023-01-06T10:00:00Z".to_string(),
            updated_at: "2023-01-06T10:00:00Z".to_string(),
            content: "console.log('Uploaded picker without image');".to_string(),
            image_url: None,
        }));
    
    // 调用upload_picker函数，不提供图片
    let result = upload_picker(
        Box::new(mock_api_client),
        "no-image-picker",
        "A picker without image",
        file_content.to_vec(),
        None,
        "test_token"
    ).await;
    
    // 验证结果
    assert!(result.is_ok());
    let picker = result.unwrap();
    assert_eq!(picker.id, 4);
    assert_eq!(picker.alias, "no-image-picker");
    assert!(picker.image_url.is_none());
}

#[tokio::test]
async fn test_upload_picker_api_error() {
    // 准备上传文件内容
    let file_content = b"console.log('This will fail');";
    
    // 配置模拟ApiClient返回错误
    let mut mock_api_client = MockApiClient::new();
    mock_api_client.expect_upload_file()
        .with(
            eq("/api/pickers"),
            eq("error-picker"),
            eq("A picker that will fail"),
            eq(100),
            eq("1.0.0"),
            eq(file_content.as_ref()),
            eq(None)
        )
        .returning(|_, _, _, _, _, _, _| Err(ApiError::ValidationError("Invalid picker content".to_string())));
    
    // 调用upload_picker函数
    let result = upload_picker(
        Box::new(mock_api_client),
        "error-picker",
        "A picker that will fail",
        file_content.to_vec(),
        None,
        "test_token"
    ).await;
    
    // 验证结果
    assert!(result.is_err());
    assert!(result.err().unwrap().contains("Failed to upload picker"));
}