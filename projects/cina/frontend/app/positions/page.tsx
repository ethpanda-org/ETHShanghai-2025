'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import OpenPositionButton from '@/components/OpenPositionButton';
import PositionList from '@/components/PositionList';
import { type Position } from '@/lib/position';

// 禁用静态优化，因为此页面依赖客户端钱包连接
export const dynamic = 'force-dynamic';

export default function PositionsPage() {
  const { isConnected } = useAccount();
  const [positions, setPositions] = useState<Position[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleOpenPositionSuccess = (newPositions: Position[]) => {
    setPositions(newPositions);
    setMessage({ type: 'success', text: '开仓成功！' });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleOpenPositionError = (error: string) => {
    setMessage({ type: 'error', text: `开仓失败: ${error}` });
    setTimeout(() => setMessage(null), 5000);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">交易仓位</h1>
          <p className="text-gray-600">
            管理您的杠杆交易仓位，开仓、监控和管理您的投资组合
          </p>
        </div>

        {!isConnected && (
          <div className="mb-8 p-6 border rounded-lg bg-yellow-50 border-yellow-200">
            <h2 className="text-lg font-semibold text-yellow-800 mb-2">需要连接钱包</h2>
            <p className="text-yellow-700">
              请先连接您的钱包以开始交易和管理仓位
            </p>
          </div>
        )}

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 开仓区域 */}
          <div>
            <OpenPositionButton
              onSuccess={handleOpenPositionSuccess}
              onError={handleOpenPositionError}
            />
          </div>

          {/* 仓位列表区域 */}
          <div>
            <PositionList />
          </div>
        </div>

        {/* 使用说明 */}
        <div className="mt-12 p-6 border rounded-lg bg-blue-50 border-blue-200">
          <h2 className="text-lg font-semibold text-blue-800 mb-4">使用说明</h2>
          <div className="space-y-3 text-blue-700">
            <div className="flex items-start">
              <span className="font-medium mr-2">1.</span>
              <span>连接您的钱包（支持MetaMask、WalletConnect等）</span>
            </div>
            <div className="flex items-start">
              <span className="font-medium mr-2">2.</span>
              <span>确保您有足够的stETH作为抵押物</span>
            </div>
            <div className="flex items-start">
              <span className="font-medium mr-2">3.</span>
              <span>输入抵押物数量和期望的杠杆倍数</span>
            </div>
            <div className="flex items-start">
              <span className="font-medium mr-2">4.</span>
              <span>点击"开仓"按钮，系统会自动处理授权和交易</span>
            </div>
            <div className="flex items-start">
              <span className="font-medium mr-2">5.</span>
              <span>等待交易确认，成功后可在仓位列表中查看</span>
            </div>
          </div>
        </div>

        {/* 注意事项 */}
        <div className="mt-6 p-6 border rounded-lg bg-orange-50 border-orange-200">
          <h2 className="text-lg font-semibold text-orange-800 mb-4">重要提示</h2>
          <div className="space-y-2 text-orange-700">
            <p>• 杠杆交易存在风险，请谨慎操作</p>
            <p>• 请确保您的仓位健康因子保持在安全水平</p>
            <p>• 建议在测试网络上先熟悉操作流程</p>
            <p>• 交易费用和滑点可能影响最终结果</p>
          </div>
        </div>
      </div>
    </div>
  );
}

