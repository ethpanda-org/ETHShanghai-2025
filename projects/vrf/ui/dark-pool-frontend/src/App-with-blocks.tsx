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

function AppWithBlocks() {
  const [blockchainEnabled, setBlockchainEnabled] = useState(false);
  const { state, visualizations, getHistoricalEpochs, getDemoStats, connectWallet, isConnected, walletAddress, isCorrectNetwork } = useBlockEngineWithChain({ blockchainEnabled });
  const [identity, setIdentity] = useState<{ anonymousId: string; publicKey: string } | null>(null);
  const [showAuth, setShowAuth] = useState(false);

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
            </div>

            {/* Right Side - Wallet, Identity and Status */}
            <div className="flex items-center space-x-6">
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

              {/* Wallet Connect */}
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
                  onClick={connectWallet}
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Connect Wallet
                </button>
              )}

              {/* Blockchain Mode Toggle */}
              <button
                onClick={async () => {
                  // If enabling blockchain mode, check wallet connection directly
                  if (!blockchainEnabled) {
                    try {
                      const accounts = await window.ethereum?.request({
                        method: 'eth_accounts'
                      });

                      if (!accounts || accounts.length === 0) {
                        alert('Please connect your wallet first before enabling blockchain mode');
                        return;
                      }

                      const chainId = await window.ethereum?.request({
                        method: 'eth_chainId'
                      });

                      if (chainId !== '0x7a69') {
                        alert('Please connect to Hardhat network first');
                        return;
                      }

                      console.log('✅ Wallet verified, enabling blockchain mode');
                    } catch (error) {
                      console.error('Failed to check wallet:', error);
                      alert('Failed to check wallet connection');
                      return;
                    }
                  }

                  console.log('Toggling blockchain mode to:', !blockchainEnabled);
                  setBlockchainEnabled(!blockchainEnabled);
                }}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded-full transition-colors',
                  blockchainEnabled
                    ? 'bg-green-900/50 text-green-400 hover:bg-green-800'
                    : 'bg-blue-900/50 text-blue-400 hover:bg-blue-800'
                )}
              >
                {blockchainEnabled ? '⛓️ Chain' : '🌐 Local'}
              </button>

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

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Left Column - Trading */}
          <div className="space-y-6">
            <div className="bg-gray-900 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-gray-200 mb-4">Place Order</h2>
              <DarkTradingViewWithBlocks marketData={mockMarketData} identity={identity} blockchainEnabled={blockchainEnabled} />
            </div>
          </div>

          {/* Right Column - Trade List */}
          <div className="space-y-6">
            <div className="bg-gray-900 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-gray-200 mb-4">Trading Activity</h2>
              <TradeList visualizations={visualizations} />
            </div>

            {/* Mode Status Panel */}
            <div className="bg-gray-900 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-200 mb-4">Mode Status</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Current Mode:</span>
                  <span className={blockchainEnabled ? 'text-green-400' : 'text-blue-400'}>
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
                  <span className="text-gray-400">Address:</span>
                  <span className="text-xs text-blue-400">
                    {walletAddress ? `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}` : 'None'}
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

              {/* Debug Info */}
              <div className="mt-4 pt-4 border-t border-gray-700">
                <div className="text-xs text-gray-400 space-y-1">
                  <p><strong>Debug Info:</strong></p>
                  <p>• blockchainEnabled: {blockchainEnabled.toString()}</p>
                  <p>• isConnected: {isConnected.toString()}</p>
                  <p>• isCorrectNetwork: {isCorrectNetwork.toString()}</p>
                  <p>• walletAddress: {walletAddress || 'null'}</p>
                </div>
              </div>

              {blockchainEnabled && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <div className="text-xs text-gray-400 space-y-1">
                    <p>• Orders will be recorded on Hardhat blockchain</p>
                    <p>• Transaction confirmation required</p>
                    <p>• Real gas costs (test ETH)</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-gray-800">
        <div className="max-w-full px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div>Dark Pool Trading with Privacy Protection</div>
            <div>Orders are matched using random priorities</div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default AppWithBlocks;