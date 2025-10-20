import React, { useState } from 'react';
import { DarkTradingViewWithBlocks, TradeList } from './components/trading/index';
import { WalletConnect, DarkIdentityInit } from './components/auth/index';
import { useBlockEngineWithDemo } from './hooks/useBlockEngineWithDemo';
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
  const { state, visualizations, getHistoricalEpochs, getDemoStats } = useBlockEngineWithDemo();
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
              <WalletConnect />

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
              <DarkTradingViewWithBlocks marketData={mockMarketData} identity={identity} />
            </div>
          </div>

          {/* Right Column - Trade List */}
          <div className="space-y-6">
            <div className="bg-gray-900 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-gray-200 mb-4">Trading Activity</h2>
              <TradeList visualizations={visualizations} />
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