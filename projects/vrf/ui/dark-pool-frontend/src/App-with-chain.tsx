import React, { useState } from 'react';
import { DarkTradingViewWithBlocks, TradeList } from './components/trading/index';
import { WalletConnect, DarkIdentityInit } from './components/auth/index';
import { useBlockEngineWithChain } from './hooks/useBlockEngineWithChain';
import { cn } from './utils/cn';

// Mock market data - updated to current ETH price ~$4000
const mockMarketData = {
  symbol: 'ETH-USD',
  price: 4025.50,
  change: 65.30,
  changePercent: 1.65,
  liquidity: 'high' as const,
  spread: { min: 4024.50, max: 4026.50 }
};

function AppWithChain() {
  const {
    state,
    visualizations,
    getHistoricalEpochs,
    getDemoStats,
    getBlockchainStats,
    blockchainEnabled,
    toggleBlockchain,
    connectWallet,
    isConnected,
    walletAddress,
    isCorrectNetwork
  } = useBlockEngineWithChain({ blockchainEnabled: true });

  const [identity, setIdentity] = useState<{ anonymousId: string; publicKey: string } | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showBlockchainModal, setShowBlockchainModal] = useState(false);

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
              <h1 className="text-xl font-bold text-gray-100">Dark Pool Trading</h1>
              <span className="px-3 py-1 bg-blue-900/50 text-blue-400 text-xs font-medium rounded-full">
                Privacy-Preserving
              </span>
              {blockchainEnabled && (
                <span className="px-3 py-1 bg-green-900/50 text-green-400 text-xs font-medium rounded-full">
                  Blockchain Enabled
                </span>
              )}
            </div>

            {/* Right Side - Wallet, Identity and Status */}
            <div className="flex items-center space-x-6">
              {/* Blockchain Status */}
              <div className="flex items-center space-x-2">
                <div className={cn(
                  'w-2 h-2 rounded-full',
                  blockchainEnabled ? 'bg-green-400' : 'bg-gray-400'
                )} />
                <button
                  onClick={() => setShowBlockchainModal(true)}
                  className="text-sm text-gray-400 hover:text-gray-200 transition-colors"
                >
                  {blockchainEnabled ? 'Chain' : 'Local'}
                </button>
              </div>

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

              {/* Identity Status */}
              {identity ? (
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full" />
                  <span className="text-sm text-gray-400">
                    ID: {identity.anonymousId.slice(0, 8)}...
                  </span>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuth(true)}
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Create Identity
                </button>
              )}

              {/* Status Indicator */}
              <div className="flex items-center space-x-2">
                <div className={cn(
                  'w-2 h-2 rounded-full',
                  state.matchingProgress.phase === 'matching' ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'
                )} />
                <span className="text-sm text-gray-400">
                  {state.matchingProgress.phase === 'matching' ? 'Matching' : 'Active'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Two Column Layout */}
      <main className="px-4 sm:px-6 lg:px-8 py-6">
        {/* Identity Verification Modal */}
        {showAuth && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-xl p-6 max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-200">Identity Verification</h3>
                <button
                  onClick={() => setShowAuth(false)}
                  className="text-gray-400 hover:text-gray-200"
                >
                  ✕
                </button>
              </div>
              <DarkIdentityInit
                onIdentityCreated={(identity) => {
                  setIdentity(identity);
                  setShowAuth(false);
                }}
              />
            </div>
          </div>
        )}

        {/* Blockchain Settings Modal */}
        {showBlockchainModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-xl p-6 max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-200">Blockchain Settings</h3>
                <button
                  onClick={() => setShowBlockchainModal(false)}
                  className="text-gray-400 hover:text-gray-200"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={blockchainEnabled}
                      onChange={(e) => toggleBlockchain(e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-300">Enable Blockchain Integration</span>
                  </label>
                </div>

                {blockchainEnabled && (
                  <div className="text-xs text-gray-400 space-y-2">
                    <p>• Orders will be recorded on Hardhat local network</p>
                    <p>• Requires MetaMask connected to localhost:8545</p>
                    <p>• Chain ID: 31337 (Hardhat Network)</p>
                    {!isConnected && (
                      <div className="mt-3 p-2 bg-yellow-900/20 border border-yellow-500/30 rounded">
                        <p className="text-yellow-400">Please connect your wallet to use blockchain features</p>
                      </div>
                    )}
                    {isConnected && !isCorrectNetwork && (
                      <div className="mt-3 p-2 bg-yellow-900/20 border border-yellow-500/30 rounded">
                        <p className="text-yellow-400">Please switch to Hardhat network (Chain ID: 31337)</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowBlockchainModal(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Two Column Layout */}
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

            {/* Blockchain Stats */}
            {blockchainEnabled && (
              <div className="bg-gray-900 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-200 mb-4">Blockchain Status</h3>
                <BlockchainStats />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-gray-800">
        <div className="max-w-full px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div>Dark Pool Trading with Privacy Protection</div>
            <div>
              {blockchainEnabled ? 'Orders recorded on Hardhat blockchain' : 'Orders matched locally'}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Blockchain stats component
function BlockchainStats() {
  const { getBlockchainStats, isConnected, isCorrectNetwork } = useBlockEngineWithChain();
  const [stats, setStats] = useState({
    orderCount: 0,
    isConnected: false,
    isCorrectNetwork: false
  });

  React.useEffect(() => {
    const loadStats = async () => {
      try {
        const blockchainStats = await getBlockchainStats();
        setStats(blockchainStats);
      } catch (error) {
        console.error('Failed to load blockchain stats:', error);
      }
    };

    loadStats();
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, [getBlockchainStats]);

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-gray-800 rounded-lg p-3 text-center">
        <div className="text-lg font-bold text-blue-400">
          {stats.orderCount}
        </div>
        <div className="text-xs text-gray-400">Chain Orders</div>
      </div>
      <div className="bg-gray-800 rounded-lg p-3 text-center">
        <div className={cn(
          'text-lg font-bold',
          stats.isConnected && stats.isCorrectNetwork ? 'text-green-400' : 'text-yellow-400'
        )}>
          {stats.isConnected && stats.isCorrectNetwork ? 'Connected' : 'Disconnected'}
        </div>
        <div className="text-xs text-gray-400">Network Status</div>
      </div>
    </div>
  );
}

export default AppWithChain;