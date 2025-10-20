import React, { useState } from 'react';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { BlurredBalance, RangeDisplay } from '../privacy/index.js';
import { RingVRMControl } from '../ringvrm/RingVRMControl.js';
import { RingVRMOrderForm } from '../ringvrm/RingVRMOrderForm.js';
import { ObfuscationUtils, RangeUtils } from '../../utils/index.js';
import { cn } from '../../utils/cn.js';
import { ringVRMAPI } from '../../services/api-ringvrm.js';

interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  liquidity: 'low' | 'medium' | 'high';
  spread: { min: number; max: number };
}

interface DarkTradingViewWithRingVRMProps {
  marketData: MarketData;
  onPlaceOrder?: (order: any) => void;
  className?: string;
}

export const DarkTradingViewWithRingVRM: React.FC<DarkTradingViewWithRingVRMProps> = ({
  marketData,
  onPlaceOrder,
  className = ''
}) => {
  const [showPrices, setShowPrices] = useState(false);
  const [showRingVRM, setShowRingVRM] = useState(true);
  const [ringVRMEnabled, setRingVRMEnabled] = useState(true);
  const [orderType, setOrderType] = useState<'limit' | 'market'>('limit');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [useRingVRMForm, setUseRingVRMForm] = useState(false);

  // Enhanced market data with Ring VRM information
  const [enhancedMarketData, setEnhancedMarketData] = useState(marketData);

  // Load market data with Ring VRM obfuscation
  React.useEffect(() => {
    const loadMarketData = async () => {
      try {
        const data = await ringVRMAPI.getMarketDataWithRingVRM(marketData.symbol);
        setEnhancedMarketData({
          ...marketData,
          price: data.price === '****' ? marketData.price : parseFloat(data.price),
          liquidity: data.liquidity
        });
      } catch (error) {
        console.error('Failed to load enhanced market data:', error);
      }
    };

    if (ringVRMEnabled) {
      loadMarketData();
    } else {
      setEnhancedMarketData(marketData);
    }
  }, [marketData, ringVRMEnabled]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (useRingVRMForm && ringVRMEnabled) {
      // Ring VRM form handles its own submission
      return;
    }

    if (onPlaceOrder) {
      onPlaceOrder({
        type: orderType,
        side,
        amount: parseFloat(amount),
        price: orderType === 'limit' ? parseFloat(price) : undefined,
        useRingVRM: ringVRMEnabled
      });
    }
  };

  const handleRingVRMOrder = async (order: any) => {
    console.log('Ring VRM Order placed:', order);
    if (onPlaceOrder) {
      onPlaceOrder(order);
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

  const obfuscatedPrice = ringVRMEnabled ? '****' : (
    showPrices ? enhancedMarketData.price.toFixed(2) : '****'
  );

  const obfuscatedChange = ringVRMEnabled ? '+*.*%' : (
    showPrices ?
      `${enhancedMarketData.change >= 0 ? '+' : ''}${enhancedMarketData.changePercent.toFixed(2)}%` :
      '+*.*%'
  );

  return (
    <div className={cn('space-y-6', className)}>
      {/* Ring VRM Control Panel */}
      {showRingVRM && (
        <RingVRMControl
          enabled={ringVRMEnabled}
          onToggle={setRingVRMEnabled}
        />
      )}

      {/* Market Overview with Ring VRM Status */}
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">
            {enhancedMarketData.symbol}
          </h2>
          <div className="flex items-center space-x-4">
            {ringVRMEnabled && (
              <span className="text-xs bg-blue-600/20 text-blue-400 px-2 py-1 rounded-full">
                Ring VRM Active
              </span>
            )}
            <button
              onClick={() => setShowPrices(!showPrices)}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              {showPrices ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="text-sm text-gray-400 mb-1">Price</div>
            <div className="text-3xl font-bold text-white flex items-center">
              <BlurredBalance
                value={obfuscatedPrice}
                blurLevel="high"
                revealOnHover={false}
                requiresAuth={!ringVRMEnabled}
              />
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-400 mb-1">24h Change</div>
            <div className={cn(
              'text-2xl font-semibold flex items-center',
              enhancedMarketData.change >= 0 ? 'text-green-400' : 'text-red-400'
            )}>
              {enhancedMarketData.change >= 0 ? (
                <ArrowTrendingUpIcon className="h-6 w-6 mr-1" />
              ) : (
                <ArrowTrendingDownIcon className="h-6 w-6 mr-1" />
              )}
              <BlurredBalance
                value={obfuscatedChange}
                blurLevel="medium"
                revealOnHover={false}
                requiresAuth={!ringVRMEnabled}
              />
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-400 mb-1">Liquidity</div>
            <div className={cn(
              'text-2xl font-semibold',
              getLiquidityColor(enhancedMarketData.liquidity)
            )}>
              {enhancedMarketData.liquidity.charAt(0).toUpperCase() +
               enhancedMarketData.liquidity.slice(1)}
            </div>
            {ringVRMEnabled && (
              <div className="text-xs text-gray-400 mt-1">
                Anonymity Set: Enhanced
              </div>
            )}
          </div>
        </div>

        {/* Spread Information */}
        <div className="mt-6 pt-4 border-t border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Spread</span>
            <RangeDisplay
              min={enhancedMarketData.spread.min.toString()}
              max={enhancedMarketData.spread.max.toString()}
              unit=""
              precision="low"
            />
          </div>
        </div>
      </div>

      {/* Order Form Toggle */}
      <div className="flex space-x-4 mb-4">
        <button
          onClick={() => setUseRingVRMForm(false)}
          className={`px-4 py-2 rounded-lg transition-colors ${
            !useRingVRMForm
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          Standard Order
        </button>
        <button
          onClick={() => setUseRingVRMForm(true)}
          disabled={!ringVRMEnabled}
          className={`px-4 py-2 rounded-lg transition-colors ${
            useRingVRMForm
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          } ${!ringVRMEnabled && 'opacity-50 cursor-not-allowed'}`}
        >
          Ring VRM Protected
        </button>
      </div>

      {/* Order Form */}
      {useRingVRMForm && ringVRMEnabled ? (
        <RingVRMOrderForm
          onSubmit={handleRingVRMOrder}
        />
      ) : (
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Order Type Selection */}
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setOrderType('market')}
                className={cn(
                  'p-4 rounded-lg border-2 transition-colors',
                  orderType === 'market'
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-gray-700 hover:border-gray-600'
                )}
              >
                <div className="text-white font-medium">Market</div>
                <div className="text-sm text-gray-400">Execute immediately</div>
              </button>

              <button
                type="button"
                onClick={() => setOrderType('limit')}
                className={cn(
                  'p-4 rounded-lg border-2 transition-colors',
                  orderType === 'limit'
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-gray-700 hover:border-gray-600'
                )}
              >
                <div className="text-white font-medium">Limit</div>
                <div className="text-sm text-gray-400">Set your price</div>
              </button>
            </div>

            {/* Side Selection */}
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setSide('buy')}
                className={cn(
                  'p-4 rounded-lg border-2 transition-colors',
                  side === 'buy'
                    ? 'border-green-500 bg-green-500/10'
                    : 'border-gray-700 hover:border-gray-600'
                )}
              >
                <div className="text-green-400 font-medium">Buy</div>
              </button>

              <button
                type="button"
                onClick={() => setSide('sell')}
                className={cn(
                  'p-4 rounded-lg border-2 transition-colors',
                  side === 'sell'
                    ? 'border-red-500 bg-red-500/10'
                    : 'border-gray-700 hover:border-gray-600'
                )}
              >
                <div className="text-red-400 font-medium">Sell</div>
              </button>
            </div>

            {/* Amount Input */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Amount
              </label>
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Price Input (for limit orders) */}
            {orderType === 'limit' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Price
                </label>
                <input
                  type="text"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            )}

            {/* Ring VRM Status */}
            {ringVRMEnabled && (
              <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-blue-400 font-medium">
                      Standard Order (Ring VRM Available)
                    </div>
                    <div className="text-xs text-gray-400">
                      Switch to Ring VRM Protected for enhanced privacy
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className={cn(
                'w-full py-3 rounded-lg font-medium transition-colors',
                side === 'buy'
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              )}
            >
              {side === 'buy' ? 'Place Buy Order' : 'Place Sell Order'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};