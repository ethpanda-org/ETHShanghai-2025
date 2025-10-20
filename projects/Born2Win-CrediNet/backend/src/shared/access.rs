use crate::shared::errors::AppError;
use crate::shared::types::Claims;

#[allow(dead_code)]
pub fn ensure_self_or_admin(claims: &Claims, user_id_param: &str) -> Result<(), AppError> {
    if claims.role == "admin" { return Ok(()); }
    if claims.sub == user_id_param { return Ok(()); }
    Err(AppError::Forbidden("Access denied".to_string()))
}


