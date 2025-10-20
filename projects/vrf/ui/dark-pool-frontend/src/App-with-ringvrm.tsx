import React, { useState } from 'react';
import {
  WalletConnect,
  DarkIdentityInit
} from './components/auth/index.js';
import {
  BlurredBalance,
  PrivatePortfolio
} from './components/privacy/index.js';
import {
  DarkTradingViewWithRingVRM,
  PrivateOrderBlotter
} from './components/trading/index.js';
import { HardwareConfirmation } from './components/hardware/index.js';
import { ComplianceDashboard } from './components/compliance/index.js';
import { RingVRMDashboard } from './components/ringvrm/index.js';
import { RingVRMControl } from './components/ringvrm/RingVRMControl.js';
import { ObfuscationUtils } from './utils/index.js';

// Mock data
const mockPositions = [
  {
    id: '0x1234567890abcdef',
    symbol: 'ETH',
    size: 2.5,
    value: 5000,
    pnl: 150,
    pnlPercentage: 3.1
  },
  {
    id: '0xabcdef1234567890',
    symbol: 'BTC',
    size: 0.1,
    value: 4000,
    pnl: -50,
    pnlPercentage: -1.2
  }
];

const mockMarketData = {
  symbol: 'ETH-USD',
  price: 2000,
  change: 50,
  changePercent: 2.5,
  liquidity: 'high' as const,
  spread: { min: 1998, max: 2002 }
};

const mockOrders = [
  {
    id: 'order-1',
    symbol: 'ETH-USD',
    side: 'buy' as const,
    amount: 1.5,
    price: 1995,
    status: 'pending' as const,
    timestamp: Date.now() - 300000,
    ringVRMProtected: true
  },
  {
    id: 'order-2',
    symbol: 'BTC-USD',
    side: 'sell' as const,
    amount: 0.05,
    price: 40100,
    status: 'executed' as const,
    timestamp: Date.now() - 600000,
    ringVRMProtected: false
  }
];

function AppWithRingVRM() {
  const [currentView, setCurrentView] = useState<'trading' | 'portfolio' | 'compliance' | 'ringvrm'>('trading');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [anonymousId, setAnonymousId] = useState<string | null>(null);
  const [showRingVRMControl, setShowRingVRMControl] = useState(true);
  const [ringVRMEnabled, setRingVRMEnabled] = useState(true);

  const handleAuth = (id: string) => {
    setAnonymousId(id);
    setIsAuthenticated(true);
  };

  const handlePlaceOrder = (order: any) => {
    console.log('Order placed:', order);
    // In production, this would submit to the backend
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <DarkIdentityInit onAuth={handleAuth} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-bold text-blue-500">
                Dark Pool with Ring VRM
              </h1>
              <nav className="flex space-x-6">
                <button
                  onClick={() => setCurrentView('trading')}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    currentView === 'trading'
                      ? 'text-blue-400 border-b-2 border-blue-400'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Trading
                </button>
                <button
                  onClick={() => setCurrentView('portfolio')}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    currentView === 'portfolio'
                      ? 'text-blue-400 border-b-2 border-blue-400'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Portfolio
                </button>
                <button
                  onClick={() => setCurrentView('compliance')}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    currentView === 'compliance'
                      ? 'text-blue-400 border-b-2 border-blue-400'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Compliance
                </button>
                <button
                  onClick={() => setCurrentView('ringvrm')}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    currentView === 'ringvrm'
                      ? 'text-blue-400 border-b-2 border-blue-400'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Ring VRM
                </button>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-400">
                ID: {anonymousId?.slice(0, 8)}...
              </span>
              <WalletConnect />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Ring VRM Control */}
        {showRingVRMControl && currentView !== 'ringvrm' && (
          <div className="mb-8">
            <RingVRMControl
              enabled={ringVRMEnabled}
              onToggle={setRingVRMEnabled}
            />
          </div>
        )}

        {/* View Content */}
        {currentView === 'trading' && (
          <div className="space-y-8">
            <DarkTradingViewWithRingVRM
              marketData={mockMarketData}
              onPlaceOrder={handlePlaceOrder}
            />
            <PrivateOrderBlotter orders={mockOrders} />
          </div>
        )}

        {currentView === 'portfolio' && (
          <PrivatePortfolio
            positions={mockPositions}
            totalValue={9000}
            totalPnl={100}
            showRingVRMStatus={ringVRMEnabled}
          />
        )}

        {currentView === 'compliance' && (
          <ComplianceDashboard
            anonymousId={anonymousId!}
            period={{ start: '2024-01-01', end: '2024-12-31' }}
          />
        )}

        {currentView === 'ringvrm' && (
          <RingVRMDashboard />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-3">
                Privacy Features
              </h3>
              <ul className="space-y-2 text-sm text-gray-500">
                <li>• Ring Signatures</li>
                <li>• Transaction Mixing</li>
                <li>• Delayed Execution</li>
                <li>• Hardware Security</li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-3">
                Ring VRM Status
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Protection:</span>
                  <span className={ringVRMEnabled ? 'text-green-400' : 'text-red-400'}>
                    {ringVRMEnabled ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Anonymity:</span>
                  <span className="text-blue-400">Enhanced</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-3">
                About
              </h3>
              <p className="text-sm text-gray-500">
                This dark pool trading system incorporates Ring VRM (Virtual Ring Mixer)
                technology to provide maximum privacy and resist blockchain analysis.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default AppWithRingVRM;