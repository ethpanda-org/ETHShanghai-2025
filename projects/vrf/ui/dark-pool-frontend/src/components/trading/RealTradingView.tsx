import React, { useState } from 'react';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { WalletConnect } from '../auth/WalletConnect';
import { useWallet } from '../../hooks/useWallet';
import { darkPoolService } from '../../services/darkPoolContract';
import { BlurredBalance, RangeDisplay } from '../privacy/index';
import { cn } from '../../utils/cn';

interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  liquidity: 'low' | 'medium' | 'high';
  spread: { min: number; max: number };
}

interface RealTradingViewProps {
  marketData: MarketData;
  className?: string;
  onWalletConnect?: (address: string) => void;
}

export const RealTradingView: React.FC<RealTradingViewProps> = ({
  marketData,
  className = '',
  onWalletConnect
}) => {
  const { wallet } = useWallet();
  const [showPrices, setShowPrices] = useState(false);
  const [orderType, setOrderType] = useState<'limit' | 'market'>('limit');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setTxHash(null);

    if (!wallet) {
      setError('Please connect your wallet first');
      return;
    }

    if (!amount) {
      setError('Please enter an amount');
      return;
    }

    if (orderType === 'limit' && !price) {
      setError('Please enter a price for limit order');
      return;
    }

    setIsSubmitting(true);

    try {
      // Initialize contract service
      await darkPoolService.initialize();

      // Place order on blockchain
      const receipt = await darkPoolService.placeOrder(
        side === 'buy',
        amount,
        orderType === 'limit' ? price : marketData.price.toString()
      );

      setTxHash(receipt.hash);

      // Clear form on success
      setAmount('');
      setPrice('');

      alert('Order placed successfully! Transaction hash: ' + receipt.hash);
    } catch (err: any) {
      console.error('Error placing order:', err);
      setError(err.message || 'Failed to place order');
    } finally {
      setIsSubmitting(false);
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
    <div className={cn('bg-gray-900 rounded-xl p-6 space-y-6', className)}>
      {/* Wallet Connection */}
      <div className="flex justify-between items-start">
        <h2 className="text-xl font-semibold text-white">Real Trading</h2>
        <WalletConnect onConnect={onWalletConnect} />
      </div>

      {/* Network Status */}
      {wallet && (
        <div className={cn(
          'p-3 rounded-lg border',
          wallet.chainId === 31337
            ? 'bg-green-900/20 border-green-500/30'
            : 'bg-yellow-900/20 border-yellow-500/30'
        )}>
          <p className="text-sm">
            Network: {wallet.chainId === 31337 ? '✅ Localhost 8545' : '⚠️ Wrong Network'}
          </p>
        </div>
      )}

      {/* Market Overview */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-medium text-gray-100 mb-3">{marketData.symbol}</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-400">Price</p>
            <p className="text-lg font-semibold text-white">
              {showPrices ? `$${marketData.price.toFixed(2)}` : '****'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-400">24h Change</p>
            <p className={cn('text-lg font-semibold', marketData.change >= 0 ? 'text-green-400' : 'text-red-400')}>
              {showPrices ? (
                `${marketData.change >= 0 ? '+' : ''}${marketData.changePercent.toFixed(2)}%`
              ) : (
                '+*.*%'
              )}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowPrices(!showPrices)}
          className="mt-3 flex items-center text-sm text-gray-400 hover:text-gray-200"
        >
          {showPrices ? <EyeSlashIcon className="h-4 w-4 mr-1" /> : <EyeIcon className="h-4 w-4 mr-1" />}
          {showPrices ? 'Hide' : 'Show'} Prices
        </button>
      </div>

      {/* Order Form */}
      {wallet ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Order Type */}
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => setOrderType('limit')}
              className={cn(
                'px-4 py-2 rounded-lg font-medium transition-colors',
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
                'px-4 py-2 rounded-lg font-medium transition-colors',
                orderType === 'market'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              )}
            >
              Market
            </button>
          </div>

          {/* Buy/Sell Toggle */}
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => setSide('buy')}
              className={cn(
                'flex-1 py-3 rounded-lg font-medium transition-colors',
                side === 'buy'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              )}
            >
              <ArrowTrendingUpIcon className="h-5 w-5 inline mr-2" />
              Buy
            </button>
            <button
              type="button"
              onClick={() => setSide('sell')}
              className={cn(
                'flex-1 py-3 rounded-lg font-medium transition-colors',
                side === 'sell'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              )}
            >
              <ArrowTrendingDownIcon className="h-5 w-5 inline mr-2" />
              Sell
            </button>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Amount (ETH)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              step="0.001"
              min="0"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Price Input (for limit orders) */}
          {orderType === 'limit' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Price (USD)
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required={orderType === 'limit'}
              />
            </div>
          )}

          {/* Liquidity Indicator */}
          <div className={cn(
            'p-3 rounded-lg border',
            getLiquidityBackground(marketData.liquidity)
          )}>
            <p className="text-sm text-gray-300">Liquidity</p>
            <p className={cn('font-medium', getLiquidityColor(marketData.liquidity))}>
              {marketData.liquidity.charAt(0).toUpperCase() + marketData.liquidity.slice(1)}
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !wallet || wallet.chainId !== 31337}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Placing Order...' : 'Place Order'}
          </button>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Transaction Hash */}
          {txHash && (
            <div className="p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
              <p className="text-green-400 text-sm">
                Transaction: {txHash.slice(0, 10)}...{txHash.slice(-8)}
              </p>
            </div>
          )}
        </form>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-400 mb-4">Connect your wallet to start trading</p>
        </div>
      )}
    </div>
  );
};