use crate::models::*;
use serde_json;
use chrono::Utc;
use uuid::Uuid;

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_user_type_enum() {
        // 测试UserType枚举的序列化和反序列化
        let user_types = vec![UserType::Gen, UserType::Dev];
        
        for user_type in user_types {
            let serialized = serde_json::to_string(&user_type).unwrap();
            let deserialized: UserType = serde_json::from_str(&serialized).unwrap();
            assert_eq!(user_type, deserialized);
        }
        
        // 测试特定值
        let gen_json = serde_json::to_string(&UserType::Gen).unwrap();
        assert_eq!(gen_json, "\"gen\"");
        
        let dev_json = serde_json::to_string(&UserType::Dev).unwrap();
        assert_eq!(dev_json, "\"dev\"");
    }

    #[test]
    fn test_pay_type_enum() {
        // 测试PayType枚举的序列化和反序列化
        let pay_types = vec![PayType::Wallet, PayType::Premium];
        
        for pay_type in pay_types {
            let serialized = serde_json::to_string(&pay_type).unwrap();
            let deserialized: PayType = serde_json::from_str(&serialized).unwrap();
            assert_eq!(pay_type, deserialized);
        }
        
        // 测试特定值
        let wallet_json = serde_json::to_string(&PayType::Wallet).unwrap();
        assert_eq!(wallet_json, "\"wallet\"");
        
        let premium_json = serde_json::to_string(&PayType::Premium).unwrap();
        assert_eq!(premium_json, "\"premium\"");
    }

    #[test]
    fn test_order_status_enum() {
        // 测试OrderStatus枚举的序列化和反序列化
        let order_statuses = vec![OrderStatus::Pending, OrderStatus::Success, OrderStatus::Expired];
        
        for status in order_statuses {
            let serialized = serde_json::to_string(&status).unwrap();
            let deserialized: OrderStatus = serde_json::from_str(&serialized).unwrap();
            assert_eq!(status, deserialized);
        }
        
        // 测试特定值
        let pending_json = serde_json::to_string(&OrderStatus::Pending).unwrap();
        assert_eq!(pending_json, "\"pending\"");
        
        let success_json = serde_json::to_string(&OrderStatus::Success).unwrap();
        assert_eq!(success_json, "\"success\"");
        
        let expired_json = serde_json::to_string(&OrderStatus::Expired).unwrap();
        assert_eq!(expired_json, "\"expired\"");
    }

    #[test]
    fn test_user_model() {
        let user_id = Uuid::new_v4();
        let created_at = Utc::now();
        
        let user = User {
            user_id,
            email: "test@example.com".to_string(),
            user_name: "Test User".to_string(),
            user_password: "hashed_password".to_string(),
            user_type: UserType::Gen,
            wallet_address: "0x123456789".to_string(),
            private_key: "private_key".to_string(),
            premium_balance: 1000,
            created_at,
        };
        
        // 测试序列化和反序列化
        let serialized = serde_json::to_string(&user).unwrap();
        let deserialized: User = serde_json::from_str(&serialized).unwrap();
        assert_eq!(user.user_id, deserialized.user_id);
        assert_eq!(user.email, deserialized.email);
        assert_eq!(user.user_name, deserialized.user_name);
        assert_eq!(user.user_type, deserialized.user_type);
        assert_eq!(user.wallet_address, deserialized.wallet_address);
        assert_eq!(user.private_key, deserialized.private_key);
        assert_eq!(user.premium_balance, deserialized.premium_balance);
        assert_eq!(user.created_at.timestamp(), deserialized.created_at.timestamp());
    }

    #[test]
    fn test_picker_model() {
        let picker_id = Uuid::new_v4();
        let dev_user_id = Uuid::new_v4();
        let created_at = Utc::now();
        let updated_at = Utc::now();
        
        let picker = Picker {
            picker_id,
            dev_user_id,
            alias: "Test Picker".to_string(),
            description: "Test Description".to_string(),
            price: 500,
            file_path: "/path/to/file".to_string(),
            download_count: 10,
            created_at,
            updated_at,
            image_path: "/path/to/image".to_string(),
            version: "1.0.0".to_string(),
            status: "active".to_string(),
        };
        
        // 测试序列化和反序列化
        let serialized = serde_json::to_string(&picker).unwrap();
        let deserialized: Picker = serde_json::from_str(&serialized).unwrap();
        assert_eq!(picker.picker_id, deserialized.picker_id);
        assert_eq!(picker.dev_user_id, deserialized.dev_user_id);
        assert_eq!(picker.alias, deserialized.alias);
        assert_eq!(picker.description, deserialized.description);
        assert_eq!(picker.price, deserialized.price);
        assert_eq!(picker.file_path, deserialized.file_path);
        assert_eq!(picker.download_count, deserialized.download_count);
        assert_eq!(picker.created_at.timestamp(), deserialized.created_at.timestamp());
        assert_eq!(picker.updated_at.timestamp(), deserialized.updated_at.timestamp());
        assert_eq!(picker.image_path, deserialized.image_path);
        assert_eq!(picker.version, deserialized.version);
        assert_eq!(picker.status, deserialized.status);
    }

    #[test]
    fn test_order_model() {
        let order_id = Uuid::new_v4();
        let user_id = Uuid::new_v4();
        let picker_id = Uuid::new_v4();
        let created_at = Utc::now();
        let expires_at = Some(Utc::now() + chrono::Duration::hours(1));
        
        let order = Order {
            order_id,
            user_id,
            picker_id,
            amount: 500,
            pay_type: PayType::Wallet,
            status: OrderStatus::Pending,
            tx_hash: Some("tx_hash_123".to_string()),
            created_at,
            expires_at,
        };
        
        // 测试序列化和反序列化
        let serialized = serde_json::to_string(&order).unwrap();
        let deserialized: Order = serde_json::from_str(&serialized).unwrap();
        assert_eq!(order.order_id, deserialized.order_id);
        assert_eq!(order.user_id, deserialized.user_id);
        assert_eq!(order.picker_id, deserialized.picker_id);
        assert_eq!(order.amount, deserialized.amount);
        assert_eq!(order.pay_type, deserialized.pay_type);
        assert_eq!(order.status, deserialized.status);
        assert_eq!(order.tx_hash, deserialized.tx_hash);
        assert_eq!(order.created_at.timestamp(), deserialized.created_at.timestamp());
        
        if let (Some(expires_at), Some(deserialized_expires_at)) = (order.expires_at, deserialized.expires_at) {
            assert_eq!(expires_at.timestamp(), deserialized_expires_at.timestamp());
        }
    }

    #[test]
    fn test_claims_struct() {
        let user_id = Uuid::new_v4();
        let claims = Claims::new(user_id);
        
        assert_eq!(claims.sub, user_id);
        // 检查exp是否在未来24小时内
        let now = chrono::Utc::now().timestamp() as usize;
        assert!(claims.exp > now);
        assert!(claims.exp <= now + 24 * 60 * 60);
    }

    #[test]
    fn test_download_token_struct() {
        let order_id = Uuid::new_v4();
        let token = DownloadToken::new(order_id);
        
        assert_eq!(token.order_id, order_id);
        assert!(!token.token.is_empty());
        // 检查expires_at是否在1小时后
        let expected_expires = chrono::Utc::now() + chrono::Duration::hours(1);
        let diff = expected_expires.timestamp() - token.expires_at.timestamp();
        assert!(diff.abs() < 5); // 允许5秒的误差
    }

    #[test]
    fn test_download_token_is_expired() {
        let order_id = Uuid::new_v4();
        
        // 创建一个已过期的token
        let mut token = DownloadToken::new(order_id);
        token.expires_at = chrono::Utc::now() - chrono::Duration::hours(1);
        assert!(token.is_expired());
        
        // 创建一个未过期的token
        let token = DownloadToken::new(order_id);
        assert!(!token.is_expired());
    }
}