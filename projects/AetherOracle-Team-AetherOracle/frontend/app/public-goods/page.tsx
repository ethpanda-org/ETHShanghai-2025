'use client';

import { useReadContract, useReadContracts } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { CONTRACTS } from '@/lib/contracts';
import { useState, useEffect } from 'react';

// PublicGoodsFund ABI
const PUBLIC_GOODS_FUND_ABI = [
  {
    "inputs": [],
    "name": "totalLifetimeDonations",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalTransactions",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalContributors",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getCurrentRoundInfo",
    "outputs": [
      {"internalType": "uint256", "name": "roundId", "type": "uint256"},
      {"internalType": "uint256", "name": "totalDonated", "type": "uint256"},
      {"internalType": "uint256", "name": "startTime", "type": "uint256"},
      {"internalType": "uint256", "name": "endTime", "type": "uint256"},
      {"internalType": "bool", "name": "distributed", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
    "name": "getContributorInfo",
    "outputs": [
      {"internalType": "uint256", "name": "totalContributed", "type": "uint256"},
      {"internalType": "uint256", "name": "lastContributionTime", "type": "uint256"},
      {"internalType": "string", "name": "badgeLevel", "type": "string"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// ✅ PublicGoodsFund deployed address (OP Sepolia)
const PUBLIC_GOODS_FUND_ADDRESS = "0x0C50DB765fa4b25D960D2CCa7556135909A742C1" as `0x${string}`;

export default function PublicGoodsPage() {
  const [isDeployed, setIsDeployed] = useState(true); // ✅ Set to true after deployment

  // 读取合约数据
  const { data: contractData } = useReadContracts({
    contracts: [
      {
        address: PUBLIC_GOODS_FUND_ADDRESS,
        abi: PUBLIC_GOODS_FUND_ABI,
        functionName: 'totalLifetimeDonations',
      },
      {
        address: PUBLIC_GOODS_FUND_ADDRESS,
        abi: PUBLIC_GOODS_FUND_ABI,
        functionName: 'totalTransactions',
      },
      {
        address: PUBLIC_GOODS_FUND_ADDRESS,
        abi: PUBLIC_GOODS_FUND_ABI,
        functionName: 'getTotalContributors',
      },
      {
        address: PUBLIC_GOODS_FUND_ADDRESS,
        abi: PUBLIC_GOODS_FUND_ABI,
        functionName: 'getCurrentRoundInfo',
      },
    ],
  });

  const totalLifetimeDonations = contractData?.[0]?.result ? Number(contractData[0].result) / 1e6 : 0;
  const totalTransactions = contractData?.[1]?.result ? Number(contractData[1].result) : 0;
  const totalContributors = contractData?.[2]?.result ? Number(contractData[2].result) : 0;
  const currentRoundInfo = contractData?.[3]?.result as any;

  const currentRoundDonated = currentRoundInfo ? Number(currentRoundInfo[1]) / 1e6 : 0;
  const roundEndTime = currentRoundInfo ? Number(currentRoundInfo[3]) : 0;

  const daysRemaining = roundEndTime > 0
    ? Math.max(0, Math.floor((roundEndTime - Date.now() / 1000) / 86400))
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Public Goods Impact Dashboard
          </h1>
          <p className="text-xl text-gray-700 mb-6">
            Every AetherPay transaction automatically supports Ethereum's open-source ecosystem
          </p>
          <div className="flex justify-center">
            <ConnectButton />
          </div>
        </div>

        {/* Contract Not Deployed Warning */}
        {!isDeployed && (
          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-2xl p-6 mb-8 text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <h3 className="text-xl font-bold text-yellow-900 mb-2">
              PublicGoodsFund Not Deployed Yet
            </h3>
            <p className="text-yellow-800 mb-4">
              The PublicGoodsFund contract is ready but not yet deployed to OP Sepolia.
              Deploy it using:
            </p>
            <code className="bg-yellow-100 px-4 py-2 rounded-lg text-sm inline-block">
              npx hardhat run scripts/deploy-public-goods.js --network op-sepolia
            </code>
            <p className="text-xs text-yellow-700 mt-4">
              Showing demo data below. Real data will appear after deployment.
            </p>
          </div>
        )}

        {/* Impact Stats - Hero Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <div className="bg-white rounded-2xl shadow-xl p-6 text-center transform hover:scale-105 transition-all">
            <div className="text-5xl mb-3">💝</div>
            <div className="text-4xl font-bold text-purple-600 mb-2">
              ${totalLifetimeDonations.toFixed(2)}
            </div>
            <div className="text-gray-600 font-semibold">Total Donated</div>
            <div className="text-xs text-gray-500 mt-2">All-time contributions</div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6 text-center transform hover:scale-105 transition-all">
            <div className="text-5xl mb-3">🔄</div>
            <div className="text-4xl font-bold text-blue-600 mb-2">
              {totalTransactions.toLocaleString()}
            </div>
            <div className="text-gray-600 font-semibold">Transactions</div>
            <div className="text-xs text-gray-500 mt-2">Contributing to public goods</div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6 text-center transform hover:scale-105 transition-all">
            <div className="text-5xl mb-3">👥</div>
            <div className="text-4xl font-bold text-green-600 mb-2">
              {totalContributors}
            </div>
            <div className="text-gray-600 font-semibold">Contributors</div>
            <div className="text-xs text-gray-500 mt-2">Merchants supporting</div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6 text-center transform hover:scale-105 transition-all">
            <div className="text-5xl mb-3">⏰</div>
            <div className="text-4xl font-bold text-orange-600 mb-2">
              {daysRemaining}
            </div>
            <div className="text-gray-600 font-semibold">Days Left</div>
            <div className="text-xs text-gray-500 mt-2">Until round distribution</div>
          </div>
        </div>

        {/* Current Round Progress */}
        <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl shadow-2xl p-8 mb-12 text-white">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-3xl font-bold mb-2">Current Round</h2>
              <p className="opacity-90">Monthly distribution to Ethereum projects</p>
            </div>
            <div className="text-right">
              <div className="text-5xl font-bold">${currentRoundDonated.toFixed(2)}</div>
              <div className="text-sm opacity-80">Collected this round</div>
            </div>
          </div>

          <div className="bg-white/20 rounded-full h-4 mb-4 overflow-hidden">
            <div
              className="bg-white h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (currentRoundDonated / 1000) * 100)}%` }}
            ></div>
          </div>

          <div className="flex justify-between text-sm opacity-90">
            <span>Goal: $1,000 per round</span>
            <span>{Math.min(100, Math.round((currentRoundDonated / 1000) * 100))}% reached</span>
          </div>
        </div>

        {/* How Platform Fee Donation Works */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-12">
          <h2 className="text-3xl font-bold mb-6 text-center">💡 Platform Fee Donation Model</h2>

          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                💳
              </div>
              <h3 className="font-bold text-lg mb-2">Step 1: You Pay</h3>
              <p className="text-gray-600 text-sm mb-3">
                Every AetherPay transaction includes a small platform fee
              </p>
              <div className="bg-blue-50 rounded-lg p-3 text-xs">
                <div className="font-semibold text-blue-900 mb-1">Fee Rates:</div>
                <div className="text-blue-800">Stablecoin pairs: 0.1%</div>
                <div className="text-blue-800">Crypto pairs: 0.2%</div>
              </div>
            </div>

            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                🎯
              </div>
              <h3 className="font-bold text-lg mb-2">Step 2: Auto Donation</h3>
              <p className="text-gray-600 text-sm mb-3">
                5% of platform fee automatically donated
              </p>
              <div className="bg-green-50 rounded-lg p-3 text-xs">
                <div className="font-semibold text-green-900 mb-1">Donation Rate:</div>
                <div className="text-green-800">Stablecoins: 0.005%</div>
                <div className="text-green-800">Crypto: 0.01%</div>
              </div>
            </div>

            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                💝
              </div>
              <h3 className="font-bold text-lg mb-2">Step 3: Impact</h3>
              <p className="text-gray-600 text-sm mb-3">
                Funds support Ethereum public goods
              </p>
              <div className="bg-purple-50 rounded-lg p-3 text-xs">
                <div className="font-semibold text-purple-900 mb-1">Beneficiaries:</div>
                <div className="text-purple-800">Core Development</div>
                <div className="text-purple-800">Open Source Projects</div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-xl p-6">
              <div className="text-sm text-emerald-700 font-semibold mb-2">Stablecoin Example (USDC/USDT):</div>
              <div className="text-gray-700 text-sm space-y-1">
                <div>$10,000 payment</div>
                <div>→ <span className="font-semibold">$10</span> platform fee (0.1%)</div>
                <div>→ <span className="text-2xl font-bold text-emerald-600">$0.50</span> donated to public goods 🎉</div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6">
              <div className="text-sm text-blue-700 font-semibold mb-2">Crypto Example (ETH/USDC):</div>
              <div className="text-gray-700 text-sm space-y-1">
                <div>$10,000 payment</div>
                <div>→ <span className="font-semibold">$20</span> platform fee (0.2%)</div>
                <div>→ <span className="text-2xl font-bold text-blue-600">$1.00</span> donated to public goods 🎉</div>
              </div>
            </div>
          </div>

          <div className="mt-6 bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
            <p className="text-sm text-purple-900">
              <span className="font-bold">100% Transparent:</span> All donations are tracked on-chain via the PublicGoodsFund smart contract
            </p>
          </div>
        </div>

        {/* Supported Projects */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-12">
          <h2 className="text-3xl font-bold mb-6">🌍 Funded Projects</h2>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-center">
            <p className="text-sm text-blue-900">
              <span className="font-bold">Current Round Allocation:</span> The following shows example allocation percentages.
              Actual recipients and percentages are set by the contract owner for each donation round.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: "Ethereum Foundation Grants", allocation: "40%", icon: "🏛️", amount: currentRoundDonated * 0.4 },
              { name: "Geth Development", allocation: "30%", icon: "⚡", amount: currentRoundDonated * 0.3 },
              { name: "Optimism Public Goods", allocation: "30%", icon: "🔴", amount: currentRoundDonated * 0.3 },
            ].map((project, index) => (
              <div key={index} className="border-2 border-gray-200 rounded-xl p-6 hover:border-purple-400 transition-colors">
                <div className="text-5xl mb-3">{project.icon}</div>
                <h3 className="font-bold text-lg mb-2">{project.name}</h3>
                <div className="text-2xl font-bold text-purple-600 mb-1">
                  ${project.amount.toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">{project.allocation} of this round</div>
              </div>
            ))}
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl shadow-2xl p-12 text-white text-center">
          <h2 className="text-4xl font-bold mb-4">Start Contributing Today!</h2>
          <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
            Every payment through AetherPay automatically supports the open-source
            tools and infrastructure that power Ethereum.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <a
              href="/dashboard"
              className="bg-white text-purple-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-colors inline-block"
            >
              Register as Merchant
            </a>
            <a
              href="https://github.com/aetherpay/protocol"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-purple-700 px-8 py-4 rounded-xl font-bold hover:bg-purple-800 transition-colors inline-block"
            >
              View on GitHub
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
