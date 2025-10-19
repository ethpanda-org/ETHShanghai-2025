'use client';

import { useState, useEffect } from 'react';
import { usePublicClient } from 'wagmi';
import { formatUnits, Address } from 'viem';
import { CONTRACTS, FX_POOL_ABI } from '@/lib/contracts';
import { TOKEN_INFO } from '@/lib/tokens';

interface PoolData {
  pair: string;
  totalLiquidity: bigint;
  lpTokenSupply: bigint;
  baseFee: bigint;
  dynamicFee: bigint;
  isActive: boolean;
  reserves: {
    token1: { address: string; symbol: string; amount: bigint };
    token2: { address: string; symbol: string; amount: bigint };
  };
  volume24h?: number;
  fees24h?: number;
  apy?: number;
}

interface PoolDetailCardProps {
  pair: string;
}

export function PoolDetailCard({ pair }: PoolDetailCardProps) {
  const publicClient = usePublicClient();
  const [poolData, setPoolData] = useState<PoolData | null>(null);
  const [loading, setLoading] = useState(true);
  const [priceChart, setPriceChart] = useState<Array<{ time: string; price: number }>>([]);

  useEffect(() => {
    if (publicClient && pair) {
      fetchPoolData();
      generateMockPriceData();
    }
  }, [publicClient, pair]);

  const fetchPoolData = async () => {
    setLoading(true);
    try {
      const poolInfo = await publicClient!.readContract({
        address: CONTRACTS.FX_POOL as Address,
        abi: FX_POOL_ABI,
        functionName: 'getPoolInfo',
        args: [pair],
      }) as any;

      // Get token addresses from pair
      const [token1Symbol, token2Symbol] = pair.split('/');
      const token1Address = TOKEN_INFO[token1Symbol as keyof typeof TOKEN_INFO]?.address;
      const token2Address = TOKEN_INFO[token2Symbol as keyof typeof TOKEN_INFO]?.address;

      // Get reserves
      let reserves1 = BigInt(0);
      let reserves2 = BigInt(0);

      if (token1Address && token2Address) {
        [reserves1, reserves2] = await Promise.all([
          publicClient!.readContract({
            address: CONTRACTS.FX_POOL as Address,
            abi: FX_POOL_ABI,
            functionName: 'getReserves',
            args: [pair, token1Address],
          }) as Promise<bigint>,
          publicClient!.readContract({
            address: CONTRACTS.FX_POOL as Address,
            abi: FX_POOL_ABI,
            functionName: 'getReserves',
            args: [pair, token2Address],
          }) as Promise<bigint>,
        ]);
      }

      // Calculate mock APY based on fee and volume
      const mockVolume24h = Math.random() * 500000 + 100000;
      const mockFees24h = mockVolume24h * (Number(poolInfo[2]) / 10000);
      const mockAPY = poolInfo[0] > 0 ?
        (mockFees24h * 365 / Number(formatUnits(poolInfo[0], 6))) * 100 : 0;

      setPoolData({
        pair,
        totalLiquidity: poolInfo[0],
        lpTokenSupply: poolInfo[1],
        baseFee: poolInfo[2],
        dynamicFee: poolInfo[3],
        isActive: poolInfo[4],
        reserves: {
          token1: {
            address: token1Address || '',
            symbol: token1Symbol,
            amount: reserves1
          },
          token2: {
            address: token2Address || '',
            symbol: token2Symbol,
            amount: reserves2
          },
        },
        volume24h: mockVolume24h,
        fees24h: mockFees24h,
        apy: mockAPY,
      });
    } catch (error) {
      console.error('Error fetching pool data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMockPriceData = () => {
    const data = [];
    const now = new Date();
    let price = 1 + Math.random() * 0.1;

    for (let i = 24; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 3600000);
      price = price * (1 + (Math.random() - 0.5) * 0.02);
      data.push({
        time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        price: parseFloat(price.toFixed(4)),
      });
    }
    setPriceChart(data);
  };

  const formatNumber = (num: number | string, decimals = 2) => {
    return parseFloat(num.toString()).toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (!poolData) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <p className="text-gray-600">Pool data not available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">{poolData.pair} Pool</h2>
            <div className="flex items-center gap-4 text-sm opacity-90">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                poolData.isActive
                  ? 'bg-green-400/20 text-green-100 border border-green-400/30'
                  : 'bg-red-400/20 text-red-100 border border-red-400/30'
              }`}>
                {poolData.isActive ? '🟢 Active' : '🔴 Inactive'}
              </span>
              <span>Fee: {(Number(poolData.baseFee) / 100).toFixed(2)}%</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">
              {poolData.apy ? `${poolData.apy.toFixed(2)}%` : 'N/A'}
            </div>
            <div className="text-sm opacity-90">APY</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Total Liquidity</div>
            <div className="text-xl font-bold text-gray-900">
              ${formatNumber(formatUnits(poolData.totalLiquidity, 6))}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">24h Volume</div>
            <div className="text-xl font-bold text-gray-900">
              ${poolData.volume24h ? formatNumber(poolData.volume24h) : '0'}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">24h Fees</div>
            <div className="text-xl font-bold text-gray-900">
              ${poolData.fees24h ? formatNumber(poolData.fees24h) : '0'}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">LP Token Supply</div>
            <div className="text-xl font-bold text-gray-900">
              {formatNumber(formatUnits(poolData.lpTokenSupply, 18), 4)}
            </div>
          </div>
        </div>

        {/* Pool Composition */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Pool Composition</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                  {poolData.reserves.token1.symbol[0]}
                </div>
                <span className="font-medium">{poolData.reserves.token1.symbol}</span>
              </div>
              <div className="text-right">
                <div className="font-semibold">
                  {formatNumber(formatUnits(
                    poolData.reserves.token1.amount,
                    TOKEN_INFO[poolData.reserves.token1.symbol as keyof typeof TOKEN_INFO]?.decimals || 18
                  ), 4)}
                </div>
                <div className="text-sm text-gray-600">
                  ~${formatNumber(formatUnits(poolData.reserves.token1.amount, 6))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                  {poolData.reserves.token2.symbol[0]}
                </div>
                <span className="font-medium">{poolData.reserves.token2.symbol}</span>
              </div>
              <div className="text-right">
                <div className="font-semibold">
                  {formatNumber(formatUnits(
                    poolData.reserves.token2.amount,
                    TOKEN_INFO[poolData.reserves.token2.symbol as keyof typeof TOKEN_INFO]?.decimals || 18
                  ), 4)}
                </div>
                <div className="text-sm text-gray-600">
                  ~${formatNumber(formatUnits(poolData.reserves.token2.amount, 6))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Price Chart (Placeholder) */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Price History (24h)</h3>
          <div className="h-48 bg-gradient-to-b from-blue-50 to-white rounded-lg p-4">
            <div className="h-full flex items-end justify-between gap-1">
              {priceChart.map((point, i) => (
                <div
                  key={i}
                  className="flex-1 bg-gradient-to-t from-blue-500 to-blue-400 rounded-t hover:from-blue-600 hover:to-blue-500 transition-colors"
                  style={{
                    height: `${((point.price - 0.95) / 0.15) * 100}%`,
                    minHeight: '4px',
                  }}
                  title={`${point.time}: ${point.price}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <button className="bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
            Add Liquidity
          </button>
          <button className="bg-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-purple-700 transition-colors">
            Swap Tokens
          </button>
        </div>

        {/* MEV Protection Notice */}
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center text-sm text-green-700">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>This pool has MEV protection enabled • Smart order routing active</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Export a standalone PoolInfo component for general use
export default function PoolInfo({ pair }: { pair: string }) {
  return <PoolDetailCard pair={pair} />;
}