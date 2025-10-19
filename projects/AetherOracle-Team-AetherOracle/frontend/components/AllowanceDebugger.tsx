'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { CONTRACTS, ERC20_ABI } from '@/lib/contracts';

interface AllowanceDebuggerProps {
  paymentToken: string;
  orderAmount: bigint;
  tokenSymbol: string;
}

export default function AllowanceDebugger({ 
  paymentToken, 
  orderAmount, 
  tokenSymbol 
}: AllowanceDebuggerProps) {
  const { address } = useAccount();
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [isExpanded, setIsExpanded] = useState(false);

  // Read allowance every 2 seconds
  const { data: allowanceData, refetch: refetchAllowance } = useReadContract({
    address: paymentToken as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address as `0x${string}`, CONTRACTS.PAYMENT_GATEWAY_V2 as `0x${string}`],
  });

  // Read balance
  const { data: balanceData, refetch: refetchBalance } = useReadContract({
    address: paymentToken as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
  });

  // 🔧 修复：更新调试信息（仅在数据变化时更新）
  useEffect(() => {
    const allowanceRaw = (allowanceData as bigint) ?? 0n;
    const balanceRaw = (balanceData as bigint) ?? 0n;

    const allowanceFormatted = Number(allowanceRaw) / 1e6;
    const balanceFormatted = Number(balanceRaw) / 1e6;
    const orderAmountFormatted = Number(orderAmount) / 1e6;

    const needsApproval = allowanceRaw < orderAmount;
    const hasBalance = balanceRaw >= orderAmount;

    setDebugInfo({
      timestamp: new Date().toLocaleTimeString(),
      allowanceRaw: allowanceRaw.toString(),
      allowanceFormatted,
      balanceRaw: balanceRaw.toString(),
      balanceFormatted,
      orderAmountRaw: orderAmount.toString(),
      orderAmountFormatted,
      needsApproval,
      hasBalance,
      paymentToken,
      spender: CONTRACTS.PAYMENT_GATEWAY_V2,
      userAddress: address
    });
  }, [allowanceData, balanceData, orderAmount, paymentToken, address]); // 🔧 移除 refetch 函数依赖

  // 🔧 修复：定期刷新（独立的 effect，避免依赖循环）
  useEffect(() => {
    if (!address) return;

    // 🔧 每 5 秒刷新一次（降低频率，避免过度刷新）
    const interval = setInterval(() => {
      refetchAllowance();
      refetchBalance();
    }, 5000);

    return () => clearInterval(interval);
  }, [address]); // 🔧 仅依赖 address

  if (!address) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white border border-gray-300 rounded-lg shadow-lg max-w-sm">
        {/* Header */}
        <div 
          className="flex items-center justify-between p-3 bg-gray-50 rounded-t-lg cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${debugInfo.needsApproval ? 'bg-red-500' : 'bg-green-500'}`}></div>
            <span className="text-sm font-medium text-gray-700">Allowance Debug</span>
          </div>
          <svg 
            className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Content */}
        {isExpanded && (
          <div className="p-3 space-y-2 text-xs font-mono">
            <div className="text-gray-500">Last Update: {debugInfo.timestamp}</div>
            
            <div className="border-t pt-2">
              <div className="font-semibold text-gray-700 mb-1">Allowance Status</div>
              <div className={`${debugInfo.needsApproval ? 'text-red-600' : 'text-green-600'}`}>
                {debugInfo.needsApproval ? '❌ Needs Approval' : '✅ Sufficient'}
              </div>
              <div>Current: {debugInfo.allowanceFormatted} {tokenSymbol}</div>
              <div>Required: {debugInfo.orderAmountFormatted} {tokenSymbol}</div>
            </div>

            <div className="border-t pt-2">
              <div className="font-semibold text-gray-700 mb-1">Balance Status</div>
              <div className={`${debugInfo.hasBalance ? 'text-green-600' : 'text-red-600'}`}>
                {debugInfo.hasBalance ? '✅ Sufficient' : '❌ Insufficient'}
              </div>
              <div>Balance: {debugInfo.balanceFormatted} {tokenSymbol}</div>
            </div>

            <div className="border-t pt-2">
              <div className="font-semibold text-gray-700 mb-1">Raw Values</div>
              <div>Allowance: {debugInfo.allowanceRaw}</div>
              <div>Balance: {debugInfo.balanceRaw}</div>
              <div>Order: {debugInfo.orderAmountRaw}</div>
            </div>

            <div className="border-t pt-2">
              <div className="font-semibold text-gray-700 mb-1">Addresses</div>
              <div>Token: {debugInfo.paymentToken?.slice(0, 10)}...</div>
              <div>Spender: {debugInfo.spender?.slice(0, 10)}...</div>
              <div>User: {debugInfo.userAddress?.slice(0, 10)}...</div>
            </div>

            {/* Quick Actions */}
            <div className="border-t pt-2">
              <button
                onClick={() => {
                  refetchAllowance();
                  refetchBalance();
                }}
                className="w-full bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
              >
                🔄 Refresh Now
              </button>
            </div>

            {/* Copy Debug Info */}
            <div className="border-t pt-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
                  alert('Debug info copied to clipboard!');
                }}
                className="w-full bg-gray-500 text-white px-2 py-1 rounded text-xs hover:bg-gray-600"
              >
                📋 Copy Debug Info
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
