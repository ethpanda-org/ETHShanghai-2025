module.exports = {
  // 区块链网络配置 (Holesky测试网)
  blockchain: {
    url: process.env.WEB3_PROVIDER_URL || 'https://ethereum-holesky-rpc.publicnode.com',
    networkId: process.env.NETWORK_ID || '17000',
    chainId: process.env.CHAIN_ID || '17000'
  },

  // AI监控配置
  monitoring: {
    // 分析间隔（毫秒）
    analysisInterval: 5000,
    
    // 交易缓冲区大小
    transactionBufferSize: 100,
    
    // 每次分析的交易数量
    batchSize: 10,
    
    // 风险阈值
    riskThresholds: {
      high: 80,
      medium: 50,
      low: 20
    },
    
    // 监控规则
    rules: {
      // 大额交易阈值（ETH）
      largeTransactionThreshold: 100,
      
      // 异常Gas价格倍数
      abnormalGasMultiplier: 5,
      
      // 新地址交易数阈值
      newAddressThreshold: 5,
      
      // 深夜交易时间范围
      nightTimeRange: [2, 5]
    }
  },

  // AI模型配置
  aiModel: {
    // 权重配置
    weights: {
      transactionValue: 0.3,
      gasPrice: 0.2,
      addressBehavior: 0.25,
      contractInteraction: 0.15,
      timePattern: 0.1
    },
    
    // 学习参数
    learningRate: 0.01,
    
    // 历史数据窗口（天）
    historicalWindow: 30
  },

  // 预警配置
  alerts: {
    // 启用实时预警
    realTimeAlerts: true,
    
    // 预警级别
    levels: {
      critical: {
        threshold: 90,
        actions: ['email', 'sms', 'webhook']
      },
      high: {
        threshold: 70,
        actions: ['email', 'webhook']
      },
      medium: {
        threshold: 50,
        actions: ['webhook']
      }
    },
    
    // 通知配置
    notifications: {
      email: {
        enabled: process.env.EMAIL_ALERTS_ENABLED === 'true',
        recipients: process.env.ALERT_EMAIL_RECIPIENTS?.split(',') || []
      },
      webhook: {
        enabled: process.env.WEBHOOK_ALERTS_ENABLED === 'true',
        url: process.env.ALERT_WEBHOOK_URL
      }
    }
  },

  // 数据存储配置
  storage: {
    // 保存分析结果
    saveAnalysisResults: true,
    
    // 数据保留期（天）
    retentionPeriod: 90,
    
    // 数据库配置
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      name: process.env.DB_NAME || 'ai_monitoring',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password'
    }
  },

  // 性能配置
  performance: {
    // 最大并发分析数
    maxConcurrentAnalysis: 5,
    
    // 内存限制（MB）
    memoryLimit: 512,
    
    // CPU使用率限制（%）
    cpuLimit: 80
  },

  // 调试配置
  debug: {
    enabled: process.env.NODE_ENV === 'development',
    logLevel: process.env.LOG_LEVEL || 'info',
    saveDebugData: process.env.SAVE_DEBUG_DATA === 'true'
  }
};