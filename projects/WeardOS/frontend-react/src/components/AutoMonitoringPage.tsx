import React, { useState, useEffect, useMemo } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Table, 
  Tag, 
  Button, 
  Switch, 
  Select, 
  Avatar, 
  List, 
  Typography, 
  Space,
  Divider,
  Alert,
  Badge,
  Tooltip,
  Modal,
  Form,
  Input,
  InputNumber,
  message
} from 'antd';
import {
  MonitorOutlined,
  WalletOutlined,
  SwapOutlined,
  RiseOutlined,
  FallOutlined,
  DollarOutlined,
  EyeOutlined,
  SettingOutlined,
  BellOutlined,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { useWalletMonitoring } from '../hooks/useWalletMonitoring';
import { useWeb3 } from '../hooks/useWeb3';
import { useRealTimeBalance } from '../hooks/useRealTimeBalance';
import api from '../services/api';
import unifiedSocketService from '../services/socketService';
import './AutoMonitoringPage.scss';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface WalletData {
  id: string;
  address: string;
  name: string;
  chain: string;
  balance: number;
  change24h: number;
  lastUpdate: string;
  status: 'active' | 'inactive' | 'error';
  tokens: TokenData[];
}

interface TokenData {
  symbol: string;
  name: string;
  balance: number;
  value: number;
  change24h: number;
  icon: string;
}

interface AIAnalysisResult {
  riskLevel: 'high' | 'medium' | 'low' | 'unknown';
  riskDetails: string;
  confidence: number;
  recommendations?: string[];
}

// 删除未使用的接口
// interface TransactionAPIResponse {
//   success: boolean;
//   transactions: Array<{
//     id: string;
//     hash: string;
//     type: 'send' | 'receive' | 'swap' | 'stake';
//     amount: number;
//     token: string;
//     from: string;
//     to: string;
//     timestamp: string;
//     status: 'success' | 'pending' | 'failed';
//     gasUsed: number;
//     value?: number;
//     riskLevel?: 'high' | 'medium' | 'low' | 'unknown';
//     riskDetails?: string;
//   }>;
//   message?: string;
// }

// interface BatchAnalysisResponse {
//   success: boolean;
//   analyses: AIAnalysisResult[];
//   message?: string;
// }

interface Transaction {
  id: string;
  hash: string;
  type: 'send' | 'receive' | 'swap' | 'stake';
  amount: number;
  token: string;
  from: string;
  to: string;
  timestamp: string;
  status: 'success' | 'pending' | 'failed';
  gasUsed: number;
  value?: number;
  riskLevel?: 'high' | 'medium' | 'low' | 'unknown';
  riskDetails?: string;
  aiAnalysis?: AIAnalysisResult; // 替换any类型
}

interface MonitoringAlert {
  id: string;
  type: 'balance' | 'transaction' | 'price' | 'security';
  title: string;
  message: string;
  severity: 'high' | 'medium' | 'low';
  timestamp: string;
  isRead: boolean;
}

const AutoMonitoringPage: React.FC = () => {
  // 钱包监控
  const {
    // isConnected: isSocketConnected - removed unused variable
  } = useWalletMonitoring();

  // Web3钱包连接
  const {
    isConnected,
    // isConnecting, - 移除未使用的变量
    account,
    balance,
    network,
    chainId,
    // connectWallet, - 移除未使用的变量
    // disconnectWallet, - 移除未使用的变量
    formatAddress,
    formatBalance
  } = useWeb3();

  // 真实余额获取
  const {
    balances: realTimeBalances,
    refreshBalance,
    refreshAllBalances
  } = useRealTimeBalance();

  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [alerts, setAlerts] = useState<MonitoringAlert[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [selectedChain, setSelectedChain] = useState('all');
  const [isAddWalletModalVisible, setIsAddWalletModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [form] = Form.useForm();

  // 实时交易监听相关状态
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'disconnected' | 'connecting' | 'disconnecting'>('disconnected');

  // 今日交易统计状态
  const [todayTransactionCount, setTodayTransactionCount] = useState(0);
  const [todayTransactionVolume, setTodayTransactionVolume] = useState(0);
  
  // 自动刷新相关状态
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);

  // 计算今日交易统计
  const calculateTodayStats = (transactionList: Transaction[]) => {
    const today = new Date().toDateString();
    const todayTransactions = transactionList.filter(tx => {
      const txDate = new Date(tx.timestamp).toDateString();
      return txDate === today;
    });
    
    const count = todayTransactions.length;
    const volume = todayTransactions.reduce((sum, tx) => sum + (tx.value || 0), 0);
    
    setTodayTransactionCount(count);
    setTodayTransactionVolume(volume);
  };

  // 处理新交易数据 - 优化版本，支持3秒延迟容忍
  const handleNewTransaction = (data: any) => {
    console.log('📨 收到新交易数据:', data);
    
    // 格式化交易数据
    const newTransaction: Transaction = {
      id: data.hash || `tx_${Date.now()}`,
      hash: data.hash || '',
      type: data.type || 'receive',
      amount: parseFloat(data.value || '0'),
      token: data.tokenSymbol || 'ETH',
      from: data.from || '',
      to: data.to || '',
      timestamp: data.timestamp || new Date().toISOString(),
      status: 'success',
      gasUsed: parseInt(data.gasUsed || '0'),
      value: parseFloat(data.valueUSD || '0'),
      riskLevel: data.riskLevel || 'unknown',
      riskDetails: data.riskDetails || '',
      aiAnalysis: data.aiAnalysis
    };

    // 立即更新交易列表，确保每笔交易都能及时显示
    setTransactions(prev => {
      // 检查是否已存在相同的交易（防止重复）
      const existingIndex = prev.findIndex(tx => tx.hash === newTransaction.hash);
      
      let updated: Transaction[];
      if (existingIndex >= 0) {
        // 如果交易已存在，更新该交易信息
        updated = [...prev];
        updated[existingIndex] = newTransaction;
        console.log('🔄 更新已存在的交易:', newTransaction.hash);
      } else {
        // 新交易，添加到列表顶部
        updated = [newTransaction, ...prev].slice(0, 20);
        console.log('✨ 添加新交易到列表:', newTransaction.hash);
      }
      
      // 实时更新今日交易统计
      calculateTodayStats(updated);
      return updated;
    });

    // 延迟显示通知（3秒容忍机制）
    setTimeout(() => {
      message.info({
        content: `新交易: ${newTransaction.amount} ${newTransaction.token}`,
        duration: 4,
        key: newTransaction.hash, // 使用hash作为key防止重复通知
      });
    }, 100); // 100ms延迟确保UI更新完成

    // 创建监控警报
    const alert: MonitoringAlert = {
      id: `alert_${Date.now()}`,
      type: 'transaction',
      title: '新交易检测',
      message: `检测到新的${newTransaction.type}交易: ${newTransaction.amount} ${newTransaction.token}`,
      severity: newTransaction.riskLevel === 'high' ? 'high' : 'medium',
      timestamp: new Date().toISOString(),
      isRead: false
    };

    // 延迟添加警报，确保不会阻塞交易显示
    setTimeout(() => {
      setAlerts(prev => {
        // 检查是否已存在相同的警报
        const existingAlert = prev.find(a => a.message.includes(newTransaction.hash));
        if (existingAlert) {
          return prev; // 如果已存在，不重复添加
        }
        return [alert, ...prev].slice(0, 10);
      });
    }, 200);
  };

  // 获取链名称的辅助函数（用于API调用）
  const getChainName = (chainId: number): string => {
    const chainMap: { [key: number]: string } = {
      1: 'ethereum',
      17000: 'holesky',
      56: 'bsc',
      137: 'polygon',
      42161: 'arbitrum',
      10: 'optimism'
    };
    return chainMap[chainId] || 'ethereum';
  };
  
  // 实时交易监听功能
  const initializeRealtimeMonitoring = async () => {
    if (!isConnected || !account || !chainId) {
      console.log('钱包未连接，无法启动实时监听');
      return;
    }
  
    try {
      setRealtimeStatus('connecting');
      console.log('🚀 启动实时交易监听...');

      // 检查Socket.IO连接状态
      const debugInfo = unifiedSocketService.getDebugInfo();
      console.log('📊 Socket.IO调试信息:', debugInfo);

      // 如果Socket未连接，尝试强制重连
      if (!unifiedSocketService.isConnected()) {
        console.log('🔄 Socket未连接，尝试强制重连...');
        unifiedSocketService.forceReconnect();
        
        // 等待连接建立
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Socket连接超时'));
          }, 10000);

          const onConnected = () => {
            clearTimeout(timeout);
            unifiedSocketService.off('connected', onConnected);
            unifiedSocketService.off('connection_error', onError);
            resolve(true);
          };

          const onError = (data: any) => {
            clearTimeout(timeout);
            unifiedSocketService.off('connected', onConnected);
            unifiedSocketService.off('connection_error', onError);
            reject(new Error(`Socket连接失败: ${data.error?.message || '未知错误'}`));
          };

          unifiedSocketService.on('connected', onConnected);
          unifiedSocketService.on('connection_error', onError);
        });
      }
  
      // 启动后端实时监听服务
      const startResponse = await api.startRealtimeMonitoring([account]);
      
      if (!startResponse.success) {
        throw new Error(startResponse.message || '启动实时监听失败');
      }
  
      // 订阅实时交易监控
      unifiedSocketService.subscribeToRealtimeTransaction(account);
      
      // 设置事件监听器
      unifiedSocketService.on('connected', () => {
        console.log('✅ Socket连接成功');
        setRealtimeStatus('connected');
        setIsRealtimeActive(true);
        message.success('实时交易监听已启动');
      });

      unifiedSocketService.on('disconnected', () => {
        console.log('❌ Socket连接断开');
        setRealtimeStatus('disconnected');
        setIsRealtimeActive(false);
      });

      unifiedSocketService.on('connection_error', (data: any) => {
        console.error('Socket连接错误:', data.error);
        setRealtimeStatus('disconnected');
        setIsRealtimeActive(false);
        message.error('Socket连接失败');
      });

      // 监听实时交易事件
      unifiedSocketService.on('realtime-transaction:update', (data: any) => {
        console.log('🔔 收到新交易事件:', data);
        handleNewTransaction(data);
      });

      // 监听初始数据事件
      unifiedSocketService.on('realtime-transaction:initial-data', (data: any) => {
        console.log('📊 收到初始交易数据:', data);
        if (data.recentTransactions && Array.isArray(data.recentTransactions)) {
          data.recentTransactions.forEach((tx: any) => handleNewTransaction(tx));
        }
      });

      console.log('✅ 实时交易监听初始化完成');
  
    } catch (error) {
      console.error('启动实时监听失败:', error);
      setRealtimeStatus('disconnected');
      setIsRealtimeActive(false);
      message.error(`启动实时监听失败: ${(error as Error).message}`);
    }
  };
  
  // 停止实时交易监听
  const stopRealtimeMonitoring = async () => {
    try {
      console.log('🛑 停止实时交易监听...');
  
      // 取消订阅实时交易监控
      if (account) {
        unifiedSocketService.unsubscribeFromRealtimeTransaction(account);
      }
  
      // 停止后端实时监听服务
      if (account && chainId) {
        const stopResponse = await api.stopRealtimeMonitoring();
        
        if (!stopResponse.success) {
          console.warn('停止后端监听服务失败:', stopResponse.message);
        }
      }
  
      setRealtimeStatus('disconnected');
      setIsRealtimeActive(false);
      message.success('实时交易监听已停止');
  
    } catch (error) {
      console.error('停止实时监听失败:', error);
      message.error(`停止实时监听失败: ${(error as Error).message}`);
    }
  };
  



  // 获取真实交易历史
  const fetchRealTransactionHistory = async () => {
    try {
      setRefreshing(true);
      console.log('开始获取真实交易历史...');
      
      if (!account || !chainId) {
        console.log('未连接钱包，无法获取交易历史');
        setTransactions([]);
        return;
      }
      
      const chainName = getChainName(chainId);
      console.log(`获取 ${chainName} 网络的交易历史，地址: ${account}`);
      
      try {
        // 尝试从后端API获取真实交易数据
        console.log(`🔍 调用API: /api/monitoring/transactions?address=${account}&chain=${chainName}&limit=20`);
        const response = await fetch(`/api/monitoring/transactions?address=${account}&chain=${chainName}&limit=20`);
        
        console.log(`📡 API响应状态: ${response.status}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log('📊 API返回数据:', data);
          
          if (data && data.success && data.transactions && Array.isArray(data.transactions)) {
            const realTransactions = data.transactions.map((tx: any) => ({
              id: tx.hash || tx.id || `tx_${Date.now()}_${Math.random()}`,
              hash: tx.hash || '',
              type: tx.type || (tx.from?.toLowerCase() === account.toLowerCase() ? 'send' : 'receive'),
              amount: parseFloat(tx.value || '0'),
              token: tx.tokenSymbol || 'ETH',
              from: tx.from || '',
              to: tx.to || '',
              timestamp: tx.timestamp || new Date().toISOString(),
              status: tx.status || 'success',
              gasUsed: parseInt(tx.gasUsed || '0'),
              value: parseFloat(tx.valueUSD || tx.value || '0'),
              riskLevel: (tx.riskLevel as 'unknown' | 'low' | 'medium' | 'high') || 'unknown',
              riskDetails: tx.riskDetails || '正常交易'
            }));
            
            console.log(`✅ 处理后的交易数据:`, realTransactions);
            setTransactions(realTransactions);
            calculateTodayStats(realTransactions);
            console.log(`获取到 ${realTransactions.length} 笔真实交易数据`);
            return;
          } else {
            console.warn('⚠️ API返回数据格式不正确:', data);
          }
        } else {
          console.error(`❌ API请求失败: ${response.status} ${response.statusText}`);
        }
      } catch (apiError) {
        console.error('❌ API调用异常:', apiError);
      }

      // 如果API失败，尝试使用区块链浏览器API
      try {
        const etherscanResponse = await fetch(
          `https://api.etherscan.io/api?module=account&action=txlist&address=${account}&startblock=0&endblock=99999999&page=1&offset=20&sort=desc&apikey=your_etherscan_api_key_here`
        );
        
        if (etherscanResponse.ok) {
          const etherscanData = await etherscanResponse.json();
          
          if (etherscanData.status === '1' && etherscanData.result) {
            const etherscanTransactions = etherscanData.result.map((tx: any) => ({
              id: tx.hash,
              hash: tx.hash,
              type: tx.from.toLowerCase() === account.toLowerCase() ? 'send' : 'receive',
              amount: parseFloat((parseInt(tx.value) / 1e18).toFixed(6)),
              token: 'ETH',
              from: tx.from,
              to: tx.to,
              timestamp: new Date(parseInt(tx.timeStamp) * 1000).toISOString(),
              status: tx.txreceipt_status === '1' ? 'success' : 'failed',
              gasUsed: parseInt(tx.gasUsed),
              value: parseFloat((parseInt(tx.value) / 1e18).toFixed(6)),
              riskLevel: 'unknown',
              riskDetails: '区块链交易'
            }));
            
            setTransactions(etherscanTransactions);
            calculateTodayStats(etherscanTransactions);
            console.log(`从Etherscan获取到 ${etherscanTransactions.length} 笔交易数据`);
            return;
          }
        }
      } catch (etherscanError) {
        console.warn('Etherscan API获取失败:', etherscanError);
      }

      // 如果所有API都失败，显示空的交易列表
      console.log('所有API获取交易数据失败，显示空列表');
      setTransactions([]);
      calculateTodayStats([]);
    } catch (error) {
      console.error('获取交易历史失败:', error);
      message.error('获取交易历史失败');
      setTransactions([]);
    } finally {
      setRefreshing(false);
    }
  };

  // 刷新交易历史
  const refreshTransactionHistory = async () => {
    await fetchRealTransactionHistory();
    setLastRefreshTime(new Date());
  };

  // 自动刷新交易数据
  useEffect(() => {
    if (!autoRefreshEnabled || !isConnected || !account) {
      return;
    }

    const refreshInterval = setInterval(() => {
      console.log('🔄 自动刷新交易数据...');
      refreshTransactionHistory();
    }, 60000); // 每60秒刷新一次（降低频率）

    return () => {
      clearInterval(refreshInterval);
    };
  }, [autoRefreshEnabled, isConnected, account]);

  // 页面可见性变化时刷新数据
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && autoRefreshEnabled && isConnected && account) {
        console.log('📱 页面重新可见，刷新数据...');
        refreshTransactionHistory();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [autoRefreshEnabled, isConnected, account]);

  // 自动添加连接的钱包到监控列表并获取真实余额
  useEffect(() => {
    if (isConnected && account && chainId) {
      const chainName = getChainName(chainId);
      
      // 获取真实余额
      refreshBalance(account, chainName.toLowerCase()).then(() => {
        setWallets(prev => {
          const existingWallet = prev.find(w => w.address.toLowerCase() === account.toLowerCase());
          
          if (!existingWallet) {
            // 从真实余额数据创建钱包
            const realBalance = realTimeBalances[account];
            
            const connectedWallet: WalletData = {
              id: `connected-${account}`,
              address: account,
              name: `连接的钱包 (${network})`,
              chain: chainName,
              balance: realBalance?.totalValue || 0,
              change24h: realBalance?.tokens[0]?.change24h || 0,
              lastUpdate: realBalance?.lastUpdate || new Date().toLocaleString(),
              status: 'active',
              tokens: realBalance?.tokens || [
                {
                  symbol: 'ETH',
                  name: 'Ethereum',
                  balance: balance ? parseFloat(balance) : 0,
                  value: 0,
                  change24h: 0,
                  icon: '⟠'
                }
              ]
            };
            
            return [connectedWallet, ...prev];
          } else {
            // 更新现有钱包的真实余额
            const realBalance = realTimeBalances[account];
            if (realBalance) {
              return prev.map(wallet => 
                wallet.address.toLowerCase() === account.toLowerCase()
                  ? {
                      ...wallet,
                      balance: realBalance.totalValue,
                      change24h: realBalance.tokens[0]?.change24h || 0,
                      lastUpdate: realBalance.lastUpdate,
                      tokens: realBalance.tokens
                    }
                  : wallet
              );
            }
          }
          return prev;
        });
      }).catch(error => {
        console.error('获取真实余额失败:', error);
        // 如果获取真实余额失败，仍然添加钱包但使用默认值
        setWallets(prev => {
          const existingWallet = prev.find(w => w.address.toLowerCase() === account.toLowerCase());
          
          if (!existingWallet) {
            const connectedWallet: WalletData = {
              id: `connected-${account}`,
              address: account,
              name: `连接的钱包 (${network})`,
              chain: chainName,
              balance: 0,
              change24h: 0,
              lastUpdate: new Date().toLocaleString(),
              status: 'error',
              tokens: [
                {
                  symbol: 'ETH',
                  name: 'Ethereum',
                  balance: balance ? parseFloat(balance) : 0,
                  value: 0,
                  change24h: 0,
                  icon: '⟠'
                }
              ]
            };
            
            return [connectedWallet, ...prev];
          }
          return prev;
        });
      });
    }
  }, [isConnected, account, chainId, network, balance, refreshBalance, realTimeBalances]);

  // 支持的区块链网络
  const supportedChains = [
    { value: 'ethereum', label: 'Ethereum', icon: '⟠', color: '#627eea' },
    { value: 'holesky', label: 'Holesky Testnet', icon: '🧪', color: '#ffa500' },
    { value: 'bsc', label: 'BSC', icon: '🟡', color: '#f3ba2f' },
    { value: 'polygon', label: 'Polygon', icon: '🟣', color: '#8247e5' },
    { value: 'arbitrum', label: 'Arbitrum', icon: '🔵', color: '#28a0f0' },
    { value: 'optimism', label: 'Optimism', icon: '🔴', color: '#ff0420' },
  ];

  // 初始化警报数据
  useEffect(() => {
    // 只保留警报的模拟数据，交易数据将通过真实API获取
    const mockAlerts: MonitoringAlert[] = [
      {
        id: '1',
        type: 'balance',
        title: '余额变动提醒',
        message: '主钱包ETH余额增加2.5个，当前余额8.5 ETH',
        severity: 'medium',
        timestamp: '2024-01-15 14:25:30',
        isRead: false
      },
      {
        id: '2',
        type: 'transaction',
        title: '大额交易检测',
        message: '检测到价值$3,750的ETH转出交易',
        severity: 'high',
        timestamp: '2024-01-15 13:45:15',
        isRead: false
      },
      {
        id: '3',
        type: 'price',
        title: '价格波动提醒',
        message: 'ETH价格上涨3.2%，当前价格$1,500',
        severity: 'low',
        timestamp: '2024-01-15 13:30:00',
        isRead: true
      }
    ];

    // 不再设置模拟交易数据和钱包数据
    setAlerts(mockAlerts);
  }, []);

  // 当钱包连接状态改变时，获取交易历史
  useEffect(() => {
    if (isConnected && account && chainId) {
      fetchRealTransactionHistory();
    }
  }, [isConnected, account, chainId]);

  // 添加定时刷新交易历史的功能
  useEffect(() => {
    if (!isConnected || !account || !chainId) {
      return;
    }

    // 设置定时器，每5秒自动刷新一次交易历史
    /*
     const refreshInterval = setInterval(() => {
       console.log('🔄 自动刷新交易历史...');
       fetchRealTransactionHistory();
     }, 5000); // 5秒
    */

    // 清理定时器
    return () => {
      // clearInterval(refreshInterval);
    };
  }, [isConnected, account, chainId]);

  // 监听区块链新区块事件（如果支持）
  useEffect(() => {
    if (!isConnected || !account || !chainId) {
      return;
    }

    let blockListener: any = null;

    const setupBlockListener = async () => {
      try {
        // 尝试设置区块监听器
        const { ethers } = await import('ethers');
        const chainKey = getChainName(chainId);
        
        // 获取对应的RPC URL - 使用 WebSocket 以支持事件监听
        const rpcUrls: { [key: string]: string } = {
          'ethereum': 'wss://eth.llamarpc.com',
          'holesky': 'wss://ethereum-holesky-rpc.publicnode.com',
          'bsc': 'wss://bsc-dataseed1.binance.org',
          'polygon': 'wss://polygon-rpc.com',
          'arbitrum': 'wss://arb1.arbitrum.io/rpc',
          'optimism': 'wss://mainnet.optimism.io'
        };

        const rpcUrl = rpcUrls[chainKey];
        if (!rpcUrl) {
          console.log(`不支持的链: ${chainKey}`);
          return;
        }

        const provider = new ethers.WebSocketProvider(rpcUrl);
        
        // 监听新区块
        blockListener = provider.on('block', (blockNumber) => {
          console.log(`🆕 检测到新区块: ${blockNumber}，刷新交易历史`);
          fetchRealTransactionHistory();
        });

        console.log(`✅ 已设置 ${chainKey} 网络的区块监听器`);
        
      } catch (error) {
        console.log('⚠️ 无法设置区块监听器，将使用定时刷新:', (error as Error).message);
      }
    };

    setupBlockListener();

    // 清理监听器
    return () => {
      if (blockListener) {
        try {
          blockListener.removeAllListeners();
        } catch (error) {
          console.log('清理区块监听器时出错:', error);
        }
      }
    };
  }, [isConnected, account, chainId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshAllBalances();
      await fetchRealTransactionHistory();
      message.success('数据刷新成功');
    } catch (error) {
      console.error('刷新失败:', error);
      message.error('刷新失败，请重试');
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddWallet = async (values: any) => {
    const newWallet: WalletData = {
      id: Date.now().toString(),
      address: values.address,
      name: values.name,
      chain: values.chain,
      balance: 0,
      change24h: 0,
      lastUpdate: new Date().toLocaleString(),
      status: 'active',
      tokens: []
    };
    
    setWallets(prev => [...prev, newWallet]);
    setIsAddWalletModalVisible(false);
    form.resetFields();
  };

  const getChainIcon = (chain: string) => {
    const chainData = supportedChains.find(c => c.value === chain);
    return chainData?.icon || '🔗';
  };

  const getChainColor = (chain: string) => {
    const chainData = supportedChains.find(c => c.value === chain);
    return chainData?.color || '#1890ff';
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'send': return <FallOutlined style={{ color: '#ff4d4f' }} />;
      case 'receive': return <RiseOutlined style={{ color: '#52c41a' }} />;
      case 'swap': return <SwapOutlined style={{ color: '#1890ff' }} />;
      case 'stake': return <DollarOutlined style={{ color: '#722ed1' }} />;
      default: return <SwapOutlined />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'success';
      case 'pending': return 'processing';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'balance': return <WalletOutlined />;
      case 'transaction': return <SwapOutlined />;
      case 'price': return <RiseOutlined />;
      case 'security': return <ExclamationCircleOutlined />;
      default: return <BellOutlined />;
    }
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'high': return '#ff4d4f';
      case 'medium': return '#faad14';
      case 'low': return '#52c41a';
      default: return '#1890ff';
    }
  };

  const filteredWallets = selectedChain === 'all' 
    ? wallets 
    : wallets.filter(wallet => wallet.chain === selectedChain);

  // 计算总资产价值（使用真实数据）
  const totalBalance = useMemo(() => {
    // 直接使用钱包数据中的真实余额，不再重复计算
    return wallets.reduce((sum, wallet) => sum + wallet.balance, 0);
  }, [wallets]);

  const totalChange24h = useMemo(() => {
    if (wallets.length === 0 || totalBalance === 0) return 0;
    
    // 计算加权平均24小时变化
    const weightedChange = wallets.reduce((sum, wallet) => {
      const weight = wallet.balance / totalBalance;
      return sum + (wallet.change24h * weight);
    }, 0);
    
    return weightedChange;
  }, [wallets, totalBalance]);

  const walletColumns = [
    {
      title: '钱包',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: WalletData) => (
        <Space>
          <Avatar 
            style={{ backgroundColor: getChainColor(record.chain) }}
            size="small"
          >
            {getChainIcon(record.chain)}
          </Avatar>
          <div>
            <Text strong>{name}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.address.slice(0, 6)}...{record.address.slice(-4)}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: '链',
      dataIndex: 'chain',
      key: 'chain',
      render: (chain: string) => {
        const chainData = supportedChains.find(c => c.value === chain);
        return (
          <Tag color={chainData?.color}>
            {chainData?.icon} {chainData?.label}
          </Tag>
        );
      },
    },
    {
      title: '余额',
      dataIndex: 'balance',
      key: 'balance',
      render: (balance: number) => (
        <Statistic
          value={balance}
          precision={2}
          prefix="$"
          valueStyle={{ fontSize: '14px' }}
        />
      ),
    },
    {
      title: '24h变化',
      dataIndex: 'change24h',
      key: 'change24h',
      render: (change: number) => (
        <Statistic
          value={change}
          precision={2}
          suffix="%"
          valueStyle={{ 
            fontSize: '14px',
            color: change >= 0 ? '#3f8600' : '#cf1322' 
          }}
          prefix={change >= 0 ? <RiseOutlined /> : <FallOutlined />}
        />
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Badge 
          status={status === 'active' ? 'success' : status === 'inactive' ? 'default' : 'error'} 
          text={status === 'active' ? '活跃' : status === 'inactive' ? '非活跃' : '错误'}
        />
      ),
    },
    {
      title: '最后更新',
      dataIndex: 'lastUpdate',
      key: 'lastUpdate',
      render: (time: string) => (
        <Text type="secondary" style={{ fontSize: '12px' }}>
          {time}
        </Text>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_record: WalletData) => (
        <Space>
          <Tooltip title="查看详情">
            <Button type="text" icon={<EyeOutlined />} size="small" />
          </Tooltip>
          <Tooltip title="编辑">
            <Button type="text" icon={<EditOutlined />} size="small" />
          </Tooltip>
          <Tooltip title="删除">
            <Button type="text" danger icon={<DeleteOutlined />} size="small" />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="auto-monitoring-page">
      {/* Header Section */}
      <div className="page-header">
        <div className="header-content">
          <div className="header-text">
            <Title level={1} className="page-title">
              <MonitorOutlined className="title-icon" />
              自动监控
            </Title>
            <Paragraph className="page-subtitle">
              实时监控您的Web3钱包动态，支持多链资产追踪和智能提醒
            </Paragraph>
          </div>
          <div className="header-controls">
            <Space>
              {/* 钱包连接状态 */}
              {isConnected && (
                <Space>
                  <Badge status="success" />
                  <Text type="secondary">
                    {formatAddress(account)} ({network})
                  </Text>
                  <Text strong>{formatBalance(balance)} ETH</Text>
                </Space>
              )}
              
              <Switch 
                checked={isMonitoring}
                onChange={setIsMonitoring}
                checkedChildren="监控中"
                unCheckedChildren="已暂停"
              />
              
              {/* 实时交易监听控制 */}
              <Tooltip title={
                isRealtimeActive ? 
                "停止实时交易监听" : 
                "启动实时交易监听"
              }>
                <Button
                  type={isRealtimeActive ? "primary" : "default"}
                  danger={isRealtimeActive}
                  icon={isRealtimeActive ? <MonitorOutlined /> : <MonitorOutlined />}
                  onClick={isRealtimeActive ? stopRealtimeMonitoring : initializeRealtimeMonitoring}
                  loading={realtimeStatus === 'connecting' || realtimeStatus === 'disconnecting'}
                  disabled={!isConnected || !account}
                >
                  {isRealtimeActive ? '停止监听' : '启动监听'}
                </Button>
              </Tooltip>
              
              <Button 
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
                loading={refreshing}
              >
                刷新
              </Button>
              <Button 
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setIsAddWalletModalVisible(true)}
              >
                添加钱包
              </Button>
            </Space>
          </div>
        </div>
      </div>

      <Row gutter={[24, 24]}>
        {/* 左侧：监控概览和钱包列表 */}
        <Col xs={24} lg={16}>
          {/* 监控概览 */}
          <Card className="monitoring-overview-card" title="监控概览">
            <Row gutter={16}>
              <Col span={6}>
                <Statistic
                  title="总资产价值"
                  value={totalBalance}
                  precision={2}
                  prefix={<DollarOutlined />}
                  suffix="USD"
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="24h变化"
                  value={totalChange24h}
                  precision={2}
                  suffix="%"
                  valueStyle={{ 
                    color: totalChange24h >= 0 ? '#3f8600' : '#cf1322' 
                  }}
                  prefix={
                    totalChange24h >= 0 ? 
                    <RiseOutlined /> : 
                    <FallOutlined />
                  }
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="监控钱包"
                  value={wallets.length}
                  prefix={<WalletOutlined />}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title={
                    <Space>
                      今日交易
                      {autoRefreshEnabled && (
                        <Tooltip title="自动刷新已启用">
                          <Badge status="processing" />
                        </Tooltip>
                      )}
                    </Space>
                  }
                  value={todayTransactionCount}
                  prefix={<SwapOutlined />}
                  suffix={`笔 (${todayTransactionVolume.toFixed(2)} ETH)`}
                />
                {lastRefreshTime && (
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    更新: {lastRefreshTime.toLocaleTimeString()}
                  </Text>
                )}
              </Col>
            </Row>
          </Card>

          {/* 钱包列表 */}
          <Card 
            className="wallets-card"
            title={
              <Space>
                <WalletOutlined />
                钱包列表
                <Badge count={wallets.length} color="#1890ff" />
              </Space>
            }
            extra={
              <Select
                value={selectedChain}
                onChange={setSelectedChain}
                style={{ width: 120 }}
                size="small"
              >
                <Option value="all">全部链</Option>
                {supportedChains.map(chain => (
                  <Option key={chain.value} value={chain.value}>
                    {chain.icon} {chain.label}
                  </Option>
                ))}
              </Select>
            }
          >
            <Table
              dataSource={filteredWallets}
              columns={walletColumns}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>

          {/* 最近交易 */}
          <Card 
            className="transactions-card"
            title={
              <Space>
                <SwapOutlined />
                最近交易
                <Badge count={transactions.length} color="#52c41a" />
                {autoRefreshEnabled && (
                  <Tooltip title="自动刷新中">
                    <Badge status="processing" />
                  </Tooltip>
                )}
              </Space>
            }
            extra={
              <Space>
                <Tooltip title="自动刷新">
                  <Switch
                    checked={autoRefreshEnabled}
                    onChange={setAutoRefreshEnabled}
                    size="small"
                  />
                </Tooltip>
                <Button 
                  type="text" 
                  size="small" 
                  icon={<ReloadOutlined />}
                  loading={refreshing}
                  onClick={refreshTransactionHistory}
                >
                  手动刷新
                </Button>
              </Space>
            }
          >
            <List
              dataSource={transactions}
              renderItem={(transaction, index) => (
                <List.Item 
                  className="transaction-item"
                  style={{
                    // 为新交易添加动画效果
                    animation: index === 0 && transactions.length > 0 ? 'fadeInDown 0.5s ease-out' : 'none',
                    borderLeft: index === 0 ? '3px solid #52c41a' : 'none',
                    paddingLeft: index === 0 ? '12px' : '16px',
                    backgroundColor: index === 0 ? 'rgba(82, 196, 26, 0.05)' : 'transparent'
                  }}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar 
                        icon={getTransactionIcon(transaction.type)}
                        style={{ 
                          backgroundColor: 'transparent', 
                          border: `2px solid ${
                            transaction.riskLevel === 'high' ? '#ff4d4f' :
                            transaction.riskLevel === 'medium' ? '#faad14' : '#52c41a'
                          }` 
                        }}
                      />
                    }
                    title={
                      <Space>
                        <Text strong>
                          {transaction.type === 'send' ? '发送' :
                           transaction.type === 'receive' ? '接收' :
                           transaction.type === 'swap' ? '交换' : '质押'}
                        </Text>
                        <Text>{transaction.amount} {transaction.token}</Text>
                        <Tag color={getStatusColor(transaction.status)}>
                          {transaction.status === 'success' ? '成功' :
                           transaction.status === 'pending' ? '待确认' : '失败'}
                        </Tag>
                        <Tooltip title={transaction.riskDetails}>
                          <Tag color={
                            transaction.riskLevel === 'high' ? 'red' : 
                            transaction.riskLevel === 'medium' ? 'orange' : 
                            transaction.riskLevel === 'unknown' ? 'blue' : 'green'
                          }>
                            🤖 AI风险: {
                              transaction.riskLevel === 'high' ? '高' :
                              transaction.riskLevel === 'medium' ? '中' :
                              transaction.riskLevel === 'unknown' ? '分析中' : '低'
                            }
                          </Tag>
                        </Tooltip>
                        {/* 新交易标识 */}
                        {index === 0 && (
                          <Tag color="green" style={{ fontSize: '10px' }}>
                            最新
                          </Tag>
                        )}
                      </Space>
                    }
                    description={
                      <div>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {transaction.hash} • {transaction.timestamp}
                        </Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          Gas: {transaction.gasUsed.toLocaleString()}
                        </Text>
                        <br />
                        <Text 
                          type="secondary" 
                          style={{ 
                            fontSize: '12px',
                            color: transaction.riskLevel === 'high' ? '#ff4d4f' : 
                                   transaction.riskLevel === 'medium' ? '#faad14' : '#52c41a'
                          }}
                        >
                          🤖 AI分析: {transaction.riskDetails}
                        </Text>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        {/* 右侧：实时提醒和设置 */}
        <Col xs={24} lg={8}>
          {/* 实时提醒 */}
          <Card 
            className="alerts-card"
            title={
              <Space>
                <BellOutlined />
                实时提醒
                <Badge count={alerts.filter(alert => !alert.isRead).length} />
              </Space>
            }
            extra={
              <Button type="link" size="small">
                全部标记已读
              </Button>
            }
          >
            <List
              dataSource={alerts}
              renderItem={(alert) => (
                <List.Item 
                  className={`alert-item ${alert.isRead ? 'read' : 'unread'}`}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar 
                        icon={getAlertIcon(alert.type)}
                        style={{ 
                          backgroundColor: 'transparent',
                          border: `2px solid ${getAlertColor(alert.severity)}`,
                          color: getAlertColor(alert.severity)
                        }}
                      />
                    }
                    title={
                      <Space>
                        <Text strong className={alert.isRead ? 'read-title' : ''}>
                          {alert.title}
                        </Text>
                        <Tag 
                          color={getAlertColor(alert.severity)}
                        >
                          {alert.severity === 'high' ? '高' :
                           alert.severity === 'medium' ? '中' : '低'}
                        </Tag>
                      </Space>
                    }
                    description={
                      <div>
                        <Paragraph 
                          className="alert-message"
                          style={{ 
                            fontSize: '13px',
                            marginBottom: '4px',
                            opacity: alert.isRead ? 0.7 : 1
                          }}
                        >
                          {alert.message}
                        </Paragraph>
                        <Text 
                          type="secondary" 
                          style={{ fontSize: '11px' }}
                        >
                          {alert.timestamp}
                        </Text>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>

          {/* 监控设置 */}
          <Card 
            className="settings-card"
            title={
              <Space>
                <SettingOutlined />
                监控设置
              </Space>
            }
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <div className="setting-item">
                <div className="setting-label">
                  <Text>余额变动提醒</Text>
                </div>
                <Switch defaultChecked size="small" />
              </div>
              
              <div className="setting-item">
                <div className="setting-label">
                  <Text>大额交易提醒</Text>
                </div>
                <Switch defaultChecked size="small" />
              </div>
              
              <div className="setting-item">
                <div className="setting-label">
                  <Text>价格波动提醒</Text>
                </div>
                <Switch defaultChecked size="small" />
              </div>
              
              <div className="setting-item">
                <div className="setting-label">
                  <Text>安全风险提醒</Text>
                </div>
                <Switch defaultChecked size="small" />
              </div>

              <Divider />

              <div className="setting-item">
                <Text type="secondary">刷新频率</Text>
                <Select defaultValue="30" size="small" style={{ width: '100%', marginTop: '8px' }}>
                  <Option value="10">10秒</Option>
                  <Option value="30">30秒</Option>
                  <Option value="60">1分钟</Option>
                  <Option value="300">5分钟</Option>
                </Select>
              </div>

              <div className="setting-item">
                <Text type="secondary">提醒阈值</Text>
                <InputNumber
                  defaultValue={100}
                  min={1}
                  max={10000}
                  prefix="$"
                  size="small"
                  style={{ width: '100%', marginTop: '8px' }}
                />
              </div>
            </Space>
          </Card>

          {/* 网络状态 */}
          <Card className="network-status-card" size="small">
            <Alert
              message="网络连接状态"
              description={
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  {supportedChains.map(chain => (
                    <div key={chain.value} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text>
                        {chain.icon} {chain.label}
                      </Text>
                      <Badge status="success" text="已连接" />
                    </div>
                  ))}
                </Space>
              }
              type="success"
              showIcon
            />
          </Card>
        </Col>
      </Row>

      {/* 添加钱包模态框 */}
      <Modal
        title="添加钱包"
        open={isAddWalletModalVisible}
        onCancel={() => setIsAddWalletModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddWallet}
        >
          <Form.Item
            name="name"
            label="钱包名称"
            rules={[{ required: true, message: '请输入钱包名称' }]}
          >
            <Input placeholder="例如：主钱包" />
          </Form.Item>
          
          <Form.Item
            name="address"
            label="钱包地址"
            rules={[
              { required: true, message: '请输入钱包地址' },
              { pattern: /^0x[a-fA-F0-9]{40}$/, message: '请输入有效的钱包地址' }
            ]}
          >
            <Input placeholder="0x..." />
          </Form.Item>
          
          <Form.Item
            name="chain"
            label="区块链网络"
            rules={[{ required: true, message: '请选择区块链网络' }]}
          >
            <Select placeholder="选择网络">
              {supportedChains.map(chain => (
                <Option key={chain.value} value={chain.value}>
                  {chain.icon} {chain.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setIsAddWalletModalVisible(false)}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                添加
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AutoMonitoringPage;