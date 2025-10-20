const redis = require('redis');
const logger = require('../utils/logger');

let redisClient = null;

async function setupRedis() {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    // 如果没有配置Redis，跳过连接
    if (!process.env.REDIS_URL) {
      logger.info('Redis URL not configured, skipping Redis connection');
      return;
    }
    
    redisClient = redis.createClient({ url: redisUrl });
    await redisClient.connect();
    logger.info('Connected to Redis successfully');
  } catch (error) {
    logger.warn('Redis connection failed, continuing without cache:', error.message);
    // 不抛出错误，让应用继续运行
  }
}

module.exports = { setupRedis, redisClient };