// 订单相关命令

use crate::api::client::ApiClient;
use crate::api::models::{CreateOrderRequest, OrderInfo, OrderListResponse, CreateOrderResponse};
use crate::config::AppConfig;
use crate::utils::auth::AuthManager;
use std::collections::HashMap;
use tauri::State;

// 获取用户订单列表命令
#[tauri::command]
pub async fn get_user_orders(
    page: Option<u32>,
    size: Option<u32>,
    status: Option<String>,
    auth_manager: State<'_, AuthManager>,
) -> Result<OrderListResponse, String> {
    let config = AppConfig::load().unwrap_or_else(|_| AppConfig::default());
    let api_client = ApiClient::new(&config, Some(auth_manager.inner().clone()));
    
    // 创建一个包含 String 的 HashMap
    let mut owned_params = HashMap::new();
    if let Some(p) = page {
        owned_params.insert("page".to_string(), p.to_string());
    }
    if let Some(s) = size {
        owned_params.insert("size".to_string(), s.to_string());
    }
    if let Some(s) = status {
        owned_params.insert("status".to_string(), s);
    }
    
    // 转换为 &str 引用
    let mut str_params = HashMap::new();
    for (k, v) in &owned_params {
        str_params.insert(&**k, &**v);
    }
    
    api_client.get("/api/orders", Some(&str_params)).await.map_err(|e| e.to_string())
}

// 创建订单命令
#[tauri::command]
pub async fn create_order(
    picker_id: String,
    pay_type: String,
    auth_manager: State<'_, AuthManager>,
) -> Result<CreateOrderResponse, String> {
    let config = AppConfig::load().unwrap_or_else(|_| AppConfig::default());
    let api_client = ApiClient::new(&config, Some(auth_manager.inner().clone()));
    
    let pay_type_enum = if pay_type.to_lowercase() == "wallet" {
        crate::api::models::PayType::Wallet
    } else {
        crate::api::models::PayType::Premium
    };
    
    let request = CreateOrderRequest {
        picker_id,
        pay_type: pay_type_enum,
    };
    
    api_client.post("/api/orders", &request).await.map_err(|e| e.to_string())
}

// 获取订单详情命令
#[tauri::command]
pub async fn get_order_detail(
    order_id: String,
    auth_manager: State<'_, AuthManager>,
) -> Result<OrderInfo, String> {
    let config = AppConfig::load().unwrap_or_else(|_| AppConfig::default());
    let api_client = ApiClient::new(&config, Some(auth_manager.inner().clone()));
    
    let path = format!("/api/orders/{}", order_id);
    api_client.get(&path, None).await.map_err(|e| e.to_string())
}