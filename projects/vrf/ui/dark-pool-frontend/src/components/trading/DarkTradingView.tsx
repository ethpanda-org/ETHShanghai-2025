import React, { useState } from 'react';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { BlurredBalance, RangeDisplay } from '../privacy/index.js';
import { ObfuscationUtils, RangeUtils } from '../../utils/index.js';
import { cn } from '../../utils/cn.js';

interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  liquidity: 'low' | 'medium' | 'high';
  spread: { min: number; max: number };
}

interface DarkTradingViewProps {
  marketData: MarketData;
  onPlaceOrder?: (order: any) => void;
  className?: string;
}

export const DarkTradingView: React.FC<DarkTradingViewProps> = ({
  marketData,
  onPlaceOrder,
  className = ''
}) => {
  const [showPrices, setShowPrices] = useState(false);
  const [orderType, setOrderType] = useState<'limit' | 'market'>('limit');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onPlaceOrder) {
      onPlaceOrder({
        type: orderType,
        side,
        amount: parseFloat(amount),
        price: orderType === 'limit' ? parseFloat(price) : undefined
      });
    }
  };

  const getLiquidityColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getLiquidityBackground = (level: string) => {
    switch (level) {
      case 'high': return 'bg-green-900/20 border-green-500/30';
      case 'medium': return 'bg-yellow-900/20 border-yellow-500/30';
      case 'low': return 'bg-red-900/20 border-red-500/30';
      default: return 'bg-gray-800 border-gray-700';
    }
  };

  return (
    <div className={cn('bg-gray-900 rounded-xl p-6', className)}>
      {/* Market Overview */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-100">{marketData.symbol}</h2>
          <button
            onClick={() => setShowPrices(!showPrices)}
            className="p-2 text-gray-400 hover:text-gray-200 transition-colors"
            title={showPrices ? 'Hide prices' : 'Show prices'}
          >
            {showPrices ? (
              <EyeSlashIcon className="h-5 w-5" />
            ) : (
              <EyeIcon className="h-5 w-5" />
            )}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Price</div>
            <div className="text-2xl font-bold">
              {showPrices ? (
                <span className="text-gray-100">
                  ${marketData.price.toFixed(2)}
                </span>
              ) : (
                <span className="text-gray-500">****</span>
              )}
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">24h Change</div>
            <div className="text-2xl font-bold flex items-center">
              {marketData.change >= 0 ? (
                <ArrowTrendingUpIcon className="h-6 w-6 text-green-400 mr-2" />
              ) : (
                <ArrowTrendingDownIcon className="h-6 w-6 text-red-400 mr-2" />
              )}
              {showPrices ? (
                <span className={marketData.change >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {marketData.change >= 0 ? '+' : ''}{marketData.changePercent.toFixed(2)}%
                </span>
              ) : (
                <span className="text-gray-500">*.*%</span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className={cn('rounded-lg p-4 border', getLiquidityBackground(marketData.liquidity))}>
            <div className="text-sm text-gray-400 mb-1">Liquidity</div>
            <div className={cn('font-semibold capitalize', getLiquidityColor(marketData.liquidity))}>
              {marketData.liquidity}
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Spread</div>
            <div className="font-semibold text-gray-300">
              {showPrices ? (
                <RangeDisplay
                  value={marketData.spread.min}
                  variance={((marketData.spread.max - marketData.spread.min) / marketData.spread.min) * 100}
                  precision={2}
                  unit=" USD"
                />
              ) : (
                <span className="text-gray-500">*.*</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Order Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={() => setSide('buy')}
            className={cn(
              'flex-1 py-2 px-4 rounded-lg font-medium transition-colors',
              side === 'buy'
                ? 'bg-green-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            )}
          >
            Buy
          </button>
          <button
            type="button"
            onClick={() => setSide('sell')}
            className={cn(
              'flex-1 py-2 px-4 rounded-lg font-medium transition-colors',
              side === 'sell'
                ? 'bg-red-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            )}
          >
            Sell
          </button>
        </div>

        <div className="flex space-x-2">
          <button
            type="button"
            onClick={() => setOrderType('limit')}
            className={cn(
              'flex-1 py-2 px-4 rounded-lg font-medium transition-colors',
              orderType === 'limit'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            )}
          >
            Limit
          </button>
          <button
            type="button"
            onClick={() => setOrderType('market')}
            className={cn(
              'flex-1 py-2 px-4 rounded-lg font-medium transition-colors',
              orderType === 'market'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            )}
          >
            Market
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Amount
          </label>
          <div className="relative">
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0000"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono"
            />
            {!showPrices && amount && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-gray-600 font-mono">
                  {ObfuscationUtils.blurValue(amount, 'medium')}
                </span>
              </div>
            )}
          </div>
        </div>

        {orderType === 'limit' && (
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Price
            </label>
            <div className="relative">
              <input
                type="text"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono"
              />
              {!showPrices && price && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-gray-600 font-mono">
                    {ObfuscationUtils.blurValue(price, 'medium')}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={!amount || (orderType === 'limit' && !price)}
          className={cn(
            'w-full py-3 rounded-lg font-medium transition-colors',
            side === 'buy'
              ? 'bg-green-600 hover:bg-green-700 disabled:bg-gray-700'
              : 'bg-red-600 hover:bg-red-700 disabled:bg-gray-700',
            'text-white disabled:cursor-not-allowed'
          )}
        >
          Place {side === 'buy' ? 'Buy' : 'Sell'} Order
        </button>
      </form>

      <div className="mt-6 pt-4 border-t border-gray-800">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Dark Pool Trading</span>
          <span>All orders are private</span>
        </div>
      </div>
    </div>
  );
};