// 用户相关命令

use crate::api::client::ApiClient;
use crate::api::models::UserType;
use crate::api::models::{
    ConnectionStatus, LoginRequest, LoginResponse, RegisterRequest, RegisterResponse, SystemInfo,
    UserInfo, UserSystemInfoResponse, VerifyRequest, VerifyResponse,
};
use crate::config::AppConfig;
use crate::utils::auth::AuthManager;
use alloy::primitives::{Address, Uint};
use alloy::providers::{Provider, ProviderBuilder};
use tauri::State;
use serde::{Deserialize, Serialize};

// #[tauri::command]
// pub async fn simple_connection_test(name: &str) -> Result<String, String> {
//     Ok(format!("Connection test successful123, name: {}", name))
// }

// 健康检查主要命令函数
#[tauri::command]
pub async fn api_connection() -> Result<ConnectionStatus, String> {
    let start_time = std::time::Instant::now();

    // 加载配置
    let config = AppConfig::load().unwrap_or_else(|_| AppConfig::default());
    let api_client = ApiClient::new(&config, None);

    // 测试 API 端点连接 - 使用健康检查端点
    match api_client.get::<String>("/", None).await {
        Ok(response) => {
            let response_time = start_time.elapsed().as_millis() as u64;

            // 尝试从响应中提取服务器状态信息
            let server_message = if response.is_empty() {
                "Server is running, but not message".to_string()
            } else {
                response
            };

            Ok(ConnectionStatus {
                is_connected: true,
                response_time_ms: response_time,
                server_status: server_message, // 使用实际的服务器响应消息
                auth_valid: false,             // 健康检查不需要认证
                error_message: None,
            })
        }
        Err(e) => {
            let response_time = start_time.elapsed().as_millis() as u64;
            Ok(ConnectionStatus {
                is_connected: false,
                response_time_ms: response_time,
                server_status: "Connection Failed".to_string(),
                auth_valid: false,
                error_message: Some(e.to_string()),
            })
        }
    }
}

#[tauri::command]
pub async fn system_info(auth_manager: State<'_, AuthManager>) -> Result<SystemInfo, String> {
    let config = AppConfig::load().unwrap_or_else(|_| AppConfig::default());
    let api_client = ApiClient::new(&config, Some(auth_manager.inner().clone()));

    // 保持与实际实现一致的路径
    let response: SystemInfo = api_client
        .get("/api/users/system_info", None)
        .await
        .map_err(|e| e.to_string())?;
    Ok(response)
}

#[tauri::command]
pub async fn get_wallet_balance(address: Address, chain_url: String) -> Result<i64, String> {
    // 先解析URL并处理错误
    let parsed_url = chain_url
        .parse()
        .map_err(|e| format!("Invalid RPC URL: {}", e))?;

    // 初始化provider
    let provider = ProviderBuilder::new().connect_http(parsed_url);

    // 获取钱包余额
    let balance = provider
        .get_balance(address)
        .await
        .map_err(|e| format!("Failed to get wallet balance: {}", e))?;

    // 转换为i64 - 使用TryInto特质将Uint<256,4>转换为i64
    // 先除以10^9得到gwei单位，避免可能的溢出
    let wallet_balance = match balance.checked_div(Uint::from(1e9 as u64)) {
        Some(value) => match value.try_into() {
            Ok(num) => num,
            Err(_) => 0, // 处理转换失败的情况
        },
        None => 0, // 处理除以零的情况
    };

    Ok(wallet_balance)
}

#[tauri::command]
pub async fn get_max_transferable_balance(address: Address, chain_url: String) -> Result<i64, String> {
    // 先解析URL并处理错误
    let parsed_url = chain_url
        .parse()
        .map_err(|e| format!("Invalid RPC URL: {}", e))?;

    // 初始化provider
    let provider = ProviderBuilder::new().connect_http(parsed_url);

    // 获取钱包余额
    let balance = provider
        .get_balance(address)
        .await
        .map_err(|e| format!("Failed to get wallet balance: {}", e))?;

    // 计算Gas费用 (21000 gas limit * 20 gwei gas price)
    let gas_price = Uint::from(20u64) * Uint::from(1e9 as u64); // 20 gwei in wei
    let gas_limit = Uint::from(21000u64);
    let gas_cost = gas_price * gas_limit;

    // 计算最大可转账余额 (余额 - Gas费用)
    let max_transferable = if balance > gas_cost {
        balance - gas_cost
    } else {
        Uint::from(0u64)
    };

    // 转换为i64 - 使用TryInto特质将Uint<256,4>转换为i64
    // 先除以10^9得到gwei单位，避免可能的溢出
    let wallet_balance = match max_transferable.checked_div(Uint::from(1e9 as u64)) {
        Some(value) => match value.try_into() {
            Ok(num) => num,
            Err(_) => 0, // 处理转换失败的情况
        },
        None => 0, // 处理除以零的情况
    };

    Ok(wallet_balance)
}


// 登录命令 单独定义登录返回信息
#[tauri::command]
pub async fn login(
    email: String,
    user_password: String,
    auth_manager: State<'_, AuthManager>,
) -> Result<UserSystemInfoResponse, String> {
    let config = AppConfig::load().unwrap_or_else(|_| AppConfig::default());
    let api_client = ApiClient::new(&config, None);

    let request = LoginRequest {
        email,
        user_password,
    };

    let login_info_response: LoginResponse = api_client
        .post("/api/users/login", &request)
        .await
        .map_err(|e| e.to_string())?;

    // 保存 token
    auth_manager
        .set_token(&login_info_response.clone().token)
        .map_err(|e| e.to_string())?;

    let system_info_response = system_info(auth_manager.clone())
        .await
        .map_err(|e| e.to_string())?;

    let rpc_url = system_info_response.clone().chain_url;

    // 获取钱包地址
    let address: Address = login_info_response
        .clone()
        .user
        .wallet_address
        .parse()
        .map_err(|e| format!("Invalid wallet address: {}", e))?;

    // 获取钱包余额
    let wallet_balance = get_wallet_balance(address, rpc_url)
        .await
        .map_err(|e| e.to_string())?;

    let response_user_and_system_info = UserSystemInfoResponse {
        wallet_balance,
        user_info: login_info_response.user.clone(),
        system_info: system_info_response.clone(),
    };

    // 保存用户信息
    let user_info_json =
        serde_json::to_value(login_info_response.user).map_err(|e| e.to_string())?;
    auth_manager
        .save_user_info(&user_info_json)
        .map_err(|e| e.to_string())?;
    // 保存系统信息
    let system_info_json = serde_json::to_value(system_info_response).map_err(|e| e.to_string())?;
    auth_manager
        .save_system_info(&system_info_json)
        .map_err(|e| e.to_string())?;

    Ok(response_user_and_system_info)
}

// 注册命令
#[tauri::command]
pub async fn register(
    email: String,
    user_password: String,
    user_name: String,
    user_type: String,
) -> Result<RegisterResponse, String> {
    let config = AppConfig::load().unwrap_or_else(|_| AppConfig::default());
    let api_client = ApiClient::new(&config, None);

    let user_type_enum = if user_type.to_lowercase() == "dev" {
        UserType::Dev
    } else {
        UserType::Gen
    };

    let request = RegisterRequest {
        email,
        user_name,
        user_password,
        user_type: user_type_enum,
    };
    let response: RegisterResponse = api_client
        .post("/api/users/register", &request)
        .await
        .map_err(|e| e.to_string())?;

    Ok(response)
}

// 邮箱验证命令
#[tauri::command]
pub async fn verify_email(email: String, code: String) -> Result<VerifyResponse, String> {
    let config = AppConfig::load().unwrap_or_else(|_| AppConfig::default());
    let api_client = ApiClient::new(&config, None);

    let request = VerifyRequest { email, code };

    let response: VerifyResponse = api_client
        .post("/api/users/verify", &request)
        .await
        .map_err(|e| e.to_string())?;
    Ok(response)
}

// 调用API接口获取用户资料命令  lastest_info
#[tauri::command]
pub async fn get_user_lastest_info(
    auth_manager: State<'_, AuthManager>,
) -> Result<UserInfo, String> {
    let config = AppConfig::load().unwrap_or_else(|_| AppConfig::default());
    let api_client = ApiClient::new(&config, Some(auth_manager.inner().clone()));

    // 保持与实际实现一致的路径
    let response: UserInfo = api_client
        .get("/api/users/profile", None)
        .await
        .map_err(|e| e.to_string())?;
    // 更新用户信息
    let user_info_json = serde_json::to_value(&response).map_err(|e| e.to_string())?;
    auth_manager
        .save_user_info(&user_info_json)
        .map_err(|e| e.to_string())?;

    Ok(response)
}

// 登出命令
#[tauri::command]
pub async fn logout(auth_manager: State<'_, AuthManager>) -> Result<bool, String> {
    auth_manager.clear_token().map_err(|e| e.to_string())?;
    Ok(true)
}

// 检查登录状态命令
#[tauri::command]
pub async fn check_login_status(auth_manager: State<'_, AuthManager>) -> Result<bool, String> {
    Ok(auth_manager.is_logged_in())
}

// 获取登录保存的当前用户信息命令
#[tauri::command]
pub async fn get_current_user_info(
    auth_manager: State<'_, AuthManager>,
) -> Result<Option<serde_json::Value>, String> {
    Ok(auth_manager.get_user_info())
}

// 获取系统信息
#[tauri::command]
pub async fn get_system_info(
    auth_manager: State<'_, AuthManager>,
) -> Result<Option<serde_json::Value>, String> {
    Ok(auth_manager.get_system_info())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TransferToRequest {
    pub to_address: String,
    pub amount: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TransferToResponse {
    pub success: bool,
    pub tx_hash_url: String,
}

#[tauri::command]
pub async fn transfer_to(
    to_address: String,
    amount: String,
    auth_manager: State<'_, AuthManager>,
) -> Result<TransferToResponse, String> {
    let config = AppConfig::load().unwrap_or_else(|_| AppConfig::default());
    let api_client = ApiClient::new(&config, Some(auth_manager.inner().clone()));

    let payload = TransferToRequest {
        to_address,
        amount,
    };
    let response = api_client.post("/api/users/transfer-to", &payload)
        .await
        .map_err(|e| e.to_string());
    response
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReplacePrivateKeyRequest {
    pub old_wallet_address: String,
    pub new_private_key: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReplacePrivateKeyResponse {
    pub message: String,
}

// 实现 replace_private_key 命令，通过调用 /api/users/replace-private-key
#[tauri::command]
pub async fn replace_private_key(
    old_wallet_address: String,
    new_private_key: String,
    auth_manager: State<'_, AuthManager>,
) -> Result<ReplacePrivateKeyResponse, String> {
    let config = AppConfig::load().unwrap_or_else(|_| AppConfig::default());
    let api_client = ApiClient::new(&config, Some(auth_manager.inner().clone()));
    let payload = ReplacePrivateKeyRequest {
        old_wallet_address,
        new_private_key,
    };
    let response = api_client.post("/api/users/replace-private-key", &payload)
        .await
        .map_err(|e| e.to_string());
    response
}
