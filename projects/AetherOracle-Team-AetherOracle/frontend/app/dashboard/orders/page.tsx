'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useWatchContractEvent } from 'wagmi';
import { CONTRACTS, PAYMENT_GATEWAY_ABI } from '@/lib/contracts';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import OrderDetailsModal from '@/components/OrderDetailsModal';
import toast from 'react-hot-toast';

type OrderStatus = 0 | 1 | 2 | 3 | 4 | 5; // PENDING | PAID | PROCESSING | COMPLETED | CANCELLED | EXPIRED

interface OrderView {
  orderId: string;
  orderIdString: string;
  merchant: string;
  payer: string;
  orderAmount: bigint;
  paymentToken: string;
  settlementToken: string;
  paidAmount: bigint;
  receivedAmount: bigint;
  status: OrderStatus;
  createdAt: bigint;
  paidAt: bigint;
  metadataURI: string;
}

const STATUS_CONFIG = {
  0: { label: '⏳ Pending', color: 'bg-yellow-100 text-yellow-800', borderColor: 'border-yellow-300' },
  1: { label: '💰 Paid', color: 'bg-blue-100 text-blue-800', borderColor: 'border-blue-300' },
  2: { label: '🔄 Processing', color: 'bg-purple-100 text-purple-800', borderColor: 'border-purple-300' },
  3: { label: '✅ Completed', color: 'bg-green-100 text-green-800', borderColor: 'border-green-300' },
  4: { label: '❌ Cancelled', color: 'bg-red-100 text-red-800', borderColor: 'border-red-300' },
  5: { label: '⌛ Expired', color: 'bg-gray-100 text-gray-800', borderColor: 'border-gray-300' },
};

// ✅ 检查订单是否已过期（24小时）
const isOrderExpired = (order: OrderView): boolean => {
  const expiryTime = Number(order.createdAt) + (24 * 60 * 60); // 24 hours
  return order.status === 0 && Date.now() / 1000 > expiryTime;
};

// 🆕 检查订单是否部分支付
const isPartiallyPaid = (order: OrderView): boolean => {
  return Number(order.paidAmount) > 0 && Number(order.paidAmount) < Number(order.orderAmount);
};

const TOKEN_SYMBOLS: Record<string, string> = {
  [CONTRACTS.MOCK_USDC.toLowerCase()]: 'USDC',
  [CONTRACTS.MOCK_USDT.toLowerCase()]: 'USDT',
  [CONTRACTS.MOCK_DAI.toLowerCase()]: 'DAI',
  [CONTRACTS.MOCK_WETH.toLowerCase()]: 'WETH',
  [CONTRACTS.MOCK_WBTC.toLowerCase()]: 'WBTC',
};

export default function OrdersPage() {
  const { address, isConnected } = useAccount();
  const [selectedStatus, setSelectedStatus] = useState<'all' | OrderStatus>('all');
  const [currentPage, setCurrentPage] = useState(0);
  const [ordersPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');

  // 🆕 批量操作状态
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [showBatchActions, setShowBatchActions] = useState(false);

  // 🆕 订单详情弹窗
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<string | null>(null);

  // 获取订单总数
  const { data: totalOrders, refetch: refetchCount } = useReadContract({
    address: CONTRACTS.PAYMENT_GATEWAY_V2 as `0x${string}`,
    abi: PAYMENT_GATEWAY_ABI,
    functionName: 'getMerchantOrderCount',
    args: [address as `0x${string}`],
  });

  // 获取订单列表(分页)
  const { data: orders, refetch: refetchOrders, isLoading } = useReadContract({
    address: CONTRACTS.PAYMENT_GATEWAY_V2 as `0x${string}`,
    abi: PAYMENT_GATEWAY_ABI,
    functionName: 'getMerchantOrders',
    args: [
      address as `0x${string}`,
      BigInt(currentPage * ordersPerPage),
      BigInt(ordersPerPage),
    ],
  }) as { data: OrderView[] | undefined; refetch: () => void; isLoading: boolean };

  // 取消订单
  const { writeContract: cancelOrder, data: cancelHash, isPending: isCancelling } = useWriteContract();

  // 🆕 退款订单
  const { writeContract: refundOrder, data: refundHash, isPending: isRefunding } = useWriteContract();

  // 🆕 结算订单 (Settlement)
  const { writeContract: settleOrder, data: settleHash, isPending: isSettling } = useWriteContract();

  // 等待取消确认
  const { isSuccess: isCancelSuccess } = useWaitForTransactionReceipt({
    hash: cancelHash,
  });

  // 🆕 等待退款确认
  const { isSuccess: isRefundSuccess } = useWaitForTransactionReceipt({
    hash: refundHash,
  });

  // 🆕 等待结算确认
  const { isSuccess: isSettleSuccess } = useWaitForTransactionReceipt({
    hash: settleHash,
  });

  useEffect(() => {
    if (isCancelSuccess) {
      toast.success('Order cancelled successfully!');
      refetchOrders();
      refetchCount();
    }
  }, [isCancelSuccess, refetchOrders, refetchCount]);

  // 🆕 退款成功处理
  useEffect(() => {
    if (isRefundSuccess) {
      toast.success('Order refunded successfully!');
      refetchOrders();
      refetchCount();
    }
  }, [isRefundSuccess, refetchOrders, refetchCount]);

  // 🆕 结算成功处理
  useEffect(() => {
    if (isSettleSuccess) {
      toast.success('✅ Order settled successfully! Funds transferred to merchant.');
      refetchOrders();
      refetchCount();
    }
  }, [isSettleSuccess, refetchOrders, refetchCount]);

  // 🆕 Real-time order event listeners
  useWatchContractEvent({
    address: CONTRACTS.PAYMENT_GATEWAY_V2 as `0x${string}`,
    abi: PAYMENT_GATEWAY_ABI,
    eventName: 'OrderCreated',
    onLogs(logs) {
      console.log('📦 New order created:', logs);
      refetchOrders();
      refetchCount();
      toast.success('New order detected!', { icon: '📦' });
    },
  });

  useWatchContractEvent({
    address: CONTRACTS.PAYMENT_GATEWAY_V2 as `0x${string}`,
    abi: PAYMENT_GATEWAY_ABI,
    eventName: 'OrderCompleted',
    onLogs(logs) {
      console.log('✅ Order completed:', logs);
      refetchOrders();
      refetchCount();
      toast.success('Order completed!', { icon: '✅' });
    },
  });

  useWatchContractEvent({
    address: CONTRACTS.PAYMENT_GATEWAY_V2 as `0x${string}`,
    abi: PAYMENT_GATEWAY_ABI,
    eventName: 'OrderCancelled',
    onLogs(logs) {
      console.log('❌ Order cancelled:', logs);
      refetchOrders();
      refetchCount();
    },
  });

  useWatchContractEvent({
    address: CONTRACTS.PAYMENT_GATEWAY_V2 as `0x${string}`,
    abi: PAYMENT_GATEWAY_ABI,
    eventName: 'PaymentReceived',
    onLogs(logs) {
      console.log('💰 Payment received:', logs);
      refetchOrders();
      toast.success('Payment received!', { icon: '💰' });
    },
  });

  // 🆕 监听订单结算事件
  useWatchContractEvent({
    address: CONTRACTS.PAYMENT_GATEWAY_V2 as `0x${string}`,
    abi: PAYMENT_GATEWAY_ABI,
    eventName: 'OrderSettled',
    onLogs(logs) {
      console.log('💸 Order settled:', logs);
      refetchOrders();
      toast.success('Order settled and funds transferred!', { icon: '💸' });
    },
  });

  // 处理取消订单
  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;

    try {
      cancelOrder({
        address: CONTRACTS.PAYMENT_GATEWAY_V2 as `0x${string}`,
        abi: PAYMENT_GATEWAY_ABI,
        functionName: 'cancelOrder',
        args: [orderId as `0x${string}`],
      });
    } catch (error) {
      console.error('Cancel failed:', error);
      toast.error(`Cancel failed: ${(error as Error).message}`);
    }
  };

  // 🆕 处理退款订单
  const handleRefundOrder = async (orderId: string) => {
    if (!confirm('⚠️ Are you sure you want to refund this order? The payment will be returned to the buyer.')) return;

    try {
      refundOrder({
        address: CONTRACTS.PAYMENT_GATEWAY_V2 as `0x${string}`,
        abi: PAYMENT_GATEWAY_ABI,
        functionName: 'refundOrder',
        args: [orderId as `0x${string}`],
      });
    } catch (error) {
      console.error('Refund failed:', error);
      toast.error(`Refund failed: ${(error as Error).message}`);
    }
  };

  // 🆕 处理结算订单 (Settlement)
  const handleSettleOrder = async (orderId: string, orderAmount: bigint) => {
    const amountUSD = (Number(orderAmount) / 1e6).toFixed(2);
    const platformFee = (Number(orderAmount) * 0.006 / 1e6).toFixed(2); // 0.6% fee
    const publicGoodsDonation = (Number(orderAmount) * 0.006 * 0.05 / 1e6).toFixed(4); // 5% of fee
    const merchantReceives = (Number(orderAmount) * (1 - 0.006) / 1e6).toFixed(2);

    const confirmMessage = `
🎯 Settle Order Confirmation

Order Amount: $${amountUSD}
Platform Fee (0.6%): -$${platformFee}
Public Goods Donation: $${publicGoodsDonation}
─────────────────────────────
You will receive: $${merchantReceives}

Are you sure you want to settle this order?
    `.trim();

    if (!confirm(confirmMessage)) return;

    try {
      toast('Settlement transaction submitted...', { icon: '⏳' });

      settleOrder({
        address: CONTRACTS.PAYMENT_GATEWAY_V2 as `0x${string}`,
        abi: PAYMENT_GATEWAY_ABI,
        functionName: 'settleOrder',
        args: [orderId as `0x${string}`],
      });
    } catch (error) {
      console.error('Settlement failed:', error);
      toast.error(`Settlement failed: ${(error as Error).message}`);
    }
  };

  // 导出CSV
  const exportToCSV = () => {
    if (!orders || orders.length === 0) {
      toast.error('No orders to export');
      return;
    }

    const headers = ['Order ID', 'Amount', 'Status', 'Payment Token', 'Settlement Token', 'Created At', 'Paid At'];
    const rows = orders.map(order => [
      order.orderIdString,
      (Number(order.orderAmount) / 1e6).toFixed(2),
      STATUS_CONFIG[order.status].label,
      TOKEN_SYMBOLS[order.paymentToken.toLowerCase()] || order.paymentToken,
      TOKEN_SYMBOLS[order.settlementToken.toLowerCase()] || order.settlementToken,
      new Date(Number(order.createdAt) * 1000).toLocaleString(),
      order.paidAt > 0 ? new Date(Number(order.paidAt) * 1000).toLocaleString() : 'N/A',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `orders_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success('Orders exported successfully!');
  };

  // 筛选订单
  const filteredOrders = orders?.filter(order => {
    const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;
    const matchesSearch = searchQuery === '' ||
      order.orderIdString.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.payer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  }) || [];

  const totalCount = Number(totalOrders || 0);
  const totalPages = Math.ceil(totalCount / ordersPerPage);

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
            <p className="text-gray-600 mb-6">Please connect your wallet to view your orders</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
          <p className="text-gray-600 mt-2">Total Orders: {totalCount}</p>
        </div>

        {/* 🆕 Paid Orders Alert Banner */}
        {orders && orders.filter(o => o.status === 1).length > 0 && (
          <div className="mb-6 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-1">
                    💸 {orders.filter(o => o.status === 1).length} Order{orders.filter(o => o.status === 1).length > 1 ? 's' : ''} Ready to Settle
                  </h3>
                  <p className="text-emerald-100 text-sm">
                    Complete settlement to transfer funds to your wallet and contribute to public goods
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStatus(1)}
                className="bg-white text-emerald-600 px-6 py-3 rounded-lg font-semibold hover:bg-emerald-50 transition-colors shadow-lg"
              >
                View Paid Orders →
              </button>
            </div>
          </div>
        )}

        {/* Batch Actions Bar - Show when orders are selected */}
        {selectedOrders.size > 0 && (
          <div className="mb-6 bg-indigo-600 rounded-xl shadow-lg p-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="font-semibold">
                  {selectedOrders.size} order{selectedOrders.size > 1 ? 's' : ''} selected
                </span>
                <button
                  onClick={() => setSelectedOrders(new Set())}
                  className="text-indigo-200 hover:text-white transition-colors"
                >
                  Clear selection
                </button>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (confirm(`Cancel ${selectedOrders.size} selected orders?`)) {
                      selectedOrders.forEach(orderId => handleCancelOrder(orderId));
                      setSelectedOrders(new Set());
                    }
                  }}
                  className="bg-white text-red-600 px-4 py-2 rounded-lg font-semibold hover:bg-red-50 transition-colors"
                >
                  Cancel Selected
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Refund ${selectedOrders.size} selected orders?`)) {
                      selectedOrders.forEach(orderId => handleRefundOrder(orderId));
                      setSelectedOrders(new Set());
                    }
                  }}
                  className="bg-white text-orange-600 px-4 py-2 rounded-lg font-semibold hover:bg-orange-50 transition-colors"
                >
                  Refund Selected
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filters & Search */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="grid md:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Filter by Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value === 'all' ? 'all' : parseInt(e.target.value) as OrderStatus)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="all">All Statuses</option>
                <option value="0">⏳ Pending</option>
                <option value="1">💰 Paid</option>
                <option value="2">🔄 Processing</option>
                <option value="3">✅ Completed</option>
                <option value="4">❌ Cancelled</option>
                <option value="5">⌛ Expired</option>
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Search Orders
              </label>
              <input
                type="text"
                placeholder="Order ID or Payer address"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            {/* Export */}
            <div className="flex items-end">
              <button
                onClick={exportToCSV}
                disabled={!orders || orders.length === 0}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 rounded-lg transition-colors"
              >
                📥 Export to CSV
              </button>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent mx-auto"></div>
                <p className="text-gray-600 font-medium">Loading orders...</p>
                <div className="max-w-md mx-auto space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  ))}
                </div>
              </div>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No Orders Found</h3>
              <p className="text-gray-600 mb-6">
                {selectedStatus === 'all'
                  ? 'You haven\'t created any orders yet.'
                  : `No ${STATUS_CONFIG[selectedStatus as OrderStatus].label} orders found.`}
              </p>
              <Link
                href="/dashboard/create-order"
                className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
              >
                Create Your First Order
              </Link>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                          checked={filteredOrders.length > 0 && filteredOrders.every(order => selectedOrders.has(order.orderId))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedOrders(new Set(filteredOrders.map(o => o.orderId)));
                            } else {
                              setSelectedOrders(new Set());
                            }
                          }}
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Order ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Tokens
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredOrders.map((order) => (
                      <tr key={order.orderId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                            checked={selectedOrders.has(order.orderId)}
                            onChange={(e) => {
                              const newSelected = new Set(selectedOrders);
                              if (e.target.checked) {
                                newSelected.add(order.orderId);
                              } else {
                                newSelected.delete(order.orderId);
                              }
                              setSelectedOrders(newSelected);
                            }}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                              <div
                                className="text-sm font-medium text-gray-900 font-mono cursor-pointer hover:text-emerald-600 transition-colors"
                                onClick={() => setSelectedOrderForDetails(order.orderIdString)}
                              >
                                {order.orderIdString.slice(0, 12)}...
                              </div>
                              <div className="text-xs text-gray-500">
                                {order.payer && order.payer !== '0x0000000000000000000000000000000000000000' && (
                                  <>Paid by: {order.payer.slice(0, 8)}...{order.payer.slice(-6)}</>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">
                            ${(Number(order.orderAmount) / 1e6).toFixed(2)}
                          </div>
                          {order.paidAmount > 0 && (
                            <div className="text-xs text-gray-500">
                              Paid: ${(Number(order.paidAmount) / 1e6).toFixed(2)}
                              {isPartiallyPaid(order) && (
                                <span className="ml-1 text-orange-600 font-semibold">
                                  ({((Number(order.paidAmount) / Number(order.orderAmount)) * 100).toFixed(0)}%)
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              isOrderExpired(order)
                                ? 'bg-gray-100 text-gray-800 border-gray-300'
                                : STATUS_CONFIG[order.status].color
                            } ${STATUS_CONFIG[order.status].borderColor} border`}>
                              {isOrderExpired(order) ? '⌛ Expired' : STATUS_CONFIG[order.status].label}
                            </span>
                            {isPartiallyPaid(order) && (
                              <span className="px-2 py-1 inline-flex text-xs font-semibold rounded-full bg-orange-100 text-orange-800 border border-orange-300">
                                💸 Partial
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>Pay: {TOKEN_SYMBOLS[order.paymentToken.toLowerCase()] || 'Unknown'}</div>
                          <div>Get: {TOKEN_SYMBOLS[order.settlementToken.toLowerCase()] || 'Unknown'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(Number(order.createdAt) * 1000).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button
                            onClick={() => setSelectedOrderForDetails(order.orderIdString)}
                            className="text-emerald-600 hover:text-emerald-900 font-semibold"
                          >
                            Details
                          </button>
                          <Link
                            href={`/pay/${order.orderIdString}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Pay Link
                          </Link>
                          {order.status === 0 && !isOrderExpired(order) && (
                            <button
                              onClick={() => handleCancelOrder(order.orderId)}
                              disabled={isCancelling}
                              className="text-red-600 hover:text-red-900 disabled:text-gray-400"
                            >
                              {isCancelling ? 'Cancelling...' : 'Cancel'}
                            </button>
                          )}
                          {/* 🆕 结算按钮 - 仅对已支付(Paid)订单显示 */}
                          {order.status === 1 && (
                            <button
                              onClick={() => handleSettleOrder(order.orderId, order.orderAmount)}
                              disabled={isSettling}
                              className="text-emerald-600 hover:text-emerald-900 disabled:text-gray-400 font-semibold"
                            >
                              {isSettling ? 'Settling...' : '💸 Settle'}
                            </button>
                          )}
                          {(order.status === 1 || order.status === 2) && (
                            <button
                              onClick={() => handleRefundOrder(order.orderId)}
                              disabled={isRefunding}
                              className="text-orange-600 hover:text-orange-900 disabled:text-gray-400"
                            >
                              {isRefunding ? 'Refunding...' : 'Refund'}
                            </button>
                          )}
                          {isOrderExpired(order) && (
                            <span className="text-gray-400 text-xs">Expired</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing <span className="font-semibold">{currentPage * ordersPerPage + 1}</span> to{' '}
                  <span className="font-semibold">{Math.min((currentPage + 1) * ordersPerPage, totalCount)}</span> of{' '}
                  <span className="font-semibold">{totalCount}</span> orders
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                    disabled={currentPage === 0}
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                    disabled={currentPage >= totalPages - 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mt-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="text-sm text-gray-600 mb-1">Total Orders</div>
            <div className="text-3xl font-bold text-gray-900">{totalCount}</div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="text-sm text-gray-600 mb-1">Pending Payment</div>
            <div className="text-3xl font-bold text-yellow-600">
              {filteredOrders.filter(o => o.status === 0).length}
            </div>
          </div>
          {/* 🆕 Paid Orders Ready to Settle */}
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl shadow-md p-6 border-2 border-emerald-200">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-emerald-700 font-semibold">Ready to Settle</div>
            </div>
            <div className="text-3xl font-bold text-emerald-600">
              {filteredOrders.filter(o => o.status === 1).length}
            </div>
            <div className="text-xs text-emerald-600 mt-1">
              💸 Click "Settle" to complete
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="text-sm text-gray-600 mb-1">Completed</div>
            <div className="text-3xl font-bold text-green-600">
              {filteredOrders.filter(o => o.status === 3).length}
            </div>
          </div>
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrderForDetails && (
        <OrderDetailsModal
          orderId={selectedOrderForDetails}
          isOpen={!!selectedOrderForDetails}
          onClose={() => setSelectedOrderForDetails(null)}
          onRefresh={() => {
            refetchOrders();
            refetchCount();
          }}
        />
      )}
    </DashboardLayout>
  );
}
