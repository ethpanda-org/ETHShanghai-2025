use app_lib::commands::download::download_picker;
use app_lib::api::client::ApiClient;
use app_lib::api::models::*;
use mockall::predicate::*;
use mockall::*;
use tauri::AppHandle;
use std::path::PathBuf;
use tempfile::tempdir;

// 模拟ApiClient
mock! {
    pub ApiClient {
        pub async fn download(&self, endpoint: &str, token: &str) -> Result<Vec<u8>, ApiError>;
        pub async fn get_picker_detail(&self, picker_id: i64, token: &str) -> Result<PickerDetail, ApiError>;
    }
}

// 模拟AppHandle
mock! {
    pub AppHandle {
        pub path_resolver(&self) -> tauri::PathResolver;
    }
}

// 模拟PathResolver
mock! {
    pub PathResolver {
        pub app_data_dir(&self) -> std::result::Result<PathBuf, std::io::Error>;
    }
}

// 模拟实现AppHandle的path_resolver方法
impl AppHandle {
    pub fn path_resolver(&self) -> MockPathResolver {
        MockPathResolver::new()
    }
}

#[tokio::test]
async fn test_download_picker_success() {
    // 创建临时目录作为下载目录
    let temp_dir = tempdir().unwrap();
    let download_path = temp_dir.path().to_path_buf();
    
    // 配置模拟ApiClient
    let mut mock_api_client = MockApiClient::new();
    mock_api_client.expect_get_picker_detail()
        .with(eq(1), eq("test_token"))
        .returning(|_, _| Ok(PickerDetail {
            id: 1,
            alias: "test-picker".to_string(),
            description: "A test picker".to_string(),
            size: 1000,
            version: "1.0.0".to_string(),
            creator_id: 101,
            created_at: "2023-01-01T10:00:00Z".to_string(),
            updated_at: "2023-01-02T10:00:00Z".to_string(),
            content: "test content".to_string(),
            image_url: None,
        }));
    mock_api_client.expect_download()
        .with(eq("/api/pickers/1/download"), eq("test_token"))
        .returning(|_, _| Ok(b"test file content".to_vec()));
    
    // 配置模拟AppHandle
    let mock_app = MockAppHandle::new();
    
    // 调用download_picker函数
    let result = download_picker(
        &mock_app,
        Box::new(mock_api_client),
        download_path.to_str().unwrap(),
        1,
        "test_token"
    ).await;
    
    // 验证结果
    assert!(result.is_ok());
    let downloaded_path = result.unwrap();
    assert!(downloaded_path.contains("test-picker"));
    assert!(std::path::Path::new(&downloaded_path).exists());
}

#[tokio::test]
async fn test_download_picker_api_error() {
    // 创建临时目录作为下载目录
    let temp_dir = tempdir().unwrap();
    let download_path = temp_dir.path().to_path_buf();
    
    // 配置模拟ApiClient返回错误
    let mut mock_api_client = MockApiClient::new();
    mock_api_client.expect_get_picker_detail()
        .with(eq(1), eq("test_token"))
        .returning(|_, _| Err(ApiError::ServerError("Server error".to_string())));
    
    // 配置模拟AppHandle
    let mock_app = MockAppHandle::new();
    
    // 调用download_picker函数
    let result = download_picker(
        &mock_app,
        Box::new(mock_api_client),
        download_path.to_str().unwrap(),
        1,
        "test_token"
    ).await;
    
    // 验证结果
    assert!(result.is_err());
    assert!(result.err().unwrap().contains("Failed to get picker details"));
}

#[tokio::test]
async fn test_download_picker_cannot_get_download_dir() {
    // 配置模拟ApiClient
    let mock_api_client = MockApiClient::new();
    
    // 配置模拟AppHandle
    let mock_app = MockAppHandle::new();
    
    // 调用download_picker函数，但提供无效的下载目录
    let result = download_picker(
        &mock_app,
        Box::new(mock_api_client),
        "/path/that/does/not/exist",
        1,
        "test_token"
    ).await;
    
    // 验证结果
    assert!(result.is_err());
    assert!(result.err().unwrap().contains("Failed to create download directory"));
}

#[tokio::test]
async fn test_download_picker_file_creation_error() {
    // 创建临时目录作为下载目录
    let temp_dir = tempdir().unwrap();
    let download_path = temp_dir.path().to_path_buf();
    
    // 配置模拟ApiClient
    let mut mock_api_client = MockApiClient::new();
    mock_api_client.expect_get_picker_detail()
        .with(eq(1), eq("test_token"))
        .returning(|_, _| Ok(PickerDetail {
            id: 1,
            alias: "test-picker".to_string(),
            description: "A test picker".to_string(),
            size: 1000,
            version: "1.0.0".to_string(),
            creator_id: 101,
            created_at: "2023-01-01T10:00:00Z".to_string(),
            updated_at: "2023-01-02T10:00:00Z".to_string(),
            content: "test content".to_string(),
            image_url: None,
        }));
    
    // 配置模拟ApiClient返回空内容（导致写入文件错误）
    mock_api_client.expect_download()
        .with(eq("/api/pickers/1/download"), eq("test_token"))
        .returning(|_, _| Ok(vec![]));
    
    // 配置模拟AppHandle
    let mock_app = MockAppHandle::new();
    
    // 调用download_picker函数
    let result = download_picker(
        &mock_app,
        Box::new(mock_api_client),
        download_path.to_str().unwrap(),
        1,
        "test_token"
    ).await;
    
    // 验证结果
    assert!(result.is_ok()); // 即使文件内容为空，函数也应该返回成功，只是创建了空文件
    let downloaded_path = result.unwrap();
    assert!(downloaded_path.contains("test-picker"));
    assert!(std::path::Path::new(&downloaded_path).exists());
}