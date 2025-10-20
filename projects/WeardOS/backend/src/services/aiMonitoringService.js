const EventEmitter = require('events');
const { Web3 } = require('web3');
const mongoose = require('mongoose');

class AIMonitoringService extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.web3 = null;
    this.isMonitoring = false;
    this.monitoredAddresses = new Set();
    this.riskThresholds = {
      high: 80,
      medium: 50,
      low: 20
    };
    this.transactionBuffer = [];
    this.analysisQueue = [];
    this.lastProcessedBlock = 0;
  }

  // 初始化连接到测试网
  async initialize() {
    try {
      const web3ProviderUrl = this.config.web3ProviderUrl || process.env.WEB3_PROVIDER_URL || 'https://ethereum-holesky-rpc.publicnode.com';
      console.log('正在连接到Web3提供商:', web3ProviderUrl);
      
      this.web3 = new Web3(web3ProviderUrl);
      
      // 测试连接 - 使用正确的Web3.js方法
      const chainId = await this.web3.eth.getChainId();
      console.log('已连接到链ID:', chainId.toString());
      
      // 验证网络连接
      const blockNumber = await this.web3.eth.getBlockNumber();
      console.log('当前区块号:', blockNumber.toString());
      
      // 自动启动监控
      this.isMonitoring = true;
      console.log('AI监控服务已成功连接到测试网');
      
      // 启动轮询监控
      this.startPollingMonitoring();
      
      return true;
    } catch (error) {
      console.error('初始化AI监控服务失败:', error);
      throw error;
    }
  }

  // 开始监控
  async startMonitoring(config = {}) {
    if (this.isMonitoring) {
      return { success: false, message: '监控已在运行中' };
    }

    try {
      await this.initialize();
      this.isMonitoring = true;
      
      // 添加监控地址
      const addresses = config.addresses || [];
      if (Array.isArray(addresses)) {
        addresses.forEach(addr => this.monitoredAddresses.add(addr.toLowerCase()));
      }
      
      // 启动实时交易监控
      await this.startTransactionMonitoring();
      
      // 启动AI分析引擎
      this.startAIAnalysis();
      
      this.emit('monitoringStarted', {
        timestamp: Date.now(),
        addresses: Array.from(this.monitoredAddresses)
      });

      return {
        success: true,
        message: '监控已启动',
        monitoredAddresses: Array.from(this.monitoredAddresses)
      };
    } catch (error) {
      console.error('启动监控失败:', error);
      return { success: false, message: error.message };
    }
  }

  // 停止监控
  stopMonitoring() {
    this.isMonitoring = false;
    if (this.blockSubscription) {
      this.blockSubscription.unsubscribe();
    }
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    this.emit('monitoringStopped', { timestamp: Date.now() });
    return { success: true, message: '监控已停止' };
  }

  // 实时交易监控
  async startTransactionMonitoring() {
    try {
      // 先尝试获取当前区块号作为起始点
      this.lastProcessedBlock = Number(await this.web3.eth.getBlockNumber());
      console.log(`开始监控，当前区块: ${this.lastProcessedBlock}`);
      
      // 直接使用轮询方式，因为测试网可能不支持订阅
      this.startPollingMonitoring();
    } catch (error) {
      console.error('启动交易监控失败:', error);
      // 如果获取区块号失败，使用默认值
      this.lastProcessedBlock = 0;
      this.startPollingMonitoring();
    }
  }

  // 轮询监控方式（备用方案）
  startPollingMonitoring() {
    console.log('使用轮询方式监控区块...');
    
    // 如果没有监控地址，不启动轮询以节省资源
    if (this.monitoredAddresses.size === 0) {
      console.log('未指定监控地址，暂停区块轮询以节省资源');
      return;
    }
    
    this.pollingInterval = setInterval(async () => {
      try {
        const latestBlockNumber = Number(await this.web3.eth.getBlockNumber());
        
        if (this.lastProcessedBlock < latestBlockNumber) {
          console.log(`发现新区块，开始分析区块 ${this.lastProcessedBlock + 1} 到 ${latestBlockNumber}`);
          for (let i = this.lastProcessedBlock + 1; i <= latestBlockNumber; i++) {
            const blockHeader = { number: i };
            await this.analyzeBlock(blockHeader);
          }
          this.lastProcessedBlock = latestBlockNumber;
        }
      } catch (error) {
        console.error('轮询监控错误:', error);
      }
    }, 2000); // 每2秒检查一次，提高响应速度
  }

  // 分析区块中的交易
  async analyzeBlock(blockHeader) {
    try {
      const block = await this.web3.eth.getBlock(blockHeader.number, true);
      
      // 只有在有监控地址时才分析区块
      if (this.monitoredAddresses.size === 0) {
        return;
      }
      
      let relevantTransactions = 0;
      for (const tx of block.transactions) {
        if (this.shouldAnalyzeTransaction(tx)) {
          relevantTransactions++;
          this.transactionBuffer.push({
            ...tx,
            blockNumber: block.number,
            timestamp: block.timestamp
          });
        }
      }

      if (relevantTransactions > 0) {
        console.log(`区块 ${blockHeader.number} 中发现 ${relevantTransactions} 笔相关交易`);
        // 触发AI分析
        this.processTransactionBuffer();
      }
    } catch (error) {
      console.error('分析区块失败:', error);
    }
  }

  // 判断是否需要分析交易
  shouldAnalyzeTransaction(tx) {
    const fromAddress = tx.from?.toLowerCase();
    const toAddress = tx.to?.toLowerCase();
    
    // 必须指定监控地址才进行分析，避免监控所有链上交易
    if (this.monitoredAddresses.size === 0) {
      console.log('未指定监控地址，跳过交易分析以节省资源');
      return false;
    }
    
    // 只分析涉及监控地址的交易
    const shouldAnalyze = this.monitoredAddresses.has(fromAddress) || 
                         this.monitoredAddresses.has(toAddress);
    
    if (shouldAnalyze) {
      console.log(`发现监控地址相关交易: ${tx.hash} (from: ${fromAddress}, to: ${toAddress})`);
    }
    
    return shouldAnalyze;
  }

  // 处理交易缓冲区
  processTransactionBuffer() {
    const transactions = [...this.transactionBuffer];
    this.transactionBuffer = [];
    
    // 添加到分析队列
    this.analysisQueue.push(...transactions);
  }

  // AI分析引擎
  startAIAnalysis() {
    setInterval(() => {
      if (this.analysisQueue.length > 0) {
        this.performAIAnalysis();
      }
    }, 2000); // 每2秒分析一次，提高响应速度
  }

  // 执行AI分析
  async performAIAnalysis() {
    const transactions = this.analysisQueue.splice(0, 10); // 每次分析10笔交易
    
    for (const tx of transactions) {
      try {
        const riskAnalysis = await this.analyzeTransactionRisk(tx);
        
        if (riskAnalysis.riskLevel >= this.riskThresholds.medium) {
          this.emit('riskDetected', {
            transaction: tx,
            analysis: riskAnalysis,
            timestamp: Date.now()
          });
        }

        this.emit('transactionAnalyzed', {
          transaction: tx,
          analysis: riskAnalysis,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error('分析交易失败:', error);
      }
    }
  }

  // AI风险分析算法
  async analyzeTransactionRisk(tx) {
    const analysis = {
      transactionHash: tx.hash,
      riskLevel: 0,
      riskFactors: [],
      anomalies: [],
      recommendations: [],
      maliciousPatterns: [],
      timestamp: new Date(),
      blocked: false
    };

    // 1. 交易金额异常检测
    const valueRisk = this.analyzeTransactionValue(tx);
    analysis.riskLevel += valueRisk.score;
    if (valueRisk.isAnomalous) {
      analysis.anomalies.push(valueRisk.description);
    }

    // 2. Gas价格异常检测
    const gasRisk = this.analyzeGasPrice(tx);
    analysis.riskLevel += gasRisk.score;
    if (gasRisk.isAnomalous) {
      analysis.anomalies.push(gasRisk.description);
    }

    // 3. 地址行为分析
    const addressRisk = await this.analyzeAddressBehavior(tx);
    analysis.riskLevel += addressRisk.score;
    analysis.riskFactors.push(...addressRisk.factors);

    // 4. 合约交互分析
    if (tx.to && await this.isContract(tx.to)) {
      const contractRisk = await this.analyzeContractInteraction(tx);
      analysis.riskLevel += contractRisk.score;
      analysis.riskFactors.push(...contractRisk.factors);
    }

    // 5. 时间模式分析
    const timeRisk = this.analyzeTimePattern(tx);
    analysis.riskLevel += timeRisk.score;
    if (timeRisk.isAnomalous) {
      analysis.anomalies.push(timeRisk.description);
    }

    // 6. 高频交易检测
    const highFreqRisk = this.analyzeHighFrequencyPattern(tx);
    analysis.riskLevel += highFreqRisk.score;
    if (highFreqRisk.isAnomalous) {
      analysis.maliciousPatterns.push(highFreqRisk.pattern);
      analysis.anomalies.push(highFreqRisk.description);
    }

    // 7. 循环转账检测
    const circularRisk = this.analyzeCircularTransferPattern(tx);
    analysis.riskLevel += circularRisk.score;
    if (circularRisk.isAnomalous) {
      analysis.maliciousPatterns.push(circularRisk.pattern);
      analysis.anomalies.push(circularRisk.description);
    }

    // 8. 恶意模式综合评估
    const maliciousRisk = this.evaluateMaliciousPatterns(analysis);
    analysis.riskLevel += maliciousRisk.score;
    if (maliciousRisk.isBlocked) {
      analysis.blocked = true;
      analysis.blockReason = maliciousRisk.reason;
    }

    // 生成建议
    analysis.recommendations = this.generateRecommendations(analysis);

    // 限制风险等级在0-100之间
    analysis.riskLevel = Math.min(100, Math.max(0, analysis.riskLevel));

    // 记录高风险交易
    if (analysis.riskLevel >= this.riskThresholds.high) {
      console.log(`🚨 检测到高风险交易: ${tx.hash}`);
      console.log(`风险等级: ${analysis.riskLevel}`);
      console.log(`异常行为: ${analysis.anomalies.join(', ')}`);
      console.log(`恶意模式: ${analysis.maliciousPatterns.join(', ')}`);
      
      if (analysis.blocked) {
        console.log(`❌ 交易已被拦截: ${analysis.blockReason}`);
      }
    }

    // 保存分析结果到数据库
    try {
      await this.saveAnalysisResult(analysis);
    } catch (error) {
      console.error('保存分析结果失败:', error);
    }

    return analysis;
  }

  // 交易金额分析
  analyzeTransactionValue(tx) {
    const value = parseFloat(this.web3.utils.fromWei(tx.value.toString(), 'ether'));
    let score = 0;
    let isAnomalous = false;
    let description = '';

    if (value > 50) {  // 降低大额交易阈值，更容易检测到异常
      score += 40;
      isAnomalous = true;
      description = `异常大额交易: ${value} ETH (可能是资金盗取)`;
    } else if (value > 10) {
      score += 25;
      isAnomalous = true;
      description = `大额交易: ${value} ETH`;
    } else if (value > 1) {
      score += 10;
      description = `中等金额交易: ${value} ETH`;
    }

    return { score, isAnomalous, description };
  }

  // Gas价格分析
  analyzeGasPrice(tx) {
    const gasPrice = typeof tx.gasPrice === 'bigint' ? Number(tx.gasPrice) : parseInt(tx.gasPrice);
    const normalGasPrice = 20000000000; // 20 Gwei
    let score = 0;
    let isAnomalous = false;
    let description = '';

    if (gasPrice > normalGasPrice * 10) {  // 检测更高的Gas价格异常
      score += 35;
      isAnomalous = true;
      description = `极高Gas价格攻击: ${this.web3.utils.fromWei(gasPrice.toString(), 'gwei')} Gwei (可能是MEV攻击)`;
    } else if (gasPrice > normalGasPrice * 5) {
      score += 25;
      isAnomalous = true;
      description = `异常高Gas价格: ${this.web3.utils.fromWei(gasPrice.toString(), 'gwei')} Gwei`;
    } else if (gasPrice < normalGasPrice * 0.1) {
      score += 15;
      isAnomalous = true;
      description = `异常低Gas价格: ${this.web3.utils.fromWei(gasPrice.toString(), 'gwei')} Gwei`;
    }

    return { score, isAnomalous, description };
  }

  // 高频交易模式检测
  analyzeHighFrequencyPattern(tx) {
    const now = Date.now();
    const timeWindow = 60000; // 1分钟时间窗口
    const address = tx.from.toLowerCase();
    
    // 初始化地址交易历史
    if (!this.addressTransactionHistory) {
      this.addressTransactionHistory = new Map();
    }
    
    if (!this.addressTransactionHistory.has(address)) {
      this.addressTransactionHistory.set(address, []);
    }
    
    const history = this.addressTransactionHistory.get(address);
    
    // 清理过期记录
    const validHistory = history.filter(timestamp => now - timestamp < timeWindow);
    validHistory.push(now);
    this.addressTransactionHistory.set(address, validHistory);
    
    let score = 0;
    let isAnomalous = false;
    let pattern = '';
    let description = '';
    
    if (validHistory.length >= 5) {  // 1分钟内5笔以上交易
      score += 45;
      isAnomalous = true;
      pattern = '高频交易攻击';
      description = `检测到高频交易: ${validHistory.length}笔/分钟 (可能是DDoS攻击)`;
    } else if (validHistory.length >= 3) {
      score += 25;
      isAnomalous = true;
      pattern = '频繁交易';
      description = `频繁交易: ${validHistory.length}笔/分钟`;
    }
    
    return { score, isAnomalous, pattern, description };
  }

  // 循环转账模式检测
  analyzeCircularTransferPattern(tx) {
    const now = Date.now();
    const timeWindow = 300000; // 5分钟时间窗口
    
    // 初始化转账路径追踪
    if (!this.transferPaths) {
      this.transferPaths = [];
    }
    
    // 清理过期记录
    this.transferPaths = this.transferPaths.filter(path => now - path.timestamp < timeWindow);
    
    // 添加当前转账
    this.transferPaths.push({
      from: tx.from.toLowerCase(),
      to: tx.to ? tx.to.toLowerCase() : null,
      value: tx.value.toString(),
      timestamp: now,
      hash: tx.hash
    });
    
    let score = 0;
    let isAnomalous = false;
    let pattern = '';
    let description = '';
    
    // 检测循环转账模式
    const addresses = new Set();
    const paths = this.transferPaths.slice(-10); // 检查最近10笔交易
    
    for (const path of paths) {
      addresses.add(path.from);
      if (path.to) addresses.add(path.to);
    }
    
    // 检查是否存在A->B->C->A的循环模式
    if (addresses.size >= 3 && paths.length >= 3) {
      const addressArray = Array.from(addresses);
      let circularFound = false;
      
      for (let i = 0; i < addressArray.length; i++) {
        const addr = addressArray[i];
        const fromPaths = paths.filter(p => p.from === addr);
        const toPaths = paths.filter(p => p.to === addr);
        
        if (fromPaths.length > 0 && toPaths.length > 0) {
          circularFound = true;
          break;
        }
      }
      
      if (circularFound) {
        score += 50;
        isAnomalous = true;
        pattern = '循环转账洗钱';
        description = `检测到循环转账模式 (涉及${addresses.size}个地址，可能是洗钱行为)`;
      }
    }
    
    return { score, isAnomalous, pattern, description };
  }

  // 恶意模式综合评估
  evaluateMaliciousPatterns(analysis) {
    let score = 0;
    let isBlocked = false;
    let reason = '';
    
    // 检查是否包含多种恶意模式
    if (analysis.maliciousPatterns.length >= 2) {
      score += 30;
      reason = `检测到多种恶意模式: ${analysis.maliciousPatterns.join(', ')}`;
    }
    
    // 检查是否达到拦截阈值
    const totalRisk = analysis.riskLevel + score;
    if (totalRisk >= 90) {
      isBlocked = true;
      if (!reason) {
        reason = `风险等级过高 (${totalRisk}/100)，疑似恶意交易`;
      }
    }
    
    // 特定模式直接拦截
    if (analysis.maliciousPatterns.includes('循环转账洗钱')) {
      isBlocked = true;
      reason = '检测到洗钱行为，交易已被拦截';
    }
    
    return { score, isBlocked, reason };
     return { score, isBlocked, reason };
   }

  // 地址行为分析
  async analyzeAddressBehavior(tx) {
    const factors = [];
    let score = 0;

    // 检查是否是新地址
    const fromBalance = await this.web3.eth.getBalance(tx.from);
    const fromTxCount = await this.web3.eth.getTransactionCount(tx.from);

    if (fromTxCount < 5) {
      score += 15;
      factors.push('发送方为新地址');
    }

    if (tx.to) {
      const toTxCount = await this.web3.eth.getTransactionCount(tx.to);
      if (toTxCount < 5) {
        score += 10;
        factors.push('接收方为新地址');
      }
    }

    return { score, factors };
  }

  // 检查是否为合约地址
  async isContract(address) {
    try {
      const code = await this.web3.eth.getCode(address);
      return code !== '0x';
    } catch (error) {
      return false;
    }
  }

  // 合约交互分析
  async analyzeContractInteraction(tx) {
    const factors = [];
    let score = 0;

    factors.push('与智能合约交互');
    score += 10;

    // 分析输入数据
    if (tx.input && tx.input.length > 10) {
      const inputLength = tx.input.length;
      if (inputLength > 1000) {
        score += 15;
        factors.push('复杂合约调用');
      }
    }

    return { score, factors };
  }

  // 时间模式分析
  analyzeTimePattern(tx) {
    const timestamp = typeof tx.timestamp === 'bigint' ? Number(tx.timestamp) : tx.timestamp;
    const hour = new Date(timestamp * 1000).getHours();
    let score = 0;
    let isAnomalous = false;
    let description = '';

    // 深夜交易可能更可疑
    if (hour >= 2 && hour <= 5) {
      score += 10;
      isAnomalous = true;
      description = '深夜时段交易';
    }

    return { score, isAnomalous, description };
  }

  // 生成安全建议
  generateRecommendations(analysis) {
    const recommendations = [];

    if (analysis.riskLevel >= this.riskThresholds.high) {
      recommendations.push('建议立即停止相关操作并进行详细调查');
      recommendations.push('联系安全团队进行人工审核');
    } else if (analysis.riskLevel >= this.riskThresholds.medium) {
      recommendations.push('建议谨慎处理，增加额外验证步骤');
      recommendations.push('监控相关地址的后续活动');
    } else {
      recommendations.push('交易风险较低，可正常处理');
    }

    return recommendations;
  }

  // 添加监控地址
  addMonitoredAddress(address) {
    this.monitoredAddresses.add(address.toLowerCase());
    this.emit('addressAdded', { address, timestamp: Date.now() });
  }

  // 移除监控地址
  removeMonitoredAddress(address) {
    this.monitoredAddresses.delete(address.toLowerCase());
    this.emit('addressRemoved', { address, timestamp: Date.now() });
  }

  // 获取监控状态
  // 分析交易（新增方法）
  async analyzeTransaction(transactionData) {
    try {
      // 创建AI风险分析器实例
      const AIRiskAnalyzer = require('./aiRiskAnalyzer');
      const analyzer = new AIRiskAnalyzer(this.config);
      
      // 执行风险分析
      const analysisResult = await analyzer.analyzeTransaction(transactionData);
      
      return {
        success: true,
        analysis: analysisResult,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('交易分析失败:', error);
      throw error;
    }
  }

  // 通过交易哈希分析交易（新增方法）
  async analyzeTransactionByHash(transactionHash) {
    try {
      if (!this.web3) {
        await this.initialize();
      }
      
      // 获取交易详情
      const transaction = await this.web3.eth.getTransaction(transactionHash);
      if (!transaction) {
        throw new Error('交易不存在');
      }
      
      // 分析交易
      return await this.analyzeTransaction(transaction);
    } catch (error) {
      console.error('通过哈希分析交易失败:', error);
      throw error;
    }
  }

  getMonitoringStatus() {
    return {
      isMonitoring: this.isMonitoring,
      monitoredAddresses: Array.from(this.monitoredAddresses),
      transactionBufferSize: this.transactionBuffer.length,
      analysisQueueSize: this.analysisQueue.length,
      riskThresholds: this.riskThresholds
    };
  }

  // 保存分析结果到数据库
  async saveAnalysisResult(analysis) {
    try {
      // 确保数据库连接
      if (mongoose.connection.readyState !== 1) {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/Hark');
      }

      const db = mongoose.connection.db;
      const collection = db.collection('transaction_analysis');

      // 保存分析结果
      const result = await collection.insertOne({
        ...analysis,
        createdAt: new Date()
      });

      console.log(`✅ 分析结果已保存到数据库: ${analysis.transactionHash}`);
      
      // 如果是高风险交易，同时保存到预警集合
      if (analysis.riskLevel >= this.riskThresholds.high) {
        await this.saveSecurityAlert(analysis);
      }

      return result;
    } catch (error) {
      console.error('保存分析结果到数据库失败:', error);
      throw error;
    }
  }

  // 保存安全预警
  async saveSecurityAlert(analysis) {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('security_alerts');

      const alert = {
        transactionHash: analysis.transactionHash,
        type: 'high_risk_transaction',
        severity: analysis.riskLevel >= 75 ? 'critical' : 'high',
        description: `检测到高风险交易 (风险等级: ${analysis.riskLevel})`,
        anomalies: analysis.anomalies,
        maliciousPatterns: analysis.maliciousPatterns,
        blocked: analysis.blocked,
        blockReason: analysis.blockReason,
        timestamp: new Date(),
        status: 'active'
      };

      await collection.insertOne(alert);
      console.log(`🚨 安全预警已保存: ${analysis.transactionHash}`);
    } catch (error) {
      console.error('保存安全预警失败:', error);
    }
  }

  // 获取分析历史
  async getAnalysisHistory(page = 1, limit = 20, filters = {}) {
    try {
      if (mongoose.connection.readyState !== 1) {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/Hark');
      }

      const db = mongoose.connection.db;
      const collection = db.collection('transaction_analysis');

      const query = {};
      if (filters.riskLevel) {
        query.riskLevel = { $gte: parseInt(filters.riskLevel) };
      }
      if (filters.startTime && filters.endTime) {
        query.timestamp = {
          $gte: new Date(filters.startTime),
          $lte: new Date(filters.endTime)
        };
      }

      const skip = (page - 1) * limit;
      const results = await collection
        .find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      const total = await collection.countDocuments(query);

      return {
        results,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('获取分析历史失败:', error);
      throw error;
    }
  }

  // 获取实时数据
  async getRealtimeData() {
    try {
      console.log('开始获取实时数据...');
      
      if (mongoose.connection.readyState !== 1) {
        console.log('连接到MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/Hark');
      }

      const db = mongoose.connection.db;
      
      // 获取最近的分析结果
      console.log('查询最近的分析结果...');
      const recentAnalysis = await db.collection('transaction_analysis')
        .find({})
        .sort({ timestamp: -1 })
        .limit(10)
        .toArray();
      
      console.log(`找到 ${recentAnalysis.length} 条最近分析结果`);

      // 获取统计数据
      console.log('获取统计数据...');
      const stats = await this.getRiskStatistics();

      const result = {
        recentAnalysis,
        stats,
        monitoringStatus: this.getMonitoringStatus(),
        timestamp: new Date()
      };
      
      console.log('实时数据获取完成:', {
        recentAnalysisCount: recentAnalysis.length,
        stats,
        monitoringStatus: this.getMonitoringStatus()
      });

      return result;
    } catch (error) {
      console.error('获取实时数据失败:', error);
      throw error;
    }
  }

  // 获取风险统计
  async getRiskStatistics() {
    try {
      if (mongoose.connection.readyState !== 1) {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/Hark');
      }

      const db = mongoose.connection.db;
      const collection = db.collection('transaction_analysis');

      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const stats = await collection.aggregate([
        {
          $match: {
            timestamp: { $gte: oneDayAgo }
          }
        },
        {
          $group: {
            _id: null,
            totalTransactions: { $sum: 1 },
            highRiskTransactions: {
              $sum: { $cond: [{ $gte: ['$riskLevel', 25] }, 1, 0] }
            },
            blockedTransactions: {
              $sum: { $cond: ['$blocked', 1, 0] }
            },
            averageRiskLevel: { $avg: '$riskLevel' },
            maliciousPatternCount: {
              $sum: { $size: { $ifNull: ['$maliciousPatterns', []] } }
            }
          }
        }
      ]).toArray();

      return stats[0] || {
        totalTransactions: 0,
        highRiskTransactions: 0,
        blockedTransactions: 0,
        averageRiskLevel: 0,
        maliciousPatternCount: 0
      };
    } catch (error) {
      console.error('获取风险统计失败:', error);
      return {
        totalTransactions: 0,
        highRiskTransactions: 0,
        blockedTransactions: 0,
        averageRiskLevel: 0,
        maliciousPatternCount: 0
      };
    }
  }
}

module.exports = AIMonitoringService;