'use client';

import { useState, useMemo } from 'react';
import { formatUnits, parseUnits } from 'viem';
import { useReadContract, useChainId } from 'wagmi';
import { etfRouterABI } from '@/lib/contracts/abis';
import { getContractAddress } from '@/lib/contracts/addresses';

type TradeMode = 'invest' | 'redeem';

interface TradePanelProps {
  isConnected: boolean;
  onInvest?: (shares: bigint, maxUSDT: bigint) => void;
  onRedeem?: (shares: bigint, minUSDT: bigint) => void;
  isLoading?: boolean;
}

export function TradePanel({
  isConnected,
  onInvest,
  onRedeem,
  isLoading = false,
}: TradePanelProps) {
  const chainId = useChainId();
  const routerAddress = getContractAddress(chainId as 56 | 97, 'etfRouter');

  const [mode, setMode] = useState<TradeMode>('invest');
  const [amount, setAmount] = useState('');

  // Parse shares amount
  const shares = useMemo(() => {
    try {
      return amount ? parseUnits(amount, 18) : BigInt(0);
    } catch {
      return BigInt(0);
    }
  }, [amount]);

  // Preview for invest (USDT needed)
  const { data: usdtNeeded } = useReadContract({
    address: routerAddress,
    abi: etfRouterABI,
    functionName: 'usdtNeededForShares',
    args: [shares],
    query: {
      enabled: shares > BigInt(0) && mode === 'invest',
    },
  });

  // Preview for redeem (USDT received)
  const { data: usdtReceived } = useReadContract({
    address: routerAddress,
    abi: etfRouterABI,
    functionName: 'sharesToUsdt',
    args: [shares],
    query: {
      enabled: shares > BigInt(0) && mode === 'redeem',
    },
  });

  const handleTrade = () => {
    if (!amount || !isConnected || shares === BigInt(0)) return;

    try {
      if (mode === 'invest' && onInvest && usdtNeeded) {
        const maxUSDT = (usdtNeeded * BigInt(103)) / BigInt(100); // Add 3% slippage
        onInvest(shares, maxUSDT);
      } else if (mode === 'redeem' && onRedeem && usdtReceived) {
        const minUSDT = (usdtReceived * BigInt(97)) / BigInt(100); // Subtract 3% slippage
        onRedeem(shares, minUSDT);
      }
    } catch (error) {
      console.error('Trade error:', error);
    }
  };

  const getPreviewAmount = () => {
    const preview = mode === 'invest' ? usdtNeeded : usdtReceived;
    if (!preview) return '0.00';
    return parseFloat(formatUnits(preview, 18)).toFixed(2);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4">Trade Panel</h3>

      {/* Mode Selector */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode('invest')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
            mode === 'invest'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          💰 Invest
        </button>
        <button
          onClick={() => setMode('redeem')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
            mode === 'redeem'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          📤 Redeem
        </button>
      </div>

      {/* Amount Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {mode === 'invest' ? 'Shares to Buy' : 'Shares to Redeem'}
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.0"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={!isConnected || isLoading}
        />
      </div>

      {/* Preview */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">
          {mode === 'invest' ? 'USDT Required' : 'USDT to Receive'}
        </p>
        <p className="text-xl font-semibold">${getPreviewAmount()}</p>
        <p className="text-xs text-gray-500 mt-1">
          Including 3% slippage tolerance
        </p>
      </div>

      {/* Trade Button */}
      <button
        onClick={handleTrade}
        disabled={!isConnected || !amount || isLoading}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        {!isConnected
          ? 'Connect Wallet'
          : isLoading
          ? 'Processing...'
          : mode === 'invest'
          ? 'Invest Now'
          : 'Redeem Now'}
      </button>
    </div>
  );
}
