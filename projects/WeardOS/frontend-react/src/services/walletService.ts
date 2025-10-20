// walletService.ts - 钱包监控服务
import { ethers } from 'ethers';

export interface ChainConfig {
  chainId: number;
  name: string;
  symbol: string;
  rpcUrl: string;
  explorerUrl: string;
  icon: string;
  color: string;
}

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
  value: number;
  change24h: number;
  icon?: string;
}

export interface WalletBalance {
  address: string;
  chain: string;
  nativeBalance: string;
  nativeValue: number;
  tokens: TokenInfo[];
  totalValue: number;
  change24h: number;
  lastUpdate: string;
}

export interface Transaction {
  hash: string;
  blockNumber: number;
  from: string;
  to: string;
  value: string;
  gasUsed: string;
  gasPrice: string;
  timestamp: number;
  status: 'success' | 'failed' | 'pending';
  type: 'send' | 'receive' | 'contract';
  tokenTransfers?: TokenTransfer[];
}

export interface TokenTransfer {
  token: string;
  from: string;
  to: string;
  value: string;
  symbol: string;
  decimals: number;
}

// 支持的区块链配置
export const SUPPORTED_CHAINS: Record<string, ChainConfig> = {
  ethereum: {
    chainId: 1,
    name: 'Ethereum',
    symbol: 'ETH',
    rpcUrl: 'https://eth.llamarpc.com',
    explorerUrl: 'https://etherscan.io',
    icon: '⟠',
    color: '#627eea'
  },
  bsc: {
    chainId: 56,
    name: 'BNB Smart Chain',
    symbol: 'BNB',
    rpcUrl: 'https://bsc-dataseed1.binance.org',
    explorerUrl: 'https://bscscan.com',
    icon: '🟡',
    color: '#f3ba2f'
  },
  polygon: {
    chainId: 137,
    name: 'Polygon',
    symbol: 'MATIC',
    rpcUrl: 'https://polygon-rpc.com',
    explorerUrl: 'https://polygonscan.com',
    icon: '🟣',
    color: '#8247e5'
  },
  holesky: {
    chainId: 17000,
    name: 'Holesky Testnet',
    symbol: 'ETH',
    rpcUrl: 'https://ethereum-holesky-rpc.publicnode.com',
    explorerUrl: 'https://holesky.etherscan.io',
    icon: '🧪',
    color: '#ffa500'
  },
  arbitrum: {
    chainId: 42161,
    name: 'Arbitrum One',
    symbol: 'ETH',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    explorerUrl: 'https://arbiscan.io',
    icon: '🔵',
    color: '#28a0f0'
  },
  optimism: {
    chainId: 10,
    name: 'Optimism',
    symbol: 'ETH',
    rpcUrl: 'https://mainnet.optimism.io',
    explorerUrl: 'https://optimistic.etherscan.io',
    icon: '🔴',
    color: '#ff0420'
  }
};

// 常用代币合约地址
export const TOKEN_CONTRACTS: Record<string, Record<string, string>> = {
  ethereum: {
    USDC: '0xA0b86a33E6441E6C7D3E4C2C4C4C4C4C4C4C4C4C',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    UNI: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
  },
  bsc: {
    USDT: '0x55d398326f99059fF775485246999027B3197955',
    BUSD: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    CAKE: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82',
    WBNB: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'
  },
  polygon: {
    USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    WMATIC: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
    WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619'
  }
};

class WalletService {
  private providers: Record<string, ethers.JsonRpcProvider> = {};
  private monitoringIntervals: Record<string, NodeJS.Timeout> = {};
  private subscribers: Record<string, ((data: WalletBalance) => void)[]> = {};

  constructor() {
    this.initializeProviders();
  }

  // 初始化区块链提供者
  private initializeProviders() {
    Object.entries(SUPPORTED_CHAINS).forEach(([chainKey, config]) => {
      try {
        this.providers[chainKey] = new ethers.JsonRpcProvider(config.rpcUrl);
      } catch (error) {
        console.error(`Failed to initialize provider for ${chainKey}:`, error);
      }
    });
  }

  // 获取钱包余额
  async getWalletBalance(address: string, chain: string): Promise<WalletBalance> {
    const provider = this.providers[chain];
    if (!provider) {
      throw new Error(`Unsupported chain: ${chain}`);
    }

    const chainConfig = SUPPORTED_CHAINS[chain];
    
    try {
      // 获取原生代币余额
      const nativeBalance = await provider.getBalance(address);
      const nativeBalanceFormatted = ethers.formatEther(nativeBalance);
      
      // 模拟价格获取（实际应用中应该调用价格API）
      const nativePrice = await this.getTokenPrice(chainConfig.symbol);
      const nativeValue = parseFloat(nativeBalanceFormatted) * nativePrice;

      // 获取代币余额
      const tokens = await this.getTokenBalances(address, chain);
      
      // 计算总价值
      const totalTokenValue = tokens.reduce((sum, token) => sum + token.value, 0);
      const totalValue = nativeValue + totalTokenValue;

      // 模拟24小时变化
      const change24h = (Math.random() - 0.5) * 10; // -5% to +5%

      return {
        address,
        chain,
        nativeBalance: nativeBalanceFormatted,
        nativeValue,
        tokens,
        totalValue,
        change24h,
        lastUpdate: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error fetching wallet balance for ${address} on ${chain}:`, error);
      throw error;
    }
  }

  // 获取代币余额
  private async getTokenBalances(address: string, chain: string): Promise<TokenInfo[]> {
    const provider = this.providers[chain];
    const tokenContracts = TOKEN_CONTRACTS[chain] || {};
    const tokens: TokenInfo[] = [];

    // ERC-20 ABI (简化版)
    const erc20Abi = [
      'function balanceOf(address owner) view returns (uint256)',
      'function decimals() view returns (uint8)',
      'function symbol() view returns (string)',
      'function name() view returns (string)'
    ];

    for (const [symbol, contractAddress] of Object.entries(tokenContracts)) {
      try {
        const contract = new ethers.Contract(contractAddress, erc20Abi, provider);
        
        const [balance, decimals, name] = await Promise.all([
          contract.balanceOf(address),
          contract.decimals(),
          contract.name()
        ]);

        if (balance > 0) {
          const balanceFormatted = ethers.formatUnits(balance, decimals);
          const price = await this.getTokenPrice(symbol);
          const value = parseFloat(balanceFormatted) * price;
          const change24h = (Math.random() - 0.5) * 20; // -10% to +10%

          tokens.push({
            address: contractAddress,
            symbol,
            name,
            decimals,
            balance: balanceFormatted,
            value,
            change24h,
            icon: this.getTokenIcon(symbol)
          });
        }
      } catch (error) {
        console.error(`Error fetching ${symbol} balance:`, error);
      }
    }

    return tokens;
  }

  // 获取代币价格（模拟）
  private async getTokenPrice(symbol: string): Promise<number> {
    // 模拟价格数据（实际应用中应该调用CoinGecko或其他价格API）
    const mockPrices: Record<string, number> = {
      ETH: 1500,
      BNB: 250,
      MATIC: 0.8,
      USDC: 1,
      USDT: 1,
      BUSD: 1,
      UNI: 6.5,
      CAKE: 2.5,
      WETH: 1500,
      WBNB: 250,
      WMATIC: 0.8
    };

    return mockPrices[symbol] || 0;
  }

  // 获取代币图标
  private getTokenIcon(symbol: string): string {
    const icons: Record<string, string> = {
      ETH: '⟠',
      BNB: '🟡',
      MATIC: '🟣',
      USDC: '💵',
      USDT: '💰',
      BUSD: '💰',
      UNI: '🦄',
      CAKE: '🥞',
      WETH: '⟠',
      WBNB: '🟡',
      WMATIC: '🟣'
    };

    return icons[symbol] || '🪙';
  }

  // 获取交易历史
  async getTransactionHistory(address: string, chain: string, limit: number = 10): Promise<Transaction[]> {
    const provider = this.providers[chain];
    if (!provider) {
      throw new Error(`Unsupported chain: ${chain}`);
    }

    try {
      // 获取最新区块号
      const latestBlock = await provider.getBlockNumber();
      const transactions: Transaction[] = [];

      // 查询最近的区块中的交易
      for (let i = 0; i < 100; i++) { // 增加区块扫描深度
        try {
          const block = await provider.getBlock(latestBlock - i, true);
          if (block && block.transactions) {
            for (const txOrHash of block.transactions) {
              if (transactions.length >= limit) break;

              let txData: ethers.TransactionResponse | null = null;

              try {
                if (typeof txOrHash === 'string') {
                  txData = await provider.getTransaction(txOrHash);
                } else {
                  txData = txOrHash;
                }

                if (!txData) {
                  continue;
                }
                
                const isRelevant = txData.to?.toLowerCase() === address.toLowerCase() ||
                                   txData.from.toLowerCase() === address.toLowerCase();

                if (!isRelevant) {
                  continue;
                }

                const receipt = await provider.getTransactionReceipt(txData.hash);
                const realTx: Transaction = {
                  hash: txData.hash,
                  blockNumber: txData.blockNumber || block.number,
                  from: txData.from,
                  to: txData.to || 'Contract Creation',
                  value: parseFloat(ethers.formatEther(txData.value || 0)).toFixed(6),
                  gasUsed: receipt ? receipt.gasUsed.toString() : '0',
                  gasPrice: txData.gasPrice ? parseFloat(ethers.formatUnits(txData.gasPrice, 'gwei')).toFixed(2) : '0',
                  timestamp: block.timestamp * 1000,
                  status: receipt ? (receipt.status === 1 ? 'success' : 'failed') : 'pending',
                  type: txData.to?.toLowerCase() === address.toLowerCase() ? 'receive' : 'send'
                };

                transactions.push(realTx);
              } catch (txError) {
                console.warn(`处理交易失败:`, txError);
              }
            }
          }
        } catch (blockError) {
          console.warn(`获取区块 ${latestBlock - i} 失败:`, blockError);
        }
        
        if (transactions.length >= limit) break;
      }

      return transactions.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error(`Error fetching transaction history for ${address} on ${chain}:`, error);
      throw error;
    }
  }

  // 开始监控钱包
  startMonitoring(address: string, chain: string, interval: number = 30000) {
    const key = `${address}-${chain}`;
    
    // 清除现有监控
    if (this.monitoringIntervals[key]) {
      clearInterval(this.monitoringIntervals[key]);
    }

    // 立即获取一次数据
    this.getWalletBalance(address, chain).then(balance => {
      this.notifySubscribers(key, balance);
    });

    // 设置定期监控
    this.monitoringIntervals[key] = setInterval(async () => {
      try {
        const balance = await this.getWalletBalance(address, chain);
        this.notifySubscribers(key, balance);
      } catch (error) {
        console.error(`Monitoring error for ${key}:`, error);
      }
    }, interval);
  }

  // 停止监控钱包
  stopMonitoring(address: string, chain: string) {
    const key = `${address}-${chain}`;
    
    if (this.monitoringIntervals[key]) {
      clearInterval(this.monitoringIntervals[key]);
      delete this.monitoringIntervals[key];
    }

    delete this.subscribers[key];
  }

  // 订阅钱包数据更新
  subscribe(address: string, chain: string, callback: (data: WalletBalance) => void) {
    const key = `${address}-${chain}`;
    
    if (!this.subscribers[key]) {
      this.subscribers[key] = [];
    }
    
    this.subscribers[key].push(callback);

    // 返回取消订阅函数
    return () => {
      const subscribers = this.subscribers[key];
      if (subscribers) {
        const index = subscribers.indexOf(callback);
        if (index > -1) {
          subscribers.splice(index, 1);
        }
      }
    };
  }

  // 通知订阅者
  private notifySubscribers(key: string, data: WalletBalance) {
    const subscribers = this.subscribers[key];
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in subscriber callback:', error);
        }
      });
    }
  }

  // 验证钱包地址
  isValidAddress(address: string): boolean {
    try {
      return ethers.isAddress(address);
    } catch {
      return false;
    }
  }

  // 获取支持的链列表
  getSupportedChains(): ChainConfig[] {
    return Object.values(SUPPORTED_CHAINS);
  }

  // 清理所有监控
  cleanup() {
    Object.values(this.monitoringIntervals).forEach(interval => {
      clearInterval(interval);
    });
    
    this.monitoringIntervals = {};
    this.subscribers = {};
  }
}

// 导出单例实例
export const walletService = new WalletService();

// 导出类型和服务
export default WalletService;