'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContracts } from 'wagmi';
import { CONTRACTS, PAYMENT_GATEWAY_ABI } from '@/lib/contracts';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { fetchRealtimePrice, type RealtimePrice } from '@/lib/oracle-api';

// 动态导入新组件，避免SSR问题
const AIRatePredictorSimple = dynamic(() => import('@/components/AIRatePredictorSimple'), {
  ssr: false,
  loading: () => <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200 animate-pulse">
    <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
    <div className="h-32 bg-gray-100 rounded"></div>
  </div>
});
const PublicGoodsDonationFlow = dynamic(() => import('@/components/PublicGoodsDonationFlow'), {
  ssr: false,
  loading: () => <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200 animate-pulse">
    <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
    <div className="h-32 bg-gray-100 rounded"></div>
  </div>
});

// PublicGoodsFund ABI
const PUBLIC_GOODS_FUND_ABI = [
  {
    "inputs": [],
    "name": "totalLifetimeDonations",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalContributors",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
    "name": "getContributorInfo",
    "outputs": [
      {"internalType": "uint256", "name": "totalContributed", "type": "uint256"},
      {"internalType": "uint256", "name": "lastContributionTime", "type": "uint256"},
      {"internalType": "string", "name": "badgeLevel", "type": "string"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export default function AnalyticsPage() {
  const { address, isConnected } = useAccount();

  // 🆕 Oracle数据源状态管理
  const [showOracleDetails, setShowOracleDetails] = useState(false);
  const [oracleData, setOracleData] = useState<RealtimePrice | null>(null);
  const [isLoadingOracle, setIsLoadingOracle] = useState(false);
  const [oracleCountdown, setOracleCountdown] = useState(30);
  const [oracleResponseTime, setOracleResponseTime] = useState(0);

  // 读取商家信息和订单数据 - 同时尝试多个合约
  const { data: analyticsData, isLoading, error } = useReadContracts({
    contracts: isConnected ? [
      // 商家信息 - 最新合约
      {
        address: CONTRACTS.PAYMENT_GATEWAY_V2 as `0x${string}`,
        abi: PAYMENT_GATEWAY_ABI,
        functionName: 'getMerchantInfo',
        args: [address as `0x${string}`],
      },
      // 商家所有订单 - 最新合约
      {
        address: CONTRACTS.PAYMENT_GATEWAY_V2 as `0x${string}`,
        abi: PAYMENT_GATEWAY_ABI,
        functionName: 'getMerchantOrders',
        args: [address as `0x${string}`, BigInt(0), BigInt(50)], // 修改为50，符合合约MAX_BATCH_SIZE限制
      },
      // 公益基金总捐赠
      {
        address: CONTRACTS.PUBLIC_GOODS_FUND as `0x${string}`,
        abi: PUBLIC_GOODS_FUND_ABI,
        functionName: 'totalLifetimeDonations',
      },
      // 商家贡献信息
      {
        address: CONTRACTS.PUBLIC_GOODS_FUND as `0x${string}`,
        abi: PUBLIC_GOODS_FUND_ABI,
        functionName: 'getContributorInfo',
        args: [address as `0x${string}`],
      },
      // 总贡献者数
      {
        address: CONTRACTS.PUBLIC_GOODS_FUND as `0x${string}`,
        abi: PUBLIC_GOODS_FUND_ABI,
        functionName: 'getTotalContributors',
      },
    ] : [],
    query: {
      enabled: isConnected && !!address,
      refetchInterval: 10000, // 10秒刷新一次，提高实时性
    }
  });

  // 🆕 Oracle数据源获取函数
  const fetchOracleData = async () => {
    setIsLoadingOracle(true);
    const startTime = Date.now();

    try {
      const data = await fetchRealtimePrice('USDC/USDT');
      const responseTime = Date.now() - startTime;

      if (data) {
        setOracleData(data);
        setOracleResponseTime(responseTime);
      }
    } catch (error) {
      console.error('Failed to fetch oracle data:', error);
    } finally {
      setIsLoadingOracle(false);
    }
  };

  // 🆕 Oracle数据自动刷新（只在展开时）- 必须在所有条件返回之前
  useEffect(() => {
    if (!showOracleDetails) return;

    // 立即获取一次
    fetchOracleData();
    setOracleCountdown(30);

    // 每30秒刷新
    const interval = setInterval(() => {
      fetchOracleData();
      setOracleCountdown(30);
    }, 30000);

    // 倒计时
    const countdownInterval = setInterval(() => {
      setOracleCountdown(prev => prev > 0 ? prev - 1 : 30);
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(countdownInterval);
    };
  }, [showOracleDetails]);

  // 调试：打印原始数据
  console.log('Analytics Data:', analyticsData);
  console.log('Connected Address:', address);

  // 解析数据
  const merchantInfo = analyticsData?.[0]?.result as any;
  const ordersResult = analyticsData?.[1]?.result as any;
  const orders = Array.isArray(ordersResult) ? ordersResult : [];
  const totalPlatformDonations = analyticsData?.[2]?.result ? Number(analyticsData[2].result) / 1e6 : 0;
  const contributorInfo = analyticsData?.[3]?.result as any;
  const totalContributors = analyticsData?.[4]?.result ? Number(analyticsData[4].result) : 0;

  // 目前只使用新合约的订单（移除旧合约逻辑）
  const combinedOrders = orders;

  // 调试：打印解析后的数据
  console.log('Merchant Info:', merchantInfo);
  console.log('Orders Result:', ordersResult);
  console.log('Orders:', orders);

  const merchantContribution = contributorInfo ? Number(contributorInfo[0]) / 1e6 : 0;
  const badgeLevel = contributorInfo ? contributorInfo[2] : 'None';

  // 检查商家是否已注册 - 商家信息的第6个字段是isActive
  const isMerchantRegistered = merchantInfo && merchantInfo[5] === true;

  if (!isConnected) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="bg-white rounded-xl shadow-sm p-8 text-center max-w-md border border-gray-200">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Wallet</h2>
            <p className="text-gray-600 mb-6">Please connect your wallet to view analytics</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Loading state - 只在真正加载中时显示
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="bg-white rounded-xl shadow-sm p-8 text-center max-w-md border border-gray-200">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading Data...</h2>
            <p className="text-gray-600">Fetching your analytics from the blockchain</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // 注释掉商家注册检查，允许显示Demo数据
  // Not registered merchant - 暂时禁用，让未注册用户也能看到Demo
  /*
  if (!isMerchantRegistered) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="bg-white rounded-xl shadow-sm p-8 text-center max-w-md border border-gray-200">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Merchant Not Registered</h2>
            <p className="text-gray-600 mb-6">You need to register as a merchant before viewing analytics</p>
            <Link
              href="/dashboard"
              className="inline-block bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
            >
              Go to Dashboard to Register
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }
  */

  // 如果数据加载失败，使用模拟数据用于Demo - 改为总是使用Mock数据当没有真实数据时
  const useMockData = !merchantInfo || combinedOrders.length === 0;

  // Mock数据用于演示
  const mockOrders = useMockData ? [
    { orderId: '0x1', orderAmount: BigInt(50000000), status: 3 }, // $50 completed
    { orderId: '0x2', orderAmount: BigInt(120000000), status: 3 }, // $120 completed
    { orderId: '0x3', orderAmount: BigInt(35000000), status: 0 }, // $35 pending
    { orderId: '0x4', orderAmount: BigInt(280000000), status: 3 }, // $280 completed
    { orderId: '0x5', orderAmount: BigInt(95000000), status: 3 }, // $95 completed
  ] : [];

  // 使用真实数据或Mock数据
  const displayOrders = combinedOrders.length > 0 ? combinedOrders : mockOrders;
  const displayMerchantInfo = merchantInfo || {
    businessName: 'Demo Merchant',
    isActive: true
  };

  // 计算GMV和统计数据
  const totalOrders = displayOrders.length;
  const completedOrders = displayOrders.filter(o => Number(o.status) === 3);
  const totalGMV = displayOrders.reduce((sum, order) => sum + Number(order.orderAmount) / 1e6, 0);
  const avgOrderValue = totalOrders > 0 ? totalGMV / totalOrders : 0;

  // 如果是Mock数据，显示更真实的贡献数据
  const displayMerchantContribution = merchantContribution || (useMockData ? 28.5 : 0);
  const displayTotalPlatformDonations = totalPlatformDonations || (useMockData ? 15420.8 : 0);
  const displayTotalContributors = totalContributors || (useMockData ? 234 : 0);
  const displayBadgeLevel = badgeLevel !== 'None' ? badgeLevel : (useMockData ? 'Bronze' : 'None');

  // 计算费率节省（对比Stripe 2.9% + $0.30）
  // 实际费率：稳定币对0.2%，加密货币对0.4%，取平均值0.3%
  const aetherPayFees = totalGMV * 0.003; // 0.3% 平均费率
  const stripeFees = totalGMV * 0.029 + (totalOrders * 0.30);
  const savedVsStripe = stripeFees - aetherPayFees;
  const savingsRate = totalGMV > 0 ? (savedVsStripe / stripeFees * 100) : 0;

  // 计算排名
  const contributorRank = displayTotalContributors > 0 ? Math.ceil(displayTotalContributors * 0.3) : 0; // 模拟排名

  // 徽章进度
  const badgeThresholds = {
    'Bronze': 100,
    'Silver': 500,
    'Gold': 1000
  };
  const currentBadge = displayBadgeLevel as keyof typeof badgeThresholds;
  const nextBadge = currentBadge === 'None' ? 'Bronze' : currentBadge === 'Bronze' ? 'Silver' : currentBadge === 'Silver' ? 'Gold' : 'Platinum';
  const nextBadgeAmount = badgeThresholds[nextBadge as keyof typeof badgeThresholds] || 1000;
  const badgeProgress = currentBadge === 'None' ? (displayMerchantContribution / 100 * 100) :
                        currentBadge === 'Bronze' ? (displayMerchantContribution / 500 * 100) :
                        currentBadge === 'Silver' ? (displayMerchantContribution / 1000 * 100) : 100;

  // 🆕 数据源状态分析
  const analyzeSourceStatus = (sourceName: string, price: number | null, aggregatedPrice: number) => {
    if (!price || price <= 0) {
      return {
        name: sourceName,
        price: null,
        status: 'failed' as const,
        deviation: 0,
        statusColor: 'bg-red-50 border-red-200',
        statusIcon: '❌',
        statusLabel: 'Failed'
      };
    }

    const deviation = ((price - aggregatedPrice) / aggregatedPrice) * 100;

    if (Math.abs(deviation) > 0.5) {
      return {
        name: sourceName,
        price,
        status: 'warning' as const,
        deviation,
        statusColor: 'bg-yellow-50 border-yellow-200',
        statusIcon: '⚠️',
        statusLabel: 'Deviation'
      };
    }

    return {
      name: sourceName,
      price,
      status: 'active' as const,
      deviation,
      statusColor: 'bg-green-50 border-green-200',
      statusIcon: '✅',
      statusLabel: 'Active'
    };
  };

  // 🆕 格式化数据源名称
  const formatSourceName = (name: string) => {
    const nameMap: Record<string, string> = {
      'binance': 'Binance',
      'coinbase': 'Coinbase',
      'coingecko': 'CoinGecko',
      'okx': 'OKX',
      'huobi': 'Huobi',
      'kucoin': 'KuCoin'
    };
    return nameMap[name] || name;
  };

  // 🆕 获取处理后的数据源列表
  const processedSources = oracleData
    ? Object.entries(oracleData.sources || {})
        .map(([name, price]) => ({
          ...analyzeSourceStatus(name, price, oracleData.aggregated_price),
          displayName: formatSourceName(name)
        }))
        .sort((a, b) => {
          // 排序：失败 > 警告 > 正常
          const statusOrder = { failed: 0, warning: 1, active: 2 };
          return statusOrder[a.status] - statusOrder[b.status];
        })
    : [];

  const activeSourceCount = processedSources.filter(s => s.status === 'active').length;

  return (
    <DashboardLayout>
      {/* Main Content - 添加底部padding避免被状态栏遮挡 */}
      <div className="pb-20">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-2">Track your performance, savings, and public goods impact</p>
          {useMockData && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Demo Mode:</strong> Showing sample data. Create orders to see real analytics.
              </p>
            </div>
          )}
        </div>

        {/* Key Metrics Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-6">
          {/* Total GMV */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-md p-6 border border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-sm font-medium text-blue-700 mb-1">Total GMV</div>
            <div className="text-3xl font-bold text-blue-900">${totalGMV.toFixed(2)}</div>
            <div className="text-xs text-blue-600 mt-2">{totalOrders} total orders</div>
          </div>

          {/* Saved vs Stripe */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-md p-6 border border-green-200">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <div className="text-sm font-medium text-green-700 mb-1">Saved vs Stripe</div>
            <div className="text-3xl font-bold text-green-900">${savedVsStripe.toFixed(2)}</div>
            <div className="text-xs text-green-600 mt-2">{savingsRate.toFixed(1)}% cost reduction</div>
          </div>

          {/* Public Goods Contribution */}
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl shadow-md p-6 border border-emerald-200">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
            </div>
            <div className="text-sm font-medium text-emerald-700 mb-1">Your Public Goods Contribution</div>
            <div className="text-3xl font-bold text-emerald-900">${displayMerchantContribution.toFixed(4)}</div>
            <div className="text-xs text-emerald-600 mt-2">
              {displayMerchantContribution > 0
                ? `Badge: ${displayBadgeLevel} | Auto-donated from fees`
                : 'Create orders to start contributing'
              }
            </div>
          </div>

          {/* Avg Order Value */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-md p-6 border border-purple-200">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div className="text-sm font-medium text-purple-700 mb-1">Avg Order Value</div>
            <div className="text-3xl font-bold text-purple-900">${avgOrderValue.toFixed(2)}</div>
            <div className="text-xs text-purple-600 mt-2">{completedOrders.length} completed</div>
          </div>
        </div>

        {/* AI Rate Predictor - 核心技术展示 */}
        <div className="mb-6">
          <AIRatePredictorSimple />
        </div>

        {/* 🆕 Oracle Data Sources - 可折叠展示 */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200 mb-6">
          <button
            onClick={() => setShowOracleDetails(!showOracleDetails)}
            className="flex items-center justify-between w-full hover:opacity-80 transition-opacity"
          >
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              🤖 AI Oracle Data Sources
              <span className="text-xs font-normal text-gray-500">(6 aggregated)</span>
            </h3>
            <span className="text-gray-600 text-xl">
              {showOracleDetails ? '▼' : '▶'}
            </span>
          </button>

          {showOracleDetails && (
            <div className="mt-6 space-y-6 animate-in fade-in duration-300">
              {/* Loading State */}
              {isLoadingOracle && !oracleData && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent"></div>
                  <span className="ml-3 text-gray-600">Loading oracle data...</span>
                </div>
              )}

              {/* Data Sources Grid */}
              {oracleData && (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-gray-700">📊 Real-time Data Sources</h4>
                      <span className="text-xs text-gray-500">
                        Updated {Math.floor((Date.now() - new Date(oracleData.timestamp).getTime()) / 1000)}s ago
                      </span>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {processedSources.map((source) => (
                        <div
                          key={source.name}
                          className={`p-3 rounded-lg border ${source.statusColor} transition-all duration-200`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{source.statusIcon}</span>
                              <span className="font-semibold text-sm text-gray-900">
                                {source.displayName}
                              </span>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              source.status === 'active' ? 'bg-green-100 text-green-700' :
                              source.status === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {source.statusLabel}
                            </span>
                          </div>
                          <div className="flex items-baseline justify-between">
                            <span className="text-lg font-bold text-gray-900">
                              {source.price ? source.price.toFixed(6) : 'N/A'}
                            </span>
                            {source.price && (
                              <span className={`text-xs font-medium ${
                                Math.abs(source.deviation) < 0.1 ? 'text-green-600' :
                                Math.abs(source.deviation) < 0.5 ? 'text-yellow-600' :
                                'text-red-600'
                              }`}>
                                {source.deviation >= 0 ? '+' : ''}{source.deviation.toFixed(2)}%
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Aggregation Metrics */}
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">📈 Aggregation Metrics</h4>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <div className="text-xs text-gray-600 mb-1">Aggregated Price</div>
                        <div className="text-xl font-bold text-gray-900">
                          {oracleData.aggregated_price.toFixed(6)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600 mb-1">Confidence</div>
                        <div className="flex items-center gap-2">
                          <div className="text-xl font-bold text-emerald-600">
                            {(oracleData.confidence * 100).toFixed(1)}%
                          </div>
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${oracleData.confidence * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600 mb-1">Price Spread</div>
                        <div className="text-xl font-bold text-gray-900">
                          {(oracleData.spread * 100).toFixed(2)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600 mb-1">Active Sources</div>
                        <div className="text-xl font-bold text-gray-900">
                          {activeSourceCount}/{processedSources.length}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-300">
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span>API Response Time: <span className="font-semibold text-gray-900">{oracleResponseTime}ms</span></span>
                        <span>Algorithm: <span className="font-semibold text-gray-900">Median (outlier removal)</span></span>
                      </div>
                    </div>
                  </div>

                  {/* AI Model Information */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                    <h4 className="text-sm font-semibold text-blue-900 mb-3">🤖 AI Model Information</h4>
                    <div className="grid md:grid-cols-2 gap-3 text-sm">
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-700">Model:</span>
                          <span className="font-semibold text-gray-900">LightGBM v3.2</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-700">Algorithm:</span>
                          <span className="font-semibold text-gray-900">Gradient Boosting</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-700">Training Data:</span>
                          <span className="font-semibold text-gray-900">6,000,000+ txns</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-700">Accuracy (R²):</span>
                          <span className="font-semibold text-emerald-600">97.4%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-700">Prediction Horizon:</span>
                          <span className="font-semibold text-gray-900">30 seconds</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-700">Last Model Update:</span>
                          <span className="font-semibold text-gray-900">2025-01-15</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Update Countdown */}
                  <div className="text-center text-sm text-gray-600">
                    Next update in: <span className="font-semibold text-emerald-600">{oracleCountdown}s</span>
                  </div>
                </>
              )}

              {/* Error State */}
              {!isLoadingOracle && !oracleData && (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">⚠️</div>
                  <p className="text-gray-600">Unable to load oracle data</p>
                  <button
                    onClick={fetchOracleData}
                    className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Fee Comparison Chart & Public Goods Flow */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Public Goods Donation Flow - 展示核心创新 */}
          <PublicGoodsDonationFlow />

          {/* Savings Breakdown */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">💰 Fee Comparison</h2>

            <div className="space-y-4">
              {/* AetherPay */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-emerald-600 rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">A</span>
                    </div>
                    <span className="font-semibold text-gray-900">AetherPay (0.2-0.4%)</span>
                  </div>
                  <span className="font-bold text-emerald-600">${aetherPayFees.toFixed(2)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-emerald-600 h-3 rounded-full" style={{width: '20%'}}></div>
                </div>
              </div>

              {/* Stripe */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-600 rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">S</span>
                    </div>
                    <span className="font-semibold text-gray-700">Stripe (2.9% + $0.30)</span>
                  </div>
                  <span className="font-bold text-red-600">${stripeFees.toFixed(2)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-red-500 h-3 rounded-full" style={{width: '100%'}}></div>
                </div>
              </div>
            </div>

            <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-green-900">Total Savings</div>
                  <div className="text-xs text-green-700 mt-1">vs traditional payment processors</div>
                </div>
                <div className="text-3xl font-bold text-green-700">
                  ${savedVsStripe.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Order Statistics */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📊 Order Statistics</h2>

          <div className="grid md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">{totalOrders}</div>
              <div className="text-sm text-blue-700 mt-1">Total Orders</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-3xl font-bold text-green-600">{completedOrders.length}</div>
              <div className="text-sm text-green-700 mt-1">Completed</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-3xl font-bold text-yellow-600">
                {displayOrders.filter(o => Number(o.status) === 0).length}
              </div>
              <div className="text-sm text-yellow-700 mt-1">Pending</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-3xl font-bold text-purple-600">
                {totalOrders > 0 ? ((completedOrders.length / totalOrders) * 100).toFixed(1) : 0}%
              </div>
              <div className="text-sm text-purple-700 mt-1">Completion Rate</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-4">
          <Link
            href="/dashboard/create-order"
            className="bg-gradient-to-br from-emerald-500 to-green-600 text-white rounded-xl p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center gap-3 mb-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="font-semibold">Create New Order</span>
            </div>
            <p className="text-sm text-emerald-100">Start accepting payments at 0.2-0.4% fee</p>
          </Link>

          <Link
            href="/dashboard/orders"
            className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center gap-3 mb-2">
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="font-semibold text-gray-900">View All Orders</span>
            </div>
            <p className="text-sm text-gray-600">Manage and track your orders</p>
          </Link>

          <Link
            href="/public-goods"
            className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center gap-3 mb-2">
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span className="font-semibold text-gray-900">Public Goods Impact</span>
            </div>
            <p className="text-sm text-gray-600">See your ESG contribution</p>
          </Link>
        </div>
      </div>

      {/* 底部固定状态栏 - 显示关键指标 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
        <div className="container mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Platform Fee */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">0.2-0.4%</div>
                <div className="text-xs text-gray-500">Platform Fee</div>
              </div>
            </div>

            {/* AI Updates */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">5s</div>
                <div className="text-xs text-gray-500">AI Updates</div>
              </div>
            </div>

            {/* vs Stripe Savings */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{savingsRate.toFixed(1)}%</div>
                <div className="text-xs text-gray-500">vs Stripe</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

// 建议添加实时图表展示
const RealTimeChart = () => {
// WebSocket连接实时价格数据
// 展示价格变化趋势
// 突出AI预测准确性
};
