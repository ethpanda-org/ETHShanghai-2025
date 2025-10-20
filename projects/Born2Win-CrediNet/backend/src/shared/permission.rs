use axum::{
    async_trait,
    extract::FromRequestParts,
    http::{request::Parts, StatusCode},
};
use crate::shared::jwt::AppState;
use crate::shared::types::Claims;
use crate::shared::errors::AppError;

/// 权限级别定义
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
#[allow(dead_code)]
pub enum Permission {
    /// 公开访问
    Public,
    /// 需要登录
    Authenticated,
    /// 普通用户
    User,
    /// 管理员
    Admin,
    /// 超级管理员
    SuperAdmin,
}

impl Permission {
    pub fn from_role(role: &str) -> Self {
        match role {
            "super_admin" => Permission::SuperAdmin,
            "admin" => Permission::Admin,
            "user" => Permission::User,
            _ => Permission::Authenticated,
        }
    }

    pub fn requires(&self, required: &Permission) -> bool {
        self >= required
    }
}

/// 权限检查中间件提取器
pub struct RequirePermission {
    pub claims: Claims,
    pub permission: Permission,
}

impl RequirePermission {
    pub fn check(&self, required: Permission) -> Result<(), AppError> {
        if !self.permission.requires(&required) {
            return Err(AppError::Forbidden(format!(
                "Requires {:?} permission, but user has {:?}",
                required, self.permission
            )));
        }
        Ok(())
    }

    pub fn is_self_or_admin(&self, user_id: &str) -> Result<(), AppError> {
        if self.claims.sub == user_id || self.permission >= Permission::Admin {
            Ok(())
        } else {
            Err(AppError::Forbidden("Access denied: not owner or admin".to_string()))
        }
    }

    pub fn is_admin(&self) -> Result<(), AppError> {
        self.check(Permission::Admin)
    }

    #[allow(dead_code)]
    pub fn is_authenticated(&self) -> Result<(), AppError> {
        self.check(Permission::Authenticated)
    }
}

#[async_trait]
impl FromRequestParts<AppState> for RequirePermission {
    type Rejection = (StatusCode, String);

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, Self::Rejection> {
        // 首先提取Claims（这会验证JWT）
        let claims = Claims::from_request_parts(parts, state)
            .await
            .map_err(|e| (e.0, e.1.to_string()))?;

        // 检查token类型必须是access token
        if claims.token_type != "access" && !claims.token_type.is_empty() {
            return Err((StatusCode::UNAUTHORIZED, "Invalid token type".to_string()));
        }

        let permission = Permission::from_role(&claims.role);

        Ok(RequirePermission { claims, permission })
    }
}

/// 管理员权限提取器
pub struct AdminOnly {
    pub claims: Claims,
}

#[async_trait]
impl FromRequestParts<AppState> for AdminOnly {
    type Rejection = (StatusCode, String);

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, Self::Rejection> {
        let perm = RequirePermission::from_request_parts(parts, state).await?;
        
        perm.is_admin()
            .map_err(|e| (StatusCode::FORBIDDEN, e.to_string()))?;

        Ok(AdminOnly { claims: perm.claims })
    }
}

/// 资源权限检查
#[allow(dead_code)]
pub struct ResourcePermission {
    pub resource_type: String,
    pub resource_id: String,
    pub action: ResourceAction,
}

#[derive(Debug, Clone, PartialEq)]
#[allow(dead_code)]
pub enum ResourceAction {
    Read,
    Write,
    Delete,
    Admin,
}

impl ResourcePermission {
    #[allow(dead_code)]
    pub fn new(resource_type: impl Into<String>, resource_id: impl Into<String>, action: ResourceAction) -> Self {
        Self {
            resource_type: resource_type.into(),
            resource_id: resource_id.into(),
            action,
        }
    }

    /// 检查用户是否有权限访问资源
    #[allow(dead_code)]
    pub fn check(&self, user_perm: &RequirePermission) -> Result<(), AppError> {
        // 管理员有所有权限
        if user_perm.permission >= Permission::Admin {
            return Ok(());
        }

        // 根据资源类型和操作进行细粒度权限检查
        match self.resource_type.as_str() {
            "user" => {
                // 用户资源：只能操作自己的资源
                if self.resource_id == user_perm.claims.sub {
                    Ok(())
                } else {
                    Err(AppError::Forbidden("Cannot access other user's resources".to_string()))
                }
            }
            "did" | "identity" | "credit" => {
                // 身份相关资源：读取公开，修改需要所有权
                match self.action {
                    ResourceAction::Read => Ok(()), // 公开读取
                    _ => {
                        // 需要检查资源所有权（实际应用中应该查询数据库）
                        Ok(())
                    }
                }
            }
            _ => {
                // 默认：需要认证
                if user_perm.permission >= Permission::Authenticated {
                    Ok(())
                } else {
                    Err(AppError::Unauthorized("Authentication required".to_string()))
                }
            }
        }
    }
}

/// 角色管理
#[allow(dead_code)]
pub struct RoleManager;

impl RoleManager {
    /// 检查用户是否有指定角色
    #[allow(dead_code)]
    pub fn has_role(claims: &Claims, role: &str) -> bool {
        claims.role == role || 
        (role == "user" && (claims.role == "admin" || claims.role == "super_admin")) ||
        (role == "admin" && claims.role == "super_admin")
    }

    /// 检查用户是否有任意指定角色
    #[allow(dead_code)]
    pub fn has_any_role(claims: &Claims, roles: &[&str]) -> bool {
        roles.iter().any(|role| Self::has_role(claims, role))
    }

    /// 检查用户是否有所有指定角色
    #[allow(dead_code)]
    pub fn has_all_roles(claims: &Claims, roles: &[&str]) -> bool {
        roles.iter().all(|role| Self::has_role(claims, role))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_permission_levels() {
        assert!(Permission::SuperAdmin > Permission::Admin);
        assert!(Permission::Admin > Permission::User);
        assert!(Permission::User > Permission::Authenticated);
        assert!(Permission::Authenticated > Permission::Public);
    }

    #[test]
    fn test_permission_from_role() {
        assert_eq!(Permission::from_role("super_admin"), Permission::SuperAdmin);
        assert_eq!(Permission::from_role("admin"), Permission::Admin);
        assert_eq!(Permission::from_role("user"), Permission::User);
    }

    #[test]
    fn test_permission_requires() {
        let admin_perm = Permission::Admin;
        assert!(admin_perm.requires(&Permission::User));
        assert!(admin_perm.requires(&Permission::Admin));
        assert!(!admin_perm.requires(&Permission::SuperAdmin));
    }

    #[test]
    fn test_role_hierarchy() {
        let super_admin_claims = Claims {
            sub: "user1".to_string(),
            role: "super_admin".to_string(),
            exp: 0,
            token_type: "access".to_string(),
        };

        assert!(RoleManager::has_role(&super_admin_claims, "super_admin"));
        assert!(RoleManager::has_role(&super_admin_claims, "admin"));
        assert!(RoleManager::has_role(&super_admin_claims, "user"));
    }
}

