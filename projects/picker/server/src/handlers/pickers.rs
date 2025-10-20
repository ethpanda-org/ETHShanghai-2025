use std::env;
use axum::{
    extract::{Query, State, Path, Multipart},
    response::Json,
    Extension,
};
use futures_util::StreamExt;

// #[cfg(test)]
// use axum_test::TestServer;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;
use crate::config::AppState;
use crate::models::{Picker, UserType, User};
use crate::utils::AppError;

// 上传Picker请求
#[derive(Debug, Deserialize, ToSchema)]
pub struct UploadPickerRequest {
    /// Picker别名
    pub alias: String,
    /// 描述信息
    pub description: String,
    /// 价格（分为单位）
    pub price: i64,
    /// 版本号
    pub version: String,
    /// 图片文件
    #[schema(value_type = String, format = Binary)]
    pub image: (),
    /// Picker文件
    #[schema(value_type = String, format = Binary)]
    pub file: (),
}

// 上传Picker响应
#[derive(Debug, Serialize, ToSchema)]
pub struct UploadPickerResponse {
    pub picker_id: Uuid,
    pub message: String,
}

// 市场查询参数
#[derive(Debug, Deserialize, ToSchema)]
pub struct MarketQuery {
    pub page: Option<u32>,
    pub size: Option<u32>,
    pub keyword: Option<String>,
}

// Picker信息
#[derive(Debug, Serialize, ToSchema)]
pub struct PickerInfo {
    pub picker_id: Uuid,
    pub dev_user_id: Uuid,
    pub alias: String,
    pub description: String,
    pub price: i64,
    pub image_path: String,
    pub version: String,
    pub download_count: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub status: String,
}

// 市场响应
#[derive(Debug, Serialize, ToSchema)]
pub struct MarketResponse {
    pub pickers: Vec<PickerInfo>,
    pub total: u64,
}

// 上传Picker
#[utoipa::path(
    post,
    path = "/api/pickers",
    tag = "pickers",
    summary = "Upload a new Picker",
    description = "Developer uploads a new Picker to the market",
    security(
        ("bearer_auth" = [])
    ),
    request_body(
        content = UploadPickerRequest,
        content_type = "multipart/form-data",
        description = "Picker file and information"
    ),
    responses(
        (status = 200, description = "Upload successful", body = UploadPickerResponse),
        (status = 400, description = "Bad request, invalid parameters or non-developer user", body = crate::openapi::ErrorResponse),
        (status = 401, description = "Unauthorized access", body = crate::openapi::ErrorResponse),
        (status = 500, description = "Internal server error", body = crate::openapi::ErrorResponse)
    )
)]
pub async fn upload_picker(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    mut multipart: Multipart,
) -> Result<Json<UploadPickerResponse>, AppError> {

    // 验证用户是否为开发者
    let user = sqlx::query_as::<_, User>(
        "SELECT * FROM users WHERE user_id = ?",
    )
    .bind(user_id)
    .fetch_one(&state.db)
    .await
    .map_err(|_| AppError::NotFound("User not found".to_string()))?;

    if user.user_type != UserType::Dev {
        return Err(AppError::BadRequest("Only developers can upload pickers".to_string()));
    }

    let mut alias = String::new();
    let mut description = String::new();
    let mut price = 0i64;
    let mut version = String::new();
    let mut image_path = String::new();
    let mut file_path = String::new();

    // 处理multipart数据
    while let Some(field) = multipart.next_field().await.map_err(|_| AppError::BadRequest("Invalid multipart data".to_string()))? {
        let name = field.name().unwrap_or("").to_string();

        match name.as_str() {
            "alias" => {
                alias = field.text().await.map_err(|_| AppError::BadRequest("Invalid alias".to_string()))?;
            }
            "description" => {
                description = field.text().await.map_err(|_| AppError::BadRequest("Invalid description".to_string()))?;
            }
            "price" => {
                let price_str = field.text().await.map_err(|_| AppError::BadRequest("Invalid price".to_string()))?;
                price = price_str.parse().map_err(|_| AppError::BadRequest("Invalid price format".to_string()))?;
            }
            "version" => {
                version = field.text().await.map_err(|_| AppError::BadRequest("Invalid version".to_string()))?;
            }
            "image" => {
                let filename = field.file_name().unwrap_or("picker_white.jpg").to_string();
                let data = field.bytes().await.map_err(|_| AppError::BadRequest("Invalid image data".to_string()))?;
                // 创建上传目录
                tokio::fs::create_dir_all("uploads/images").await.map_err(|e| {
                    AppError::InternalServerError(format!("Failed to create uploads/images directory: {:?}", e))
                })?;
                // 生成唯一文件名
                let unique_filename = format!("{}_{}", filename, Uuid::new_v4());
                image_path = format!("uploads/images/{}.jpg", unique_filename);
                // 保存图片文件
                tokio::fs::write(&image_path, data).await.map_err(|e| {
                    AppError::InternalServerError(format!("Failed to save image file: {:?}", e))
                })?;
                image_path = format!("http://localhost:3000/{}", image_path);
            }
            "file" => {
                let filename = field.file_name().unwrap_or("picker_unknown.exe").to_string();
                // let data = field.bytes().await.map_err(|_| AppError::BadRequest("Invalid file data".to_string()))?;
                
                // 创建上传目录
                tokio::fs::create_dir_all("uploads/files").await.map_err(|e| {
                    AppError::InternalServerError(format!("Failed to create uploads/files directory: {:?}", e))
                })?;
                
                // 生成唯一文件名
                let unique_filename = format!("{}_{}", filename, Uuid::new_v4());
                file_path = format!("uploads/files/{}", unique_filename);
                
                // 保存文件 - 流式写入
                let mut file = tokio::fs::File::create(&file_path).await.map_err(|e| {
                    AppError::InternalServerError(format!("Failed to create file: {:?}", e))
                })?;
                
                let mut stream = field;
                let mut _total_bytes_written = 0;
                
                while let Some(chunk) = stream.next().await {
                    let chunk = chunk.map_err(|e| {
                        AppError::BadRequest(format!("Invalid file data: {:?}", e))
                    })?;
                    
                    _total_bytes_written += chunk.len();
                    
                    tokio::io::AsyncWriteExt::write_all(&mut file, &chunk).await.map_err(|e| {
                        AppError::InternalServerError(format!("Failed to write to file: {:?}", e))
                    })?;
                }
                            }
            _ => {}
        }
    }

    // 验证必填字段
    if alias.is_empty() || description.is_empty() || version.is_empty() || file_path.is_empty() {
        return Err(AppError::BadRequest("Missing required fields".to_string()));
    }

    // 单独处理 image 为空情况
    if image_path.is_empty() {
        image_path = "picker_white.jpg".to_string(); // 提供默认值
    }

    // 创建Picker记录
    let picker_id = Uuid::new_v4();
    let now = Utc::now();

    sqlx::query(
        r#"
        INSERT INTO pickers (picker_id, dev_user_id, alias, description, price, image_path, file_path, version, status, download_count, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', 0, ?, ?)
        "#,
    )
    .bind(picker_id)
    .bind(user_id)
    .bind(&alias)
    .bind(&description)
    .bind(price)
    .bind(&image_path)
    .bind(&file_path)
    .bind(&version)
    .bind(now.to_rfc3339())
    .bind(now.to_rfc3339())
    .execute(&state.db)
    .await
    .map_err(|e| AppError::DatabaseError(format!("Failed to insert picker: {:?}", e)))?;

    Ok(Json(UploadPickerResponse {
        picker_id,
        message: "Picker uploaded successfully".to_string(),
    }))
}

// 获取市场列表
#[utoipa::path(
    get,
    path = "/api/pickers",
    tag = "pickers",
    summary = "Get Picker Market List",
    description = "Get a list of available pickers, supports pagination and search",
    params(
        ("page" = Option<u32>, Query, description = "Page number, default is 1"),
        ("size" = Option<u32>, Query, description = "Number of items per page, default is 10"),
        ("keyword" = Option<String>, Query, description = "Search keyword")
    ),
    responses(
        (status = 200, description = "Get market list successfully", body = MarketResponse),
        (status = 500, description = "Internal server error", body = crate::openapi::ErrorResponse)
    )
)]
pub async fn get_market(
    State(state): State<AppState>,
    Query(query): Query<MarketQuery>,
) -> Result<Json<MarketResponse>, AppError> {
    let page = query.page.unwrap_or(1);
    let size = query.size.unwrap_or(10);
    // 确保page至少为1，防止减法溢出
    let page = if page < 1 { 1 } else { page };
    let offset = (page - 1) * size;

    // 构建查询条件和获取数据
    let (pickers, total) = if let Some(keyword) = &query.keyword {
        let search_pattern = format!("%{}%", keyword);
        
        // 获取总数
        let total: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) as count FROM pickers WHERE status = 'active' AND (alias LIKE ? OR description LIKE ?)"
        )
        .bind(&search_pattern)
        .bind(&search_pattern)
        .fetch_one(&state.db)
        .await
        .map_err(|e| AppError::DatabaseError(format!("Failed to get market total: {:?}", e)))?;

        // 获取Picker列表
        let pickers: Vec<Picker> = sqlx::query_as(
            "SELECT * FROM pickers WHERE status = 'active' AND (alias LIKE ? OR description LIKE ?) ORDER BY created_at DESC LIMIT ? OFFSET ?"
        )
        .bind(&search_pattern)
        .bind(&search_pattern)
        .bind(size as i64)
        .bind(offset as i64)
        .fetch_all(&state.db)
        .await
        .map_err(|e| AppError::DatabaseError(format!("Failed to get market pickers: {:?}", e)))?;

        (pickers, total.0)
    } else {
        // 获取总数
        let total: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) as count FROM pickers WHERE status = 'active'"
        )
        .fetch_one(&state.db)
        .await
        .map_err(|e| AppError::DatabaseError(format!("Failed to get market total: {:?}", e)))?;

        // 获取Picker列表
        let pickers: Vec<Picker> = sqlx::query_as(
            "SELECT * FROM pickers WHERE status = 'active' ORDER BY created_at DESC LIMIT ? OFFSET ?"
        )
        .bind(size as i64)
        .bind(offset as i64)
        .fetch_all(&state.db)
        .await
        .map_err(|e| AppError::DatabaseError(format!("Failed to get market pickers: {:?}", e)))?;

        (pickers, total.0)
    };

    let picker_infos: Vec<PickerInfo> = pickers.into_iter().map(|p| PickerInfo {
        picker_id: p.picker_id,
        dev_user_id: p.dev_user_id,
        alias: p.alias,
        description: p.description,
        price: p.price,
        image_path: p.image_path,
        version: p.version,
        download_count: p.download_count,
        created_at: p.created_at,
        updated_at: p.updated_at,
        status: p.status,
    }).collect();

    Ok(Json(MarketResponse {
        pickers: picker_infos,
        total: total as u64,
    }))
}

// 获取Picker详情
#[utoipa::path(
    get,
    path = "/api/pickers/{picker_id}",
    tag = "pickers",
    summary = "Get Picker Details",
    description = "Get details of a specific picker by its ID",
    params(
        ("picker_id" = uuid::Uuid, Path, description = "Picker's unique identifier")
    ),
    responses(
        (status = 200, description = "Get picker details successfully", body = PickerInfo),
        (status = 404, description = "Picker not found", body = crate::openapi::ErrorResponse),
        (status = 500, description = "Internal server error", body = crate::openapi::ErrorResponse)
    )
)]
pub async fn get_picker_detail(
    State(state): State<AppState>,
    Path(picker_id): Path<Uuid>,
) -> Result<Json<PickerInfo>, AppError> {
    let picker = sqlx::query_as::<_, Picker>(
        "SELECT * FROM pickers WHERE picker_id = ? AND status = 'active'",
    )
    .bind(picker_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| AppError::DatabaseError(format!("Failed to get picker detail: {:?}", e)))?
    .ok_or_else(|| AppError::NotFound("Picker not found".to_string()))?;

    Ok(Json(PickerInfo {
        picker_id: picker.picker_id,
        dev_user_id: picker.dev_user_id,
        alias: picker.alias,
        description: picker.description,
        price: picker.price,
        image_path: picker.image_path,
        version: picker.version,
        download_count: picker.download_count as i64,
        created_at: picker.created_at,
        updated_at: picker.updated_at,
        status: picker.status,
    }))
}

// 删除Picker
#[utoipa::path(
    delete,
    path = "/api/pickers/{picker_id}",
    tag = "pickers",
    summary = "Delete a Picker",
    description = "Developer deletes their own Picker",
    security(
        ("bearer_auth" = [])
    ),
    params(
        ("picker_id" = uuid::Uuid, Path, description = "Picker's unique identifier")
    ),
    responses(
        (status = 200, description = "Delete successful", body = String),
        (status = 400, description = "Bad request or unauthorized deletion", body = crate::openapi::ErrorResponse),
        (status = 401, description = "Unauthorized access", body = crate::openapi::ErrorResponse),
        (status = 404, description = "Picker not found", body = crate::openapi::ErrorResponse),
        (status = 500, description = "Internal server error", body = crate::openapi::ErrorResponse)
    )
)]
pub async fn delete_picker(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Path(picker_id): Path<Uuid>,
) -> Result<String, AppError> {
    // 验证用户是否为开发者
    let user = sqlx::query_as::<_, User>(
        "SELECT * FROM users WHERE user_id = ?",
    )
    .bind(user_id)
    .fetch_one(&state.db)
    .await
    .map_err(|_| AppError::NotFound("User not found".to_string()))?;

    if user.user_type != UserType::Dev {
        return Err(AppError::BadRequest("Only developers can delete pickers".to_string()));
    }

    // 获取Picker信息，验证是否存在且属于当前开发者
    let picker = sqlx::query_as::<_, Picker>(
        "SELECT * FROM pickers WHERE picker_id = ? AND dev_user_id = ?",
    )
    .bind(picker_id)
    .bind(user_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| AppError::DatabaseError(format!("Failed to get picker detail: {:?}", e)))?
    .ok_or_else(|| AppError::NotFound("Picker not found or you don't have permission to delete it".to_string()))?;

    // 处理相关文件删除
    let current_dir = env::current_dir().map_err(|e| AppError::InternalServerError(format!("Failed to get current directory: {:?}", e)))?;
    // 删除图片文件
    if !picker.image_path.is_empty() && picker.image_path != "picker_white.jpg" {
        // 从URL中提取文件路径（去掉http://localhost:3000/前缀）
        let image_file_path = if picker.image_path.starts_with("http://localhost:3000/") {
            picker.image_path.trim_start_matches("http://localhost:3000/").to_string()
        } else {
            picker.image_path.clone()
        };

        // 构建图片在当前主机上的绝对路径
        let full_image_path = format!("{}/{}", current_dir.display(), image_file_path); 
               
        // 尝试删除图片文件，忽略删除失败的情况（文件可能不存在）
        if tokio::fs::try_exists(&full_image_path).await.map_err(|e| AppError::InternalServerError(format!("Failed to check image file existence: {:?}", e)))? {
            // 打印删除图片文件的路径
            let _ = tokio::fs::remove_file(&full_image_path).await;
        }
    }

    // 删除Picker文件
    if !picker.file_path.is_empty() {
        let full_file_path = format!("{}/{}", current_dir.display(), picker.file_path); 

        // 尝试删除文件，忽略删除失败的情况（文件可能不存在）
        if tokio::fs::try_exists(&full_file_path).await.map_err(|e| AppError::InternalServerError(format!("Failed to check file existence: {:?}", e)))? {
            // 打印删除文件的路径
            let _ = tokio::fs::remove_file(&full_file_path).await;
        }
    }

    // 软删除Picker（更新状态为inactive）
    sqlx::query(
        "UPDATE pickers SET status = 'inactive', updated_at = ? WHERE picker_id = ?",
    )
    .bind(Utc::now().to_rfc3339())
    .bind(picker_id)
    .execute(&state.db)
    .await
    .map_err(|e| AppError::DatabaseError(format!("Failed to soft delete picker: {:?}", e)))?;

    // 处理相关的订单信息（如果需要）
    // 这里可以添加代码来处理与该picker相关的订单状态

    Ok("Picker and related resources deleted successfully!".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::utils_tests::create_test_app_state;
    // use crate::models::{OrderStatus};
    use axum::extract::{Query, State, Path};
    use chrono::Utc;
    use serial_test::serial;
    use uuid::Uuid;

    #[tokio::test]
    #[serial]
    async fn test_get_market_success() {
        let state = create_test_app_state().await;
        let dev_user_id = Uuid::new_v4();
        let picker_id = Uuid::new_v4();

        // 创建测试开发者用户
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

        // 创建测试Picker
        let now = Utc::now();
        sqlx::query(
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
        .await
        .unwrap();

        let query = MarketQuery {
            page: Some(1),
            size: Some(10),
            keyword: None,
        };

        let result = get_market(State(state), Query(query)).await;
        assert!(result.is_ok());

        let response = result.unwrap();
        // 实际的总数可能大于1，因为可能有测试数据自动插入
        // 我们只验证我们创建的picker存在即可
        let test_picker_exists = response.pickers.iter().any(|p| p.alias == "Test Picker");
        assert!(test_picker_exists, "Test Picker should exist in the response");
        assert!(response.total >= 1);
    }

    #[tokio::test]
    #[serial]
    async fn test_get_market_with_keyword_search() {
        let state = create_test_app_state().await;
        let dev_user_id = Uuid::new_v4();
        // let picker_id1 = Uuid::new_v4();
        // let picker_id2 = Uuid::new_v4();

        // 创建测试开发者用户
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

        // 创建两个测试Picker
        let now = Utc::now();
        // 创建第一个Picker
        let picker_id1 = Uuid::new_v4();
        sqlx::query(
            r#"
            INSERT INTO pickers (picker_id, dev_user_id, alias, description, price, image_path, file_path, version, status, download_count, created_at, updated_at)
            VALUES (?, ?, 'Game Picker', 'Game Description', 500, 'test.jpg', 'test.exe', '1.0', 'active', 0, ?, ?)
            "#,
        )
        .bind(picker_id1)
        .bind(dev_user_id)
        .bind(now.to_rfc3339())
        .bind(now.to_rfc3339())
        .execute(&state.db)
        .await
        .unwrap();
        
        // 创建第二个Picker
        let picker_id2 = Uuid::new_v4();
        sqlx::query(
            r#"
            INSERT INTO pickers (picker_id, dev_user_id, alias, description, price, image_path, file_path, version, status, download_count, created_at, updated_at)
            VALUES (?, ?, 'Other Picker', 'Other Description', 500, 'test.jpg', 'test.exe', '1.0', 'active', 0, ?, ?)
            "#,
        )
        .bind(picker_id2)
        .bind(dev_user_id)
        .bind(now.to_rfc3339())
        .bind(now.to_rfc3339())
        .execute(&state.db)
        .await
        .unwrap();

        let query = MarketQuery {
            page: Some(1),
            size: Some(10),
            keyword: Some("game".to_string()),
        };

        let result = get_market(State(state), Query(query)).await;
        assert!(result.is_ok());

        let response = result.unwrap();
        assert_eq!(response.pickers.len(), 1);
        assert_eq!(response.total, 1);
        assert_eq!(response.pickers[0].alias, "Game Picker");
    }

    #[tokio::test]
    #[serial]
    async fn test_get_market_pagination() {
        let state = create_test_app_state().await;
        let dev_user_id = Uuid::new_v4();

        // 创建测试开发者用户
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

        // 创建多个测试Picker，使用唯一的前缀以区分
        let now = Utc::now();
        let test_picker_prefix = "TestPaginationPicker";
        for i in 1..=15 {
            let picker_id = Uuid::new_v4();
            sqlx::query(
                r#"
                INSERT INTO pickers (picker_id, dev_user_id, alias, description, price, image_path, file_path, version, status, download_count, created_at, updated_at)
                VALUES (?, ?, ?, 'Test Description', 500, 'test.jpg', 'test.exe', '1.0', 'active', 0, ?, ?)
                "#,
            )
            .bind(picker_id)
            .bind(dev_user_id)
            .bind(format!("{}{}", test_picker_prefix, i))
            .bind(now.to_rfc3339())
            .bind(now.to_rfc3339())
            .execute(&state.db)
            .await
            .unwrap();
        }

        let query = MarketQuery {
            page: Some(2),
            size: Some(10),
            keyword: None,
        };

        let result = get_market(State(state), Query(query)).await;
        assert!(result.is_ok());

        let response = result.unwrap();
        // 由于可能存在其他测试数据，我们需要计算我们创建的特定picker的数量
        let our_test_pickers_count = response.pickers.iter()
            .filter(|p| p.alias.starts_with(test_picker_prefix))
            .count();
        
        // 对于第二页，至少应该有5个我们创建的picker
        assert!(our_test_pickers_count >= 5, "At least 5 test pickers should be on page 2");
        assert!(response.total >= 15);
    }

    #[tokio::test]
    #[serial]
    async fn test_get_market_default_pagination() {
        let state = create_test_app_state().await;
        let dev_user_id = Uuid::new_v4();

        // 创建测试开发者用户
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

        // 创建一个测试Picker
        let picker_id = Uuid::new_v4();
        let now = Utc::now();
        let test_picker_name = "TestDefaultPaginationPicker";
        sqlx::query(
            r#"
            INSERT INTO pickers (picker_id, dev_user_id, alias, description, price, image_path, file_path, version, status, download_count, created_at, updated_at)
            VALUES (?, ?, ?, 'Test Description', 500, 'test.jpg', 'test.exe', '1.0', 'active', 0, ?, ?)
            "#,
        )
        .bind(picker_id)
        .bind(dev_user_id)
        .bind(test_picker_name)
        .bind(now.to_rfc3339())
        .bind(now.to_rfc3339())
        .execute(&state.db)
        .await
        .unwrap();

        let query = MarketQuery {
            page: None, // 使用默认值
            size: None, // 使用默认值
            keyword: None,
        };

        let result = get_market(State(state), Query(query)).await;
        assert!(result.is_ok());

        let response = result.unwrap();
        // 验证我们创建的picker存在，并且使用了默认的分页参数（至少返回了一些数据）
        let test_picker_exists = response.pickers.iter().any(|p| p.alias == test_picker_name);
        assert!(test_picker_exists, "Test picker should exist in the response");
        assert!(response.total >= 1);
    }

    #[tokio::test]
    #[serial]
    async fn test_get_picker_detail_success() {
        let state = create_test_app_state().await;
        let dev_user_id = Uuid::new_v4();
        let picker_id = Uuid::new_v4();

        // 创建测试开发者用户
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

        // 创建测试Picker
        sqlx::query(
            r#"
            INSERT INTO pickers (picker_id, dev_user_id, alias, description, price, image_path, file_path, version, status, download_count, created_at, updated_at)
            VALUES (?, ?, 'Test Picker', 'Test Description', 500, 'test.jpg', 'test.exe', '1.0', 'active', 10, ?, ?)
            "#,
        )
        .bind(picker_id)
        .bind(dev_user_id)
        .bind(Utc::now().to_rfc3339())
        .bind(Utc::now().to_rfc3339())
        .execute(&state.db)
        .await
        .unwrap();

        let result = get_picker_detail(State(state), Path(picker_id)).await;
        assert!(result.is_ok());

        let response = result.unwrap();
        assert_eq!(response.picker_id, picker_id);
        assert_eq!(response.alias, "Test Picker");
        assert_eq!(response.description, "Test Description");
        assert_eq!(response.price, 500);
        assert_eq!(response.download_count, 10);
    }

    #[tokio::test]
    #[serial]
    async fn test_get_picker_detail_not_found() {
        let state = create_test_app_state().await;
        let picker_id = Uuid::new_v4();

        let result = get_picker_detail(State(state), Path(picker_id)).await;
        assert!(result.is_err());

        match result.unwrap_err() {
            AppError::NotFound(msg) => assert_eq!(msg, "Picker not found"),
            _ => panic!("Expected NotFound error"),
        }
    }

    // 新增测试用例：测试非开发者用户上传Picker

    #[tokio::test]
    #[serial]
    async fn test_upload_picker_non_dev_user() {
        let state = create_test_app_state().await;
        let non_dev_user_id = Uuid::new_v4();

        // 创建测试非开发者用户 (使用Gen类型)
        sqlx::query(
            r#"
            INSERT INTO users (user_id, email, user_name, user_password, user_type, private_key, wallet_address, premium_balance, created_at)
            VALUES (?, 'gen@test.com', 'Gen User', 'hashed_password', 'gen', 'private_key_123', 'wallet123', 0, ?)
            "#,
        )
        .bind(non_dev_user_id)
        .bind(Utc::now().to_rfc3339())
        .execute(&state.db)
        .await
        .unwrap();

        // 创建测试路由
        use axum::Router;
        use axum::http::{Request, StatusCode};
        use tower::ServiceExt;
        
        let app = Router::new()
            .route("/api/pickers", axum::routing::post(upload_picker))
            .layer(axum::middleware::from_fn_with_state(state.clone(), move |State(_state): State<AppState>, mut request: axum::http::Request<axum::body::Body>, next: axum::middleware::Next| async move {
                request.extensions_mut().insert(non_dev_user_id);
                next.run(request).await
            }))
            .with_state(state.clone());

        // 创建multipart请求体
        let boundary = "boundary123";
        let body = format!("--{}\r\n\r\n--{}--\r\n", boundary, boundary);

        let request = Request::builder()
            .method("POST")
            .uri("/api/pickers")
            .header("content-type", format!("multipart/form-data; boundary={}", boundary))
            .body(axum::body::Body::from(body))
            .unwrap();

        let response = app.oneshot(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    }

    // 新增测试用例：测试上传Picker时缺少必填字段
    #[tokio::test]
    #[serial]
    async fn test_upload_picker_missing_fields() {
        let state = create_test_app_state().await;
        let dev_user_id = Uuid::new_v4();

        // 创建测试开发者用户
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

        // 创建测试路由
        use axum::Router;
        use axum::http::{Request, StatusCode};
        use tower::ServiceExt;
        
        let app = Router::new()
            .route("/api/pickers", axum::routing::post(upload_picker))
            .layer(axum::middleware::from_fn_with_state(state.clone(), move |State(_state): State<AppState>, mut request: axum::http::Request<axum::body::Body>, next: axum::middleware::Next| async move {
                request.extensions_mut().insert(dev_user_id);
                next.run(request).await
            }))
            .with_state(state.clone());

        // 创建空的multipart请求体
        let boundary = "boundary123";
        let body = format!("--{boundary}--\r\n");

        let request = Request::builder()
            .method("POST")
            .uri("/api/pickers")
            .header("content-type", format!("multipart/form-data; boundary={boundary}"))
            .body(axum::body::Body::from(body))
            .unwrap();

        let response = app.oneshot(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    }

    // 新增测试用例：测试get_market空结果
    #[tokio::test]
    #[serial]
    async fn test_get_market_empty_result() {
        let state = create_test_app_state().await;

        let query = MarketQuery {
            page: Some(1),
            size: Some(10),
            keyword: Some("nonexistent".to_string()),
        };

        let result = get_market(State(state), Query(query)).await;
        assert!(result.is_ok());

        let response = result.unwrap();
        assert_eq!(response.pickers.len(), 0);
        assert_eq!(response.total, 0);
    }

    // 新增测试用例：测试get_market无效分页参数
    #[tokio::test]
    #[serial]
    async fn test_get_market_invalid_pagination() {
        let state = create_test_app_state().await;
        let dev_user_id = Uuid::new_v4();

        // 创建测试开发者用户
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

        // 创建一个测试Picker
        let picker_id = Uuid::new_v4();
        let now = Utc::now();
        let test_picker_name = "TestInvalidPaginationPicker";
        sqlx::query(
            r#"
            INSERT INTO pickers (picker_id, dev_user_id, alias, description, price, image_path, file_path, version, status, download_count, created_at, updated_at)
            VALUES (?, ?, ?, 'Test Description', 500, 'test.jpg', 'test.exe', '1.0', 'active', 0, ?, ?)
            "#,
        )
        .bind(picker_id)
        .bind(dev_user_id)
        .bind(test_picker_name)
        .bind(now.to_rfc3339())
        .bind(now.to_rfc3339())
        .execute(&state.db)
        .await
        .unwrap();

        let query = MarketQuery {
            page: Some(0), // 无效页码
            size: Some(10),
            keyword: None,
        };

        let result = get_market(State(state), Query(query)).await;
        assert!(result.is_ok());

        let response = result.unwrap();
        // 当page为0时，offset会是负数，但SQL查询会处理这种情况
        // 我们期望仍然能获取到数据
        // 验证我们创建的picker存在
        let test_picker_exists = response.pickers.iter().any(|p| p.alias == test_picker_name);
        assert!(test_picker_exists, "Test picker should exist in the response");
        assert!(response.total >= 1);
    }

    // 新增测试用例：测试get_picker_detail非活跃Picker
    #[tokio::test]
    #[serial]
    async fn test_get_picker_detail_inactive_picker() {
        let state = create_test_app_state().await;
        let dev_user_id = Uuid::new_v4();
        let picker_id = Uuid::new_v4();

        // 创建测试开发者用户
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

        // 创建一个非活跃的测试Picker
        sqlx::query(
            r#"
            INSERT INTO pickers (picker_id, dev_user_id, alias, description, price, image_path, file_path, version, status, download_count, created_at, updated_at)
            VALUES (?, ?, 'Test Picker', 'Test Description', 500, 'test.jpg', 'test.exe', '1.0', 'inactive', 10, ?, ?)
            "#,
        )
        .bind(picker_id)
        .bind(dev_user_id)
        .bind(Utc::now().to_rfc3339())
        .bind(Utc::now().to_rfc3339())
        .execute(&state.db)
        .await
        .unwrap();

        let result = get_picker_detail(State(state), Path(picker_id)).await;
        assert!(result.is_err());

        match result.unwrap_err() {
            AppError::NotFound(msg) => assert_eq!(msg, "Picker not found"),
            _ => panic!("Expected NotFound error"),
        }
    }

    // 新增测试用例：测试上传Picker成功场景
    #[tokio::test]
    #[serial]
    async fn test_upload_picker_success() {
        let state = create_test_app_state().await;
        let dev_user_id = Uuid::new_v4();

        // 创建测试开发者用户
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

        // 创建测试路由
        use axum::Router;
        use axum::http::{Request, StatusCode};
        use tower::ServiceExt;
        
        let app = Router::new()
            .route("/api/pickers", axum::routing::post(upload_picker))
            .layer(axum::middleware::from_fn_with_state(state.clone(), move |State(_state): State<AppState>, mut request: axum::http::Request<axum::body::Body>, next: axum::middleware::Next| async move {
                request.extensions_mut().insert(dev_user_id);
                next.run(request).await
            }))
            .with_state(state.clone());

        // 创建multipart请求体
        let boundary = "boundary123";
        let body = format!("--{boundary}\r\nContent-Disposition: form-data; name=\"alias\"\r\n\r\nTest Picker\r\n--{boundary}\r\nContent-Disposition: form-data; name=\"description\"\r\n\r\nTest Description\r\n--{boundary}\r\nContent-Disposition: form-data; name=\"price\"\r\n\r\n500\r\n--{boundary}\r\nContent-Disposition: form-data; name=\"version\"\r\n\r\n1.0\r\n--{boundary}\r\nContent-Disposition: form-data; name=\"image\"; filename=\"test.jpg\"\r\nContent-Type: image/jpeg\r\n\r\ntest_image_data\r\n--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"test.exe\"\r\nContent-Type: application/octet-stream\r\n\r\ntest_file_data\r\n--{boundary}--\r\n");

        let request = Request::builder()
            .method("POST")
            .uri("/api/pickers")
            .header("content-type", format!("multipart/form-data; boundary={boundary}"))
            .body(axum::body::Body::from(body))
            .unwrap();

        let response = app.oneshot(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::OK);
    }
}
