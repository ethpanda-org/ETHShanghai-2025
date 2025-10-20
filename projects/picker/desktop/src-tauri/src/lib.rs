#[cfg_attr(mobile, tauri::mobile_entry_point)]
// 导入必要的模块
use tauri::{Builder, Manager};
use tauri_plugin_store::{StoreBuilder};
use tauri_plugin_dialog::init as init_dialog_plugin;
use tauri_plugin_opener::init as init_opener_plugin;
use std::sync::Arc;
use tokio::sync::Mutex;

// 导入命令模块
pub mod commands;
pub mod api;
pub mod utils;
pub mod config;

// 导入认证管理器
use crate::utils::auth::AuthManager;
use crate::commands::chatbot::ChatbotState;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

pub fn run() {
  // 创建 Tauri 应用
  Builder::default()
    // 设置插件
    .plugin(tauri_plugin_store::Builder::default().build())
    .plugin(init_dialog_plugin())
    .plugin(init_opener_plugin())
    .setup(|app| {
      // 在调试模式下启用日志插件
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      
      // 初始化认证存储
      let auth_store = StoreBuilder::new(app.handle(), "auth.json")
        .build()?;
      
      // 将认证存储添加到应用状态
      app.manage(auth_store.clone());
      
      // 创建并管理 AuthManager 实例
      let auth_manager = AuthManager::new(auth_store);
      app.manage(auth_manager);
      
      // 创建并管理 ChatbotState 实例
      let chatbot_state = Arc::new(Mutex::new(ChatbotState::default()));
      app.manage(chatbot_state);
      
      Ok(())
    })
    // 注册命令
    .invoke_handler(tauri::generate_handler!(
      greet,
      // 健康检查
      commands::pickers::simple_connection_test,
      commands::users::api_connection,
      // 用户相关命令
      commands::users::login,
      commands::users::register,
      commands::users::verify_email,
      commands::users::get_user_lastest_info,
      commands::users::logout,
      commands::users::check_login_status,
      commands::users::get_current_user_info,
      commands::users::get_wallet_balance,
      commands::users::get_system_info,
      commands::users::transfer_to,
      commands::users::replace_private_key,
      commands::users::get_max_transferable_balance,

      // Picker 相关命令
      commands::pickers::get_picker_marketplace,
      commands::pickers::get_picker_detail,
      commands::pickers::upload_picker,
      commands::pickers::delete_picker,

      // picker_payment_contract 相关命令
      commands::picker_payment_contract::is_picker_operator,
      commands::picker_payment_contract::query_picker_by_wallet,
      commands::picker_payment_contract::register_picker,
      commands::picker_payment_contract::remove_picker,
      commands::picker_payment_contract::get_all_pickers,
      commands::picker_payment_contract::get_all_operators,
      commands::picker_payment_contract::grant_operator_role,
      commands::picker_payment_contract::revoke_operator_role,
      commands::picker_payment_contract::withdraw_funds,
      
      // 订单相关命令
      commands::orders::get_user_orders,
      commands::orders::create_order,
      commands::orders::get_order_detail,
      
      // 下载相关命令
      commands::download::download_picker,
      
      // 任务相关命令
      commands::task::get_task_config,
      commands::task::get_env_config,
      commands::task::get_project_config,
      commands::task::get_task_schema,
      commands::task::list_tasks,
      commands::task::create_task,
      commands::task::run_task,
      commands::task::stop_task,
      commands::task::setup_env,
      commands::task::delete_task,
      
      // 聊天机器人相关命令
      commands::chatbot::init_chatbot,
      commands::chatbot::create_chat_session,
      commands::chatbot::send_chat_message,
      commands::chatbot::list_chat_sessions,
      commands::chatbot::get_chat_session,
      commands::chatbot::delete_chat_session,
      commands::chatbot::delete_all_chat_sessions,
      commands::chatbot::get_available_tools,
      commands::chatbot::save_parameters_to_file,
      commands::chatbot::refresh_available_tools,
    ))
    // 运行应用
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;
        
    // 测试模块导入
    #[test]
    fn test_module_imports() {
        // 验证模块可以被正确导入
        // 由于我们不能直接测试模块导入，这个测试主要是确保模块存在
        assert!(true);
    }
    
    // 测试核心模块可用性
    #[test]
    fn test_core_modules_available() {
        // 验证核心模块可以被访问
        let _ = config::AppConfig::default();
        
        // 测试通过
        assert!(true);
    }
}
