'use client';

import { useAccount, useReadContract } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { CONTRACTS, PAYMENT_GATEWAY_ABI, PUBLIC_GOODS_FUND_ABI } from '@/lib/contracts';
import Link from 'next/link';
import { useState } from 'react';
import { useUserPayments } from '@/hooks/useUserPayments';

export default function PaymentHistoryPage() {
  const { address, isConnected } = useAccount();
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending'>('all');

  // 🆕 从合约读取真实的支付历史
  const { payments: allPayments, isLoading, error } = useUserPayments(address);

  // 🆕 从 PublicGoodsFund 读取总捐赠金额
  const { data: contributorData } = useReadContract({
    address: CONTRACTS.PUBLIC_GOODS_FUND as `0x${string}`,
    abi: PUBLIC_GOODS_FUND_ABI,
    functionName: 'getContributorInfo',
    args: [address as `0x${string}`],
  });

  const totalDonated = contributorData ? Number((contributorData as any)[0]) / 1e6 : 0;

  const filteredPayments = allPayments.filter(payment => {
    if (filter === 'all') return true;
    return payment.status === filter;
  });

  const totalSpent = allPayments.reduce((sum, p) => sum + p.amount, 0);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2">
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

        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-4xl font-bold text-slate-900 mb-4">支付历史</h1>
            <p className="text-xl text-slate-600 mb-8">
              连接钱包查看您的支付记录
            </p>
            <ConnectButton />
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
              <Link href="/user" className="text-slate-600 hover:text-slate-900 font-medium">
                我的贡献
              </Link>
              <Link href="/dashboard" className="text-slate-600 hover:text-slate-900 font-medium">
                商家后台
              </Link>
              <ConnectButton />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-600 mb-6">
          <Link href="/user" className="hover:text-slate-900">我的贡献</Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-slate-900 font-medium">支付历史</span>
        </div>

        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">支付历史</h1>
          <p className="text-slate-600">查看您的所有支付记录和捐赠明细</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">💳</span>
              </div>
              <div>
                <div className="text-sm text-slate-600">总支付</div>
                <div className="text-2xl font-bold text-slate-900">
                  {isLoading ? '...' : `$${totalSpent.toFixed(2)}`}
                </div>
              </div>
            </div>
            <div className="text-xs text-slate-500">{allPayments.length} 笔交易</div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">💝</span>
              </div>
              <div>
                <div className="text-sm text-slate-600">总捐赠</div>
                <div className="text-2xl font-bold text-purple-600">
                  {isLoading ? '...' : `$${totalDonated.toFixed(2)}`}
                </div>
              </div>
            </div>
            <div className="text-xs text-slate-500">支持以太坊生态</div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
              <div>
                <div className="text-sm text-slate-600">平均捐赠率</div>
                <div className="text-2xl font-bold text-emerald-600">
                  {isLoading || totalSpent === 0 ? '...' : `${((totalDonated / totalSpent) * 100).toFixed(2)}%`}
                </div>
              </div>
            </div>
            <div className="text-xs text-slate-500">每笔交易自动捐赠</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 mb-6">
          <div className="flex items-center gap-2 p-2">
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              全部 ({allPayments.length})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                filter === 'completed'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              已完成 ({allPayments.filter(p => p.status === 'completed').length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                filter === 'pending'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              待处理 ({allPayments.filter(p => p.status === 'pending').length})
            </button>
          </div>
        </div>

        {/* Payment List */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200">
          {isLoading ? (
            <div className="text-center py-16">
              <div className="animate-spin w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-slate-600">加载支付记录中...</p>
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">加载失败</h3>
              <p className="text-slate-600 mb-6">{error}</p>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">暂无支付记录</h3>
              <p className="text-slate-600 mb-6">
                {filter === 'all'
                  ? '开始使用 AetherPay 进行支付吧'
                  : `没有找到${filter === 'completed' ? '已完成' : '待处理'}的支付记录`}
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 bg-slate-900 text-white font-semibold px-6 py-3 rounded-lg hover:bg-slate-800 transition-colors"
              >
                返回首页
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredPayments.map((payment, index) => {
                const date = new Date(payment.timestamp * 1000);
                const formattedDate = date.toLocaleString('zh-CN', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div key={index} className="p-6 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-slate-900">{payment.merchantName}</h3>
                          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                            payment.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {payment.status === 'completed' ? '✓ 已完成' : '⏳ 待处理'}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <span>订单号: {payment.orderId}</span>
                          <span>•</span>
                          <span>{formattedDate}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-slate-900 mb-1">
                          ${payment.amount.toFixed(2)}
                        </div>
                        <div className="text-sm text-slate-600">{payment.tokenSymbol}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
                      <div>
                        <div className="text-xs text-slate-500 mb-1">商家地址</div>
                        <div className="text-sm font-mono text-slate-700">
                          {payment.merchant.slice(0, 6)}...{payment.merchant.slice(-4)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">公共物品捐赠</div>
                        <div className="text-sm font-bold text-purple-600">${payment.donation.toFixed(4)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">交易哈希</div>
                        <a
                          href={`https://sepolia-optimism.etherscan.io/tx/${payment.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-700 font-mono flex items-center gap-1"
                        >
                          {payment.txHash.slice(0, 10)}...
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Export Button */}
        {filteredPayments.length > 0 && (
          <div className="mt-6 flex justify-end">
            <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 font-medium px-6 py-3 rounded-lg hover:bg-slate-50 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              导出 CSV
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

