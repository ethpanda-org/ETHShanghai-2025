use axum::{
    extract::{Query, State},
    http::HeaderMap,
    response::{IntoResponse},
    body::Body as AxumBody,
};
use serde::Deserialize;
use utoipa::ToSchema;
use tokio::fs::File;
use tokio_util::io::ReaderStream;
use tracing::info;
use chrono::Utc;

use crate::config::AppState;
use crate::models::{Order, OrderStatus, Picker};
use crate::utils::AppError;

// 下载请求的查询参数
#[derive(Deserialize, ToSchema)]
pub struct DownloadQuery {
    pub token: String,
}

// 处理下载请求
#[utoipa::path(
    get,
    path = "/download",
    tag = "download",
    summary = "Download Picker file",
    description = "Download a purchased Picker file using a download token",
    params(
        ("token" = String, Query, description = "Download token")
    ),
    responses(
        (status = 200, description = "File download successful", content_type = "application/octet-stream"),
        (status = 401, description = "Token is invalid or expired", body = crate::openapi::ErrorResponse),
        (status = 404, description = "Order, Picker, or file not found", body = crate::openapi::ErrorResponse),
        (status = 500, description = "Internal server error", body = crate::openapi::ErrorResponse)
    )
)]
pub async fn download(
    State(state): State<AppState>,
    Query(query): Query<DownloadQuery>,
) -> Result<impl IntoResponse, AppError> {
    info!("Download request received with token: {}", query.token);
    // 1. 验证token
    let token = query.token;
    let order_id = {
        let mut tokens = state.download_tokens.lock().map_err(|e| AppError::InternalServerError(format!("Download token lock error: {:?}", e)))?;
        let download_token = tokens.remove(&token).ok_or(AppError::Unauthorized("Invalid download token".to_string()))?;
        
        // 2. 检查token是否过期
        if download_token.is_expired() {
            return Err(AppError::Unauthorized("Download token is expired".to_string()));
        }
        
        download_token.order_id
    };
    info!("Download request for order ID: {}", order_id);
    // 3. 获取订单信息
    let order_result = sqlx::query_as("SELECT * FROM orders WHERE order_id = ?")
        .bind(order_id)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| AppError::DatabaseError(format!("Order fetch error: {:?}", e)));
    
    let order: Order = match order_result {
        Ok(Some(order)) => order,
        Ok(None) => {
            return Err(AppError::NotFound("Order not found".to_string()));
        },
        Err(e) => {
            return Err(AppError::DatabaseError(format!("Order fetch error: {:?}", e)));
        },
    };
    info!("Download request for order ID: {}, picker ID: {}", order_id, order.picker_id);
    // 4. 检查订单状态
    if order.status != OrderStatus::Success {
        return Err(AppError::NotFound("Order not paid".to_string()));
    }
    
    // 5. 获取Picker信息
    let picker_result = sqlx::query_as("SELECT * FROM pickers WHERE picker_id = ?")
        .bind(order.picker_id)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| AppError::DatabaseError(format!("Picker fetch error: {:?}", e)));
    
    let picker: Picker = match picker_result {
        Ok(Some(picker)) => picker,
        Ok(None) => {
            return Err(AppError::NotFound("Picker not found".to_string()));
        },
        Err(e) => {
            return Err(AppError::DatabaseError(format!("Picker fetch error: {:?}", e)));
        },
    };
    info!("Download request for order ID: {}, picker ID: {}, file path: {}", order_id, order.picker_id, picker.file_path);
    
    // 6. 检查文件是否存在
    let file_path = &picker.file_path;
    if !tokio::fs::metadata(file_path).await.is_ok() {
        return Err(AppError::NotFound("File not found".to_string()));
    }
    
    // 7. 打开文件
    let file = File::open(file_path).await.map_err(|e| AppError::InternalServerError(format!("File open error: {:?}", e)))?;
    let stream = ReaderStream::new(file);
    let body = AxumBody::from_stream(stream);
    info!("Download request update times");
    // 8. 更新下载次数
    sqlx::query("UPDATE pickers SET download_count = download_count + 1 WHERE picker_id = ?")
        .bind(picker.picker_id)
        .execute(&state.db)
        .await
        .map_err(|e| AppError::DatabaseError(format!("Download count update error: {:?}", e)))?;
    
    // 9. 设置响应头
    let mut headers = HeaderMap::new();
    headers.insert("Content-Type", "application/octet-stream".parse().unwrap());
    // 重新格式化文件名
    let download_date = Utc::now().format("%Y-%m-%d");
    // 从文件路径中提取文件名
    let original_filename = picker.file_path.split('/').last().unwrap_or("picker.exe");
    // 分离文件名和扩展名
    let mut parts: Vec<&str> = original_filename.split('.').collect();
    let extension = if parts.len() > 1 {
        parts.pop().unwrap()
    } else {
        ""
    };
    let base_name = parts.join(".");
    // 组合新文件名，加入下载日期
    let filename = format!("{}_{}.{}", base_name, download_date, extension);
    info!("Downloading file: {}", filename);
    headers.insert("Content-Disposition", format!("attachment; filename=\"{}\"", filename).parse().unwrap());
    
    Ok((headers, body).into_response())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::utils_tests::create_test_app_state;
    use crate::models::{DownloadToken, PayType};
    use axum::extract::{Query, State};
    use chrono::{Duration, Utc};
    use serial_test::serial;
    use uuid::Uuid;

    async fn create_test_file(path: &str, content: &[u8]) -> std::io::Result<()> {
        if let Some(parent) = std::path::Path::new(path).parent() {
            tokio::fs::create_dir_all(parent).await?;
        }
        tokio::fs::write(path, content).await
    }

    #[tokio::test]
    #[serial]
    async fn test_download_success() {
        let state = create_test_app_state().await;
        let user_id = Uuid::new_v4();
        let picker_id = Uuid::new_v4();
        let dev_user_id = Uuid::new_v4();
        let order_id = Uuid::new_v4();
        let token = "test_token_123".to_string();
        let file_path = "test_files/test_picker.exe";

        // 创建测试文件
        create_test_file(file_path, b"test file content").await.unwrap();

        // 创建测试数据
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

        sqlx::query(
            r#"
            INSERT INTO users (user_id, email, user_name, user_password, user_type, private_key, wallet_address, premium_balance, created_at)
            VALUES (?, 'dev@test.com', 'Dev User', 'hashed_password', 'dev', 'private_key_123', 'devwallet123', 0, ?)
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
            VALUES (?, ?, 'Test Picker', 'Test Description', 500, 'test.jpg', 'test_files/test_picker.exe', '1.0', 'active', 0, ?, ?)
            "#,
        )
        .bind(picker_id)
        .bind(dev_user_id)
        .bind(Utc::now().to_rfc3339())
        .bind(Utc::now().to_rfc3339())
        .execute(&state.db)
        .await
        .unwrap();

        sqlx::query(
            r#"
            INSERT INTO orders (order_id, status, user_id, picker_id, pay_type, amount, tx_hash, created_at, expires_at)
            VALUES (?, ?, ?, ?, ?, 500, NULL, ?, ?)
            "#,
        )
        .bind(order_id)
        .bind(&OrderStatus::Success)
        .bind(user_id)
        .bind(picker_id)
        .bind(&PayType::Premium)
        .bind(Utc::now().to_rfc3339())
        .bind((Utc::now() + Duration::minutes(30)).to_rfc3339())
        .execute(&state.db)
        .await
        .unwrap();

        // 添加下载token
        let download_token = DownloadToken {
            token: token.clone(),
            order_id,
            expires_at: Utc::now() + Duration::minutes(10),
        };
        state.download_tokens.lock().unwrap().insert(token.clone(), download_token);

        let query = DownloadQuery { token: token.clone() };
        let result = download(State(state.clone()), Query(query)).await;

        if let Err(ref e) = result {
            info!("Download failed with error: {:?}", e);
            // 让我们看看具体的错误信息
            match e {
                AppError::InternalServerError(msg) => info!("Internal server error: {}", msg),
                AppError::NotFound(msg) => info!("Not found: {}", msg),
                AppError::Unauthorized(msg) => info!("Unauthorized access: {}", msg),
                _ => info!("Other error: {:?}", e),
            }
        }
        assert!(result.is_ok(), "Download should succeed but got error: {:?}", result.err());

        // 验证token已被移除
        let tokens = state.download_tokens.lock().unwrap();
        assert!(!tokens.contains_key(&token));

        // 验证下载次数已更新
        let picker: Picker = sqlx::query_as("SELECT * FROM pickers WHERE picker_id = ?")
            .bind(picker_id)
            .fetch_one(&state.db)
            .await
            .unwrap();
        assert_eq!(picker.download_count, 1);

        // 清理测试文件
        let _ = tokio::fs::remove_file(file_path).await;
        let _ = tokio::fs::remove_dir("test_files").await;
    }

    #[tokio::test]
    #[serial]
    async fn test_download_invalid_token() {
        let state = create_test_app_state().await;
        let token = "invalid_token".to_string();

        let query = DownloadQuery { token };
        let result = download(State(state.clone()), Query(query)).await;

        assert!(result.is_err());
        let err = match result {
            Err(e) => e,
            Ok(_) => panic!("Expected error, but got Ok"),
        };
        match err {
            AppError::Unauthorized(msg) => info!("Unauthorized error: {}", msg),
            _ => panic!("Expected Unauthorized error"),
        }
    }

    #[tokio::test]
    #[serial]
    async fn test_download_expired_token() {
        let state = create_test_app_state().await;
        let order_id = Uuid::new_v4();
        let token = "expired_token_123".to_string();

        // 添加过期的下载token
        let download_token = DownloadToken {
            token: token.clone(),
            order_id,
            expires_at: Utc::now() - Duration::minutes(10), // 已过期
        };
        state.download_tokens.lock().unwrap().insert(token.clone(), download_token);

        let query = DownloadQuery { token: token.clone() };
        let result = download(State(state.clone()), Query(query)).await;

        assert!(result.is_err());
        let err = match result {
            Err(e) => e,
            Ok(_) => panic!("Expected error, but got Ok"),
        };
        match err {
            AppError::Unauthorized(_) => {},
            _ => panic!("Expected Unauthorized error"),
        }

        // 验证过期token已被移除
        let tokens = state.download_tokens.lock().unwrap();
        assert!(!tokens.contains_key(&token));
    }

    #[tokio::test]
    #[serial]
    async fn test_download_order_not_found() {
        let state = create_test_app_state().await;
        let order_id = Uuid::new_v4();
        let token = "valid_token_123".to_string();

        // 添加有效的下载token，但没有对应的订单
        let download_token = DownloadToken {
            token: token.clone(),
            order_id,
            expires_at: Utc::now() + Duration::minutes(10),
        };
        state.download_tokens.lock().unwrap().insert(token.clone(), download_token);

        let query = DownloadQuery { token };
        let result = download(State(state.clone()), Query(query)).await;

        assert!(result.is_err());
        let err = match result {
            Err(e) => e,
            Ok(_) => panic!("Expected error, but got Ok"),
        };
        match err {
            AppError::NotFound(msg) => assert_eq!(msg, "Order not found"),
            _ => panic!("Expected NotFound error"),
        }
    }

    #[tokio::test]
    #[serial]
    async fn test_download_order_not_success() {
        let state = create_test_app_state().await;
        let user_id = Uuid::new_v4();
        let picker_id = Uuid::new_v4();
        let dev_user_id = Uuid::new_v4();
        let order_id = Uuid::new_v4();
        let token = "valid_token_123".to_string();

        // 创建测试数据
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

        sqlx::query(
            r#"
            INSERT INTO users (user_id, email, user_name, user_password, user_type, private_key, wallet_address, premium_balance, created_at)
            VALUES (?, 'dev@test.com', 'Dev User', 'hashed_password', 'dev', 'private_key_123', 'devwallet123', 0, ?)
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

        // 创建pending状态的订单
        sqlx::query(
            r#"
            INSERT INTO orders (order_id, status, user_id, picker_id, pay_type, amount, tx_hash, created_at, expires_at)
            VALUES (?, ?, ?, ?, ?, 500, '0x123', ?, ?)
            "#,
        )
        .bind(order_id)
        .bind(&OrderStatus::Pending)
        .bind(user_id)
        .bind(picker_id)
        .bind(&PayType::Wallet)
        .bind(Utc::now().to_rfc3339())
        .bind((Utc::now() + Duration::minutes(30)).to_rfc3339())
        .execute(&state.db)
        .await
        .unwrap();

        // 添加有效的下载token
        let download_token = DownloadToken {
            token: token.clone(),
            order_id,
            expires_at: Utc::now() + Duration::minutes(10),
        };
        info!("Inserting download token: {}, order_id: {}", token, order_id);
        state.download_tokens.lock().unwrap().insert(token.clone(), download_token);

        let query = DownloadQuery { token };
        let result = download(State(state.clone()), Query(query)).await;

        assert!(result.is_err());
        let err = match result {
            Err(e) => e,
            Ok(_) => panic!("Expected error, but got Ok"),
        };
        match err {
            AppError::NotFound(msg) => assert_eq!(msg, "Order not paid"),
            _ => panic!("Expected NotFound error"),
        }
    }

    #[tokio::test]
    #[serial]
    async fn test_download_order_not_found_picker() {
        let state = create_test_app_state().await;
        let user_id = Uuid::new_v4();
        let picker_id = Uuid::new_v4();
        let dev_user_id = Uuid::new_v4();
        let order_id = Uuid::new_v4();
        let token = "valid_token_123".to_string();
        let file_path = "test_files/test_picker.exe";

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

        // 创建开发者用户
        sqlx::query(
            r#"
            INSERT INTO users (user_id, email, user_name, user_password, user_type, private_key, wallet_address, premium_balance, created_at)
            VALUES (?, 'dev@test.com', 'Dev User', 'hashed_password', 'dev', 'private_key_123', 'devwallet123', 0, ?)
            "#,
        )
        .bind(dev_user_id)
        .bind(Utc::now().to_rfc3339())
        .execute(&state.db)
        .await
        .unwrap();

        // 创建测试文件
        create_test_file(file_path, b"test file content").await.unwrap();

        // 创建Picker
        sqlx::query(
            r#"
            INSERT INTO pickers (picker_id, dev_user_id, alias, description, price, image_path, file_path, version, status, download_count, created_at, updated_at)
            VALUES (?, ?, 'Test Picker', 'Test Description', 500, 'test.jpg', ?, '1.0', 'active', 0, ?, ?)
            "#,
        )
        .bind(picker_id)
        .bind(dev_user_id)
        .bind(file_path)  // 使用模拟的文件路径
        .bind(Utc::now().to_rfc3339())
        .bind(Utc::now().to_rfc3339())
        .execute(&state.db)
        .await
        .unwrap();

        // 创建成功订单
        sqlx::query(
            r#"
            INSERT INTO orders (order_id, status, user_id, picker_id, pay_type, amount, tx_hash, created_at, expires_at)
            VALUES (?, ?, ?, ?, ?, 500, NULL, ?, ?)
            "#,
        )
        .bind(order_id)
        .bind(&OrderStatus::Success)
        .bind(user_id)
        .bind(picker_id)
        .bind(&PayType::Premium)
        .bind(Utc::now().to_rfc3339())
        .bind((Utc::now() + Duration::minutes(30)).to_rfc3339())
        .execute(&state.db)
        .await
        .unwrap();

        // 移除Picker以模拟Picker不存在的情况
        sqlx::query("DELETE FROM pickers WHERE picker_id = ?")
            .bind(picker_id)
            .execute(&state.db)
            .await
            .unwrap();

        // 添加有效的下载token
        let download_token = DownloadToken {
            token: token.clone(),
            order_id,
            expires_at: Utc::now() + Duration::minutes(10),
        };
        state.download_tokens.lock().unwrap().insert(token.clone(), download_token);

        let query = DownloadQuery { token };
        let result = download(State(state.clone()), Query(query)).await;

        assert!(result.is_err());
        let err = match result {
            Err(e) => e,
            Ok(_) => panic!("Expected error, but got Ok"),
        };
        
        // Check if it's a NotFound error with the correct message
        match err {
            AppError::NotFound(msg) => {
                assert_eq!(msg, "Order not found")
            },
            _ => {
                panic!("Expected NotFound error, but got {:?}", err);
            },
        }

        // 清理测试文件
        let _ = tokio::fs::remove_file(file_path).await;
        let _ = tokio::fs::remove_dir_all("test_files").await;
    }

    #[tokio::test]
    #[serial]
    async fn test_download_file_not_found() {
        let state = create_test_app_state().await;
        let user_id = Uuid::new_v4();
        let picker_id = Uuid::new_v4();
        let dev_user_id = Uuid::new_v4();
        let order_id = Uuid::new_v4();
        let token = "valid_token_123".to_string();

        // 创建测试数据
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

        sqlx::query(
            r#"
            INSERT INTO users (user_id, email, user_name, user_password, user_type, private_key, wallet_address, premium_balance, created_at)
            VALUES (?, 'dev@test.com', 'Dev User', 'hashed_password', 'dev', 'private_key_123', 'devwallet123', 0, ?)
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

        sqlx::query(
            r#"
            INSERT INTO orders (order_id, status, user_id, picker_id, pay_type, amount, tx_hash, created_at, expires_at)
            VALUES (?, ?, ?, ?, ?, 500, NULL, ?, NULL)
            "#,
        )
        .bind(order_id)
        .bind(&OrderStatus::Success)
        .bind(user_id)
        .bind(picker_id)
        .bind(&PayType::Premium)
        .bind(Utc::now().to_rfc3339())
        .execute(&state.db)
        .await
        .unwrap();

        // 添加有效的下载token
        let download_token = DownloadToken {
            token: token.clone(),
            order_id,
            expires_at: Utc::now() + Duration::minutes(10),
        };
        state.download_tokens.lock().unwrap().insert(token.clone(), download_token);

        let query = DownloadQuery { token };
        let result = download(State(state.clone()), Query(query)).await;

        assert!(result.is_err());
        let err = match result {
            Err(e) => e,
            Ok(_) => panic!("Expected error, but got Ok"),
        };
        match err {
            AppError::NotFound(msg) => assert_eq!(msg, "File not found"),
            _ => panic!("Expected NotFound error"),
        }
    }
}