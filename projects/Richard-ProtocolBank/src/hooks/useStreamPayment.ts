import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { STREAM_PAYMENT_ADDRESS, STREAM_PAYMENT_ABI } from '@/contracts/config';
import { parseEther, formatEther } from 'viem';

export function useStreamPayment() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  // 注册供应商
  const registerSupplier = async (
    name: string,
    brand: string,
    category: string,
    profitMargin: number
  ) => {
    if (!address) throw new Error('Wallet not connected');
    
    const hash = await writeContractAsync({
      address: STREAM_PAYMENT_ADDRESS,
      abi: STREAM_PAYMENT_ABI,
      functionName: 'registerSupplier',
      args: [name, brand, category, Math.round(profitMargin * 100)],
    });

    return hash;
  };

  // 创建支付
  const createPayment = async (
    to: `0x${string}`,
    category: string,
    amountInEth: string
  ) => {
    if (!address) throw new Error('Wallet not connected');

    const hash = await writeContractAsync({
      address: STREAM_PAYMENT_ADDRESS,
      abi: STREAM_PAYMENT_ABI,
      functionName: 'createPayment',
      args: [to, category],
      value: parseEther(amountInEth),
    });

    return hash;
  };

  return {
    registerSupplier,
    createPayment,
  };
}

// 读取供应商数据
export function useSuppliers() {
  const { data: supplierAddresses } = useReadContract({
    address: STREAM_PAYMENT_ADDRESS,
    abi: STREAM_PAYMENT_ABI,
    functionName: 'getSuppliers',
  });

  return {
    supplierAddresses: (supplierAddresses as `0x${string}`[]) || [],
  };
}

// 读取单个供应商
export function useSupplier(supplierAddress: `0x${string}` | undefined) {
  const { data } = useReadContract({
    address: STREAM_PAYMENT_ADDRESS,
    abi: STREAM_PAYMENT_ABI,
    functionName: 'getSupplier',
    args: supplierAddress ? [supplierAddress] : undefined,
  });

  if (!data) return null;

  const supplier = data as any;
  return {
    wallet: supplier.wallet,
    name: supplier.name,
    brand: supplier.brand,
    category: supplier.category,
    profitMargin: Number(supplier.profitMargin) / 100,
    totalReceived: formatEther(supplier.totalReceived),
    isActive: supplier.isActive,
  };
}

// 读取支付记录
export function usePayments() {
  const { data } = useReadContract({
    address: STREAM_PAYMENT_ADDRESS,
    abi: STREAM_PAYMENT_ABI,
    functionName: 'getPayments',
  });

  if (!data) return { payments: [] };

  const payments = (data as any[]).map((p: any) => ({
    id: Number(p.id),
    from: p.from,
    to: p.to,
    amount: formatEther(p.amount),
    timestamp: Number(p.timestamp),
    category: p.category,
    status: ['Pending', 'Completed', 'Failed'][Number(p.status)],
  }));

  return { payments };
}

// 读取统计数据
export function usePaymentStatistics() {
  const { data } = useReadContract({
    address: STREAM_PAYMENT_ADDRESS,
    abi: STREAM_PAYMENT_ABI,
    functionName: 'getPaymentStatistics',
  });

  if (!data) {
    return {
      totalPayments: 0,
      totalAmount: '0',
      supplierCount: 0,
      averagePayment: '0',
    };
  }

  const stats = data as any;
  return {
    totalPayments: Number(stats.totalPayments),
    totalAmount: formatEther(stats.totalAmount),
    supplierCount: Number(stats.supplierCount),
    averagePayment: formatEther(stats.averagePayment),
  };
}

