// Picker 相关命令

use crate::api::client::ApiClient;
use crate::api::models::{ApiError, PickerListResponse, UploadPickerResponse};
use crate::config::AppConfig;
use crate::utils::auth::AuthManager;
use std::collections::HashMap;
use tauri::State;
use log::error;

// 获取 Picker 市场列表命令
#[tauri::command]
pub async fn get_picker_marketplace(
    page: Option<u32>,
    size: Option<u32>,
    keyword: Option<String>,
) -> Result<PickerListResponse, String> {
    let config = AppConfig::load().unwrap_or_else(|_| AppConfig::default());
    let api_client = ApiClient::new(&config, None);
    
    // 创建一个包含 String 的 HashMap
    let mut owned_params = HashMap::new();
    if let Some(p) = page {
        owned_params.insert("page".to_string(), p.to_string());
    }
    if let Some(s) = size {
        owned_params.insert("size".to_string(), s.to_string());
    }
    if let Some(k) = keyword {
        owned_params.insert("keyword".to_string(), k);
    }
    
    // 转换为 &str 引用
    let mut str_params = HashMap::new();
    for (k, v) in &owned_params {
        str_params.insert(&**k, &**v);
    }
    
    api_client.get("/api/pickers", Some(&str_params)).await.map_err(|e| e.to_string())
}

// 获取 Picker 详情命令
#[tauri::command]
pub async fn simple_connection_test(name: String) -> Result<String, String> {
    Ok(format!("Connection test successful123, name: {}", name))
}

#[tauri::command]
pub async fn get_picker_detail(
    picker_id: String,
) -> Result<String, String> {
    // Ok(format!("Connection test successful123, picker_id: {}", picker_id))
    // return Ok(picker_id);
    // 加载配置
    let config = match AppConfig::load() {
        Ok(config) => {
            config
        },
        Err(err) => {
            error!("Error loading config: {:?}", err);
            let default_config = AppConfig::default();
            default_config
        }
    };
    
    let api_client = ApiClient::new(&config, None);
    let path = format!("/api/pickers/{}", picker_id);
    
    // 使用更详细的错误处理
    match api_client.get(&path, None).await {
        Ok(response) => {
            Ok(response)
        },
        Err(err) => {
            // 返回更具体的错误信息
            match err {
                ApiError::ValidationError(e) => Err(format!("Validation error: {}", e)),
                ApiError::NetworkError(e) => Err(format!("Network error: {:?}", e)),
                ApiError::ServerError(e) => Err(format!("Server error: {}", e)),
                ApiError::AuthError(e) => Err(format!("Auth error: {}", e)),
                ApiError::NotFound => Err("Resource not found".to_string()),
                ApiError::Unknown => Err("Unknown error".to_string()),
            }
        }
    }
}

// 上传新的 Picker 命令
#[tauri::command]
pub async fn upload_picker(
    alias: String,
    description: String,
    version: String,
    price: i64,
    file: Vec<u8>,
    image: Option<Vec<u8>>,
    auth_manager: State<'_, AuthManager>,
) -> Result<String, String> {
    let config = AppConfig::load().unwrap_or_else(|_| AppConfig::default());
    let api_client = ApiClient::new(&config, Some(auth_manager.inner().clone()));
    // 调用文件上传方法 
    let upload_response: UploadPickerResponse = api_client.upload_file(
        "/api/pickers",
        &alias,
        &description,
        price,
        &version,
        &file,
        image.as_deref()
    ).await.map_err(|e| e.to_string())?;
    
    Ok(upload_response.message)
}

#[tauri::command]
pub async fn delete_picker(
    picker_id: String,
    auth_manager: State<'_, AuthManager>,
) -> Result<String, String> {
    let config = AppConfig::load().unwrap_or_else(|_| AppConfig::default());
    let api_client = ApiClient::new(&config, Some(auth_manager.inner().clone()));
    
    // 构建API路径
    let path = format!("/api/pickers/{}", picker_id);
    
    // 调用API客户端的delete方法
    match api_client.delete::<String>(&path).await {
        Ok(response) => Ok(response),
        Err(err) => Err(err.to_string())
    }
}

// 后端合约接口命令
