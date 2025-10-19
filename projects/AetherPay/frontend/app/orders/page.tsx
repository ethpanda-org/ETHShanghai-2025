'use client';

import { useState, useEffect } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { parseAbiItem } from 'viem';
import Link from 'next/link';
import { CONTRACTS, PAYMENT_GATEWAY_ABI } from '@/lib/contracts';

interface OrderItem {
  orderId: string;
  orderIdBytes32: string;
  merchant: string;
  merchantName: string;
  amount: number;
  paymentToken: string;
  tokenSymbol: string;
  status: string;
  createdAt: number;
  expiryTime: number;
}

export default function OrdersMarketPage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'expiring'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 获取所有待支付订单
  useEffect(() => {
    const fetchOrders = async () => {
      if (!publicClient) return;

      try {
        setIsLoading(true);

        console.log('🔍 Fetching orders from contract:', CONTRACTS.PAYMENT_GATEWAY_V2);

        // ✅ 修复：使用更小的区块范围查询（最近10000个区块，约1.5天）
        const latestBlock = await publicClient.getBlockNumber();
        const fromBlock = latestBlock - BigInt(10000); // 只查询最近10000个区块

        console.log('📊 Optimized block range:', fromBlock.toString(), '->', latestBlock.toString(), '(~10k blocks)');

        // ✅ 修复：分批查询，每次2000个区块
        const BATCH_SIZE = 2000n;
        let allLogs: any[] = [];

        for (let start = fromBlock; start <= latestBlock; start += BATCH_SIZE) {
          const end = start + BATCH_SIZE > latestBlock ? latestBlock : start + BATCH_SIZE;

          console.log(`  Fetching blocks ${start.toString()} to ${end.toString()}...`);

          try {
            const logs = await publicClient.getLogs({
              address: CONTRACTS.PAYMENT_GATEWAY_V2 as `0x${string}`,
              event: parseAbiItem('event OrderCreated(bytes32 indexed orderId, string orderIdString, address indexed merchant, address indexed designatedPayer, uint256 orderAmount, address paymentToken, address settlementToken, string metadataURI)'),
              fromBlock: start,
              toBlock: end,
            });

            allLogs = allLogs.concat(logs);
            console.log(`    Found ${logs.length} events in this batch`);
          } catch (batchError) {
            console.warn(`    Batch query failed (${start}-${end}), skipping:`, batchError);
            // 继续查询下一批，不中断整个流程
          }
        }

        console.log('✅ Total OrderCreated events found:', allLogs.length);
        const logs = allLogs;

        // 为每个订单获取详情
        const orderPromises = logs.map(async (log, index) => {
          const { orderId, orderIdString, merchant, orderAmount } = log.args as {
            orderId: `0x${string}`;
            orderIdString: string;
            merchant: `0x${string}`;
            orderAmount: bigint;
          };

          console.log(`📦 Processing order ${index + 1}/${logs.length}:`, orderIdString);

          try {
            // 获取订单详情
            const orderInfo = await publicClient.readContract({
              address: CONTRACTS.PAYMENT_GATEWAY_V2 as `0x${string}`,
              abi: PAYMENT_GATEWAY_ABI,
              functionName: 'getOrder',
              args: [orderId],
            }) as any;

            console.log('   Order info:', orderInfo);

            const status = orderInfo[5] as number;
            console.log('   Status:', status, status === 0 ? '(PENDING)' : '(NOT PENDING)');

            // 只返回待支付订单
            if (status !== 0) {
              console.log('   ⏭️  Skipping non-pending order');
              return null;
            }

            // 获取商家信息
            const merchantInfo = await publicClient.readContract({
              address: CONTRACTS.PAYMENT_GATEWAY_V2 as `0x${string}`,
              abi: PAYMENT_GATEWAY_ABI,
              functionName: 'getMerchantInfo',
              args: [merchant],
            }) as any;

            const merchantName = merchantInfo[0] as string || 'Unknown Merchant';
            const createdAt = Number(orderInfo[6]);
            const expiryTime = Number(orderInfo[7]);

            const orderItem = {
              orderId: orderIdString,
              orderIdBytes32: orderId,
              merchant,
              merchantName,
              amount: Number(orderAmount) / 1e6,
              paymentToken: orderInfo[4] as string,
              tokenSymbol: 'USDC',
              status: 'pending',
              createdAt,
              expiryTime,
            } as OrderItem;

            console.log('   ✅ Order added:', orderItem);
            return orderItem;
          } catch (error) {
            console.error('   ❌ Error fetching order details:', error);
            return null;
          }
        });

        const orderResults = await Promise.all(orderPromises);
        const validOrders = orderResults.filter((order): order is OrderItem => order !== null);

        console.log('📊 Total valid orders:', validOrders.length);

        // 按创建时间倒序排序
        validOrders.sort((a, b) => b.createdAt - a.createdAt);

        setOrders(validOrders);
      } catch (error) {
        console.error('❌ Error fetching orders:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [publicClient]);

  // 过滤订单
  const filteredOrders = orders.filter((order) => {
    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !order.orderId.toLowerCase().includes(query) &&
        !order.merchantName.toLowerCase().includes(query)
      ) {
        return false;
      }
    }

    // 状态过滤
    if (filter === 'expiring') {
      const now = Math.floor(Date.now() / 1000);
      const timeLeft = order.expiryTime - now;
      return timeLeft > 0 && timeLeft < 3600; // 1小时内过期
    }

    return true;
  });

  const now = Math.floor(Date.now() / 1000);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-slate-600 hover:text-slate-900 transition-colors group">
                <svg className="w-6 h-6 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Orders Marketplace</h1>
                <p className="text-sm text-slate-500">Browse and pay public orders</p>
              </div>
            </div>
            {isConnected && (
              <Link
                href="/user"
                className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2.5 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="font-medium">My Account</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 hover:shadow-xl transition-all">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <div className="text-sm text-slate-600 font-medium">Pending Orders</div>
                <div className="text-3xl font-bold text-slate-900">{orders.length}</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 hover:shadow-xl transition-all">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="text-sm text-slate-600 font-medium">Expiring Soon</div>
                <div className="text-3xl font-bold text-slate-900">
                  {orders.filter(o => {
                    const timeLeft = o.expiryTime - now;
                    return timeLeft > 0 && timeLeft < 3600;
                  }).length}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 hover:shadow-xl transition-all">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-md">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="text-sm text-slate-600 font-medium">Total Amount</div>
                <div className="text-3xl font-bold text-slate-900">
                  ${orders.reduce((sum, o) => sum + o.amount, 0).toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by order ID or merchant name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder-slate-400"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                  filter === 'all'
                    ? 'bg-gradient-to-r from-slate-800 to-slate-900 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('expiring')}
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                  filter === 'expiring'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Expiring Soon
              </button>
            </div>
          </div>
        </div>

        {/* Orders List */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          {isLoading ? (
            <div className="text-center py-16">
              <div className="animate-spin w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-slate-600 font-medium">Loading orders...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">No Orders Found</h3>
              <p className="text-slate-600 mb-6">
                {searchQuery ? 'No orders match your search criteria' : 'There are no pending orders at the moment'}
              </p>
              <Link
                href="/dashboard/create-order"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-700 transition-all shadow-md"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create an Order
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredOrders.map((order, index) => {
                const timeLeft = order.expiryTime - now;
                const isExpiring = timeLeft > 0 && timeLeft < 3600;
                const isExpired = timeLeft <= 0;

                return (
                  <div key={index} className="p-6 hover:bg-gradient-to-r hover:from-slate-50 hover:to-blue-50 transition-all">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-lg font-bold text-slate-900">{order.merchantName}</h3>
                          {isExpiring && (
                            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold bg-amber-100 text-amber-700 animate-pulse">
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                              </svg>
                              Expiring Soon
                            </span>
                          )}
                          {isExpired && (
                            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold bg-red-100 text-red-700">
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                              </svg>
                              Expired
                            </span>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-slate-500">Order ID:</span>
                            <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{order.orderId}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-slate-500">Created:</span>
                            <span className="text-slate-700">{new Date(order.createdAt * 1000).toLocaleString('en-US')}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-slate-500">Time left:</span>
                            {isExpired ? (
                              <span className="text-red-600 font-medium">Expired</span>
                            ) : (
                              <span className={`font-medium ${isExpiring ? 'text-amber-600' : 'text-slate-700'}`}>
                                {Math.floor(timeLeft / 3600)}h {Math.floor((timeLeft % 3600) / 60)}m
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-slate-500">Merchant:</span>
                            <span className="font-mono text-slate-600 text-xs">
                              {order.merchant.slice(0, 6)}...{order.merchant.slice(-4)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-slate-900 mb-1">
                          ${order.amount.toFixed(2)}
                        </div>
                        <div className="text-sm font-medium text-slate-600">{order.tokenSymbol}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end">
                      <Link
                        href={`/pay/${order.orderId}`}
                        className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-all ${
                          isExpired
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
                        }`}
                        onClick={isExpired ? (e) => e.preventDefault() : undefined}
                      >
                        {isExpired ? (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Expired
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            Pay Now
                          </>
                        )}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

