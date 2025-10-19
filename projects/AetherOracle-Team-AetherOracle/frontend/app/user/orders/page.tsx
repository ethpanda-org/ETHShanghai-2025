'use client';

import { useState, useEffect } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { CONTRACTS, PAYMENT_GATEWAY_ABI, ERC20_ABI } from '@/lib/contracts';
import { getOrderMetadataFromIPFS, type OrderMetadata } from '@/lib/ipfs';
import { formatUnits, parseAbiItem, decodeEventLog } from 'viem';
import { getUserPaymentOrders } from '@/lib/supabase';

interface OrderRecord {
  orderId: string;
  orderIdBytes32: `0x${string}`;
  merchant: string;
  orderAmount: bigint;
  paymentToken: string;
  settlementToken: string;
  paidAmount: bigint;
  status: number;
  createdAt: number;
  blockNumber: bigint;
  transactionHash: `0x${string}`;
  metadata?: OrderMetadata;
  tokenSymbol?: string;
}

export default function UserOrdersPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Loading orders...');

  useEffect(() => {
    const fetchUserOrders = async () => {
      if (!address) {
        setIsLoading(false);
        return;
      }

      setLoadingMessage('Loading your orders...');

      try {
        // Try to fetch from Supabase first
        console.log('📊 Fetching orders from Supabase for:', address);

        try {
          const supabaseOrders = await getUserPaymentOrders(address);

          if (supabaseOrders && supabaseOrders.length > 0) {
            console.log(`✅ Found ${supabaseOrders.length} orders in Supabase`);

            // Convert Supabase format to our OrderRecord format
            const formattedOrders: OrderRecord[] = supabaseOrders.map(order => ({
              orderId: order.order_id,
              orderIdBytes32: order.order_id_bytes32 as `0x${string}`,
              merchant: order.merchant_address,
              orderAmount: BigInt(Math.round(Number(order.amount) * 1e6)), // Convert to bigint wei format
              paymentToken: order.token_address as `0x${string}`,
              settlementToken: order.settlement_token || order.token_address,
              paidAmount: BigInt(Math.round(Number(order.amount) * 1e6)),
              status: order.status,
              createdAt: Math.floor(new Date(order.created_at || '').getTime() / 1000),
              blockNumber: BigInt(order.block_number || 0),
              transactionHash: order.transaction_hash as `0x${string}`,
              metadata: order.description || order.buyer_email ? {
                description: order.description || '',
                buyerEmail: order.buyer_email || ''
              } : undefined,
              tokenSymbol: order.token_symbol
            }));

            setOrders(formattedOrders);
            setIsLoading(false);
            return;
          }
        } catch (supabaseError) {
          console.warn('⚠️ Supabase fetch failed, falling back to blockchain:', supabaseError);
        }

        // Fallback to blockchain query if Supabase fails or has no data
        if (!publicClient) {
          setIsLoading(false);
          return;
        }

        setLoadingMessage('Scanning blockchain for your payments...');

        // 查询 PaymentReceived 事件，筛选 payer 为当前用户的事件
        console.log('🔍 Querying payment events for:', address);

        // 限制查询范围以避免 RPC 错误（最近 1000 个区块）
        const currentBlock = await publicClient.getBlockNumber();
        const fromBlock = currentBlock > BigInt(1000) ? currentBlock - BigInt(1000) : BigInt(0);
        console.log(`📊 Querying from block ${fromBlock} to ${currentBlock}`);

        const logs = await publicClient.getLogs({
          address: CONTRACTS.PAYMENT_GATEWAY_V2 as `0x${string}`,
          event: parseAbiItem('event PaymentReceived(bytes32 indexed orderId, address indexed payer, uint256 amount, address token)'),
          args: {
            payer: address as `0x${string}`,
          },
          fromBlock: fromBlock,
          toBlock: 'latest',
        });

        console.log(`Found ${logs.length} payment events for user`);
        setLoadingMessage(`Found ${logs.length} orders, loading details...`);

        const userOrders: OrderRecord[] = [];

        for (const log of logs) {
          try {
            const { args } = decodeEventLog({
              abi: PAYMENT_GATEWAY_ABI,
              eventName: 'PaymentReceived',
              data: log.data,
              topics: log.topics,
            });

            const orderId = args.orderId as `0x${string}`;
            console.log('Processing order:', orderId);

            // 获取订单详情
            const orderDetails = await publicClient.readContract({
              address: CONTRACTS.PAYMENT_GATEWAY_V2 as `0x${string}`,
              abi: PAYMENT_GATEWAY_ABI,
              functionName: 'getOrder',
              args: [orderId],
            }) as any;

            // 尝试通过 OrderCreated 事件获取原始字符串ID
            let orderStringId = '';
            let metadataURI = orderDetails[8] as string;

            const createLogs = await publicClient.getLogs({
              address: CONTRACTS.PAYMENT_GATEWAY_V2 as `0x${string}`,
              event: parseAbiItem('event OrderCreated(bytes32 indexed orderId, string orderIdString, address indexed merchant, uint256 orderAmount, address paymentToken, address settlementToken, string metadataURI)'),
              args: {
                orderId: orderId,
              },
              fromBlock: fromBlock, // 使用相同的起始区块
              toBlock: 'latest',
            });

            if (createLogs.length > 0) {
              const { args: createArgs } = decodeEventLog({
                abi: PAYMENT_GATEWAY_ABI,
                eventName: 'OrderCreated',
                data: createLogs[0].data,
                topics: createLogs[0].topics,
              });
              orderStringId = createArgs.orderIdString as string;
              if (createArgs.metadataURI) {
                metadataURI = createArgs.metadataURI as string;
              }
            }

            // 获取代币符号
            let tokenSymbol = 'TOKEN';
            const paymentToken = args.token as `0x${string}`;
            if (paymentToken) {
              try {
                const symbol = await publicClient.readContract({
                  address: paymentToken,
                  abi: ERC20_ABI,
                  functionName: 'symbol',
                }) as string;
                tokenSymbol = symbol;
              } catch (e) {
                console.error('Failed to get token symbol:', e);
              }
            }

            // 获取元数据
            let metadata: OrderMetadata | undefined;
            if (metadataURI && metadataURI.startsWith('ipfs://')) {
              try {
                metadata = await getOrderMetadataFromIPFS(metadataURI);
              } catch (e) {
                console.error('Failed to get metadata:', e);
              }
            }

            userOrders.push({
              orderId: orderStringId || orderId,
              orderIdBytes32: orderId,
              merchant: orderDetails[0] as string,
              orderAmount: orderDetails[2] as bigint,
              paymentToken: paymentToken,
              settlementToken: orderDetails[0] as string, // 从orderDetails获取
              paidAmount: args.amount as bigint,
              status: Number(orderDetails[5]),
              createdAt: Number(orderDetails[6]),
              blockNumber: log.blockNumber,
              transactionHash: log.transactionHash,
              metadata,
              tokenSymbol,
            });
          } catch (e) {
            console.error(`Failed to get details for order:`, e);
          }
        }

        // 按区块号倒序排列（最新的在前）
        userOrders.sort((a, b) => Number(b.blockNumber - a.blockNumber));
        setOrders(userOrders);
        console.log('✅ Loaded orders:', userOrders.length);
      } catch (error) {
        console.error('Failed to fetch user orders:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserOrders();
  }, [address, publicClient]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center max-w-md">
          <div className="text-6xl mb-4">🔐</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Please Connect Wallet</h1>
          <p className="text-gray-600 mb-6">Connect your wallet to view your order history</p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-emerald-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">My Order History</h1>
              <p className="text-gray-600">View all your completed payments</p>
            </div>
            <Link
              href="/user"
              className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Orders List */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-200">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center gap-3 text-lg text-gray-600">
                <svg className="animate-spin h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>{loadingMessage}</span>
              </div>
            </div>
          ) : orders.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Payment History</h2>
                <div className="text-sm text-gray-600">
                  Total Orders: <span className="font-bold text-emerald-600">{orders.length}</span>
                </div>
              </div>

              {/* Order Cards */}
              {orders.map((order, index) => (
                <div
                  key={order.orderIdBytes32}
                  className="border border-gray-200 rounded-xl p-6 hover:border-emerald-300 transition-all hover:shadow-md bg-gradient-to-r from-white to-emerald-50/30"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-3">
                        <div className="text-2xl">🧾</div>
                        <div>
                          <div className="text-sm text-gray-500 mb-1">Order ID</div>
                          <div className="font-mono text-sm font-semibold text-gray-900">
                            {order.orderId || `${order.orderIdBytes32.slice(0, 10)}...`}
                          </div>
                        </div>
                      </div>

                      {order.metadata && (
                        <div className="bg-emerald-50 rounded-lg p-3 mb-3 border border-emerald-200">
                          {order.metadata.description && (
                            <p className="text-sm text-gray-700">
                              <span className="font-semibold">📝 Description:</span> {order.metadata.description}
                            </p>
                          )}
                          {order.metadata.buyerEmail && (
                            <p className="text-sm text-gray-700 mt-1">
                              <span className="font-semibold">📧 Email:</span> {order.metadata.buyerEmail}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div>
                          <div className="text-xs text-gray-500">Amount</div>
                          <div className="font-bold text-emerald-600">
                            {formatUnits(order.paidAmount, 6)} {order.tokenSymbol}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Status</div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                            <span className="text-sm font-semibold text-emerald-600">Paid</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Block Number</div>
                          <div className="text-sm font-medium text-gray-900">
                            {order.blockNumber.toString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Order Date</div>
                          <div className="text-sm font-medium text-gray-900">
                            {new Date(order.createdAt * 1000).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="text-xs text-gray-500">Merchant Address</div>
                        <div className="font-mono text-xs text-gray-700 break-all">
                          {order.merchant}
                        </div>
                      </div>
                    </div>

                    <div className="ml-4">
                      <div className="text-xs text-gray-500 text-right mb-1">#{orders.length - index}</div>
                      <a
                        href={`https://sepolia-optimism.etherscan.io/tx/${order.transactionHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                      >
                        View TX
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No Orders Yet</h3>
              <p className="text-gray-600 mb-6">You haven't made any payments yet</p>
              <Link
                href="/orders"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl"
              >
                Browse Orders
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        {orders.length > 0 && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-lg p-6 border border-emerald-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">💳</span>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Total Payments</div>
                  <div className="text-2xl font-bold text-gray-900">{orders.length}</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border border-emerald-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">💰</span>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Total Spent (USDC)</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {orders
                      .filter(o => o.tokenSymbol === 'USDC')
                      .reduce((sum, o) => sum + Number(formatUnits(o.paidAmount, 6)), 0)
                      .toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border border-emerald-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">🌱</span>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Public Goods Impact</div>
                  <div className="text-2xl font-bold text-emerald-600">
                    ~{(() => {
                      // 🆕 正确计算公共收益：基于合约逻辑
                      // 假设大部分是稳定币对，使用平均值
                      // 稳定币对: 0.00005 (0.005%), 加密货币对: 0.0001 (0.01%)
                      // 保守估算使用 0.00005 (实际可能更高)
                      const totalSpent = orders.reduce((sum, o) => sum + Number(formatUnits(o.paidAmount, 6)), 0);
                      const estimatedDonation = totalSpent * 0.00005; // 0.1% platform fee × 5% donation
                      return estimatedDonation.toFixed(4);
                    })()} USDC
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    0.1% platform fee × 5% goes to public goods
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}