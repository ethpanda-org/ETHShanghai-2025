use axum::{
    routing::{get, post, put},
    Router,
};
use crate::shared::jwt::AppState;
use super::handlers::*;

pub fn create_did_routes() -> Router<AppState> {
    Router::new()
        .route("/did", post(create_did))
        .route("/did/:did", get(get_did))
        .route("/did/:did/version/:version", get(get_did_version))
        .route("/did/:did", put(update_did))
        .route("/did/:did/versions", get(get_did_versions))
        .route("/user/:user_id/dids", get(get_user_dids))
        .route("/did/:did/blockchain/register", post(register_did_blockchain))
        .route("/did/:did/blockchain/status", get(get_blockchain_status))
}
