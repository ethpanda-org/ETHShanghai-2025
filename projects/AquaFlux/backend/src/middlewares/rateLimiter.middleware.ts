import rateLimit from 'express-rate-limit';

// 通用 API 速率限制
// 用于保护所有 API 端点，防止一般的滥用行为。
// 限制：每个 IP 地址在 15 分钟内最多允许 100 次请求。
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 每个窗口最多 100 次请求
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true, // 返回 RateLimit-* headers
  legacyHeaders: false, // 禁用 X-RateLimit-* headers
});

// 认证相关端点速率限制
// 用于保护如登录、发送 OTP、重置密码等敏感操作，以防止暴力破解攻击。
// 限制：每个 IP 地址在 15 分钟内最多允许 5 次请求。
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50000, // 每个窗口最多 5 次请求
  message: 'Too many authentication attempts from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});
