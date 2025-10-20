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

      // Poll for order count updates
      const interval = setInterval(async () => {
        try {
          const newCount = await darkPoolService.getOrderCount();
          if (newCount !== orderCount) {
            setOrderCount(newCount);
            // Refresh all orders
            const allOrders = await darkPoolService.getAllOrders();
            console.log('All orders:', allOrders);
          }
        } catch (err) {
          console.error('Error polling orders:', err);
        }
      }, 2000);

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
              <p>No transactions yet</p>
              <p className="text-sm mt-2">Place orders in other windows to see them here</p>
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
        <h3 className="text-sm font-medium text-blue-400 mb-2">Multi-Window Testing</h3>
        <ul className="text-xs text-gray-300 space-y-1">
          <li>• Open this page in multiple browser windows</li>
          <li>• Use different MetaMask accounts in each window</li>
          <li>• Place orders to see real-time updates</li>
          <li>• All transactions will appear here</li>
        </ul>
      </div>
    </div>
  );
};