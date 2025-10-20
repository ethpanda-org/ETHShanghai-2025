const { Web3 } = require('web3');
const EventEmitter = require('events');

class BlockchainDataService extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.web3 = null;
    this.isConnected = false;
    this.subscriptions = new Map();
    this.dataCache = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  // 初始化连接
  async initialize() {
    try {
      this.web3 = new Web3(this.config.blockchain.url);
      
      // 测试连接
      await this.testConnection();
      
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      console.log(`已连接到Holesky测试网: ${this.config.blockchain.url}`);
      this.emit('connected', { url: this.config.blockchain.url });
      
      return true;
    } catch (error) {
      console.error('连接Holesky测试网失败:', error);
      this.isConnected = false;
      throw error;
    }
  }

  // 测试连接
  async testConnection() {
    const isListening = await this.web3.eth.net.isListening();
    if (!isListening) {
      throw new Error('Holesky测试网节点未响应');
    }

    const networkId = await this.web3.eth.net.getId();
    const chainId = await this.web3.eth.getChainId();
    
    console.log(`网络ID: ${networkId}, 链ID: ${chainId}`);
    
    return { networkId, chainId, isListening };
  }

  // 获取最新区块信息
  async getLatestBlock(includeTransactions = false) {
    try {
      const block = await this.web3.eth.getBlock('latest', includeTransactions);
      return {
        number: block.number,
        hash: block.hash,
        timestamp: block.timestamp,
        transactionCount: block.transactions.length,
        gasUsed: block.gasUsed,
        gasLimit: block.gasLimit,
        transactions: includeTransactions ? block.transactions : []
      };
    } catch (error) {
      console.error('获取最新区块失败:', error);
      throw error;
    }
  }

  // 获取指定区块
  async getBlock(blockNumber, includeTransactions = false) {
    try {
      const cacheKey = `block_${blockNumber}_${includeTransactions}`;
      
      // 检查缓存
      if (this.dataCache.has(cacheKey)) {
        return this.dataCache.get(cacheKey);
      }

      const block = await this.web3.eth.getBlock(blockNumber, includeTransactions);
      
      // 缓存结果
      this.dataCache.set(cacheKey, block);
      
      return block;
    } catch (error) {
      console.error(`获取区块 ${blockNumber} 失败:`, error);
      throw error;
    }
  }

  // 获取交易详情
  async getTransaction(txHash) {
    try {
      const cacheKey = `tx_${txHash}`;
      
      if (this.dataCache.has(cacheKey)) {
        return this.dataCache.get(cacheKey);
      }

      const [transaction, receipt] = await Promise.all([
        this.web3.eth.getTransaction(txHash),
        this.web3.eth.getTransactionReceipt(txHash)
      ]);

      const result = {
        ...transaction,
        receipt: receipt,
        status: receipt ? receipt.status : null,
        gasUsed: receipt ? receipt.gasUsed : null,
        logs: receipt ? receipt.logs : []
      };

      this.dataCache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error(`获取交易 ${txHash} 失败:`, error);
      throw error;
    }
  }

  // 获取地址信息
  async getAddressInfo(address) {
    try {
      const [balance, transactionCount, code] = await Promise.all([
        this.web3.eth.getBalance(address),
        this.web3.eth.getTransactionCount(address),
        this.web3.eth.getCode(address)
      ]);

      return {
        address: address,
        balance: balance,
        balanceEth: this.web3.utils.fromWei(balance, 'ether'),
        transactionCount: transactionCount,
        isContract: code !== '0x',
        code: code
      };
    } catch (error) {
      console.error(`获取地址信息失败 ${address}:`, error);
      throw error;
    }
  }

  // 获取地址交易历史
  async getAddressTransactions(address, fromBlock = 0, toBlock = 'latest', limit = 100) {
    try {
      const transactions = [];
      const latestBlock = await this.web3.eth.getBlockNumber();
      const startBlock = fromBlock === 0 ? Math.max(0, latestBlock - 1000) : fromBlock;
      const endBlock = toBlock === 'latest' ? latestBlock : toBlock;

      // 分批获取区块以避免超时
      const batchSize = 100;
      for (let i = startBlock; i <= endBlock && transactions.length < limit; i += batchSize) {
        const batchEnd = Math.min(i + batchSize - 1, endBlock);
        const batchTxs = await this.getTransactionsInRange(address, i, batchEnd);
        transactions.push(...batchTxs);
      }

      return transactions.slice(0, limit);
    } catch (error) {
      console.error(`获取地址交易历史失败 ${address}:`, error);
      throw error;
    }
  }

  // 获取指定区块范围内的交易
  async getTransactionsInRange(address, fromBlock, toBlock) {
    const transactions = [];
    const targetAddress = address.toLowerCase();

    for (let blockNum = fromBlock; blockNum <= toBlock; blockNum++) {
      try {
        const block = await this.getBlock(blockNum, true);
        
        for (const tx of block.transactions) {
          if (tx.from.toLowerCase() === targetAddress || 
              (tx.to && tx.to.toLowerCase() === targetAddress)) {
            transactions.push({
              ...tx,
              blockNumber: block.number,
              blockTimestamp: block.timestamp
            });
          }
        }
      } catch (error) {
        console.error(`获取区块 ${blockNum} 交易失败:`, error);
      }
    }

    return transactions;
  }

  // 订阅新区块
  subscribeToNewBlocks(callback) {
    if (!this.isConnected) {
      throw new Error('未连接到区块链');
    }

    const subscription = this.web3.eth.subscribe('newBlockHeaders')
      .on('data', async (blockHeader) => {
        try {
          const block = await this.getBlock(blockHeader.number, true);
          callback(null, block);
        } catch (error) {
          callback(error, null);
        }
      })
      .on('error', (error) => {
        console.error('区块订阅错误:', error);
        callback(error, null);
        this.handleConnectionError(error);
      });

    const subscriptionId = Date.now().toString();
    this.subscriptions.set(subscriptionId, subscription);
    
    return subscriptionId;
  }

  // 订阅待处理交易
  subscribeToPendingTransactions(callback) {
    if (!this.isConnected) {
      throw new Error('未连接到区块链');
    }

    const subscription = this.web3.eth.subscribe('pendingTransactions')
      .on('data', async (txHash) => {
        try {
          const transaction = await this.getTransaction(txHash);
          callback(null, transaction);
        } catch (error) {
          // 待处理交易可能很快被确认，忽略获取失败的情况
          if (!error.message.includes('not found')) {
            callback(error, null);
          }
        }
      })
      .on('error', (error) => {
        console.error('待处理交易订阅错误:', error);
        callback(error, null);
        this.handleConnectionError(error);
      });

    const subscriptionId = Date.now().toString();
    this.subscriptions.set(subscriptionId, subscription);
    
    return subscriptionId;
  }

  // 取消订阅
  unsubscribe(subscriptionId) {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(subscriptionId);
      return true;
    }
    return false;
  }

  // 取消所有订阅
  unsubscribeAll() {
    for (const [id, subscription] of this.subscriptions) {
      subscription.unsubscribe();
    }
    this.subscriptions.clear();
  }

  // 处理连接错误
  async handleConnectionError(error) {
    console.error('连接错误:', error);
    this.isConnected = false;
    this.emit('disconnected', { error: error.message });

    // 尝试重连
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(async () => {
        try {
          await this.initialize();
          this.emit('reconnected');
        } catch (reconnectError) {
          console.error('重连失败:', reconnectError);
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.emit('reconnectFailed');
          }
        }
      }, 5000 * this.reconnectAttempts); // 递增延迟
    }
  }

  // 获取网络统计信息
  async getNetworkStats() {
    try {
      const [
        latestBlock,
        gasPrice,
        peerCount,
        isSyncing
      ] = await Promise.all([
        this.web3.eth.getBlockNumber(),
        this.web3.eth.getGasPrice(),
        this.web3.eth.net.getPeerCount(),
        this.web3.eth.isSyncing()
      ]);

      return {
        latestBlock,
        gasPrice,
        gasPriceGwei: this.web3.utils.fromWei(gasPrice, 'gwei'),
        peerCount,
        isSyncing,
        isConnected: this.isConnected
      };
    } catch (error) {
      console.error('获取网络统计失败:', error);
      throw error;
    }
  }

  // 清理缓存
  clearCache() {
    this.dataCache.clear();
    console.log('数据缓存已清理');
  }

  // 获取缓存统计
  getCacheStats() {
    return {
      size: this.dataCache.size,
      keys: Array.from(this.dataCache.keys())
    };
  }

  // 断开连接
  disconnect() {
    this.unsubscribeAll();
    this.clearCache();
    this.isConnected = false;
    this.web3 = null;
    console.log('已断开区块链连接');
  }
}

module.exports = BlockchainDataService;