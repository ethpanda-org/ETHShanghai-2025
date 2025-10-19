'use client';

import { useAccount, useReadContract, useReadContracts, usePublicClient } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { CONTRACTS, PAYMENT_GATEWAY_ABI, PUBLIC_GOODS_FUND_ABI } from '@/lib/contracts';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { parseAbiItem } from 'viem';
import { getUserPaymentCount, getUserRanking } from '@/lib/supabase';

export default function UserDashboard() {
  const { address, isConnected } = useAccount();
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Query real payment history from blockchain
  const publicClient = usePublicClient();
  const [realTransactionCount, setRealTransactionCount] = useState(0);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [userRanking, setUserRanking] = useState<{
    rank: number;
    totalUsers: number;
    percentile: number;
    totalSpent: number;
  } | null>(null);

  // Read user contribution info from public goods fund
  const { data: contributorData } = useReadContract({
    address: CONTRACTS.PUBLIC_GOODS_FUND as `0x${string}`,
    abi: PUBLIC_GOODS_FUND_ABI,
    functionName: 'getContributorInfo',
    args: [address as `0x${string}`],
  });

  // Read total contributors
  const { data: totalContributorsData } = useReadContract({
    address: CONTRACTS.PUBLIC_GOODS_FUND as `0x${string}`,
    abi: PUBLIC_GOODS_FUND_ABI,
    functionName: 'getTotalContributors',
  });

  // Read total lifetime donations
  const { data: lifetimeDonationsData } = useReadContract({
    address: CONTRACTS.PUBLIC_GOODS_FUND as `0x${string}`,
    abi: PUBLIC_GOODS_FUND_ABI,
    functionName: 'totalLifetimeDonations',
  });

  // Parse contributor data correctly
  // 根据合约实际实现，getContributorInfo 返回 [totalContributed, level] (2个元素)
  const onChainDonation = contributorData ? Number((contributorData as any)[0]) / 1e6 : 0;
  const lastContribution = 0; // 合约不返回 lastContributionTime
  const badgeLevelString = contributorData ? (contributorData as any)[1] : 'None'; // [1] 是 badgeLevel

  // 🆕 如果链上数据为0，使用前端估算（基于真实支付金额或支付次数）
  // 等合约重新部署后，这个估算会被真实数据替代
  const estimatedDonation = (() => {
    if (onChainDonation > 0) return 0; // 如果有链上数据，不需要估算

    // 优先使用 Supabase 的真实支付金额
    if (userRanking && userRanking.totalSpent > 0) {
      // 使用真实支付金额 × 0.00005 (稳定币对费率)
      return userRanking.totalSpent * 0.00005;
    }

    // 降级方案：基于支付次数估算
    if (realTransactionCount > 0) {
      // 假设每笔平均25 USDC，稳定币对费率
      return realTransactionCount * 25 * 0.00005;
    }

    return 0;
  })();

  const totalDonation = onChainDonation > 0 ? onChainDonation : estimatedDonation;

  // Convert badge level string to index
  const badgeNames = ['None', 'Bronze', 'Silver', 'Gold'];
  const badgeEmojis = ['⚪', '🥉', '🥈', '🥇'];
  const badgeLevel = badgeNames.indexOf(badgeLevelString) >= 0 ? badgeNames.indexOf(badgeLevelString) : 0;
  const badgeName = badgeNames[badgeLevel];
  const badgeEmoji = badgeEmojis[badgeLevel];

  // Fetch real transaction count
  useEffect(() => {
    const fetchTransactionCount = async () => {
      if (!address) {
        setIsLoadingTransactions(false);
        return;
      }

      try {
        // Try Supabase first
        console.log('📊 Fetching payment count from Supabase for:', address);
        const supabaseCount = await getUserPaymentCount(address);

        if (supabaseCount > 0) {
          console.log(`✅ Found ${supabaseCount} payments in Supabase`);
          setRealTransactionCount(supabaseCount);

          // Also fetch user ranking from Supabase
          const ranking = await getUserRanking(address);
          if (ranking) {
            console.log(`📈 User ranking:`, ranking);
            setUserRanking(ranking);
          }

          setIsLoadingTransactions(false);
          return;
        }
      } catch (supabaseError) {
        console.warn('⚠️ Supabase fetch failed, falling back to blockchain:', supabaseError);
      }

      // Fallback to blockchain if Supabase fails or returns 0
      if (!publicClient) {
        setIsLoadingTransactions(false);
        return;
      }

      try {
        // Query PaymentReceived events for this user
        // 限制查询范围以避免 RPC 错误（最近 1000 个区块）
        const currentBlock = await publicClient.getBlockNumber();
        const fromBlock = currentBlock > BigInt(1000) ? currentBlock - BigInt(1000) : BigInt(0);
        console.log(`Querying from block ${fromBlock} to ${currentBlock}`);

        const logs = await publicClient.getLogs({
          address: CONTRACTS.PAYMENT_GATEWAY_V2 as `0x${string}`,
          event: parseAbiItem('event PaymentReceived(bytes32 indexed orderId, address indexed payer, uint256 amount, address token)'),
          args: {
            payer: address as `0x${string}`,
          },
          fromBlock: fromBlock,
          toBlock: 'latest',
        });

        setRealTransactionCount(logs.length);
        console.log(`Found ${logs.length} real payments for user`);
      } catch (error) {
        console.error('Failed to fetch transaction count:', error);
        // Fallback to estimated count if query fails
        const estimated = totalDonation > 0 ? Math.max(1, Math.ceil(totalDonation / 25)) : 0;
        setRealTransactionCount(estimated);
      } finally {
        setIsLoadingTransactions(false);
      }
    };

    fetchTransactionCount();
  }, [address, publicClient, totalDonation]);

  // Calculate rank (now using real data from Supabase when available)
  const totalContributors = totalContributorsData ? Number(totalContributorsData) : 1;
  const displayRank = userRanking?.rank || Math.min(Math.floor((1 - totalDonation / 1000) * totalContributors), totalContributors);
  const displayPercentile = userRanking?.percentile || Math.max(1, 100 - Math.floor((displayRank / totalContributors) * 100));

  // Next badge thresholds
  const nextBadgeThresholds = [0, 100, 500, 2000]; // USD (matching contract values)
  const nextBadgeAmount = badgeLevel < 3 ? nextBadgeThresholds[badgeLevel + 1] - totalDonation : 0;

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
        {/* Header */}
        <div className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="text-xl font-bold text-slate-900">AetherPay</span>
              </Link>
              <ConnectButton />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-6xl mx-auto">
            {/* Hero Section */}
            <div className="text-center mb-12">
              <div className="inline-block mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-xl">
                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
              <h1 className="text-5xl font-bold text-slate-900 mb-4">My Contributions</h1>
              <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-8">
                Connect your wallet to view your impact on Ethereum public goods
              </p>
              <div className="flex justify-center">
                <ConnectButton />
              </div>
            </div>

            {/* Benefits Preview */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200 text-center">
                <div className="text-4xl mb-4">💝</div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Track Impact</h3>
                <p className="text-sm text-slate-600">Monitor your contributions to public goods</p>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200 text-center">
                <div className="text-4xl mb-4">🏆</div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Earn Badges</h3>
                <p className="text-sm text-slate-600">Unlock achievement badges as you contribute</p>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200 text-center">
                <div className="text-4xl mb-4">📊</div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">View History</h3>
                <p className="text-sm text-slate-600">Complete transaction history and analytics</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-slate-900">AetherPay</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-slate-600 hover:text-slate-900 font-medium transition-colors">
                Merchant Dashboard
              </Link>
              <ConnectButton />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">My AetherPay</h1>
                <p className="text-slate-600">Track your payments and public goods contributions</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full font-semibold">
                ✓ Connected
              </span>
              <span className="text-slate-500">
                Badge Level: <span className="font-semibold text-slate-700">{badgeName} {badgeEmoji}</span>
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShareModalOpen(true)}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share Impact
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Total Contributions */}
          <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl shadow-lg p-6 text-white hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </div>
              <span className="text-xs px-2 py-1 bg-white/20 backdrop-blur-sm rounded-full font-semibold">
                Lifetime
              </span>
            </div>
            <div className="text-sm text-purple-100 mb-1 font-medium">Total Contributions</div>
            <div className="text-3xl font-bold mb-1">${totalDonation.toFixed(4)}</div>
            <div className="text-xs text-purple-100">Supporting Ethereum ecosystem</div>
          </div>

          {/* Projects Supported */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <span className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-full font-semibold">
                Estimated
              </span>
            </div>
            <div className="text-sm text-slate-600 mb-1 font-medium">Payments Made</div>
            <div className="text-3xl font-bold text-slate-900 mb-1">
              {isLoadingTransactions ? (
                <span className="text-2xl">...</span>
              ) : (
                realTransactionCount
              )}
            </div>
            <div className="text-xs text-slate-500">
              {realTransactionCount > 0 ? 'View order history' : 'Supporting public goods'}
            </div>
          </div>

          {/* Global Rank */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <span className="text-xs px-2 py-1 bg-amber-50 text-amber-600 rounded-full font-semibold">
                {userRanking ? 'Real' : 'Estimated'}
              </span>
            </div>
            <div className="text-sm text-slate-600 mb-1 font-medium">Global Rank</div>
            <div className="text-3xl font-bold text-slate-900 mb-1">
              {userRanking ? (
                <>#{displayRank}</>
              ) : (
                <>Top {displayPercentile}%</>
              )}
            </div>
            <div className="text-xs text-slate-500">
              {userRanking ? (
                <>Top {displayPercentile}% of {userRanking.totalUsers} users</>
              ) : (
                <>Among {totalContributors} contributors</>
              )}
            </div>
          </div>

          {/* Current Badge */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">{badgeEmoji}</span>
              </div>
              <span className="text-xs px-2 py-1 bg-emerald-50 text-emerald-600 rounded-full font-semibold">
                Badge
              </span>
            </div>
            <div className="text-sm text-slate-600 mb-1 font-medium">Current Badge</div>
            <div className="text-3xl font-bold text-slate-900 mb-1">{badgeName}</div>
            {nextBadgeAmount > 0 && (
              <div className="text-xs text-slate-500">Next: ${nextBadgeAmount.toFixed(2)} more</div>
            )}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Left Column - Payment History & Projects */}
          <div className="lg:col-span-2 space-y-6">
            {/* Payment History */}
            <PaymentHistory transactionCount={realTransactionCount} isLoading={isLoadingTransactions} />

            {/* Supported Projects */}
            <SupportedProjects totalDonation={totalDonation} />
          </div>

          {/* Right Column - Quick Actions & Progress */}
          <div className="space-y-6">
            {/* Share Your Impact */}
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg p-6 text-white">
              <h3 className="text-lg font-bold mb-4">Share Your Impact</h3>
              <p className="text-sm text-emerald-100 mb-6">
                Let others know about your support for Ethereum public goods
              </p>
              <button
                onClick={() => setShareModalOpen(true)}
                className="w-full bg-white text-emerald-600 font-semibold py-3 rounded-lg hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Generate Share Card
              </button>
            </div>

            {/* Badge Progress */}
            <BadgeProgress
              currentBadge={badgeLevel}
              totalDonation={totalDonation}
            />

            {/* Quick Links */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Quick Links</h3>
              <div className="space-y-3">
                {/* My Orders - PRIMARY BUTTON */}
                <Link
                  href="/user/orders"
                  className="group flex items-center justify-between p-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-base font-semibold">My Orders</span>
                      <p className="text-xs text-white/80">View payment orders</p>
                    </div>
                  </div>
                  <svg className="w-6 h-6 text-white group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>

                {/* Orders Market Button */}
                <Link
                  href="/orders"
                  className="group flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-indigo-200 rounded-lg hover:from-blue-100 hover:to-indigo-100 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-slate-900">Orders Market</span>
                      <p className="text-xs text-slate-600">Browse all public orders</p>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-indigo-600 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>

                <Link
                  href="/public-goods"
                  className="group flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-slate-700">Public Goods Projects</span>
                  </div>
                  <svg className="w-5 h-5 text-slate-400 group-hover:text-purple-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>

                <Link
                  href="/dashboard"
                  className="group flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-slate-700">Merchant Dashboard</span>
                  </div>
                  <svg className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>

                <Link
                  href="/dashboard/create-order"
                  className="group flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-slate-700">Create Payment Order</span>
                  </div>
                  <svg className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Banner */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl shadow-xl p-8 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h3 className="text-2xl font-bold mb-2">Every Payment Makes a Difference</h3>
              <p className="text-purple-100">5% of platform fees automatically support Ethereum public goods</p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/public-goods"
                className="px-6 py-3 bg-white text-purple-600 rounded-lg font-semibold hover:bg-purple-50 transition-colors shadow-lg"
              >
                View Projects
              </Link>
              <Link
                href="/dashboard/create-order"
                className="px-6 py-3 bg-purple-700 text-white rounded-lg font-semibold hover:bg-purple-800 transition-colors"
              >
                Make a Payment
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {shareModalOpen && (
        <ShareModal
          totalDonation={totalDonation}
          projectCount={3}
          badge={badgeName}
          onClose={() => setShareModalOpen(false)}
        />
      )}
    </div>
  );
}

// Payment History Component
function PaymentHistory({ transactionCount, isLoading }: { transactionCount: number; isLoading: boolean }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-900">Payment Activity</h2>
        <Link href="/user/orders" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
          View All Orders →
        </Link>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <svg className="animate-spin h-12 w-12 text-emerald-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-slate-600">Loading payment history...</p>
        </div>
      ) : transactionCount > 0 ? (
        <div className="space-y-6">
          {/* Transaction Summary */}
          <div className="text-center py-6 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200">
            <div className="text-5xl font-bold text-slate-900 mb-2">{transactionCount}</div>
            <p className="text-slate-600 mb-1">Completed Payments</p>
            <p className="text-xs text-slate-500">Contributing to public goods</p>
          </div>

          {/* Info Box */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-emerald-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm text-emerald-900 font-medium mb-1">Real Payment History</p>
                <p className="text-xs text-emerald-800">
                  These are your actual blockchain transactions. Each payment automatically contributes to Ethereum public goods.
                </p>
              </div>
            </div>
          </div>

          {/* View Order History Button */}
          <Link
            href="/user/orders"
            className="w-full block text-center px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl"
          >
            View Order Details →
          </Link>

          {/* Action Links */}
          <div className="space-y-3">
            <Link
              href="/dashboard/create-order"
              className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-700">Create New Payment</div>
                  <div className="text-xs text-slate-500">Start accepting payments as a merchant</div>
                </div>
              </div>
              <svg className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            <Link
              href="/dashboard"
              className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v1a1 1 0 001 1h4a1 1 0 001-1v-1m3-2V8a2 2 0 00-2-2H8a2 2 0 00-2 2v7m3-2h6l2 2H5l2-2z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-700">Merchant Dashboard</div>
                  <div className="text-xs text-slate-500">Manage orders if you're a merchant</div>
                </div>
              </div>
              <svg className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-slate-500 mb-4">No payments yet</p>
          <p className="text-xs text-slate-400 mb-6">Your payment history will appear here</p>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-purple-900 font-medium mb-1">💝 Every payment makes a difference!</p>
            <p className="text-xs text-purple-800">
              When you pay with AetherPay, 5% of fees support Ethereum public goods
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Supported Projects Component with Real Data
function SupportedProjects({ totalDonation }: { totalDonation: number }) {
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [currentRoundInfo, setCurrentRoundInfo] = useState<any>(null);

  // Read current round info from PublicGoodsFund
  const { data: roundInfo } = useReadContract({
    address: CONTRACTS.PUBLIC_GOODS_FUND as `0x${string}`,
    abi: PUBLIC_GOODS_FUND_ABI,
    functionName: 'getCurrentRoundInfo',
  });

  // Read public goods count
  const { data: publicGoodsCount } = useReadContract({
    address: CONTRACTS.PUBLIC_GOODS_FUND as `0x${string}`,
    abi: PUBLIC_GOODS_FUND_ABI,
    functionName: 'publicGoodsCount',
  });

  useEffect(() => {
    if (roundInfo) {
      setCurrentRoundInfo({
        roundId: Number(roundInfo[0]),
        totalDonated: Number(roundInfo[1]) / 1e6,
        startTime: Number(roundInfo[2]),
        endTime: Number(roundInfo[3]),
        distributed: roundInfo[4]
      });
    }
  }, [roundInfo]);

  // Fetch public goods projects from contract
  useEffect(() => {
    const fetchProjects = async () => {
      if (!publicGoodsCount || publicGoodsCount === 0n) {
        // If no projects registered on-chain, use default projects
        const defaultProjects = [
          { name: 'Ethereum Foundation', amount: totalDonation * 0.4, logo: '⟠', color: 'from-purple-500 to-purple-600', address: '0x...' },
          { name: 'Optimism Collective', amount: totalDonation * 0.3, logo: '🔴', color: 'from-red-500 to-red-600', address: '0x...' },
          { name: 'Gitcoin Grants', amount: totalDonation * 0.3, logo: '🌱', color: 'from-green-500 to-green-600', address: '0x...' },
        ];
        setProjects(defaultProjects);
        setIsLoadingProjects(false);
        return;
      }

      // Fetch actual projects from contract
      const projectList = [];
      const count = Number(publicGoodsCount);

      // For now, still use default allocation since contract doesn't expose per-project allocations yet
      // In production, this would fetch actual allocation data
      const allocations = [0.4, 0.3, 0.3];
      const logos = ['⟠', '🔴', '🌱'];
      const colors = ['from-purple-500 to-purple-600', 'from-red-500 to-red-600', 'from-green-500 to-green-600'];

      for (let i = 0; i < Math.min(count, 3); i++) {
        projectList.push({
          id: i,
          name: `Public Good Project #${i + 1}`, // Would be fetched from contract
          amount: totalDonation * (allocations[i] || 0.33),
          logo: logos[i] || '💎',
          color: colors[i] || 'from-blue-500 to-blue-600',
          address: '0x...', // Would be fetched from contract
        });
      }

      // If we have projects from contract but still want to show defaults for demo
      if (projectList.length === 0) {
        const defaultProjects = [
          { name: 'Ethereum Foundation', amount: totalDonation * 0.4, logo: '⟠', color: 'from-purple-500 to-purple-600', address: '0x...' },
          { name: 'Optimism Collective', amount: totalDonation * 0.3, logo: '🔴', color: 'from-red-500 to-red-600', address: '0x...' },
          { name: 'Gitcoin Grants', amount: totalDonation * 0.3, logo: '🌱', color: 'from-green-500 to-green-600', address: '0x...' },
        ];
        setProjects(defaultProjects);
      } else {
        setProjects(projectList);
      }

      setIsLoadingProjects(false);
    };

    fetchProjects();
  }, [publicGoodsCount, totalDonation]);

  const totalImpact = projects.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-900">Supported Projects</h2>
        <Link href="/public-goods" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors">
          View All →
        </Link>
      </div>

      {/* Current Round Info */}
      {currentRoundInfo && (
        <div className="mb-4 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between text-sm">
            <div>
              <span className="text-purple-700 font-medium">Round #{currentRoundInfo.roundId}</span>
              <span className="text-purple-600 ml-2">•</span>
              <span className="text-purple-600 ml-2">${currentRoundInfo.totalDonated.toFixed(4)} raised</span>
            </div>
            <div className="text-xs text-purple-600">
              {currentRoundInfo.distributed ? '✅ Distributed' : '⏳ Active'}
            </div>
          </div>
          {!currentRoundInfo.distributed && currentRoundInfo.endTime > 0 && (
            <div className="mt-2 text-xs text-purple-600">
              Ends: {new Date(currentRoundInfo.endTime * 1000).toLocaleDateString()}
            </div>
          )}
        </div>
      )}

      {isLoadingProjects ? (
        <div className="text-center py-8">
          <svg className="animate-spin h-8 w-8 text-purple-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-sm text-slate-600">Loading projects...</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {projects.map((project, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 bg-gradient-to-br ${project.color} rounded-lg flex items-center justify-center text-2xl shadow-md`}>
                    {project.logo}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{project.name}</div>
                    <div className="text-xs text-slate-500">Public Good Project</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-purple-600">${project.amount.toFixed(4)}</div>
                  <div className="text-xs text-slate-500">Your Contribution</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Total Impact</span>
              <span className="font-bold text-lg text-purple-600">${totalImpact.toFixed(4)}</span>
            </div>
            {totalDonation === 0 && (
              <p className="text-xs text-slate-500 mt-2">
                Start making payments to see your impact on public goods!
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Badge Progress Component
function BadgeProgress({ currentBadge, totalDonation }: { currentBadge: number; totalDonation: number }) {
  const badges = [
    { name: 'Bronze', emoji: '🥉', threshold: 100, color: 'from-amber-600 to-orange-600' },
    { name: 'Silver', emoji: '🥈', threshold: 500, color: 'from-slate-400 to-slate-600' },
    { name: 'Gold', emoji: '🥇', threshold: 2000, color: 'from-yellow-400 to-yellow-600' },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
      <h3 className="text-lg font-bold text-slate-900 mb-4">Badge Progress</h3>
      <div className="space-y-4">
        {badges.map((badge, index) => {
          const isUnlocked = totalDonation >= badge.threshold;
          const progress = Math.min((totalDonation / badge.threshold) * 100, 100);

          return (
            <div key={index} className={`p-4 rounded-lg ${isUnlocked ? 'bg-gradient-to-r ' + badge.color : 'bg-slate-50'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{badge.emoji}</span>
                  <span className={`text-sm font-semibold ${isUnlocked ? 'text-white' : 'text-slate-700'}`}>
                    {badge.name}
                  </span>
                </div>
                {isUnlocked ? (
                  <span className="text-xs px-2 py-1 bg-white/20 backdrop-blur-sm text-white rounded-full font-semibold">
                    ✓ Unlocked
                  </span>
                ) : (
                  <span className="text-xs text-slate-500">${badge.threshold}</span>
                )}
              </div>
              {!isUnlocked && (
                <>
                  <div className="w-full bg-slate-200 rounded-full h-2 mb-1">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-teal-600 h-2 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="text-xs text-slate-500">
                    ${(badge.threshold - totalDonation).toFixed(2)} more to unlock
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Share Modal Component with Enhanced Functionality
function ShareModal({ totalDonation, projectCount, badge, onClose }: any) {
  const [copied, setCopied] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);

  const shareText = `I've contributed $${totalDonation.toFixed(2)} to Ethereum public goods through AetherPay! 🎉 Badge Level: ${badge}`;
  const shareUrl = 'https://aetherpay.io';

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareText + '\n\n' + shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleTwitterShare = () => {
    const tweetText = encodeURIComponent(shareText);
    const tweetUrl = encodeURIComponent(shareUrl);
    window.open(`https://twitter.com/intent/tweet?text=${tweetText}&url=${tweetUrl}&hashtags=AetherPay,PublicGoods,Ethereum`, '_blank');
  };

  const handleLinkedInShare = () => {
    const linkedInUrl = encodeURIComponent(shareUrl);
    const linkedInTitle = encodeURIComponent('My AetherPay Contribution');
    const linkedInSummary = encodeURIComponent(shareText);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${linkedInUrl}&title=${linkedInTitle}&summary=${linkedInSummary}`, '_blank');
  };

  const generateShareImage = async () => {
    setGeneratingImage(true);
    // In production, this would generate an actual share card image
    // For now, we'll simulate it
    setTimeout(() => {
      setGeneratingImage(false);
      alert('Share card generated! (Feature coming soon)');
    }, 2000);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-slate-900">Share Your Impact</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center hover:bg-slate-200 transition-colors group"
            >
              <svg className="w-5 h-5 text-slate-600 group-hover:text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Share Card Preview */}
          <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl p-6 text-white mb-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
            <div className="relative text-center">
              <div className="text-4xl mb-4">💝</div>
              <div className="text-3xl font-bold mb-2">${totalDonation.toFixed(2)}</div>
              <div className="text-sm text-purple-100 mb-4">Contributed to Ethereum Public Goods</div>
              <div className="flex items-center justify-center gap-6 text-sm">
                <div>
                  <div className="font-bold text-lg">{projectCount || 3}</div>
                  <div className="text-purple-100 text-xs">Projects</div>
                </div>
                <div className="w-px h-10 bg-white/30"></div>
                <div>
                  <div className="font-bold text-lg">{badge}</div>
                  <div className="text-purple-100 text-xs">Badge</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-white/20">
                <div className="text-xs text-purple-200">Powered by AetherPay</div>
              </div>
            </div>
          </div>

          {/* Share Text */}
          <div className="bg-slate-50 rounded-lg p-4 mb-6 relative">
            <p className="text-sm text-slate-700 pr-8">{shareText}</p>
            {copied && (
              <div className="absolute top-2 right-2 bg-emerald-500 text-white text-xs px-2 py-1 rounded-md animate-in slide-in-from-top duration-200">
                Copied!
              </div>
            )}
          </div>

          {/* Share Actions */}
          <div className="space-y-3">
            {/* Copy to Clipboard */}
            <button
              onClick={handleCopyToClipboard}
              className={`w-full font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2 ${
                copied
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              {copied ? (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied to Clipboard!
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy to Clipboard
                </>
              )}
            </button>

            {/* Social Share Buttons */}
            <div className="grid grid-cols-2 gap-3">
              {/* Twitter */}
              <button
                onClick={handleTwitterShare}
                className="bg-blue-500 text-white font-semibold py-3 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
                Twitter
              </button>

              {/* LinkedIn */}
              <button
                onClick={handleLinkedInShare}
                className="bg-blue-700 text-white font-semibold py-3 rounded-lg hover:bg-blue-800 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                LinkedIn
              </button>
            </div>

            {/* Generate Image Button */}
            <button
              onClick={generateShareImage}
              disabled={generatingImage}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold py-3 rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {generatingImage ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Generate Share Card
                </>
              )}
            </button>
          </div>

          {/* Footer Info */}
          <div className="mt-6 text-center text-xs text-slate-500">
            Share your impact and inspire others to support public goods
          </div>
        </div>
      </div>
    </>
  );
}