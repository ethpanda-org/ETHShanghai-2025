import React, { useState, useEffect } from 'react';
import { darkPoolService } from '../../services/darkPoolContract';
import { useWallet } from '../../hooks/useWallet';
import { cn } from '../../utils/cn';

interface Transaction {
  hash: string;
  from: string;
  to: string;
  timestamp: Date;
  type: 'buy' | 'sell';
  amount: string;
  price?: string;
  status: 'pending' | 'confirmed' | 'failed';
  blockNumber?: number;
}

export const TransactionMonitor: React.FC = () => {
  const { wallet } = useWallet();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [orderCount, setOrderCount] = useState<number>(0);

  useEffect(() => {
    if (wallet && !isListening) {
      initializeListener();
    }
  }, [wallet]);

  const initializeListener = async () => {
    try {
      await darkPoolService.initialize();
      setIsListening(true);

      // Get initial order count
      const count = await darkPoolService.getOrderCount();
      setOrderCount(count);

      // Listen for new orders
      darkPoolService.listenToOrders((orderId, trader, isBuy, amount, price) => {
        const newTx: Transaction = {
          hash: orderId,
          from: trader,
          to: darkPoolService.getContractAddress(),
          timestamp: new Date(),
          type: isBuy ? 'buy' : 'sell',
          amount,
          price,
          status: 'confirmed'
        };

        setTransactions(prev => [newTx, ...prev.slice(0, 9)]); // Keep last 10
      });

      // Initial load of all existing orders
      const loadExistingOrders = async () => {
        try {
          const allOrders = await darkPoolService.getAllOrders();
          console.log('Loading existing orders from blockchain:', allOrders);

          const existingTransactions: Transaction[] = allOrders.map(order => ({
            hash: order.id,
            from: order.trader,
            to: darkPoolService.getContractAddress(),
            timestamp: new Date(order.timestamp * 1000), // Convert from timestamp
            type: order.isBuy ? 'buy' : 'sell',
            amount: order.amount,
            price: order.price,
            status: order.executed ? 'confirmed' : 'pending'
          }));

          // Sort by timestamp (newest first) and take last 10
          existingTransactions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
          setTransactions(existingTransactions.slice(0, 10));

        } catch (error) {
          console.error('Failed to load existing orders:', error);
        }
      };

      // Load existing orders immediately
      await loadExistingOrders();

      // Poll for order count updates and refresh all orders
      const interval = setInterval(async () => {
        try {
          const newCount = await darkPoolService.getOrderCount();
          if (newCount !== orderCount) {
            setOrderCount(newCount);
            // Refresh all orders when count changes
            await loadExistingOrders();
          }
        } catch (err) {
          console.error('Error polling orders:', err);
        }
      }, 3000); // Poll every 3 seconds

      return () => {
        clearInterval(interval);
        darkPoolService.disconnect();
      };
    } catch (err: any) {
      console.error('Error initializing listener:', err);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString();
  };

  const getTypeColor = (type: 'buy' | 'sell') => {
    return type === 'buy' ? 'text-green-400' : 'text-red-400';
  };

  const getTypeBg = (type: 'buy' | 'sell') => {
    return type === 'buy' ? 'bg-green-900/20 border-green-500/30' : 'bg-red-900/20 border-red-500/30';
  };

  return (
    <div className="bg-gray-900 rounded-xl p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-white">Transaction Monitor</h2>
        <div className={cn(
          'w-2 h-2 rounded-full',
          isListening ? 'bg-green-400' : 'bg-gray-600'
        )} />
      </div>

      {wallet ? (
        <div className="space-y-3">
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No transactions found on blockchain</p>
              <p className="text-sm mt-2">Place orders to see them here</p>
            </div>
          ) : (
            transactions.map((tx, index) => (
              <div
                key={`${tx.hash}-${index}`}
                className={cn(
                  'p-4 rounded-lg border transition-all hover:shadow-lg',
                  getTypeBg(tx.type)
                )}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className={cn('text-sm font-medium', getTypeColor(tx.type))}>
                        {tx.type.toUpperCase()}
                      </span>
                      <span className="text-gray-400 text-sm">
                        {formatTime(tx.timestamp)}
                      </span>
                    </div>
                    <div className="mt-1 space-y-1">
                      <p className="text-sm text-gray-300">
                        From: {formatAddress(tx.from)}
                      </p>
                      <p className="text-sm text-gray-300">
                        Amount: {tx.amount} ETH
                      </p>
                      {tx.price && (
                        <p className="text-sm text-gray-300">
                          Price: ${tx.price}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">
                      {tx.status}
                    </p>
                    {tx.blockNumber && (
                      <p className="text-xs text-gray-500 mt-1">
                        Block: {tx.blockNumber}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>Connect wallet to monitor transactions</p>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
        <h3 className="text-sm font-medium text-blue-400 mb-2">Blockchain Transaction Monitor</h3>
        <ul className="text-xs text-gray-300 space-y-1">
          <li>• Shows all orders from the smart contract</li>
          <li>• Updates automatically when new orders are placed</li>
          <li>• Displays both your orders and orders from other users</li>
          <li>• Data is fetched directly from Hardhat blockchain</li>
        </ul>
        <div className="mt-2 pt-2 border-t border-blue-500/30">
          <p className="text-xs text-blue-300">Total Orders on Contract: {orderCount}</p>
        </div>
      </div>
    </div>
  );
};