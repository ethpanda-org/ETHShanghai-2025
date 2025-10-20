import React, { useState, useEffect } from 'react';
import {
  ShieldCheckIcon,
  UsersIcon,
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useRingVRM } from '@/hooks/useRingVRM';
import { RingMixerService } from '@/services/ring-mixer';
import type { MixPool, MixTransaction } from '@/types/ringvrm';

export function RingVRMDashboard() {
  const [selectedPool, setSelectedPool] = useState<MixPool | null>(null);
  const [transactions, setTransactions] = useState<MixTransaction[]>([]);
  const {
    pools,
    stats,
    privacyScore,
    isLoading,
    loadPools,
    loadStats
  } = useRingVRM({
    enableMixing: true,
    autoRefresh: true,
    refreshInterval: 10000
  });

  useEffect(() => {
    if (pools.length > 0 && !selectedPool) {
      setSelectedPool(pools[0]);
    }
  }, [pools, selectedPool]);

  const getPrivacyStatusColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-blue-400';
    if (score >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getPrivacyStatusText = (score: number) => {
    if (score >= 80) return 'Maximum Protection';
    if (score >= 60) return 'High Protection';
    if (score >= 40) return 'Medium Protection';
    return 'Low Protection';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center">
          <ShieldCheckIcon className="h-8 w-8 text-blue-500 mr-3" />
          Ring VRM Dashboard
        </h2>
        <div className="flex items-center space-x-4">
          <div className={`text-sm font-medium ${getPrivacyStatusColor(privacyScore)}`}>
            {getPrivacyStatusText(privacyScore)}
          </div>
          <div className="text-2xl font-bold text-white">
            {privacyScore}%
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <div className="flex items-center justify-between mb-2">
            <UsersIcon className="h-8 w-8 text-blue-500" />
            <span className="text-2xl font-bold text-white">
              {stats?.currentAnonymitySet || 0}
            </span>
          </div>
          <div className="text-sm text-gray-400">Anonymity Set Size</div>
          <div className="text-xs text-gray-500 mt-1">
            Current active participants
          </div>
        </div>

        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <div className="flex items-center justify-between mb-2">
            <ChartBarIcon className="h-8 w-8 text-green-500" />
            <span className="text-2xl font-bold text-white">
              {stats?.activePools || 0}
            </span>
          </div>
          <div className="text-sm text-gray-400">Active Pools</div>
          <div className="text-xs text-gray-500 mt-1">
            Currently mixing
          </div>
        </div>

        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <div className="flex items-center justify-between mb-2">
            <CheckCircleIcon className="h-8 w-8 text-yellow-500" />
            <span className="text-2xl font-bold text-white">
              {stats?.mixSuccessRate.toFixed(1) || 0}%
            </span>
          </div>
          <div className="text-sm text-gray-400">Success Rate</div>
          <div className="text-xs text-gray-500 mt-1">
            Last 100 transactions
          </div>
        </div>

        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <div className="flex items-center justify-between mb-2">
            <ClockIcon className="h-8 w-8 text-purple-500" />
            <span className="text-2xl font-bold text-white">
              {Math.round((stats?.averageMixTime || 0) / 1000)}s
            </span>
          </div>
          <div className="text-sm text-gray-400">Avg Mix Time</div>
          <div className="text-xs text-gray-500 mt-1">
            Per transaction
          </div>
        </div>
      </div>

      {/* Pools and Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Pools */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Active Mixing Pools</h3>

          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : pools.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <ExclamationTriangleIcon className="h-12 w-12 mx-auto mb-2" />
              <p>No active pools found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pools.map((pool) => (
                <div
                  key={pool.id}
                  onClick={() => setSelectedPool(pool)}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedPool?.id === pool.id
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        pool.status === 'active' ? 'bg-green-500' :
                        pool.status === 'mixing' ? 'bg-yellow-500' :
                        'bg-gray-500'
                      }`} />
                      <span className="text-sm font-medium text-white">
                        {pool.asset} Pool
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {pool.id.slice(0, 8)}...
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Mix Depth:</span>
                      <span className="ml-2 text-white">{pool.mixDepth}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Members:</span>
                      <span className="ml-2 text-white">{pool.anonymitySet.length}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Min:</span>
                      <span className="ml-2 text-white">{pool.minMixAmount} ETH</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Max:</span>
                      <span className="ml-2 text-white">{pool.maxMixAmount} ETH</span>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      pool.status === 'active' ? 'bg-green-900/50 text-green-400' :
                      pool.status === 'mixing' ? 'bg-yellow-900/50 text-yellow-400' :
                      'bg-gray-800 text-gray-400'
                    }`}>
                      {pool.status}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(pool.expiresAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Pool Details */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Pool Details</h3>

          {selectedPool ? (
            <div className="space-y-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-400">Pool ID</span>
                  <span className="text-sm text-white font-mono">
                    {selectedPool.id}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Asset</div>
                    <div className="text-white font-medium">{selectedPool.asset}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Status</div>
                    <div className={`font-medium ${
                      selectedPool.status === 'active' ? 'text-green-400' :
                      selectedPool.status === 'mixing' ? 'text-yellow-400' :
                      'text-gray-400'
                    }`}>
                      {selectedPool.status}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Mix Depth</div>
                    <div className="text-white font-medium">{selectedPool.mixDepth}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Fee</div>
                    <div className="text-white font-medium">{selectedPool.feePercentage}%</div>
                  </div>
                </div>
              </div>

              {/* Anonymity Set Visualization */}
              <div>
                <h4 className="text-sm font-medium text-white mb-2">Anonymity Set</h4>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-center">
                    <div className="relative">
                      <div className="w-32 h-32 rounded-full border-4 border-blue-500/20"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-white">
                            {selectedPool.anonymitySet.length}
                          </div>
                          <div className="text-xs text-gray-400">Members</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-400">
                      Your transaction is mixed with {selectedPool.anonymitySet.length - 1} decoys
                    </p>
                  </div>
                </div>
              </div>

              {/* Recent Transactions */}
              <div>
                <h4 className="text-sm font-medium text-white mb-2">Recent Activity</h4>
                <div className="space-y-2">
                  {transactions.slice(0, 3).map((tx) => (
                    <div key={tx.id} className="bg-gray-800 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white font-mono">
                          {tx.id.slice(0, 10)}...
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          tx.status === 'completed' ? 'bg-green-900/50 text-green-400' :
                          tx.status === 'mixed' ? 'bg-blue-900/50 text-blue-400' :
                          'bg-yellow-900/50 text-yellow-400'
                        }`}>
                          {tx.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {tx.inputs[0].amount} ETH
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <p>Select a pool to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Privacy Tips */}
      <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-400 mb-3">Privacy Tips</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-start space-x-2">
            <CheckCircleIcon className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-gray-300">
              Higher mix depths provide better privacy but take longer
            </p>
          </div>
          <div className="flex items-start space-x-2">
            <CheckCircleIcon className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-gray-300">
              Larger anonymity sets make analysis harder
            </p>
          </div>
          <div className="flex items-start space-x-2">
            <CheckCircleIcon className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-gray-300">
              Multiple output addresses increase unlinkability
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}