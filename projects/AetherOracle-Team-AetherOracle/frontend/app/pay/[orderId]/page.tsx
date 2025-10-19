'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAccount, useReadContract, useWriteContract, useReadContracts, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { CONTRACTS, PAYMENT_GATEWAY_ABI, ERC20_ABI } from '@/lib/contracts';
import { getOrderMetadataFromIPFS, type OrderMetadata } from '@/lib/ipfs';
import { parseUnits, getAddress } from 'viem';
import { toChecksumAddress, isSameAddress } from '@/lib/utils';
import { getTokenInfo } from '@/lib/tokens';
import Link from 'next/link';
import { savePaymentOrder } from '@/lib/supabase';

export default function PaymentPage() {
  const publicClient = usePublicClient();
  const router = useRouter();

  const params = useParams();
  const orderId = params.orderId as string;
  const { address, isConnected } = useAccount();
  const [isApproving, setIsApproving] = useState(false);
  const [metadata, setMetadata] = useState<OrderMetadata | null>(null);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(true);

  // 🆕 使用新的 getOrderDetailsByString 函数，一次性获取所有信息
  // ✅ 确保地址格式一致
  const gatewayAddress = toChecksumAddress(CONTRACTS.PAYMENT_GATEWAY_V2) as `0x${string}`;
  const { data: orderData, refetch: refetchOrder } = useReadContract({
    address: gatewayAddress,
    abi: PAYMENT_GATEWAY_ABI,
    functionName: 'getOrderDetailsByString',
    args: [orderId],
  });

  const order = orderData as any;
  // getOrderDetailsByString returns: (orderId, merchant, payer, orderAmount, paymentToken, settlementToken, paidAmount, receivedAmount, status, createdAt, expiryTime, metadataURI)
  const orderIdBytes32 = order ? order[0] : null; // bytes32 orderId (index 0)
  const merchant = order ? order[1] : null; // merchant (index 1)
  const payer = order ? order[2] : null; // payer (index 2)
  const orderAmountRaw = order ? order[3] : 0n; // 🆕 原始金额（wei格式，用于合约调用）
  const orderAmount = order ? Number(order[3]) / 1e6 : 0; // orderAmount (index 3) - 显示用
  const paymentToken = order ? order[4] : CONTRACTS.MOCK_USDC; // paymentToken (index 4)
  const settlementToken = order ? order[5] : CONTRACTS.MOCK_USDT; // settlementToken (index 5)
  const paidAmount = order ? Number(order[6]) / 1e6 : 0; // paidAmount (index 6)
  const receivedAmount = order ? Number(order[7]) / 1e6 : 0; // receivedAmount (index 7)
  const orderStatus = order ? Number(order[8]) : 0; // status (index 8)
  const createdAt = order ? Number(order[9]) : 0; // createdAt (index 9)
  const expiryTime = order ? Number(order[10]) : 0; // expiryTime (index 10)
  const metadataURI = order ? order[11] : ''; // metadataURI (index 11)

  // 🆕 检查订单是否已过期
  const isExpired = expiryTime > 0 && Date.now() / 1000 > expiryTime;

  // 🆕 从 IPFS 获取订单元数据
  useEffect(() => {
    const fetchMetadata = async () => {
      if (!metadataURI) {
        setIsLoadingMetadata(false);
        return;
      }

      try {
        // 仅在开发环境输出日志
        if (process.env.NODE_ENV === 'development') {
          console.log('📥 Fetching order metadata from IPFS:', metadataURI);
        }
        const data = await getOrderMetadataFromIPFS(metadataURI);
        setMetadata(data);
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Metadata fetched:', data);
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('❌ Failed to fetch metadata:', error);
        }
      } finally {
        setIsLoadingMetadata(false);
      }
    };

    fetchMetadata();
  }, [metadataURI]);

  // 🆕 动态读取平台费率、捐赠比例和汇率
  const { data: platformConfig } = useReadContracts({
    contracts: [
      {
        address: gatewayAddress,
        abi: PAYMENT_GATEWAY_ABI,
        functionName: 'platformFeeRate',
      },
      {
        address: gatewayAddress,
        abi: PAYMENT_GATEWAY_ABI,
        functionName: 'donationPercentage',
      },
      {
        address: gatewayAddress,
        abi: PAYMENT_GATEWAY_ABI,
        functionName: 'supportedTokens',
        args: paymentToken ? [toChecksumAddress(paymentToken) as `0x${string}`] : undefined,
      },
    ],
  });

  const platformFeeRate = platformConfig?.[0]?.result ? Number(platformConfig[0].result) / 10000 : 0.3; // 转换为百分比
  const donationPercentage = platformConfig?.[1]?.result ? Number(platformConfig[1].result) / 100 : 5; // 转换为百分比
  const isTokenSupported = platformConfig?.[2]?.result as boolean ?? false;

  // 计算预计的平台费和捐赠金额
  const platformFee = orderAmount * (platformFeeRate / 100);
  const donationAmount = platformFee * (donationPercentage / 100);

  // Read token info and allowance
  // ✅ 确保所有地址使用 checksummed 格式
  const { data: tokenData, refetch: refetchTokenData } = useReadContracts({
    contracts: [
      {
        address: paymentToken ? toChecksumAddress(paymentToken) as `0x${string}` : undefined,
        abi: ERC20_ABI,
        functionName: 'symbol',
      },
      {
        address: paymentToken ? toChecksumAddress(paymentToken) as `0x${string}` : undefined,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: address ? [toChecksumAddress(address) as `0x${string}`] : undefined,
      },
      {
        address: paymentToken ? toChecksumAddress(paymentToken) as `0x${string}` : undefined,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: address ? [toChecksumAddress(address) as `0x${string}`, gatewayAddress] : undefined,
      },
    ],
  });

  const tokenSymbol = tokenData?.[0]?.result as string || 'TOKEN';
  const tokenBalance = tokenData?.[1]?.result ? Number(tokenData[1].result) / 1e6 : 0;
  const allowanceRaw = (tokenData?.[2]?.result as bigint) ?? 0n; // 原始授权额度（wei）
  const allowance = Number(allowanceRaw) / 1e6; // 仅用于显示

  // 🆕 使用BigInt进行精确比较，避免浮点误差
  const needsApproval = allowanceRaw < orderAmountRaw;

  // 🆕 实时检查授权状态
  const [realTimeAllowance, setRealTimeAllowance] = useState<bigint>(0n);
  const [isCheckingAllowance, setIsCheckingAllowance] = useState(false);

  // 🔧 优化：仅在关键时刻检查授权状态
  useEffect(() => {
    if (!address || !paymentToken) return;

    const checkAllowance = async () => {
      // 🔧 防止重复检查
      if (isCheckingAllowance) return;

      setIsCheckingAllowance(true);
      try {
        const result = await refetchTokenData();
        const currentAllowance = (result.data?.[2]?.result as bigint) ?? 0n;
        setRealTimeAllowance(currentAllowance);
        // 🔧 移除频繁的日志输出
        // console.log('🔄 Real-time allowance check:', currentAllowance.toString());
      } catch (error) {
        console.error('❌ Failed to check allowance:', error);
      } finally {
        setIsCheckingAllowance(false);
      }
    };

    // 立即检查一次
    checkAllowance();

    // 🔧 优化：仅在授权成功后检查，不需要定期检查
    // 移除了 setInterval，减少不必要的网络请求
  }, [address, paymentToken]); // 🔧 移除 refetchTokenData 和 isCheckingAllowance 依赖

  // 使用实时授权状态
  const actualNeedsApproval = (realTimeAllowance || allowanceRaw) < orderAmountRaw;

  // 🔧 优化：仅在开发环境输出调试日志
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && orderIdBytes32 && orderAmountRaw) {
      console.log('📊 Payment Page State:', {
        orderId,
        orderStatus,
        allowanceRaw: allowanceRaw.toString(),
        realTimeAllowance: realTimeAllowance.toString(),
        needsApproval: actualNeedsApproval
      });
    }
  }, [orderStatus, realTimeAllowance, orderIdBytes32]); // 🔧 仅在订单状态或授权额度变化时输出日志

  // Contract write functions
  const { writeContract: approve, data: approveHash, error: approveWriteError, isError: isApproveWriteError } = useWriteContract();
  const { writeContract: pay, data: payHash, isPending: isPayPending, error: payWriteError, isError: isPayWriteError } = useWriteContract();

  // 🆕 等待授权交易确认
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess, isError: isApproveError, error: approveError } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  // 🆕 等待支付交易确认
  const { isLoading: isPayConfirming, isSuccess: isPaySuccess, isError: isPayError, error: payError } = useWaitForTransactionReceipt({
    hash: payHash,
  });

  // 🆕 监听授权成功事件，刷新 allowance
  useEffect(() => {
    if (isApproveSuccess) {
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Approval transaction confirmed! Refetching token data...');
      }
      // 🔧 优化：减少等待时间，从5秒减少到1秒
      const waitAndRefetch = async () => {
        // 等待 1 秒确保链上状态已更新
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 刷新2次即可（从5次减少到2次）
        for (let i = 0; i < 2; i++) {
          await refetchTokenData();
          if (i === 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        // 最终验证授权状态
        const finalTokenData = await refetchTokenData();
        const finalAllowanceRaw = (finalTokenData.data?.[2]?.result as bigint) ?? 0n;
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Final allowance after approval:', finalAllowanceRaw.toString());
        }

        setIsApproving(false);
      };

      waitAndRefetch();
    }
  }, [isApproveSuccess]); // 🔧 移除 refetchTokenData 依赖，避免无限循环

  // 🆕 监听支付成功事件，保存到 Supabase 并跳转到用户页面
  useEffect(() => {
    if (isPaySuccess && payHash) {
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Payment transaction confirmed! Saving to database...');
      }

      // Save order to Supabase
      const saveOrderToSupabase = async () => {
        try {
          // Get the latest block number
          const blockNumber = await publicClient?.getBlockNumber();

          await savePaymentOrder({
            order_id: orderId,
            order_id_bytes32: orderIdBytes32 || '',
            payer_address: address?.toLowerCase() || '',
            merchant_address: merchant?.toLowerCase() || '',
            amount: orderAmount,
            token_symbol: tokenSymbol,
            token_address: paymentToken?.toLowerCase() || '',
            settlement_token: settlementToken?.toLowerCase(),
            status: 2, // 2 = paid
            transaction_hash: payHash,
            block_number: Number(blockNumber || 0),
            metadata_uri: metadataURI || '',
            description: metadata?.description || '',
            buyer_email: metadata?.buyerEmail || '',
            paid_at: new Date().toISOString()
          });

          if (process.env.NODE_ENV === 'development') {
            console.log('✅ Order saved to Supabase successfully');
          }
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error('❌ Failed to save order to Supabase:', error);
          }
          // Don't block the flow if database save fails
        }
      };

      saveOrderToSupabase();

      // Don't refresh order data to avoid showing "Order Paid" page
      // Just refresh token data for balance update
      refetchTokenData();

      // Removed automatic redirect - user can click button to navigate
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Payment successful! User can now navigate manually.');
      }
    }
  }, [isPaySuccess, payHash, orderId, orderIdBytes32, address, merchant, orderAmount, tokenSymbol, paymentToken, settlementToken, metadataURI, metadata, publicClient]);

  // 🆕 监听支付写入错误（在交易发送前的错误）
  useEffect(() => {
    if (isPayWriteError && payWriteError) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Payment write error (before transaction):', {
          error: payWriteError,
          message: payWriteError.message,
          cause: payWriteError.cause,
          details: payWriteError.details
        });
      }

      // 解析具体的错误原因
      const errorMessage = payWriteError.message || '';

      if (errorMessage.includes('Order already paid')) {
        alert('❌ This order has already been paid. Please refresh the page.');
      } else if (errorMessage.includes('Order expired')) {
        alert('❌ This order has expired and can no longer be paid.');
      } else if (errorMessage.includes('Insufficient allowance')) {
        alert('❌ Insufficient token allowance. Please approve the tokens first.');
      } else if (errorMessage.includes('Insufficient balance')) {
        alert('❌ Insufficient token balance to complete the payment.');
      } else if (errorMessage.includes('Not designated payer')) {
        alert('❌ You are not authorized to pay this order. Only the designated payer can complete this payment.');
      } else {
        alert(`❌ Payment error: ${errorMessage || 'Failed to send transaction'}`);
      }
    }
  }, [isPayWriteError, payWriteError]);

  // 🆕 监听支付失败事件（交易失败）
  useEffect(() => {
    if (isPayError) {
      // 更详细的错误处理
      const errorMessage = payError?.message ||
                          payError?.shortMessage ||
                          payError?.cause?.message ||
                          'Unknown error occurred during payment';

      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Payment transaction failed:', {
          error: payError,
          message: errorMessage,
          cause: payError?.cause,
          details: payError?.details
        });
      }

      // 解析错误原因
      let userMessage = 'Payment failed: ';

      if (errorMessage.includes('user rejected') || errorMessage.includes('User denied')) {
        userMessage += 'Transaction was cancelled by user';
      } else if (errorMessage.includes('insufficient funds')) {
        userMessage += 'Insufficient funds for gas fees';
      } else if (errorMessage.includes('execution reverted')) {
        // 尝试从错误中提取 revert 原因
        const revertReason = errorMessage.match(/reason="([^"]+)"/)?.[1] ||
                           errorMessage.match(/reverted with reason string '([^']+)'/)?.[1] ||
                           'Contract execution failed - please check order status and balance';
        userMessage += revertReason;
      } else {
        userMessage += errorMessage;
      }

      alert(userMessage);
    }
  }, [isPayError, payError]);

  const handleApprove = async () => {
    // 🆕 检查余额
    if (tokenBalance < orderAmount) {
      alert(`❌ Insufficient balance!\n\nYou need ${orderAmount.toFixed(2)} ${tokenSymbol}, but you only have ${tokenBalance.toFixed(2)} ${tokenSymbol}.\n\nPlease get some test tokens first by running:\nnpx hardhat run scripts/mint-tokens.js --network op-sepolia`);
      return;
    }

    setIsApproving(true);
    try {
      const maxApproval = 2n ** 256n - 1n; // type(uint256).max

      // 🔧 FIX: 直接使用原始地址进行授权，不进行 checksum 转换
      // 因为 viem 内部会自动处理地址格式
      const spenderAddress = CONTRACTS.PAYMENT_GATEWAY_V2 as `0x${string}`;
      const tokenAddress = paymentToken as `0x${string}`;

      // 读取最新链上 allowance
      const current = await publicClient?.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [address as `0x${string}`, spenderAddress],
        blockTag: 'latest'
      }) as bigint | undefined;

      if (process.env.NODE_ENV === 'development') {
        console.log('🔓 Approving token (unlimited):', {
          token: tokenAddress,
          spender: spenderAddress,
          currentAllowance: current?.toString()
        });
      }

      // 一些代币（如 USDT）要求从非零改为新值前必须先设为 0
      if (current && current > 0n && current < maxApproval) {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 Resetting approval to 0 first...');
        }
        await approve({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [spenderAddress, 0n],
        });
        // 等待一下确保交易被处理
        await new Promise(r => setTimeout(r, 2000));
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('📝 Setting approval to MAX...');
      }
      await approve({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [spenderAddress, maxApproval],
      });

      // ✅ 等待交易确认由上方 effect 处理
    } catch (error) {
      console.error('❌ Approval failed:', error);
      setIsApproving(false);
    }
  };

  const handlePay = async () => {
    // 🆕 检查余额
    if (tokenBalance < orderAmount) {
      alert(`❌ Insufficient balance!\n\nYou need ${orderAmount.toFixed(2)} ${tokenSymbol}, but you only have ${tokenBalance.toFixed(2)} ${tokenSymbol}.\n\nPlease get some test tokens first by running:\nnpx hardhat run scripts/mint-tokens.js --network op-sepolia`);
      return;
    }

    // 🆕 检查是否是指定买家
    if (payer && payer !== '0x0000000000000000000000000000000000000000') {
      if (address?.toLowerCase() !== payer.toLowerCase()) {
        alert(`❌ Wrong Account!\n\nThis order is designated for:\n${payer}\n\nBut you are connected with:\n${address}\n\nPlease switch to the correct account in MetaMask.`);
        return;
      }
    }

    try {
      // 🔧 FIX: 使用一致的地址格式
      const spenderAddress = CONTRACTS.PAYMENT_GATEWAY_V2 as `0x${string}`;
      const tokenAddress = paymentToken as `0x${string}`;

      // Extra on-chain verification to avoid stale cache issues
      if (!publicClient) {
        throw new Error('RPC client not ready');
      }

      // 🔧 优化：移除冗余的调试日志
      const onChainAllowance = await publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [address as `0x${string}`, spenderAddress],
        blockTag: 'latest'
      }) as bigint;

      if (onChainAllowance < (orderAmountRaw ?? 0n)) {
        console.error('❌ On-chain allowance insufficient');
        throw new Error(`Insufficient allowance. Please click Approve first.`);
      }

      // 🔧 优化：移除5次刷新，直接支付
      if (process.env.NODE_ENV === 'development') {
        console.log('💳 Processing payment...');
      }

      // 🆕 验证参数
      if (!orderIdBytes32) {
        throw new Error('Order ID is missing');
      }
      if (!orderAmountRaw || orderAmountRaw === 0n) {
        throw new Error('Order amount is invalid');
      }
      if (tokenBalance < orderAmount) {
        throw new Error(`Insufficient balance`);
      }

      // 检查订单状态
      if (orderStatus !== 0) {
        const statusMessages = {
          1: 'Order is already paid',
          2: 'Order is already completed',
          3: 'Order has expired'
        };
        throw new Error(statusMessages[orderStatus as keyof typeof statusMessages] || `Invalid order status: ${orderStatus}`);
      }

      // 检查是否过期
      if (isExpired) {
        throw new Error('Order has expired and cannot be paid');
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('📤 Sending payment transaction...');
      }

      pay({
        address: spenderAddress,
        abi: PAYMENT_GATEWAY_ABI,
        functionName: 'processPayment',
        args: [orderIdBytes32, orderAmountRaw], // 🆕 使用原始金额（wei格式）
        account: address as `0x${string}`, // 🔧 FIX: 明确指定账户地址
        chainId: 11155420, // 🔧 FIX: 明确指定链ID (OP Sepolia)
      } as any);
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Payment failed:', error);
      }
      alert(`Payment failed: ${error.message || 'Unknown error'}`);
    }
  };

  // 添加加载状态，避免显示 "Order Not Found"
  if (!order && orderData === undefined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center max-w-md">
          <div className="mb-6">
            <svg className="animate-spin h-16 w-16 mx-auto text-emerald-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Loading Order Details...</h2>
          <p className="text-gray-600">Order ID: {orderId}</p>
        </div>
      </div>
    );
  }

  // 只有在确定订单不存在时才显示错误
  if (!order && orderData !== undefined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center max-w-md">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-3xl font-bold text-red-600 mb-4">Order Not Found</h1>
          <p className="text-gray-600">
            Order ID: {orderId}
          </p>
        </div>
      </div>
    );
  }

  // 🆕 显示订单已过期警告
  if (isExpired && orderStatus === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center max-w-md">
          <div className="text-6xl mb-4">⏰</div>
          <h1 className="text-3xl font-bold text-red-600 mb-4">Order Expired</h1>
          <p className="text-gray-600 mb-2">Order ID: {orderId}</p>
          <p className="text-gray-600 mb-4">Amount: {orderAmount} {tokenSymbol}</p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-6">
            <p className="text-sm text-red-800">
              ⚠️ This order has expired and can no longer be paid.
            </p>
            <p className="text-xs text-red-600 mt-2">
              Expired at: {new Date(expiryTime * 1000).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (orderStatus !== 0) {
    const statusText = ['Pending', 'Paid', 'Completed', 'Expired'][orderStatus];
    const statusEmoji = ['⏳', '✅', '✅', '❌'][orderStatus];

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center max-w-md">
          <div className="text-6xl mb-4">{statusEmoji}</div>
          <h1 className="text-3xl font-bold mb-4">Order {statusText}</h1>
          <p className="text-gray-600 mb-2">Order ID: {orderId}</p>
          <p className="text-gray-600">Amount: {orderAmount} {tokenSymbol}</p>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center max-w-md">
          <h1 className="text-3xl font-bold mb-4">Complete Payment</h1>
          <p className="text-gray-600 mb-2">Order ID: {orderId}</p>
          <p className="text-2xl font-bold text-blue-600 mb-8">
            {orderAmount} {tokenSymbol}
          </p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  // 🆕 显示支付确认中状态
  if (isPayConfirming) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center max-w-md">
          <div className="text-6xl mb-4">⏳</div>
          <h1 className="text-3xl font-bold text-blue-600 mb-4">Confirming Payment...</h1>
          <p className="text-gray-600 mb-2">Order ID: {orderId}</p>
          <p className="text-xl mb-2">Amount: {orderAmount} {tokenSymbol}</p>
          <div className="mt-6">
            <svg className="animate-spin h-12 w-12 mx-auto text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-sm text-gray-500 mt-4">Waiting for blockchain confirmation...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isPaySuccess) {
    // 🆕 计算实际的费用和捐赠金额
    const paymentTokenInfo = getTokenInfo(paymentToken);
    const settlementTokenInfo = getTokenInfo(settlementToken);
    const isStablecoinPair = paymentTokenInfo?.type === 'stablecoin' && settlementTokenInfo?.type === 'stablecoin';

    // 根据交易对类型使用不同费率
    const effectivePlatformFeeRate = isStablecoinPair ? 10 : 20; // 0.1% or 0.2% (basis points)
    const effectiveMerchantFeeRate = isStablecoinPair ? 10 : 20; // 0.1% or 0.2%
    const totalFeeRate = effectivePlatformFeeRate + effectiveMerchantFeeRate; // 20 or 40 basis points

    // 计算费用金额
    const totalFees = (orderAmount * totalFeeRate) / 10000;
    const calculatedPlatformFee = (orderAmount * effectivePlatformFeeRate) / 10000;
    const calculatedMerchantFee = (orderAmount * effectiveMerchantFeeRate) / 10000;
    const calculatedDonation = (calculatedPlatformFee * donationPercentage) / 100;

    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-12 text-center max-w-2xl w-full border-2 border-emerald-300">
          {/* Success Animation */}
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full blur-3xl opacity-20 animate-pulse"></div>
            <div className="relative w-28 h-28 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-2xl">
              <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          <h1 className="text-5xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-700 bg-clip-text text-transparent mb-4">
            Payment Successful!
          </h1>
          <p className="text-xl text-gray-700 mb-10">Thank you for using AetherPay</p>

          {/* Order Details Card - 绿色风格 */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 mb-6 border border-emerald-200">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 font-medium">Order ID</span>
                <span className="text-sm font-mono text-gray-900 bg-white px-3 py-1.5 rounded-lg border border-emerald-200">{orderId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 font-medium">Amount Paid</span>
                <span className="text-2xl font-bold text-emerald-700">{orderAmount.toFixed(2)} {tokenSymbol}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 font-medium">Status</span>
                <span className="inline-flex items-center gap-1.5 text-sm px-4 py-2 bg-emerald-500 text-white rounded-full font-bold shadow-md">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Completed
                </span>
              </div>
            </div>
          </div>

          {/* 🆕 Fee Breakdown Card - 费用明细 */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 mb-6 border border-blue-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Fee Breakdown
            </h3>
            <div className="space-y-3 text-left">
              <div className="flex justify-between items-center py-2 px-3 bg-white/60 rounded-lg">
                <span className="text-sm text-gray-700">Transaction Type</span>
                <span className="text-sm font-semibold text-gray-900">
                  {isStablecoinPair ? '🪙 Stablecoin Pair' : '🌐 Crypto Pair'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 px-3 bg-white/60 rounded-lg">
                <span className="text-sm text-gray-700">Total Fee Rate</span>
                <span className="text-sm font-semibold text-gray-900">
                  {isStablecoinPair ? '0.2%' : '0.4%'} ({totalFeeRate} basis points)
                </span>
              </div>
              <div className="border-t border-blue-200 pt-3 mt-3">
                <div className="flex justify-between items-center py-2 px-3 bg-white/80 rounded-lg mb-2">
                  <span className="text-sm text-gray-700">Platform Fee ({effectivePlatformFeeRate} bps)</span>
                  <span className="text-sm font-semibold text-blue-700">{calculatedPlatformFee.toFixed(6)} {tokenSymbol}</span>
                </div>
                <div className="flex justify-between items-center py-2 px-3 bg-white/80 rounded-lg mb-2">
                  <span className="text-sm text-gray-700">Merchant Fee ({effectiveMerchantFeeRate} bps)</span>
                  <span className="text-sm font-semibold text-blue-700">{calculatedMerchantFee.toFixed(6)} {tokenSymbol}</span>
                </div>
                <div className="flex justify-between items-center py-2 px-3 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg border-2 border-purple-300">
                  <span className="text-sm font-medium text-purple-900">💝 Public Goods Donation</span>
                  <span className="text-sm font-bold text-purple-700">{calculatedDonation.toFixed(6)} {tokenSymbol}</span>
                </div>
              </div>
              <div className="border-t border-blue-200 pt-3 mt-3">
                <div className="flex justify-between items-center">
                  <span className="text-base font-bold text-gray-900">Total Fees</span>
                  <span className="text-base font-bold text-blue-700">{totalFees.toFixed(6)} {tokenSymbol}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Public Goods Message - 绿色渐变 */}
          <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl p-6 mb-8 text-white relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-3xl"></div>
            <div className="relative">
              <div className="text-3xl mb-3">🌱💝</div>
              <p className="text-lg font-bold mb-2">You Contributed to Public Goods!</p>
              <p className="text-sm text-purple-100 mb-3">
                {calculatedDonation.toFixed(6)} {tokenSymbol} from your transaction supports Ethereum ecosystem development
              </p>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 mt-4">
                <div className="text-xs text-white/90 mb-1">How it works:</div>
                <div className="text-xs text-white/80">
                  {donationPercentage}% of platform fees → Public Goods Fund → Ethereum Developers & Infrastructure
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons - 绿色主题 */}
          <div className="space-y-3">
            <button
              onClick={() => router.push('/user')}
              className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold py-4 rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 group transform hover:scale-[1.02]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="text-lg">返回首页 / Return to Homepage</span>
            </button>

            {payHash && (
              <a
                href={`https://sepolia-optimism.etherscan.io/tx/${payHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-white border-2 border-emerald-300 text-emerald-700 font-bold py-3.5 rounded-xl hover:bg-emerald-50 hover:border-emerald-400 transition-all shadow-md hover:shadow-lg"
              >
                View on Etherscan →
              </a>
            )}

            <Link
              href="/orders"
              className="block w-full bg-gradient-to-r from-teal-50 to-emerald-50 border-2 border-teal-300 text-teal-700 font-bold py-3.5 rounded-xl hover:from-teal-100 hover:to-emerald-100 hover:border-teal-400 transition-all"
            >
              Browse More Orders
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="container mx-auto max-w-3xl">
        {/* Back Button */}
        <button
          onClick={() => window.history.back()}
          className="mb-6 inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors group"
        >
          <svg
            className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="font-medium">Back</span>
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">💳 Complete Payment</h1>
          <p className="text-gray-600">Secure payment powered by AetherPay</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Order Header */}
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 text-white">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm opacity-90 mb-1">Order ID</div>
                <div className="font-mono text-lg font-semibold">{orderId}</div>
              </div>
              <div className="flex items-center gap-3">
                {/* 🆕 显示链ID和网络名称 */}
                <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1.5 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <div className="text-sm">
                    <span className="font-medium">OP Sepolia</span>
                    <span className="opacity-75 ml-1">(ID: 11155420)</span>
                  </div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                  <ConnectButton />
                </div>
              </div>
            </div>
          </div>

          {/* Amount Section */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-8 border-b border-gray-200">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-600 mb-3">Amount Due</div>
              <div className="flex items-baseline justify-center gap-3 mb-2">
                <div className="text-6xl font-bold text-gray-900">
                  {orderAmount}
                </div>
                <div className="text-2xl font-semibold text-gray-700">{tokenSymbol}</div>
              </div>

              {/* Expiry Time Display */}
              {expiryTime > 0 && (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-white/70 backdrop-blur-sm rounded-full text-xs">
                  {isExpired ? (
                    <>
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-red-600 font-semibold">Order Expired</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                      <span className="text-slate-700">
                        Expires: <span className="font-medium">{new Date(expiryTime * 1000).toLocaleString()}</span>
                      </span>
                      <span className="text-amber-600 font-semibold">
                        ({Math.floor((expiryTime - Date.now() / 1000) / 60)} min left)
                      </span>
                    </>
                  )}
                </div>
              )}

              {/* 🆕 Display order metadata from IPFS */}
              {isLoadingMetadata ? (
                <div className="mt-6 text-center">
                  <div className="inline-flex items-center gap-2 text-sm text-gray-500">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading order details...
                  </div>
                </div>
              ) : metadata ? (
                <div className="mt-6 pt-6 border-t border-emerald-200">
                  <div className="grid md:grid-cols-2 gap-4 text-left">
                    {metadata.description && (
                      <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4">
                        <div className="text-xs font-medium text-gray-500 mb-2">📝 Description</div>
                        <div className="text-sm font-medium text-gray-900">{metadata.description}</div>
                      </div>
                    )}
                    {metadata.buyerEmail && (
                      <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4">
                        <div className="text-xs font-medium text-gray-500 mb-2">📧 Buyer Email</div>
                        <div className="text-sm font-medium text-gray-900">{metadata.buyerEmail}</div>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Payment Details */}
          <div className="p-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Details</h3>

            {/* Designated Payer Section */}
            {payer && payer !== '0x0000000000000000000000000000000000000000' && (
              <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="text-2xl flex-shrink-0">🔐</div>
                  <div className="flex-1">
                    <div className="font-bold text-amber-900 mb-2">Designated Payer Required</div>
                    <div className="text-sm text-amber-800 mb-3">
                      This order can <strong>only</strong> be paid by a specific wallet address.
                    </div>
                    <div className="bg-white rounded-lg p-3 mb-3">
                      <div className="text-xs text-slate-600 font-medium mb-1">Required Wallet:</div>
                      <div className="font-mono text-xs text-slate-800 break-all">
                        {payer}
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-3 mb-3">
                      <div className="text-xs text-slate-600 font-medium mb-1">Your Current Wallet:</div>
                      <div className="font-mono text-xs text-slate-800 break-all">
                        {address || 'Not connected'}
                      </div>
                    </div>

                    {address && address.toLowerCase() !== payer.toLowerCase() && (
                      <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mt-3">
                        <div className="flex items-start gap-2">
                          <span className="text-red-600 text-lg flex-shrink-0">⚠️</span>
                          <div className="flex-1">
                            <div className="font-bold text-red-900 mb-2">Wrong Wallet Connected</div>
                            <div className="text-sm text-red-800 space-y-2">
                              <p>You cannot pay this order with your current wallet.</p>
                              <div className="bg-red-100 rounded-lg p-3 mt-2">
                                <p className="font-semibold mb-2">How to fix:</p>
                                <ol className="list-decimal ml-4 space-y-1 text-xs">
                                  <li>Open MetaMask or your wallet provider</li>
                                  <li>Switch to the required wallet address</li>
                                  <li>Refresh this page and try again</li>
                                </ol>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {address && address.toLowerCase() === payer.toLowerCase() && (
                      <div className="bg-emerald-50 border-2 border-emerald-300 rounded-lg p-3 mt-3">
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-600 text-lg">✅</span>
                          <div>
                            <div className="font-bold text-emerald-900">Wallet Verified</div>
                            <p className="text-sm text-emerald-800">You can proceed with payment.</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center py-3 px-4 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">💰 Your Balance</span>
                <span className="font-semibold text-gray-900">{tokenBalance.toFixed(2)} {tokenSymbol}</span>
              </div>

              {/* 🆕 显示代币支持状态 */}
              {!isTokenSupported && paymentToken && (
                <div className="flex justify-between items-center py-3 px-4 bg-red-50 border border-red-200 rounded-lg">
                  <span className="text-sm font-medium text-red-700">⚠️ Token Support</span>
                  <span className="font-semibold text-red-900">Not Supported</span>
                </div>
              )}

              <div className="flex justify-between items-center py-3 px-4 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">🔄 Settlement Token</span>
                <span className="font-semibold text-gray-900">
                  {settlementToken === CONTRACTS.MOCK_USDC ? 'USDC' : 'USDT'}
                </span>
              </div>

              {/* 🆕 显示具体汇率 */}
              <div className="flex justify-between items-center py-3 px-4 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">📈 Exchange Rate</span>
                <div className="text-right">
                  <span className="font-semibold text-emerald-600">1 USDC = 1.0001 USDT</span>
                  <div className="text-xs text-gray-500 mt-0.5">AI Oracle (Updated: {new Date().toLocaleTimeString()})</div>
                </div>
              </div>

              {/* 🆕 动态显示平台费率 */}
              <div className="flex justify-between items-center py-3 px-4 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">💵 Platform Fee</span>
                <div className="text-right">
                  <span className="font-semibold text-gray-900">{platformFeeRate}%</span>
                  <div className="text-xs text-gray-500 mt-0.5">≈ {platformFee.toFixed(4)} {tokenSymbol}</div>
                </div>
              </div>

              {/* 🆕 显示预计捐赠金额 */}
              <div className="flex justify-between items-center py-3 px-4 bg-purple-50 border border-purple-200 rounded-lg">
                <span className="text-sm font-medium text-purple-700">💝 Public Goods Donation</span>
                <div className="text-right">
                  <span className="font-semibold text-purple-900">{donationPercentage}% of platform fee</span>
                  <div className="text-xs text-purple-600 mt-0.5">≈ {donationAmount.toFixed(6)} {tokenSymbol}</div>
                </div>
              </div>
            </div>

            {/* Public Goods Notice */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="text-2xl">💝</div>
                <div>
                  <div className="font-semibold text-purple-900 mb-1">Supporting Public Goods</div>
                  <p className="text-sm text-purple-800">
                    5% of platform fees automatically support Ethereum public goods initiatives
                  </p>
                </div>
              </div>
            </div>

            {/* Insufficient Balance Warning */}
            {tokenBalance < orderAmount && (
              <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">⚠️</div>
                  <div>
                    <div className="font-semibold text-red-900 mb-1">Insufficient Balance</div>
                    <p className="text-sm text-red-800">
                      You need {(orderAmount - tokenBalance).toFixed(2)} more {tokenSymbol} to complete this payment
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Allowance Status Display */}
            {isCheckingAllowance && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-3">
                  <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <div>
                    <div className="font-semibold text-blue-900">Checking Allowance...</div>
                    <p className="text-sm text-blue-800">Verifying token approval status</p>
                  </div>
                </div>
              </div>
            )}

            {/* Real-time Allowance Status - 修复授权状态显示逻辑 */}
            <div className="bg-gradient-to-r from-slate-50 to-blue-50 border border-slate-200 rounded-xl p-5 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-slate-800">Token Approval Status</h4>
                {isCheckingAllowance && (
                  <div className="flex items-center gap-2 text-xs text-blue-600">
                    <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Checking...</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">Current Approval:</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {/* 🆕 优化授权显示：如果是最大值，显示 "Unlimited" */}
                    {(realTimeAllowance || allowanceRaw) >= 2n ** 255n ? (
                      'Unlimited'
                    ) : (
                      `${Number(realTimeAllowance || allowanceRaw) / 1e6} ${tokenSymbol}`
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">Required Amount:</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {orderAmount} {tokenSymbol}
                  </span>
                </div>
                <div className="pt-2 mt-2 border-t border-slate-200">
                  {/* 🆕 使用BigInt精确比较，确保状态显示正确 */}
                  {(realTimeAllowance || allowanceRaw) >= orderAmountRaw ? (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                      <span className="text-sm text-emerald-700 font-medium">Ready to Pay</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                      <span className="text-sm text-amber-700 font-medium">Approval Required</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {/* 🆕 使用精确的BigInt比较 */}
              {(realTimeAllowance || allowanceRaw) < orderAmountRaw && (
                <button
                  onClick={handleApprove}
                  disabled={isApproving || isApproveConfirming || !isTokenSupported}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:from-gray-300 disabled:to-gray-400 text-white font-semibold py-4 rounded-xl transition-all transform hover:scale-[1.02] disabled:hover:scale-100 shadow-lg disabled:shadow-none flex items-center justify-center gap-2"
                >
                  {!isTokenSupported ? (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Token Not Supported
                    </>
                  ) : isApproving || isApproveConfirming ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {isApproveConfirming ? 'Confirming Approval...' : 'Approving Tokens...'}
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Step 1: Approve {tokenSymbol}
                    </>
                  )}
                </button>
              )}

              <button
                onClick={handlePay}
                disabled={
                  (realTimeAllowance || allowanceRaw) < orderAmountRaw ||
                  isPayPending ||
                  isPayConfirming ||
                  !isTokenSupported ||
                  tokenBalance < orderAmount
                }
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:from-gray-300 disabled:to-gray-400 text-white font-semibold py-4 rounded-xl transition-all transform hover:scale-[1.02] disabled:hover:scale-100 shadow-lg disabled:shadow-none flex items-center justify-center gap-2"
              >
                {!isTokenSupported ? (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Token Not Supported
                  </>
                ) : tokenBalance < orderAmount ? (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Insufficient Balance
                  </>
                ) : isPayPending || isPayConfirming ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {isPayPending ? 'Processing Payment...' : 'Confirming Transaction...'}
                  </>
                ) : (realTimeAllowance || allowanceRaw) < orderAmountRaw ? (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Step 2: Complete Payment (Approve First)
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Complete Payment
                  </>
                )}
              </button>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-6 border-t border-gray-200 text-center">
              <p className="text-xs text-gray-500">
                🔒 Secure payment powered by <span className="font-semibold text-emerald-600">AetherPay</span> on Optimism L2
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}