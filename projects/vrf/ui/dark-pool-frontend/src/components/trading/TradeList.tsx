import React, { useState, useEffect } from 'react';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, ClockIcon } from '@heroicons/react/24/outline';
import type { Order, Epoch } from '../../types/block';
import { cn } from '../../utils/cn';
import { ObfuscationUtils } from '../../utils/obfuscation';

interface TradeListProps {
  visualizations: any[];
  className?: string;
}

export const TradeList: React.FC<TradeListProps> = ({
  visualizations,
  className = ''
}) => {
  // Track which epochs are expanded - start with all collapsed
  const [expandedEpochs, setExpandedEpochs] = useState<Set<string>>(new Set());

  // Toggle epoch expansion
  const toggleEpoch = (epochId: string) => {
    setExpandedEpochs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(epochId)) {
        newSet.delete(epochId);
      } else {
        newSet.add(epochId);
      }
      return newSet;
    });
  };

  // Get all epochs and group orders by epoch (show all, not just last 5)
  const recentEpochs = visualizations.slice().reverse();

  // Group epochs with their details - show all epochs now, not just ones with orders
  const epochsWithOrders = recentEpochs.map(viz => {
    const allOrders: (Order & { blockIndex: number })[] = [];

    console.log(`Processing epoch ${viz.epoch.id}, blocks count: ${viz.epoch.blocks.length}`);

    viz.epoch.blocks.forEach((block: any, blockIndex: number) => {
      console.log(`Block ${block.id}, orders count: ${block.orders.length}`);
      block.orders.forEach((order: any) => {
        allOrders.push({
          ...order,
          blockIndex
        });
      });
    });

    // Sort orders within each epoch by creation time (newest first)
    allOrders.sort((a, b) => {
      const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
      const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
      return bTime - aTime;
    });

    // Group orders by status within this epoch
    const pending = allOrders.filter(o => o.status === 'pending' || o.status === 'in-block');
    const matching = allOrders.filter(o => o.status === 'matching');
    const executed = allOrders.filter(o => o.status === 'executed');

    return {
      epoch: viz.epoch,
      orders: allOrders,
      pending,
      matching,
      executed,
      totalOrders: allOrders.length,
      hasOrders: allOrders.length > 0
    };
  }); // Show all epochs now, even empty ones

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
      case 'in-block': return 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30';
      case 'matching': return 'text-purple-400 bg-purple-900/20 border-purple-500/30';
      case 'executed': return 'text-green-400 bg-green-900/20 border-green-500/30';
      default: return 'text-gray-400 bg-gray-800 border-gray-700';
    }
  };

  const renderOrder = (order: Order & { blockIndex: number }, _epochIndex: number) => {
    const isBuy = order.side === 'buy';

    return (
      <div
        key={order.id}
        className="bg-gray-800/50 rounded-lg p-2 space-y-1 border border-gray-700/50 hover:border-gray-600 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={cn(
              'p-1 rounded',
              isBuy ? 'bg-green-900/30' : 'bg-red-900/30'
            )}>
              {isBuy ? (
                <ArrowTrendingUpIcon className="h-3 w-3 text-green-400" />
              ) : (
                <ArrowTrendingDownIcon className="h-3 w-3 text-red-400" />
              )}
            </div>

            <div className="flex items-center space-x-2">
              <span className={cn(
                'text-xs font-medium',
                isBuy ? 'text-green-400' : 'text-red-400'
              )}>
                {order.side.toUpperCase()}
              </span>
              <span className="text-gray-300 text-xs">
                {ObfuscationUtils.blurValue(order.amount.toFixed(4), 'low')} ETH
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {order.executedPrice && (
              <div className="text-xs text-green-400">
                ${order.executedPrice.toFixed(0)}
              </div>
            )}
            <div className={cn(
              'text-xs px-1.5 py-0.5 rounded border',
              getStatusColor(order.status)
            )}>
              {order.status}
            </div>
          </div>
        </div>

        {(order as any).anonymousId && (
          <div className="text-xs text-gray-500">
            {ObfuscationUtils.shortenId((order as any).anonymousId)}
          </div>
        )}
      </div>
    );
  };

  const renderEpochGroup = (epochGroup: {
    epoch: Epoch;
    orders: (Order & { blockIndex: number })[];
    pending: typeof epochsWithOrders[0]['pending'];
    matching: typeof epochsWithOrders[0]['matching'];
    executed: typeof epochsWithOrders[0]['executed'];
    totalOrders: number;
  }) => {
    const { epoch, orders, pending, matching, executed } = epochGroup;
    const isExpanded = expandedEpochs.has(epoch.id);

    return (
      <div key={epoch.id} className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
        {/* Epoch Header */}
        <div
          className="p-4 bg-gray-800/50 border-b border-gray-700 cursor-pointer hover:bg-gray-800/70 transition-colors select-none hover:border-blue-500/50"
          onClick={() => {
            toggleEpoch(epoch.id);
          }}
          style={{ minHeight: '60px' }} // Ensure minimum clickable area
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-200">
                  Epoch #{epoch.index + 1}
                </span>
                <div className={cn(
                  'text-xs px-2 py-1 rounded',
                  epoch.status === 'completed' ? 'bg-green-900/50 text-green-400' :
                  epoch.status === 'matching' ? 'bg-yellow-900/50 text-yellow-400' :
                  'bg-blue-900/50 text-blue-400'
                )}>
                  {epoch.status}
                </div>
              </div>

              <div className="text-xs text-gray-400">
                {orders.length} orders
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Status counts */}
              <div className="flex items-center space-x-2 text-xs">
                {pending.length > 0 && (
                  <span className="text-yellow-400">
                    {pending.length} pending
                  </span>
                )}
                {matching.length > 0 && (
                  <span className="text-purple-400">
                    {matching.length} matching
                  </span>
                )}
                {executed.length > 0 && (
                  <span className="text-green-400">
                    {executed.length} executed
                  </span>
                )}
              </div>

              {/* Expand/Collapse indicator */}
              <div className={cn(
                'transition-transform duration-200',
                isExpanded ? 'rotate-90' : ''
              )}>
                <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Orders within this epoch */}
        {isExpanded && (
          <div className="p-3 space-y-2 max-h-[400px] overflow-y-auto">
            {/* Show message if no orders */}
            {orders.length === 0 ? (
              <div className="text-center py-4 text-gray-500 text-sm">
                No orders in this epoch yet
              </div>
            ) : (
              <>
                {/* Group by status for clarity */}
                {pending.length > 0 && (
                  <div>
                    <div className="text-xs text-yellow-400 font-medium mb-1">Pending Orders</div>
                    <div className="space-y-1">
                      {pending.map(order => renderOrder(order, epoch.index))}
                    </div>
                  </div>
                )}

                {matching.length > 0 && (
                  <div>
                    <div className="text-xs text-purple-400 font-medium mb-1">Matching Orders</div>
                    <div className="space-y-1">
                      {matching.map(order => renderOrder(order, epoch.index))}
                    </div>
                  </div>
                )}

                {executed.length > 0 && (
                  <div>
                    <div className="text-xs text-green-400 font-medium mb-1">Executed Orders</div>
                    <div className="space-y-1">
                      {executed.map(order => renderOrder(order, epoch.index))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-200">Trading Activity by Epoch</h3>
        <div className="flex items-center space-x-1 text-xs text-blue-400">
          <ClockIcon className="h-3 w-3" />
          <span>Click any epoch to expand</span>
        </div>
      </div>

      {/* Epoch Groups */}
      {epochsWithOrders.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <ClockIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <div>No orders yet</div>
          <div className="text-xs text-gray-400 mt-1">Place orders to see them grouped by epoch</div>
        </div>
      ) : (
        <div className="space-y-3 max-h-[700px] overflow-y-auto">
          {epochsWithOrders.map(renderEpochGroup)}
        </div>
      )}

      {/* Summary Stats at bottom */}
      <div className="border-t border-gray-700 pt-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gray-800 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-yellow-400">
              {epochsWithOrders.reduce((sum, group) => sum + group.pending.length, 0)}
            </div>
            <div className="text-xs text-gray-400">Pending</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-purple-400">
              {epochsWithOrders.reduce((sum, group) => sum + group.matching.length, 0)}
            </div>
            <div className="text-xs text-gray-400">Matching</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-green-400">
              {epochsWithOrders.reduce((sum, group) => sum + group.executed.length, 0)}
            </div>
            <div className="text-xs text-gray-400">Executed</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradeList;