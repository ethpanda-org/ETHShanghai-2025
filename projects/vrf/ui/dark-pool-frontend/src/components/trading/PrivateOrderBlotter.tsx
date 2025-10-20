import React, { useState, useEffect } from 'react';
import { ClockIcon, CheckCircleIcon, XCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { DelayedFeedback } from '../privacy/index.js';
import { ObfuscationUtils, DelayUtils } from '../../utils/index.js';
import { cn } from '../../utils/cn.js';

interface Order {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  amount: number;
  price?: number;
  status: 'pending' | 'matching' | 'executed' | 'expired' | 'cancelled';
  createdAt: Date;
  executedAt?: Date;
  executedPrice?: number;
}

interface PrivateOrderBlotterProps {
  orders: Order[];
  className?: string;
}

export const PrivateOrderBlotter: React.FC<PrivateOrderBlotterProps> = ({
  orders,
  className = ''
}) => {
  const [displayOrders, setDisplayOrders] = useState<Order[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const updateOrders = async () => {
      setIsUpdating(true);

      // Add random delay to prevent timing analysis
      await DelayUtils.randomDelay(500, 1500);

      // Simulate status updates with privacy delays
      const updatedOrders = orders.map(order => {
        if (order.status === 'pending' && Math.random() > 0.7) {
          return { ...order, status: 'matching' as const };
        }
        if (order.status === 'matching' && Math.random() > 0.8) {
          return {
            ...order,
            status: 'executed' as const,
            executedAt: new Date(),
            executedPrice: order.price ? order.price * (1 + (Math.random() - 0.5) * 0.002) : undefined
          };
        }
        return order;
      });

      setDisplayOrders(updatedOrders);
      setIsUpdating(false);
    };

    updateOrders();
  }, [orders]);

  const getStatusIcon = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="h-4 w-4 text-yellow-400" />;
      case 'matching':
        return <ArrowPathIcon className="h-4 w-4 text-blue-400 animate-spin" />;
      case 'executed':
        return <CheckCircleIcon className="h-4 w-4 text-green-400" />;
      case 'expired':
      case 'cancelled':
        return <XCircleIcon className="h-4 w-4 text-red-400" />;
    }
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-400';
      case 'matching':
        return 'text-blue-400';
      case 'executed':
        return 'text-green-400';
      case 'expired':
      case 'cancelled':
        return 'text-red-400';
    }
  };

  const renderOrder = (order: Order) => {
    const isExecuted = order.status === 'executed';
    const showDetails = isExecuted || order.status === 'matching';

    return (
      <div
        key={order.id}
        className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-3">
            {getStatusIcon(order.status)}
            <span className="font-medium text-gray-200">{order.symbol}</span>
            <span
              className={cn(
                'px-2 py-1 text-xs font-medium rounded',
                order.side === 'buy'
                  ? 'bg-green-900/50 text-green-400'
                  : 'bg-red-900/50 text-red-400'
              )}
            >
              {order.side.toUpperCase()}
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm text-gray-400">Status</div>
              <DelayedFeedback
                status={order.status}
                className={cn('text-sm font-medium', getStatusColor(order.status))}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Size: </span>
            <span className="font-mono text-gray-300">
              {ObfuscationUtils.blurValue(order.amount.toFixed(4), 'medium')}
            </span>
          </div>

          {order.price && (
            <div>
              <span className="text-gray-400">Price: </span>
              <span className="font-mono text-gray-300">
                {ObfuscationUtils.blurValue(`$${order.price.toFixed(2)}`, 'medium')}
              </span>
            </div>
          )}

          {isExecuted && order.executedPrice && (
            <div>
              <span className="text-gray-400">Executed: </span>
              <span className="font-mono text-green-400">
                ${order.executedPrice.toFixed(2)}
              </span>
            </div>
          )}

          <div>
            <span className="text-gray-400">Time: </span>
            <span className="text-gray-300">
              {ObfuscationUtils.privateTimestamp(order.createdAt)}
            </span>
          </div>
        </div>

        {order.status === 'matching' && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <div className="flex items-center space-x-2 text-xs text-gray-400">
              <ArrowPathIcon className="h-3 w-3 animate-spin" />
              <span>Searching for counterparties...</span>
            </div>
          </div>
        )}

        {isExecuted && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <div className="flex items-center justify-between text-xs">
              <span className="text-green-400">Trade executed successfully</span>
              <span className="text-gray-500">
                {order.executedAt && ObfuscationUtils.privateTimestamp(order.executedAt)}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn('bg-gray-900 rounded-xl p-6', className)}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-200">Order History</h3>
        {isUpdating && (
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <ArrowPathIcon className="h-4 w-4 animate-spin" />
            <span>Updating...</span>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {displayOrders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="mb-2">No orders yet</div>
            <div className="text-sm">Place your first trade to see it here</div>
          </div>
        ) : (
          displayOrders.map(renderOrder)
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-800">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Private Order Matching</span>
          <span>{displayOrders.length} orders</span>
        </div>
      </div>
    </div>
  );
};