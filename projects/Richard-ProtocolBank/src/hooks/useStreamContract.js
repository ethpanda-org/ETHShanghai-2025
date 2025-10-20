import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import StreamPaymentABI from '../contracts/StreamPaymentABI.json';

const CONTRACT_ADDRESS = '0x7AD47F2727506EBC632EEf3bD980655c7Be64B52';

export function useStreamContract(signer, provider) {
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (signer) {
      const contractInstance = new ethers.Contract(
        CONTRACT_ADDRESS,
        StreamPaymentABI,
        signer
      );
      setContract(contractInstance);
    } else if (provider) {
      const contractInstance = new ethers.Contract(
        CONTRACT_ADDRESS,
        StreamPaymentABI,
        provider
      );
      setContract(contractInstance);
    }
  }, [signer, provider]);

  // 注册供应商
  const registerSupplier = useCallback(
    async (name, brand, category, profitMargin) => {
      if (!contract || !signer) throw new Error('合约未初始化');

      setLoading(true);
      try {
        const tx = await contract.registerSupplier(
          name,
          brand,
          category,
          Math.round(profitMargin * 100)
        );
        await tx.wait();
        return tx.hash;
      } catch (error) {
        console.error('注册供应商失败:', error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [contract, signer]
  );

  // 创建支付
  const createPayment = useCallback(
    async (to, category, amountInEth) => {
      if (!contract || !signer) throw new Error('合约未初始化');

      setLoading(true);
      try {
        const tx = await contract.createPayment(to, category, {
          value: ethers.parseEther(amountInEth),
        });
        await tx.wait();
        return tx.hash;
      } catch (error) {
        console.error('创建支付失败:', error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [contract, signer]
  );

  // 获取供应商列表
  const getSuppliers = useCallback(async () => {
    if (!contract) return [];

    try {
      const addresses = await contract.getSuppliers();
      return addresses;
    } catch (error) {
      console.error('获取供应商列表失败:', error);
      return [];
    }
  }, [contract]);

  // 获取单个供应商信息
  const getSupplier = useCallback(
    async (address) => {
      if (!contract) return null;

      try {
        const supplier = await contract.getSupplier(address);
        return {
          wallet: supplier.wallet,
          name: supplier.name,
          brand: supplier.brand,
          category: supplier.category,
          profitMargin: Number(supplier.profitMargin) / 100,
          totalReceived: ethers.formatEther(supplier.totalReceived),
          isActive: supplier.isActive,
        };
      } catch (error) {
        console.error('获取供应商信息失败:', error);
        return null;
      }
    },
    [contract]
  );

  // 获取支付记录
  const getPayments = useCallback(async () => {
    if (!contract) return [];

    try {
      const payments = await contract.getPayments();
      return payments.map((p) => ({
        id: Number(p.id),
        from: p.from,
        to: p.to,
        amount: ethers.formatEther(p.amount),
        timestamp: Number(p.timestamp),
        category: p.category,
        status: ['Pending', 'Completed', 'Failed'][Number(p.status)],
      }));
    } catch (error) {
      console.error('获取支付记录失败:', error);
      return [];
    }
  }, [contract]);

  // 获取统计数据
  const getStatistics = useCallback(async () => {
    if (!contract) {
      return {
        totalPayments: 0,
        totalAmount: '0',
        supplierCount: 0,
        averagePayment: '0',
      };
    }

    try {
      const stats = await contract.getPaymentStatistics();
      return {
        totalPayments: Number(stats.totalPayments),
        totalAmount: ethers.formatEther(stats.totalAmount),
        supplierCount: Number(stats.supplierCount),
        averagePayment: ethers.formatEther(stats.averagePayment),
      };
    } catch (error) {
      console.error('获取统计数据失败:', error);
      return {
        totalPayments: 0,
        totalAmount: '0',
        supplierCount: 0,
        averagePayment: '0',
      };
    }
  }, [contract]);

  return {
    contract,
    loading,
    registerSupplier,
    createPayment,
    getSuppliers,
    getSupplier,
    getPayments,
    getStatistics,
  };
}

