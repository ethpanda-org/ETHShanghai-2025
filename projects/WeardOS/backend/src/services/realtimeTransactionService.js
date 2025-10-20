const { ethers } = require('ethers');
const qwenService = require('./qwenService');

class RealtimeTransactionService {
  constructor() {
    this.providers = new Map();
    this.monitoredAddresses = new Set();
    this.socketIO = null; // Socket.IO实例
    this.blockListeners = new Map();
    this.isListening = false;
    this.recentTransactions = [];
    this.maxTransactions = 100; // 保留最近100笔交易
    
    // 初始化区块链提供者
    this.initializeProviders();
  }

  initializeProviders() {
    try {
      // 以太坊主网
      const ethereumProvider = new ethers.JsonRpcProvider(
        process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com'
      );
      this.providers.set('ethereum', ethereumProvider);
      
      // Holesky 测试网
      const holeskyProvider = new ethers.JsonRpcProvider(
        process.env.HOLESKY_RPC_URL || 'https://ethereum-holesky-rpc.publicnode.com'
      );
      this.providers.set('holesky', holeskyProvider);
      
      console.log('✅ 实时交易监听服务 - 区块链提供者初始化完成');
    } catch (error) {
      console.error('❌ 实时交易监听服务 - 初始化区块链提供者失败:', error);
    }
  }

  // 添加监控地址
  addMonitoredAddress(address) {
    if (!ethers.isAddress(address)) {
      throw new Error('无效的钱包地址');
    }
    
    const normalizedAddress = address.toLowerCase();
    this.monitoredAddresses.add(normalizedAddress);
    console.log(`📍 添加监控地址: ${address}`);
    
    // 如果监听已启动，重新设置监听器
    if (this.isListening) {
      this.setupBlockListeners();
    }
  }

  // 移除监控地址
  removeMonitoredAddress(address) {
    const normalizedAddress = address.toLowerCase();
    this.monitoredAddresses.delete(normalizedAddress);
    console.log(`🗑️ 移除监控地址: ${address}`);
  }

  // 启动实时监听
  async startListening() {
    if (this.isListening) {
      console.log('⚠️ 实时交易监听已在运行中');
      return;
    }

    try {
      this.isListening = true;
      await this.setupBlockListeners();
      console.log('🎯 实时交易监听已启动');
      
      // 广播监听状态
      this.broadcastUpdate('listeningStarted', { 
        isListening: true, 
        monitoredAddresses: Array.from(this.monitoredAddresses) 
      });
    } catch (error) {
      console.error('❌ 启动实时交易监听失败:', error);
      this.isListening = false;
      throw error;
    }
  }

  // 停止实时监听
  async stopListening() {
    if (!this.isListening) {
      console.log('⚠️ 实时交易监听未在运行');
      return;
    }

    try {
      // 移除所有区块监听器
      for (const [chain, provider] of this.providers) {
        provider.removeAllListeners('block');
        console.log(`🔇 已停止 ${chain} 网络的区块监听`);
      }
      
      this.blockListeners.clear();
      this.isListening = false;
      console.log('⏹️ 实时交易监听已停止');
      
      // 广播监听状态
      this.broadcastUpdate('listeningStopped', { isListening: false });
    } catch (error) {
      console.error('❌ 停止实时交易监听失败:', error);
      throw error;
    }
  }

  // 设置区块监听器
  async setupBlockListeners() {
    // 清除现有监听器
    for (const [chain, provider] of this.providers) {
      provider.removeAllListeners('block');
    }
    this.blockListeners.clear();

    // 为每个网络设置新的监听器
    for (const [chain, provider] of this.providers) {
      try {
        const blockListener = async (blockNumber) => {
          await this.handleNewBlock(chain, provider, blockNumber);
        };
        
        provider.on('block', blockListener);
        this.blockListeners.set(chain, blockListener);
        
        console.log(`🔊 已设置 ${chain} 网络的区块监听器`);
      } catch (error) {
        console.error(`❌ 设置 ${chain} 网络监听器失败:`, error);
      }
    }
  }

  // 处理新区块
  async handleNewBlock(chain, provider, blockNumber) {
    try {
      console.log(`📦 新区块 ${chain}:${blockNumber}`);
      
      // 获取区块详情（包含交易）
      const block = await provider.getBlock(blockNumber, true);
      if (!block || !block.transactions || block.transactions.length === 0) {
        return;
      }

      console.log(`🔍 检查区块 ${blockNumber} 中的 ${block.transactions.length} 笔交易`);

      // 检查区块中的每笔交易
      for (const txHash of block.transactions) {
        try {
          const tx = await provider.getTransaction(txHash);
          if (tx && this.isRelevantTransaction(tx)) {
            await this.processRelevantTransaction(chain, tx, block);
          }
        } catch (txError) {
          console.warn(`处理交易 ${txHash} 失败:`, txError.message);
        }
      }
    } catch (error) {
      console.error(`处理新区块 ${chain}:${blockNumber} 失败:`, error);
    }
  }

  // 检查交易是否与监控地址相关
  isRelevantTransaction(tx) {
    if (!tx.from && !tx.to) return false;
    
    const fromAddress = tx.from?.toLowerCase();
    const toAddress = tx.to?.toLowerCase();
    
    return this.monitoredAddresses.has(fromAddress) || 
           this.monitoredAddresses.has(toAddress);
  }

  // 处理相关交易
  async processRelevantTransaction(chain, tx, block) {
    try {
      console.log(`✅ 发现相关交易: ${tx.hash}`);
      
      // 获取交易收据
      const receipt = await tx.provider.getTransactionReceipt(tx.hash);
      
      // 构建交易数据
      const transactionData = {
        id: tx.hash,
        hash: tx.hash,
        blockNumber: tx.blockNumber || block.number,
        from: tx.from,
        to: tx.to || 'Contract Creation',
        value: parseFloat(ethers.formatEther(tx.value || 0)),
        gasUsed: receipt ? receipt.gasUsed.toString() : '0',
        gasPrice: tx.gasPrice ? parseFloat(ethers.formatUnits(tx.gasPrice, 'gwei')) : 0,
        timestamp: block.timestamp * 1000,
        status: receipt ? (receipt.status === 1 ? 'success' : 'failed') : 'pending',
        chain: chain,
        type: this.getTransactionType(tx),
        token: 'ETH',
        amount: parseFloat(ethers.formatEther(tx.value || 0)),
        riskLevel: 'pending', // 将通过AI分析确定
        riskDetails: '正在分析...'
      };

      // 添加到最近交易列表
      this.addToRecentTransactions(transactionData);

      // 立即广播新交易（不等待AI分析）
      this.broadcastUpdate('newTransaction', transactionData);

      // 异步进行AI风险分析
      this.analyzeTransactionRisk(transactionData);

    } catch (error) {
      console.error(`处理交易 ${tx.hash} 失败:`, error);
    }
  }

  // 确定交易类型
  getTransactionType(tx) {
    // 检查是否为监控地址的接收或发送
    for (const address of this.monitoredAddresses) {
      if (tx.to?.toLowerCase() === address) {
        return 'receive';
      }
      if (tx.from?.toLowerCase() === address) {
        return 'send';
      }
    }
    return 'unknown';
  }

  // 添加到最近交易列表
  addToRecentTransactions(transaction) {
    // 检查是否已存在
    const existingIndex = this.recentTransactions.findIndex(tx => tx.hash === transaction.hash);
    if (existingIndex !== -1) {
      // 更新现有交易
      this.recentTransactions[existingIndex] = transaction;
    } else {
      // 添加新交易到开头
      this.recentTransactions.unshift(transaction);
      
      // 保持最大数量限制
      if (this.recentTransactions.length > this.maxTransactions) {
        this.recentTransactions = this.recentTransactions.slice(0, this.maxTransactions);
      }
    }
  }

  // AI风险分析
  async analyzeTransactionRisk(transaction) {
    try {
      console.log(`🤖 开始AI风险分析: ${transaction.hash}`);
      
      const analysisResult = await qwenService.analyzeTransactionRisk({
        hash: transaction.hash,
        from: transaction.from,
        to: transaction.to,
        value: transaction.value,
        gasPrice: transaction.gasPrice,
        chain: transaction.chain
      });

      if (analysisResult && analysisResult.riskLevel) {
        // 更新交易的风险信息
        const updatedTransaction = {
          ...transaction,
          riskLevel: analysisResult.riskLevel,
          riskDetails: analysisResult.riskDetails || analysisResult.analysis,
          aiAnalysis: analysisResult
        };

        // 更新最近交易列表中的数据
        const index = this.recentTransactions.findIndex(tx => tx.hash === transaction.hash);
        if (index !== -1) {
          this.recentTransactions[index] = updatedTransaction;
        }

        // 广播更新的交易数据
        this.broadcastUpdate('transactionAnalyzed', updatedTransaction);

        console.log(`✅ AI风险分析完成: ${transaction.hash} - ${analysisResult.riskLevel}`);
      }
    } catch (error) {
      console.error(`❌ AI风险分析失败 ${transaction.hash}:`, error);
      
      // 分析失败时设置默认值
      const fallbackTransaction = {
        ...transaction,
        riskLevel: 'low',
        riskDetails: '风险分析暂不可用，默认为低风险'
      };
      
      const index = this.recentTransactions.findIndex(tx => tx.hash === transaction.hash);
      if (index !== -1) {
        this.recentTransactions[index] = fallbackTransaction;
      }
      
      this.broadcastUpdate('transactionAnalyzed', fallbackTransaction);
    }
  }

  // 获取最近交易
  getRecentTransactions(limit = 10) {
    return this.recentTransactions.slice(0, limit);
  }

  // Socket.IO 设置
  setSocketIO(io) {
    this.socketIO = io;
    console.log('✅ 实时交易监听服务已连接到Socket.IO');
  }

  // 广播更新
  broadcastUpdate(type, data) {
    if (this.socketIO) {
      this.socketIO.emit('realtime-transaction:update', {
        type,
        data,
        timestamp: new Date().toISOString()
      });
      console.log(`📡 广播更新: ${type} 通过Socket.IO`);
    }
  }

  // 获取服务状态
  getStatus() {
    return {
      isListening: this.isListening,
      monitoredAddresses: Array.from(this.monitoredAddresses),
      recentTransactionsCount: this.recentTransactions.length,
      supportedChains: Array.from(this.providers.keys())
    };
  }
}

module.exports = RealtimeTransactionService;