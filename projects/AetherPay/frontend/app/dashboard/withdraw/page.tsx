'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContracts, useWriteContract, useWaitForTransactionReceipt, useWatchContractEvent } from 'wagmi';
import { CONTRACTS, PAYMENT_GATEWAY_ABI, ERC20_ABI } from '@/lib/contracts';
import { TOKENS, getTokenInfo } from '@/lib/tokens';
import { formatUnits, parseUnits } from 'viem';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface TokenBalance {
  token: string;
  symbol: string;
  balance: bigint;
  decimals: number;
  address: string;
}

interface WithdrawalRecord {
  token: string;
  amount: string;
  timestamp: number;
  txHash: string;
}

export default function WithdrawPage() {
  const { address, isConnected } = useAccount();
  const [selectedToken, setSelectedToken] = useState(CONTRACTS.MOCK_USDC);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [withdrawalHistory, setWithdrawalHistory] = useState<WithdrawalRecord[]>([]);

  // 提现操作
  const { writeContract, data: hash, isPending, isError } = useWriteContract();

  // 等待交易确认
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // 只查询真实部署的Token（USDC, USDT, DAI）
  const deployedTokens = TOKENS.filter(t =>
    t.address === CONTRACTS.MOCK_USDC ||
    t.address === CONTRACTS.MOCK_USDT ||
    t.address === CONTRACTS.MOCK_DAI
  );

  // 读取各Token余额
  const { data: balances, refetch: refetchBalances } = useReadContracts({
    contracts: deployedTokens.flatMap(token => [
      {
        address: CONTRACTS.PAYMENT_GATEWAY_V2 as `0x${string}`,
        abi: PAYMENT_GATEWAY_ABI,
        functionName: 'getMerchantBalance',
        args: [address as `0x${string}`, token.address as `0x${string}`],
      },
    ]),
    query: {
      enabled: isConnected && !!address,
    }
  });

  // 解析余额数据
  const tokenBalances: TokenBalance[] = deployedTokens.map((token, index) => ({
    token: token.name,
    symbol: token.symbol,
    balance: balances?.[index]?.result as bigint || BigInt(0),
    decimals: token.decimals,
    address: token.address,
  }));

  // 获取当前选择的Token信息
  const selectedTokenInfo = getTokenInfo(selectedToken);
  const selectedBalance = tokenBalances.find(b => b.address === selectedToken);
  const maxWithdrawAmount = selectedBalance ? formatUnits(selectedBalance.balance, selectedBalance.decimals) : '0';

  // 设置默认接收地址为当前钱包
  useEffect(() => {
    if (address && !recipientAddress) {
      setRecipientAddress(address);
    }
  }, [address, recipientAddress]);

  // 监听提现成功
  useEffect(() => {
    if (isConfirmed && hash) {
      toast.success('🎉 Withdrawal successful!');
      refetchBalances();
      setWithdrawAmount('');

      // 添加到提现历史
      if (selectedTokenInfo) {
        const newRecord: WithdrawalRecord = {
          token: selectedTokenInfo.symbol,
          amount: withdrawAmount,
          timestamp: Date.now(),
          txHash: hash,
        };
        setWithdrawalHistory(prev => [newRecord, ...prev].slice(0, 10)); // 只保留最近10条
      }
    }
  }, [isConfirmed, hash, selectedTokenInfo, withdrawAmount, refetchBalances]);

  // 实时监听提现事件
  useWatchContractEvent({
    address: CONTRACTS.PAYMENT_GATEWAY_V2 as `0x${string}`,
    abi: PAYMENT_GATEWAY_ABI,
    eventName: 'MerchantWithdrawal',
    onLogs(logs) {
      console.log('💰 Withdrawal detected:', logs);
      const log = logs[0] as any;
      if (log.args?.merchant?.toLowerCase() === address?.toLowerCase()) {
        refetchBalances();
        toast.success('Withdrawal confirmed on-chain!', { icon: '✅' });
      }
    },
  });

  // 处理提现
  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!recipientAddress || recipientAddress.length !== 42) {
      toast.error('Please enter a valid recipient address');
      return;
    }

    if (!selectedTokenInfo) {
      toast.error('Invalid token selected');
      return;
    }

    try {
      const amountInWei = parseUnits(withdrawAmount, selectedTokenInfo.decimals);

      // 检查余额
      if (selectedBalance && amountInWei > selectedBalance.balance) {
        toast.error('Insufficient balance');
        return;
      }

      console.log('🔄 Withdrawing:', {
        token: selectedToken,
        amount: amountInWei.toString(),
        recipient: recipientAddress,
      });

      writeContract({
        address: CONTRACTS.PAYMENT_GATEWAY_V2 as `0x${string}`,
        abi: PAYMENT_GATEWAY_ABI,
        functionName: 'withdrawMerchantBalance',
        args: [selectedToken as `0x${string}`, amountInWei],
      });

      toast.success('Withdrawal transaction submitted!');
    } catch (error) {
      console.error('❌ Withdrawal failed:', error);
      toast.error(`Withdrawal failed: ${(error as Error).message}`);
    }
  };

  // 快速填充最大金额
  const fillMaxAmount = () => {
    if (selectedBalance) {
      setWithdrawAmount(formatUnits(selectedBalance.balance, selectedBalance.decimals));
    }
  };

  // 计算总余额（USD）
  const totalBalanceUSD = tokenBalances.reduce((sum, b) => {
    const balanceNum = parseFloat(formatUnits(b.balance, b.decimals));
    return sum + balanceNum; // 假设所有都是USD stablecoin
  }, 0);

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
            <p className="text-gray-600 mb-6">Please connect your wallet to withdraw funds</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Withdraw Funds</h1>
              <p className="text-gray-600 mt-2">Transfer your settled balance to your wallet</p>
            </div>
            <button
              onClick={() => refetchBalances()}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Balances */}
          <div className="lg:col-span-1 space-y-6">
            {/* Total Balance Card */}
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                <span className="text-sm font-medium text-emerald-100">Total Available</span>
              </div>
              <div className="text-4xl font-bold mb-1">${totalBalanceUSD.toFixed(2)}</div>
              <div className="text-sm text-emerald-100">Across {tokenBalances.filter(b => b.balance > 0).length} tokens</div>
            </div>

            {/* Token Balances */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Token Balances</h3>
              <div className="space-y-3">
                {tokenBalances.map((balance) => (
                  <div
                    key={balance.address}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedToken === balance.address
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedToken(balance.address)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          balance.symbol === 'USDC' ? 'bg-blue-100' :
                          balance.symbol === 'USDT' ? 'bg-green-100' : 'bg-yellow-100'
                        }`}>
                          <span className={`text-sm font-bold ${
                            balance.symbol === 'USDC' ? 'text-blue-600' :
                            balance.symbol === 'USDT' ? 'text-green-600' : 'text-yellow-600'
                          }`}>
                            {balance.symbol[0]}
                          </span>
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{balance.symbol}</div>
                          <div className="text-xs text-gray-500">{balance.token}</div>
                        </div>
                      </div>
                      {selectedToken === balance.address && (
                        <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-gray-900">
                        {formatUnits(balance.balance, balance.decimals)}
                      </span>
                      <span className="text-sm text-gray-500">{balance.symbol}</span>
                    </div>
                    {balance.balance > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        ≈ ${formatUnits(balance.balance, balance.decimals)} USD
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Withdrawal Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Withdrawal Form */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900">Withdraw Funds</h2>
              </div>

              <div className="space-y-6">
                {/* Selected Token Display */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-2">Selected Token</div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        selectedTokenInfo?.symbol === 'USDC' ? 'bg-blue-100' :
                        selectedTokenInfo?.symbol === 'USDT' ? 'bg-green-100' : 'bg-yellow-100'
                      }`}>
                        <span className={`text-lg font-bold ${
                          selectedTokenInfo?.symbol === 'USDC' ? 'text-blue-600' :
                          selectedTokenInfo?.symbol === 'USDT' ? 'text-green-600' : 'text-yellow-600'
                        }`}>
                          {selectedTokenInfo?.symbol[0]}
                        </span>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{selectedTokenInfo?.symbol}</div>
                        <div className="text-sm text-gray-500">{selectedTokenInfo?.name}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">Available</div>
                      <div className="font-bold text-gray-900">{maxWithdrawAmount} {selectedTokenInfo?.symbol}</div>
                    </div>
                  </div>
                </div>

                {/* Amount Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Withdrawal Amount <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.000001"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 pr-24"
                    />
                    <div className="absolute right-3 top-3 flex items-center gap-2">
                      <button
                        onClick={fillMaxAmount}
                        className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded text-sm font-medium hover:bg-emerald-200"
                      >
                        MAX
                      </button>
                      <span className="text-gray-500 font-medium">{selectedTokenInfo?.symbol}</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Available: {maxWithdrawAmount} {selectedTokenInfo?.symbol}
                  </div>
                </div>

                {/* Recipient Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recipient Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 font-mono text-sm"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Funds will be sent to this address
                  </div>
                </div>

                {/* Transaction Info */}
                {withdrawAmount && parseFloat(withdrawAmount) > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-blue-900 mb-1">Transaction Summary</div>
                        <div className="space-y-1 text-sm text-blue-800">
                          <div className="flex justify-between">
                            <span>You will receive:</span>
                            <span className="font-semibold">{withdrawAmount} {selectedTokenInfo?.symbol}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Network:</span>
                            <span className="font-semibold">Optimism Sepolia</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Est. Gas Fee:</span>
                            <span className="font-semibold">~$0.01</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Withdraw Button */}
                <button
                  onClick={handleWithdraw}
                  disabled={isPending || isConfirming || !withdrawAmount || parseFloat(withdrawAmount) <= 0}
                  className="w-full px-6 py-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2"
                >
                  {isPending || isConfirming ? (
                    <>
                      <div className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent"></div>
                      {isPending ? 'Awaiting Confirmation...' : 'Processing Withdrawal...'}
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      Withdraw Funds
                    </>
                  )}
                </button>

                {isError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="text-sm text-red-800">Withdrawal failed. Please try again.</div>
                  </div>
                )}
              </div>
            </div>

            {/* Withdrawal History */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recent Withdrawals</h3>
                <span className="text-xs text-gray-500">{withdrawalHistory.length} transactions</span>
              </div>

              {withdrawalHistory.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-1">No Withdrawals Yet</h4>
                  <p className="text-sm text-gray-600">Your withdrawal history will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {withdrawalHistory.map((record, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">
                            {record.amount} {record.token}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(record.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <a
                        href={`https://sepolia-optimism.etherscan.io/tx/${record.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                      >
                        View TX
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Help Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="font-semibold text-blue-900 mb-2">Important Information</h4>
                  <ul className="space-y-1 text-sm text-blue-800">
                    <li>• Withdrawals are instant and irreversible</li>
                    <li>• Funds are sent to Optimism Sepolia network</li>
                    <li>• Make sure the recipient address is correct</li>
                    <li>• Gas fees are paid separately from your wallet</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
