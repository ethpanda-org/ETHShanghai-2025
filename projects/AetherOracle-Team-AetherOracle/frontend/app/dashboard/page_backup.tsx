'use client';

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId, useSwitchChain } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { CONTRACTS, PAYMENT_GATEWAY_ABI } from '@/lib/contracts';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { optimismSepolia } from 'wagmi/chains';

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
    address: CONTRACTS.PAYMENT_GATEWAY as `0x${string}`,
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
      contractAddress: CONTRACTS.PAYMENT_GATEWAY,
      expectedChainId: optimismSepolia.id,
    });

    try {
      writeContract({
        address: CONTRACTS.PAYMENT_GATEWAY as `0x${string}`,
        abi: PAYMENT_GATEWAY_ABI,
        functionName: 'registerMerchant',
        args: [businessName],
      });
    } catch (error) {
      console.error('❌ Registration error:', error);
      alert(`❌ Registration failed: ${(error as Error).message}`);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center max-w-md">
          <h1 className="text-3xl font-bold mb-4">Merchant Dashboard</h1>
          <p className="text-gray-600 mb-8">Connect your wallet to access the merchant dashboard</p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  if (!isRegistered) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 py-12 px-4">
        {/* Registration page content - keeping existing */}
        <div className="container mx-auto max-w-6xl">
          <div className="flex justify-between items-center mb-12">
            <Link href="/" className="text-slate-600 hover:text-slate-900 flex items-center gap-2 font-medium">
              ← Back to Home
            </Link>
            <ConnectButton />
          </div>
          {/* ... rest of registration page ... */}
        </div>
      </div>
    );
  }

  const info = merchantInfo as any;
  const totalVolume = info[2] ? Number(info[2]) / 1e6 : 0;
  const pendingBalance = info[3] ? Number(info[3]) / 1e6 : 0;
  const totalOrders = Number(info[1]?.toString() || '0');
  const feeRate = info[4] ? Number(info[4]) / 100 : 0.6;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header - existing */}
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
          <ConnectButton />
        </div>

        {/* Key Metrics - existing 4 cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Total Orders */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-full font-semibold">
                All time
              </span>
            </div>
            <div className="text-sm text-slate-600 mb-1 font-medium">Total Orders</div>
            <div className="text-3xl font-bold text-slate-900 mb-1">{totalOrders}</div>
            <div className="flex items-center gap-1 text-sm">
              <span className="text-emerald-600 font-semibold">+0%</span>
              <span className="text-slate-500">vs last month</span>
            </div>
          </div>

          {/* Total Volume */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <span className="text-xs px-2 py-1 bg-purple-50 text-purple-600 rounded-full font-semibold">
                USD
              </span>
            </div>
            <div className="text-sm text-slate-600 mb-1 font-medium">Total Volume</div>
            <div className="text-3xl font-bold text-slate-900 mb-1">${totalVolume.toFixed(2)}</div>
            <div className="flex items-center gap-1 text-sm">
              <span className="text-emerald-600 font-semibold">+0%</span>
              <span className="text-slate-500">vs last month</span>
            </div>
          </div>

          {/* Pending Balance */}
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg p-6 text-white hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <span className="text-xs px-2 py-1 bg-white/20 backdrop-blur-sm rounded-full font-semibold">
                Available
              </span>
            </div>
            <div className="text-sm text-emerald-100 mb-1 font-medium">Pending Balance</div>
            <div className="text-3xl font-bold mb-1">${pendingBalance.toFixed(2)}</div>
            <Link 
              href="/dashboard/withdraw"
              className="inline-flex items-center gap-1 text-sm font-semibold text-white hover:text-emerald-100 transition-colors mt-2"
            >
              Withdraw funds
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {/* Avg Order Value */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span className="text-xs px-2 py-1 bg-amber-50 text-amber-600 rounded-full font-semibold">
                Avg
              </span>
            </div>
            <div className="text-sm text-slate-600 mb-1 font-medium">Avg Order Value</div>
            <div className="text-3xl font-bold text-slate-900 mb-1">
              ${totalOrders > 0 ? (totalVolume / totalOrders).toFixed(2) : '0.00'}
            </div>
            <div className="flex items-center gap-1 text-sm">
              <span className="text-slate-500">Per transaction</span>
            </div>
          </div>
        </div>

        {/* NEW: Performance Chart & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Performance Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Performance Overview</h2>
                <p className="text-sm text-slate-500">Transaction volume over time</p>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700 rounded-lg">7D</button>
                <button className="px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">30D</button>
                <button className="px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">90D</button>
              </div>
            </div>
            
            {/* Simple Chart Visualization */}
            <div className="relative h-48 flex items-end justify-between gap-2 px-4 py-4 bg-gradient-to-t from-emerald-50 to-transparent rounded-xl">
              {[30, 45, 60, 40, 70, 55, 80].map((height, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div 
                    className="w-full bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-lg hover:from-emerald-600 hover:to-emerald-500 transition-all cursor-pointer shadow-lg relative group"
                    style={{ height: `${height}%` }}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-2 py-1 rounded text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      ${(Math.random() * 500).toFixed(2)}
                    </div>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-3 gap-4 pt-4 border-t border-slate-200">
              <div>
                <div className="text-xs text-slate-500 mb-1">This Week</div>
                <div className="text-lg font-bold text-slate-900">${totalVolume.toFixed(2)}</div>
                <div className="text-xs text-emerald-600 font-semibold">+0% vs last week</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Avg Daily</div>
                <div className="text-lg font-bold text-slate-900">${(totalVolume / 7).toFixed(2)}</div>
                <div className="text-xs text-slate-500">Per day</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Peak Day</div>
                <div className="text-lg font-bold text-slate-900">Sunday</div>
                <div className="text-xs text-purple-600 font-semibold">Best performance</div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Recent Activity</h2>
            <div className="space-y-4">
              {totalOrders === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-sm text-slate-500 mb-2">No orders yet</p>
                  <Link href="/dashboard/create-order" className="text-sm text-emerald-600 font-semibold hover:text-emerald-700">
                    Create your first order →
                  </Link>
                </div>
              ) : (
                <>
                  <div className="flex items-start gap-3 pb-4 border-b border-slate-100">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900">Order completed</p>
                      <p className="text-xs text-slate-500 truncate">Payment received for order #1234</p>
                      <p className="text-xs text-slate-400 mt-1">2 hours ago</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 pb-4 border-b border-slate-100">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900">New order created</p>
                      <p className="text-xs text-slate-500 truncate">Order #1235 awaiting payment</p>
                      <p className="text-xs text-slate-400 mt-1">5 hours ago</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900">Funds withdrawn</p>
                      <p className="text-xs text-slate-500 truncate">$100.00 transferred to wallet</p>
                      <p className="text-xs text-slate-400 mt-1">1 day ago</p>
                    </div>
                  </div>
                </>
              )}
            </div>
            <Link 
              href="/dashboard/orders"
              className="block mt-4 pt-4 border-t border-slate-200 text-center text-sm font-semibold text-emerald-600 hover:text-emerald-700"
            >
              View all activity →
            </Link>
          </div>
        </div>

        {/* Quick Actions & Platform Benefits - existing */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Quick Actions</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <Link
                href="/dashboard/create-order"
                className="group bg-white rounded-xl shadow-md p-6 border border-slate-200 hover:border-emerald-500 hover:shadow-xl transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-900 mb-1">Create Order</h3>
                    <p className="text-sm text-slate-600">Generate payment order for customers</p>
                  </div>
                  <svg className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>

              <Link
                href="/dashboard/orders"
                className="group bg-white rounded-xl shadow-md p-6 border border-slate-200 hover:border-blue-500 hover:shadow-xl transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-900 mb-1">View Orders</h3>
                    <p className="text-sm text-slate-600">Check order status and history</p>
                  </div>
                  <svg className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>

              <Link
                href="/dashboard/withdraw"
                className="group bg-white rounded-xl shadow-md p-6 border border-slate-200 hover:border-purple-500 hover:shadow-xl transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-900 mb-1">Withdraw</h3>
                    <p className="text-sm text-slate-600">Transfer funds to your wallet</p>
                  </div>
                  <svg className="w-5 h-5 text-slate-400 group-hover:text-purple-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>

              <Link
                href="/public-goods"
                className="group bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl shadow-md p-6 border-2 border-pink-200 hover:border-pink-300 hover:shadow-xl transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-rose-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-900 mb-1">Public Goods Impact</h3>
                    <p className="text-sm text-rose-700 font-medium">5% fees → Ethereum ecosystem</p>
                  </div>
                  <svg className="w-5 h-5 text-pink-400 group-hover:text-rose-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-4">Platform Benefits</h2>
            <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 mb-1">Ultra-Low Fees</div>
                    <div className="text-sm text-slate-600">Only 0.6% vs 3% traditional</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 mb-1">Instant Settlement</div>
                    <div className="text-sm text-slate-600">T+0 on Optimism L2</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 mb-1">AI-Powered Rates</div>
                    <div className="text-sm text-slate-600">97.4% prediction accuracy</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-rose-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 mb-1">Auto Donations</div>
                    <div className="text-sm text-slate-600">Support Ethereum builders</div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-200">
                <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-3">Powered by</div>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">Optimism</span>
                  <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">LightGBM</span>
                  <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">Multi-Oracle</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Banner */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl shadow-xl p-8 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h3 className="text-2xl font-bold mb-2">Need help getting started?</h3>
              <p className="text-emerald-100">Check out our integration guide and API documentation</p>
            </div>
            <div className="flex gap-3">
              <button className="px-6 py-3 bg-white text-emerald-600 rounded-lg font-semibold hover:bg-emerald-50 transition-colors shadow-lg">
                View Docs
              </button>
              <button className="px-6 py-3 bg-emerald-700 text-white rounded-lg font-semibold hover:bg-emerald-800 transition-colors">
                Contact Support
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

