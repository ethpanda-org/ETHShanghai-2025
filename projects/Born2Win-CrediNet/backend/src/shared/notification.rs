use async_trait::async_trait;
use crate::shared::errors::AppError;

/// 通知发送trait，支持多种发送方式
#[async_trait]
pub trait NotificationSender: Send + Sync {
    async fn send_code(&self, recipient: &str, code: &str) -> Result<(), AppError>;
}

/// 邮件发送器
pub struct EmailSender {
    smtp_host: String,
    smtp_port: u16,
    smtp_username: String,
    smtp_password: String,
    from_email: String,
}

impl EmailSender {
    #[allow(dead_code)]
    pub fn new(
        smtp_host: String,
        smtp_port: u16,
        smtp_username: String,
        smtp_password: String,
        from_email: String,
    ) -> Self {
        Self {
            smtp_host,
            smtp_port,
            smtp_username,
            smtp_password,
            from_email,
        }
    }

    pub fn from_env() -> Result<Self, AppError> {
        Ok(Self {
            smtp_host: std::env::var("SMTP_HOST").unwrap_or_else(|_| "smtp.gmail.com".to_string()),
            smtp_port: std::env::var("SMTP_PORT")
                .unwrap_or_else(|_| "587".to_string())
                .parse()
                .unwrap_or(587),
            smtp_username: std::env::var("SMTP_USERNAME").unwrap_or_default(),
            smtp_password: std::env::var("SMTP_PASSWORD").unwrap_or_default(),
            from_email: std::env::var("SMTP_FROM_EMAIL").unwrap_or_else(|_| "noreply@credinet.com".to_string()),
        })
    }
}

#[async_trait]
impl NotificationSender for EmailSender {
    async fn send_code(&self, recipient: &str, code: &str) -> Result<(), AppError> {
        use lettre::{Message, SmtpTransport, Transport};
        use lettre::message::header::ContentType;
        use lettre::transport::smtp::authentication::Credentials;

        let email = Message::builder()
            .from(self.from_email.parse().map_err(|e| AppError::ValidationError(format!("Invalid from email: {}", e)))?)
            .to(recipient.parse().map_err(|e| AppError::ValidationError(format!("Invalid recipient email: {}", e)))?)
            .subject("CrediNet 验证码")
            .header(ContentType::TEXT_PLAIN)
            .body(format!("您的验证码是: {}\n\n此验证码将在5分钟后过期。\n\n如果这不是您的操作，请忽略此邮件。", code))
            .map_err(|e| AppError::ValidationError(format!("Failed to build email: {}", e)))?;

        let creds = Credentials::new(self.smtp_username.clone(), self.smtp_password.clone());

        let mailer = SmtpTransport::relay(&self.smtp_host)
            .map_err(|e| AppError::ValidationError(format!("Failed to connect to SMTP server: {}", e)))?
            .credentials(creds)
            .port(self.smtp_port)
            .build();

        mailer.send(&email)
            .map_err(|e| AppError::ValidationError(format!("Failed to send email: {}", e)))?;

        println!("📧 Email sent to {} with code: {}", recipient, code);
        Ok(())
    }
}

/// 短信发送器（示例：支持多个第三方服务）
#[allow(dead_code)]
pub struct SmsSender {
    api_key: String,
    api_secret: String,
    service_provider: SmsProvider,
}

#[derive(Clone, Debug)]
pub enum SmsProvider {
    /// 阿里云短信
    Aliyun,
    /// 腾讯云短信
    Tencent,
    /// Twilio
    Twilio,
    /// 模拟发送（用于测试）
    Mock,
}

impl SmsSender {
    #[allow(dead_code)]
    pub fn new(api_key: String, api_secret: String, provider: SmsProvider) -> Self {
        Self {
            api_key,
            api_secret,
            service_provider: provider,
        }
    }

    pub fn from_env() -> Result<Self, AppError> {
        let provider_str = std::env::var("SMS_PROVIDER").unwrap_or_else(|_| "mock".to_string());
        let provider = match provider_str.to_lowercase().as_str() {
            "aliyun" => SmsProvider::Aliyun,
            "tencent" => SmsProvider::Tencent,
            "twilio" => SmsProvider::Twilio,
            _ => SmsProvider::Mock,
        };

        Ok(Self {
            api_key: std::env::var("SMS_API_KEY").unwrap_or_default(),
            api_secret: std::env::var("SMS_API_SECRET").unwrap_or_default(),
            service_provider: provider,
        })
    }
}

#[async_trait]
impl NotificationSender for SmsSender {
    async fn send_code(&self, recipient: &str, code: &str) -> Result<(), AppError> {
        match self.service_provider {
            SmsProvider::Mock => {
                // 模拟发送（用于开发和测试）
                println!("📱 [MOCK] SMS sent to {} with code: {}", recipient, code);
                Ok(())
            }
            SmsProvider::Aliyun => {
                self.send_aliyun_sms(recipient, code).await
            }
            SmsProvider::Tencent => {
                self.send_tencent_sms(recipient, code).await
            }
            SmsProvider::Twilio => {
                self.send_twilio_sms(recipient, code).await
            }
        }
    }
}

impl SmsSender {
    async fn send_aliyun_sms(&self, recipient: &str, code: &str) -> Result<(), AppError> {
        // 阿里云短信API集成示例
        println!("📱 [Aliyun] Sending SMS to {} with code: {}", recipient, code);
        
        // TODO: 实际的阿里云SDK调用
        // 示例代码框架：
        // let client = reqwest::Client::new();
        // let response = client.post("https://dysmsapi.aliyuncs.com/")
        //     .header("Content-Type", "application/x-www-form-urlencoded")
        //     .body(build_aliyun_request_body(recipient, code, &self.api_key, &self.api_secret))
        //     .send()
        //     .await?;
        
        Ok(())
    }

    async fn send_tencent_sms(&self, recipient: &str, code: &str) -> Result<(), AppError> {
        // 腾讯云短信API集成示例
        println!("📱 [Tencent] Sending SMS to {} with code: {}", recipient, code);
        
        // TODO: 实际的腾讯云SDK调用
        
        Ok(())
    }

    async fn send_twilio_sms(&self, recipient: &str, code: &str) -> Result<(), AppError> {
        // Twilio API集成示例
        println!("📱 [Twilio] Sending SMS to {} with code: {}", recipient, code);
        
        // TODO: 实际的Twilio API调用
        // let client = reqwest::Client::new();
        // let response = client.post(format!("https://api.twilio.com/2010-04-01/Accounts/{}/Messages.json", self.api_key))
        //     .basic_auth(&self.api_key, Some(&self.api_secret))
        //     .form(&[
        //         ("To", recipient),
        //         ("From", "+1234567890"), // Twilio号码
        //         ("Body", &format!("您的验证码是: {}", code)),
        //     ])
        //     .send()
        //     .await?;
        
        Ok(())
    }
}

/// 控制台发送器（用于开发测试）
pub struct ConsoleSender;

#[async_trait]
impl NotificationSender for ConsoleSender {
    async fn send_code(&self, recipient: &str, code: &str) -> Result<(), AppError> {
        println!("📨 [CONSOLE] Send code to {} -> {} (for testing only)", recipient, code);
        Ok(())
    }
}

/// 通知发送器工厂
pub fn create_notification_sender(contact_type: &str) -> Box<dyn NotificationSender> {
    // 根据联系方式类型判断使用邮件还是短信
    if contact_type.contains('@') {
        // 邮箱地址
        if let Ok(sender) = EmailSender::from_env() {
            // 检查是否配置了SMTP
            if !sender.smtp_username.is_empty() {
                return Box::new(sender);
            }
        }
    } else {
        // 手机号
        if let Ok(sender) = SmsSender::from_env() {
            return Box::new(sender);
        }
    }
    
    // 默认使用控制台输出（开发模式）
    Box::new(ConsoleSender)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_console_sender() {
        let sender = ConsoleSender;
        let result = sender.send_code("test@example.com", "123456").await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_notification_factory() {
        let email_sender = create_notification_sender("user@example.com");
        let result = email_sender.send_code("user@example.com", "123456").await;
        assert!(result.is_ok());

        let sms_sender = create_notification_sender("+86 138 0000 0000");
        let result = sms_sender.send_code("+86 138 0000 0000", "654321").await;
        assert!(result.is_ok());
    }
}

