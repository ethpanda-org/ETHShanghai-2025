'use client';

import { formatUnits } from 'viem';

interface Asset {
  token: string;
  weight: number;
  reserve: bigint;
  price?: bigint;
  symbol?: string;
}

interface ETFOverviewProps {
  sharePrice?: bigint;
  totalValue?: bigint;
  assets?: Asset[];
  isLoading?: boolean;
}

export function ETFOverview({
  sharePrice,
  totalValue,
  assets = [],
  isLoading = false,
}: ETFOverviewProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const formatPrice = (value?: bigint) => {
    if (!value) return '$0.00';
    return `$${parseFloat(formatUnits(value, 18)).toFixed(2)}`;
  };

  const formatTVL = (value?: bigint) => {
    if (!value) return '$0';
    const num = parseFloat(formatUnits(value, 18));
    if (num >= 1_000_000) {
      return `$${(num / 1_000_000).toFixed(2)}M`;
    }
    if (num >= 1_000) {
      return `$${(num / 1_000).toFixed(2)}K`;
    }
    return `$${num.toFixed(2)}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4">BlockETF Overview</h2>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-sm text-gray-600">Share Price</p>
          <p className="text-2xl font-semibold">{formatPrice(sharePrice)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Total Value Locked</p>
          <p className="text-2xl font-semibold">{formatTVL(totalValue)}</p>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Portfolio Composition</h3>
        <div className="space-y-2">
          {assets.map((asset, index) => {
            const weight = asset.weight / 100; // Convert from basis points to percentage
            const value = asset.price
              ? (asset.reserve * asset.price) / BigInt(10 ** 18)
              : BigInt(0);

            return (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="font-medium">
                    {asset.symbol || `Asset ${index + 1}`}
                  </span>
                  <span className="text-sm text-gray-600">{weight}%</span>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatTVL(value)}</p>
                  <p className="text-xs text-gray-500">
                    {formatPrice(asset.price)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
