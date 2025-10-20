const { RateLimiterMemory } = require('rate-limiter-flexible');
const logger = require('../utils/logger');

// 创建速率限制器
const rateLimiter = new RateLimiterMemory({
    keyGenerator: (req) => req.ip, // 基于IP地址限制
    points: 10, // 每个时间窗口允许的请求数
    duration: 60, // 时间窗口（秒）
});

// API 分析请求限制器（更严格）
const analysisRateLimiter = new RateLimiterMemory({
    keyGenerator: (req) => req.ip,
    points: 5, // 每分钟最多5次分析请求
    duration: 60,
});

// 通用速率限制中间件
const rateLimiterMiddleware = async (req, res, next) => {
    try {
        await rateLimiter.consume(req.ip);
        next();
    } catch (rejRes) {
        const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
        res.set('Retry-After', String(secs));
        
        logger.warn(`Rate limit exceeded for IP: ${req.ip}`, {
            ip: req.ip,
            path: req.path,
            method: req.method
        });
        
        res.status(429).json({
            success: false,
            error: '请求过于频繁，请稍后再试',
            retryAfter: secs
        });
    }
};

// AI 分析专用速率限制中间件
const analysisRateLimiterMiddleware = async (req, res, next) => {
    try {
        await analysisRateLimiter.consume(req.ip);
        next();
    } catch (rejRes) {
        const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
        res.set('Retry-After', String(secs));
        
        logger.warn(`Analysis rate limit exceeded for IP: ${req.ip}`, {
            ip: req.ip,
            path: req.path,
            method: req.method
        });
        
        res.status(429).json({
            success: false,
            error: 'AI分析请求过于频繁，请稍后再试',
            retryAfter: secs
        });
    }
};

module.exports = {
    rateLimiter: rateLimiterMiddleware,
    analysisRateLimiter: analysisRateLimiterMiddleware
};