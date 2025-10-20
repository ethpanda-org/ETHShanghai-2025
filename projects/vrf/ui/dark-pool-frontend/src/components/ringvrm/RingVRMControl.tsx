import React, { useState } from 'react';
import { ShieldIcon, EyeIcon, EyeOffIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { useRingVRM } from '@/hooks/useRingVRM';

interface RingVRMControlProps {
  enabled?: boolean;
  onToggle?: (enabled: boolean) => void;
  className?: string;
}

export function RingVRMControl({ enabled = true, onToggle, className = '' }: RingVRMControlProps) {
  const [showDetails, setShowDetails] = useState(false);
  const { stats, privacyScore, hasActivePool, canMix } = useRingVRM({
    enableMixing: enabled,
    autoRefresh: true
  });

  const getPrivacyLevel = () => {
    if (privacyScore >= 80) return { level: 'Maximum', color: 'text-green-600' };
    if (privacyScore >= 60) return { level: 'High', color: 'text-blue-600' };
    if (privacyScore >= 40) return { level: 'Medium', color: 'text-yellow-600' };
    return { level: 'Low', color: 'text-red-600' };
  };

  const privacyLevel = getPrivacyLevel();

  return (
    <div className={`bg-gray-900/50 rounded-lg border border-gray-800 p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <ShieldIcon className="h-8 w-8 text-blue-500" />
            {enabled && (
              <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full animate-pulse" />
            )}
          </div>
          <div>
            <h3 className="text-white font-semibold">Ring VRM Protection</h3>
            <p className={`text-sm ${privacyLevel.color}`}>
              {privacyLevel.level} Privacy ({privacyScore}%)
            </p>
          </div>
        </div>

        <button
          onClick={() => onToggle?.(!enabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            enabled ? 'bg-blue-600' : 'bg-gray-700'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Status Indicators */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-white">
            {stats?.currentAnonymitySet || 0}
          </div>
          <div className="text-xs text-gray-400">Anonymity Set</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-white">
            {stats?.activePools || 0}
          </div>
          <div className="text-xs text-gray-400">Active Pools</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-white">
            {stats?.mixSuccessRate.toFixed(1) || 0}%
          </div>
          <div className="text-xs text-gray-400">Success Rate</div>
        </div>
      </div>

      {/* Toggle Details */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
      >
        {showDetails ? (
          <EyeOffIcon className="h-4 w-4" />
        ) : (
          <EyeIcon className="h-4 w-4" />
        )}
        <span className="text-sm">{showDetails ? 'Hide' : 'Show'} Details</span>
      </button>

      {/* Detailed Information */}
      {showDetails && (
        <div className="mt-4 space-y-3 pt-4 border-t border-gray-800">
          <div className="flex items-start space-x-2">
            <InformationCircleIcon className="h-5 w-5 text-gray-400 mt-0.5" />
            <div className="text-sm text-gray-300">
              <p className="mb-2">
                Ring VRM protects your transactions by:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Mixing your funds with {stats?.currentAnonymitySet || 0}+ decoys</li>
                <li>Using ring signatures to hide the real spender</li>
                <li>Adding random delays to prevent timing analysis</li>
                <li>Creating unlinkable transaction paths</li>
              </ul>
            </div>
          </div>

          {hasActivePool && (
            <div className="bg-green-900/20 border border-green-800 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-green-400">
                  ✓ Active mixing pool available
                </span>
                <span className="text-xs text-gray-400">
                  Ready to protect transactions
                </span>
              </div>
            </div>
          )}

          {!canMix && enabled && (
            <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-yellow-400">
                  ⚠ No mixing pools available
                </span>
                <button className="text-xs text-yellow-400 hover:text-yellow-300">
                  Create Pool
                </button>
              </div>
            </div>
          )}

          {stats && (
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-gray-400">Total Mixed:</span>
                <span className="ml-2 text-white">
                  {parseFloat(stats.totalMixed).toFixed(4)} ETH
                </span>
              </div>
              <div>
                <span className="text-gray-400">Total Volume:</span>
                <span className="ml-2 text-white">
                  {parseFloat(stats.totalVolume).toFixed(4)} ETH
                </span>
              </div>
              <div>
                <span className="text-gray-400">Avg Mix Time:</span>
                <span className="ml-2 text-white">
                  {Math.round(stats.averageMixTime / 1000)}s
                </span>
              </div>
              <div>
                <span className="text-gray-400">Status:</span>
                <span className={`ml-2 ${privacyLevel.color}`}>
                  {privacyLevel.level}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}