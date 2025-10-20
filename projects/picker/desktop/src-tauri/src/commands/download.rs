// 下载相关命令
use crate::api::client::ApiClient;
use std::time::UNIX_EPOCH;
use std::{fs::File, time::SystemTime};
use std::io::Write;
use crate::utils::auth::AuthManager;
use crate::config::AppConfig;
use tauri::{AppHandle, Manager, State};
use chrono::{DateTime, Utc};

// 下载 Picker 文件命令
#[tauri::command]
pub async fn download_picker(
    token: String,
    app: AppHandle,
    auth_manager: State<'_, AuthManager>,
) -> Result<String, String> {
    let config = AppConfig::load().unwrap_or_else(|_| AppConfig::default());
    let api_client = ApiClient::new(&config, Some(auth_manager.inner().clone()));
    
    // 下载文件内容
    let file_content = api_client.download("/download", &token).await.map_err(|e| e.to_string())?;
    
    // 获取下载目录
    let downloads_dir = app.path().download_dir()
        .map_err(|_| "Failed to get download directory".to_string())?;
    
    // 获取当前时间
    let current_time = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| format!("Failed to get current time: {}", e))?;
    // 将系统时间转换为DateTime对象
    let dt = DateTime::<Utc>::from_timestamp(current_time.as_secs() as i64, 0)
        .ok_or_else(|| "Failed to convert system time to DateTime".to_string())?;
    // 格式化时间为"月日时分"格式
    let formatted_time = dt.format("%m%d%H%M").to_string();

    // 生成随机文件名（在实际应用中应该从API获取文件名）
    let file_name = format!("picker_{}_{}.zip", token.chars().take(8).collect::<String>(), formatted_time);
    let file_path = downloads_dir.join(file_name);
    
    // 写入文件
    let mut file = File::create(&file_path)
        .map_err(|e| format!("Failed to create file: {}", e))?;
    
    file.write_all(&file_content)
        .map_err(|e| format!("Failed to write to file: {}", e))?;
    
    // 返回文件路径
    file_path.to_str()
        .ok_or_else(|| "Failed to convert file path to string".to_string())
        .map(String::from)
}