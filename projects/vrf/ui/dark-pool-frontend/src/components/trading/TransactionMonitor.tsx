import React, { useState, useEffect } from 'react';
import { darkPoolService } from '../../services/darkPoolContract';
import { useWallet } from '../../hooks/useWallet';
import { cn } from '../../utils/cn';

interface Transaction {
  hash: string;
  from: string;
  to: string;
  timestamp: Date;
  type: 'buy' | 'sell' | 'match';
  amount: string;
  price?: string;
  status: 'pending' | 'confirmed' | 'failed' | 'matched';
  blockNumber?: number;
  relatedOrderId?: string; // For match events
  matchId?: string; // Unique match identifier
}

export const TransactionMonitor: React.FC = () => {
  const { wallet } = useWallet();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [orderCount, setOrderCount] = useState<number>(0);
  const [isMatching, setIsMatching] = useState(false);

  useEffect(() => {
    if (wallet && !isListening) {
      initializeListener();
    }
  }, [wallet]);

  const initializeListener = async () => {
    try {
      console.log('🔗 Initializing DarkPool service...');
      await darkPoolService.initialize();
      setIsListening(true);

      console.log('📊 Getting initial order count...');
      const count = await darkPoolService.getOrderCount();
      setOrderCount(count);
      console.log('📈 Initial order count:', count);

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

        // Notify other windows about the new order
        localStorage.setItem('darkpool-new-order', JSON.stringify({
          timestamp: Date.now(),
          orderId,
          trader,
          isBuy,
          amount,
          price
        }));

        // Try to match orders after each new order
        setTimeout(async () => {
          try {
            console.log('🔄 Attempting to match orders after new order...');
            const result = await darkPoolService.matchOrders();

            // If matching succeeded, notify other windows
            if (result && result.buyOrderId) {
              localStorage.setItem('darkpool-match-event', JSON.stringify({
                timestamp: Date.now(),
                result: result
              }));
            }
          } catch (error) {
            console.log('ℹ️ No matching orders available');
          }
        }, 1000);
      });

      // Listen for match events
      darkPoolService.listenToMatches((buyOrderId, sellOrderId, amount, price) => {
        console.log('🤝 Creating match transaction display...');

        // Generate a unique match ID using timestamp and order IDs
        const matchId = `MATCH-${Date.now()}-${buyOrderId.slice(0, 6)}-${sellOrderId.slice(0, 6)}`;

        // Create a match transaction
        const matchTx: Transaction = {
          hash: matchId,
          from: 'Match Engine',
          to: darkPoolService.getContractAddress(),
          timestamp: new Date(),
          type: 'match',
          amount,
          price,
          status: 'matched',
          relatedOrderId: `${buyOrderId}/${sellOrderId}`,
          matchId
        };

        setTransactions(prev => [matchTx, ...prev.slice(0, 19)]); // Keep last 20 transactions

        // Update the status of matched orders
        setTransactions(prev => prev.map(tx =>
          (tx.hash === buyOrderId || tx.hash === sellOrderId)
            ? { ...tx, status: 'matched' as const }
            : tx
        ));

        // Notify other windows about the match
        localStorage.setItem('darkpool-match-event', JSON.stringify({
          timestamp: Date.now(),
          matchId,
          buyOrderId,
          sellOrderId,
          amount,
          price
        }));
      });

      // Initial load of all existing orders and match history
      const loadExistingOrders = async () => {
        try {
          console.log('🔄 Loading existing orders and matches from blockchain...');

          // Load both orders and matches in parallel
          const [allOrders, allMatches] = await Promise.all([
            darkPoolService.getAllOrders(),
            darkPoolService.getAllMatches().catch(() => []) // Fallback to empty array if getAllMatches fails
          ]);

          console.log('📦 Raw orders from contract:', allOrders);
          console.log('🤝 Raw matches from contract:', allMatches);

          // Process regular orders
          const orderTransactions: Transaction[] = allOrders.map(order => ({
            hash: order.id,
            from: order.trader,
            to: darkPoolService.getContractAddress(),
            timestamp: new Date(order.timestamp * 1000), // Convert from timestamp
            type: order.isBuy ? 'buy' : 'sell',
            amount: order.amount,
            price: order.price,
            status: order.executed ? 'matched' : 'pending'
          }));

          // Process match transactions from blockchain match events
          const matchTransactions: Transaction[] = allMatches.map((match, index) => ({
            hash: `MATCH-${match.matchId || index}`,
            from: 'Match Engine',
            to: darkPoolService.getContractAddress(),
            timestamp: new Date(match.timestamp * 1000), // Convert from timestamp
            type: 'match' as const,
            amount: match.amount,
            price: match.price,
            status: 'matched' as const,
            relatedOrderId: `${match.buyOrderId}/${match.sellOrderId}`,
            matchId: match.matchId
          }));

          // Create inferred match transactions from executed orders (for backward compatibility)
          const executedOrders = allOrders.filter(order => order.executed);
          const inferredMatchTransactions: Transaction[] = [];

          // Group executed orders by price and time to infer matches
          const buyOrders = executedOrders.filter(order => order.isBuy);
          const sellOrders = executedOrders.filter(order => !order.isBuy);

          // Create match transactions by pairing compatible executed orders
          buyOrders.forEach(buyOrder => {
            const matchingSell = sellOrders.find(sellOrder =>
              Math.abs(parseFloat(sellOrder.price) - parseFloat(buyOrder.price)) <= parseFloat(buyOrder.price) * 0.01 && // Within 1% price
              Math.abs(new Date(sellOrder.timestamp * 1000).getTime() - new Date(buyOrder.timestamp * 1000).getTime()) <= 60000 // Within 1 minute
            );

            if (matchingSell) {
              inferredMatchTransactions.push({
                hash: `INFERRED-${buyOrder.id.slice(0, 6)}-${matchingSell.id.slice(0, 6)}`,
                from: 'Match Engine',
                to: darkPoolService.getContractAddress(),
                timestamp: new Date(Math.max(buyOrder.timestamp, matchingSell.timestamp) * 1000),
                type: 'match',
                amount: Math.min(parseFloat(buyOrder.amount), parseFloat(matchingSell.amount)).toString(),
                price: ((parseFloat(buyOrder.price) + parseFloat(matchingSell.price)) / 2).toString(),
                status: 'matched',
                relatedOrderId: `${buyOrder.id.slice(0, 8)}/${matchingSell.id.slice(0, 8)}`
              });

              // Remove the matched sell order to avoid duplicate matches
              const index = sellOrders.indexOf(matchingSell);
              if (index > -1) {
                sellOrders.splice(index, 1);
              }
            }
          });

          // Combine all transactions: orders first, then blockchain matches, then inferred matches
          const allTransactions = [...orderTransactions, ...matchTransactions, ...inferredMatchTransactions];

          // Sort by timestamp (newest first) and take last 25 to show more history
          allTransactions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
          const finalTransactions = allTransactions.slice(0, 25);

          console.log('📋 Processed transactions with match history:', finalTransactions);
          console.log(`📊 Summary: ${orderTransactions.length} orders, ${matchTransactions.length} blockchain matches, ${inferredMatchTransactions.length} inferred matches`);
          setTransactions(finalTransactions);

        } catch (error) {
          console.error('❌ Failed to load existing orders and matches:', error);
        }
      };

      // Load existing orders immediately
      await loadExistingOrders();

      // Initial automatic matching attempt
      setTimeout(async () => {
        try {
          console.log('🚀 Initial automatic matching on startup...');
          await darkPoolService.matchOrders();
        } catch (error) {
          console.log('ℹ️ No matching orders available on startup');
        }
      }, 1500);

      // Poll for order count updates and refresh all orders more frequently
      const interval = setInterval(async () => {
        try {
          // Always refresh orders to ensure cross-window synchronization
          await loadExistingOrders();
          const newCount = await darkPoolService.getOrderCount();
          setOrderCount(newCount);

          // Try automatic matching on each poll if order count changed
          if (newCount > orderCount) {
            setTimeout(async () => {
              try {
                console.log('🔄 Auto-matching after new orders detected...');
                await darkPoolService.matchOrders();
              } catch (error) {
                console.log('ℹ️ No compatible orders found during auto-match');
              }
            }, 500); // Small delay to ensure blockchain is updated
          }
        } catch (err) {
          console.error('Error polling orders:', err);
        }
      }, 2000); // Poll every 2 seconds for better synchronization

      // Additional periodic matching check (every 10 seconds)
      const matchingInterval = setInterval(async () => {
        try {
          console.log('⏰ Periodic automatic matching check...');
          const result = await darkPoolService.matchOrders();
          if (result && result.buyOrderId) {
            console.log('✅ Periodic matching found trades:', result);

            // Notify other windows about the match
            localStorage.setItem('darkpool-match-event', JSON.stringify({
              timestamp: Date.now(),
              result: result
            }));
          }
        } catch (error) {
          // Silent fail for periodic checks
        }
      }, 10000);

      // Listen for cross-window updates
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'darkpool-match-event' && e.newValue) {
          try {
            const matchData = JSON.parse(e.newValue);
            console.log('🔄 Received match event from another window:', matchData);

            // Refresh transactions to show the new match
            loadExistingOrders();
          } catch (error) {
            console.error('Error processing cross-window match event:', error);
          }
        }

        if (e.key === 'darkpool-new-order' && e.newValue) {
          try {
            const orderData = JSON.parse(e.newValue);
            console.log('📦 Received new order event from another window:', orderData);

            // Refresh transactions and try matching
            loadExistingOrders();
            setTimeout(async () => {
              try {
                await darkPoolService.matchOrders();
              } catch (error) {
                console.log('ℹ️ No matches found after cross-window order');
              }
            }, 1000);
          } catch (error) {
            console.error('Error processing cross-window order event:', error);
          }
        }
      };

      window.addEventListener('storage', handleStorageChange);

      return () => {
        clearInterval(interval);
        clearInterval(matchingInterval);
        window.removeEventListener('storage', handleStorageChange);
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

  const getTypeColor = (type: 'buy' | 'sell' | 'match') => {
    switch (type) {
      case 'buy': return 'text-green-400';
      case 'sell': return 'text-red-400';
      case 'match': return 'text-purple-400';
      default: return 'text-gray-400';
    }
  };

  const getTypeBg = (type: 'buy' | 'sell' | 'match') => {
    switch (type) {
      case 'buy': return 'bg-green-900/20 border-green-500/30';
      case 'sell': return 'bg-red-900/20 border-red-500/30';
      case 'match': return 'bg-purple-900/20 border-purple-500/30';
      default: return 'bg-gray-800 border-gray-700';
    }
  };

  const getStatusColor = (status: 'pending' | 'confirmed' | 'failed' | 'matched') => {
    switch (status) {
      case 'pending': return 'text-yellow-400';
      case 'confirmed': return 'text-green-400';
      case 'failed': return 'text-red-400';
      case 'matched': return 'text-purple-400';
      default: return 'text-gray-400';
    }
  };

  // Separate transactions by type for better organization
  const matchTransactions = transactions.filter(tx => tx.type === 'match');
  const regularTransactions = transactions.filter(tx => tx.type !== 'match');

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
          {/* Manual Match Button */}
          <div className="flex justify-center">
            <button
              onClick={async () => {
                setIsMatching(true);
                try {
                  console.log('🔄 Manually triggering order matching...');
                  const result = await darkPoolService.matchOrders();
                  console.log('✅ Manual match result:', result);

                  if (result && result.buyOrderId && result.sellOrderId) {
                    // Show success notification
                    alert(`🤝 Orders matched successfully!\n\nBuy: ${result.buyOrderId.slice(0, 10)}...\nSell: ${result.sellOrderId.slice(0, 10)}...\nAmount: ${result.amount} ETH\nPrice: $${result.price}`);
                  } else {
                    alert('ℹ️ No compatible orders found for matching.\n\nTry placing both buy and sell orders with compatible prices.');
                  }
                } catch (error) {
                  console.error('❌ Failed to match orders:', error);
                  alert(`Failed to match orders: ${error instanceof Error ? error.message : 'Unknown error'}`);
                } finally {
                  setIsMatching(false);
                }
              }}
              disabled={isMatching}
              className={cn(
                'px-4 py-2 rounded-lg font-medium transition-colors text-sm',
                isMatching
                  ? 'bg-gray-600 text-gray-300 cursor-wait'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              )}
            >
              {isMatching ? '🔄 Matching...' : '🤝 Match Orders Now'}
            </button>
          </div>
          {/* Match History Section */}
          {matchTransactions.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-purple-400 mb-3 flex items-center">
                🤝 Match History ({matchTransactions.length})
              </h3>
              <div className="space-y-2">
                {matchTransactions.slice(0, 5).map((tx, index) => (
                  <div
                    key={`match-${tx.hash}-${index}`}
                    className={cn(
                      'p-4 rounded-lg border transition-all hover:shadow-lg bg-purple-900/10 border-purple-500/30',
                      'border-l-4 border-l-purple-500'
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-purple-400">
                            🤝 {tx.hash.startsWith('INFERRED') ? 'INFERRED MATCH' : 'MATCH'}
                          </span>
                          <span className="text-gray-400 text-sm">
                            {formatTime(tx.timestamp)}
                          </span>
                          {tx.matchId && (
                            <span className="text-xs text-purple-300 bg-purple-800/30 px-2 py-1 rounded">
                              ID: {tx.matchId.slice(0, 8)}...
                            </span>
                          )}
                        </div>
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-300">
                              <span className="text-green-400">Amount:</span> {tx.amount} ETH
                            </p>
                            {tx.price && (
                              <p className="text-sm text-gray-300">
                                <span className="text-blue-400">Price:</span> ${tx.price}
                              </p>
                            )}
                          </div>
                          {tx.relatedOrderId && (
                            <div className="text-xs text-purple-300 bg-purple-800/20 p-2 rounded">
                              <p className="font-medium mb-1">Matched Orders:</p>
                              <div className="flex justify-between">
                                <span>Buy: {tx.relatedOrderId.split('/')[0]?.slice(0, 10)}...</span>
                                <span>Sell: {tx.relatedOrderId.split('/')[1]?.slice(0, 10)}...</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-purple-400">
                          {tx.status}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {matchTransactions.length > 5 && (
                  <div className="text-center py-2">
                    <p className="text-xs text-purple-300">
                      +{matchTransactions.length - 5} more matches in history
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Regular Orders Section */}
          <div>
            <h3 className="text-lg font-medium text-gray-400 mb-3 flex items-center">
              📊 Order History ({regularTransactions.length})
            </h3>
            {regularTransactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No orders found on blockchain</p>
                <p className="text-sm mt-2">Place orders to see them here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {regularTransactions.map((tx, index) => (
                  <div
                    key={`order-${tx.hash}-${index}`}
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
                        <p className={cn('text-xs font-medium', getStatusColor(tx.status))}>
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
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>Connect wallet to monitor transactions</p>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
        <h3 className="text-sm font-medium text-blue-400 mb-2">🚀 Enhanced Auto-Matching & History System</h3>
        <ul className="text-xs text-gray-300 space-y-1">
          <li>• <span className="text-green-400">✅ Startup matching</span> - Automatically matches existing orders on load</li>
          <li>• <span className="text-yellow-400">⚡ Real-time matching</span> - Instant matching when new orders arrive</li>
          <li>• <span className="text-purple-400">⏰ Periodic checks</span> - Background matching every 10 seconds</li>
          <li>• <span className="text-cyan-400">🔄 Cross-window sync</span> - Updates across all browser windows</li>
          <li>• <span className="text-orange-400">📊 Polling updates</span> - Refreshes every 2 seconds</li>
          <li>• <span className="text-purple-300">🤝 Match history</span> - Separate display for all matched deals</li>
        </ul>
        <div className="mt-2 pt-2 border-t border-blue-500/30">
          <p className="text-xs text-blue-300">Total Orders: {orderCount} | Matches: {matchTransactions.length} | Auto-Matching: Active</p>
          <p className="text-xs text-green-300 mt-1">🤖 Matching triggers: Startup + New Orders + Periodic + Cross-window</p>
          <p className="text-xs text-purple-300 mt-1">📋 History: Shows blockchain matches + inferred matches for backward compatibility</p>
        </div>
      </div>
    </div>
  );
};