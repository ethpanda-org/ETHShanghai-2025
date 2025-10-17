'use client';

import { formatUnits } from 'viem';

interface MyHoldingsProps {
  shares?: bigint;
  sharePrice?: bigint;
  isConnected: boolean;
  isLoading?: boolean;
}

export function MyHoldings({
  shares,
  sharePrice,
  isConnected,
  isLoading = false,
}: MyHoldingsProps) {
  if (!isConnected) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-3">My Holdings</h3>
        <p className="text-gray-500 text-center py-4">
          Connect your wallet to view your holdings
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-3">My Holdings</h3>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  const sharesFormatted = shares
    ? parseFloat(formatUnits(shares, 18)).toFixed(4)
    : '0.0000';

  const value =
    shares && sharePrice
      ? (shares * sharePrice) / BigInt(10 ** 18)
      : BigInt(0);

  const valueFormatted = `$${parseFloat(formatUnits(value, 18)).toFixed(2)}`;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-3">My Holdings</h3>
      <div className="space-y-3">
        <div>
          <p className="text-sm text-gray-600">Shares</p>
          <p className="text-xl font-semibold">{sharesFormatted}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Value</p>
          <p className="text-xl font-semibold text-green-600">
            {valueFormatted}
          </p>
        </div>
      </div>
    </div>
  );
}
