use reqwest;
use serde_json;
use std::ops::Div;

use axum::{
    extract::{Path, Query, State},
    response::Json,
    Extension,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::time::Duration;
use tracing::{info, error};
use utoipa::ToSchema;
use uuid::Uuid;

use crate::config::AppState;
use crate::models::{DownloadToken, Order, OrderStatus, PayType, Picker, User};
use crate::utils::{decrypt_private_key, AppError};
use alloy::primitives::Address;
use alloy::primitives::{FixedBytes, U256};
use alloy::rpc::types::TransactionReceipt;
use alloy::signers::local::PrivateKeySigner;
use alloy::sol;
use alloy::{
    providers::{Provider, ProviderBuilder},
};

// 创建订单请求
#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateOrderRequest {
    pub picker_id: Uuid,
    pub pay_type: PayType,
}

// 创建订单响应
#[derive(Debug, Serialize, ToSchema)]
pub struct CreateOrderResponse {
    pub token: String,
    pub message: String,
}

// 订单查询参数
#[derive(Debug, Deserialize, ToSchema)]
pub struct OrderQuery {
    pub page: Option<u32>,
    pub size: Option<u32>,
    pub status: Option<OrderStatus>,
}

// 订单信息
#[derive(Debug, Serialize, ToSchema)]
pub struct OrderInfo {
    pub order_id: Uuid,
    pub user_id: Uuid,
    pub picker_id: Uuid,
    pub picker_alias: String,
    pub amount: i64,
    pub pay_type: PayType,
    pub status: OrderStatus,
    pub created_at: chrono::DateTime<Utc>,
}

// 订单列表响应
#[derive(Debug, Serialize, ToSchema)]
pub struct OrderListResponse {
    pub orders: Vec<OrderInfo>,
    pub total: u64,
    pub page: u32,
    pub size: u32,
    pub has_next: bool,
}

// 创建订单
#[utoipa::path(
    post,
    path = "/api/orders",
    tag = "orders",
    summary = "Create Order",
    description = "Create an order for the specified Picker, supporting both Premium and wallet payment methods",
    request_body(content = CreateOrderRequest, description = "Create order request parameters", content_type = "application/json"),
    responses(
        (status = 200, description = "Order created successfully", body = CreateOrderResponse),
        (status = 400, description = "Request parameters error", body = crate::openapi::ErrorResponse),
        (status = 404, description = "User or Picker not found", body = crate::openapi::ErrorResponse),
        (status = 500, description = "Internal server error", body = crate::openapi::ErrorResponse)
    ),
    security(
        ("bearer_auth" = [])
    )
)]
pub async fn create_order(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Json(payload): Json<CreateOrderRequest>,
) -> Result<Json<CreateOrderResponse>, AppError> {
    info!(
        "Creating order for user: {}, picker: {}, pay_type: {:?}",
        user_id, payload.picker_id, payload.pay_type
    );

    // 获取用户信息
    info!("Fetching user information...");
    let user_result = sqlx::query_as::<_, User>("SELECT * FROM users WHERE user_id = ?")
        .bind(user_id)
        .fetch_optional(&state.db)
        .await;

    match &user_result {
        Ok(Some(user)) => info!("User found: {:?}", user),
        Ok(None) => info!("User not found"),
        Err(e) => info!("Failed to fetch user: {:?}", e),
    }

    let user = user_result
        .map_err(|_| AppError::NotFound("User not found".to_string()))?
        .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

    // 获取Picker信息
    info!("Fetching picker information...");
    let picker_result = sqlx::query_as::<_, Picker>(
        "SELECT * FROM pickers WHERE picker_id = ? AND status = 'active'",
    )
    .bind(payload.picker_id)
    .fetch_optional(&state.db)
    .await;

    match &picker_result {
        Ok(Some(picker)) => info!("Picker found: {:?}", picker),
        Ok(None) => info!("Picker not found"),
        Err(e) => info!("Failed to fetch picker: {:?}", e),
    }

    let picker = picker_result
        .map_err(|e| AppError::DatabaseError(format!("Failed to fetch picker: {:?}", e)))?
        .ok_or_else(|| AppError::NotFound("Picker not found".to_string()))?;

    // 检查支付方式和余额
    match payload.pay_type {
        PayType::Premium => {
            info!(
                "Processing premium payment, user balance: {}, picker price: {}",
                user.premium_balance, picker.price
            );
            if user.premium_balance < picker.price {
                return Err(AppError::BadRequest(
                    "Insufficient premium balance.".to_string(),
                ));
            }
        }
        PayType::Wallet => {
            info!(
                "Processing wallet payment for address: {}, picker price: {}",
                user.wallet_address, picker.price
            );

            // 测试环境下跳过真实区块链操作
            if cfg!(not(test)) {
                // 解密用户私钥
                let private_key_plaintext = decrypt_private_key(
                    &user.private_key,
                    &state.password_master_key,
                    &state.password_nonce,
                )
                .map_err(|e| {
                    error!("Decryption to plaintext failed: {:?}", e);
                    AppError::InternalServerError(format!("Decryption to plaintext failed: {:?}", e))
                })?;

                // 初始化签名器（使用用户的私钥明文）
                let user_signer: PrivateKeySigner = private_key_plaintext.parse().map_err(|e| {
                    tracing::error!("Invalid private key: {}", e);
                    AppError::InternalServerError(format!("Invalid private key: {:?}", e))
                })?;

                // 初始化provider
                let rpc_url = state.blockchain_rpc_url.parse().map_err(|e| {
                    error!("Invalid RPC URL: {}", e);
                    AppError::InternalServerError(format!("Invalid RPC URL: {:?}", e))
                })?;
                let provider = ProviderBuilder::new().wallet(user_signer).connect_http(rpc_url);

                // 检查钱包余额
                let address: Address = user.wallet_address.parse().map_err(|e| {
                    error!("Invalid wallet address: {} - {}", user.wallet_address, e);
                    AppError::BadRequest("Invalid wallet address".to_string())
                })?;

                // 获取钱包余额
                let balance = provider.get_balance(address).await.map_err(|e| {
                    error!("Failed to get wallet balance: {}", e);
                    AppError::InternalServerError(format!("Failed to get wallet balance: {:?}", e))
                })?;

                // 检查钱包余额是否足够支付订单金额
                let order_amount_in_wei = alloy::primitives::U256::from(picker.price);
                info!(
                    "Wallet balance: {}, order amount: {}",
                    balance, order_amount_in_wei
                );
                if balance < order_amount_in_wei {
                    return Err(AppError::BadRequest(
                        "Insufficient wallet balance.".to_string(),
                    ));
                }

                // 记录钱包支付信息
                tracing::info!(
                    "Wallet balance check passed for address: {}, balance: {} wei",
                    user.wallet_address,
                    balance
                );
            } else {
                // 测试环境下模拟余额足够
                info!("Test environment: skipping real blockchain operations and balance check");
            }
        }
    }

    let pay_rate = (state.premium_payment_rate as f32).div(100.00);
    info!("PAYMENT RATE: {}", pay_rate);

    // 查找用户钱包地址
    // let user_wallet_address = user.wallet_address;

    // 查找picker开发者钱包地址
    let dev_uid = picker.dev_user_id;
    let dev_user_result = sqlx::query_as::<_, User>("SELECT * FROM users WHERE user_id = ?")
        .bind(dev_uid)
        .fetch_optional(&state.db)
        .await;

    match &dev_user_result {
        Ok(Some(dev_user)) => info!("Dev User found: {:?}", dev_user),
        Ok(None) => info!("Dev User not found"),
        Err(e) => info!("Failed to fetch dev user: {:?}", e),
    }

    let dev_user = dev_user_result
        .map_err(|_| AppError::NotFound("Dev User not found".to_string()))?
        .ok_or_else(|| AppError::NotFound("Dev User not found".to_string()))?;

    // 创建订单
    let order_id = Uuid::new_v4();
    let now = Utc::now();
    let expires_at = now + chrono::Duration::hours(1); // 订单1小时后过期
    let tx_hash = if matches!(payload.pay_type, PayType::Wallet) {
        // 执行链上转账操作，获取交易hash
        // 调用授权支付合约的pay方法，转移用户钱包的代币
        // user.wallet_address ---> devWalletAddress
        // 合约的pay 签名
        // function pay(
        //     bytes32 pickerId,
        //     uint256 devUserId,
        //     address devWalletAddress
        // ) external payable;
        // 生成合约绑定
        sol! {
            #[sol(rpc)]
            contract PickerPayment {
                function pay(bytes16 pickerId, bytes16 devUserId, address devWalletAddress) external payable;
            }
        }

        // 判断是否为测试环境
        if cfg!(test) {
            // 测试环境下，直接返回一个模拟的交易哈希，不进行实际的区块链操作
            "0x7d31e067414e87c232e46606a9d3b4ba3a8f2a5a50b8b1a541b4d391a485c33d".to_string()
        } else {
            // 生产环境下执行实际的区块链操作
            // 解密用户私钥
            let private_key_plaintext = decrypt_private_key(
                &user.private_key,
                &state.password_master_key,
                &state.password_nonce,
            )
            .map_err(|e| {
                tracing::error!("Decryption to plaintext failed: {:?}", e);
                AppError::InternalServerError(format!("Decryption to plaintext failed: {:?}", e))
            })?;

            // 初始化签名器（使用用户的私钥明文）
            let user_signer: PrivateKeySigner = private_key_plaintext.parse().map_err(|e| {
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
            let dev_user_id_bytes = dev_user.user_id.as_bytes();

            let picker_id_fixed = FixedBytes::from_slice(&picker_id_bytes[0..16]);
            let dev_user_id_fixed = FixedBytes::from_slice(&dev_user_id_bytes[0..16]);

            let dev_wallet = dev_user.wallet_address.parse::<Address>().map_err(|e| {
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
            let token_usdt_url: String = state.blockchain_token_usdt_url.parse().map_err(|e| {
                tracing::error!("Invalid Token Usdt URL: {}", e);
                AppError::InternalServerError(format!("Invalid Token Usdt URL: {:?}", e))
            })?;

            // 使用reqwest请求token_usdt_url获取 Token Token价格
            let client = reqwest::Client::new();
            let response = client.get(&token_usdt_url).send().await.map_err(|e| {
                tracing::error!("Failed to fetch Token price: {}", e);
                AppError::InternalServerError(format!("Failed to fetch Token price: {:?}", e))
            })?;

            // 解析JSON响应
            let json_response: serde_json::Value = response.json().await.map_err(|e| {
                tracing::error!("Failed to parse Token price response: {}", e);
                AppError::InternalServerError(format!("Failed to parse Token price response: {:?}", e))
            })?;

            // 检查响应是否成功
            if json_response.get("code").and_then(|c| c.as_str()) != Some("0") {
                let error_msg = json_response
                    .get("msg")
                    .and_then(|m| m.as_str())
                    .unwrap_or("Unknown error");
                tracing::error!("Token price API returned error: {}", error_msg);
                return Err(AppError::InternalServerError(format!("Token price API returned error: {:?}", error_msg)));
            }

            // 获取data数组中的第一个元素的last字段（Token价格）
            let token_price = json_response
                .get("data")
                .and_then(|data| data.as_array())
                .and_then(|data_array| data_array.get(0))
                .and_then(|item| item.get("last"))
                .and_then(|last| last.as_str())
                .and_then(|last_str| last_str.parse::<f64>().ok())
                .ok_or_else(|| {
                    tracing::error!("Failed to extract Token price from response");
                    AppError::InternalServerError(format!("Failed to extract Token price from response"))
                })?;

            // 计算订单金额（picker.price / token_price）并转换为U256
            let order_amount_float = (picker.price as f64).div(token_price);
            // 由于U256不支持直接从浮点数转换，我们需要先转换为整数（乘以10^18来保留精度）
            let order_amount = U256::from((order_amount_float * 10_f64.powf(18.0)) as u128);

            // 记录日志
            info!(
                "BlockChain Token price: {:.6}, order_amount_float: {:.6}, order_amount (wei): {}",
                token_price, order_amount_float, order_amount
            );

            let pending_tx = contract
                .pay(picker_id_fixed, dev_user_id_fixed, dev_wallet)
                .value(order_amount)
                .send()
                .await
                .map_err(|e| {
                    tracing::error!("Failed to send transaction: {}", e);
                    AppError::InternalServerError(format!("Failed to send transaction: {:?}", e))
                })?;

            // 获取交易哈希字符串
            format!("0x{}", hex::encode(pending_tx.tx_hash()))
        }
    } else {
        "".to_string()
    };

    // 开始事务
    info!("Starting transaction...");
    let mut tx = state.db.begin().await.map_err(|e| {
        info!("Failed to start transaction: {:?}", e);
        AppError::DatabaseError(format!("Failed to start transaction: {:?}", e))
    })?;

    // 插入订单记录
    if matches!(payload.pay_type, PayType::Wallet) {
        info!("Inserting wallet order...");
        let result = sqlx::query(
            r#"
            INSERT INTO orders (order_id, user_id, picker_id, amount, pay_type, status, tx_hash, created_at, expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(order_id)
        .bind(user_id)
        .bind(payload.picker_id)
        .bind(picker.price)
        .bind(&payload.pay_type)
        .bind(&OrderStatus::Pending)
        .bind(&tx_hash)
        .bind(now.to_rfc3339())
        .bind(expires_at.to_rfc3339())
        .execute(&mut *tx)
        .await;

        match &result {
            Ok(_) => info!("Wallet order inserted successfully"),
            Err(e) => error!("Failed to insert wallet order: {:?}", e),
        }

        result.map_err(|e| AppError::DatabaseError(format!("Failed to insert wallet order: {:?}", e)))?;
    } else {
        info!("Inserting premium order...");
        let result = sqlx::query(
            r#"
            INSERT INTO orders (order_id, user_id, picker_id, amount, pay_type, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(order_id)
        .bind(user_id)
        .bind(payload.picker_id)
        .bind(picker.price)
        .bind(&payload.pay_type)
        .bind(&OrderStatus::Pending)
        .bind(now.to_rfc3339())
        .execute(&mut *tx)
        .await;

        match &result {
            Ok(_) => info!("Premium order inserted successfully"),
            Err(e) => info!("Failed to insert premium order: {:?}", e),
        }

        result.map_err(|e| AppError::DatabaseError(format!("Failed to insert premium order: {:?}", e)))?;
    }

    // 扣除用户余额，并增加开发者账户余额（如果是Premium支付）
    if matches!(payload.pay_type, PayType::Premium) {
        info!("Processing premium payment...");
        let result =
            sqlx::query("UPDATE users SET premium_balance = premium_balance - ? WHERE user_id = ?")
                .bind(picker.price)
                .bind(user_id)
                .execute(&mut *tx)
                .await;
            
        match &result {
            Ok(_) => info!("User balance updated successfully"),
            Err(e) => info!("Failed to update user balance: {:?}", e),
        }

        result.map_err(|e| AppError::DatabaseError(format!("Failed to update user balance: {:?}", e)))?;

        let increase_balance_to_dev = (picker.price as f32 * (1.0 - pay_rate)) as i64;

        info!("Increase balance to dev: {}", increase_balance_to_dev);

        let result =
            sqlx::query("UPDATE users SET premium_balance = premium_balance + ? WHERE user_id = ?")
                .bind(increase_balance_to_dev)
                .bind(dev_uid)
                .execute(&mut *tx)
                .await;

        match &result {
            Ok(_) => info!("Developer balance updated successfully"),
            Err(e) => info!("Failed to update Developer balance: {:?}", e),
        }

        result.map_err(|e| AppError::DatabaseError(format!("Failed to update Developer balance: {:?}", e)))?;

        // 更新订单状态为成功
        info!("Updating order status to success...");
        let result = sqlx::query("UPDATE orders SET status = ? WHERE order_id = ?")
            .bind(&OrderStatus::Success)
            .bind(order_id)
            .execute(&mut *tx)
            .await;

        match &result {
            Ok(_) => info!("Order status updated successfully"),
            Err(e) => info!("Failed to update order status: {:?}", e),
        }

        result.map_err(|e| AppError::DatabaseError(format!("Failed to update order status: {:?}", e)))?;

        // // 增加Picker下载次数 已在download file中实现
        // info!("Increasing picker download count...");
        // let result = sqlx::query(
        //     "UPDATE pickers SET download_count = download_count + 1 WHERE picker_id = ?",
        // )
        // .bind(payload.picker_id)
        // .execute(&mut *tx)
        // .await;

        // match &result {
        //     Ok(_) => info!("Picker download count updated successfully"),
        //     Err(e) => info!("Failed to update picker download count: {:?}", e),
        // }

        // result.map_err(|_| AppError::DatabaseError)?;
    } else {
        // 实现重试机制，查询链上钱包交易状态是否成功
        if !tx_hash.is_empty() {
            info!("Starting to query transaction status, transaction hash: {}", tx_hash);

            // 将交易哈希字符串转换为TxHash类型
            let tx_hash_parsed = tx_hash.parse().map_err(|e| {
                error!("Invalid transaction hash: {} - {}", tx_hash, e);
                AppError::InternalServerError(format!("Invalid transaction hash: {}", tx_hash))
            })?;

            // 创建provider用于查询交易状态
            let provider = ProviderBuilder::new().connect_http(
                state.blockchain_rpc_url.parse().map_err(|e| {
                    error!("Invalid RPC URL: {}", e);
                    AppError::InternalServerError(format!("Invalid RPC URL: {}", e))
                })?,
            );

            // 调用带重试机制的函数查询交易回执
            if let Ok(Some(receipt)) = get_receipt_with_retry(
                &provider,
                tx_hash_parsed,
                state.blockchain_retry_times as u32,
                state.blockchain_retry_interval_seconds,
            )
            .await
            {
                info!(
                    "Transaction status: {}, Block number: {:?}",
                    if receipt.status() { "Success" } else { "Failed" },
                    receipt.block_number
                );

                // 如果交易成功，更新订单状态和增加下载次数
                if receipt.status() {
                    info!("Transaction success, updating order status and picker download count");

                    // 更新订单状态为成功
                    let result = sqlx::query("UPDATE orders SET status = ? WHERE order_id = ?")
                        .bind(&OrderStatus::Success)
                        .bind(order_id)
                        .execute(&mut *tx)
                        .await;

                    match &result {
                        Ok(_) => info!("Order status updated successfully"),
                        Err(e) => info!("Failed to update order status: {:?}", e),
                    }

                    result.map_err(|e| AppError::DatabaseError(format!("Failed to update order status: {:?}", e)))?;

                    // 增加Picker下载次数
                    let result = sqlx::query(
                        "UPDATE pickers SET download_count = download_count + 1 WHERE picker_id = ?",
                    )
                    .bind(payload.picker_id)
                    .execute(&mut *tx)
                    .await;

                    match &result {
                        Ok(_) => info!("Picker download count updated successfully"),
                        Err(e) => info!("Failed to update picker download count: {:?}", e),
                    }

                    result.map_err(|e| AppError::DatabaseError(format!("Failed to update picker download count: {:?}", e)))?;
                } else {
                    info!("Transaction failed, order status remains pending");
                }
            } else {
                info!("Failed to get transaction receipt, trying to query raw transaction...");
                // 调用带重试机制的函数查询原始交易
                if let Ok(()) = get_raw_transaction_with_retry(
                    &provider,
                    tx_hash_parsed,
                    state.blockchain_retry_times as u32,
                    state.blockchain_retry_interval_seconds,
                )
                .await
                {
                    // 继续实现钱包支付订单剩余逻辑
                    info!("Transaction successful, updating order status and Picker download count");

                    // 更新订单状态为成功
                    let result = sqlx::query("UPDATE orders SET status = ? WHERE order_id = ?")
                        .bind(&OrderStatus::Success)
                        .bind(order_id)
                        .execute(&mut *tx)
                        .await;

                    match &result {
                        Ok(_) => info!("Order status updated successfully"),
                        Err(e) => info!("Failed to update order status: {:?}", e),
                    }

                    result.map_err(|e| AppError::DatabaseError(format!("Failed to update order status: {:?}", e)))?;

                    // 增加Picker下载次数
                    let result = sqlx::query(
                        "UPDATE pickers SET download_count = download_count + 1 WHERE picker_id = ?",
                    )
                    .bind(payload.picker_id)
                    .execute(&mut *tx)
                    .await;

                    match &result {
                        Ok(_) => info!("Picker下载次数更新成功"),
                        Err(e) => info!("Failed to update picker download count: {:?}", e),
                    }

                    result.map_err(|e| AppError::DatabaseError(format!("Failed to update picker download count: {:?}", e)))?;
                } else {
                    info!(
                        "Failed to get transaction receipt and query raw transaction, order status remains pending, transaction failed"
                    );
                }
            }
        }
    }

    // 带重试机制的交易回执查询函数
    async fn get_receipt_with_retry<P: Provider>(
        provider: &P,
        tx_hash: FixedBytes<32>,
        max_retries: u32,
        retry_interval_seconds: i8,
    ) -> Result<Option<TransactionReceipt>, AppError> {
        for attempt in 1..=max_retries {
            match provider.get_transaction_receipt(tx_hash).await {
                // 需要进一步判断如果回执是None，则说明交易未被确认，需要继续重试
                Ok(receipt) => {
                    if receipt.is_none() {
                        info!("Transaction receipt is None, waiting {} seconds for retry", retry_interval_seconds);
                        if attempt < max_retries {
                            tokio::time::sleep(Duration::from_secs(retry_interval_seconds as u64))
                                .await;
                        }
                        continue;
                    }
                    return Ok(receipt);
                }
                Err(e) => {
                    info!(
                        "Attempt {} failed to get transaction receipt: {}, waiting {} seconds for retry",
                        attempt, e, retry_interval_seconds
                    );
                    if attempt < max_retries {
                        tokio::time::sleep(Duration::from_secs(retry_interval_seconds as u64))
                            .await;
                    }
                }
            }
        }
        Err(AppError::InternalServerError(format!("Failed to get transaction receipt after {} attempts", max_retries)))
    }

    // 带重试机制的Raw交易查询函数
    async fn get_raw_transaction_with_retry<P: Provider>(
        provider: &P,
        tx_hash: FixedBytes<32>,
        max_retries: u32,
        retry_interval_seconds: i8,
    ) -> Result<(), AppError> {
        for attempt in 1..=max_retries {
            match provider
                .get_raw_transaction_by_hash(tx_hash)
                .await
                // .map_err(|_e| AppError::InternalServerError)
            {
                Ok(raw_tx) => {
                    match raw_tx {
                        Some(raw_tx) => {
                            // raw_tx 是 Bytes 类型，包含 RLP 编码的原始交易数据
                            // 在 Alloy 1.0.30 中，没有直接的解码方法
                            // 但我们可以利用这个信息判断交易状态

                            // 如果获取到原始交易数据，说明交易已经被网络接收
                            // 但还没有被确认（没有回执）
                            info!(
                                "Raw transaction data received, transaction sent but not confirmed, length: {} bytes",
                                raw_tx.len()
                            );
                        }
                        None => {
                            info!("Transaction does not exist");
                        }
                    }
                    return Ok(());
                }
                Err(e) => {
                    info!(
                        "Attempt {} failed to get raw transaction: {:?}, waiting {} seconds for retry",
                        attempt, e, retry_interval_seconds
                    );
                    if attempt < max_retries {
                        tokio::time::sleep(Duration::from_secs(retry_interval_seconds as u64))
                            .await;
                    }
                }
            }
        }
        Err(AppError::InternalServerError(format!("Failed to get raw transaction after {} attempts.", max_retries)))
    }

    // 提交事务
    info!("Committing transaction...");
    let result = tx.commit().await;

    match &result {
        Ok(_) => info!("Transaction committed successfully"),
        Err(e) => info!("Failed to commit transaction: {:?}", e),
    }

    result.map_err(|e| AppError::DatabaseError(format!("Failed to commit transaction: {:?}", e)))?;

    info!("Order created successfully with ID: {}", order_id);

    // 生成下载token
    let download_token = DownloadToken::new(order_id);
    let token_value = download_token.token.clone();

    // 将生成的下载token存储到state.download_tokens中
    state
        .download_tokens
        .lock()
        .map_err(|e| AppError::InternalServerError(format!("Failed to lock download tokens: {:?}", e)))?
        .insert(token_value.clone(), download_token);

    info!(
        "Generated download token for order {}: {}",
        order_id, token_value
    );

    // 构造 explorer 链接
    let explorer_tx_url = format!(
        "URL: {}/tx/{}",
        state.blockchain_explorer_url,
        tx_hash
    );
    let message = format!(
        "Order created successfully. {} ",
        explorer_tx_url
    );

    info!("Explorer transaction URL: {}", explorer_tx_url);

    Ok(Json(CreateOrderResponse {
        token: token_value,
        message,
    }))
}

// 获取用户订单列表
#[utoipa::path(
    get,
    path = "/api/orders",
    tag = "orders",
    summary = "Get User Order List",
    description = "Get all orders for the current user, supporting pagination and status filtering",
    security(
        ("bearer_auth" = [])
    ),
    params(
        ("page" = Option<u32>, Query, description = "Page number, default is 1"),
        ("size" = Option<u32>, Query, description = "Number of items per page, default is 10"),
        ("status" = Option<OrderStatus>, Query, description = "Order status filter")
    ),
    responses(
        (status = 200, description = "Get order list successfully", body = OrderListResponse),
        (status = 401, description = "Unauthorized access", body = crate::openapi::ErrorResponse),
        (status = 500, description = "Internal server error", body = crate::openapi::ErrorResponse)
    )
)]
pub async fn get_user_orders(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Query(query): Query<OrderQuery>,
) -> Result<Json<OrderListResponse>, AppError> {
    let page = query.page.unwrap_or(1);
    let size = query.size.unwrap_or(10);
    let offset = (page - 1) * size;

    // 构建查询条件
    let (where_clause, count_where_clause) = if let Some(_status) = &query.status {
        (
            format!(
                "WHERE o.user_id = ? AND o.status = ? ORDER BY o.created_at DESC LIMIT ? OFFSET ?"
            ),
            "WHERE o.user_id = ? AND o.status = ?".to_string(),
        )
    } else {
        (
            "WHERE o.user_id = ? ORDER BY o.created_at DESC LIMIT ? OFFSET ?".to_string(),
            "WHERE o.user_id = ?".to_string(),
        )
    };

    // 获取总数
    let total = if let Some(status) = &query.status {
        let result: (i64,) = sqlx::query_as(&format!(
            "SELECT COUNT(*) as count FROM orders o {}",
            count_where_clause
        ))
        .bind(user_id)
        .bind(status)
        .fetch_one(&state.db)
        .await
        .map_err(|e| AppError::DatabaseError(format!("Failed to get total order count: {:?}", e)))?;
        result.0
    } else {
        let result: (i64,) = sqlx::query_as(&format!(
            "SELECT COUNT(*) as count FROM orders o {}",
            count_where_clause
        ))
        .bind(user_id)
        .fetch_one(&state.db)
        .await
        .map_err(|e| AppError::DatabaseError(format!("Failed to get total order count: {:?}", e)))?;
        result.0
    };

    // 获取订单列表
    let orders = if let Some(status) = &query.status {
        sqlx::query_as::<_, Order>(&format!("SELECT o.* FROM orders o {}", where_clause))
            .bind(user_id)
            .bind(status)
            .bind(size as i64)
            .bind(offset as i64)
            .fetch_all(&state.db)
            .await
            .map_err(|e| AppError::DatabaseError(format!("Failed to get order list: {:?}", e)))?
    } else {
        sqlx::query_as::<_, Order>(&format!("SELECT o.* FROM orders o {}", where_clause))
            .bind(user_id)
            .bind(size as i64)
            .bind(offset as i64)
            .fetch_all(&state.db)
            .await
            .map_err(|e| AppError::DatabaseError(format!("Failed to get order list: {:?}", e)))?
    };

    // 获取Picker信息
    let mut order_infos = Vec::new();
    for order in orders {
        let picker = sqlx::query_as::<_, Picker>("SELECT * FROM pickers WHERE picker_id = ?")
            .bind(order.picker_id)
            .fetch_one(&state.db)
            .await
            .map_err(|e| AppError::DatabaseError(format!("Failed to get picker info: {:?}", e)))?;

        order_infos.push(OrderInfo {
            order_id: order.order_id,
            user_id: order.user_id,
            picker_id: order.picker_id,
            picker_alias: picker.alias,
            amount: order.amount,
            pay_type: order.pay_type,
            status: order.status,
            created_at: order.created_at,
        });
    }

    let has_next = (page * size) < total as u32;

    Ok(Json(OrderListResponse {
        orders: order_infos,
        total: total as u64,
        page,
        size,
        has_next,
    }))
}

// 获取订单详情
#[utoipa::path(
    get,
    path = "/api/orders/{order_id}",
    tag = "orders",
    summary = "Get Order Detail",
    description = "Get detailed information of a specific order by order ID",
    security(
        ("bearer_auth" = [])
    ),
    params(
        ("order_id" = uuid::Uuid, Path, description = "Order ID")
    ),
    responses(
        (status = 200, description = "Get order detail successfully", body = OrderInfo),
        (status = 401, description = "Unauthorized access", body = crate::openapi::ErrorResponse),
        (status = 404, description = "Order not found", body = crate::openapi::ErrorResponse),
        (status = 500, description = "Internal server error", body = crate::openapi::ErrorResponse)
    )
)]
pub async fn get_order_detail(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Path(order_id): Path<Uuid>,
) -> Result<Json<OrderInfo>, AppError> {
    // info!("get_order_detail called with order_id: {}, user_id: {}", order_id, user_id);

    // 获取订单信息
    let order_query = "SELECT * FROM orders WHERE order_id = ? AND user_id = ?";
    // info!("Executing query: {}", order_query);
    let order_result = sqlx::query_as::<_, Order>(order_query)
        .bind(order_id)
        .bind(user_id)
        .fetch_optional(&state.db)
        .await;

    match &order_result {
        Ok(Some(order)) => info!("Order found: {:?}", order),
        Ok(None) => info!("No order found"),
        Err(e) => info!("Error fetching order: {}", e),
    }

    let order = order_result
        .map_err(|e| AppError::DatabaseError(format!("Failed to get order detail: {:?}", e)))?
        .ok_or_else(|| AppError::NotFound("Order not found".to_string()))?;

    // 获取Picker信息
    let picker_query = "SELECT * FROM pickers WHERE picker_id = ?";
    // info!("Executing picker query: {}", picker_query);
    let picker_result = sqlx::query_as::<_, Picker>(picker_query)
        .bind(order.picker_id)
        .fetch_optional(&state.db)
        .await;

    let picker = match picker_result {
        Ok(Some(picker)) => {
            info!("Picker found: {:?}", picker);
            picker
        }
        Ok(None) => {
            info!("Picker not found");
            return Err(AppError::NotFound("Picker not found".to_string()));
        }
        Err(e) => {
            info!("Error fetching picker: {}", e);
            return Err(AppError::DatabaseError(format!("Failed to get picker info: {:?}", e)));
        }
    };

    let order_info = OrderInfo {
        order_id: order.order_id,
        user_id: order.user_id,
        picker_id: order.picker_id,
        picker_alias: picker.alias,
        amount: order.amount,
        pay_type: order.pay_type,
        status: order.status,
        created_at: order.created_at,
    };

    // info!("Returning order info: {:?}", order_info);

    Ok(Json(order_info))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{OrderStatus, PayType};
    use crate::utils_tests::create_test_app_state;
    use axum::extract::{Path, State};
    use axum::Extension;
    use chrono::Utc;
    use serial_test::serial;
    use uuid::Uuid;

    #[tokio::test]
    #[serial]
    async fn test_create_order_premium_success() {
        let state = create_test_app_state().await;
        let user_id = Uuid::new_v4();
        let dev_user_id = Uuid::new_v4();
        let picker_id = Uuid::new_v4();

        // 创建测试用户
        // info!("Creating test user...");
        let result = sqlx::query(
            r#"
            INSERT INTO users (user_id, email, user_name, user_password, user_type, private_key, wallet_address, premium_balance, created_at)
            VALUES (?, 'user@test.com', 'Test User', 'hashed_password', 'gen', '59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d', '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', 1000, ?)
            "#,
        )
        .bind(user_id)
        .bind(Utc::now().to_rfc3339())
        .execute(&state.db)
        .await;

        info!("Insert user result: {:?}", result);
        result.unwrap();

        // 创建测试开发者用户
        // info!("Creating test dev user...");
        let result = sqlx::query(
            r#"
            INSERT INTO users (user_id, email, user_name, user_password, user_type, private_key, wallet_address, premium_balance, created_at)
            VALUES (?, 'dev@test.com', 'Dev User', 'hashed_password', 'dev', 'private_key_456', '0xabcdef1234567890abcdef1234567890abcdef12', 0, ?)
            "#,
        )
        .bind(dev_user_id)
        .bind(Utc::now().to_rfc3339())
        .execute(&state.db)
        .await;

        match &result {
            Ok(_) => info!("Test dev user created successfully"),
            Err(e) => info!("Failed to create test dev user: {:?}", e),
        }

        result.unwrap();

        // 创建测试Picker
        let result = sqlx::query(
            r#"
            INSERT INTO pickers (picker_id, dev_user_id, alias, description, price, image_path, file_path, version, status, download_count, created_at, updated_at)
            VALUES (?, ?, 'Test Picker', 'Test Description', 500, 'test.jpg', 'test.exe', '1.0', 'active', 0, ?, ?)
            "#,
        )
        .bind(picker_id)
        .bind(dev_user_id)
        .bind(Utc::now().to_rfc3339())
        .bind(Utc::now().to_rfc3339())
        .execute(&state.db)
        .await;

        match &result {
            Ok(_) => info!("Test picker created successfully"),
            Err(e) => info!("Failed to create test picker: {:?}", e),
        }

        result.unwrap();

        let request = CreateOrderRequest {
            picker_id,
            pay_type: PayType::Premium,
        };

        let result = create_order(State(state.clone()), Extension(user_id), Json(request)).await;

        assert!(result.is_ok());

        let response = result.unwrap();
        assert!(!response.token.is_empty());
        assert_eq!(response.message, "Order created successfully");

        // 验证用户余额被扣除
        let user: User = sqlx::query_as("SELECT * FROM users WHERE user_id = ?")
            .bind(user_id)
            .fetch_one(&state.db)
            .await
            .unwrap();
        assert_eq!(user.premium_balance, 500); // 1000 - 500

        // 验证Picker下载次数增加
        let picker: Picker = sqlx::query_as("SELECT * FROM pickers WHERE picker_id = ?")
            .bind(picker_id)
            .fetch_one(&state.db)
            .await
            .unwrap();
        assert_eq!(picker.download_count, 1);
    }

    #[tokio::test]
    #[serial]
    async fn test_create_order_premium_insufficient_balance() {
        let state = create_test_app_state().await;
        let user_id = Uuid::new_v4();
        let dev_user_id = Uuid::new_v4();
        let picker_id = Uuid::new_v4();

        // 创建测试用户（余额不足）
        sqlx::query(
            r#"
            INSERT INTO users (user_id, email, user_name, user_password, user_type, private_key, wallet_address, premium_balance, created_at)
        VALUES (?, 'user@test.com', 'Test User', 'hashed_password', 'gen', 'private_key_123', '0x1234567890123456789012345678901234567890', 100, ?)
            "#,
        )
        .bind(user_id)
        .bind(Utc::now().to_rfc3339())
        .execute(&state.db)
        .await
        .unwrap();

        // 创建测试开发者用户
        sqlx::query(
            r#"
            INSERT INTO users (user_id, email, user_name, user_password, user_type, private_key, wallet_address, premium_balance, created_at)
            VALUES (?, 'dev@test.com', 'Dev User', 'hashed_password', 'dev', 'private_key_456', '0xabcdef1234567890abcdef1234567890abcdef12', 0, ?)
            "#,
        )
        .bind(dev_user_id)
        .bind(Utc::now().to_rfc3339())
        .execute(&state.db)
        .await
        .unwrap();

        // 创建测试Picker
        sqlx::query(
            r#"
            INSERT INTO pickers (picker_id, dev_user_id, alias, description, price, image_path, file_path, version, status, download_count, created_at, updated_at)
            VALUES (?, ?, 'Test Picker', 'Test Description', 500, 'test.jpg', 'test.exe', '1.0', 'active', 0, ?, ?)
            "#,
        )
        .bind(picker_id)
        .bind(dev_user_id)
        .bind(Utc::now().to_rfc3339())
        .bind(Utc::now().to_rfc3339())
        .execute(&state.db)
        .await
        .unwrap();

        let request = CreateOrderRequest {
            picker_id,
            pay_type: PayType::Premium,
        };

        let result = create_order(State(state), Extension(user_id), Json(request)).await;

        assert!(result.is_err());
        match result.unwrap_err() {
            AppError::BadRequest(msg) => assert_eq!(msg, "Insufficient premium balance"),
            _ => panic!("Expected BadRequest error"),
        }
    }

    #[tokio::test]
    #[serial]
    async fn test_create_order_picker_not_found() {
        let state = create_test_app_state().await;
        let user_id = Uuid::new_v4();
        let picker_id = Uuid::new_v4(); // 不存在的picker

        // 创建测试用户
        sqlx::query(
            r#"
            INSERT INTO users (user_id, email, user_name, user_password, user_type, private_key, wallet_address, premium_balance, created_at)
            VALUES (?, 'user@test.com', 'Test User', 'hashed_password', 'gen', 'private_key_123', '0x1234567890123456789012345678901234567890', 1000, ?)
            "#,
        )
        .bind(user_id)
        .bind(Utc::now().to_rfc3339())
        .execute(&state.db)
        .await
        .unwrap();

        let request = CreateOrderRequest {
            picker_id,
            pay_type: PayType::Premium,
        };

        let result = create_order(State(state), Extension(user_id), Json(request)).await;

        assert!(result.is_err());
        match result.unwrap_err() {
            AppError::NotFound(msg) => assert_eq!(msg, "Picker not found"),
            _ => panic!("Expected NotFound error"),
        }
    }

    #[tokio::test]
    #[serial]
    async fn test_create_order_wallet_success() {
        // info!("Starting test_create_order_wallet_success");
        let state = create_test_app_state().await;
        let user_id = Uuid::new_v4();
        let dev_user_id = Uuid::new_v4();
        let picker_id = Uuid::new_v4();

        // info!("User ID: {}", user_id);
        // info!("Dev User ID: {}", dev_user_id);
        // info!("Picker ID: {}", picker_id);

        // 创建测试用户
        // info!("Creating test user...");
        let result = sqlx::query(
            r#"
            INSERT INTO users (user_id, email, user_name, user_password, user_type, private_key, wallet_address, premium_balance, created_at)
            VALUES (?, 'user@test.com', 'Test User', 'hashed_password', 'gen', 'private_key_123', '0x1234567890123456789012345678901234567890', 0, ?)
            "#,
        )
        .bind(user_id)
        .bind(Utc::now().to_rfc3339())
        .execute(&state.db)
        .await;

        match &result {
            Ok(_) => info!("Test user created successfully"),
            Err(e) => info!("Failed to create test user: {:?}", e),
        }

        result.unwrap();

        // 创建测试开发者用户
        // info!("Creating test dev user...");
        let result = sqlx::query(
            r#"
            INSERT INTO users (user_id, email, user_name, user_password, user_type, private_key, wallet_address, premium_balance, created_at)
            VALUES (?, 'dev@test.com', 'Dev User', 'hashed_password', 'dev', 'private_key_456', '0xabcdef1234567890abcdef1234567890abcdef12', 0, ?)
            "#,
        )
        .bind(dev_user_id)
        .bind(Utc::now().to_rfc3339())
        .execute(&state.db)
        .await;

        match &result {
            Ok(_) => info!("Test dev user created successfully"),
            Err(e) => info!("Failed to create test dev user: {:?}", e),
        }

        result.unwrap();

        // 创建测试Picker
        // info!("Creating test picker...");
        let now = Utc::now();
        let result = sqlx::query(
            r#"
            INSERT INTO pickers (picker_id, dev_user_id, alias, description, price, image_path, file_path, version, status, download_count, created_at, updated_at)
            VALUES (?, ?, 'Test Picker', 'Test Description', 500, 'test.jpg', 'test.exe', '1.0', 'active', 0, ?, ?)
            "#,
        )
        .bind(picker_id)
        .bind(dev_user_id)
        .bind(now.to_rfc3339())
        .bind(now.to_rfc3339())
        .execute(&state.db)
        .await;

        match &result {
            Ok(_) => info!("Test picker created successfully"),
            Err(e) => info!("Failed to create test picker: {:?}", e),
        }

        result.unwrap();

        let request = CreateOrderRequest {
            picker_id,
            pay_type: PayType::Wallet,
        };

        // info!("Calling create_order...");

        let result = create_order(State(state.clone()), Extension(user_id), Json(request)).await;

        // info!("create_order result: {:?}", result);

        // 添加详细的错误信息输出
        match &result {
            Ok(_) => info!("Order creation succeeded"),
            Err(e) => {
                info!("Order creation failed with error: {:?}", e);
                // 让测试失败并显示错误信息
                panic!("Order creation failed with error: {:?}", e);
            }
        }

        assert!(result.is_ok());

        let response = result.unwrap();
        assert!(!response.token.is_empty());
        assert_eq!(response.message, "Order created successfully");

        // 验证Picker下载次数没有增加
        let picker: Picker = sqlx::query_as("SELECT * FROM pickers WHERE picker_id = ?")
            .bind(picker_id)
            .fetch_one(&state.db)
            .await
            .unwrap();
        // info!("Picker download count: {}", picker.download_count);
        assert_eq!(picker.download_count, 0);
    }

    #[tokio::test]
    #[serial]
    async fn test_get_order_detail_success() {
        let state = create_test_app_state().await;
        let user_id = Uuid::new_v4();
        let dev_user_id = Uuid::new_v4();
        let picker_id = Uuid::new_v4();
        let order_id = Uuid::new_v4();

        info!("Creating test users and picker...");

        // 创建测试用户
        // 创建测试用户
        // info!("Creating test user...");
        let result = sqlx::query(
            r#"
            INSERT INTO users (user_id, email, user_name, user_password, user_type, private_key, wallet_address, premium_balance, created_at)
            VALUES (?, 'user@test.com', 'Test User', 'hashed_password', 'gen', 'private_key_123', 'wallet123', 1000, ?)
            "#,
        )
        .bind(user_id)
        .bind(Utc::now().to_rfc3339())
        .execute(&state.db)
        .await;

        info!("Insert user result: {:?}", result);
        result.unwrap();

        // 创建测试开发者用户
        let result = sqlx::query(
            r#"
            INSERT INTO users (user_id, email, user_name, user_password, user_type, private_key, wallet_address, premium_balance, created_at)
            VALUES (?, 'dev@test.com', 'Dev User', 'hashed_password', 'dev', 'private_key_456', 'devwallet456', 0, ?)
            "#,
        )
        .bind(dev_user_id)
        .bind(Utc::now().to_rfc3339())
        .execute(&state.db)
        .await;

        info!("Insert dev user result: {:?}", result);
        result.unwrap();

        // 创建测试Picker
        let result = sqlx::query(
            r#"
            INSERT INTO pickers (picker_id, dev_user_id, alias, description, price, image_path, file_path, version, status, download_count, created_at, updated_at)
            VALUES (?, ?, 'Test Picker', 'Test Description', 500, 'test.jpg', 'test.exe', '1.0', 'active', 0, ?, ?)
            "#,
        )
        .bind(picker_id)
        .bind(dev_user_id)
        .bind(Utc::now().to_rfc3339())
        .bind(Utc::now().to_rfc3339())
        .execute(&state.db)
        .await;

        info!("Insert picker result: {:?}", result);
        result.unwrap();

        info!("Creating test order...");

        // 创建测试订单
        let result = sqlx::query(
            r#"
            INSERT INTO orders (order_id, user_id, picker_id, amount, pay_type, status, tx_hash, created_at, expires_at)
            VALUES (?, ?, ?, 500, ?, ?, NULL, ?, NULL)
            "#,
        )
        .bind(order_id)
        .bind(user_id)
        .bind(picker_id)
        .bind(&PayType::Premium)
        .bind(&OrderStatus::Success)
        .bind(Utc::now().to_rfc3339())
        .execute(&state.db)
        .await;

        info!("Insert order result: {:?}", result);
        result.unwrap();

        info!("Calling get_order_detail...");

        let result =
            get_order_detail(State(state.clone()), Extension(user_id), Path(order_id)).await;

        info!("get_order_detail result: {:?}", result);

        assert!(result.is_ok());

        let response = result.unwrap();
        assert_eq!(response.order_id, order_id);
        assert_eq!(response.user_id, user_id);
        assert_eq!(response.picker_id, picker_id);
        assert_eq!(response.picker_alias, "Test Picker");
        assert_eq!(response.amount, 500);
        assert_eq!(response.pay_type, PayType::Premium);
        assert_eq!(response.status, OrderStatus::Success);
    }

    #[tokio::test]
    #[serial]
    async fn test_get_order_detail_not_found() {
        let state = create_test_app_state().await;
        let user_id = Uuid::new_v4();
        let order_id = Uuid::new_v4();

        let result = get_order_detail(State(state), Extension(user_id), Path(order_id)).await;

        assert!(result.is_err());
        match result.unwrap_err() {
            AppError::NotFound(msg) => assert_eq!(msg, "Order not found"),
            _ => panic!("Expected NotFound error"),
        }
    }

    #[tokio::test]
    #[serial]
    async fn test_get_order_detail_simple() {
        let state = create_test_app_state().await;
        let user_id = Uuid::new_v4();
        let dev_user_id = Uuid::new_v4();
        let picker_id = Uuid::new_v4();
        let order_id = Uuid::new_v4();

        // 创建测试用户
        sqlx::query(
            r#"
            INSERT INTO users (user_id, email, user_name, user_password, user_type, private_key, wallet_address, premium_balance, created_at)
            VALUES (?, 'user@test.com', 'Test User', 'hashed_password', 'gen', 'private_key_123', 'wallet123', 1000, ?)
            "#,
        )
        .bind(user_id)
        .bind(Utc::now().to_rfc3339())
        .execute(&state.db)
        .await
        .unwrap();

        // 创建测试开发者用户
        sqlx::query(
            r#"
            INSERT INTO users (user_id, email, user_name, user_password, user_type, private_key, wallet_address, premium_balance, created_at)
            VALUES (?, 'dev@test.com', 'Dev User', 'hashed_password', 'dev', 'private_key_456', 'devwallet456', 0, ?)
            "#,
        )
        .bind(dev_user_id)
        .bind(Utc::now().to_rfc3339())
        .execute(&state.db)
        .await
        .unwrap();

        // 创建测试Picker
        sqlx::query(
            r#"
            INSERT INTO pickers (picker_id, dev_user_id, alias, description, price, image_path, file_path, version, status, download_count, created_at, updated_at)
            VALUES (?, ?, 'Test Picker', 'Test Description', 500, 'test.jpg', 'test.exe', '1.0', 'active', 0, ?, ?)
            "#,
        )
        .bind(picker_id)
        .bind(dev_user_id)
        .bind(Utc::now().to_rfc3339())
        .bind(Utc::now().to_rfc3339())
        .execute(&state.db)
        .await
        .unwrap();

        // 创建测试订单
        sqlx::query(
            r#"
            INSERT INTO orders (order_id, user_id, picker_id, amount, pay_type, status, tx_hash, created_at, expires_at)
            VALUES (?, ?, ?, 500, ?, ?, NULL, ?, NULL)
            "#,
        )
        .bind(order_id)
        .bind(user_id)
        .bind(picker_id)
        .bind(&PayType::Premium)
        .bind(&OrderStatus::Success)
        .bind(Utc::now().to_rfc3339())
        .execute(&state.db)
        .await
        .unwrap();

        let result = get_order_detail(State(state), Extension(user_id), Path(order_id)).await;

        assert!(result.is_ok());

        let response = result.unwrap();
        assert_eq!(response.order_id, order_id);
        assert_eq!(response.user_id, user_id);
        assert_eq!(response.picker_id, picker_id);
        assert_eq!(response.picker_alias, "Test Picker");
        assert_eq!(response.amount, 500);
        assert_eq!(response.pay_type, PayType::Premium);
        assert_eq!(response.status, OrderStatus::Success);
    }

    // 新增测试用例：测试用户不存在
    #[tokio::test]
    #[serial]
    async fn test_create_order_user_not_found() {
        let state = create_test_app_state().await;
        let user_id = Uuid::new_v4();
        let picker_id = Uuid::new_v4();
        let dev_user_id = Uuid::new_v4();

        // 创建测试开发者用户和Picker，但不创建用户
        sqlx::query(
            r#"
            INSERT INTO users (user_id, email, user_name, user_password, user_type, private_key, wallet_address, premium_balance, created_at)
            VALUES (?, 'dev@test.com', 'Dev User', 'hashed_password', 'dev', 'private_key_456', 'devwallet456', 0, ?)
            "#,
        )
        .bind(dev_user_id)
        .bind(Utc::now().to_rfc3339())
        .execute(&state.db)
        .await
        .unwrap();

        sqlx::query(
            r#"
            INSERT INTO pickers (picker_id, dev_user_id, alias, description, price, image_path, file_path, version, status, download_count, created_at, updated_at)
            VALUES (?, ?, 'Test Picker', 'Test Description', 500, 'test.jpg', 'test.exe', '1.0', 'active', 0, ?, ?)
            "#,
        )
        .bind(picker_id)
        .bind(dev_user_id)
        .bind(Utc::now().to_rfc3339())
        .bind(Utc::now().to_rfc3339())
        .execute(&state.db)
        .await
        .unwrap();

        let request = CreateOrderRequest {
            picker_id,
            pay_type: PayType::Premium,
        };

        let result = create_order(State(state), Extension(user_id), Json(request)).await;

        assert!(result.is_err());
        match result.unwrap_err() {
            AppError::NotFound(msg) => assert_eq!(msg, "User not found"),
            _ => panic!("Expected NotFound error"),
        }
    }

    // 新增测试用例：测试Picker不活跃
    #[tokio::test]
    #[serial]
    async fn test_create_order_inactive_picker() {
        let state = create_test_app_state().await;
        let user_id = Uuid::new_v4();
        let dev_user_id = Uuid::new_v4();
        let picker_id = Uuid::new_v4();

        // 创建测试用户
        sqlx::query(
            r#"
            INSERT INTO users (user_id, email, user_name, user_password, user_type, private_key, wallet_address, premium_balance, created_at)
            VALUES (?, 'user@test.com', 'Test User', 'hashed_password', 'gen', 'private_key_123', 'wallet123', 1000, ?)
            "#,
        )
        .bind(user_id)
        .bind(Utc::now().to_rfc3339())
        .execute(&state.db)
        .await
        .unwrap();

        // 创建测试开发者用户
        sqlx::query(
            r#"
            INSERT INTO users (user_id, email, user_name, user_password, user_type, private_key, wallet_address, premium_balance, created_at)
            VALUES (?, 'dev@test.com', 'Dev User', 'hashed_password', 'dev', 'private_key_456', 'devwallet456', 0, ?)
            "#,
        )
        .bind(dev_user_id)
        .bind(Utc::now().to_rfc3339())
        .execute(&state.db)
        .await
        .unwrap();

        // 创建非活跃的测试Picker
        sqlx::query(
            r#"
            INSERT INTO pickers (picker_id, dev_user_id, alias, description, price, image_path, file_path, version, status, download_count, created_at, updated_at)
            VALUES (?, ?, 'Test Picker', 'Test Description', 500, 'test.jpg', 'test.exe', '1.0', 'inactive', 0, ?, ?)
            "#,
        )
        .bind(picker_id)
        .bind(dev_user_id)
        .bind(Utc::now().to_rfc3339())
        .bind(Utc::now().to_rfc3339())
        .execute(&state.db)
        .await
        .unwrap();

        let request = CreateOrderRequest {
            picker_id,
            pay_type: PayType::Premium,
        };

        let result = create_order(State(state), Extension(user_id), Json(request)).await;

        assert!(result.is_err());
        match result.unwrap_err() {
            AppError::NotFound(msg) => assert_eq!(msg, "Picker not found"),
            _ => panic!("Expected NotFound error"),
        }
    }

    // 新增测试用例：测试获取用户订单列表空结果
    #[tokio::test]
    #[serial]
    async fn test_get_user_orders_empty() {
        let state = create_test_app_state().await;
        let user_id = Uuid::new_v4();

        let query = OrderQuery {
            page: Some(1),
            size: Some(10),
            status: None,
        };

        let result = get_user_orders(State(state), Extension(user_id), Query(query)).await;

        assert!(result.is_ok());

        let response = result.unwrap();
        assert_eq!(response.orders.len(), 0);
        assert_eq!(response.total, 0);
        assert_eq!(response.page, 1);
        assert_eq!(response.size, 10);
        assert_eq!(response.has_next, false);
    }

    // 新增测试用例：测试获取用户订单列表按状态筛选
    #[tokio::test]
    #[serial]
    async fn test_get_user_orders_by_status() {
        let state = create_test_app_state().await;
        let user_id = Uuid::new_v4();
        let dev_user_id = Uuid::new_v4();
        let picker_id = Uuid::new_v4();
        let order_id = Uuid::new_v4();

        // 创建测试用户
        sqlx::query(
            r#"
            INSERT INTO users (user_id, email, user_name, user_password, user_type, private_key, wallet_address, premium_balance, created_at)
            VALUES (?, 'user@test.com', 'Test User', 'hashed_password', 'gen', 'private_key_123', 'wallet123', 1000, ?)
            "#,
        )
        .bind(user_id)
        .bind(Utc::now().to_rfc3339())
        .execute(&state.db)
        .await
        .unwrap();

        // 创建测试开发者用户
        sqlx::query(
            r#"
            INSERT INTO users (user_id, email, user_name, user_password, user_type, private_key, wallet_address, premium_balance, created_at)
            VALUES (?, 'dev@test.com', 'Dev User', 'hashed_password', 'dev', 'private_key_456', 'devwallet456', 0, ?)
            "#,
        )
        .bind(dev_user_id)
        .bind(Utc::now().to_rfc3339())
        .execute(&state.db)
        .await
        .unwrap();

        // 创建测试Picker
        sqlx::query(
            r#"
            INSERT INTO pickers (picker_id, dev_user_id, alias, description, price, image_path, file_path, version, status, download_count, created_at, updated_at)
            VALUES (?, ?, 'Test Picker', 'Test Description', 500, 'test.jpg', 'test.exe', '1.0', 'active', 0, ?, ?)
            "#,
        )
        .bind(picker_id)
        .bind(dev_user_id)
        .bind(Utc::now().to_rfc3339())
        .bind(Utc::now().to_rfc3339())
        .execute(&state.db)
        .await
        .unwrap();

        // 创建测试订单
        sqlx::query(
            r#"
            INSERT INTO orders (order_id, user_id, picker_id, amount, pay_type, status, tx_hash, created_at, expires_at)
            VALUES (?, ?, ?, 500, ?, ?, NULL, ?, NULL)
            "#,
        )
        .bind(order_id)
        .bind(user_id)
        .bind(picker_id)
        .bind(&PayType::Premium)
        .bind(&OrderStatus::Success)
        .bind(Utc::now().to_rfc3339())
        .execute(&state.db)
        .await
        .unwrap();

        let query = OrderQuery {
            page: Some(1),
            size: Some(10),
            status: Some(OrderStatus::Success),
        };

        let result = get_user_orders(State(state), Extension(user_id), Query(query)).await;

        assert!(result.is_ok());

        let response = result.unwrap();
        assert_eq!(response.orders.len(), 1);
        assert_eq!(response.total, 1);
        assert_eq!(response.orders[0].status, OrderStatus::Success);
    }

    // 新增测试用例：测试获取订单详情订单不存在
    #[tokio::test]
    #[serial]
    async fn test_get_order_detail_order_not_found() {
        let state = create_test_app_state().await;
        let user_id = Uuid::new_v4();
        let order_id = Uuid::new_v4();

        let result = get_order_detail(State(state), Extension(user_id), Path(order_id)).await;

        assert!(result.is_err());
        match result.unwrap_err() {
            AppError::NotFound(msg) => assert_eq!(msg, "Order not found"),
            _ => panic!("Expected NotFound error"),
        }
    }

    // 新增测试用例：测试获取订单详情但Picker不存在
    #[tokio::test]
    #[serial]
    async fn test_get_order_detail_picker_not_found() {
        let state = create_test_app_state().await;
        let user_id = Uuid::new_v4();
        let dev_user_id = Uuid::new_v4();
        let order_id = Uuid::new_v4();
        let picker_id = Uuid::new_v4();

        // 创建测试用户
        sqlx::query(
            r#"
            INSERT INTO users (user_id, email, user_name, user_password, user_type, private_key, wallet_address, premium_balance, created_at)
            VALUES (?, 'user@test.com', 'Test User', 'hashed_password', 'gen', 'private_key_123', 'wallet123', 1000, ?)
            "#,
        )
        .bind(user_id)
        .bind(Utc::now().to_rfc3339())
        .execute(&state.db)
        .await
        .unwrap();

        // 创建测试开发者用户
        sqlx::query(
            r#"
            INSERT INTO users (user_id, email, user_name, user_password, user_type, private_key, wallet_address, premium_balance, created_at)
            VALUES (?, 'dev@test.com', 'Dev User', 'hashed_password', 'dev', 'private_key_456', 'devwallet456', 0, ?)
            "#,
        )
        .bind(dev_user_id)
        .bind(Utc::now().to_rfc3339())
        .execute(&state.db)
        .await
        .unwrap();

        // 创建测试Picker
        sqlx::query(
            r#"
            INSERT INTO pickers (picker_id, dev_user_id, alias, description, price, image_path, file_path, version, status, download_count, created_at, updated_at)
            VALUES (?, ?, 'Test Picker', 'Test Description', 500, 'test.jpg', 'test.exe', '1.0', 'active', 0, ?, ?)
            "#,
        )
        .bind(picker_id)
        .bind(dev_user_id)
        .bind(Utc::now().to_rfc3339())
        .bind(Utc::now().to_rfc3339())
        .execute(&state.db)
        .await
        .unwrap();

        // 创建订单
        sqlx::query(
            r#"
            INSERT INTO orders (order_id, user_id, picker_id, amount, pay_type, status, tx_hash, created_at, expires_at)
            VALUES (?, ?, ?, 500, ?, ?, NULL, ?, NULL)
            "#,
        )
        .bind(order_id)
        .bind(user_id)
        .bind(picker_id)
        .bind(&PayType::Premium)
        .bind(&OrderStatus::Success)
        .bind(Utc::now().to_rfc3339())
        .execute(&state.db)
        .await
        .unwrap();

        // 删除Picker以模拟Picker不存在的情况
        sqlx::query("DELETE FROM pickers WHERE picker_id = ?")
            .bind(picker_id)
            .execute(&state.db)
            .await
            .unwrap();

        let result = get_order_detail(State(state), Extension(user_id), Path(order_id)).await;

        assert!(result.is_err());
    }

    // 新增测试用例：测试使用钱包支付创建订单
    #[tokio::test]
    #[serial]
    async fn test_create_order_wallet_payment() {
        let state = create_test_app_state().await;
        let user_id = Uuid::new_v4();
        let dev_user_id = Uuid::new_v4();
        let picker_id = Uuid::new_v4();

        // 创建测试用户，钱包余额足够支付
        // 修复用户类型，使其符合数据库约束('gen'或'dev')
        sqlx::query(
            r#"
            INSERT INTO users (user_id, email, user_name, user_password, user_type, private_key, wallet_address, premium_balance, created_at)
            VALUES (?, 'user@test.com', 'Test User', 'hashed_password', 'gen', 'private_key_123', '0x1234567890123456789012345678901234567890', 1000, ?)
            "#,
        )
        .bind(user_id)
        .bind(Utc::now().to_rfc3339())
        .execute(&state.db)
        .await
        .unwrap();

        // 创建测试开发者用户
        sqlx::query(
            r#"
            INSERT INTO users (user_id, email, user_name, user_password, user_type, private_key, wallet_address, premium_balance, created_at)
            VALUES (?, 'dev@test.com', 'Dev User', 'hashed_password', 'dev', 'private_key_456', '0xabcdef1234567890abcdef1234567890abcdef12', 0, ?)
            "#,
        )
        .bind(dev_user_id)
        .bind(Utc::now().to_rfc3339())
        .execute(&state.db)
        .await
        .unwrap();

        // 创建测试Picker
        sqlx::query(
            r#"
            INSERT INTO pickers (picker_id, dev_user_id, alias, description, price, image_path, file_path, version, status, download_count, created_at, updated_at)
            VALUES (?, ?, 'Test Picker', 'Test Description', 500, 'test.jpg', 'test.exe', '1.0', 'active', 0, ?, ?)
            "#,
        )
        .bind(picker_id)
        .bind(dev_user_id)
        .bind(Utc::now().to_rfc3339())
        .bind(Utc::now().to_rfc3339())
        .execute(&state.db)
        .await
        .unwrap();

        // 创建测试路由
        use axum::http::{Request, StatusCode};
        use axum::Router;
        use tower::ServiceExt;

        let app = Router::new()
            .route("/api/orders", axum::routing::post(create_order))
            .layer(axum::middleware::from_fn_with_state(
                state.clone(),
                move |State(_state): State<AppState>,
                      mut request: axum::http::Request<axum::body::Body>,
                      next: axum::middleware::Next| async move {
                    request.extensions_mut().insert(user_id);
                    next.run(request).await
                },
            ))
            .with_state(state.clone());

        // 创建请求体
        let body = serde_json::json!({
            "picker_id": picker_id,
            "pay_type": "wallet"
        });

        let request = Request::builder()
            .method("POST")
            .uri("/api/orders")
            .header("content-type", "application/json")
            .body(axum::body::Body::from(
                serde_json::to_string(&body).unwrap(),
            ))
            .unwrap();

        let response = app.oneshot(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::OK);
    }
}
