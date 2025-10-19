// 支付页面性能配置
export const PAYMENT_CONFIG = {
  // 授权相关
  APPROVAL: {
    // 授权后等待时间（毫秒）
    WAIT_AFTER_APPROVAL: 1000,
    // 刷新次数
    REFRESH_COUNT: 2,
    // 每次刷新间隔（毫秒）
    REFRESH_INTERVAL: 1000,
  },

  // 支付相关
  PAYMENT: {
    // 支付前是否需要多次刷新（建议关闭）
    ENABLE_PRE_PAYMENT_REFRESH: false,
    // 支付前刷新次数
    PRE_PAYMENT_REFRESH_COUNT: 0,
    // 支付成功后跳转延迟（毫秒）
    SUCCESS_REDIRECT_DELAY: 2000,
  },

  // 实时检查
  REALTIME: {
    // 是否启用定期检查 allowance（建议关闭）
    ENABLE_PERIODIC_CHECK: false,
    // 检查间隔（毫秒）
    CHECK_INTERVAL: 10000,
  },

  // 调试日志
  DEBUG: {
    // 是否启用详细日志
    ENABLE_VERBOSE_LOGS: false,
    // 是否显示 allowance 检查日志
    SHOW_ALLOWANCE_LOGS: false,
    // 是否显示支付流程日志
    SHOW_PAYMENT_LOGS: true,
  },

  // 用户体验
  UX: {
    // 是否显示加载动画
    SHOW_LOADING_ANIMATIONS: true,
    // 是否使用 toast 通知（需要安装 react-hot-toast）
    USE_TOAST_NOTIFICATIONS: true,
    // 错误提示方式（'alert' | 'toast' | 'inline'）
    ERROR_DISPLAY_MODE: 'alert',
  }
};

// 性能优化建议
export const PERFORMANCE_TIPS = {
  // 1. 减少不必要的网络请求
  // - 移除定期的 allowance 检查
  // - 减少支付前的刷新次数

  // 2. 优化等待时间
  // - 授权后等待 1 秒即可
  // - 支付成功后 2 秒跳转

  // 3. 优化日志输出
  // - 生产环境关闭详细日志
  // - 仅保留关键操作日志

  // 4. 使用缓存
  // - 缓存 token 信息
  // - 缓存订单信息

  // 5. 并行处理
  // - 同时获取多个数据
  // - 使用 Promise.all() 优化
};