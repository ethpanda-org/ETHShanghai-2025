use axum::{
    routing::{get, post, put},
    Router,
};
use crate::shared::jwt::AppState;
use super::handlers::*;

pub fn create_identity_routes() -> Router<AppState> {
    Router::new()
        // World ID 验证
        .route("/identity/worldid/verify", post(verify_worldid))
        .route("/identity/worldid/status/:user_id", get(check_worldid_status))
        
        // 可验证凭证
        .route("/identity/credential/verify", post(verify_credential))
        .route("/identity/credential/:user_id", get(get_user_credentials))
        
        // OAuth 绑定
        .route("/identity/oauth/bind", post(bind_oauth))
        .route("/identity/oauth/unbind", post(unbind_oauth))
        .route("/identity/oauth/:user_id", get(get_oauth_bindings))
        
        // 钱包地址
        .route("/identity/wallet/connect", post(connect_wallet))
        .route("/identity/wallet/primary", put(set_primary_wallet))
        .route("/identity/wallet/:user_id", get(get_user_wallets))
        .route("/identity/wallet/primary/:user_id", get(get_primary_wallet))
        
        // 综合查询
        .route("/identity/user/:user_id", get(get_user_identity_info))
}

