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
  DarkTradingView,
  PrivateOrderBlotter
} from './components/trading/index.js';
import { HardwareConfirmation } from './components/hardware/index.js';
import { ComplianceDashboard } from './components/compliance/index.js';
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
    size: 0.15,
    value: 6500,
    pnl: -200,
    pnlPercentage: -2.98
  }
];

const mockOrders = [
  {
    id: 'order-1',
    symbol: 'ETH-USD',
    side: 'buy' as const,
    amount: 1.5,
    price: 2000,
    status: 'matching' as const,
    createdAt: new Date(Date.now() - 5 * 60 * 1000)
  },
  {
    id: 'order-2',
    symbol: 'BTC-USD',
    side: 'sell' as const,
    amount: 0.05,
    price: 43000,
    status: 'executed' as const,
    createdAt: new Date(Date.now() - 15 * 60 * 1000),
    executedAt: new Date(Date.now() - 10 * 60 * 1000),
    executedPrice: 43050
  }
];

const mockMarketData = {
  symbol: 'ETH-USD',
  price: 2000.50,
  change: 15.25,
  changePercent: 0.77,
  liquidity: 'high' as const,
  spread: { min: 1999.50, max: 2001.50 }
};

function App() {
  console.log('App component is rendering...');
  const [currentView, setCurrentView] = useState<'portfolio' | 'trading' | 'orders' | 'compliance'>('portfolio');
  const [identity, setIdentity] = useState<{ anonymousId: string; publicKey: string } | null>(null);
  const [showHardwareConfirm, setShowHardwareConfirm] = useState(false);

  const handlePlaceOrder = (order: any) => {
    console.log('Placing order:', order);
    setShowHardwareConfirm(true);
  };

  const handleHardwareConfirm = (approved: boolean) => {
    console.log('Hardware confirmation:', approved);
    setShowHardwareConfirm(false);
  };

  const navigation = [
    { id: 'portfolio', label: 'Portfolio', icon: '💼' },
    { id: 'trading', label: 'Trading', icon: '📊' },
    { id: 'orders', label: 'Orders', icon: '📋' },
    { id: 'compliance', label: 'Compliance', icon: '🛡️' }
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#030712', color: '#f3f4f6' }}>
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-gray-100">Dark Pool</h1>
              <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">Private Trading</span>
            </div>
            <div className="flex items-center space-x-4">
              <WalletConnect onConnect={(address) => console.log('Connected:', address)} />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <nav className="space-y-2">
              {navigation.map(item => (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id as any)}
                  className={`
                    w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors
                    ${currentView === item.id
                      ? 'bg-blue-900/50 text-blue-300 border border-blue-500/30'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
                    }
                  `}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
            </nav>

            {/* Identity Status */}
            <div className="mt-6">
              <DarkIdentityInit onIdentityCreated={setIdentity} />
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Portfolio View */}
            {currentView === 'portfolio' && (
              <PrivatePortfolio
                positions={mockPositions}
                totalValue={11500}
              />
            )}

            {/* Trading View */}
            {currentView === 'trading' && (
              <DarkTradingView
                marketData={mockMarketData}
                onPlaceOrder={handlePlaceOrder}
              />
            )}

            {/* Orders View */}
            {currentView === 'orders' && (
              <PrivateOrderBlotter orders={mockOrders} />
            )}

            {/* Compliance View */}
            {currentView === 'compliance' && (
              <ComplianceDashboard />
            )}
          </div>
        </div>
      </div>

      {/* Hardware Confirmation Modal */}
      {showHardwareConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="max-w-md w-full mx-4">
            <HardwareConfirmation
              transaction={{
                action: 'Dark Pool Trade',
                amount: 'Order amount will be shown here', // Dynamic based on actual order
                recipient: 'Dark Pool Contract',
                asset: 'ETH'
              }}
              onConfirm={handleHardwareConfirm}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
