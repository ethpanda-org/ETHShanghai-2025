'use client';

import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { CONTRACTS, PAYMENT_GATEWAY_ABI, PUBLIC_GOODS_FUND_ABI, AETHER_ORACLE_ABI } from '@/lib/contracts';
import Link from 'next/link';
import { keccak256, toBytes } from 'viem';

interface OrderSuccessPageProps {
  hash: `0x${string}`;
  orderId: string;
  amount: string;
  paymentToken: string;
  settlementToken: string;
  getTokenSymbol: (address: string) => string;
  merchantAddress: string;
  aiPredictedRate: number;
}

const ORDER_STATUS = {
  0: { label: 'Pending', color: 'yellow', icon: '⏳' },
  1: { label: 'Paid', color: 'blue', icon: '💳' },
  2: { label: 'Processing', color: 'indigo', icon: '⚙️' },
  3: { label: 'Completed', color: 'green', icon: '✅' },
  4: { label: 'Cancelled', color: 'red', icon: '❌' },
  5: { label: 'Expired', color: 'gray', icon: '⏰' },
};

export default function OrderSuccessPage({
  hash,
  orderId,
  amount,
  paymentToken,
  settlementToken,
  getTokenSymbol,
  merchantAddress,
  aiPredictedRate,
}: OrderSuccessPageProps) {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Calculate order hash
  const orderHash = keccak256(toBytes(orderId + merchantAddress + Date.now()));

  // 1. 实时订单状态追踪
  const { data: orderData, refetch: refetchOrder } = useReadContract({
    address: CONTRACTS.PAYMENT_GATEWAY_V2 as `0x${string}`,
    abi: PAYMENT_GATEWAY_ABI,
    functionName: 'getOrder',
    args: [orderHash],
  });

  // 2. 公益基金贡献信息
  const { data: contributorData } = useReadContract({
    address: CONTRACTS.PUBLIC_GOODS_FUND as `0x${string}`,
    abi: PUBLIC_GOODS_FUND_ABI,
    functionName: 'getContributorInfo',
    args: [merchantAddress as `0x${string}`],
  });

  // 3. AI汇率数据（从Oracle合约获取实际执行汇率）
  const tradingPair = `${getTokenSymbol(paymentToken)}/${getTokenSymbol(settlementToken)}`;

  // Poll order status every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetchOrder();
    }, 5000);

    return () => clearInterval(interval);
  }, [refetchOrder]);

  // Calculate expiry countdown
  useEffect(() => {
    if (orderData && orderData[7]) { // expiryTime
      const expiryTime = Number(orderData[7]) * 1000;

      const updateCountdown = () => {
        const now = Date.now();
        const remaining = Math.max(0, expiryTime - now);
        setTimeRemaining(remaining);
      };

      updateCountdown();
      const interval = setInterval(updateCountdown, 1000);

      return () => clearInterval(interval);
    }
  }, [orderData]);

  // Parse order data
  const merchant = orderData?.[0];
  const payer = orderData?.[1];
  const orderAmount = orderData?.[2];
  const paidAmount = orderData?.[3];
  const receivedAmount = orderData?.[4];
  const status = orderData?.[5] !== undefined ? Number(orderData[5]) : 0;
  const createdAt = orderData?.[6];
  const expiryTime = orderData?.[7];

  // Parse contributor data
  const totalContributed = contributorData?.[0] ? Number(contributorData[0]) / 1e6 : 0;
  const badgeLevel = contributorData?.[2] || 'None';

  // Calculate fees (based on contract logic)
  const orderAmountNum = parseFloat(amount);
  const platformFeeRate = 0.006; // 0.6%
  const expectedReceived = orderAmountNum * aiPredictedRate;
  const platformFee = expectedReceived * platformFeeRate;
  const donationAmount = platformFee * 0.05; // 5% of fee
  const merchantReceives = expectedReceived - platformFee;

  // Actual execution rate (if order is completed)
  const actualRate = receivedAmount && paidAmount && Number(paidAmount) > 0
    ? Number(receivedAmount) / Number(paidAmount)
    : aiPredictedRate;

  const rateDeviation = Math.abs(actualRate - aiPredictedRate) / aiPredictedRate * 100;

  // Format countdown
  const formatCountdown = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Badge icon
  const getBadgeIcon = (level: string) => {
    switch (level) {
      case 'Gold': return '🥇';
      case 'Silver': return '🥈';
      case 'Bronze': return '🥉';
      default: return '⭐';
    }
  };

  const paymentUrl = `${window.location.origin}/pay/${orderId}`;
  const etherscanTxUrl = `https://sepolia-optimism.etherscan.io/tx/${hash}`;
  const etherscanContractUrl = `https://sepolia-optimism.etherscan.io/address/${CONTRACTS.PAYMENT_GATEWAY_V2}`;

  const currentStatus = ORDER_STATUS[status as keyof typeof ORDER_STATUS] || ORDER_STATUS[0];

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-10 border border-gray-200">
        {/* Success Header - Centered */}
        <div className="text-center mb-10 pb-8 border-b border-gray-200">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Order Created Successfully!</h2>

          {/* Blockchain Explorer Links */}
          <div className="flex items-center justify-center gap-4 mt-4">
            <a
              href={etherscanTxUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 hover:underline"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View on Etherscan
            </a>
            <span className="text-gray-300">|</span>
            <a
              href={etherscanContractUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-700 hover:underline"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              View Contract
            </a>
          </div>

          <p className="text-gray-500 text-sm font-mono bg-gray-50 px-4 py-2 rounded-lg inline-block mt-3">
            Tx: {hash?.slice(0, 10)}...{hash?.slice(-8)}
          </p>
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-8 mb-8">
          {/* Left Column: Order Info + Status */}
          <div className="lg:col-span-2 space-y-6">
            {/* 1. Real-time Order Status Tracking */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Order Status Timeline
                </h3>
                <div className={`px-3 py-1 rounded-full text-sm font-semibold bg-${currentStatus.color}-100 text-${currentStatus.color}-700`}>
                  {currentStatus.icon} {currentStatus.label}
                </div>
              </div>

              {/* Status Steps */}
              <div className="space-y-4">
                {Object.entries(ORDER_STATUS).slice(0, 4).map(([key, statusInfo], index) => {
                  const stepStatus = Number(key);
                  const isActive = status >= stepStatus;
                  const isCurrent = status === stepStatus;

                  return (
                    <div key={key} className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isActive ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-400'
                      } font-semibold transition-all`}>
                        {isActive ? '✓' : index + 1}
                      </div>
                      <div className="flex-1">
                        <div className={`font-medium ${isCurrent ? 'text-emerald-600' : isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                          {statusInfo.label}
                        </div>
                        {isCurrent && timeRemaining !== null && timeRemaining > 0 && (
                          <div className="text-sm text-orange-600 font-semibold mt-1">
                            ⏰ Expires in: {formatCountdown(timeRemaining)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {status === 0 && timeRemaining !== null && (
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-yellow-800">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">
                      Order expires in {formatCountdown(timeRemaining)}. Share payment link with customer!
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Order Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Order Information
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-lg p-5 border border-emerald-100">
                  <div className="text-sm font-medium text-emerald-700 mb-2">Order ID</div>
                  <div className="font-mono text-sm text-gray-900 font-semibold break-all">{orderId}</div>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-lg p-5 border border-emerald-100">
                  <div className="text-sm font-medium text-emerald-700 mb-2">Amount</div>
                  <div className="text-2xl font-bold text-emerald-600">
                    {amount} {getTokenSymbol(paymentToken)}
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Link */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Payment Link
              </h3>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-5 border border-blue-100">
                <div className="text-sm font-medium text-blue-700 mb-3">Share with Customer</div>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={paymentUrl}
                    readOnly
                    className="w-full px-4 py-3 bg-white border-2 border-blue-200 rounded-lg text-sm font-mono text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400 select-all"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(paymentUrl);
                      alert('Payment link copied to clipboard!');
                    }}
                    className="w-full px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-semibold transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy Link
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Fees, AI Rate, Public Goods */}
          <div className="space-y-6">
            {/* 2. Detailed Fee Breakdown */}
            <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Fee Breakdown
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Order Amount</span>
                  <span className="font-semibold text-gray-900">{amount} {getTokenSymbol(paymentToken)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">AI Rate</span>
                  <span className="font-semibold text-gray-900">{aiPredictedRate.toFixed(4)}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-gray-100 pt-2">
                  <span className="text-gray-600">Expected Receive</span>
                  <span className="font-semibold text-gray-900">{expectedReceived.toFixed(2)} {getTokenSymbol(settlementToken)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Platform Fee (0.6%)</span>
                  <span className="font-semibold text-red-600">-${platformFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 flex items-center gap-1">
                    <svg className="w-3 h-3 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                    Public Goods (5%)
                  </span>
                  <span className="font-semibold text-purple-600">-${donationAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t-2 border-gray-200 pt-3 mt-2">
                  <span className="font-bold text-gray-900">You Receive</span>
                  <span className="text-xl font-bold text-emerald-600">${merchantReceives.toFixed(2)}</span>
                </div>
              </div>

              <div className="mt-4 p-3 bg-emerald-50 rounded-lg">
                <div className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  Save 80% vs Stripe (2.9% + $0.30)
                </div>
              </div>
            </div>

            {/* 3. AI Rate Comparison */}
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                AI Rate Analysis
              </h3>
              <div className="space-y-4">
                <div className="bg-white/60 rounded-lg p-4">
                  <div className="text-sm text-purple-700 mb-1">Trading Pair</div>
                  <div className="text-lg font-bold text-gray-900">{tradingPair}</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/60 rounded-lg p-3">
                    <div className="text-xs text-purple-700 mb-1">AI Predicted</div>
                    <div className="text-lg font-bold text-gray-900">{aiPredictedRate.toFixed(6)}</div>
                  </div>
                  <div className="bg-white/60 rounded-lg p-3">
                    <div className="text-xs text-indigo-700 mb-1">Actual Rate</div>
                    <div className="text-lg font-bold text-gray-900">{actualRate.toFixed(6)}</div>
                  </div>
                </div>
                <div className="p-3 bg-white/60 rounded-lg">
                  <div className="text-sm font-medium">
                    <span className={`${rateDeviation < 1 ? 'text-green-600' : rateDeviation < 5 ? 'text-yellow-600' : 'text-orange-600'}`}>
                      Deviation: {rateDeviation.toFixed(2)}%
                    </span>
                  </div>
                  {rateDeviation < 1 && (
                    <div className="text-xs text-green-600 mt-1">✨ Excellent accuracy!</div>
                  )}
                </div>
              </div>
            </div>

            {/* 4. Public Goods Badge */}
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-6 border border-emerald-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
                Public Goods Impact
              </h3>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-4xl shadow-lg">
                  {getBadgeIcon(badgeLevel)}
                </div>
                <div>
                  <div className="text-sm text-gray-600">Your Badge</div>
                  <div className="text-2xl font-bold text-emerald-700">{badgeLevel}</div>
                </div>
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Contributed</span>
                  <span className="font-bold text-emerald-600">${totalContributed.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">This Order</span>
                  <span className="font-semibold text-purple-600">+${donationAmount.toFixed(2)}</span>
                </div>
              </div>
              <div className="p-3 bg-white/60 rounded-lg text-xs text-gray-600 mb-3">
                ❤️ Supporting Ethereum developers through automated donations
              </div>
              <Link
                href="/public-goods"
                className="block w-full text-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-semibold transition-all"
              >
                View Donation Details →
              </Link>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-200">
          <Link
            href="/dashboard/orders"
            className="px-6 py-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold text-center transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            View Orders
          </Link>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create New Order
          </button>
        </div>
      </div>
    </div>
  );
}
