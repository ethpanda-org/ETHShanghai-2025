import { useState, useEffect } from 'react';
import { usePublicClient } from 'wagmi';
import { CONTRACTS, PAYMENT_GATEWAY_ABI } from '@/lib/contracts';
import { parseAbiItem } from 'viem';

export interface UserPayment {
  orderId: string;
  orderIdBytes32: `0x${string}`;
  merchant: string;
  merchantName: string;
  amount: number;
  token: string;
  tokenSymbol: string;
  donation: number;
  status: string;
  txHash: string;
  timestamp: number;
  blockNumber: bigint;
}

/**
 * Hook to fetch user's payment history from contract events
 * 
 * Since the contract doesn't have a payerOrderIds mapping,
 * we need to fetch OrderPaid events and filter by payer address
 */
export function useUserPayments(address: `0x${string}` | undefined) {
  const publicClient = usePublicClient();
  const [payments, setPayments] = useState<UserPayment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address || !publicClient) {
      setPayments([]);
      return;
    }

    const fetchPayments = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // ✅ 修复：使用更小的区块范围查询（最近10000个区块，约1.5天）
        const latestBlock = await publicClient.getBlockNumber();
        const fromBlock = latestBlock - BigInt(10000);

        console.log('📊 Fetching payments from block', fromBlock.toString(), 'to', latestBlock.toString(), '(~10k blocks)');

        // ✅ 修复：分批查询，每次2000个区块
        const BATCH_SIZE = 2000n;
        let allLogs: any[] = [];

        for (let start = fromBlock; start <= latestBlock; start += BATCH_SIZE) {
          const end = start + BATCH_SIZE > latestBlock ? latestBlock : start + BATCH_SIZE;

          try {
            const logs = await publicClient.getLogs({
              address: CONTRACTS.PAYMENT_GATEWAY_V2 as `0x${string}`,
              event: parseAbiItem('event PaymentReceived(bytes32 indexed orderId, address indexed payer, uint256 amount, address token)'),
              args: {
                payer: address, // 筛选当前用户的支付
              },
              fromBlock: start,
              toBlock: end,
            });

            allLogs = allLogs.concat(logs);
          } catch (batchError) {
            console.warn(`Batch query failed (${start}-${end}), skipping:`, batchError);
          }
        }

        console.log('📜 Found PaymentReceived events:', allLogs.length);
        const logs = allLogs;

        // 为每个事件获取订单详情
        const paymentPromises = logs.map(async (log) => {
          const { orderId, paidAmount } = log.args as {
            orderId: `0x${string}`;
            payer: `0x${string}`;
            paidAmount: bigint;
            receivedAmount: bigint;
          };

          try {
            // 直接使用 getOrder 获取基本信息
            const orderInfo = await publicClient.readContract({
              address: CONTRACTS.PAYMENT_GATEWAY_V2 as `0x${string}`,
              abi: PAYMENT_GATEWAY_ABI,
              functionName: 'getOrder',
              args: [orderId],
            }) as any;

            const merchant = orderInfo[0] as string;
            const status = orderInfo[5] as number;

            // 获取商家信息
            const merchantInfo = await publicClient.readContract({
              address: CONTRACTS.PAYMENT_GATEWAY_V2 as `0x${string}`,
              abi: PAYMENT_GATEWAY_ABI,
              functionName: 'getMerchantInfo',
              args: [merchant as `0x${string}`],
            }) as any;

            const merchantName = merchantInfo[0] as string || 'Unknown Merchant';

            // 获取区块信息以获取时间戳
            const block = await publicClient.getBlock({
              blockNumber: log.blockNumber,
            });

            // 获取交易哈希
            const txHash = log.transactionHash || '0x';

            // 计算捐赠金额（假设 0.05% 的费用用于公共物品）
            const donation = Number(paidAmount) * 0.0005 / 1e6; // 0.05% 捐赠率

            // 生成简短的订单ID显示
            const shortOrderId = orderId.slice(0, 10) + '...';

            return {
              orderId: shortOrderId,
              orderIdBytes32: orderId,
              merchant,
              merchantName,
              amount: Number(paidAmount) / 1e6, // 假设 6 decimals (USDC/USDT)
              token: orderInfo[4] || CONTRACTS.MOCK_USDC, // paymentToken
              tokenSymbol: 'USDC', // TODO: 从代币合约获取
              donation,
              status: status === 3 ? 'completed' : 'pending',
              txHash,
              timestamp: Number(block.timestamp),
              blockNumber: log.blockNumber,
            } as UserPayment;
          } catch (err) {
            console.error('Error fetching order details for', orderId, err);
            return null;
          }
        });

        const paymentsData = await Promise.all(paymentPromises);
        const validPayments = paymentsData.filter((p): p is UserPayment => p !== null);

        // 按时间戳降序排序（最新的在前）
        validPayments.sort((a, b) => b.timestamp - a.timestamp);

        setPayments(validPayments);
        console.log('✅ Fetched user payments:', validPayments.length);
      } catch (err: any) {
        console.error('❌ Error fetching user payments:', err);
        setError(err.message || 'Failed to fetch payments');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPayments();
  }, [address, publicClient]);

  return {
    payments,
    isLoading,
    error,
    refetch: () => {
      // 触发重新获取
      if (address && publicClient) {
        setPayments([]);
      }
    },
  };
}

