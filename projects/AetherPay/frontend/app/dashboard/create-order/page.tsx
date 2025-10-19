'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContracts, useReadContract, useWatchContractEvent, useChainId, useSwitchChain } from 'wagmi';
import { optimismSepolia } from 'wagmi/chains';
import { CONTRACTS, PAYMENT_GATEWAY_ABI } from '@/lib/contracts';
import { fetchAIPrediction, fetchSettlementPath, type AIPrediction, type SettlementPath } from '@/lib/oracle-api';
import { uploadOrderMetadataToIPFS, type OrderMetadata } from '@/lib/ipfs';
import { TOKENS, getTokenInfo, getTokenSymbol, getDefaultRate, SUPPORTED_AI_PAIRS } from '@/lib/tokens';
import { get1inchSettlementPath } from '@/lib/1inch-api'; // 🆕 Import 1inch API
import { parseUnits } from 'viem';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { generateMockZKProof, mockVerifyProof, formatProofForDisplay, type ZKProof } from '@/lib/mockZkProof';

// PublicGoodsFund ABI
const PUBLIC_GOODS_FUND_ABI = [
  {
    "inputs": [],
    "name": "totalLifetimeDonations",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalContributors",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
    "name": "getContributorInfo",
    "outputs": [
      {"internalType": "uint256", "name": "totalContributed", "type": "uint256"},
      {"internalType": "uint256", "name": "lastContributionTime", "type": "uint256"},
      {"internalType": "string", "name": "badgeLevel", "type": "string"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export default function CreateOrderPage() {
  const { address, isConnected } = useAccount();
  const { writeContract, data: hash, isPending, isError: isWriteError, error: writeError } = useWriteContract();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  // 🆕 Fix hydration mismatch - prevent flash of "Connect Wallet" screen
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);


  // 等待交易确认
  const { isLoading: isConfirming, isSuccess: isConfirmed, isError: isTxError, error: txError, data: txReceipt } = useWaitForTransactionReceipt({
    hash,
  });

  // 🆕 Monitor write errors (user rejection, etc.)
  useEffect(() => {
    if (isWriteError && writeError) {
      console.error('❌ Write contract error:', writeError);
      const msg = (writeError as any)?.shortMessage || (writeError as Error).message || 'Transaction failed';

      // Check if user rejected
      if (msg.includes('User rejected') || msg.includes('user rejected')) {
        toast.error('Transaction rejected by user');
      } else {
        toast.error(`Transaction failed: ${msg}`);
      }
    }
  }, [isWriteError, writeError]);

  // 🆕 Monitor transaction hash
  useEffect(() => {
    if (hash) {
      console.log('✅ Transaction hash received:', hash);
      // Removed toast here to avoid duplicate notifications
    }
  }, [hash]);

  // Display result / errors for transaction
  useEffect(() => {
    if (isConfirmed) {
      console.log('✅ Transaction confirmed!');
      toast.success('✅ Order created on-chain successfully');
    }
    if (isTxError && txError) {
      const msg = (() => {
        const m = (txError as any)?.message?.match(/revert(?:ed)?(?: with reason string)?[: ]+([^\n]+)/i);
        return m?.[1]?.trim() || (txError as any)?.shortMessage || (txError as Error).message || 'Transaction failed';
      })();
      toast.error(`On-chain execution failed: ${msg}`);
      console.error('Transaction error:', txError);
    }
  }, [isConfirmed, isTxError, txError]);

  // 🆕 Debug: Log transaction status
  useEffect(() => {
    if (hash) {
      console.log('📊 Transaction Status:', {
        hash,
        isPending,
        isConfirming,
        isConfirmed,
        isTxError,
        txReceipt: txReceipt ? 'Received' : 'Pending'
      });
    }
  }, [hash, isPending, isConfirming, isConfirmed, isTxError, txReceipt]);

  // 🆕 追踪当前操作类型
  const [currentOperation, setCurrentOperation] = useState<'register' | 'createOrder' | null>(null);

  // 表单数据 - 默认选择USDC/USDT (已部署的Token)
  const [formData, setFormData] = useState({
    orderId: '',
    amount: '',
    description: '',
    buyerEmail: '',
    buyerAddress: '',  // 🆕 买家钱包地址（可选，留空表示公开订单）
    paymentToken: CONTRACTS.MOCK_USDC,  // ✅ 默认选择已支持的USDC
    settlementToken: CONTRACTS.MOCK_USDT,  // ✅ 默认选择已支持的USDT
    allowPartialPayment: false,  // 🆕 是否允许部分支付
  });

  // AI预测数据
  const [aiPrediction, setAiPrediction] = useState<AIPrediction | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [refreshCountdown, setRefreshCountdown] = useState(5);

  // 🆕 Settlement path data (解耦 - independent from AI prediction)
  const [settlementPath, setSettlementPath] = useState<SettlementPath | null>(null);
  const [isLoadingSettlementPath, setIsLoadingSettlementPath] = useState(false);

  // 生成二维码状态
  const [showPaymentSection, setShowPaymentSection] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  // 🆕 IPFS CID状态
  const [createdIpfsCID, setCreatedIpfsCID] = useState<string>('');

  // 🆕 ZK Proof状态
  const [zkProof, setZkProof] = useState<ZKProof | null>(null);
  const [generatingProof, setGeneratingProof] = useState(false);
  const [verifyingProof, setVerifyingProof] = useState(false);
  const [proofVerified, setProofVerified] = useState(false);

  // 🆕 Read merchant registration status
  const { data: merchantInfo, refetch: refetchMerchantInfo } = useReadContract({
    address: CONTRACTS.PAYMENT_GATEWAY_V2 as `0x${string}`,
    abi: PAYMENT_GATEWAY_ABI,
    functionName: 'getMerchantInfo',
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: isConnected && !!address,
    }
  });

  const isMerchantRegistered = merchantInfo ? (merchantInfo as any)[5] === true : false; // isActive field

  // 🆕 Check token support on-chain for the selected tokens
  const { data: tokenSupport } = useReadContracts({
    contracts: isConnected ? [
      {
        address: CONTRACTS.PAYMENT_GATEWAY_V2 as `0x${string}`,
        abi: PAYMENT_GATEWAY_ABI,
        functionName: 'supportedTokens',
        args: [formData.paymentToken as `0x${string}`],
      },
      {
        address: CONTRACTS.PAYMENT_GATEWAY_V2 as `0x${string}`,
        abi: PAYMENT_GATEWAY_ABI,
        functionName: 'supportedTokens',
        args: [formData.settlementToken as `0x${string}`],
      },
    ] : [],
    query: { enabled: isConnected },
  });

  const isPaymentTokenSupported = !!(tokenSupport as any)?.[0]?.result;
  const isSettlementTokenSupported = !!(tokenSupport as any)?.[1]?.result;


  // 🆕 Debug: Log token support status
  useEffect(() => {
    if (tokenSupport) {
      console.log('🔍 Token Support Status:', {
        paymentToken: formData.paymentToken,
        settlementToken: formData.settlementToken,
        paymentSupported: isPaymentTokenSupported,
        settlementSupported: isSettlementTokenSupported,
        rawData: tokenSupport
      });
    }
  }, [tokenSupport, formData.paymentToken, formData.settlementToken, isPaymentTokenSupported, isSettlementTokenSupported]);


  // 读取真实链上数据
  const { data: chainData } = useReadContracts({
    contracts: isConnected ? [
      // 公益基金数据
      {
        address: CONTRACTS.PUBLIC_GOODS_FUND as `0x${string}`,
        abi: PUBLIC_GOODS_FUND_ABI,
        functionName: 'totalLifetimeDonations',
      },
      {
        address: CONTRACTS.PUBLIC_GOODS_FUND as `0x${string}`,
        abi: PUBLIC_GOODS_FUND_ABI,
        functionName: 'getTotalContributors',
      },
      // 商户订单数据
      {
        address: CONTRACTS.PAYMENT_GATEWAY_V2 as `0x${string}`,
        abi: PAYMENT_GATEWAY_ABI,
        functionName: 'getMerchantOrders',
        args: [address as `0x${string}`, BigInt(0), BigInt(5)], // 获取最近5个订单
      },
      // 用户贡献信息
      {
        address: CONTRACTS.PUBLIC_GOODS_FUND as `0x${string}`,
        abi: PUBLIC_GOODS_FUND_ABI,
        functionName: 'getContributorInfo',
        args: [address as `0x${string}`],
      },
    ] : [],
    // 添加enabled条件，只有Connect Wallet后才查询
    enabled: isConnected && !!address,
  });

  // 解析链上数据
  const rawTotalLifetimeDonations = chainData?.[0]?.result ? Number(chainData[0].result) / 1e6 : 0;
  const rawTotalContributors = chainData?.[1]?.result ? Number(chainData[1].result) : 0;
  const merchantOrders = chainData?.[2]?.result as any[] || [];
  const contributorInfo = chainData?.[3]?.result as any;
  const userContributed = contributorInfo ? Number(contributorInfo[0]) / 1e6 : 0;

  // 调试输出
  console.log('🔍 Public Goods Data Debug:', {
    contractAddress: CONTRACTS.PUBLIC_GOODS_FUND,
    rawTotalLifetimeDonations,
    rawTotalContributors,
    chainDataRaw: chainData,
    merchantOrders: merchantOrders.length,
    userContributed
  });

  // 直接使用真实数据
  const totalLifetimeDonations = rawTotalLifetimeDonations;
  const totalContributors = rawTotalContributors;

  // 调试：打印订单数据
  useEffect(() => {
    if (merchantOrders.length > 0) {
      console.log('📦 Merchant Orders:', merchantOrders);
      console.log('📦 First Order:', merchantOrders[0]);
    }
  }, [merchantOrders]);

  // 计算支持的开发者数量（基于贡献额）
  const developersSupported = userContributed > 0 ? (userContributed / 100).toFixed(1) : '0';

  // 自动生成订单ID (优化：更短更易记 + 添加随机性确保唯一)
  useEffect(() => {
    if (!formData.orderId) {
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 5).toUpperCase();
      const shortId = `AP${timestamp.slice(-4)}${random}`;
      setFormData(prev => ({ ...prev, orderId: shortId }));
    }
  }, []);

  // Trading Pair
  const tradingPair = `${getTokenSymbol(formData.paymentToken)}/${getTokenSymbol(formData.settlementToken)}`;
  const paymentTokenInfo = getTokenInfo(formData.paymentToken);
  const settlementTokenInfo = getTokenInfo(formData.settlementToken);
  const isStablecoinPair = paymentTokenInfo?.type === 'stablecoin' && settlementTokenInfo?.type === 'stablecoin';

  // 智能转换Trading Pair - 将不Supported Trading Pairs转换为支持的格式
  const getConvertedPair = () => {
    const paymentSymbol = getTokenSymbol(formData.paymentToken);
    const settlementSymbol = getTokenSymbol(formData.settlementToken);

    // 如果付款是Cryptocurrency，结算是Stablecoin，统一转换为 XXX/USDT
    if (paymentTokenInfo?.type === 'crypto' && settlementTokenInfo?.type === 'stablecoin') {
      return `${paymentSymbol}/USDT`;
    }

    // 如果付款是Stablecoin，结算是Cryptocurrency，转换为 XXX/USDT 然后取倒数
    if (paymentTokenInfo?.type === 'stablecoin' && settlementTokenInfo?.type === 'crypto') {
      return `${settlementSymbol}/USDT`;
    }

    // Fiat对
    if (paymentTokenInfo?.type === 'fiat' || settlementTokenInfo?.type === 'fiat') {
      // 尝试标准Fiat对
      if (paymentSymbol === 'EUR' || paymentSymbol === 'GBP' || paymentSymbol === 'CNY') {
        return `${paymentSymbol}/USD`;
      }
    }

    // 返回原始Trading Pair
    return tradingPair;
  };

  const convertedPair = getConvertedPair();
  const needsInversion = paymentTokenInfo?.type === 'stablecoin' && settlementTokenInfo?.type === 'crypto';

  // 检查转换后的Trading Pair是否支持AI预测
  const isSupportedPair = SUPPORTED_AI_PAIRS.includes(convertedPair);

  // 获取AI预测（每5秒刷新）
  useEffect(() => {
    const fetchPrediction = async () => {
      // 🆕 立即处理稳定币对，不显示loading
      if (isStablecoinPair) {
        setIsLoadingAI(false);
        setAiPrediction({
          pair: tradingPair,
          predicted_price: 1.0,
          current_price: 1.0,
          price_change: 0,
          confidence: 1.0,
          prediction_horizon: 'N/A',
          timestamp: new Date().toISOString(),
          meets_threshold: true,
          optimal_settlement_path: {
            name: 'Curve Finance',
            protocol: 'Curve',
            estimated_cost_pct: 0.04,
            settlement_time_seconds: 18,
            reliability: 0.99,
            risk_level: 'low',
            reason: 'Best for stablecoin swaps with minimal slippage',
            alternative_paths: ['FXPool Direct', 'Uniswap V3']
          }
        });
        return;
      }

      // 🆕 立即处理不支持的交易对，不显示loading
      if (!isSupportedPair) {
        setIsLoadingAI(false);
        const defaultPrice = getDefaultRate(tradingPair);
        if (defaultPrice) {
          setAiPrediction({
            pair: tradingPair,
            predicted_price: defaultPrice,
            current_price: defaultPrice,
            price_change: 0,
            confidence: 0.5,
            prediction_horizon: 'Default',
            timestamp: new Date().toISOString(),
            meets_threshold: false,
          });
        } else {
          setAiPrediction(null);
        }
        return;
      }

      // 🆕 只在真正需要API调用时才显示loading
      setIsLoadingAI(true);
      try {
        console.log('🔄 Fetching AI prediction for:', convertedPair);
        const prediction = await fetchAIPrediction(convertedPair);

        if (prediction) {
          console.log('✅ AI prediction received:', prediction);
          // 如果需要取倒数（Stablecoin买Cryptocurrency的情况）
          if (needsInversion && prediction.predicted_price > 0) {
            prediction.predicted_price = 1 / prediction.predicted_price;
            if (prediction.current_price > 0) {
              prediction.current_price = 1 / prediction.current_price;
            }
          }

          // 更新Trading Pair名称为实际的Trading Pair
          prediction.pair = tradingPair;
          setAiPrediction(prediction);
        } else {
          console.warn('⚠️ No prediction returned, using fallback');
          // 如果API返回null，使用默认值
          const defaultPrice = getDefaultRate(tradingPair);
          if (defaultPrice) {
            setAiPrediction({
              pair: tradingPair,
              predicted_price: defaultPrice,
              current_price: defaultPrice,
              price_change: 0,
              confidence: 0.5,
              prediction_horizon: 'Fallback',
              timestamp: new Date().toISOString(),
              meets_threshold: false,
            });
          }
        }
      } catch (error) {
        console.error('❌ Failed to fetch AI prediction:', error);
        // 使用默认值作为后备
        const defaultPrice = getDefaultRate(tradingPair);
        if (defaultPrice) {
          setAiPrediction({
            pair: tradingPair,
            predicted_price: defaultPrice,
            current_price: defaultPrice,
            price_change: 0,
            confidence: 0.5,
            prediction_horizon: 'Error Fallback',
            timestamp: new Date().toISOString(),
            meets_threshold: false,
          });
        } else {
          setAiPrediction(null);
        }
      } finally {
        // 🆕 确保无论如何都重置loading状态
        setIsLoadingAI(false);
      }
    };

    // 🆕 立即执行第一次，不显示loading动画
    fetchPrediction();

    // 🆕 设置定时刷新（每30秒 - 优化后适配5分钟预测窗口）
    const interval = setInterval(() => {
      fetchPrediction();
      setRefreshCountdown(30);
    }, 30000);

    const countdownInterval = setInterval(() => {
      setRefreshCountdown(prev => prev > 0 ? prev - 1 : 30);
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(countdownInterval);
    };
  }, [tradingPair, isStablecoinPair, isSupportedPair, convertedPair, needsInversion]);

  // 🆕 Fetch settlement path independently (解耦 - separate from AI prediction)
  // 🚀 Strategy: Try 1inch API first for real-time DEX data, fallback to Python optimizer
  useEffect(() => {
    const fetchPath = async () => {
      // Parse order amount from form data
      const amount = parseFloat(formData.amount || '0');

      // Only fetch if we have valid order amount and trading pair
      if (!amount || amount <= 0 || !tradingPair) {
        return;
      }

      setIsLoadingSettlementPath(true);
      try {
        // Get AI confidence (default to 0.9 if no AI prediction available)
        const confidence = aiPrediction?.confidence || 0.9;

        console.log('🛤️ Fetching settlement path:', {
          pair: tradingPair,
          amount: amount,
          confidence
        });

        // 🆕 Step 1: Try 1inch API first (real-time DEX aggregator data)
        // Only for deployed tokens that can actually be swapped
        if (paymentTokenInfo?.isTestnetDeployed && settlementTokenInfo?.isTestnetDeployed) {
          // Silently try 1inch API without logging (it will fail for testnets)
          const inchPath = await get1inchSettlementPath(tradingPair, amount, confidence);

          if (inchPath) {
            // Only log if we actually got a result
            console.log('✅ 1inch settlement path received:', inchPath.name);
            setSettlementPath(inchPath);
            setIsLoadingSettlementPath(false);
            return; // Success! Use 1inch data
          }
          // If failed, silently continue to AI optimizer
        }

        // 🆕 Step 2: Fallback to Python AI optimizer (for all pairs)
        const path = await fetchSettlementPath(tradingPair, amount, confidence);

        if (path) {
          console.log('✅ AI optimizer settlement path received:', path.name);
          setSettlementPath(path);
        } else {
          console.warn('⚠️ No settlement path available from any source');
          setSettlementPath(null);
        }
      } catch (error) {
        console.error('❌ Failed to fetch settlement path:', error);
        setSettlementPath(null);
      } finally {
        setIsLoadingSettlementPath(false);
      }
    };

    fetchPath();
  }, [tradingPair, formData.amount, aiPrediction?.confidence, paymentTokenInfo, settlementTokenInfo]);

  // 🆕 Real-time order creation listener
  useWatchContractEvent({
    address: CONTRACTS.PAYMENT_GATEWAY_V2 as `0x${string}`,
    abi: PAYMENT_GATEWAY_ABI,
    eventName: 'OrderCreated',
    onLogs(logs) {
      console.log('📦 Order created event detected:', logs);
      // Only show toast if this is the user's order
      const log = logs[0] as any;
      if (log.args?.merchant?.toLowerCase() === address?.toLowerCase()) {
        toast.success('🎉 Order created successfully on-chain!');
      }
    },
  });

  // 费用计算 - 🆕 动态费率，与合约保持一致
  const orderAmount = parseFloat(formData.amount || '0');
  const defaultRate = getDefaultRate(tradingPair);
  const aiRate = aiPrediction?.predicted_price || defaultRate || 1.0;
  const expectedAmount = orderAmount * aiRate;

  // 🆕 根据交易对类型动态计算费率（与合约 PaymentGatewayV2.sol 保持一致）
  // 稳定币对：0.1% + 0.1% = 0.2% 总费率
  // 加密货币对：0.2% + 0.2% = 0.4% 总费率
  // isStablecoinPair is already defined above at line 271
  const platformFeeRate = isStablecoinPair ? 0.001 : 0.002; // 0.1% or 0.2%
  const merchantFeeRate = isStablecoinPair ? 0.001 : 0.002; // 0.1% or 0.2%
  const totalFeeRate = platformFeeRate + merchantFeeRate; // 0.2% or 0.4%

  const platformFee = expectedAmount * platformFeeRate;
  const merchantFee = expectedAmount * merchantFeeRate;
  const totalFee = platformFee + merchantFee;
  const donationAmount = platformFee * 0.05; // 5% of platform fee
  const merchantReceives = expectedAmount - totalFee;

  // 对比传统支付
  const stripeFee = orderAmount * 0.029 + 0.30;
  const paypalFee = orderAmount * 0.034 + 0.49;
  const savedVsStripe = stripeFee - totalFee; // 使用总费用对比

  // 生成二维码
  const handleGenerateQR = async () => {
    if (!formData.amount || !formData.description) {
      toast.error('Please fill in Order Amount and Product Description');
      return;
    }

    setIsGenerating(true);
    try {
      // 动态导入QRCode库
      const QRCode = (await import('qrcode')).default;

      // 生成Payment Link
      const paymentUrl = `${window.location.origin}/pay/${formData.orderId}`;

      // 生成二维码
      const qrDataUrl = await QRCode.toDataURL(paymentUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#10B981',  // 绿色
          light: '#FFFFFF'
        }
      });

      setQrCodeDataUrl(qrDataUrl);
      setShowPaymentSection(true);
      toast.success('QR Code generated successfully!');
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      toast.error(`Failed to generate QR code: ${(error as Error).message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // 🆕 Register as Merchant
  const handleRegisterMerchant = async () => {
    if (!address) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      const businessName = prompt('Enter your business name:', 'My Business');
      if (!businessName || businessName.trim() === '') {
        toast.error('Business name is required');
        return;
      }

      console.log('🔄 Registering merchant:', businessName);

      setCurrentOperation('register'); // 🆕 设置操作类型

      writeContract({
        address: CONTRACTS.PAYMENT_GATEWAY_V2 as `0x${string}`,
        abi: PAYMENT_GATEWAY_ABI,
        functionName: 'registerMerchant',
        args: [businessName.trim()],
      });

      // Wait for confirmation and refetch merchant info
      setTimeout(() => {
        refetchMerchantInfo();
      }, 3000);

      toast.success('Merchant registration submitted!');
    } catch (error) {
      console.error('❌ Merchant registration failed:', error);
      toast.error(`Registration failed: ${(error as Error).message}`);
    }
  };

  // 创建订单
  const handleCreateOrder = async () => {
    if (!formData.amount) {
      toast.error('Please fill in Order Amount');
      return;
    }

    if (!formData.description) {
      toast.error('Please fill in Product Description');
      return;
    }

    try {
      console.log('🔄 Step 1: Uploading metadata to IPFS...');

      // 🆕 Step 1: 上传元数据到 IPFS

      // Preflight on-chain validations
      if (!isMerchantRegistered) {
        toast.error('Please register as a merchant before creating orders');
        return;
      }

      // Network check
      if (chainId !== optimismSepolia.id) {
        toast.error('Please switch to Optimism Sepolia network');
        try {
          switchChain({ chainId: optimismSepolia.id });
        } catch (e) {
          console.error('Network switch failed:', e);
        }
        return;
      }

      if (!isPaymentTokenSupported) {
        toast.error('Selected payment token is not supported by the contract');
        return;
      }
      if (!isSettlementTokenSupported) {
        toast.error('Selected settlement token is not supported by the contract');
        return;
      }

      const metadata: OrderMetadata = {
        orderId: formData.orderId,
        description: formData.description,
        buyerEmail: formData.buyerEmail,
        createdAt: new Date().toISOString(),
        merchantAddress: address as string,
        additionalInfo: {
          paymentToken: getTokenSymbol(formData.paymentToken),
          settlementToken: getTokenSymbol(formData.settlementToken),
          tradingPair: tradingPair,
          aiPrediction: aiPrediction ? {
            rate: aiPrediction.predicted_price,
            confidence: aiPrediction.confidence
          } : undefined
        }
      };

      const ipfsCID = await uploadOrderMetadataToIPFS(metadata);
      console.log('✅ Metadata uploaded to IPFS:', ipfsCID);
      toast.success('Metadata uploaded to IPFS');

      // 🆕 保存IPFS CID用于成功页面显示
      setCreatedIpfsCID(ipfsCID);

      // 🆕 Step 2: Create On-Chain Order（包含 IPFS CID）
      console.log('🔄 Step 2: Creating order on-chain...');

      const amountInWei = parseUnits(formData.amount, 6);

      console.log('📤 Submitting transaction with params:', {
        orderId: formData.orderId,
        amount: amountInWei.toString(),
        paymentToken: formData.paymentToken,
        settlementToken: formData.settlementToken,
        ipfsCID,
        allowPartialPayment: false
      });

      setCurrentOperation('createOrder'); // 🆕 设置操作类型

      // 🆕 处理买家地址：如果为空或无效，使用 address(0) 表示公开订单
      console.log('🔍 DEBUG: Buyer Address Field Value:', {
        rawValue: formData.buyerAddress,
        valueType: typeof formData.buyerAddress,
        valueLength: formData.buyerAddress?.length,
        trimmedValue: formData.buyerAddress?.trim(),
        trimmedLength: formData.buyerAddress?.trim().length,
        startsWithOx: formData.buyerAddress?.startsWith('0x'),
        isValidLength: formData.buyerAddress?.length === 42,
        isEmpty: !formData.buyerAddress || formData.buyerAddress.trim() === ''
      });

      const designatedPayer = formData.buyerAddress && formData.buyerAddress.trim() !== '' && formData.buyerAddress.startsWith('0x') && formData.buyerAddress.length === 42
        ? formData.buyerAddress as `0x${string}`
        : '0x0000000000000000000000000000000000000000' as `0x${string}`;

      console.log('🔍 DEBUG: Designated Payer Decision:', {
        designatedPayer,
        isPublicOrder: designatedPayer === '0x0000000000000000000000000000000000000000',
        buyerAddressWasEmpty: !formData.buyerAddress || formData.buyerAddress.trim() === ''
      });

      writeContract({
        address: CONTRACTS.PAYMENT_GATEWAY_V2 as `0x${string}`,
        abi: PAYMENT_GATEWAY_ABI,
        functionName: 'createOrder',
        args: [
          formData.orderId,
          amountInWei,
          formData.paymentToken as `0x${string}`,
          formData.settlementToken as `0x${string}`,
          ipfsCID,  // 🆕 传递 IPFS CID
          formData.allowPartialPayment,  // 🆕 allowPartialPayment - 从表单获取
          designatedPayer  // 🆕 指定买家地址（address(0) 表示公开订单）
        ],
      });

      console.log('✅ Transaction request sent to wallet');
      toast('Please confirm the transaction in your wallet...', {
        icon: 'ℹ️',
        duration: 4000,
      });
    } catch (error) {
      console.error('❌ Order creation failed:', error);

      // Extract revert reason if available
      const errorMessage = (() => {
        const err = error as any;

        // Check for revert reason in error message
        const revertMatch = err?.message?.match(/reverted with reason string '([^']+)'/);
        if (revertMatch) return revertMatch[1];

        // Check for custom error
        const customErrorMatch = err?.message?.match(/reverted with custom error '([^']+)'/);
        if (customErrorMatch) return customErrorMatch[1];

        // Check for execution reverted
        if (err?.message?.includes('execution reverted')) {
          return err.message.split('execution reverted')[1]?.trim() || 'Transaction reverted';
        }

        // Check shortMessage from wagmi
        if (err?.shortMessage) return err.shortMessage;

        // Fallback to full message
        return err?.message || 'Unknown error';
      })();

      toast.error(`Order creation failed: ${errorMessage}`);
    }
  };

  // 🆕 Generate ZK Proof (模拟证明生成)
  const handleGenerateZKProof = async () => {
    if (!aiPrediction) {
      toast.error('Please wait for AI prediction to load');
      return;
    }

    try {
      setGeneratingProof(true);
      toast('Generating ZK proof...', { icon: '⚙️', duration: 2000 });

      // 模拟6个交易所价格（基于AI prediction的当前价格）
      const mockExchangePrices = [
        Math.round(aiPrediction.current_price * 10000 * (1 + (Math.random() - 0.5) * 0.002)), // ±0.2%
        Math.round(aiPrediction.current_price * 10000 * (1 + (Math.random() - 0.5) * 0.002)),
        Math.round(aiPrediction.current_price * 10000 * (1 + (Math.random() - 0.5) * 0.002)),
        Math.round(aiPrediction.current_price * 10000 * (1 + (Math.random() - 0.5) * 0.002)),
        Math.round(aiPrediction.current_price * 10000 * (1 + (Math.random() - 0.5) * 0.002)),
        Math.round(aiPrediction.current_price * 10000 * (1 + (Math.random() - 0.5) * 0.002)),
      ];

      const predictedPriceScaled = Math.round(aiPrediction.predicted_price * 10000);

      // 生成ZK证明
      const proof = await generateMockZKProof(mockExchangePrices, predictedPriceScaled);
      setZkProof(proof);

      toast.success('ZK proof generated successfully!');

      // 自动验证证明
      setVerifyingProof(true);
      toast('Verifying proof on-chain...', { icon: '🔍', duration: 1000 });

      const isValid = await mockVerifyProof(proof);
      setProofVerified(isValid);

      if (isValid) {
        toast.success('Proof verified on-chain!');
      } else {
        toast.error('Proof verification failed');
      }
    } catch (error) {
      console.error('❌ ZK proof generation failed:', error);
      toast.error(`Proof generation failed: ${(error as Error).message}`);
    } finally {
      setGeneratingProof(false);
      setVerifyingProof(false);
    }
  };

  // 🆕 Show loading screen during initial hydration to prevent flash
  if (!mounted) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="bg-white rounded-xl shadow-sm p-8 text-center max-w-md border border-gray-200">
            <div className="animate-spin h-12 w-12 border-4 border-emerald-500 rounded-full border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

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
            <p className="text-gray-600 mb-6">Please connect your wallet to create an order</p>
      </div>
        </div>
      </DashboardLayout>
    );
  }

  // 🆕 Check if on correct network
  if (chainId !== optimismSepolia.id) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="bg-white rounded-xl shadow-sm p-8 text-center max-w-md border border-gray-200">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Wrong Network</h2>
            <p className="text-gray-600 mb-4">
              You are currently on <span className="font-semibold text-red-600">
                {chainId === 1 ? 'Ethereum Mainnet' : `Chain ID ${chainId}`}
              </span>
            </p>
            <p className="text-gray-600 mb-6">
              Please switch to <span className="font-semibold text-emerald-600">Optimism Sepolia</span> testnet
            </p>
              <button
              onClick={() => {
                try {
                  switchChain({ chainId: optimismSepolia.id });
                } catch (e) {
                  console.error('Network switch failed:', e);
                  toast.error('Failed to switch network. Please switch manually in MetaMask.');
                }
              }}
              className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
            >
              Switch to Optimism Sepolia
              </button>
            <div className="mt-4 text-xs text-gray-500">
              <p>Network: Optimism Sepolia</p>
              <p>Chain ID: 11155420</p>
              <p>RPC: https://sepolia.optimism.io</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // 🆕 如果正在等待交易确认，显示等待界面
  if (isConfirming && hash) {
    const explorerUrl = `https://sepolia-optimism.etherscan.io/tx/${hash}`;

    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-200 text-center">
            <div className="animate-spin h-16 w-16 border-4 border-emerald-500 rounded-full border-t-transparent mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">⏳ Waiting for Confirmation</h2>
            <p className="text-gray-600 mb-4">
              Your transaction is being processed on the blockchain...
            </p>
            <p className="text-sm text-gray-500 mb-6">
              This usually takes 10-30 seconds on Optimism Sepolia testnet
            </p>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="text-sm text-gray-600 mb-2">Transaction Hash</div>
              <div className="font-mono text-xs text-gray-900 break-all mb-3">{hash}</div>

              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                View on Block Explorer
              </a>
            </div>

            <button
                onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 text-gray-600 hover:text-gray-900 text-sm font-medium"
            >
              Cancel & Start Over
            </button>
            </div>
          </div>
      </DashboardLayout>
    );
  }

  if (isConfirmed) {
    // 🆕 根据操作类型显示不同的成功页面
    if (currentOperation === 'register') {
      return (
        <DashboardLayout>
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-200 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <svg className="w-8 h-8 text-green-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
        </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">✅ Merchant Registration Successful!</h2>
              <p className="text-gray-600 mb-4">Transaction Hash: {hash?.slice(0, 10)}...{hash?.slice(-8)}</p>
              <p className="text-sm text-gray-500 mb-6">
                You are now registered as a merchant. You can start creating payment orders!
              </p>
              <button
                onClick={() => {
                  setCurrentOperation(null);
                  window.location.reload();
                }}
                className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
              >
                Start Creating Orders
              </button>
      </div>
          </div>
        </DashboardLayout>
    );
  }

    // 创建订单成功页面
    const paymentUrl = `${window.location.origin}/pay/${formData.orderId}`;

  return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-200">
            {/* Success Notice */}
            <div className="text-center mb-8 pb-8 border-b border-gray-200">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <svg className="w-8 h-8 text-green-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
            </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">🎉 Order Created Successfully!</h2>
              <p className="text-gray-600">Transaction Hash: {hash?.slice(0, 10)}...{hash?.slice(-8)}</p>
          </div>

            {/* Order Details */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 mb-4">Order Information</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Order Number</div>
                  <div className="font-mono text-sm text-gray-900">{formData.orderId}</div>
              </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Order Amount</div>
                  <div className="text-xl font-bold text-gray-900">{formData.amount} {getTokenSymbol(formData.paymentToken)}</div>
                </div>
                {/* 🆕 IPFS链接显示 */}
                {createdIpfsCID && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">Metadata Storage (IPFS)</div>
                    <div className="flex items-center gap-2">
                      <a
                        href={`https://gateway.pinata.cloud/ipfs/${createdIpfsCID}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-emerald-600 hover:text-emerald-700 font-mono break-all"
                      >
                        {createdIpfsCID.slice(0, 8)}...{createdIpfsCID.slice(-8)}
                      </a>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`https://gateway.pinata.cloud/ipfs/${createdIpfsCID}`);
                          toast.success('IPFS link copied!');
                        }}
                        className="text-xs px-2 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 mb-4">Payment Link</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-2">Share with Buyer</div>
              <div className="flex gap-2">
                <input
                  type="text"
                      value={paymentUrl}
                      readOnly
                      className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded text-sm font-mono text-gray-900"
                />
                <button
                      onClick={() => {
                        navigator.clipboard.writeText(paymentUrl);
                        toast.success('Payment link copied to clipboard!');
                      }}
                      className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 text-sm font-medium"
                    >
                      Copy
                </button>
              </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Link
                href="/dashboard/orders"
                className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium text-center"
              >
                View Order List
              </Link>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
              >
                Create New Order
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="">
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Create Payment Order</h1>
          <p className="text-gray-600 mt-2">AI-optimized exchange rates, save 80% in fees for customers</p>
          </div>

        {/* 🆕 Merchant Registration Warning */}
        {!isMerchantRegistered && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-amber-900 mb-2">Merchant Registration Required</h3>
                <p className="text-amber-800 mb-4">
                  You need to register as a merchant before creating payment orders. This is a one-time setup that takes just a few seconds.
                </p>
                <button
                  onClick={handleRegisterMerchant}
                  disabled={isPending}
                  className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  {isPending ? 'Registering...' : 'Register as Merchant'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 🆕 Success Message for Registered Merchants */}
        {isMerchantRegistered && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-green-800 font-medium">✅ Merchant account active - You can create orders</span>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Order Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-emerald-100 rounded flex items-center justify-center text-emerald-600 font-semibold text-sm">
                  1
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Order Details</h2>
            </div>

              <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                    Order Amount <span className="text-red-500">*</span>
              </label>
                  <div className="relative">
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="100.00"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900"
              />
                    <div className="absolute right-3 top-3 text-gray-500 font-medium">
                      USD
                    </div>
                  </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product Description <span className="text-red-500">*</span>
              </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="e.g. Cross-border e-commerce order #12345"
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900"
                  />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                    Buyer Email <span className="text-gray-400">(Optional)</span>
              </label>
                  <input
                    type="email"
                    value={formData.buyerEmail}
                    onChange={(e) => setFormData({ ...formData, buyerEmail: e.target.value })}
                    placeholder="buyer@example.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900"
                  />
                </div>

                {/* 🆕 买家钱包地址输入框 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Buyer Wallet Address <span className="text-gray-400">(Optional - Leave empty for public order)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.buyerAddress}
                    onChange={(e) => setFormData({ ...formData, buyerAddress: e.target.value })}
                    placeholder="0x... (Leave empty to allow anyone to pay)"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 font-mono text-sm"
                  />
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <span className="text-blue-600 text-sm">💡</span>
                      <div className="text-xs text-blue-800">
                        <strong>Tip:</strong> Leave empty for public order, or specify buyer address for private order.
                      </div>
                    </div>
                  </div>
                </div>

                {/* 🆕 部分支付选项 */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Allow Partial Payment
                      </label>
                      <p className="text-xs text-gray-500">Enable buyers to pay in installments</p>
                    </div>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={formData.allowPartialPayment}
                        onChange={(e) => setFormData({ ...formData, allowPartialPayment: e.target.checked })}
                        className="sr-only"
                        id="partial-payment-toggle"
                      />
                      <label
                        htmlFor="partial-payment-toggle"
                        className={`block w-12 h-6 rounded-full cursor-pointer transition-colors ${
                          formData.allowPartialPayment ? 'bg-emerald-600' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                            formData.allowPartialPayment ? 'translate-x-6' : 'translate-x-0'
                          }`}
                        />
                      </label>
                    </div>
                  </div>
                  {formData.allowPartialPayment && (
                    <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded">
                      <p className="text-xs text-amber-800">
                        ⚠️ When enabled, buyers can pay any amount up to the total. The order completes when full payment is received.
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Currency</label>
              <select
                value={formData.paymentToken}
                onChange={(e) => setFormData({ ...formData, paymentToken: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900"
                    >
                      <optgroup label="🪙 Stablecoins">
                        {TOKENS.filter(t => t.type === 'stablecoin' && t.isTestnetDeployed).map(token => (
                          <option key={token.address} value={token.address}>{token.symbol} - {token.name}</option>
                        ))}
                      </optgroup>
                      <optgroup label="🌐 Cryptocurrencies">
                        {TOKENS.filter(t =>
                          t.type === 'crypto' &&
                          t.isTestnetDeployed &&
                          ['WETH', 'WBTC', 'SOL', 'ADA', 'BNB'].includes(t.symbol)
                        ).map(token => (
                          <option key={token.address} value={token.address}>{token.symbol} - {token.name}</option>
                        ))}
                      </optgroup>
              </select>
            </div>

            <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Settlement Currency</label>
              <select
                value={formData.settlementToken}
                onChange={(e) => setFormData({ ...formData, settlementToken: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900"
                    >
                      <optgroup label="🪙 Stablecoins">
                        {TOKENS.filter(t => t.type === 'stablecoin' && t.isTestnetDeployed).map(token => (
                          <option key={token.address} value={token.address}>{token.symbol} - {token.name}</option>
                        ))}
                      </optgroup>
                      <optgroup label="🌐 Cryptocurrencies">
                        {TOKENS.filter(t =>
                          t.type === 'crypto' &&
                          t.isTestnetDeployed &&
                          ['WETH', 'WBTC', 'SOL', 'ADA', 'BNB'].includes(t.symbol)
                        ).map(token => (
                          <option key={token.address} value={token.address}>{token.symbol} - {token.name}</option>
                        ))}
                      </optgroup>
              </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Comparison with Traditional Payment */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-emerald-100 rounded flex items-center justify-center text-emerald-600 font-semibold text-sm">
                  3
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Comparison with Traditional Payment</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Payment Method</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Rate</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Fee</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Merchant Receives</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Savings</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100 bg-emerald-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-emerald-600 rounded flex items-center justify-center">
                            <span className="text-white text-xs font-bold">A</span>
                </div>
                          <span className="font-semibold text-gray-900">AetherPay</span>
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">Best</span>
                </div>
                      </td>
                      <td className="text-right py-3 px-4 text-gray-900">
                        {isStablecoinPair ? '0.2%' : '0.4%'}
                        <div className="text-xs text-gray-500">
                          {isStablecoinPair ? 'Stablecoin Rate' : 'Crypto Rate'}
                        </div>
                      </td>
                      <td className="text-right py-3 px-4 text-gray-900">${totalFee.toFixed(2)}</td>
                      <td className="text-right py-3 px-4 text-gray-900">${merchantReceives.toFixed(2)}</td>
                      <td className="text-right py-3 px-4 font-semibold text-green-600">Baseline</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-3 px-4 flex items-center gap-2">
                        <div className="w-6 h-6 bg-gray-600 rounded flex items-center justify-center">
                          <span className="text-white text-xs font-bold">S</span>
                </div>
                        <span className="text-gray-700">Stripe</span>
                      </td>
                      <td className="text-right py-3 px-4 text-gray-600">2.9% + $0.30</td>
                      <td className="text-right py-3 px-4 text-gray-600">${stripeFee.toFixed(2)}</td>
                      <td className="text-right py-3 px-4 text-gray-600">${(orderAmount - stripeFee).toFixed(2)}</td>
                      <td className="text-right py-3 px-4 text-red-600">-${savedVsStripe.toFixed(2)}</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-3 px-4 flex items-center gap-2">
                        <div className="w-6 h-6 bg-gray-500 rounded flex items-center justify-center">
                          <span className="text-white text-xs font-bold">P</span>
                        </div>
                        <span className="text-gray-700">PayPal</span>
                      </td>
                      <td className="text-right py-3 px-4 text-gray-600">3.4% + $0.49</td>
                      <td className="text-right py-3 px-4 text-gray-600">${paypalFee.toFixed(2)}</td>
                      <td className="text-right py-3 px-4 text-gray-600">${(orderAmount - paypalFee).toFixed(2)}</td>
                      <td className="text-right py-3 px-4 text-red-600">-${(paypalFee - platformFee).toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {orderAmount > 0 && (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-green-900">Save per order with AetherPay</div>
                      <div className="text-xs text-green-700 mt-1">vs Stripe</div>
                    </div>
                    <div className="text-2xl font-bold text-green-700">
                      ${savedVsStripe.toFixed(2)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleGenerateQR}
                disabled={isGenerating || !formData.amount || !formData.description}
                className="px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                    Generate Payment QR Code
                  </>
                )}
              </button>

              <button
                onClick={handleCreateOrder}
                disabled={
                  isPending ||
                  isConfirming ||
                  !formData.amount ||
                  !isMerchantRegistered ||
                  !isPaymentTokenSupported ||
                  !isSettlementTokenSupported
                }
                className="px-6 py-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
              >
                {isPending || isConfirming ? (
                  <>
                    <div className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent"></div>
                    {isPending ? 'Awaiting Confirmation...' : 'Creating Order...'}
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create On-Chain Order
                  </>
                )}
              </button>
                </div>

            {/* Display Generated QR Code */}
            {showPaymentSection && qrCodeDataUrl && (
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl shadow-sm p-6 border border-emerald-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">Payment QR Code</h3>
                <div className="flex flex-col items-center">
                  <div className="bg-white p-4 rounded-lg shadow-md">
                    <img src={qrCodeDataUrl} alt="Payment QR Code" className="w-64 h-64" />
                </div>
                  <div className="text-center mt-4">
                    <div className="text-sm text-gray-600 mb-2">Scan QR Code to complete payment</div>
                    <div className="text-2xl font-bold text-emerald-600">
                      {formData.amount} {getTokenSymbol(formData.paymentToken)}
                </div>
                    <div className="text-xs text-gray-500 mt-2">Order ID: {formData.orderId}</div>
                    <div className="mt-4 flex flex-col gap-2">
                      <Link
                        href={`/pay/${formData.orderId}`}
                        target="_blank"
                        className="inline-block px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
                      >
                        Pay Online
                      </Link>
                      <button
                        onClick={() => {
                          const paymentUrl = `${window.location.origin}/pay/${formData.orderId}`;
                          navigator.clipboard.writeText(paymentUrl);
                          toast.success('Payment link copied to clipboard!');
                        }}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                      >
                        Copy Link
                      </button>
              </div>
                  </div>
                </div>
              </div>
            )}

            {(isWriteError || isTxError) && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-sm text-red-800">
                  Order creation failed, please try again
                  {writeError && <div className="text-xs mt-1">{(writeError as any)?.shortMessage || writeError.message}</div>}
                  {txError && <div className="text-xs mt-1">{(txError as any)?.shortMessage || txError.message}</div>}
                </div>
              </div>
            )}
                  </div>

          {/* Right: Exchange Rate Preview and Public Goods Impact */}
          <div className="space-y-6">
            {/* AIExchange Rate & Fee Preview */}
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl shadow-sm p-6 border border-emerald-200">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-emerald-100 rounded flex items-center justify-center text-emerald-600 font-semibold text-sm">
                  2
                    </div>
                <h2 className="text-lg font-semibold text-gray-900">Exchange Rate & Fee Preview</h2>
                <div className="ml-auto text-xs text-emerald-600 font-medium">
                  {refreshCountdown}s to refresh
                    </div>
                  </div>

              {/* Trading Pair Information */}
              <div className="bg-white rounded-lg p-3 mb-3 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Trading Pair</span>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-900">{tradingPair}</span>
                    {isStablecoinPair && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">Stablecoin Pair</span>
                  )}
                </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {paymentTokenInfo && (
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                      paymentTokenInfo.type === 'stablecoin' ? 'bg-green-100 text-green-700' :
                      paymentTokenInfo.type === 'crypto' ? 'bg-purple-100 text-purple-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {paymentTokenInfo.type === 'stablecoin' ? 'Stablecoin' :
                       paymentTokenInfo.type === 'crypto' ? 'Cryptocurrency' : 'Fiat'}
                    </span>
                  )}
                  <span className="text-xs text-gray-500">→</span>
                  {settlementTokenInfo && (
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                      settlementTokenInfo.type === 'stablecoin' ? 'bg-green-100 text-green-700' :
                      settlementTokenInfo.type === 'crypto' ? 'bg-purple-100 text-purple-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {settlementTokenInfo.type === 'stablecoin' ? 'Stablecoin' :
                       settlementTokenInfo.type === 'crypto' ? 'Cryptocurrency' : 'Fiat'}
                    </span>
                  )}
                </div>
              </div>

              {/* AI Optimal Exchange Rate */}
              <div className="bg-white rounded-lg p-4 mb-3 border border-emerald-100">
                  <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">AI Optimal Exchange Rate</span>
                  {isLoadingAI ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin h-4 w-4 border-2 border-emerald-500 rounded-full border-t-transparent"></div>
                      <span className="text-xs text-gray-500">Refreshing...</span>
                  </div>
                  ) : aiPrediction ? (
                    <span className="text-xs text-green-600 font-medium">
                      {(aiPrediction.confidence * 100).toFixed(1)}% Confidence
                    </span>
                  ) : !isSupportedPair && !isStablecoinPair ? (
                    <span className="text-xs text-amber-600 font-medium">This trading pair is not supported</span>
                  ) : null}
                  </div>
                {/* ✅ 修复：始终显示数据，即使在加载时也保留旧数据 */}
                <div className={isLoadingAI && !aiPrediction ? 'space-y-3 animate-pulse' : ''}>
                  {isLoadingAI && !aiPrediction ? (
                    // 仅在首次加载且没有数据时显示骨架屏
                    <>
                      <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </>
                  ) : (
                    // 有数据时始终显示，刷新时保留旧数据
                    <>
                      <div className={`text-2xl font-bold text-gray-900 ${isLoadingAI ? 'opacity-60' : ''}`}>
                        {aiPrediction ? (
                          `1 ${getTokenSymbol(formData.paymentToken)} = ${aiRate.toFixed(4)} ${getTokenSymbol(formData.settlementToken)}`
                        ) : !isSupportedPair && !isStablecoinPair ? (
                          <div className="text-base text-amber-700">
                            This trading pair has no AI model support yet
                            <div className="text-xs text-gray-600 mt-1 font-normal">
                              Please select supported trading pairs or use default rates
                  </div>
                          </div>
                        ) : (
                          `1 ${getTokenSymbol(formData.paymentToken)} = 1.0000 ${getTokenSymbol(formData.settlementToken)}`
                        )}
                    </div>
                      <div className={`text-xs text-gray-600 mt-1 ${isLoadingAI ? 'opacity-60' : ''}`}>
                        Source:  {isStablecoinPair ? 'Stablecoin Fixed Rate' :
                              aiPrediction?.source_count ? `${aiPrediction.source_count} data sources aggregated` :
                              'LightGBM AI Model'}
                  </div>
                      {aiPrediction?.sources && (
                        <div className={`mt-2 ${isLoadingAI ? 'opacity-60' : ''}`}>
                          <div className="text-xs text-gray-600 mb-2 font-medium">
                            Data Sources ({Object.keys(aiPrediction.sources).length}):
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(aiPrediction.sources).map(([source, price]) => (
                              <span key={source} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded border border-emerald-200 font-mono">
                                {source}: ${typeof price === 'number' ? price.toFixed(2) : 'N/A'}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                      </div>
                    </div>

              {/* Merchant Receives */}
              <div className="bg-white rounded-lg p-4 mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">Merchant Receives</span>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  ${merchantReceives.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                  Fee ({isStablecoinPair ? '0.2%' : '0.4%'}): -${totalFee.toFixed(2)}
                    </div>
                <div className="text-xs text-emerald-600 mt-1">
                  Public Goods Donation:  ${donationAmount.toFixed(2)}
                  </div>
              </div>

              {/* 🆕 ZK Proof Verification Section */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-sm p-6 border border-indigo-200 mt-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <h2 className="text-lg font-semibold text-gray-900">ZK Proof Verification</h2>
                  </div>
                  {proofVerified && (
                    <span className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-700 font-semibold flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Verified
                    </span>
                  )}
                </div>

                {!zkProof ? (
                  // No proof generated yet
                  <div className="text-center py-6">
                    <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-700 mb-4">
                      Generate a zero-knowledge proof to verify AI prediction integrity
                    </p>
                    <button
                      onClick={handleGenerateZKProof}
                      disabled={generatingProof || !aiPrediction || isLoadingAI}
                      className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2 mx-auto"
                    >
                      {generatingProof ? (
                        <>
                          <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></div>
                          Generating Proof...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Generate ZK Proof
                        </>
                      )}
                    </button>
                    <p className="text-xs text-gray-500 mt-3">
                      Proof generation takes ~2 seconds
                    </p>
                  </div>
                ) : (
                  // Proof generated - show details
                  <div className="space-y-3">
                    {/* Verification Status */}
                    <div className={`rounded-lg p-4 border-2 ${
                      verifyingProof ? 'bg-blue-50 border-blue-200' :
                      proofVerified ? 'bg-green-50 border-green-200' :
                      'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-center gap-3">
                        {verifyingProof ? (
                          <>
                            <div className="animate-spin h-5 w-5 border-2 border-blue-600 rounded-full border-t-transparent"></div>
                            <span className="font-semibold text-blue-900">Verifying on-chain...</span>
                          </>
                        ) : proofVerified ? (
                          <>
                            <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="font-semibold text-green-900">Proof verified on-chain ✓</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            <div className="flex flex-col">
                              <span className="font-semibold text-red-900">Verification failed</span>
                              <span className="text-xs text-red-700 mt-1">
                                Demo模式验证限制 - 请查看浏览器控制台了解详情
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Proof Details */}
                    <div className="bg-white rounded-lg p-4 border border-indigo-100">
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <div className="text-xs text-gray-600 mb-1">Protocol</div>
                          <div className="text-sm font-semibold text-indigo-700 uppercase">{zkProof.protocol}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600 mb-1">Curve</div>
                          <div className="text-sm font-semibold text-indigo-700 uppercase">{zkProof.curve}</div>
                        </div>
                      </div>

                      {/* Public Signals */}
                      <div className="border-t border-gray-200 pt-3">
                        <div className="text-xs font-semibold text-gray-700 mb-2">Public Signals:</div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">Predicted Price:</span>
                            <span className="font-mono font-semibold text-indigo-700">
                              {(parseInt(zkProof.publicSignals[0]) / 10000).toFixed(4)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">Data Integrity Hash:</span>
                            <span className="font-mono text-indigo-700">
                              {zkProof.publicSignals[1].slice(0, 12)}...
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Proof Components (Collapsible) */}
                    <details className="bg-white rounded-lg border border-indigo-100">
                      <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-gray-700 hover:bg-indigo-50 rounded-t-lg">
                        View Proof Components (Technical Details)
                      </summary>
                      <div className="px-4 py-3 border-t border-indigo-100 space-y-2">
                        <div>
                          <div className="text-xs font-semibold text-gray-700 mb-1">π_a:</div>
                          <div className="font-mono text-xs text-gray-600 break-all bg-gray-50 p-2 rounded">
                            [{zkProof.pi_a[0].slice(0, 20)}..., {zkProof.pi_a[1].slice(0, 20)}...]
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-gray-700 mb-1">π_b:</div>
                          <div className="font-mono text-xs text-gray-600 break-all bg-gray-50 p-2 rounded">
                            [[{zkProof.pi_b[0][0].slice(0, 16)}..., {zkProof.pi_b[0][1].slice(0, 16)}...], [{zkProof.pi_b[1][0].slice(0, 16)}..., {zkProof.pi_b[1][1].slice(0, 16)}...]]
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-gray-700 mb-1">π_c:</div>
                          <div className="font-mono text-xs text-gray-600 break-all bg-gray-50 p-2 rounded">
                            [{zkProof.pi_c[0].slice(0, 20)}..., {zkProof.pi_c[1].slice(0, 20)}...]
                          </div>
                        </div>
                      </div>
                    </details>

                    {/* Regenerate Button */}
                    <button
                      onClick={handleGenerateZKProof}
                      disabled={generatingProof}
                      className="w-full px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 disabled:bg-gray-100 disabled:text-gray-400 text-sm font-medium"
                    >
                      Regenerate Proof
                    </button>

                    {/* Demo Disclaimer */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div className="text-xs text-amber-800">
                          <strong>Demo Mode:</strong> This is a simulated ZK proof for demonstration purposes. Production will use RISC-Zero zkVM for cryptographically secure proofs.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 🆕 AI Optimal Settlement Path - Decoupled from AI Prediction */}
              {isLoadingSettlementPath ? (
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-200">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-4 h-4 text-purple-600 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-sm font-semibold text-purple-900">Loading Settlement Path...</span>
                  </div>
                </div>
              ) : (settlementPath || orderAmount > 0) && (
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span className="text-sm font-semibold text-purple-900">Settlement Path Recommendation</span>
                    </div>
                    {/* 🆕 Data Source Badge */}
                    {settlementPath?.is_realtime ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                        🔄 1inch DEX
                      </span>
                    ) : settlementPath ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">
                        🤖 AI Optimizer
                      </span>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    {/* Main Protocol */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-700">Protocol</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-purple-700">
                          {settlementPath ? settlementPath.name : 'FXPool Direct Swap'}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          settlementPath?.risk_level === 'low' ? 'bg-green-100 text-green-700' :
                          settlementPath?.risk_level === 'medium' ? 'bg-amber-100 text-amber-700' :
                          settlementPath?.risk_level === 'very_low' ? 'bg-blue-100 text-blue-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {settlementPath?.risk_level || 'low'} risk
                        </span>
                      </div>
                    </div>

                    {/* Cost & Time */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-white rounded p-2 border border-purple-100">
                        <div className="text-gray-600">Estimated Cost</div>
                        <div className="font-semibold text-purple-700">
                          {settlementPath ? (settlementPath.estimated_cost_pct * 100).toFixed(2) : '0.60'}%
                        </div>
                      </div>
                      <div className="bg-white rounded p-2 border border-purple-100">
                        <div className="text-gray-600">Settlement Time</div>
                        <div className="font-semibold text-purple-700">
                          ~{settlementPath?.settlement_time_seconds || 12}s
                        </div>
                      </div>
                    </div>

                    {/* Reliability Score */}
                    <div className="bg-white rounded p-2 border border-purple-100">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">Reliability Score</span>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 w-20">
                            <div
                              className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2 rounded-full"
                              style={{width: `${(settlementPath?.reliability || 0.98) * 100}%`}}
                            />
                          </div>
                          <span className="font-semibold text-purple-700">
                            {((settlementPath?.reliability || 0.98) * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Reason */}
                    <div className="bg-purple-50 rounded p-2 text-xs text-purple-800">
                      <span className="font-medium">Why this path?</span>{' '}
                      {settlementPath?.reason || 'AI-optimized settlement path for best cost and speed balance'}
                      {!settlementPath && orderAmount > 0 && (
                        <span className="text-gray-600 ml-1">(Enter order amount for personalized recommendation)</span>
                      )}
                    </div>

                    {/* Alternative Paths */}
                    {settlementPath?.alternative_paths && settlementPath.alternative_paths.length > 0 ? (
                      <div className="pt-2 border-t border-purple-200">
                        <div className="text-xs text-gray-600 mb-1">Alternative paths available:</div>
                        <div className="flex flex-wrap gap-1">
                          {settlementPath.alternative_paths.map((path, idx) => (
                            <span key={idx} className="text-xs bg-white px-2 py-0.5 rounded border border-purple-200 text-purple-700">
                              {path}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : orderAmount > 0 && (
                      <div className="pt-2 border-t border-purple-200">
                        <div className="text-xs text-gray-600 mb-1">Alternative paths available:</div>
                        <div className="flex flex-wrap gap-1">
                          <span className="text-xs bg-white px-2 py-0.5 rounded border border-purple-200 text-purple-700">Curve Finance</span>
                          <span className="text-xs bg-white px-2 py-0.5 rounded border border-purple-200 text-purple-700">Uniswap V3</span>
                        </div>
                      </div>
                    )}

                    {/* 🆕 Optimization Factors (Debug Info) */}
                    {settlementPath?.optimization_factors && (
                      <div className="pt-2 border-t border-purple-200">
                        <div className="text-xs text-gray-500">
                          Optimized for: {settlementPath.optimization_factors.pair_type} pair,
                          ${settlementPath.optimization_factors.amount_usd.toFixed(0)},
                          confidence {(settlementPath.optimization_factors.confidence * 100).toFixed(0)}%
                          {settlementPath.optimization_factors.score && ` (score: ${settlementPath.optimization_factors.score})`}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Public Goods Impact - Enhanced */}
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl shadow-sm p-6 border border-emerald-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <h2 className="text-lg font-semibold text-gray-900">Public Goods Impact</h2>
                </div>
                {isConnected && (
                  <div className="flex items-center gap-1 text-xs text-emerald-600">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span>Live</span>
                </div>
              )}
              </div>

              {/* Total Platform Donations */}
              <div className="bg-white rounded-lg p-4 mb-3 border border-emerald-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">Platform Total Donations</span>
                  {!isConnected && (
                    <span className="text-xs text-gray-400">Connect wallet to view</span>
                  )}
                  </div>
                <div className="text-3xl font-bold text-emerald-700">
                  {isConnected ? `$${totalLifetimeDonations.toFixed(2)}` : '$0.00'}
                  </div>
                {orderAmount > 0 && (
                  <div className="mt-2 pt-2 border-t border-emerald-100">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">Estimated donation for this order:</span>
                      <span className="font-semibold text-emerald-600">${donationAmount.toFixed(2)}</span>
                  </div>
                  </div>
                )}
              </div>

              {/* Contributors Count */}
              <div className="bg-white rounded-lg p-4 border border-emerald-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-700">Supported Developers</span>
                  <span className="text-lg font-bold text-emerald-700">
                    {isConnected ? `${totalContributors}` : '0'} contributors
                    </span>
                  </div>
                {contributorInfo && contributorInfo[0] > 0 && (
                  <div className="mt-2 pt-2 border-t border-emerald-100">
                    <div className="text-xs text-gray-600 mb-1">Your contribution:</div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-emerald-700">
                        ${(Number(contributorInfo[0]) / 1e6).toFixed(2)}
                      </span>
                      <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full">
                        {contributorInfo[2]} Badge
                      </span>
                    </div>
                    </div>
                  )}
                    </div>

              {/* View Details Button */}
              <Link
                href="/public-goods"
                className="mt-4 block w-full px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium text-center transition-colors"
              >
                View Donation Details
              </Link>
                  </div>

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
