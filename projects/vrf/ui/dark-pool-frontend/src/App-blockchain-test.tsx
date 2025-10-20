import React, { useState } from 'react';
import { DarkTradingViewWithBlocks, TradeList } from './components/trading/index';
import { useBlockEngineWithChain } from './hooks/useBlockEngineWithChain';

// Mock market data
const mockMarketData = {
  symbol: 'ETH-USD',
  price: 4025.50,
  change: 65.30,
  changePercent: 1.65,
  liquidity: 'high' as const,
  spread: { min: 4024.50, max: 4026.50 }
};

function AppBlockchainTest() {
  const {
    state,
    visualizations,
    blockchainEnabled,
    toggleBlockchain,
    connectWallet,
    isConnected,
    walletAddress,
    isCorrectNetwork
  } = useBlockEngineWithChain({ blockchainEnabled: true });

  const [identity, setIdentity] = useState<{ anonymousId: string; publicKey: string } | null>(null);

  const handleConnectWallet = async () => {
    try {
      await connectWallet();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      alert('Failed to connect wallet. Please make sure MetaMask is installed and connected to Hardhat network.');
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#030712', color: '#f3f4f6' }}>
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-gray-100">Dark Pool - Blockchain Test</h1>
              <span className="px-3 py-1 bg-green-900/50 text-green-400 text-xs font-medium rounded-full">
                {blockchainEnabled ? 'Blockchain Mode' : 'Local Mode'}
              </span>
            </div>

            {/* Right Side - Controls */}
            <div className="flex items-center space-x-6">
              {/* Blockchain Toggle */}
              <button
                onClick={() => toggleBlockchain(!blockchainEnabled)}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded-full transition-colors',
                  blockchainEnabled
                    ? 'bg-green-900/50 text-green-400'
                    : 'bg-gray-900/50 text-gray-400'
                )}
              >
                {blockchainEnabled ? 'Chain' : 'Local'}
              </button>

              {/* Wallet Connection */}
              {isConnected ? (
                <div className="flex items-center space-x-2">
                  <div className={cn(
                    'w-2 h-2 rounded-full',
                    isCorrectNetwork ? 'bg-green-400' : 'bg-yellow-400'
                  )} />
                  <span className="text-sm text-gray-400">
                    {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
                  </span>
                  {!isCorrectNetwork && (
                    <span className="text-xs text-yellow-400">
                      Wrong Network
                    </span>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleConnectWallet}
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Connect Wallet
                </button>
              )}

              {/* Status */}
              <div className={cn(
                'w-2 h-2 rounded-full',
                state.matchingProgress.phase === 'matching' ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'
              )} />
            </div>
          </div>
        </div>
      </header>

      {/* Instructions */}
      <div className="bg-yellow-900/20 border-b border-yellow-500/30">
        <div className="max-w-full px-4 sm:px-6 lg:px-8 py-3">
          <div className="text-sm text-yellow-400">
            <strong>测试说明:</strong>
            {blockchainEnabled
              ? ' 区块链模式 - 订单将记录到Hardhat链上。请先连接MetaMask到localhost:8545。'
              : ' 本地模式 - 订单仅存储在浏览器内存中。'
            }
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Left Column - Trading */}
          <div className="space-y-6">
            <div className="bg-gray-900 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-gray-200 mb-4">Place Order</h2>
              <DarkTradingViewWithBlocks
                marketData={mockMarketData}
                identity={identity}
                blockchainEnabled={blockchainEnabled}
              />
            </div>
          </div>

          {/* Right Column - Trade List */}
          <div className="space-y-6">
            <div className="bg-gray-900 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-gray-200 mb-4">Trading Activity</h2>
              <TradeList visualizations={visualizations} />
            </div>

            {/* Status Panel */}
            <div className="bg-gray-900 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-200 mb-4">System Status</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Mode:</span>
                  <span className={blockchainEnabled ? 'text-green-400' : 'text-gray-400'}>
                    {blockchainEnabled ? 'Blockchain' : 'Local'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Wallet:</span>
                  <span className={isConnected ? 'text-green-400' : 'text-red-400'}>
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Network:</span>
                  <span className={isCorrectNetwork ? 'text-green-400' : 'text-yellow-400'}>
                    {isCorrectNetwork ? 'Hardhat' : 'Incorrect'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Total Orders:</span>
                  <span className="text-blue-400">{state.orders.size}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Total Epochs:</span>
                  <span className="text-blue-400">{state.epochs.size}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Utility function for className
function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export default AppBlockchainTest;