// 区块链合约接口命令

use crate::api::client::ApiClient;
use crate::config::AppConfig;
use crate::utils::auth::AuthManager;
use tauri::State;
use serde::{Deserialize, Serialize};

// 请求和响应模型定义

#[derive(Debug, Serialize, Deserialize)]
pub struct IsOperatorQuery {
    pub address: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct IsOperatorResponse {
    pub is_operator: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QueryPickerByWalletQuery {
    pub wallet: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QueryPickerByWalletResponse {
    pub picker_id: Option<String>,
    pub dev_user_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RegisterPickerRequest {
    pub picker_id: String,
    pub dev_user_id: String,
    pub dev_wallet_address: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RegisterPickerResponse {
    pub success: bool,
    pub tx_hash: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RemovePickerRequest {
    pub picker_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RemovePickerResponse {
    pub success: bool,
    pub tx_hash: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BlockchainPickerInfo {
    pub picker_id: String,
    pub dev_user_id: String,
    pub dev_wallet_address: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GetAllPickersResponse {
    pub pickers: Vec<BlockchainPickerInfo>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GrantOperatorRoleRequest {
    pub operator_address: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GrantOperatorRoleResponse {
    pub success: bool,
    pub tx_hash: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GetAllOperatorsResponse {
    pub operators: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RevokeOperatorRoleRequest {
    pub operator_address: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RevokeOperatorRoleResponse {
    pub success: bool,
    pub tx_hash: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WithdrawFundsRequest {
    pub recipient_address: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WithdrawFundsResponse {
    pub success: bool,
    pub tx_hash: String,
}

// Tauri 命令实现

// 检查地址是否为操作员
#[tauri::command]
pub async fn is_picker_operator(
    address: String,
) -> Result<IsOperatorResponse, String> {
    println!("Tauri Backend: Received is_picker_operator call with address: {}", address);
    
    let config = AppConfig::load().unwrap_or_else(|_| AppConfig::default());
    println!("Tauri Backend: Loaded config");
    
    let api_client = ApiClient::new(&config, None);
    println!("Tauri Backend: Created API client");
    
    let query = IsOperatorQuery { address };
    println!("Tauri Backend: Created query with address: {}", query.address);
    
    let result = api_client.get("/api/pickers/is-operator", Some(&[("address", query.address.as_str())].iter().cloned().collect()))
        .await
        .map_err(|e| {
            println!("Tauri Backend: Error calling API: {}", e);
            e.to_string()
        });
        
    println!("Tauri Backend: API call result: {:?}", result);
    result
}

// 通过钱包地址查询 Picker
#[tauri::command]
pub async fn query_picker_by_wallet(
    wallet: String,
) -> Result<QueryPickerByWalletResponse, String> {
    println!("Tauri Backend: Received query_picker_by_wallet call with wallet: {}", wallet);
    
    let config = AppConfig::load().unwrap_or_else(|_| AppConfig::default());
    println!("Tauri Backend: Loaded config");
    
    let api_client = ApiClient::new(&config, None);
    println!("Tauri Backend: Created API client");
    
    let query = QueryPickerByWalletQuery { wallet };
    println!("Tauri Backend: Created query with wallet: {}", query.wallet);
    
    let result = api_client.get("/api/pickers/query-picker-by-wallet", Some(&[("wallet", query.wallet.as_str())].iter().cloned().collect()))
        .await
        .map_err(|e| {
            println!("Tauri Backend: Error calling API: {}", e);
            e.to_string()
        });
        
    println!("Tauri Backend: API call result: {:?}", result);
    result
}

// 注册新的 Picker
#[tauri::command]
pub async fn register_picker(
    picker_id: String,
    dev_user_id: String,
    dev_wallet_address: String,
    auth_manager: State<'_, AuthManager>,
) -> Result<RegisterPickerResponse, String> {
    println!("Tauri Backend: Received register_picker call with picker_id: {}, dev_user_id: {}, dev_wallet_address: {}", picker_id, dev_user_id, dev_wallet_address);
    
    let config = AppConfig::load().unwrap_or_else(|_| AppConfig::default());
    println!("Tauri Backend: Loaded config");
    
    let api_client = ApiClient::new(&config, Some(auth_manager.inner().clone()));
    println!("Tauri Backend: Created API client with auth");
    
    let payload = RegisterPickerRequest {
        picker_id,
        dev_user_id,
        dev_wallet_address,
    };
    println!("Tauri Backend: Created payload: {:?}", payload);
    
    let result = api_client.post("/api/pickers/register-picker", &payload)
        .await
        .map_err(|e| {
            println!("Tauri Backend: Error calling API: {}", e);
            e.to_string()
        });
        
    println!("Tauri Backend: API call result: {:?}", result);
    result
}

// 移除 Picker
#[tauri::command]
pub async fn remove_picker(
    picker_id: String,
    auth_manager: State<'_, AuthManager>,
) -> Result<RemovePickerResponse, String> {
    println!("Tauri Backend: Received remove_picker call with picker_id: {}", picker_id);
    
    let config = AppConfig::load().unwrap_or_else(|_| AppConfig::default());
    println!("Tauri Backend: Loaded config");
    
    let api_client = ApiClient::new(&config, Some(auth_manager.inner().clone()));
    println!("Tauri Backend: Created API client with auth");
    
    let payload = RemovePickerRequest { picker_id };
    println!("Tauri Backend: Created payload: {:?}", payload);
    
    let result = api_client.post("/api/pickers/remove-picker", &payload)
        .await
        .map_err(|e| {
            println!("Tauri Backend: Error calling API: {}", e);
            e.to_string()
        });
        
    println!("Tauri Backend: API call result: {:?}", result);
    result
}

// 获取所有 Pickers
#[tauri::command]
pub async fn get_all_pickers(
    auth_manager: State<'_, AuthManager>,
) -> Result<GetAllPickersResponse, String> {
    let config = AppConfig::load().unwrap_or_else(|_| AppConfig::default());
    let api_client = ApiClient::new(&config, Some(auth_manager.inner().clone()));
    
    api_client.get("/api/pickers/get-all-pickers", None)
        .await
        .map_err(|e| e.to_string())
}

// 获取所有操作员
#[tauri::command]
pub async fn get_all_operators(
    auth_manager: State<'_, AuthManager>,
) -> Result<GetAllOperatorsResponse, String> {
    let config = AppConfig::load().unwrap_or_else(|_| AppConfig::default());
    let api_client = ApiClient::new(&config, Some(auth_manager.inner().clone()));
    
    api_client.get("/api/pickers/get-all-operators", None)
        .await
        .map_err(|e| e.to_string())
}

// 授予操作员角色
#[tauri::command]
pub async fn grant_operator_role(
    operator_address: String,
    auth_manager: State<'_, AuthManager>,
) -> Result<GrantOperatorRoleResponse, String> {
    println!("Tauri Backend: Received grant_operator_role call with operator_address: {}", operator_address);
    
    let config = AppConfig::load().unwrap_or_else(|_| AppConfig::default());
    println!("Tauri Backend: Loaded config");
    
    let api_client = ApiClient::new(&config, Some(auth_manager.inner().clone()));
    println!("Tauri Backend: Created API client with auth");
    
    let payload = GrantOperatorRoleRequest { operator_address };
    println!("Tauri Backend: Created payload: {:?}", payload);
    
    let result = api_client.post("/api/pickers/grant-operator-role", &payload)
        .await
        .map_err(|e| {
            println!("Tauri Backend: Error calling API: {}", e);
            e.to_string()
        });
        
    println!("Tauri Backend: API call result: {:?}", result);
    result
}

// 撤销操作员角色
#[tauri::command]
pub async fn revoke_operator_role(
    operator_address: String,
    auth_manager: State<'_, AuthManager>,
) -> Result<RevokeOperatorRoleResponse, String> {
    println!("Tauri Backend: Received revoke_operator_role call with operator_address: {}", operator_address);
    
    let config = AppConfig::load().unwrap_or_else(|_| AppConfig::default());
    println!("Tauri Backend: Loaded config");
    
    let api_client = ApiClient::new(&config, Some(auth_manager.inner().clone()));
    println!("Tauri Backend: Created API client with auth");
    
    let payload = RevokeOperatorRoleRequest { operator_address };
    println!("Tauri Backend: Created payload: {:?}", payload);
    
    let result = api_client.post("/api/pickers/revoke-operator-role", &payload)
        .await
        .map_err(|e| {
            println!("Tauri Backend: Error calling API: {}", e);
            e.to_string()
        });
        
    println!("Tauri Backend: API call result: {:?}", result);
    result
}

// 提取资金
#[tauri::command]
pub async fn withdraw_funds(
    recipient_address: String,
    auth_manager: State<'_, AuthManager>,
) -> Result<WithdrawFundsResponse, String> {
    let config = AppConfig::load().unwrap_or_else(|_| AppConfig::default());
    let api_client = ApiClient::new(&config, Some(auth_manager.inner().clone()));
    
    let payload = WithdrawFundsRequest { recipient_address };
    
    api_client.post("/api/pickers/withdraw-funds", &payload)
        .await
        .map_err(|e| e.to_string())
}
