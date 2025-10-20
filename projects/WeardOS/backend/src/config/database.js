const mongoose = require('mongoose');
const logger = require('../utils/logger');

// 主数据库连接（Hark数据库）
let mainConnection = null;
// 测试数据库连接（testdata数据库）
let testConnection = null;

/**
 * 设置主数据库连接（Hark数据库）
 */
async function setupMainDatabase() {
    try {
        const mongoUri = process.env.MONGODB_URI;
        
        if (!mongoUri) {
            logger.info('MongoDB URI not provided, skipping database connection');
            return null;
        }

        // MongoDB连接选项 - 优化超时设置
        const options = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 15,                    // 增加连接池大小
            minPoolSize: 2,                     // 设置最小连接池大小
            serverSelectionTimeoutMS: 10000,   // 增加服务器选择超时时间
            socketTimeoutMS: 60000,             // 增加socket超时时间
            connectTimeoutMS: 10000,            // 设置连接超时时间
            heartbeatFrequencyMS: 10000,        // 心跳频率
            maxIdleTimeMS: 30000,               // 最大空闲时间
            retryWrites: true,                  // 启用重试写入
            retryReads: true                    // 启用重试读取
        };

        // 连接到主数据库（Hark）
        mainConnection = await mongoose.createConnection(mongoUri, options);
        
        logger.info('Main MongoDB (Hark) connected successfully');
        
        // 监听连接事件
        mainConnection.on('error', (error) => {
            logger.error('Main MongoDB connection error:', error);
        });

        mainConnection.on('disconnected', () => {
            logger.warn('Main MongoDB disconnected');
        });

        return mainConnection;
    } catch (error) {
        logger.warn('Main database connection failed:', error.message);
        return null;
    }
}

/**
 * 设置所有数据库连接
 */
async function setupDatabase() {
    await setupMainDatabase();
    return { mainConnection };
}

/**
 * 获取主数据库连接
 */
function getMainConnection() {
    return mainConnection;
}

/**
 * 获取测试数据库连接
 */
function getTestConnection() {
    return testConnection;
}

/**
 * 关闭所有数据库连接
 */
async function closeDatabase() {
    try {
        if (mainConnection) {
            await mainConnection.close();
            logger.info('Main MongoDB connection closed');
        }
        if (testConnection) {
            await testConnection.close();
            logger.info('Test MongoDB connection closed');
        }
    } catch (error) {
        logger.error('Error closing database connections:', error);
    }
}

// 优雅关闭处理
process.on('SIGINT', async () => {
    await closeDatabase();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await closeDatabase();
    process.exit(0);
});

module.exports = {
    setupDatabase,
    closeDatabase,
    getMainConnection,
    getTestConnection
};