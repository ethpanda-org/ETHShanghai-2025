'use client';

import { useEffect, useState } from 'react';
import { useReadContract } from 'wagmi';
import { CONTRACTS } from '@/lib/contracts';

interface DonationFlow {
  id: string;
  amount: number;
  from: string;
  to: string;
  timestamp: number;
}

// PublicGoodsFund ABI - 只包含需要的函数
const PUBLIC_GOODS_FUND_ABI = [
  {
    "inputs": [],
    "name": "totalLifetimeDonations",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export default function PublicGoodsDonationFlow() {
  const [donations, setDonations] = useState<DonationFlow[]>([]);
  const [totalDonated, setTotalDonated] = useState(0);
  const [animatingDonation, setAnimatingDonation] = useState<DonationFlow | null>(null);
  const [latestDonation, setLatestDonation] = useState<DonationFlow | null>(null); // 始终保持最新的捐赠用于显示
  const [isNewAnimation, setIsNewAnimation] = useState(false); // 控制动画效果

  // 公益项目列表
  const publicGoodsProjects = [
    { name: 'Ethereum Core Dev', allocated: 35, color: 'bg-purple-500' },
    { name: 'Gitcoin Grants', allocated: 25, color: 'bg-green-500' },
    { name: 'ETHPanda', allocated: 20, color: 'bg-blue-500' },
    { name: 'Protocol Guild', allocated: 10, color: 'bg-amber-500' },
    { name: 'OpenZeppelin', allocated: 10, color: 'bg-red-500' },
  ];

  // 从智能合约读取真实的总捐赠金额
  const { data: contractDonations } = useReadContract({
    address: CONTRACTS.PUBLIC_GOODS_FUND as `0x${string}`,
    abi: PUBLIC_GOODS_FUND_ABI,
    functionName: 'totalLifetimeDonations',
  });

  // 获取真实的公益基金数据
  const fetchPublicGoodsData = async () => {
    try {
      // 调用真实的Oracle API获取最新的汇率spread数据
      const response = await fetch('http://localhost:3001/predict/USDC%2FUSDT');
      const data = await response.json();

      // 如果有合约数据，使用合约数据作为基础
      if (contractDonations) {
        const baseAmount = Number(contractDonations) / 1e6; // 转换为 USD
        // 基于spread计算增量（模拟实时增长）
        const increment = Math.abs(data.price_change || 0.01) * Math.random() * 0.5;
        setTotalDonated(baseAmount + increment);
      } else {
        // 如果没有合约数据，使用累积增长
        setTotalDonated(prev => {
          const increment = Math.abs(data.price_change || 0.01) * Math.random() * 0.5;
          return prev + increment;
        });
      }
    } catch (error) {
      console.error('Failed to fetch public goods data:', error);
      // 降级到简单增长
      setTotalDonated(prev => {
        const increment = Math.random() * 0.5;
        return prev + increment;
      });
    }
  };

  useEffect(() => {
    // 初始化数据
    fetchPublicGoodsData();

    // 初始化一个默认的捐赠流
    const initialDonation: DonationFlow = {
      id: 'initial',
      amount: 1.25,
      from: 'Merchant-42',
      to: publicGoodsProjects[0].name,
      timestamp: Date.now()
    };
    setLatestDonation(initialDonation);
    setDonations([initialDonation]);

    // 模拟实时捐赠流（基于真实的Oracle数据）
    const interval = setInterval(async () => {
      try {
        // 获取最新的Oracle数据来计算捐赠金额
        const response = await fetch('http://localhost:3001/predict/USDC%2FUSDT');
        const data = await response.json();

        // 基于真实的price spread计算捐赠金额
        // 0.1-0.2% 的FX spread作为捐赠
        const baseAmount = (Math.random() * 1000 + 100); // 模拟100-1100的交易额
        const spreadRate = Math.abs(data.price_change || 0.01) / 100; // 转换为百分比
        const donationAmount = baseAmount * spreadRate * 0.15; // 15%的spread作为捐赠

        const newDonation: DonationFlow = {
          id: Math.random().toString(36),
          amount: donationAmount,
          from: `Merchant-${Math.floor(Math.random() * 100)}`,
          to: publicGoodsProjects[Math.floor(Math.random() * publicGoodsProjects.length)].name,
          timestamp: Date.now()
        };

        // 更新状态
        setLatestDonation(newDonation); // 始终保持最新捐赠
        setAnimatingDonation(newDonation); // 触发新动画
        setIsNewAnimation(true); // 标记为新动画
        setDonations(prev => [newDonation, ...prev.slice(0, 4)]);
        fetchPublicGoodsData(); // 更新总额

        // 3秒后移除动画效果，但保持显示
        setTimeout(() => {
          setAnimatingDonation(null);
          setIsNewAnimation(false);
        }, 3000);
      } catch (error) {
        console.error('Failed to create donation flow:', error);
        // 降级到随机数据
        const newDonation: DonationFlow = {
          id: Math.random().toString(36),
          amount: Math.random() * 2 + 0.1,
          from: `Merchant-${Math.floor(Math.random() * 100)}`,
          to: publicGoodsProjects[Math.floor(Math.random() * publicGoodsProjects.length)].name,
          timestamp: Date.now()
        };

        setLatestDonation(newDonation);
        setAnimatingDonation(newDonation);
        setIsNewAnimation(true);
        setDonations(prev => [newDonation, ...prev.slice(0, 4)]);
        setTotalDonated(prev => prev + newDonation.amount);

        setTimeout(() => {
          setAnimatingDonation(null);
          setIsNewAnimation(false);
        }, 3000);
      }
    }, 8000); // 每8秒生成一次捐赠流

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
      <div className="mb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900">
                💝 Price Spread → Public Goods Engine
              </h2>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                Live Preview
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Simulated donation flow showing how the system works
            </div>
          </div>
          <div className="text-sm text-gray-600">
            Every FX spread auto-donates to Ethereum ecosystem
          </div>
        </div>

        {/* Live Donation Animation */}
        <div className="relative h-32 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-lg mb-4 overflow-hidden">
          {/* Background Grid */}
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full">
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>

          {/* Animated Donation Flow - 始终显示最新的捐赠 */}
          {latestDonation && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={isNewAnimation ? "animate-pulse" : ""}>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className={`w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg ${isNewAnimation ? 'scale-110 transition-transform duration-300' : 'transition-transform duration-300'}`}>
                      <span className="text-2xl">🏪</span>
                    </div>
                    <div className="text-xs mt-1 font-medium">{latestDonation.from}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className={`h-0.5 w-20 animate-flow bg-gradient-to-r from-emerald-400 to-emerald-600 ${isNewAnimation ? 'opacity-100' : 'opacity-70'}`}></div>
                    <div className={`bg-emerald-600 text-white px-2 py-1 rounded text-xs font-bold ${isNewAnimation ? 'animate-bounce' : ''}`}>
                      ${latestDonation.amount.toFixed(3)}
                    </div>
                    <div className={`h-0.5 w-20 animate-flow bg-gradient-to-r from-emerald-600 to-purple-600 ${isNewAnimation ? 'opacity-100' : 'opacity-70'}`}></div>
                  </div>

                  <div className="text-center">
                    <div className={`w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg ${isNewAnimation ? 'scale-110 transition-transform duration-300' : 'transition-transform duration-300'}`}>
                      <span className="text-2xl">🏛️</span>
                    </div>
                    <div className="text-xs mt-1 font-medium">{latestDonation.to}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 流动光效 - 持续动画 */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 animate-shimmer"></div>
          </div>

          {/* Total Counter */}
          <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-3 py-1 rounded-full">
            <span className="text-xs font-medium text-gray-700">Total: </span>
            <span className="text-sm font-bold text-emerald-600">${totalDonated.toFixed(2)}</span>
          </div>
        </div>

        {/* Project Allocation */}
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-700 mb-2">Fund Allocation</div>
          <div className="space-y-2">
            {publicGoodsProjects.map(project => (
              <div key={project.name} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium">{project.name}</span>
                    <span className="text-gray-600">{project.allocated}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`${project.color} h-2 rounded-full transition-all duration-500`}
                      style={{ width: `${project.allocated}%` }}
                    ></div>
                  </div>
                </div>
                <div className="text-xs font-medium text-gray-700 w-16 text-right">
                  ${((totalDonated * project.allocated) / 100).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Donations Feed */}
        <div>
          <div className="text-sm font-medium text-gray-700 mb-2">Recent Donations</div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {donations.map((donation, index) => {
              // 计算相对时间
              const getRelativeTime = (timestamp: number) => {
                const seconds = Math.floor((Date.now() - timestamp) / 1000);
                if (seconds < 60) return `${seconds}s ago`;
                const minutes = Math.floor(seconds / 60);
                if (minutes < 60) return `${minutes}m ago`;
                const hours = Math.floor(minutes / 60);
                if (hours < 24) return `${hours}h ago`;
                return new Date(timestamp).toLocaleDateString();
              };

              return (
                <div
                  key={donation.id}
                  className={`flex items-center justify-between py-1 px-2 rounded text-xs ${
                    index === 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-50'
                  } transition-all duration-500`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">{donation.from}</span>
                    <span className="text-gray-400">→</span>
                    <span className="font-medium text-gray-900">{donation.to}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-600">${donation.amount.toFixed(3)}</span>
                    <span className="text-gray-400">
                      {getRelativeTime(donation.timestamp)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Impact Message */}
        <div className="mt-4 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
          <div className="text-xs text-purple-700">
            <span className="font-semibold">Your Impact:</span> Every transaction automatically converts
            0.1-0.2% FX spread into sustainable funding for Ethereum public goods.
            No extra cost, 100% transparent, building the future together.
          </div>
        </div>
      </div>
    </div>
  );
}