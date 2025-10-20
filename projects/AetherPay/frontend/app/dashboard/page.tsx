'use client';

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId, useSwitchChain } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { CONTRACTS, PAYMENT_GATEWAY_ABI } from '@/lib/contracts';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { optimismSepolia } from 'wagmi/chains';

const Navigation = dynamic(() => import('@/components/Navigation'), { ssr: false });

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const [businessName, setBusinessName] = useState('');
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const {
    writeContract,
    isPending: isWritePending,
    data: hash,
    error: writeError,
    isSuccess: isWriteSuccess
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: confirmError
  } = useWaitForTransactionReceipt({
    hash,
  });

  const { data: merchantInfo, refetch: refetchMerchantInfo } = useReadContract({
    address: CONTRACTS.PAYMENT_GATEWAY_V2 as `0x${string}`,
    abi: PAYMENT_GATEWAY_ABI,
    functionName: 'getMerchantInfo',
    args: [address as `0x${string}`],
  });

  const isRegistered = merchantInfo && (merchantInfo as any)[5];

  useEffect(() => {
    if (isConfirmed) {
      alert('✅ Registration successful! Refreshing dashboard...');
      setTimeout(() => {
        refetchMerchantInfo();
        window.location.reload();
      }, 2000);
    }
  }, [isConfirmed, refetchMerchantInfo]);

  useEffect(() => {
    if (writeError) {
      console.error('Write error:', writeError);
      alert(`❌ Transaction failed: ${writeError.message}`);
    }
  }, [writeError]);

  useEffect(() => {
    if (confirmError) {
      console.error('Confirmation error:', confirmError);
      alert(`❌ Transaction confirmation failed: ${confirmError.message}`);
    }
  }, [confirmError]);

  const handleRegister = async () => {
    if (!businessName.trim()) {
      alert('⚠️ Please enter your business name');
      return;
    }

    if (chainId !== optimismSepolia.id) {
      alert('⚠️ Please switch to Optimism Sepolia network');
      try {
        switchChain({ chainId: optimismSepolia.id });
      } catch (error) {
        console.error('Network switch failed:', error);
      }
      return;
    }

    console.log('🔍 Registration Debug Info:', {
      businessName,
      address,
      chainId,
      contractAddress: CONTRACTS.PAYMENT_GATEWAY_V2,
      expectedChainId: optimismSepolia.id,
    });

    try {
      writeContract({
        address: CONTRACTS.PAYMENT_GATEWAY_V2 as `0x${string}`,
        abi: PAYMENT_GATEWAY_ABI,
        functionName: 'registerMerchant',
        args: [businessName],
      });
    } catch (error) {
      console.error('❌ Registration error:', error);
      alert(`❌ Registration failed: ${(error as Error).message}`);
    }
  };

  // Not connected state
  if (!isConnected) {
    return <NotConnectedView />;
  }

  // Not registered state
  if (!isRegistered) {
    return <NotRegisteredView
      businessName={businessName}
      setBusinessName={setBusinessName}
      handleRegister={handleRegister}
      isWritePending={isWritePending}
      isConfirming={isConfirming}
      chainId={chainId}
      hash={hash}
    />;
  }

  // Registered merchant dashboard
  const info = merchantInfo as any;
  const totalVolume = info[2] ? Number(info[2]) / 1e6 : 0;
  const pendingBalance = info[3] ? Number(info[3]) / 1e6 : 0;
  const totalOrders = Number(info[1]?.toString() || '0');
  const feeRate = info[4] ? Number(info[4]) / 100 : 0.6;

  return <RegisteredDashboard
    info={info}
    totalVolume={totalVolume}
    pendingBalance={pendingBalance}
    totalOrders={totalOrders}
    feeRate={feeRate}
  />;
}

// Component for not connected state
function NotConnectedView() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
      <Navigation />
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-block mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-xl">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
            <h1 className="text-5xl font-bold text-slate-900 mb-4">Merchant Dashboard</h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-8">
              Connect your wallet to access AetherPay's cross-border payment platform
            </p>
            <div className="flex justify-center">
              <ConnectButton />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Component for not registered state
function NotRegisteredView({ businessName, setBusinessName, handleRegister, isWritePending, isConfirming, chainId, hash }: any) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      <Navigation />
      <div className="py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200 max-w-lg mx-auto">
            <div className="mb-8">
              <div className="inline-block bg-emerald-600 text-white px-3 py-1 rounded-md text-xs font-semibold mb-4 uppercase tracking-wider">
                Merchant Registration
              </div>
              <h1 className="text-3xl font-bold mb-3 text-slate-900">
                Start Accepting Payments
              </h1>
              <p className="text-slate-600 leading-relaxed">
                Register your business to access our AI-powered cross-border payment infrastructure
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Your Business Name"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white text-slate-900 font-medium placeholder:text-slate-400"
                />
                <p className="text-xs text-slate-500 mt-1.5">
                  This will be visible to your customers during checkout
                </p>
              </div>

              {chainId !== optimismSepolia.id && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                  <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-800">Wrong Network</p>
                    <p className="text-xs text-amber-700 mt-0.5">Please switch to Optimism Sepolia</p>
                  </div>
                </div>
              )}

              {hash && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                  <p className="text-sm font-semibold text-emerald-800 mb-1">Transaction Submitted</p>
                  <p className="text-xs text-emerald-700 font-mono">
                    {hash.slice(0, 10)}...{hash.slice(-8)}
                  </p>
                </div>
              )}

              <button
                onClick={handleRegister}
                disabled={isWritePending || isConfirming || !businessName.trim() || chainId !== optimismSepolia.id}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-lg transition-all shadow-md hover:shadow-lg disabled:shadow-none"
              >
                {isWritePending ? '📝 Submitting Transaction...' : isConfirming ? '⏳ Confirming...' : '🚀 Register Business'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Component for registered dashboard
function RegisteredDashboard({ info, totalVolume, pendingBalance, totalOrders, feeRate }: any) {
  // Mock data for demonstration
  const recentTransactions = [
    { id: '0x1234...5678', amount: 45.99, currency: 'USDC', status: 'completed', date: '2 hours ago', customer: 'Alice W.' },
    { id: '0x8765...4321', amount: 128.50, currency: 'USDT', status: 'pending', date: '5 hours ago', customer: 'Bob K.' },
    { id: '0x2468...1357', amount: 67.25, currency: 'USDC', status: 'completed', date: '1 day ago', customer: 'Carol M.' },
    { id: '0x9753...8642', amount: 334.00, currency: 'DAI', status: 'completed', date: '2 days ago', customer: 'David L.' },
    { id: '0x3698...7412', amount: 22.75, currency: 'USDT', status: 'refunded', date: '3 days ago', customer: 'Eve R.' },
  ];

  const monthlyData = [
    { month: 'Oct', volume: 1250 },
    { month: 'Nov', volume: 2100 },
    { month: 'Dec', volume: 1800 },
    { month: 'Jan', volume: 3200 },
    { month: 'Feb', volume: 2900 },
    { month: 'Mar', volume: 4100 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Merchant Dashboard</h1>
                <p className="text-slate-600 font-medium">{info[0]}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full font-semibold">
                ✓ Active
              </span>
              <span className="text-slate-500">
                Fee Rate: <span className="font-semibold text-slate-700">{feeRate}%</span>
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Quick Actions</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Link
              href="/dashboard/create-order"
              className="group bg-white rounded-xl shadow-md p-6 border border-slate-200 hover:border-emerald-500 hover:shadow-xl transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <svg className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Create Order</h3>
              <p className="text-sm text-slate-600">Generate new payment order</p>
            </Link>

            <Link
              href="/pool"
              className="group bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl shadow-md p-6 border-2 border-purple-200 hover:border-purple-400 hover:shadow-xl transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <svg className="w-5 h-5 text-purple-400 group-hover:text-purple-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">FX Pool</h3>
              <p className="text-sm text-purple-700 font-medium">Swap tokens & earn fees</p>
            </Link>

            <Link
              href="/dashboard/orders"
              className="group bg-white rounded-xl shadow-md p-6 border border-slate-200 hover:border-blue-500 hover:shadow-xl transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <svg className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Order Management</h3>
              <p className="text-sm text-slate-600">Track and manage all payment orders</p>
            </Link>
          </div>
        </div>

        {/* Key Metrics - Enhanced with trends */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200 hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                +23%
              </span>
            </div>
            <div className="text-3xl font-bold text-slate-900 mb-1">{totalOrders}</div>
            <div className="text-sm text-slate-600">Total Orders</div>
            <div className="mt-2 text-xs text-green-600 font-medium">↑ 3 new today</div>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl shadow-lg p-6 border border-emerald-200 hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-md">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                +15%
              </span>
            </div>
            <div className="text-3xl font-bold text-slate-900 mb-1">${totalVolume.toFixed(2)}</div>
            <div className="text-sm text-slate-600">Total Volume</div>
            <div className="mt-2 text-xs text-emerald-600 font-medium">↑ $85.20 this week</div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl shadow-lg p-6 border border-purple-200 hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-md">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                Pending
              </span>
            </div>
            <div className="text-3xl font-bold text-slate-900 mb-1">${pendingBalance.toFixed(2)}</div>
            <div className="text-sm text-slate-600">Pending Balance</div>
            <div className="mt-2 text-xs text-purple-600 font-medium">2 settlements pending</div>
          </div>

          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl shadow-lg p-6 border border-indigo-200 hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                Stable
              </span>
            </div>
            <div className="text-3xl font-bold text-slate-900 mb-1">
              ${totalOrders > 0 ? (totalVolume / totalOrders).toFixed(2) : '0.00'}
            </div>
            <div className="text-sm text-slate-600">Average Order</div>
            <div className="mt-2 text-xs text-indigo-600 font-medium">Industry avg: $28.50</div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - 2/3 width */}
          <div className="lg:col-span-2 space-y-6">
            {/* Transaction Volume Chart */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Transaction Volume</h3>
                  <p className="text-sm text-slate-600">Monthly transaction overview</p>
                </div>
                <select className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                  <option>Last 6 months</option>
                  <option>Last year</option>
                  <option>All time</option>
                </select>
              </div>

              {/* Chart Placeholder */}
              <div className="relative h-64 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4">
                <div className="flex items-end justify-around h-full pb-6">
                  {monthlyData.map((item, index) => (
                    <div key={item.month} className="flex-1 mx-1 flex flex-col items-center justify-end h-full">
                      <div className="w-full relative group flex flex-col justify-end h-full">
                        <div
                          className="w-full bg-gradient-to-t from-emerald-500 to-teal-400 rounded-t-lg hover:from-emerald-600 hover:to-teal-500 transition-all cursor-pointer relative"
                          style={{
                            height: `${Math.max((item.volume / 4100) * 100, 5)}%`,
                            minHeight: '10px'
                          }}
                        >
                          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                            ${item.volume.toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 text-center mt-2 absolute bottom-0">{item.month}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chart Stats */}
              <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-slate-200">
                <div>
                  <p className="text-xs text-slate-600">Peak Month</p>
                  <p className="text-sm font-bold text-slate-900">March ($4,100)</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600">Average</p>
                  <p className="text-sm font-bold text-slate-900">$2,475/mo</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600">Growth</p>
                  <p className="text-sm font-bold text-green-600">+34.2%</p>
                </div>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200">
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-900">Recent Transactions</h3>
                  <Link href="/dashboard/transactions" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                    View all →
                  </Link>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Transaction</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mr-3">
                              <span className="text-white text-xs font-bold">{tx.currency[0]}</span>
                            </div>
                            <span className="text-sm font-mono text-slate-900">{tx.id}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                          {tx.customer}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-semibold text-slate-900">${tx.amount}</span>
                          <span className="text-xs text-slate-500 ml-1">{tx.currency}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            tx.status === 'completed' ? 'bg-green-100 text-green-800' :
                            tx.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                          {tx.date}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column - 1/3 width */}
          <div className="space-y-6">
            {/* Activity Feed */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
              <h3 className="text-xl font-bold text-slate-900 mb-4">Activity Feed</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">New order completed</p>
                    <p className="text-xs text-slate-600">$45.99 from Alice W.</p>
                    <p className="text-xs text-slate-500 mt-1">2 hours ago</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">Settlement processed</p>
                    <p className="text-xs text-slate-600">$234.50 to your account</p>
                    <p className="text-xs text-slate-500 mt-1">5 hours ago</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">Milestone reached</p>
                    <p className="text-xs text-slate-600">100 total transactions!</p>
                    <p className="text-xs text-slate-500 mt-1">1 day ago</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl shadow-lg p-6 border border-emerald-200">
              <h3 className="text-xl font-bold text-slate-900 mb-4">Payment Methods</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-xs">USDC</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">USDC</p>
                      <p className="text-xs text-slate-600">45% of volume</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-slate-900">$185.40</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-xs">USDT</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">USDT</p>
                      <p className="text-xs text-slate-600">35% of volume</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-slate-900">$144.18</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-xs">DAI</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">DAI</p>
                      <p className="text-xs text-slate-600">20% of volume</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-slate-900">$82.39</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}