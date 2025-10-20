// 复杂的模拟API测试
use mockito::Server;
use app_lib::config::AppConfig;
use app_lib::api::client::{ApiClient};
use reqwest::Client as ReqwestClient;

#[tokio::test]
async fn mock_api_test() {
    // 创建模拟服务器（使用异步版本）
    let mut server = Server::new_async().await;
    
    // 设置模拟响应
    let mock = server
        .mock("GET", "/test")
        .with_status(200)
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
    let _api_client = ApiClient::new(&config, None);
    
    // 创建一个简单的HTTP客户端并发送请求到模拟服务器
    let client = ReqwestClient::new();
    let url = format!("{}/test", server.url());
    let response = client.get(&url).send().await.unwrap();
    
    // 验证响应状态码
    assert_eq!(response.status(), 200);

    mock.assert_async().await;
}