
pub fn determine_log_level(message: &str) -> &'static str {
    let message_lower = message.to_lowercase();
    if message_lower.contains("info:") || message_lower.contains("[info]") || message_lower.contains("debug:") || message_lower.contains("[debug]") {
        "info"
    } else if message_lower.contains("warning:") || message_lower.contains("warn:") || message_lower.contains("[warn]") || message_lower.contains("[warning]") {
        "warning"
    } else if message_lower.contains("error:") || message_lower.contains("[error]") || message_lower.contains("exception:") || message_lower.contains("[exception]") {
        "error"
    } else {
        // 默认返回"info"而不是"error"，更符合无硬编码的原则
        "info"
    }
}