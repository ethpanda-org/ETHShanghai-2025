const { ethers } = require('ethers');
const qwenService = require('./qwenService');

class WalletMonitoringService {
  constructor() {
    this.providers = new Map();
    this.monitoredWallets = new Map();
    this.socketIO = null; // Socket.IO实例
    this.isMonitoring = false;
    
    // 初始化区块链提供者
    this.initializeProviders();
    
    // 监控数据
    this.monitoringData = {
      totalBalance: 0,
      totalChange24h: 0,
      wallets: [],
      transactions: [],
      alerts: []
    };
  }

  initializeProviders() {
    try {
      // 以太坊主网
      this.providers.set('ethereum', new ethers.JsonRpcProvider(
        process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com'
      ));
      
      // Holesky 测试网
      this.providers.set('holesky', new ethers.JsonRpcProvider(
        process.env.HOLESKY_RPC_URL || 'https://ethereum-holesky-rpc.publicnode.com'
      ));
      
      console.log('✅ 区块链提供者初始化完成');
    } catch (error) {
      console.error('❌ 初始化区块链提供者失败:', error);
    }
  }

  // 添加钱包监控
  async addWallet(walletData) {
    try {
      const { address, name, chain } = walletData;
      
      if (!ethers.isAddress(address)) {
        throw new Error('无效的钱包地址');
      }

      const provider = this.providers.get(chain);
      if (!provider) {
        throw new Error(`不支持的区块链网络: ${chain}`);
      }

      // 获取钱包余额
      const balance = await provider.getBalance(address);
      const balanceInEth = parseFloat(ethers.formatEther(balance));
      
      // 获取交易计数
      const transactionCount = await provider.getTransactionCount(address);
      
      const wallet = {
        id: Date.now().toString(),
        address,
        name,
        chain,
        balance: balanceInEth,
        balanceUSD: balanceInEth * 2000, // 假设ETH价格为2000USD
        change24h: 0, // 需要历史数据计算
        lastUpdate: new Date().toISOString(),
        status: 'active',
        transactionCount,
        tokens: []
      };

      this.monitoredWallets.set(address, wallet);
      this.updateMonitoringData();
      
      // 广播更新
      this.broadcastUpdate('walletAdded', wallet);
      
      console.log(`✅ 添加钱包监控: ${name} (${address})`);
      return wallet;
    } catch (error) {
      console.error('❌ 添加钱包失败:', error);
      throw error;
    }
  }

  // 移除钱包监控
  removeWallet(address) {
    if (this.monitoredWallets.has(address)) {
      this.monitoredWallets.delete(address);
      this.updateMonitoringData();
      this.broadcastUpdate('walletRemoved', { address });
      console.log(`✅ 移除钱包监控: ${address}`);
      return true;
    }
    return false;
  }

  // 获取钱包余额
  async getWalletBalance(address, chain) {
    try {
      const provider = this.providers.get(chain);
      if (!provider) {
        throw new Error(`不支持的区块链网络: ${chain}`);
      }

      const balance = await provider.getBalance(address);
      return parseFloat(ethers.formatEther(balance));
    } catch (error) {
      console.error(`❌ 获取钱包余额失败 ${address}:`, error);
      return 0;
    }
  }

  // 获取最近交易
  async getRecentTransactions(address, chain, limit = 10) {
    try {
      console.log(`🔍 开始获取交易历史: ${address} on ${chain}`);
      const provider = this.providers.get(chain);
      if (!provider) {
        console.log(`❌ 不支持的链: ${chain}`);
        return [];
      }

      const currentBlock = await provider.getBlockNumber();
      console.log(`📦 当前区块号: ${currentBlock}`);
      const transactions = [];
      
      // 查询最近的区块中的交易
      for (let i = 0; i < Math.min(limit * 2, 20); i++) { // 增加搜索范围
        try {
          const block = await provider.getBlock(currentBlock - i, true);
          if (block && block.transactions) {
            console.log(`🔍 检查区块 ${currentBlock - i}, 总交易数: ${block.transactions.length}`);
            
            // 遍历区块中的每个交易
            for (const txHash of block.transactions) {
              try {
                const tx = await provider.getTransaction(txHash);
                if (tx && (
                  tx.to?.toLowerCase() === address.toLowerCase() || 
                  tx.from?.toLowerCase() === address.toLowerCase()
                )) {
                  console.log(`✅ 找到相关交易: ${tx.hash}`);
                  
                  const receipt = await provider.getTransactionReceipt(tx.hash);
                  
                  // 简化风险分析，避免Qwen调用失败
                  let riskAnalysis = { riskLevel: 'low', details: '正常交易' };
                  try {
                    riskAnalysis = await this.analyzeTransactionWithQwen(tx);
                  } catch (qwenError) {
                    console.warn('Qwen分析失败，使用默认值:', qwenError.message);
                  }
                  
                  transactions.push({
                    id: tx.hash,
                    hash: tx.hash,
                    from: tx.from,
                    to: tx.to,
                    value: parseFloat(ethers.formatEther(tx.value || 0)),
                    gasUsed: receipt ? parseInt(receipt.gasUsed.toString()) : 0,
                    timestamp: new Date(block.timestamp * 1000).toISOString(),
                    status: receipt ? (receipt.status === 1 ? 'success' : 'failed') : 'pending',
                    type: tx.to?.toLowerCase() === address.toLowerCase() ? 'receive' : 'send',
                    riskLevel: riskAnalysis.riskLevel,
                    riskDetails: riskAnalysis.details
                  });
                  
                  if (transactions.length >= limit) {
                    break;
                  }
                }
              } catch (txError) {
                console.warn(`获取交易详情失败 ${txHash}:`, txError.message);
              }
            }
            
            if (transactions.length >= limit) {
              break;
            }
          }
        } catch (blockError) {
          console.warn(`获取区块 ${currentBlock - i} 失败:`, blockError.message);
        }
      }

      console.log(`📊 找到 ${transactions.length} 笔相关交易`);
      return transactions.slice(0, limit);
    } catch (error) {
      console.error(`❌ 获取交易历史失败 ${address}:`, error);
      return [];
    }
  }

  // 新方法：使用 Qwen 分析交易
  async analyzeTransactionWithQwen(tx) {
    try {
      // 检查 qwenService 是否可用
      if (!qwenService) {
        console.warn('Qwen服务不可用，使用默认风险分析');
        return { riskLevel: 'low', details: '正常交易（未进行AI分析）' };
      }

      const prompt = `分析以下交易的风险：
      - From: ${tx.from}
      - To: ${tx.to}
      - Value: ${ethers.formatEther(tx.value)} ETH
      - Hash: ${tx.hash}
      
      请评估风险水平 (low, medium, high) 并提供简要说明。`;
      
      const analysis = await qwenService.generateResponse(prompt);
      
      // 尝试解析JSON，如果失败则使用默认值
      try {
        return JSON.parse(analysis);
      } catch (parseError) {
        console.warn('Qwen响应解析失败，使用默认值');
        return { riskLevel: 'low', details: '正常交易' };
      }
    } catch (error) {
      console.warn('Qwen 分析失败:', error.message);
      return { riskLevel: 'low', details: '正常交易（AI分析失败）' };
    }
  }

  // 开始监控
  async startMonitoring() {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    console.log('🚀 开始钱包监控...');

    // 定期更新钱包数据
    this.monitoringInterval = setInterval(async () => {
      await this.updateAllWallets();
    }, 30000); // 每30秒更新一次

    // 立即执行一次更新
    await this.updateAllWallets();
    
    this.broadcastUpdate('monitoringStarted', { isMonitoring: true });
  }

  // 停止监控
  stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('⏹️ 钱包监控已停止');
    this.broadcastUpdate('monitoringStopped', { isMonitoring: false });
  }

  // 更新所有钱包数据
  async updateAllWallets() {
    if (!this.isMonitoring || this.monitoredWallets.size === 0) {
      return;
    }

    console.log(`🔄 更新 ${this.monitoredWallets.size} 个钱包数据...`);

    for (const [address, wallet] of this.monitoredWallets) {
      try {
        // 更新余额
        const newBalance = await this.getWalletBalance(address, wallet.chain);
        const oldBalance = wallet.balance;
        
        // 计算变化
        const change = newBalance - oldBalance;
        const changePercent = oldBalance > 0 ? (change / oldBalance) * 100 : 0;

        // 更新钱包数据
        wallet.balance = newBalance;
        wallet.balanceUSD = newBalance * 2000; // 假设ETH价格
        wallet.change24h = changePercent;
        wallet.lastUpdate = new Date().toISOString();

        // 如果余额有显著变化，创建提醒
        if (Math.abs(change) > 0.01) { // 变化超过0.01 ETH
          const alert = {
            id: Date.now().toString(),
            type: change > 0 ? 'balance_increase' : 'balance_decrease',
            message: `钱包 ${wallet.name} 余额${change > 0 ? '增加' : '减少'} ${Math.abs(change).toFixed(4)} ETH`,
            timestamp: new Date().toISOString(),
            walletAddress: address,
            isRead: false
          };
          
          this.monitoringData.alerts.unshift(alert);
          this.broadcastUpdate('newAlert', alert);
        }

        // 获取最近交易
        const recentTransactions = await this.getRecentTransactions(address, wallet.chain, 5);
        if (recentTransactions.length > 0) {
          // 检查是否有新交易
          const existingHashes = this.monitoringData.transactions.map(tx => tx.hash);
          const newTransactions = recentTransactions.filter(tx => !existingHashes.includes(tx.hash));
          
          if (newTransactions.length > 0) {
            this.monitoringData.transactions = [
              ...newTransactions,
              ...this.monitoringData.transactions
            ].slice(0, 50); // 保留最近50笔交易
            
            // 广播新交易
            newTransactions.forEach(tx => {
              this.broadcastUpdate('newTransaction', tx);
            });
          }
        }

      } catch (error) {
        console.error(`❌ 更新钱包 ${address} 失败:`, error);
        wallet.status = 'error';
        wallet.lastUpdate = new Date().toISOString();
      }
    }

    this.updateMonitoringData();
    this.broadcastUpdate('walletsUpdated', this.getMonitoringData());
  }

  // 更新监控数据统计
  updateMonitoringData() {
    const wallets = Array.from(this.monitoredWallets.values());
    
    this.monitoringData.wallets = wallets;
    this.monitoringData.totalBalance = wallets.reduce((sum, wallet) => sum + (wallet.balanceUSD || 0), 0);
    this.monitoringData.totalChange24h = wallets.length > 0 
      ? wallets.reduce((sum, wallet) => sum + (wallet.change24h || 0), 0) / wallets.length 
      : 0;
  }

  // 获取监控数据
  getMonitoringData() {
    return {
      ...this.monitoringData,
      isMonitoring: this.isMonitoring,
      walletCount: this.monitoredWallets.size,
      lastUpdate: new Date().toISOString()
    };
  }

  // Socket.IO 设置
  setSocketIO(io) {
    this.socketIO = io;
    console.log('✅ 钱包监控服务已连接到Socket.IO');
  }

  // 广播更新
  broadcastUpdate(type, data) {
    if (this.socketIO) {
      this.socketIO.emit('wallet-monitoring:update', {
        type,
        data,
        timestamp: new Date().toISOString()
      });
    }
  }

  // 获取支持的区块链网络
  getSupportedChains() {
    return [
      { value: 'ethereum', label: 'Ethereum', icon: '⟠', color: '#627eea' },
      { value: 'holesky', label: 'Holesky Testnet', icon: '🧪', color: '#f3ba2f' }
    ];
  }
}

module.exports = WalletMonitoringService;