// 删除重复的ApiError导入
use app_lib::api::models::{ApiError, LoginRequest, LoginResponse, UserInfo, UserType, RegisterRequest, OrderStatus, PickerListResponse, OrderInfo, OrderListResponse, PickerInfo, PayType, VerifyRequest};
use serde_json;

// 测试ApiError枚举的序列化和反序列化
#[test]
fn test_api_error_serialization() {
    // 测试ServerError序列化
    let error = ApiError::ServerError("Internal server error".to_string());
    let json = serde_json::to_string(&error).unwrap();
    assert!(json.contains("ServerError"));
    assert!(json.contains("Internal server error"));
    
    // 测试AuthError序列化
    let error = ApiError::AuthError("Authentication failed".to_string());
    let json = serde_json::to_string(&error).unwrap();
    assert!(json.contains("AuthError"));
    assert!(json.contains("Authentication failed"));
    
    // 测试NotFound序列化
    let error = ApiError::NotFound;
    let json = serde_json::to_string(&error).unwrap();
    assert!(json.contains("NotFound"));
    assert!(json.contains("Not found"));
    
    // 测试ValidationError序列化
    let error = ApiError::ValidationError("Invalid parameter".to_string());
    let json = serde_json::to_string(&error).unwrap();
    assert!(json.contains("ValidationError"));
    assert!(json.contains("Invalid parameter"));
}

// 测试LoginRequest结构体的序列化和反序列化
#[test]
fn test_login_request() {
    let login_request = LoginRequest {
        email: "test@example.com".to_string(),
        user_password: "password123".to_string(),
    };
    
    // 序列化
    let json = serde_json::to_string(&login_request).unwrap();
    assert!(json.contains("test@example.com"));
    assert!(json.contains("password123"));
    
    // 反序列化
    let deserialized: LoginRequest = serde_json::from_str(&json).unwrap();
    assert_eq!(deserialized.email, "test@example.com");
    assert_eq!(deserialized.user_password, "password123");
}

// 测试LoginResponse结构体的序列化和反序列化
#[test]
fn test_login_response() {
    let user_info = UserInfo {
        user_id: "user-123".to_string(),
        email: "test@example.com".to_string(),
        user_name: "Test User".to_string(),
        user_type: UserType::Dev,
        wallet_address: "wallet-123".to_string(),
        premium_balance: 1000,
        created_at: "2023-01-01T10:00:00Z".to_string(),
    };
    
    let login_response = LoginResponse {
        token: "jwt-token-123".to_string(),
        user: user_info.clone(),
    };
    
    // 序列化
    let json = serde_json::to_string(&login_response).unwrap();
    assert!(json.contains("jwt-token-123"));
    assert!(json.contains("test@example.com"));
    
    // 反序列化
    let deserialized: LoginResponse = serde_json::from_str(&json).unwrap();
    assert_eq!(deserialized.token, "jwt-token-123");
    assert_eq!(deserialized.user.user_id, user_info.user_id);
}

// 测试UserInfo结构体的序列化和反序列化
#[test]
fn test_user_info() {
    let user_info = UserInfo {
        user_id: "user-123".to_string(),
        email: "test@example.com".to_string(),
        user_name: "Test User".to_string(),
        user_type: UserType::Dev,
        wallet_address: "wallet-123".to_string(),
        premium_balance: 1000,
        created_at: "2023-01-01T10:00:00Z".to_string(),
    };
    
    // 序列化
    let json = serde_json::to_string(&user_info).unwrap();
    assert!(json.contains("test@example.com"));
    assert!(json.contains("dev"));
    
    // 反序列化
    let deserialized: UserInfo = serde_json::from_str(&json).unwrap();
    assert_eq!(deserialized.user_id, user_info.user_id);
    assert_eq!(deserialized.user_type, UserType::Dev);
}

// 测试UserType枚举的序列化和反序列化
#[test]
fn test_user_type() {
    // 测试Dev类型
    let dev_type = UserType::Dev;
    let dev_json = serde_json::to_string(&dev_type).unwrap();
    assert_eq!(dev_json, "\"dev\"");
    let deserialized_dev: UserType = serde_json::from_str(&dev_json).unwrap();
    assert_eq!(deserialized_dev, UserType::Dev);
    
    // 测试Gen类型
    let gen_type = UserType::Gen;
    let gen_json = serde_json::to_string(&gen_type).unwrap();
    assert_eq!(gen_json, "\"gen\"");
    let deserialized_gen: UserType = serde_json::from_str(&gen_json).unwrap();
    assert_eq!(deserialized_gen, UserType::Gen);
}

// 测试RegisterRequest结构体的序列化和反序列化
#[test]
fn test_register_request() {
    let register_request = RegisterRequest {
        email: "test@example.com".to_string(),
        user_password: "password123".to_string(),
        user_name: "Test User".to_string(),
        user_type: UserType::Dev,
    };
    
    // 序列化
    let json = serde_json::to_string(&register_request).unwrap();
    assert!(json.contains("test@example.com"));
    assert!(json.contains("dev"));
    
    // 反序列化
    let deserialized: RegisterRequest = serde_json::from_str(&json).unwrap();
    assert_eq!(deserialized.email, "test@example.com");
    assert_eq!(deserialized.user_type, UserType::Dev);
}

// 测试PickerInfo结构体的序列化和反序列化
#[test]
fn test_picker_info() {
    let picker_info = PickerInfo {
        picker_id: "picker-123".to_string(),
        dev_user_id: "dev-123".to_string(),
        alias: "Test Picker".to_string(),
        description: "This is a test picker".to_string(),
        price: 500,
        image_path: "image.jpg".to_string(),
        version: "1.0.0".to_string(),
        download_count: 100,
        created_at: "2023-01-01T10:00:00Z".to_string(),
        updated_at: "2023-01-01T10:00:00Z".to_string(),
        status: "active".to_string(),
    };
    
    // 序列化
    let json = serde_json::to_string(&picker_info).unwrap();
    assert!(json.contains("Test Picker"));
    assert!(json.contains("500"));
    
    // 反序列化
    let deserialized: PickerInfo = serde_json::from_str(&json).unwrap();
    assert_eq!(deserialized.picker_id, "picker-123");
    assert_eq!(deserialized.alias, "Test Picker");
    assert_eq!(deserialized.price, 500);
}

// 测试PayType枚举的序列化和反序列化
#[test]
fn test_pay_type() {
    // 测试Premium类型
    let premium_type = PayType::Premium;
    let premium_json = serde_json::to_string(&premium_type).unwrap();
    assert_eq!(premium_json, "\"premium\"");
    let deserialized_premium: PayType = serde_json::from_str(&premium_json).unwrap();
    assert_eq!(deserialized_premium, PayType::Premium);

    // 测试Wallet类型
    let wallet_type = PayType::Wallet;
    let wallet_json = serde_json::to_string(&wallet_type).unwrap();
    assert_eq!(wallet_json, "\"wallet\"");
    let deserialized_wallet: PayType = serde_json::from_str(&wallet_json).unwrap();
    assert_eq!(deserialized_wallet, PayType::Wallet);
}

// 测试OrderStatus枚举的序列化和反序列化
#[test]
fn test_order_status() {
    // 测试Pending状态
    let pending_status = OrderStatus::Pending;
    let pending_json = serde_json::to_string(&pending_status).unwrap();
    assert_eq!(pending_json, "\"pending\"");
    let deserialized_pending: OrderStatus = serde_json::from_str(&pending_json).unwrap();
    assert_eq!(deserialized_pending, OrderStatus::Pending);
    
    // 测试Success状态
    let success_status = OrderStatus::Success;
    let success_json = serde_json::to_string(&success_status).unwrap();
    assert_eq!(success_json, "\"success\"");
    let deserialized_success: OrderStatus = serde_json::from_str(&success_json).unwrap();
    assert_eq!(deserialized_success, OrderStatus::Success);
    
    // 测试Expired状态
    let expired_status = OrderStatus::Expired;
    let expired_json = serde_json::to_string(&expired_status).unwrap();
    assert_eq!(expired_json, "\"expired\"");
    let deserialized_expired: OrderStatus = serde_json::from_str(&expired_json).unwrap();
    assert_eq!(deserialized_expired, OrderStatus::Expired);
}

// 测试PickerListResponse结构体的序列化和反序列化
#[test]
fn test_picker_list_response() {
    let picker_info = PickerInfo {
        picker_id: "picker-123".to_string(),
        dev_user_id: "dev-123".to_string(),
        alias: "Test Picker".to_string(),
        description: "This is a test picker".to_string(),
        price: 500,
        image_path: "image.jpg".to_string(),
        version: "1.0.0".to_string(),
        download_count: 100,
        created_at: "2023-01-01T10:00:00Z".to_string(),
        updated_at: "2023-01-01T10:00:00Z".to_string(),
        status: "active".to_string(),
    };
    
    let picker_list = PickerListResponse {
        pickers: vec![picker_info.clone(), picker_info],
        total: 2,
    };
    
    // 序列化
    let json = serde_json::to_string(&picker_list).unwrap();
    assert!(json.contains("Test Picker"));
    
    // 反序列化
    let deserialized: PickerListResponse = serde_json::from_str(&json).unwrap();
    assert_eq!(deserialized.total, 2);
    assert_eq!(deserialized.pickers.len(), 2);
}

// 测试OrderListResponse结构体的序列化和反序列化
#[test]
fn test_order_list_response() {
    let order_info = OrderInfo {
        order_id: "order-123".to_string(),
        user_id: "user-456".to_string(),
        picker_id: "picker-789".to_string(),
        picker_alias: "Test Picker".to_string(),
        amount: 500,
        pay_type: PayType::Premium,
        status: OrderStatus::Success,
        created_at: "2023-01-01T10:00:00Z".to_string(),
    };
    
    let order_list = OrderListResponse {
        orders: vec![order_info.clone(), order_info],
        total: 2,
        page: 1,
        size: 10,
        has_next: false,
    };
    
    // 序列化
    let json = serde_json::to_string(&order_list).unwrap();
    assert!(json.contains("success"));
    assert!(json.contains("10"));
    
    // 反序列化
    let deserialized: OrderListResponse = serde_json::from_str(&json).unwrap();
    assert_eq!(deserialized.total, 2);
    assert_eq!(deserialized.orders.len(), 2);
}

// 测试VerifyRequest结构体的序列化和反序列化
#[test]
fn test_verify_request() {
    let verify_request = VerifyRequest {
        email: "test@example.com".to_string(),
        code: "123456".to_string(),
    };
    
    // 序列化
    let json = serde_json::to_string(&verify_request).unwrap();
    assert!(json.contains("test@example.com"));
    assert!(json.contains("123456"));
    
    // 反序列化
    let deserialized: VerifyRequest = serde_json::from_str(&json).unwrap();
    assert_eq!(deserialized.email, "test@example.com");
    assert_eq!(deserialized.code, "123456");
}