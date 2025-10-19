'use client';

import { useAccount, useReadContracts } from 'wagmi';
import { CONTRACTS, PUBLIC_GOODS_FUND_ABI } from '@/lib/contracts';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface PublicGoodsImpactProps {
  estimatedDonation?: number;
  showEstimate?: boolean;
  compact?: boolean;
}

export default function PublicGoodsImpact({ 
  estimatedDonation = 0, 
  showEstimate = true,
  compact = false 
}: PublicGoodsImpactProps) {
  const { address, isConnected } = useAccount();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 读取链上数据
  const { data: chainData, isError, isLoading, refetch } = useReadContracts({
    contracts: isConnected ? [
      {
        address: CONTRACTS.PUBLIC_GOODS_FUND as `0x${string}`,
        abi: PUBLIC_GOODS_FUND_ABI,
        functionName: 'totalLifetimeDonations',
      },
      {
        address: CONTRACTS.PUBLIC_GOODS_FUND as `0x${string}`,
        abi: PUBLIC_GOODS_FUND_ABI,
        functionName: 'getTotalContributors',
      },
      {
        address: CONTRACTS.PUBLIC_GOODS_FUND as `0x${string}`,
        abi: PUBLIC_GOODS_FUND_ABI,
        functionName: 'getContributorInfo',
        args: [address as `0x${string}`],
      },
    ] : [],
  });

  // 解析数据
  const totalLifetimeDonations = chainData?.[0]?.result ? Number(chainData[0].result) / 1e6 : 0;
  const totalContributors = chainData?.[1]?.result ? Number(chainData[1].result) : 0;
  const contributorInfo = chainData?.[2]?.result as any;

  // 手动刷新数据
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // 自动刷新（每30秒）
  useEffect(() => {
    if (!isConnected) return;
    
    const interval = setInterval(() => {
      refetch();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [isConnected, refetch]);

  if (!isConnected) {
    return (
      <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl shadow-sm p-6 border border-emerald-200">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <h2 className="text-lg font-semibold text-gray-900">Public Goods Impact</h2>
        </div>
        <div className="text-center py-8">
          <div className="text-4xl mb-3">🔌</div>
          <p className="text-gray-600 mb-4">Connect your wallet to view Public Goods impact</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl shadow-sm p-6 border border-emerald-200">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-emerald-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <h2 className="text-lg font-semibold text-gray-900">Loading...</h2>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl shadow-sm p-6 border border-red-200">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-lg font-semibold text-gray-900">Error Loading Data</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">Failed to load Public Goods data from the blockchain.</p>
        <button
          onClick={handleRefresh}
          className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl shadow-sm p-6 border border-emerald-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <h2 className="text-lg font-semibold text-gray-900">Public Goods Impact</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-emerald-600">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span>Live</span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-1 hover:bg-emerald-100 rounded-lg transition-colors"
            title="Refresh data"
          >
            <svg 
              className={`w-4 h-4 text-emerald-600 ${isRefreshing ? 'animate-spin' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Total Platform Donations */}
      <div className="bg-white rounded-lg p-4 mb-3 border border-emerald-100">
        <div className="text-sm text-gray-600 mb-1">Platform Total Donations</div>
        <div className="text-3xl font-bold text-emerald-700">
          ${totalLifetimeDonations.toFixed(2)}
        </div>
        {showEstimate && estimatedDonation > 0 && (
          <div className="mt-2 pt-2 border-t border-emerald-100">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Estimated donation for this order:</span>
              <span className="font-semibold text-emerald-600">${estimatedDonation.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Contributors Count */}
      <div className="bg-white rounded-lg p-4 border border-emerald-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-700">Supported Developers</span>
          <span className="text-lg font-bold text-emerald-700">
            {totalContributors} {totalContributors === 1 ? 'contributor' : 'contributors'}
          </span>
        </div>
        
        {/* User's Contribution */}
        {contributorInfo && contributorInfo[0] > 0 && (
          <div className="mt-2 pt-2 border-t border-emerald-100">
            <div className="text-xs text-gray-600 mb-1">Your contribution:</div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-emerald-700">
                ${(Number(contributorInfo[0]) / 1e6).toFixed(2)}
              </span>
              <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full font-medium">
                {contributorInfo[2]} Badge
              </span>
            </div>
          </div>
        )}
      </div>

      {/* View Details Button */}
      <Link
        href="/public-goods"
        className="mt-4 block w-full px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium text-center transition-colors"
      >
        View Donation Details
      </Link>
    </div>
  );
}

