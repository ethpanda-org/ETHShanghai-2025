const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose'); // 添加mongoose导入
const http = require('http');
const socketIo = require('socket.io');

// 🔥 重要：先加载环境变量，再导入其他模块
dotenv.config({ path: path.join(__dirname, '.env') });

// 导入服务
const WalletMonitoringService = require('./src/services/walletMonitoringService');
const RealtimeTransactionService = require('./src/services/realtimeTransactionService');

// 连接MongoDB数据库
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
    maxPoolSize: 10,
    minPoolSize: 2,
    retryWrites: true
}).then(() => {
    console.log('✅ MongoDB连接成功');
}).catch((error) => {
    console.error('❌ MongoDB连接失败:', error);
});

// 添加调试信息
console.log('🔍 调试信息:');
console.log('当前工作目录:', process.cwd());
console.log('__dirname:', __dirname);
// 生产环境下不输出敏感信息
if (process.env.NODE_ENV !== 'production') {
    console.log('MONGODB_URI:', process.env.MONGODB_URI ? '已配置' : '未配置');
    console.log('QWEN_API_KEY 是否存在:', !!process.env.QWEN_API_KEY);
    console.log('QWEN_API_KEY 前4位:', process.env.QWEN_API_KEY ? process.env.QWEN_API_KEY.substring(0, 4) + '...' : 'undefined');
    console.log('QWEN_BASE_URL:', process.env.QWEN_BASE_URL ? '已配置' : '未配置');
    console.log('QWEN_MODEL:', process.env.QWEN_MODEL || '默认模型');
}

// 🔥 环境变量加载后再导入依赖AI服务的模块
const riskAnalysisRoutes = require('./src/routes/riskAnalysis');
const contractRoutes = require('./src/routes/contracts');
const poolRoutes = require('./src/routes/pools');
const aiRiskControlRoutes = require('./src/routes/aiRiskControl');
const aiMonitoringRoutes = require('./src/routes/aiMonitoringRoutes');
const chatRoutes = require('./src/routes/chatRoutes');
const contractAnalysisRoutes = require('./src/routes/contractAnalysis');
const { setupDatabase } = require('./src/config/database');
const { setupRedis } = require('./src/config/redis');
const logger = require('./src/utils/logger');
const qwenService = require('./src/services/qwenService');

// 初始化钱包监控服务
const walletMonitoringService = new WalletMonitoringService();

// 初始化实时交易监听服务
const realtimeTransactionService = new RealtimeTransactionService();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],
        methods: ["GET", "POST"],
        credentials: true
    },
    // 添加更多Socket.IO配置选项以提高连接稳定性
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000,
    upgradeTimeout: 30000,
    maxHttpBufferSize: 1e6
});

const PORT = process.env.PORT || 3001;

// 中间件
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "http://localhost:*", "ws://localhost:*"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false
}));

// 添加额外的安全头
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API路由
app.use('/api/risk-analysis', riskAnalysisRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/pools', poolRoutes);
app.use('/api/ai-risk-control', aiRiskControlRoutes);
app.use('/api/ai-monitoring', aiMonitoringRoutes);
app.use('/api/monitoring', aiMonitoringRoutes); // 添加别名路由支持前端调用
app.use('/api/chat', chatRoutes);
app.use('/api/contract-analysis', contractAnalysisRoutes);

// 健康检查
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API健康检查端点
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true,
        status: 'OK', 
        message: 'API服务运行正常',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || '1.0.0'
    });
});

// 错误处理
app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// 启动服务器
async function startServer() {
    try {
        // 尝试连接数据库，但不阻塞服务启动
        try {
            await setupDatabase();
            logger.info('Database connected successfully');
        } catch (dbError) {
            logger.warn('Database connection failed, continuing without database:', dbError.message);
        }
        
        // 尝试连接Redis，但不阻塞服务启动
        try {
            await setupRedis();
            logger.info('Redis connected successfully');
        } catch (redisError) {
            logger.warn('Redis connection failed, continuing without Redis:', redisError.message);
        }
        
        // 初始化AI对话Socket服务已移除
        
        // Socket.IO 连接处理已统一到socketHandler.js
        const SocketHandler = require('./src/websocket/socketHandler');
        const socketHandler = new SocketHandler(io);
        
        // 设置服务实例到Socket处理器
        socketHandler.setWalletMonitoringService(walletMonitoringService);
        socketHandler.setRealtimeTransactionService(realtimeTransactionService);
        
        // 将服务实例保存到app中，供其他路由使用
        app.set('realtimeTransactionService', realtimeTransactionService);
        
        server.listen(PORT, () => {
            logger.info(`Server running on port ${PORT}`);
            console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
            console.log(`📊 AI分析功能已启用（降级模式）`);
            console.log(`🔌 Socket.IO服务已启动`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

// 在现有代码中添加数据库连接监控
mongoose.connection.on('connected', () => {
    logger.info('✅ MongoDB connected successfully');
});

mongoose.connection.on('error', (err) => {
    logger.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    logger.warn('⚠️ MongoDB disconnected');
});

// 获取最近交易的API端点（保留作为备用）
app.get('/api/monitoring/transactions', async (req, res) => {
  try {
    const { address, chain, limit = 10 } = req.query;
    
    if (!address || !chain) {
      return res.status(400).json({ success: false, message: '缺少address或chain参数' });
    }
    
    const transactions = await walletMonitoringService.getRecentTransactions(address, chain, parseInt(limit));
    
    res.json({
      success: true,
      transactions
    });
  } catch (error) {
     logger.error('获取交易失败:', error);
     res.status(500).json({ success: false, message: '获取交易失败' });
   }
 });

// 启动实时交易监听的API端点
app.post('/api/monitoring/start-realtime', async (req, res) => {
  try {
    const { addresses } = req.body;
    
    if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
      return res.status(400).json({ success: false, message: '缺少addresses参数或格式错误' });
    }
    
    await realtimeTransactionService.startListening(addresses);
    
    res.json({
      success: true,
      message: '实时交易监听已启动',
      addresses
    });
  } catch (error) {
    logger.error('启动实时监听失败:', error);
    res.status(500).json({ success: false, message: '启动实时监听失败' });
  }
});

// 停止实时交易监听的API端点
app.post('/api/monitoring/stop-realtime', async (req, res) => {
  try {
    await realtimeTransactionService.stopListening();
    
    res.json({
      success: true,
      message: '实时交易监听已停止'
    });
  } catch (error) {
    logger.error('停止实时监听失败:', error);
    res.status(500).json({ success: false, message: '停止实时监听失败' });
  }
});