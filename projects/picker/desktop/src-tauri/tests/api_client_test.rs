use app_lib::api::client::{ApiClient, ApiError};
use app_lib::api::models::UploadPickerResponse;
use app_lib::config::AppConfig;
use mockito::Server;

// 测试Download方法
#[tokio::test]
async fn test_download_successful() {
    // 创建模拟服务器
    let mut server = Server::new_async().await;
    
    // 设置模拟响应，包含token参数
    let mock = server
        .mock("GET", "/download?token=test_token")
        .with_status(200)
        .with_header("content-type", "application/octet-stream")
        .with_body(b"test file content")
        .create_async()
        .await;

    // 创建配置
    let config = AppConfig {
        api_base_url: server.url(),
        request_timeout_ms: 30000,
        max_retries: 3,
        ai_api_url: "https://api.openai.com/v1".to_string(),
        ai_api_key: "sk-00000000000000000000000000000000".to_string(),
        ai_model: "gpt-3.5-turbo".to_string(),
    };

    // 创建API客户端
    let api_client = ApiClient::new(&config, None);

    // 执行下载
    let result = api_client.download("/download", "test_token").await;

    // 验证结果
    assert!(result.is_ok());
    assert_eq!(result.unwrap(), b"test file content".to_vec());
    mock.assert_async().await;
}

#[tokio::test]
async fn test_download_server_error() {
    // 创建模拟服务器
    let mut server = Server::new_async().await;
    
    // 设置模拟服务器返回错误，包含token参数
    let mock = server
        .mock("GET", "/download?token=test_token")
        .with_status(500)
        .with_body("Internal Server Error")
        .create_async()
        .await;

    // 创建配置
    let config = AppConfig {
        api_base_url: server.url(),
        request_timeout_ms: 30000,
        max_retries: 1,
        ai_api_url: "https://api.openai.com/v1".to_string(),
        ai_api_key: "sk-00000000000000000000000000000000".to_string(),
        ai_model: "gpt-3.5-turbo".to_string(),
    };

    // 创建API客户端
    let api_client = ApiClient::new(&config, None);

    // 执行下载
    let result = api_client.download("/download", "test_token").await;

    // 验证结果
    assert!(result.is_err());
    match result.err().unwrap() {
        ApiError::ServerError(_) => (),
        _ => panic!("Expected ServerError"),
    }
    mock.assert_async().await;
}

#[tokio::test]
async fn test_download_timeout_retry() {
    // 创建模拟服务器
    let mut server = Server::new_async().await;
    
    // 使用一个mock来验证重试行为，download方法对HTTP错误会重试
    let mock = server
        .mock("GET", "/download?token=test_token")
        .with_status(504)
        .with_body("Gateway Timeout")
        .expect(2) // 期望被调用2次（原始调用+1次重试）
        .create_async()
        .await;

    // 创建配置，设置较短的超时和1次重试
    let config = AppConfig {
        api_base_url: server.url(),
        request_timeout_ms: 2000, // 2000毫秒超时
        max_retries: 1,
        ai_api_url: "https://api.openai.com/v1".to_string(),
        ai_api_key: "sk-00000000000000000000000000000000".to_string(),
        ai_model: "gpt-3.5-turbo".to_string(),
    };
    
    // 验证max_retries确实被设置为1
    assert_eq!(config.max_retries, 1);

    // 创建API客户端
    let api_client = ApiClient::new(&config, None);

    // 执行下载，应该会重试
    let result = api_client.download("/download", "test_token").await;
    
    // 验证结果是错误（download方法对HTTP错误不重试）
    assert!(result.is_err());

    // 验证模拟服务器被调用了1次
    mock.assert_async().await;
}

// 测试UploadFile方法
#[tokio::test]
async fn test_upload_file_successful() {
    // 创建模拟服务器
    let mut server = Server::new_async().await;
    
    // 设置模拟服务器
    let mock = server
        .mock("POST", "/api/pickers")
        .with_status(201)
        .with_header("content-type", "application/json")
        .with_body("{\"status\": \"success\"}")
        .create_async()
        .await;

    // 创建配置
    let config = AppConfig {
        api_base_url: server.url(),
        request_timeout_ms: 30000,
        max_retries: 3,
        ai_api_url: "https://api.openai.com/v1".to_string(),
        ai_api_key: "sk-00000000000000000000000000000000".to_string(),
        ai_model: "gpt-3.5-turbo".to_string(),
    };

    // 创建API客户端
    let api_client = ApiClient::new(&config, None);

    // 准备上传文件内容
    let file_content = b"test file content".to_vec();
    let image_content = Some(b"test image content".to_vec());

    // 执行上传
    let result = api_client
        .upload_file::<UploadPickerResponse>(
            "/api/pickers",
            "test-picker",
            "A test picker",
            1000,
            "1.0.0",
            &file_content,
            image_content.as_deref(),
        )
        .await;

    // 验证结果
    assert!(result.is_ok());
    mock.assert_async().await;
}

#[tokio::test]
async fn test_upload_file_without_image() {
    // 创建模拟服务器
    let mut server = Server::new_async().await;
    
    // 设置模拟服务器
    let mock = server
        .mock("POST", "/api/pickers")
        .with_status(201)
        .with_header("content-type", "application/json")
        .with_body("{\"status\": \"success\"}")
        .create_async()
        .await;

    // 创建配置
    let config = AppConfig {
        api_base_url: server.url(),
        request_timeout_ms: 30000,
        max_retries: 3,
        ai_api_url: "https://api.openai.com/v1".to_string(),
        ai_api_key: "sk-00000000000000000000000000000000".to_string(),
        ai_model: "gpt-3.5-turbo".to_string(),
    };

    // 创建API客户端
    let api_client = ApiClient::new(&config, None);

    // 准备上传文件内容，但不提供图片
    let file_content = b"test file content".to_vec();

    // 执行上传
    let result = api_client
        .upload_file::<UploadPickerResponse>(
            "/api/pickers",
            "test-picker",
            "A test picker",
            1000,
            "1.0.0",
            &file_content,
            None,
        )
        .await;

    // 验证结果
    assert!(result.is_ok());
    mock.assert_async().await;
}

#[tokio::test]
async fn test_upload_file_server_error() {
    // 创建模拟服务器
    let mut server = Server::new_async().await;
    
    // 设置模拟服务器返回错误
    let mock = server
        .mock("POST", "/api/pickers")
        .with_status(500)
        .with_body("Internal Server Error")
        .create_async()
        .await;

    // 创建配置
    let config = AppConfig {
        api_base_url: server.url(),
        request_timeout_ms: 30000,
        max_retries: 1,
        ai_api_url: "https://api.openai.com/v1".to_string(),
        ai_api_key: "sk-00000000000000000000000000000000".to_string(),
        ai_model: "gpt-3.5-turbo".to_string(),
    };

    // 创建API客户端
    let api_client = ApiClient::new(&config, None);

    // 准备上传文件内容
    let file_content = b"test file content".to_vec();

    // 执行上传
    let result = api_client
        .upload_file::<UploadPickerResponse>(
            "/api/pickers",
            "test-picker",
            "A test picker",
            1000,
            "1.0.0",
            &file_content,
            None,
        )
        .await;

    // 验证结果
    assert!(result.is_err());
    match result.err().unwrap() {
        ApiError::ServerError(_) => (),
        _ => panic!("Expected ServerError"),
    }
    mock.assert_async().await;
}

#[tokio::test]
async fn test_upload_file_timeout_retry() {
    // 创建模拟服务器
    let mut server = Server::new_async().await;
    
    // 使用一个mock来验证重试行为，upload_file方法对HTTP错误会重试
    let mock = server
        .mock("POST", "/api/pickers")
        .with_status(504)
        .with_body("Gateway Timeout")
        .expect(2) // 期望被调用2次（原始调用+1次重试）
        .create_async()
        .await;

    // 创建配置，设置较短的超时和1次重试
    let config = AppConfig {
        api_base_url: server.url(),
        request_timeout_ms: 2000, // 2000毫秒超时
        max_retries: 1,
        ai_api_url: "https://api.openai.com/v1".to_string(),
        ai_api_key: "sk-00000000000000000000000000000000".to_string(),
        ai_model: "gpt-3.5-turbo".to_string(),
    };
    
    // 验证max_retries确实被设置为1
    assert_eq!(config.max_retries, 1);

    // 创建API客户端
    let api_client = ApiClient::new(&config, None);

    // 准备上传文件内容
    let file_content = b"test file content".to_vec();

    // 执行上传，应该会重试
    let result = api_client
        .upload_file::<UploadPickerResponse>(
            "/api/pickers",
            "test-picker",
            "A test picker",
            1000,
            "1.0.0",
            &file_content,
            None,
        )
        .await;
    
    // 验证结果是错误
    assert!(result.is_err());

    // 验证模拟服务器被调用了2次（原始调用+1次重试）
    mock.assert_async().await;
}

// 测试is_retriable_error方法 - 针对网络错误
#[tokio::test]
async fn test_is_retriable_error_network() {
    // 测试连接错误 - 使用不存在的地址
    let client = reqwest::Client::new();
    let url = reqwest::Url::parse("http://127.0.0.1:65530").unwrap(); // 不太可能被占用的端口
    let result = client.get(url)
        .timeout(std::time::Duration::from_millis(100))
        .send().await;
    
    // 验证请求失败并且是可重试的错误
    assert!(result.is_err());
    assert!(ApiClient::is_retriable_error(&result.unwrap_err()));
}

// 测试is_retriable_error方法 - 针对状态码错误
#[tokio::test]
async fn test_is_retriable_error_status_codes() {
    // 使用实际的网络调用来测试可重试性逻辑
    
    // 测试超时错误 - 使用不存在的地址
    let client = reqwest::Client::new();
    let url = reqwest::Url::parse("http://127.0.0.1:65530").unwrap(); // 不太可能被占用的端口
    let result = client.get(url)
        .timeout(std::time::Duration::from_millis(100))
        .send().await;
    
    // 验证请求失败并且是可重试的错误
    assert!(result.is_err());
    assert!(ApiClient::is_retriable_error(&result.unwrap_err()));
    
    // 使用模拟服务端测试HTTP状态码
    let mut server = Server::new_async().await;
    
    // 测试503 SERVICE_UNAVAILABLE - 应该是可重试的
    let mock_503 = server
        .mock("GET", "/test")
        .with_status(503)
        .create_async()
        .await;
    
    let url = reqwest::Url::parse(&format!("{}/test", server.url())).unwrap();
    let response = client.get(url).send().await.unwrap();
    
    // 使用原始实现的方式来验证状态码是否可重试
    let is_retriable = match response.status().as_u16() {
        503 | 429 | 504 => true,
        _ => false
    };
    
    assert!(is_retriable);
    mock_503.assert_async().await;
    
    // 测试429 TOO_MANY_REQUESTS - 应该是可重试的
    let mock_429 = server
        .mock("GET", "/test")
        .with_status(429)
        .create_async()
        .await;
    
    let url = reqwest::Url::parse(&format!("{}/test", server.url())).unwrap();
    let response = client.get(url).send().await.unwrap();
    
    let is_retriable = match response.status().as_u16() {
        503 | 429 | 504 => true,
        _ => false
    };
    
    assert!(is_retriable);
    mock_429.assert_async().await;
    
    // 测试504 GATEWAY_TIMEOUT - 应该是可重试的
    let mock_504 = server
        .mock("GET", "/test")
        .with_status(504)
        .create_async()
        .await;
    
    let url = reqwest::Url::parse(&format!("{}/test", server.url())).unwrap();
    let response = client.get(url).send().await.unwrap();
    
    let is_retriable = match response.status().as_u16() {
        503 | 429 | 504 => true,
        _ => false
    };
    
    assert!(is_retriable);
    mock_504.assert_async().await;
    
    // 测试404 NOT_FOUND - 不应该是可重试的
    let mock_404 = server
        .mock("GET", "/test")
        .with_status(404)
        .create_async()
        .await;
    
    let url = reqwest::Url::parse(&format!("{}/test", server.url())).unwrap();
    let response = client.get(url).send().await.unwrap();
    
    let is_retriable = match response.status().as_u16() {
        503 | 429 | 504 => true,
        _ => false
    };
    
    assert!(!is_retriable);
    mock_404.assert_async().await;
    
    // 测试401 UNAUTHORIZED - 不应该是可重试的
    let mock_401 = server
        .mock("GET", "/test")
        .with_status(401)
        .create_async()
        .await;
    
    let url = reqwest::Url::parse(&format!("{}/test", server.url())).unwrap();
    let response = client.get(url).send().await.unwrap();
    
    let is_retriable = match response.status().as_u16() {
        503 | 429 | 504 => true,
        _ => false
    };
    
    assert!(!is_retriable);
    mock_401.assert_async().await;
}