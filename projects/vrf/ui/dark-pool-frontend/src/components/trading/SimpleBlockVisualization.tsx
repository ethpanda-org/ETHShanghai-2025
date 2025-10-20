import React from 'react';
import { CubeIcon } from '@heroicons/react/24/outline';
import type { EpochVisualization, Block } from '../../types/block';
import { cn } from '../../utils/cn';

interface SimpleBlockVisualizationProps {
  visualizations: EpochVisualization[];
  className?: string;
  onBlockClick?: (block: Block) => void;
}

export const SimpleBlockVisualization: React.FC<SimpleBlockVisualizationProps> = ({
  visualizations,
  className = '',
  onBlockClick
}) => {
  // Show only the last 3 epochs for cleaner display
  const recentVisualizations = visualizations.slice(-3).reverse();

  return (
    <div className={cn('space-y-4', className)}>
      {recentVisualizations.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <CubeIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <div>No blocks yet</div>
        </div>
      ) : (
        recentVisualizations.map((visualization) => (
          <div
            key={visualization.epoch.id}
            className={cn(
              'border rounded-lg p-4 transition-all',
              visualization.epoch.status === 'completed' ? 'border-green-500/30 bg-green-900/10' :
              visualization.epoch.status === 'matching' ? 'border-yellow-500/30 bg-yellow-900/10' :
              'border-blue-500/30 bg-blue-900/10'
            )}
          >
            {/* Epoch Header */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-medium text-gray-200">
                  Epoch #{visualization.epoch.index + 1}
                </h3>
                <p className="text-xs text-gray-400">
                  {visualization.epoch.matchedOrders} of {visualization.epoch.totalOrders} matched
                </p>
              </div>
              <span className={cn(
                'px-2 py-1 text-xs font-medium rounded',
                visualization.epoch.status === 'completed' ? 'bg-green-900/50 text-green-400' :
                visualization.epoch.status === 'matching' ? 'bg-yellow-900/50 text-yellow-400' :
                'bg-blue-900/50 text-blue-400'
              )}>
                {visualization.epoch.status}
              </span>
            </div>

            {/* Blocks Grid */}
            <div className="grid grid-cols-5 gap-1">
              {visualization.epoch.blocks.map((block, index) => {
                const buyCount = block.orders.filter(o => o.side === 'buy').length;
                const sellCount = block.orders.filter(o => o.side === 'sell').length;

                return (
                  <div
                    key={block.id}
                    onClick={() => onBlockClick && onBlockClick(block)}
                    className={cn(
                      'aspect-square rounded flex flex-col items-center justify-center text-xs transition-all cursor-pointer hover:scale-105',
                      block.status === 'completed' ? 'bg-green-800/50 text-green-300 hover:bg-green-700/60' :
                      block.status === 'matching' ? 'bg-yellow-800/50 text-yellow-300 animate-pulse hover:bg-yellow-700/60' :
                      'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    )}
                  >
                    <div className="flex items-center space-x-1 mb-1">
                      <span className="text-xs font-bold text-green-400">{buyCount}</span>
                      <span className="text-xs text-gray-400">/</span>
                      <span className="text-xs font-bold text-red-400">{sellCount}</span>
                    </div>
                    <div className="text-[8px] text-gray-400">
                      B/S
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
};