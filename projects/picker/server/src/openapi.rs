use utoipa::{OpenApi, ToSchema};
use axum::{Router, routing::get};
use crate::config::AppState;
use crate::handlers::*;
use crate::models::*;
use crate::download::DownloadQuery;

#[derive(OpenApi)]
#[openapi(
    paths(
        // 公开路由
        crate::handlers::health_check,
        crate::handlers::users::register,
        crate::handlers::users::verify,
        crate::handlers::users::login,
        crate::handlers::pickers::get_market,
        crate::handlers::pickers::get_picker_detail,
        crate::download::download,
        // 受保护路由
        crate::handlers::users::get_profile,
        crate::handlers::pickers::upload_picker,
        crate::handlers::orders::create_order,
        crate::handlers::orders::get_user_orders,
        crate::handlers::orders::get_order_detail,
    ),
    components(
        schemas(
            // 枚举类型
            UserType,
            PayType,
            OrderStatus,
            // 请求结构体
            RegisterRequest,
            VerifyRequest,
            LoginRequest,
            MarketQuery,
            CreateOrderRequest,
            OrderQuery,
            DownloadQuery,
            // 响应结构体
            RegisterResponse,
            VerifyResponse,
            LoginResponse,
            UserInfo,
            PickerInfo,
            MarketResponse,
            UploadPickerResponse,
            CreateOrderResponse,
            OrderInfo,
            OrderListResponse,
            // 错误响应
            ErrorResponse,
        )
    ),
    tags(
        (name = "health", description = "Health check endpoints"),
        (name = "users", description = "User management endpoints"),
        (name = "pickers", description = "Picker management endpoints"),
        (name = "orders", description = "Order management endpoints"),
        (name = "download", description = "File download endpoints"),
    ),
    info(
        title = "Picker Server API",
        version = "0.0.1",
        description = "Picker Server API documentation",
        contact(
            name = "API Support",
            email = "openpicklabs@hotmail.com"
        ),
        license(
            name = "MIT",
            url = "https://opensource.org/licenses/MIT"
        )
    ),
    servers(
        (url = "http://localhost:3000", description = "本地开发服务器"),
        (url = "https://api.openpick.org", description = "生产服务器")
    ),
    modifiers(&SecurityAddon),
    security(
        ("bearer_auth" = [])
    )
)]
pub struct ApiDoc;

// 添加安全组件定义
struct SecurityAddon;

impl utoipa::Modify for SecurityAddon {
    fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
        if let Some(components) = openapi.components.as_mut() {
            components.add_security_scheme(
                "bearer_auth",
                utoipa::openapi::security::SecurityScheme::Http(
                    utoipa::openapi::security::HttpBuilder::new()
                        .scheme(utoipa::openapi::security::HttpAuthScheme::Bearer)
                        .bearer_format("JWT")
                        .description(Some("Enter Bearer Token in the format: Bearer <your-token>"))
                        .build(),
                ),
            )
        }
    }
}

// 错误响应结构体
#[derive(serde::Serialize, ToSchema)]
pub struct ErrorResponse {
    #[schema(example = "Bad Request")]
    pub error: String,
    #[schema(example = "Invalid input parameters")]
    pub message: String,
}



// 处理 OpenAPI JSON 请求
async fn openapi_json() -> impl axum::response::IntoResponse {
    axum::Json(ApiDoc::openapi())
}

// 创建 OpenAPI 路由
pub fn create_swagger_routes() -> Router<AppState> {
    Router::new()
        .route("/api-docs/openapi.json", get(openapi_json))
}

