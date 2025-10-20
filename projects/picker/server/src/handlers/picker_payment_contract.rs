use axum::{
    extract::{Query, State},
    Extension,
};

use uuid::Uuid;
use serde::{Deserialize, Serialize};
use crate::config::AppState;
use crate::utils::AppError;
use hex;
use std::str::FromStr;

use alloy::primitives::{Address, U256};
use alloy::providers::{Provider, ProviderBuilder};
use utoipa::ToSchema;

#[derive(Deserialize)]
pub struct IsOperatorQuery {
    pub address: String,
}

#[derive(Serialize, utoipa::ToSchema)]
pub struct IsOperatorResponse {
    pub is_operator: bool,
}

// 智能合约方法调用实现
// 实现检查User是否为智能合约 Operator
#[utoipa::path(
    get,
    path = "/api/pickers/is-operator",
    tag = "pickers",
    summary = "Check if the address is an operator",
    description = "Check if the specified blockchain address is an operator of the smart contract",
    params(
        ("address" = String, Query, description = "The blockchain address to check")
    ),
    responses(
        (status = 200, description = "Check successful", body = IsOperatorResponse),
        (status = 400, description = "Bad request", body = crate::openapi::ErrorResponse),
        (status = 500, description = "Internal server error", body = crate::openapi::ErrorResponse),
    )
)]
pub async fn is_picker_operator(
    State(state): State<AppState>,
    Query(query): Query<IsOperatorQuery>,
) -> Result<axum::Json<IsOperatorResponse>, AppError> {
    println!("Check if address is operator");
    // 解析地址参数
    let address: Address = query.address.parse()
        .map_err(|_| AppError::BadRequest("Invalid address format".to_string()))?;

    // 创建合约绑定
    alloy::sol! {
        #[sol(rpc)]
        contract PickerPayment {
            function isOperator(address account) external view returns (bool);
        }
    }

    // 连接到区块链提供商
    let provider = ProviderBuilder::new().connect_http(
        state.blockchain_rpc_url
            .parse()
            .map_err(|e| AppError::InternalServerError(format!("Failed to parse RPC URL: {:?}", e)))?,
    );

    // 解析合约地址
    let contract_address: Address = state
        .blockchain_authorized_contract_address
        .parse()
        .map_err(|e| AppError::InternalServerError(format!("Failed to parse contract address: {:?}", e)))?;
    println!("contract_address = {:?}", contract_address);
    // 创建合约实例
    let contract = PickerPayment::new(contract_address, provider);

    // 调用isOperator方法
    let is_operator = contract
        .isOperator(address)
        .call()
        .await
        .map_err(|e| AppError::InternalServerError(format!("Failed to call isOperator: {:?}", e)))?;
    println!("isOperator({:?}) = {:?}", address, is_operator);
    Ok(axum::Json(IsOperatorResponse { is_operator }))
}

#[derive(Deserialize)]
pub struct QueryPickerByWalletQuery {
    pub wallet: String,
}

#[derive(Serialize, utoipa::ToSchema)]
pub struct QueryPickerByWalletResponse {
    pub picker_id: Option<String>,
    pub dev_user_id: Option<String>,
}

#[derive(Deserialize, utoipa::ToSchema)]
pub struct RegisterPickerRequest {
    pub picker_id: String,
    pub dev_user_id: String,
    pub dev_wallet_address: String,
}

#[derive(Serialize, utoipa::ToSchema)]
pub struct RegisterPickerResponse {
    pub success: bool,
    pub tx_hash: String,
}

// 实现 query_picker_by_wallet
#[utoipa::path(
    get,
    path = "/api/pickers/query-picker-by-wallet",
    tag = "pickers",
    summary = "Query picker by wallet address",
    description = "Query picker information by the specified wallet address",
    params(
        ("wallet" = String, Query, description = "The wallet address to query")
    ),
    responses(
        (status = 200, description = "Query successful", body = QueryPickerByWalletResponse),
        (status = 400, description = "Bad request", body = crate::openapi::ErrorResponse),
        (status = 500, description = "Internal server error", body = crate::openapi::ErrorResponse),
    )
)]
pub async fn query_picker_by_wallet(
    State(state): State<AppState>,
    Query(query): Query<QueryPickerByWalletQuery>,
) -> Result<axum::Json<QueryPickerByWalletResponse>, AppError> {
    // 解析钱包地址参数
    let wallet_address: Address = query.wallet.parse()
        .map_err(|_| AppError::BadRequest("Invalid wallet address format".to_string()))?;

    // 创建合约绑定
    alloy::sol! {
        #[sol(rpc)]
        contract PickerPayment {
            function queryPickerByWallet(address wallet) external view returns (bytes16, bytes16);
        }
    }

    // 连接到区块链提供商
    let provider = ProviderBuilder::new().connect_http(
        state.blockchain_rpc_url
            .parse()
            .map_err(|e| AppError::InternalServerError(format!("Failed to parse RPC URL: {:?}", e)))?,
    );

    // 解析合约地址
    let contract_address: Address = state
        .blockchain_authorized_contract_address
        .parse()
        .map_err(|e| AppError::InternalServerError(format!("Failed to parse contract address: {:?}", e)))?;

    // 创建合约实例
    let contract = PickerPayment::new(contract_address, provider);

    // 调用queryPickerByWallet方法
    let result = contract
        .queryPickerByWallet(wallet_address)
        .call()
        .await
        .map_err(|e| AppError::InternalServerError(format!("Failed to call queryPickerByWallet: {:?}", e)))?;

    // 检查是否找到了picker信息
    let response = if result._0.is_zero() && result._1.is_zero() {
        // 未找到picker信息
        QueryPickerByWalletResponse {
            picker_id: None,
            dev_user_id: None,
        }
    } else {
        // 找到了picker信息
        QueryPickerByWalletResponse {
            picker_id: Some(format!("0x{:x}", result._0)),
            dev_user_id: Some(format!("0x{:x}", result._1)),
        }
    };

    Ok(axum::Json(response))
}

// 实现 register_picker
#[utoipa::path(
    post,
    path = "/api/pickers/register-picker",
    tag = "pickers",
    summary = "Register a new picker",
    description = "Register a new picker with the smart contract",
    request_body = RegisterPickerRequest,
    responses(
        (status = 200, description = "Registration successful", body = RegisterPickerResponse),
        (status = 400, description = "Bad request", body = crate::openapi::ErrorResponse),
        (status = 500, description = "Internal server error", body = crate::openapi::ErrorResponse),
    )
)]
pub async fn register_picker(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    axum::Json(payload): axum::Json<RegisterPickerRequest>,
) -> Result<axum::Json<RegisterPickerResponse>, AppError> {
    // 参数验证
    if payload.dev_wallet_address == "0x0000000000000000000000000000000000000000" {
        return Err(AppError::BadRequest("Zero address not allowed".to_string()));
    }

    // 创建合约绑定
    alloy::sol! {
        #[sol(rpc)]
        contract PickerPayment {
            function registerPicker(bytes16 pickerId, bytes16 devUserId, address devWalletAddress) external;
        }
    }

    // 从数据库查询用户信息，获取加密的私钥
    let user = sqlx::query_as::<_, crate::models::User>(
        "SELECT * FROM users WHERE user_id = ?",
    )
    .bind(user_id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| {
        tracing::error!("Failed to fetch user from database: {:?}", e);
        AppError::NotFound("User not found".to_string())
    })?;

    // 调用 query_picker_by_wallet 检查用户是否已注册了picker 
    let query_response = query_picker_by_wallet(
        State(state.clone()),
        Query(QueryPickerByWalletQuery {
            wallet: payload.dev_wallet_address.clone(),
        }),
    )
    .await?;

    // 检查查询结果是否为空
    if query_response.picker_id.is_some() || query_response.dev_user_id.is_some() {
        return Err(AppError::BadRequest("Picker already registered".to_string()));
    }

    // 检查 user 是否为 Dev 用户
    if user.user_type != crate::models::UserType::Dev {
        return Err(AppError::BadRequest("Only Developer can register pickers".to_string()));
    }

    // 解密用户私钥
    let private_key_plaintext = crate::utils::decrypt_private_key(
        &user.private_key,
        &state.password_master_key,
        &state.password_nonce,
    )
    .map_err(|e| {
        tracing::error!("Decryption to plaintext failed: {:?}", e);
        AppError::InternalServerError(format!("Decryption to plaintext failed: {:?}", e))
    })?;

    // 初始化签名器（使用用户的私钥明文）
    let user_signer: alloy::signers::local::PrivateKeySigner = private_key_plaintext.parse().map_err(|e| {
        tracing::error!("Invalid private key: {}", e);
        AppError::InternalServerError(format!("Invalid private key: {:?}", e))
    })?;

    // 初始化provider
    let provider = ProviderBuilder::new().wallet(user_signer).connect_http(
        state.blockchain_rpc_url.parse().map_err(|e| {
            tracing::error!("Invalid RPC URL: {}", e);
            AppError::InternalServerError(format!("Invalid RPC URL: {:?}", e))
        })?,
    );

    // 准备参数
    let picker_id_bytes = payload.picker_id.as_bytes();
    let dev_user_id_bytes = payload.dev_user_id.as_bytes();

    let picker_id_fixed = alloy::primitives::FixedBytes::from_slice(&picker_id_bytes[0..16]);
    let dev_user_id_fixed = alloy::primitives::FixedBytes::from_slice(&dev_user_id_bytes[0..16]);

    let dev_wallet = payload.dev_wallet_address.parse::<Address>().map_err(|e| {
        tracing::error!("Invalid developer wallet address: {}", e);
        AppError::InternalServerError(format!("Invalid developer wallet address: {:?}", e))
    })?;

    // 配置合约地址
    let contract_address = state
        .blockchain_authorized_contract_address
        .parse()
        .map_err(|e| {
            tracing::error!("Invalid Authorized Contract Address: {}", e);
            AppError::InternalServerError(format!("Invalid Authorized Contract Address: {:?}", e))
        })?;

    // 创建合约实例
    let contract = PickerPayment::new(contract_address, provider);

    // 构建并发送交易
    let pending_tx = contract
        .registerPicker(picker_id_fixed, dev_user_id_fixed, dev_wallet)
        .send()
        .await
        .map_err(|e| {
            tracing::error!("Failed to send transaction: {}", e);
            AppError::InternalServerError(format!("Failed to send transaction: {:?}", e))
        })?;

    // 获取交易哈希字符串
    let tx_hash = format!("0x{}", hex::encode(pending_tx.tx_hash()));

    Ok(axum::Json(RegisterPickerResponse { 
        success: true,
        tx_hash 
    }))
}

#[derive(Deserialize, utoipa::ToSchema)]
pub struct RemovePickerRequest {
    pub picker_id: String,
}

#[derive(Serialize, utoipa::ToSchema)]
pub struct RemovePickerResponse {
    pub success: bool,
    pub tx_hash: String,
}

#[derive(Serialize, utoipa::ToSchema)]
pub struct BlockchainPickerInfo {
    pub picker_id: String,
    pub dev_user_id: String,
    pub dev_wallet_address: String,
}

#[derive(Serialize, utoipa::ToSchema)]
pub struct GetAllPickersResponse {
    pub pickers: Vec<BlockchainPickerInfo>,
}

// 实现 remove_picker
#[utoipa::path(
    post,
    path = "/api/pickers/remove-picker",
    tag = "pickers",
    summary = "Remove a picker",
    description = "Remove a picker from the smart contract",
    request_body = RemovePickerRequest,
    responses(
        (status = 200, description = "Removal successful", body = RemovePickerResponse),
        (status = 400, description = "Bad request", body = crate::openapi::ErrorResponse),
        (status = 500, description = "Internal server error", body = crate::openapi::ErrorResponse),
    )
)]
pub async fn remove_picker(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    axum::Json(payload): axum::Json<RemovePickerRequest>,
) -> Result<axum::Json<RemovePickerResponse>, AppError> {
    // 创建合约绑定
    alloy::sol! {
        #[sol(rpc)]
        contract PickerPayment {
            function removePicker(bytes16 pickerId) external;
        }
    }

    // 从数据库查询用户信息，获取加密的私钥
    let user = sqlx::query_as::<_, crate::models::User>(
        "SELECT * FROM users WHERE user_id = ?",
    )
    .bind(user_id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| {
        tracing::error!("Failed to fetch user from database: {:?}", e);
        AppError::NotFound("User not found".to_string())
    })?;

    // 检查 user 是否为 Dev 用户
    if user.user_type != crate::models::UserType::Dev {
        return Err(AppError::BadRequest("Only Developer can remove pickers".to_string()));
    }

    // 解密用户私钥
    let private_key_plaintext = crate::utils::decrypt_private_key(
        &user.private_key,
        &state.password_master_key,
        &state.password_nonce,
    )
    .map_err(|e| {
        tracing::error!("Decryption to plaintext failed: {:?}", e);
        AppError::InternalServerError(format!("Decryption to plaintext failed: {:?}", e))
    })?;

    // 初始化签名器（使用用户的私钥明文）
    let user_signer: alloy::signers::local::PrivateKeySigner = private_key_plaintext.parse().map_err(|e| {
        tracing::error!("Invalid private key: {}", e);
        AppError::InternalServerError(format!("Invalid private key: {:?}", e))
    })?;

    // 初始化provider
    let provider = ProviderBuilder::new().wallet(user_signer).connect_http(
        state.blockchain_rpc_url.parse().map_err(|e| {
            tracing::error!("Invalid RPC URL: {}", e);
            AppError::InternalServerError(format!("Invalid RPC URL: {:?}", e))
        })?,
    );

    // 准备参数
    let picker_id_bytes = payload.picker_id.as_bytes();
    let picker_id_fixed = alloy::primitives::FixedBytes::from_slice(&picker_id_bytes[0..16]);

    // 配置合约地址
    let contract_address = state
        .blockchain_authorized_contract_address
        .parse()
        .map_err(|e| {
            tracing::error!("Invalid Authorized Contract Address: {}", e);
            AppError::InternalServerError(format!("Invalid Authorized Contract Address: {:?}", e))
        })?;

    // 创建合约实例
    let contract = PickerPayment::new(contract_address, provider);

    // 构建并发送交易
    let pending_tx = contract
        .removePicker(picker_id_fixed)
        .send()
        .await
        .map_err(|e| {
            tracing::error!("Failed to send transaction: {}", e);
            AppError::InternalServerError(format!("Failed to send transaction: {:?}", e))
        })?;

    // 获取交易哈希字符串
    let tx_hash = format!("0x{}", hex::encode(pending_tx.tx_hash()));

    Ok(axum::Json(RemovePickerResponse { 
        success: true,
        tx_hash 
    }))
}

// 实现 get_all_pickers
#[utoipa::path(
    get,
    path = "/api/pickers/get-all-pickers",
    tag = "pickers",
    summary = "Get all pickers",
    description = "Get all pickers from the smart contract",
    responses(
        (status = 200, description = "Query successful", body = GetAllPickersResponse),
        (status = 400, description = "Bad request", body = crate::openapi::ErrorResponse),
        (status = 500, description = "Internal server error", body = crate::openapi::ErrorResponse),
    )
)]
pub async fn get_all_pickers(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
) -> Result<axum::Json<GetAllPickersResponse>, AppError> {
    // 创建合约绑定
    alloy::sol! {
        #[sol(rpc)]
        contract PickerPayment {
            struct Picker {
                bytes16 pickerId;
                bytes16 devUserId;
                address devWalletAddress;
            }
            
            function getAllPickers() external view returns (Picker[] memory);
        }
    }

    // 从数据库查询用户信息，获取加密的私钥
    let user = sqlx::query_as::<_, crate::models::User>(
        "SELECT * FROM users WHERE user_id = ?",
    )
    .bind(user_id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| {
        tracing::error!("Failed to fetch user from database: {:?}", e);
        AppError::NotFound("User not found".to_string())
    })?;

    // 检查 user 是否为 Dev 用户
    if user.user_type != crate::models::UserType::Dev {
        return Err(AppError::BadRequest("Only Developer can query all pickers".to_string()));
    }

    // 解密用户私钥
    let private_key_plaintext = crate::utils::decrypt_private_key(
        &user.private_key,
        &state.password_master_key,
        &state.password_nonce,
    )
    .map_err(|e| {
        tracing::error!("Decryption to plaintext failed: {:?}", e);
        AppError::InternalServerError(format!("Decryption to plaintext failed: {:?}", e))
    })?;

    // 初始化签名器（使用用户的私钥明文）
    let user_signer: alloy::signers::local::PrivateKeySigner = private_key_plaintext.parse().map_err(|e| {
        tracing::error!("Invalid private key: {}", e);
        AppError::InternalServerError(format!("Invalid private key: {:?}", e))
    })?;

    // 初始化provider
    let provider = ProviderBuilder::new().wallet(user_signer).connect_http(
        state.blockchain_rpc_url.parse().map_err(|e| {
            tracing::error!("Invalid RPC URL: {}", e);
            AppError::InternalServerError(format!("Invalid RPC URL: {:?}", e))
        })?,
    );

    // 配置合约地址
    let contract_address = state
        .blockchain_authorized_contract_address
        .parse()
        .map_err(|e| {
            tracing::error!("Invalid Authorized Contract Address: {}", e);
            AppError::InternalServerError(format!("Invalid Authorized Contract Address: {:?}", e))
        })?;

    // 创建合约实例
    let contract = PickerPayment::new(contract_address, provider);

    // 调用getAllPickers方法
    let result = contract
        .getAllPickers()
        .call()
        .await
        .map_err(|e| {
            tracing::error!("Failed to call getAllPickers: {}", e);
            AppError::InternalServerError(format!("Failed to call getAllPickers: {:?}", e))
        })?;

    // 转换结果格式
    let pickers: Vec<BlockchainPickerInfo> = result
        .into_iter()
        .map(|picker| BlockchainPickerInfo {
            picker_id: format!("0x{:x}", picker.pickerId),
            dev_user_id: format!("0x{:x}", picker.devUserId),
            dev_wallet_address: format!("{:?}", picker.devWalletAddress),
        })
        .collect();

    Ok(axum::Json(GetAllPickersResponse { pickers }))
}

// 实现 get_all_operators

#[derive(Deserialize, ToSchema)]
pub struct GrantOperatorRoleRequest {
    pub operator_address: String,
}

#[derive(Serialize, ToSchema)]
pub struct GrantOperatorRoleResponse {
    pub success: bool,
    pub tx_hash: String,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct GetAllOperatorsResponse {
    pub operators: Vec<String>,
}

#[utoipa::path(
    get,
    path = "/api/pickers/get-all-operators",
    tag = "pickers",
    summary = "Get all operators",
    description = "Get all operators from the smart contract",
    responses(
        (status = 200, description = "Query successful", body = GetAllOperatorsResponse),
        (status = 400, description = "Bad request", body = crate::openapi::ErrorResponse),
        (status = 500, description = "Internal server error", body = crate::openapi::ErrorResponse),
    )
)]
pub async fn get_all_operators(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
) -> Result<axum::Json<GetAllOperatorsResponse>, AppError> {
    // 创建合约绑定
    alloy::sol! {
        #[sol(rpc)]
        contract PickerPayment {
            function getAllOperators() external view returns (address[] memory);
        }
    }

    // 从数据库查询用户信息，获取加密的私钥
    let user = sqlx::query_as::<_, crate::models::User>(
        "SELECT * FROM users WHERE user_id = ?",
    )
    .bind(user_id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| {
        tracing::error!("Failed to fetch user from database: {:?}", e);
        AppError::NotFound("User not found".to_string())
    })?;

    // 检查 user 是否为 Dev 用户
    if user.user_type != crate::models::UserType::Dev {
        return Err(AppError::BadRequest("Only Developer can query all operators".to_string()));
    }

    // 解密用户私钥
    let private_key_plaintext = crate::utils::decrypt_private_key(
        &user.private_key,
        &state.password_master_key,
        &state.password_nonce,
    )
    .map_err(|e| {
        tracing::error!("Decryption to plaintext failed: {:?}", e);
        AppError::InternalServerError(format!("Decryption to plaintext failed: {:?}", e))
    })?;

    // 初始化签名器（使用用户的私钥明文）
    let user_signer: alloy::signers::local::PrivateKeySigner = private_key_plaintext.parse().map_err(|e| {
        tracing::error!("Invalid private key: {}", e);
        AppError::InternalServerError(format!("Invalid private key: {:?}", e))
    })?;

    // 初始化provider
    let provider = ProviderBuilder::new().wallet(user_signer).connect_http(
        state.blockchain_rpc_url.parse().map_err(|e| {
            tracing::error!("Invalid RPC URL: {}", e);
            AppError::InternalServerError(format!("Invalid RPC URL: {:?}", e))
        })?,
    );

    // 配置合约地址
    let contract_address = state
        .blockchain_authorized_contract_address
        .parse()
        .map_err(|e| {
            tracing::error!("Invalid Authorized Contract Address: {}", e);
            AppError::InternalServerError(format!("Invalid Authorized Contract Address: {:?}", e))
        })?;

    // 创建合约实例
    let contract = PickerPayment::new(contract_address, provider);

    // 调用getAllOperators方法
    let result = contract
        .getAllOperators()
        .call()
        .await
        .map_err(|e| {
            tracing::error!("Failed to call getAllOperators: {}", e);
            AppError::InternalServerError(format!("Failed to call getAllOperators: {:?}", e))
        })?;

    // 转换结果格式
    let operators: Vec<String> = result
        .into_iter()
        .map(|addr| format!("{:?}", addr))
        .collect();

    Ok(axum::Json(GetAllOperatorsResponse { operators }))
}

// 实现 grant_operator_role

#[utoipa::path(
    post,
    path = "/api/pickers/grant-operator-role",
    tag = "pickers",
    summary = "Grant operator role",
    description = "Grant operator role to an address",
    request_body = GrantOperatorRoleRequest,
    responses(
        (status = 200, description = "Grant operator role successful", body = GrantOperatorRoleResponse),
        (status = 400, description = "Bad request", body = crate::openapi::ErrorResponse),
        (status = 500, description = "Internal server error", body = crate::openapi::ErrorResponse),
    )
)]
pub async fn grant_operator_role(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    axum::Json(payload): axum::Json<GrantOperatorRoleRequest>,
) -> Result<axum::Json<GrantOperatorRoleResponse>, AppError> {
    // 创建合约绑定
    alloy::sol! {
        #[sol(rpc)]
        contract PickerPayment {
            function grantOperatorRole(address operator) external;
        }
    }

    // 从数据库查询用户信息，获取加密的私钥
    let user = sqlx::query_as::<_, crate::models::User>(
        "SELECT * FROM users WHERE user_id = ?",
    )
    .bind(user_id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| {
        tracing::error!("Failed to fetch user from database: {:?}", e);
        AppError::NotFound("User not found".to_string())
    })?;

    // 检查 user 是否为 Dev 用户
    if user.user_type != crate::models::UserType::Dev {
        return Err(AppError::BadRequest("Only Developer can grant operator role".to_string()));
    }

    // 解密用户私钥
    let private_key_plaintext = crate::utils::decrypt_private_key(
        &user.private_key,
        &state.password_master_key,
        &state.password_nonce,
    )
    .map_err(|e| {
        tracing::error!("Decryption to plaintext failed: {:?}", e);
        AppError::InternalServerError(format!("Decryption to plaintext failed: {:?}", e))
    })?;

    // 初始化签名器（使用用户的私钥明文）
    let user_signer: alloy::signers::local::PrivateKeySigner = private_key_plaintext.parse().map_err(|e| {
        tracing::error!("Invalid private key: {}", e);
        AppError::InternalServerError(format!("Invalid private key: {:?}", e))
    })?;

    // 初始化provider
    let provider = ProviderBuilder::new().wallet(user_signer).connect_http(
        state.blockchain_rpc_url.parse().map_err(|e| {
            tracing::error!("Invalid RPC URL: {}", e);
            AppError::InternalServerError(format!("Invalid RPC URL: {:?}", e))
        })?,
    );

    // 解析操作员地址参数
    let operator_address: Address = payload.operator_address.parse()
        .map_err(|_| AppError::BadRequest("Invalid operator address format".to_string()))?;

    // 配置合约地址
    let contract_address = state
        .blockchain_authorized_contract_address
        .parse()
        .map_err(|e| {
            tracing::error!("Invalid Authorized Contract Address: {}", e);
            AppError::InternalServerError(format!("Invalid Authorized Contract Address: {:?}", e))
        })?;

    // 创建合约实例
    let contract = PickerPayment::new(contract_address, provider);

    // 构建并发送交易
    let pending_tx = contract
        .grantOperatorRole(operator_address)
        .send()
        .await
        .map_err(|e| {
            tracing::error!("Failed to send transaction: {}", e);
            AppError::InternalServerError(format!("Failed to send transaction: {:?}", e))
        })?;

    // 获取交易哈希字符串
    let tx_hash = format!("0x{}", hex::encode(pending_tx.tx_hash()));

    Ok(axum::Json(GrantOperatorRoleResponse { 
        success: true,
        tx_hash 
    }))
}

// 实现 revoke_operator_role

#[derive(Deserialize, ToSchema)]
pub struct RevokeOperatorRoleRequest {
    pub operator_address: String,
}

#[derive(Serialize, ToSchema)]
pub struct RevokeOperatorRoleResponse {
    pub success: bool,
    pub tx_hash: String,
}

#[utoipa::path(
    post,
    path = "/api/pickers/revoke-operator-role",
    tag = "pickers",
    summary = "Revoke operator role",
    description = "Revoke operator role from an address",
    request_body = RevokeOperatorRoleRequest,
    responses(
        (status = 200, description = "Revoke operator role successful", body = RevokeOperatorRoleResponse),
        (status = 400, description = "Bad request", body = crate::openapi::ErrorResponse),
        (status = 500, description = "Internal server error", body = crate::openapi::ErrorResponse),
    )
)]
pub async fn revoke_operator_role(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    axum::Json(payload): axum::Json<RevokeOperatorRoleRequest>,
) -> Result<axum::Json<RevokeOperatorRoleResponse>, AppError> {
    // 创建合约绑定
    alloy::sol! {
        #[sol(rpc)]
        contract PickerPayment {
            function revokeOperatorRole(address operator) external;
        }
    }

    // 从数据库查询用户信息，获取加密的私钥
    let user = sqlx::query_as::<_, crate::models::User>(
        "SELECT * FROM users WHERE user_id = ?",
    )
    .bind(user_id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| {
        tracing::error!("Failed to fetch user from database: {:?}", e);
        AppError::NotFound("User not found".to_string())
    })?;

    // 检查 user 是否为 Dev 用户
    if user.user_type != crate::models::UserType::Dev {
        return Err(AppError::BadRequest("Only Developer can revoke operator role".to_string()));
    }

    // 解密用户私钥
    let private_key_plaintext = crate::utils::decrypt_private_key(
        &user.private_key,
        &state.password_master_key,
        &state.password_nonce,
    )
    .map_err(|e| {
        tracing::error!("Decryption to plaintext failed: {:?}", e);
        AppError::InternalServerError(format!("Decryption to plaintext failed: {:?}", e))
    })?;

    // 初始化签名器（使用用户的私钥明文）
    let user_signer: alloy::signers::local::PrivateKeySigner = private_key_plaintext.parse().map_err(|e| {
        tracing::error!("Invalid private key: {}", e);
        AppError::InternalServerError(format!("Invalid private key: {:?}", e))
    })?;

    // 初始化provider
    let provider = ProviderBuilder::new().wallet(user_signer).connect_http(
        state.blockchain_rpc_url.parse().map_err(|e| {
            tracing::error!("Invalid RPC URL: {}", e);
            AppError::InternalServerError(format!("Invalid RPC URL: {:?}", e))
        })?,
    );

    // 解析操作员地址参数
    let operator_address: Address = payload.operator_address.parse()
        .map_err(|_| AppError::BadRequest("Invalid operator address format".to_string()))?;

    // 配置合约地址
    let contract_address = state
        .blockchain_authorized_contract_address
        .parse()
        .map_err(|e| {
            tracing::error!("Invalid Authorized Contract Address: {}", e);
            AppError::InternalServerError(format!("Invalid Authorized Contract Address: {:?}", e))
        })?;

    // 创建合约实例
    let contract = PickerPayment::new(contract_address, provider);

    // 构建并发送交易
    let pending_tx = contract
        .revokeOperatorRole(operator_address)
        .send()
        .await
        .map_err(|e| {
            tracing::error!("Failed to send transaction: {}", e);
            AppError::InternalServerError(format!("Failed to send transaction: {:?}", e))
        })?;

    // 获取交易哈希字符串
    let tx_hash = format!("0x{}", hex::encode(pending_tx.tx_hash()));

    Ok(axum::Json(RevokeOperatorRoleResponse { 
        success: true,
        tx_hash 
    }))
}

// 实现 withdraw_funds

#[derive(Deserialize, ToSchema)]
pub struct WithdrawFundsRequest {
    pub recipient_address: String,
}

#[derive(Serialize, ToSchema)]
pub struct WithdrawFundsResponse {
    pub success: bool,
    pub tx_hash: String,
}

#[utoipa::path(
    post,
    path = "/api/pickers/withdraw-funds",
    tag = "pickers",
    summary = "Withdraw funds",
    description = "Withdraw all contract balance to a recipient address",
    request_body = WithdrawFundsRequest,
    responses(
        (status = 200, description = "Withdraw funds successful", body = WithdrawFundsResponse),
        (status = 400, description = "Bad request", body = crate::openapi::ErrorResponse),
        (status = 500, description = "Internal server error", body = crate::openapi::ErrorResponse),
    )
)]
pub async fn withdraw_funds(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    axum::Json(payload): axum::Json<WithdrawFundsRequest>,
) -> Result<axum::Json<WithdrawFundsResponse>, AppError> {
    // 创建合约绑定
    alloy::sol! {
        #[sol(rpc)]
        contract PickerPayment {
            function withdrawFunds(address payable recipient) external;
        }
    }

    // 从数据库查询用户信息，获取加密的私钥
    let user = sqlx::query_as::<_, crate::models::User>(
        "SELECT * FROM users WHERE user_id = ?",
    )
    .bind(user_id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| {
        tracing::error!("Failed to fetch user from database: {:?}", e);
        AppError::NotFound("User not found".to_string())
    })?;

    // 检查 user 是否为 Dev 用户
    if user.user_type != crate::models::UserType::Dev {
        return Err(AppError::BadRequest("Only Developer can withdraw funds".to_string()));
    }

    // 解密用户私钥
    let private_key_plaintext = crate::utils::decrypt_private_key(
        &user.private_key,
        &state.password_master_key,
        &state.password_nonce,
    )
    .map_err(|e| {
        tracing::error!("Decryption to plaintext failed: {:?}", e);
        AppError::InternalServerError(format!("Decryption to plaintext failed: {:?}", e))
    })?;

    // 初始化签名器（使用用户的私钥明文）
    let user_signer: alloy::signers::local::PrivateKeySigner = private_key_plaintext.parse().map_err(|e| {
        tracing::error!("Invalid private key: {}", e);
        AppError::InternalServerError(format!("Invalid private key: {:?}", e))
    })?;

    // 初始化provider
    let provider = ProviderBuilder::new().wallet(user_signer).connect_http(
        state.blockchain_rpc_url.parse().map_err(|e| {
            tracing::error!("Invalid RPC URL: {}", e);
            AppError::InternalServerError(format!("Invalid RPC URL: {:?}", e))
        })?,
    );

    // 解析接收者地址参数
    let recipient_address: Address = payload.recipient_address.parse()
        .map_err(|_| AppError::BadRequest("Invalid recipient address format".to_string()))?;

    // 配置合约地址
    let contract_address = state
        .blockchain_authorized_contract_address
        .parse()
        .map_err(|e| {
            tracing::error!("Invalid Authorized Contract Address: {}", e);
            AppError::InternalServerError(format!("Invalid Authorized Contract Address: {:?}", e))
        })?;

    // 创建合约实例
    let contract = PickerPayment::new(contract_address, provider);

    // 构建并发送交易
    let pending_tx = contract
        .withdrawFunds(recipient_address)
        .send()
        .await
        .map_err(|e| {
            tracing::error!("Failed to send transaction: {}", e);
            AppError::InternalServerError(format!("Failed to send transaction: {:?}", e))
        })?;

    // 获取交易哈希字符串
    let tx_hash = format!("0x{}", hex::encode(pending_tx.tx_hash()));

    Ok(axum::Json(WithdrawFundsResponse { 
        success: true,
        tx_hash 
    }))
}

// // 实现 transfer_to 服务端解密私钥进行转账
// #[derive(Deserialize, ToSchema)]
// pub struct TransferToRequest {
//     pub to_address: String,
//     pub amount: String, // 使用字符串格式的 wei 值
// }

// #[derive(Serialize, ToSchema)]
// pub struct TransferToResponse {
//     pub success: bool,
//     pub tx_hash_url: String,
// }

// #[utoipa::path(
//     post,
//     path = "/api/pickers/transfer-to",
//     tag = "pickers",
//     summary = "Transfer funds from user to another address",
//     description = "Transfer ETH from the user's wallet to another address",
//     request_body = TransferToRequest,
//     responses(
//         (status = 200, description = "Transfer successful", body = TransferToResponse),
//         (status = 400, description = "Bad request", body = crate::openapi::ErrorResponse),
//         (status = 500, description = "Internal server error", body = crate::openapi::ErrorResponse),
//     )
// )]
// pub async fn transfer_to(
//     State(state): State<AppState>,
//     Extension(user_id): Extension<Uuid>,
//     axum::Json(payload): axum::Json<TransferToRequest>,
// ) -> Result<axum::Json<TransferToResponse>, AppError> {
//     println!("transfer_to", );
//     // 从数据库查询用户信息，获取加密的私钥
//     let user = sqlx::query_as::<_, crate::models::User>(
//         "SELECT * FROM users WHERE user_id = ?",
//     )
//     .bind(user_id)
//     .fetch_one(&state.db)
//     .await
//     .map_err(|e| {
//         tracing::error!("Failed to fetch user from database: {:?}", e);
//         AppError::NotFound("User not found".to_string())
//     })?;

//     // 检查 user 是否为 Dev 用户
//     if user.user_type != crate::models::UserType::Dev {
//         return Err(AppError::BadRequest("Only Developer can transfer funds".to_string()));
//     }

//     // 解密用户私钥
//     let private_key_plaintext = crate::utils::decrypt_private_key(
//         &user.private_key,
//         &state.password_master_key,
//         &state.password_nonce,
//     )
//     .map_err(|e| {
//         tracing::error!("Decryption to plaintext failed: {:?}", e);
//         AppError::InternalServerError(format!("Decryption to plaintext failed: {:?}", e))
//     })?;

//     // 初始化签名器（使用用户的私钥明文）
//     let user_signer: alloy::signers::local::PrivateKeySigner = private_key_plaintext.parse().map_err(|e| {
//         tracing::error!("Invalid private key: {}", e);
//         AppError::InternalServerError(format!("Invalid private key: {:?}", e))
//     })?;

//     // 初始化provider
//     let provider = ProviderBuilder::new().wallet(user_signer).connect_http(
//         state.blockchain_rpc_url.parse().map_err(|e| {
//             tracing::error!("Invalid RPC URL: {}", e);
//             AppError::InternalServerError(format!("Invalid RPC URL: {:?}", e))
//         })?,
//     );
//     println!("provider: {:?}", provider);
//     // 解析目标地址参数
//     let to_address: Address = payload.to_address.parse()
//         .map_err(|_| AppError::BadRequest("Invalid recipient address format".to_string()))?;
//     println!("to_address: {:?}", payload.to_address);
//     println!("amount: {:?}", payload.amount);
//     // 解析金额参数
//     let amount: U256 = U256::from_str(&payload.amount)
//         .map_err(|_| AppError::BadRequest("Invalid amount format".to_string()))?;
    
//     // 构建并发送交易
//     let pending_tx = provider
//         .send_transaction(alloy::rpc::types::TransactionRequest {
//             to: Some(to_address.into()),
//             value: Some(amount),
//             ..Default::default()
//         })
//         .await
//         .map_err(|e| {
//             tracing::error!("Failed to send transaction: {}", e);
//             AppError::InternalServerError(format!("Failed to send transaction: {:?}", e))
//         })?;
//         println!("pending_tx: {:?}", pending_tx);
//     // 获取交易哈希字符串
//     let tx_hash = format!("0x{}", hex::encode(pending_tx.tx_hash()));
//     let tx_hash_url = format!("{}/tx/{}", state.blockchain_explorer_url, tx_hash);
//     println!("tx_hash_url: {:?}", tx_hash_url);
//     Ok(axum::Json(TransferToResponse { 
//         success: true,
//         tx_hash_url,
//     }))
// }
