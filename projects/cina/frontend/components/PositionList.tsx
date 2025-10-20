'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { getPositions, type Position } from '@/lib/position';

export default function PositionList() {
  const { address, isConnected } = useAccount();
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const loadPositions = async () => {
    if (!isConnected || !address) return;

    setIsLoading(true);
    setError('');

    try {
      const userPositions = await getPositions(address);
      setPositions(userPositions);
      
      // 如果没有仓位，显示友好提示
      if (userPositions.length === 0) {
        console.log('用户暂无仓位');
      }
    } catch (err) {
      let errorMessage = '获取仓位失败';
      
      if (err instanceof Error) {
        if (err.message.includes('合约地址') && err.message.includes('无效')) {
          errorMessage = '合约地址配置错误，请联系管理员';
        } else if (err.message.includes('getPositions')) {
          errorMessage = '当前合约不支持仓位查询功能，这是演示版本';
        } else if (err.message.includes('returned no data')) {
          errorMessage = '合约函数调用失败，请检查网络连接和合约状态';
        } else if (err.message.includes('AbiFunctionNotFoundError')) {
          errorMessage = '合约接口不匹配，这是演示版本，仓位查询功能正在开发中';
        } else if (err.message.includes('Function "getPositions" not found')) {
          errorMessage = '合约不支持getPositions函数，这是演示版本';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      console.error('获取仓位失败:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected && address) {
      console.log(`PositionList isConnected:${isConnected}  address:${address}`)
      loadPositions();
    }
  }, [isConnected, address]);

  if (!isConnected) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50">
        <p className="text-gray-600">请先连接钱包查看仓位</p>
      </div>
    );
  }

  return (
    <div className="p-6 border rounded-lg bg-white shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-black">我的仓位</h3>
        <button
          onClick={loadPositions}
          disabled={isLoading}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? '刷新中...' : '刷新'}
        </button>
      </div>

      {error && (
        <div className="p-4 mb-4 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-md">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">提示</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>{error}</p>
                {error.includes('演示版本') && (
                  <div className="mt-2">
                    <p className="text-xs text-yellow-600">
                      这是演示版本，仓位查询功能正在开发中。您可以尝试开仓功能来体验系统。
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {isLoading && positions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          加载仓位信息中...
        </div>
      ) : positions.length === 0 ? (
        <div className="text-center py-8">
          <div className="mx-auto h-12 w-12 text-gray-400">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">暂无仓位</h3>
          <p className="mt-1 text-sm text-gray-500">
            您还没有开立任何仓位。点击"开仓"按钮开始您的交易之旅。
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {positions.map((position) => (
            <div key={position.id.toString()} className="p-4 border rounded-lg bg-gray-50">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">仓位ID</p>
                  <p className="font-medium text-black">{position.id.toString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">抵押物代币</p>
                  <p className="font-medium text-black" style={{wordWrap: 'break-word'}}>{position.collateralToken}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">抵押物数量</p>
                  <p className="font-medium text-black">{formatEther(position.collateralAmount)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">债务数量</p>
                  <p className="font-medium text-black">{formatEther(position.debtAmount)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">健康因子</p>
                  <p className={`font-medium ${
                    position.healthFactor > 1500000n 
                      ? 'text-green-600' 
                      : position.healthFactor > 1000000n 
                      ? 'text-yellow-600' 
                      : 'text-red-600'
                  }  text-black`}>
                    {(Number(position.healthFactor) / 1000000).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">杠杆倍数</p>
                  <p className="font-medium text-black">
                    {position.collateralAmount > 0n 
                      ? (Number(position.debtAmount + position.collateralAmount) / Number(position.collateralAmount)).toFixed(2)
                      : '0'
                    }x
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
