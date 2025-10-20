// ZK Proof Server - Dedicated Express Server for ZK Proof Generation
// 专用的ZK证明生成服务器

import express from 'express';
import cors from 'cors';
import { ProofGenerator } from './services/proof-generator.js';
import { multiPlatformProofGenerator } from './services/multi-platform-proof-generator.js';
import { validateAndCleanFields } from './utils/field-validator.js';
import SERVER_CONFIG from './config/server-config.js';

const app = express();

// 设置Node.js内存限制
process.env.NODE_OPTIONS = `--max-old-space-size=${SERVER_CONFIG.maxMemory}`;

// 中间件
app.use(cors(SERVER_CONFIG.cors));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 请求日志中间件
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// 多平台证明生成器会在导入时自动初始化
// (不再需要单一的 proofGenerator)

// 路由定义

/**
 * 健康检查（多平台）
 */
app.get('/health', (req, res) => {
  const health = multiPlatformProofGenerator.healthCheck();
  res.status(health.status === 'healthy' ? 200 : 500).json(health);
});

/**
 * 服务器信息
 */
app.get('/info', (req, res) => {
  res.json({
    name: 'ZK Proof Server',
    version: '2.0.0',
    status: 'running',
    multiPlatform: true,
    config: {
      maxMemory: SERVER_CONFIG.maxMemory + 'MB',
      workerThreads: SERVER_CONFIG.workerThreads,
      requestTimeout: SERVER_CONFIG.requestTimeout + 'ms'
    },
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: Date.now()
  });
});

/**
 * 获取所有支持的平台
 */
app.get('/platforms', (req, res) => {
  try {
    const platforms = multiPlatformProofGenerator.getAllPlatforms();
    res.json({
      success: true,
      platforms,
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: Date.now()
    });
  }
});

/**
 * 生成ZK证明 - 主要API端点（多平台支持）
 */
app.post('/generate-proof', async (req, res) => {
  const startTime = Date.now();
  
  try {
    console.log('📥 收到证明生成请求');
    
    const { zkInput, options = {}, platform = 'propertyfy' } = req.body;
    
    console.log(`🎯 目标平台: ${platform}`);
    
    if (!zkInput) {
      return res.status(400).json({
        success: false,
        error: '缺少zkInput参数',
        timestamp: Date.now()
      });
    }

    // 根据平台验证和清理字段
    const validation = validateAndCleanFields(platform, zkInput);
    
    if (!validation.valid) {
      console.error('❌ 缺少必需字段:', validation.missingFields);
      console.log('📋 收到的字段:', validation.receivedFields);
      return res.status(400).json({
        success: false,
        error: `${platform} 平台缺少必需字段: ${validation.missingFields.join(', ')}`,
        platform,
        missingFields: validation.missingFields,
        receivedFields: validation.receivedFields,
        timestamp: Date.now()
      });
    }

    console.log('✅ 输入验证通过，开始生成证明...');

    // 设置请求超时
    const timeout = options.timeout || SERVER_CONFIG.requestTimeout;
    req.setTimeout(timeout);

    try {
      // 使用多平台生成器
      const proofResult = await multiPlatformProofGenerator.generateProof(platform, zkInput);
      
      const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
      
      res.json({
        success: true,
        proof: proofResult,
        platform: platform,
        platformName: proofResult.platformName,
        modules: proofResult.modules,
        warning: proofResult.warning,
        performance: {
          totalTime: totalTime + 's',
          generationTime: proofResult.metadata?.generationTime || '0.001',
          server: 'multi-platform-zk-server'
        },
        timestamp: Date.now()
      });

    } catch (proofError) {
      console.error('❌ 证明生成失败:', proofError);
      
      const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
      
      res.status(500).json({
        success: false,
        error: '证明生成失败',
        platform: platform,
        details: proofError.message,
        performance: {
          totalTime: totalTime + 's',
          server: 'multi-platform-zk-server'
        },
        timestamp: Date.now()
      });
    }

  } catch (error) {
    console.error('❌ 服务器错误:', error);
    
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
      details: error.message,
      performance: {
        totalTime: totalTime + 's',
        server: 'dedicated-zk-server'
      },
      timestamp: Date.now()
    });
  }
});

/**
 * 验证ZK证明（多平台支持）
 */
app.post('/verify-proof', async (req, res) => {
  try {
    const { proof, publicSignals, platform = 'propertyfy' } = req.body;
    
    console.log(`📥 收到验证请求 - 平台: ${platform}, 信号数: ${publicSignals?.length}`);
    
    if (!proof || !publicSignals) {
      return res.status(400).json({
        success: false,
        error: '缺少proof或publicSignals参数'
      });
    }

    // 使用多平台生成器验证
    const isValid = await multiPlatformProofGenerator.verifyProof(
      platform,
      { proof, publicSignals }
    );
    
    console.log(`✅ 证明验证结果: ${isValid ? '通过' : '失败'}`);
    
    res.json({
      success: true,
      verified: isValid,
      platform,
      publicSignalsCount: publicSignals.length,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('❌ 证明验证错误:', error);
    res.status(500).json({
      success: false,
      error: '证明验证失败',
      details: error.message,
      timestamp: Date.now()
    });
  }
});

// 错误处理中间件
app.use((error, req, res, next) => {
  console.error('🚨 未处理的错误:', error);
  res.status(500).json({
    success: false,
    error: '服务器内部错误',
    timestamp: Date.now()
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: '端点不存在',
    availableEndpoints: [
      'GET /health',
      'GET /info', 
      'POST /generate-proof',
      'POST /verify-proof'
    ],
    timestamp: Date.now()
  });
});

// 启动服务器
const server = app.listen(SERVER_CONFIG.port, SERVER_CONFIG.host, () => {
  console.log('🚀 ZK证明服务器启动成功!');
  console.log(`📍 服务地址: http://${SERVER_CONFIG.host}:${SERVER_CONFIG.port}`);
  console.log(`💾 内存限制: ${SERVER_CONFIG.maxMemory}MB`);
  console.log(`⏱️  请求超时: ${SERVER_CONFIG.requestTimeout / 1000}秒`);
  console.log(`🔧 工作线程: ${SERVER_CONFIG.workerThreads}`);
  console.log('');
  console.log('📋 可用端点:');
  console.log('  GET  /health        - 健康检查');
  console.log('  GET  /info          - 服务器信息');
  console.log('  POST /generate-proof - 生成ZK证明');
  console.log('  POST /verify-proof   - 验证ZK证明');
  console.log('');
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('📴 收到SIGTERM信号，正在关闭服务器...');
  server.close(() => {
    console.log('✅ 服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('📴 收到SIGINT信号，正在关闭服务器...');
  server.close(() => {
    console.log('✅ 服务器已关闭');
    process.exit(0);
  });
});

export default app;

