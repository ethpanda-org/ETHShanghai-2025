import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import unifiedSocketService from '../services/socketService';

export interface WalletData {
  id: string;
  address: string;
  name: string;
  chain: string;
  balance: number;
  balanceUSD: number;
  change24h: number;
  lastUpdate: string;
  status: 'active' | 'inactive' | 'error';
  transactionCount: number;
  tokens: TokenData[];
}

export interface TokenData {
  symbol: string;
  name: string;
  balance: number;
  value: number;
  change24h: number;
  icon: string;
}

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: number;
  gasUsed: string;
  timestamp: string;
  status: 'success' | 'failed' | 'pending';
  type: 'send' | 'receive';
}

export interface MonitoringAlert {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  walletAddress: string;
  isRead: boolean;
}

export interface MonitoringData {
  totalBalance: number;
  totalChange24h: number;
  wallets: WalletData[];
  transactions: Transaction[];
  alerts: MonitoringAlert[];
  isMonitoring: boolean;
  walletCount: number;
  lastUpdate: string;
}

export const useWalletMonitoring = () => {
  const [monitoringData, setMonitoringData] = useState<MonitoringData>({
    totalBalance: 0,
    totalChange24h: 0,
    wallets: [],
    transactions: [],
    alerts: [],
    isMonitoring: false,
    walletCount: 0,
    lastUpdate: new Date().toISOString()
  });

  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 处理Socket消息
  const handleSocketMessage = useCallback((data: any) => {
    const { type, data: payload } = data;

    switch (type) {
      case 'connected':
        console.log('📡 钱包监控服务已连接');
        setIsConnected(true);
        break;

      case 'monitoringData':
        console.log('📊 收到监控数据:', payload);
        setMonitoringData(payload);
        break;

      case 'walletUpdate':
        console.log('💰 钱包更新:', payload);
        setMonitoringData(prev => ({
          ...prev,
          wallets: prev.wallets.map(wallet => 
            wallet.address === payload.address ? { ...wallet, ...payload } : wallet
          ),
          lastUpdate: new Date().toISOString()
        }));
        break;

      case 'newTransaction':
        console.log('💸 新交易:', payload);
        setMonitoringData(prev => ({
          ...prev,
          transactions: [payload, ...prev.transactions.slice(0, 99)], // 保持最新100条
          lastUpdate: new Date().toISOString()
        }));
        break;

      case 'newAlert':
        console.log('🚨 新警报:', payload);
        setMonitoringData(prev => ({
          ...prev,
          alerts: [payload, ...prev.alerts],
          lastUpdate: new Date().toISOString()
        }));
        message.warning(`钱包监控警报: ${payload.message}`);
        break;

      case 'balanceUpdate':
        console.log('💰 余额更新:', payload);
        setMonitoringData(prev => ({
          ...prev,
          totalBalance: payload.totalBalance,
          totalChange24h: payload.totalChange24h,
          wallets: prev.wallets.map(wallet => {
            const update = payload.wallets?.find((w: any) => w.address === wallet.address);
            return update ? { ...wallet, ...update } : wallet;
          }),
          lastUpdate: new Date().toISOString()
        }));
        break;

      case 'error':
        console.error('❌ 钱包监控错误:', payload);
        message.error(`钱包监控错误: ${payload.message}`);
        break;

      default:
        console.warn('⚠️ 未知的Socket消息类型:', type);
    }
  }, []);

  // 发送Socket消息
  const sendMessage = useCallback((type: string, data: any) => {
    if (unifiedSocketService.isConnected()) {
      unifiedSocketService.emit('wallet-monitoring', { type, data });
    } else {
      console.warn('⚠️ Socket未连接，无法发送消息');
    }
  }, []);

  // 添加钱包
  const addWallet = useCallback(async (walletData: { address: string; name: string; chain: string }) => {
    setIsLoading(true);
    try {
      if (!unifiedSocketService.isConnected()) {
        throw new Error('Socket未连接');
      }
      sendMessage('addWallet', walletData);
    } catch (error) {
      console.error('❌ 添加钱包失败:', error);
      message.error('添加钱包失败，请检查网络连接');
    } finally {
      setIsLoading(false);
    }
  }, [sendMessage]);

  // 移除钱包
  const removeWallet = useCallback(async (address: string) => {
    setIsLoading(true);
    try {
      if (!unifiedSocketService.isConnected()) {
        throw new Error('Socket未连接');
      }
      sendMessage('removeWallet', { address });
    } catch (error) {
      console.error('❌ 移除钱包失败:', error);
      message.error('移除钱包失败，请检查网络连接');
    } finally {
      setIsLoading(false);
    }
  }, [sendMessage]);

  // 开始监控
  const startMonitoring = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!unifiedSocketService.isConnected()) {
        throw new Error('Socket未连接');
      }
      sendMessage('startMonitoring', {});
    } catch (error) {
      console.error('❌ 启动监控失败:', error);
      message.error('启动监控失败，请检查网络连接');
    } finally {
      setIsLoading(false);
    }
  }, [sendMessage]);

  // 停止监控
  const stopMonitoring = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!unifiedSocketService.isConnected()) {
        throw new Error('Socket未连接');
      }
      sendMessage('stopMonitoring', {});
    } catch (error) {
      console.error('❌ 停止监控失败:', error);
      message.error('停止监控失败，请检查网络连接');
    } finally {
      setIsLoading(false);
    }
  }, [sendMessage]);



  // 刷新所有数据
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!unifiedSocketService.isConnected()) {
        throw new Error('Socket未连接');
      }
      sendMessage('getMonitoringData', {});
    } catch (error) {
      console.error('❌ 刷新数据失败:', error);
      message.error('刷新数据失败，请检查网络连接');
    } finally {
      setTimeout(() => setIsLoading(false), 1000); // 给一点时间让数据更新
    }
  }, [sendMessage]);

  // 更新钱包信息
  const updateWallet = useCallback(async (address: string, updates: Partial<WalletData>) => {
    try {
      if (!unifiedSocketService.isConnected()) {
        throw new Error('Socket未连接');
      }
      sendMessage('updateWallet', { address, updates });
      
      // 本地更新状态
      setMonitoringData(prev => ({
        ...prev,
        wallets: prev.wallets.map(wallet => 
          wallet.address === address ? { ...wallet, ...updates } : wallet
        ),
        lastUpdate: new Date().toISOString()
      }));
    } catch (error) {
      console.error('❌ 更新钱包失败:', error);
      message.error('更新钱包失败，请检查网络连接');
    }
  }, [sendMessage]);

  // 初始化连接和事件监听
  useEffect(() => {
    // 订阅钱包监控服务 - 使用通用监控标识
    unifiedSocketService.subscribeToWalletMonitoring('general');

    // 监听连接状态
    const handleConnected = () => {
      setIsConnected(true);
      // 请求初始数据
      sendMessage('getMonitoringData', {});
    };

    const handleDisconnected = () => {
      setIsConnected(false);
    };

    const handleWalletUpdate = (data: any) => {
      handleSocketMessage(data);
    };

    // 注册事件监听器
    unifiedSocketService.on('connected', handleConnected);
    unifiedSocketService.on('disconnected', handleDisconnected);
    unifiedSocketService.on('wallet-monitoring:update', handleWalletUpdate);

    // 初始连接状态检查
    setIsConnected(unifiedSocketService.isConnected());
    if (unifiedSocketService.isConnected()) {
      sendMessage('getMonitoringData', {});
    }

    return () => {
      // 清理事件监听器
      unifiedSocketService.off('connected', handleConnected);
      unifiedSocketService.off('disconnected', handleDisconnected);
      unifiedSocketService.off('wallet-monitoring:update', handleWalletUpdate);
      unifiedSocketService.unsubscribeFromWalletMonitoring('general');
    };
  }, [handleSocketMessage, sendMessage]);

  return {
    // 数据
    monitoringData,
    isConnected,
    isLoading,
    
    // 方法
    addWallet,
    removeWallet,
    updateWallet,
    startMonitoring,
    stopMonitoring,
    refreshData
  };
};