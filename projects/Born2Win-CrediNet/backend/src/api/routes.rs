use super::handlers::*;
use crate::shared::jwt::AppState;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::Json;
use axum::{
    routing::{get, post},
    Router,
};

pub fn create_api_routes() -> Router<AppState> {
    Router::new()
        // Auth
        .route("/auth/send_code", post(api_send_code))
        .route("/auth/login", post(api_login))
    .route("/auth/refresh", post(api_refresh_token))
    .route("/auth/logout", post(api_logout))
        // User
        .route("/user/profile", get(get_user_profile))
        .route("/user/bind/social", post(bind_social))
        // Credit
        .route("/score", get(get_credit_score))
        // SBT
        .route("/sbt/issue", post(issue_sbt))
        // OpenAPI 完整规范
        .route("/openapi.json", get(|| async move {
            let spec = serde_json::json!({
                "openapi": "3.0.0",
                "info": {
                    "title": "CrediNet API",
                    "version": "1.0.0",
                    "description": "CrediNet 去中心化信用评分系统 API",
                    "contact": {
                        "name": "CrediNet Team",
                        "url": "https://credinet.com"
                    }
                },
                "servers": [
                    {
                        "url": "http://localhost:8080/api",
                        "description": "开发环境"
                    }
                ],
                "components": {
                    "securitySchemes": {
                        "BearerAuth": {
                            "type": "http",
                            "scheme": "bearer",
                            "bearerFormat": "JWT"
                        }
                    },
                    "schemas": {
                        "ApiResponse": {
                            "type": "object",
                            "properties": {
                                "code": {"type": "integer", "description": "状态码，0表示成功"},
                                "message": {"type": "string", "description": "响应消息"},
                                "data": {"type": "object", "description": "响应数据"}
                            }
                        },
                        "ErrorCodes": {
                            "type": "object",
                            "description": "错误码说明",
                            "properties": {
                                "1xxx": {"type": "string", "example": "认证错误 (1001:未授权, 1002:凭证无效, 1003:令牌过期)"},
                                "2xxx": {"type": "string", "example": "权限和系统错误 (2001:数据库错误, 2003:禁止访问, 2009:请求过多)"},
                                "3xxx": {"type": "string", "example": "业务逻辑错误 (3001:JSON错误, 3002:验证错误, 3004:不存在, 3005:已存在, 3010:SBT发放失败, 3011:数据不足)"},
                                "4xxx": {"type": "string", "example": "外部服务错误 (4001:外部API错误, 4002:区块链错误, 4003:合约错误)"}
                            }
                        }
                    }
                },
                "paths": {
                    "/api/auth/send_code": {
                        "post": {
                            "summary": "发送验证码",
                            "tags": ["身份认证"],
                            "requestBody": {
                                "required": true,
                                "content": {
                                    "application/json": {
                                        "schema": {
                                            "type": "object",
                                            "properties": {
                                                "contact": {"type": "string", "description": "邮箱或手机号"}
                                            }
                                        }
                                    }
                                }
                            },
                            "responses": {
                                "200": {"description": "验证码已发送"},
                                "2009": {"description": "请求过多"}
                            }
                        }
                    },
                    "/api/auth/login": {
                        "post": {
                            "summary": "验证码登录",
                            "tags": ["身份认证"],
                            "requestBody": {
                                "required": true,
                                "content": {
                                    "application/json": {
                                        "schema": {
                                            "type": "object",
                                            "properties": {
                                                "contact": {"type": "string"},
                                                "code": {"type": "string", "description": "验证码"}
                                            }
                                        }
                                    }
                                }
                            },
                            "responses": {
                                "200": {
                                    "description": "登录成功",
                                    "content": {
                                        "application/json": {
                                            "schema": {
                                                "type": "object",
                                                "properties": {
                                                    "code": {"type": "integer", "example": 0},
                                                    "message": {"type": "string"},
                                                    "data": {
                                                        "type": "object",
                                                        "properties": {
                                                            "access_token": {"type": "string"},
                                                            "refresh_token": {"type": "string"},
                                                            "user_id": {"type": "string"},
                                                            "expires_in": {"type": "integer"}
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                },
                                "1002": {"description": "验证码无效"}
                            }
                        }
                    },
                    "/api/user/profile": {
                        "get": {
                            "summary": "获取用户资料",
                            "tags": ["用户管理"],
                            "security": [{"BearerAuth": []}],
                            "responses": {
                                "200": {"description": "用户资料"},
                                "1001": {"description": "未授权"}
                            }
                        }
                    },
                    "/api/user/bind/social": {
                        "post": {
                            "summary": "绑定社交账号",
                            "tags": ["用户管理"],
                            "security": [{"BearerAuth": []}],
                            "requestBody": {
                                "required": true,
                                "content": {
                                    "application/json": {
                                        "schema": {
                                            "type": "object",
                                            "properties": {
                                                "provider": {"type": "string", "example": "github"},
                                                "code": {"type": "string", "description": "OAuth授权码"}
                                            }
                                        }
                                    }
                                }
                            },
                            "responses": {
                                "200": {"description": "绑定成功"}
                            }
                        }
                    },
                    "/api/score": {
                        "get": {
                            "summary": "获取信用评分",
                            "tags": ["信用评分"],
                            "security": [{"BearerAuth": []}],
                            "responses": {
                                "200": {
                                    "description": "信用评分结果",
                                    "content": {
                                        "application/json": {
                                            "schema": {
                                                "type": "object",
                                                "properties": {
                                                    "code": {"type": "integer", "example": 0},
                                                    "message": {"type": "string"},
                                                    "data": {
                                                        "type": "object",
                                                        "properties": {
                                                            "score": {"type": "integer", "example": 750},
                                                            "level": {"type": "string", "example": "B"}
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "/api/sbt/issue": {
                        "post": {
                            "summary": "请求发放SBT",
                            "tags": ["SBT管理"],
                            "security": [{"BearerAuth": []}],
                            "requestBody": {
                                "required": true,
                                "content": {
                                    "application/json": {
                                        "schema": {
                                            "type": "object",
                                            "properties": {
                                                "sbt_type": {"type": "string", "example": "credit_score_gold"}
                                            }
                                        }
                                    }
                                }
                            },
                            "responses": {
                                "200": {"description": "SBT发放成功"},
                                "3010": {"description": "SBT发放失败"}
                            }
                        }
                    }
                },
                "tags": [
                    {"name": "身份认证", "description": "用户认证相关接口"},
                    {"name": "用户管理", "description": "用户信息和绑定管理"},
                    {"name": "信用评分", "description": "信用评分查询"},
                    {"name": "SBT管理", "description": "SBT发放和管理"}
                ]
            });
            (StatusCode::OK, Json(spec)).into_response()
        }))
        // Swagger UI 极简页面（无需外部依赖）
        .route("/docs", get(|| async move {
            let html = r#"<!doctype html>
<html>
  <head>
    <meta charset=\"utf-8\" />
    <title>CrediNet API Docs</title>
  </head>
  <body>
    <h1>CrediNet API</h1>
    <p>OpenAPI JSON: <a href=\"/api/openapi.json\">/api/openapi.json</a></p>
    <p>建议在本地以 Swagger-UI 打开此 JSON 进行交互测试。</p>
  </body>
</html>"#;
            (StatusCode::OK, axum::response::Html(html)).into_response()
        }))
}
