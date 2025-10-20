import React, { useState, useEffect } from 'react';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, CubeIcon } from '@heroicons/react/24/outline';
import { RangeDisplay } from '../privacy/index';
import { ObfuscationUtils, RangeUtils } from '../../utils/index';
import { cn } from '../../utils/cn';
import { useBlockEngineWithChain, useEpochProgressWithChain } from '../../hooks/useBlockEngineWithChain';
import { useDemoControls } from '../../hooks/useDemoControls';
import { BlockChainVisualization } from './BlockVisualization';
import { DemoControlPanel } from './DemoControlPanel';
import { web3Service } from '../../services/web3';
import type { Order } from '../../types/block';

interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  liquidity: 'low' | 'medium' | 'high';
  spread: { min: number; max: number };
}

interface DarkTradingViewWithBlocksProps {
  marketData: MarketData;
  className?: string;
  identity?: { anonymousId: string; publicKey: string } | null;
  blockchainEnabled?: boolean;
}

export const DarkTradingViewWithBlocks: React.FC<DarkTradingViewWithBlocksProps> = ({
  marketData,
  className = '',
  identity,
  blockchainEnabled = false
}) => {
  const [orderType, setOrderType] = useState<'limit' | 'market'>('limit');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);

  const { state, visualizations, addOrder, isConnected, isCorrectNetwork, walletAddress } = useBlockEngineWithChain({
    demoMode: 'dynamic', // Changed to dynamic to create epochs even without orders
    speed: 'fast',
    blockchainEnabled
  });

  // Debug logging for connection status
  useEffect(() => {
    console.log('DarkTradingViewWithBlocks - Connection status:', {
      blockchainEnabled,
      isConnected,
      isCorrectNetwork,
      buttonDisabled: !amount || (orderType === 'limit' && !price) || (blockchainEnabled && (!isConnected || !isCorrectNetwork))
    });
  }, [blockchainEnabled, isConnected, isCorrectNetwork, amount, price, orderType]);
  const { isRunning, speed, handleSpeedChange, handleStartStop } = useDemoControls('fast');
  const epochProgress = useEpochProgressWithChain();

  // Update recent orders when state changes
  useEffect(() => {
    const orders = Array.from(state.orders.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5);
    setRecentOrders(orders);
  }, [state.orders]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('=== handleSubmit called ===');
    console.log('amount:', amount);
    console.log('blockchainEnabled:', blockchainEnabled);
    console.log('orderType:', orderType);
    console.log('side:', side);

    if (!amount) {
      console.log('Early return: no amount');
      return;
    }

    // Check if blockchain is enabled and wallet is connected
    if (blockchainEnabled) {
      console.log('Blockchain mode enabled, checking wallet...');

      // Direct check using MetaMask API
      const accounts = await window.ethereum?.request({
        method: 'eth_accounts'
      });

      console.log('Accounts from MetaMask:', accounts);

      if (!accounts || accounts.length === 0) {
        console.log('Blockchain mode enabled but wallet not connected');
        alert('Please connect your wallet to Hardhat network before placing orders');
        return;
      }

      // Check network
      const chainId = await window.ethereum?.request({
        method: 'eth_chainId'
      });

      console.log('Chain ID from MetaMask:', chainId);

      if (chainId !== '0x7a69') { // 31337 in hex
        console.log('Blockchain mode enabled but wrong network, current chainId:', chainId);
        alert('Please connect to Hardhat network (Chain ID: 31337)');
        return;
      }

      console.log('✅ Wallet connection verified:', {
        accounts,
        chainId
      });
    } else {
      console.log('Local mode - skipping blockchain checks');
    }

    // Check if identity is verified (temporarily disabled for testing)
    if (!identity) {
      // Create a test identity for demo purposes
      console.log('Creating test identity for demo...');
    }

    const orderData = {
      symbol: marketData.symbol,
      side,
      amount: parseFloat(amount),
      price: orderType === 'limit' && price ? parseFloat(price) : undefined,
      priceRange: orderType === 'limit' && price ? {
        min: parseFloat(price) * 0.99,
        max: parseFloat(price) * 1.01
      } : undefined,
      anonymousId: identity?.anonymousId || 'test_anonymous_id_demo' // Use test ID if no identity
    };

    console.log('About to call addOrder with data:', orderData);
    console.log('Blockchain enabled for this order:', blockchainEnabled);

    try {
      const order = await addOrder(orderData);
      console.log('✅ Order added successfully:', order);

      if (blockchainEnabled) {
        console.log('Order submitted to blockchain');

        // Verify on-chain success
        try {
          // Get transaction hash from the order
          if (order.id && order.id.startsWith('0x')) {
            alert(`✅ Order successfully submitted to blockchain!\n\nTransaction Hash: ${order.id}\n\nYou can verify this transaction in MetaMask or on Hardhat network explorer.`);
          } else {
            alert(`✅ Order successfully placed on blockchain!\n\nOrder ID: ${order.id}\n\nCheck the console for transaction details.`);
          }

          // Optional: Check if order appears in blockchain after a delay
          setTimeout(async () => {
            try {
              const blockchainOrders = await web3Service.getAllOrders();
              console.log('Current blockchain orders:', blockchainOrders);

              const foundOrder = blockchainOrders.find(bo => bo.id === order.id || bo.trader === walletAddress);
              if (foundOrder) {
                console.log('✅ Order verified on blockchain:', foundOrder);
                alert('✅ Order confirmed on blockchain! You can see it in the Recent Orders section.');
              }
            } catch (error) {
              console.error('Failed to verify order on blockchain:', error);
            }
          }, 3000);

        } catch (verifyError) {
          console.error('Blockchain verification failed:', verifyError);
          alert(`Order submitted but verification failed: ${verifyError instanceof Error ? verifyError.message : 'Unknown error'}`);
        }
      } else {
        console.log('Order added to local block:', order);
        alert(`✅ Order placed successfully in local mode!\n\nOrder ID: ${order.id}`);
      }

      // Clear form
      setAmount('');
      setPrice('');
    } catch (error) {
      console.error('Failed to add order:', error);
      alert(`Failed to place order: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-400';
      case 'in-block': return 'text-blue-400';
      case 'matching': return 'text-purple-400';
      case 'executed': return 'text-green-400';
      case 'expired': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Epoch Progress Indicator */}
      <div className="bg-gray-900 rounded-xl p-4">
        <div className="flex items-center space-x-2 mb-3">
          <CubeIcon className="h-5 w-5 text-blue-400" />
          <span className="text-sm font-medium text-gray-300">Current Epoch Progress</span>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
              <span>Block {epochProgress.currentBlock} / {epochProgress.totalBlocks}</span>
              <span>{epochProgress.phase}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className={cn(
                  'h-2 rounded-full transition-all duration-500',
                  epochProgress.phase === 'matching' ? 'bg-purple-400' : 'bg-blue-400'
                )}
                style={{ width: `${epochProgress.epochProgress}%` }}
              />
            </div>
          </div>

          {epochProgress.phase === 'matching' && (
            <div className="flex items-center space-x-2 text-xs text-purple-400">
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
              <span>Matching...</span>
            </div>
          )}
        </div>
      </div>

      {/* Market Overview */}
      <div className="bg-gray-900 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-100">{marketData.symbol}</h2>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Price</div>
            <div className="text-2xl font-bold text-gray-100">
              ${marketData.price.toFixed(2)}
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
              <span className={marketData.change >= 0 ? 'text-green-400' : 'text-red-400'}>
                {marketData.change >= 0 ? '+' : ''}{marketData.changePercent.toFixed(2)}%
              </span>
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
              <RangeDisplay
                value={marketData.spread.min}
                variance={((marketData.spread.max - marketData.spread.min) / marketData.spread.min) * 100}
                precision={2}
                unit=" USD"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Order Form */}
      <div className="bg-gray-900 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-200">Place Order</h3>
          {identity ? (
            <div className="flex items-center space-x-2 text-xs text-green-400">
              <div className="w-2 h-2 bg-green-400 rounded-full" />
              <span>Verified Identity</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-xs text-blue-400">
              <div className="w-2 h-2 bg-blue-400 rounded-full" />
              <span>Test Mode (No Identity Required)</span>
            </div>
          )}
        </div>
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
              Amount (ETH)
            </label>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0000"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          {orderType === 'limit' && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Price (USD)
              </label>
              <input
                type="text"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono"
              />
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
            {`Place ${side === 'buy' ? 'Buy' : 'Sell'} Order${blockchainEnabled ? ' (Chain)' : ''}`}

          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-gray-800">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              {blockchainEnabled
                ? 'Orders are recorded on Hardhat blockchain'
                : 'Orders are added to current block'
              }
            </span>
            <span>Random priority matching</span>
          </div>
          {blockchainEnabled && (
            <div className="mt-2 text-xs text-blue-400">
              {isConnected && isCorrectNetwork
                ? '✓ Connected to Hardhat network'
                : '⚠ Please connect wallet to Hardhat network (localhost:8545)'
              }
            </div>
          )}
        </div>
      </div>

      {/* Recent Orders */}
      {recentOrders.length > 0 && (
        <div className="bg-gray-900 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-200 mb-4">Recent Orders</h3>
          <div className="space-y-3">
            {recentOrders.map(order => (
              <div key={order.id} className="bg-gray-800 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className={cn(
                      'px-2 py-1 text-xs font-medium rounded',
                      order.side === 'buy'
                        ? 'bg-green-900/50 text-green-400'
                        : 'bg-red-900/50 text-red-400'
                    )}>
                      {order.side.toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-400">
                      {ObfuscationUtils.blurValue(order.amount.toFixed(4), 'low')}
                    </span>
                  </div>
                  <span className={cn('text-xs font-medium', getStatusColor(order.status))}>
                    {order.status.replace('-', ' ')}
                  </span>
                </div>
                {order.blockId && (
                  <div className="text-xs text-gray-500">
                    Block: {ObfuscationUtils.shortenId(order.blockId)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Blockchain Matching Controls */}
      {blockchainEnabled && (
        <div className="bg-gray-900 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-200 mb-4">Order Matching</h3>
          <div className="space-y-4">
            <button
              onClick={async () => {
                try {
                  console.log('🔄 Manually triggering order matching...');
                  const matchResult = await web3Service.matchOrders();
                  console.log('✅ Orders matched manually:', matchResult);
                  alert(`✅ Orders matched successfully!\n\nBuy Order: ${matchResult.buyOrderId.slice(0, 10)}...\nSell Order: ${matchResult.sellOrderId.slice(0, 10)}...\nAmount: ${matchResult.amount} ETH\nPrice: $${matchResult.price}`);
                } catch (error) {
                  console.error('Failed to match orders:', error);
                  alert(`Failed to match orders: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
              }}
              className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white font-medium rounded-lg transition-colors"
            >
              🔄 Match Orders Now
            </button>
            <div className="text-xs text-gray-400">
              <p>• Manually trigger order matching on blockchain</p>
              <p>• Matching will also be attempted automatically after placing orders</p>
              <p>• Both buy and sell orders must be available at compatible prices</p>
            </div>
          </div>
        </div>
      )}

      {/* Demo Control Panel */}
      <DemoControlPanel
        isRunning={isRunning}
        onSpeedChange={handleSpeedChange}
        currentSpeed={speed}
      />

    </div>
  );
};

export default DarkTradingViewWithBlocks;