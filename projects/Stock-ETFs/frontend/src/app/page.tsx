'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import { ETFOverview } from '@/components/ETFOverview';
import { MyHoldings } from '@/components/MyHoldings';
import { TradePanel } from '@/components/TradePanel';
import { useBlockETFData, useUserBalance } from '@/hooks/useBlockETF';

export default function Home() {
  const { address, isConnected } = useAccount();
  const { assets, totalValue, shareValue, isPaused } = useBlockETFData();
  const { balance, isLoading: balanceLoading } = useUserBalance(address);

  const handleInvest = async (shares: bigint, maxUSDT: bigint) => {
    console.log('Invest:', { shares, maxUSDT });
    // TODO: Implement invest transaction
    // 1. Approve USDT to Router
    // 2. Call router.mintExactShares(shares, maxUSDT, deadline)
  };

  const handleRedeem = async (shares: bigint, minUSDT: bigint) => {
    console.log('Redeem:', { shares, minUSDT });
    // TODO: Implement redeem transaction
    // 1. Approve ETF shares to Router
    // 2. Call router.burnToUSDT(shares, minUSDT, deadline)
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">B</span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900">BlockETF</h1>
              </div>
              <nav className="flex space-x-4">
                <Link
                  href="/"
                  className="text-blue-600 font-medium"
                >
                  Home
                </Link>
                <Link
                  href="/faucet"
                  className="text-gray-600 hover:text-gray-900 font-medium"
                >
                  Faucet 💧
                </Link>
              </nav>
            </div>
            <ConnectButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isPaused && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800 font-medium">
              ⚠️ Trading is currently paused
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - ETF Overview */}
          <div className="lg:col-span-2">
            <ETFOverview
              sharePrice={shareValue}
              totalValue={totalValue}
              assets={assets}
            />
          </div>

          {/* Right Column - Holdings & Trade */}
          <div className="space-y-6">
            <MyHoldings
              shares={balance}
              sharePrice={shareValue}
              isConnected={isConnected}
              isLoading={balanceLoading}
            />

            <TradePanel
              isConnected={isConnected}
              onInvest={handleInvest}
              onRedeem={handleRedeem}
            />
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-gray-500 text-sm">
          <p>
            BlockETF - Decentralized ETF Platform | Built on BSC
          </p>
        </footer>
      </main>
    </div>
  );
}
