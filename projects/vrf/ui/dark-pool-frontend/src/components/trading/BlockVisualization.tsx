import React, { useState } from 'react';
import {
  CubeIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import type { EpochVisualization, BlockVisualization as BlockVisualizationType } from '../../types/block';
import { cn } from '../../utils/cn';
import { ObfuscationUtils } from '../../utils/index';

interface BlockVisualizationProps {
  visualization: BlockVisualizationType;
  showDetails?: boolean;
  onToggleDetails?: () => void;
}

const BlockComponent: React.FC<BlockVisualizationProps> = ({
  visualization,
  showDetails = false,
  onToggleDetails
}) => {
  const { block, isAnimating, matchProgress } = visualization;
  const [showOrders, setShowOrders] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'border-yellow-500/30 bg-yellow-900/10';
      case 'matching': return 'border-blue-500/30 bg-blue-900/10';
      case 'completed': return 'border-green-500/30 bg-green-900/10';
      case 'expired': return 'border-red-500/30 bg-red-900/10';
      default: return 'border-gray-700 bg-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <ClockIcon className="h-4 w-4 text-yellow-400" />;
      case 'matching': return <ArrowPathIcon className={cn('h-4 w-4 text-blue-400', isAnimating && 'animate-spin')} />;
      case 'completed': return <CheckCircleIcon className="h-4 w-4 text-green-400" />;
      case 'expired': return <ClockIcon className="h-4 w-4 text-red-400" />;
      default: return <CubeIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className={cn(
      'border rounded-lg p-3 transition-all duration-300',
      getStatusColor(block.status),
      isAnimating && 'shadow-lg shadow-blue-500/20'
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          {getStatusIcon(block.status)}
          <span className="text-sm font-medium text-gray-300">
            Block {block.index + 1}
          </span>
          <span className="text-xs text-gray-500">
            {ObfuscationUtils.shortenId(block.id)}
          </span>
        </div>

        <button
          onClick={() => setShowOrders(!showOrders)}
          className="p-1 text-gray-400 hover:text-gray-200 transition-colors"
        >
          {showOrders ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
        </button>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
        <span>{block.orders.length} orders</span>
        <span>{new Date(block.createdAt).toLocaleTimeString()}</span>
      </div>

      {matchProgress > 0 && (
        <div className="w-full bg-gray-700 rounded-full h-1 mb-2">
          <div
            className="bg-green-400 h-1 rounded-full transition-all duration-500"
            style={{ width: `${matchProgress}%` }}
          />
        </div>
      )}

      {showOrders && block.orders.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-gray-700 pt-2">
          {block.orders.map(order => (
            <div key={order.id} className="text-xs bg-gray-800/50 rounded p-2">
              <div className="flex items-center justify-between">
                <span className={cn(
                  'font-medium',
                  order.side === 'buy' ? 'text-green-400' : 'text-red-400'
                )}>
                  {order.side.toUpperCase()}
                </span>
                <span className="text-gray-400">
                  {ObfuscationUtils.blurValue(order.amount.toFixed(4), 'low')}
                </span>
              </div>
              {order.price && (
                <div className="text-gray-500 mt-1">
                  @ {ObfuscationUtils.blurValue(`$${order.price.toFixed(2)}`, 'low')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

interface EpochVisualizationProps {
  visualization: EpochVisualization;
  className?: string;
}

export const EpochComponent: React.FC<EpochVisualizationProps> = ({
  visualization,
  className = ''
}) => {
  const { epoch, blocks, isExpanded, animationState } = visualization;
  const [showDetails, setShowDetails] = useState(isExpanded);

  const getAnimationStateColor = (state: string) => {
    switch (state) {
      case 'collecting': return 'border-blue-500/30';
      case 'matching': return 'border-yellow-500/30 animate-pulse';
      case 'completed': return 'border-green-500/30';
      default: return 'border-gray-700';
    }
  };

  return (
    <div className={cn(
      'border rounded-xl p-4 transition-all duration-500',
      getAnimationStateColor(animationState),
      className
    )}>
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className="flex items-center space-x-3">
          {showDetails ? (
            <ChevronDownIcon className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronRightIcon className="h-5 w-5 text-gray-400" />
          )}
          <div>
            <h3 className="text-lg font-semibold text-gray-200">
              Epoch #{epoch.index + 1}
            </h3>
            <p className="text-sm text-gray-400">
              {epoch.totalOrders} orders • {epoch.matchedOrders} matched
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className={cn(
            'px-3 py-1 text-xs font-medium rounded-full',
            epoch.status === 'active' ? 'bg-blue-900/50 text-blue-400' :
            epoch.status === 'matching' ? 'bg-yellow-900/50 text-yellow-400' :
            'bg-green-900/50 text-green-400'
          )}>
            {epoch.status}
          </span>
        </div>
      </div>

      {showDetails && (
        <div className="mt-4">
          <div className="grid grid-cols-5 gap-2">
            {blocks.map((block, index) => (
              <BlockComponent
                key={block.block.id}
                visualization={block}
                showDetails={showDetails}
              />
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="flex items-center justify-between text-sm text-gray-400">
              <span>Started: {epoch.startedAt.toLocaleTimeString()}</span>
              {epoch.completedAt && (
                <span>Completed: {epoch.completedAt.toLocaleTimeString()}</span>
              )}
            </div>

            {animationState === 'matching' && (
              <div className="mt-2 flex items-center space-x-2 text-xs text-yellow-400">
                <ArrowPathIcon className="h-3 w-3 animate-spin" />
                <span>Random priority matching in progress...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface BlockChainVisualizationProps {
  visualizations: EpochVisualization[];
  className?: string;
}

export const BlockChainVisualization: React.FC<BlockChainVisualizationProps> = ({
  visualizations,
  className = ''
}) => {
  const [showOnlyActive, setShowOnlyActive] = useState(false);

  const filteredVisualizations = showOnlyActive
    ? visualizations.filter(v => v.epoch.status !== 'completed')
    : visualizations;

  return (
    <div className={cn('bg-gray-900 rounded-xl p-6', className)}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-200">Block & Epoch Structure</h2>
        <button
          onClick={() => setShowOnlyActive(!showOnlyActive)}
          className={cn(
            'px-3 py-1 text-xs font-medium rounded transition-colors',
            showOnlyActive
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          )}
        >
          {showOnlyActive ? 'Active Only' : 'All Epochs'}
        </button>
      </div>

      <div className="space-y-4">
        {filteredVisualizations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CubeIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <div>No epochs to display</div>
            <div className="text-sm mt-1">Blocks are being created...</div>
          </div>
        ) : (
          filteredVisualizations.map(visualization => (
            <EpochComponent
              key={visualization.epoch.id}
              visualization={visualization}
            />
          ))
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-800">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-4">
            <span>Epoch: 5 blocks</span>
            <span>•</span>
            <span>Block: 30 seconds</span>
            <span>•</span>
            <span>Matching: Random priority</span>
          </div>
          <span>{visualizations.length} epochs</span>
        </div>
      </div>
    </div>
  );
};