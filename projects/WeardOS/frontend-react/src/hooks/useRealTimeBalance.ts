import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import priceService from '../services/priceService';

interface TokenBalance {
  symbol: string;
  name: string;
  balance: number;
  value: number;
  change24h: number;
  icon: string;
}

interface WalletBalance {
  address: string;
  chain: string;
  totalValue: number;
  tokens: TokenBalance[];
  lastUpdate: string;
}

interface UseRealTimeBalanceReturn {
  balances: { [address: string]: WalletBalance };
  loading: boolean;
  error: string | null;
  refreshBalance: (address: string, chain: string) => Promise<void>;
  refreshAllBalances: () => Promise<void>;
}

export const useRealTimeBalance = (): UseRealTimeBalanceReturn => {
  const [balances, setBalances] = useState<{ [address: string]: WalletBalance }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 网络配置
  const networkConfigs = {
    ethereum: {
      rpcUrl: 'https://eth.llamarpc.com',
      chainId: 1,
      nativeCurrency: { symbol: 'ETH', name: 'Ethereum', decimals: 18 }
    },
    holesky: {
      rpcUrl: 'https://ethereum-holesky-rpc.publicnode.com',
      chainId: 17000,
      nativeCurrency: { symbol: 'ETH', name: 'Ethereum', decimals: 18 }
    },
    bsc: {
      rpcUrl: 'https://bsc-dataseed1.binance.org',
      chainId: 56,
      nativeCurrency: { symbol: 'BNB', name: 'BNB', decimals: 18 }
    },
    polygon: {
      rpcUrl: 'https://polygon-rpc.com',
      chainId: 137,
      nativeCurrency: { symbol: 'MATIC', name: 'Polygon', decimals: 18 }
    }
  };

  // 获取单个钱包的真实余额
  const fetchWalletBalance = useCallback(async (address: string, chain: string): Promise<WalletBalance | null> => {
    try {
      const config = networkConfigs[chain as keyof typeof networkConfigs];
      if (!config) {
        throw new Error(`不支持的网络: ${chain}`);
      }

      // 创建provider
      const provider = new ethers.JsonRpcProvider(config.rpcUrl);
      
      // 获取原生代币余额
      const balance = await provider.getBalance(address);
      const balanceInEther = parseFloat(ethers.formatEther(balance));

      // 获取代币价格
      const priceData = await priceService.getTokenPrice(config.nativeCurrency.symbol);
      const tokenPrice = priceData?.usd || 0;
      const change24h = priceData?.usd_24h_change || 0;

      // 计算USD价值
      const tokenValue = balanceInEther * tokenPrice;

      const walletBalance: WalletBalance = {
        address,
        chain,
        totalValue: tokenValue,
        tokens: [
          {
            symbol: config.nativeCurrency.symbol,
            name: config.nativeCurrency.name,
            balance: balanceInEther,
            value: tokenValue,
            change24h,
            icon: getTokenIcon(config.nativeCurrency.symbol)
          }
        ],
        lastUpdate: new Date().toISOString()
      };

      return walletBalance;
    } catch (error) {
      console.error(`获取钱包 ${address} 余额失败:`, error);
      throw error;
    }
  }, []);

  // 刷新单个钱包余额
  const refreshBalance = useCallback(async (address: string, chain: string) => {
    setLoading(true);
    setError(null);

    try {
      const walletBalance = await fetchWalletBalance(address, chain);
      if (walletBalance) {
        setBalances(prev => ({
          ...prev,
          [address]: walletBalance
        }));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取余额失败';
      setError(errorMessage);
      console.error('刷新余额失败:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchWalletBalance]);

  // 刷新所有钱包余额
  const refreshAllBalances = useCallback(async () => {
    const addresses = Object.keys(balances);
    if (addresses.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const promises = addresses.map(async (address) => {
        const currentBalance = balances[address];
        if (currentBalance) {
          return fetchWalletBalance(address, currentBalance.chain);
        }
        return null;
      });

      const results = await Promise.allSettled(promises);
      const newBalances: { [address: string]: WalletBalance } = {};

      results.forEach((result, index) => {
        const address = addresses[index];
        if (result.status === 'fulfilled' && result.value) {
          newBalances[address] = result.value;
        } else {
          // 保留原有数据，但标记为错误
          newBalances[address] = {
            ...balances[address],
            lastUpdate: new Date().toISOString()
          };
        }
      });

      setBalances(newBalances);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '批量刷新余额失败';
      setError(errorMessage);
      console.error('批量刷新余额失败:', err);
    } finally {
      setLoading(false);
    }
  }, [balances, fetchWalletBalance]);

  // 获取代币图标
  const getTokenIcon = (symbol: string): string => {
    const icons: { [key: string]: string } = {
      'ETH': '⟠',
      'BTC': '₿',
      'BNB': '🟡',
      'MATIC': '🟣',
      'USDC': '💵',
      'USDT': '💰',
      'UNI': '🦄',
      'LINK': '🔗',
      'AAVE': '👻',
      'COMP': '🏛️',
      'MKR': '🏭',
      'SNX': '⚡',
      'CRV': '🌊',
      'YFI': '💎',
      'SUSHI': '🍣',
      'CAKE': '🥞'
    };
    return icons[symbol] || '🪙';
  };

  return {
    balances,
    loading,
    error,
    refreshBalance,
    refreshAllBalances
  };
};

export default useRealTimeBalance;