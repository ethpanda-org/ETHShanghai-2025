import { useEffect, useState, useCallback, useRef } from 'react';
import { blockEngineWithChain } from '../services/blockEngineWithChain';
import { web3Service } from '../services/web3';
import type {
  MatchingEngineState,
  EpochVisualization,
  Order,
  BlockMatchingConfig,
  Epoch
} from '../types/block';

export function useBlockEngineWithChain(config?: {
  demoMode?: 'static' | 'dynamic';
  speed?: 'normal' | 'fast' | 'ultra-fast';
  blockchainEnabled?: boolean;
}) {
  const { demoMode = 'dynamic', speed = 'fast', blockchainEnabled = true } = config || {};

  const [state, setState] = useState<MatchingEngineState>(blockEngineWithChain.getState());
  const [visualizations, setVisualizations] = useState<EpochVisualization[]>([]);
  const [demoDataLoaded, setDemoDataLoaded] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
  const [blockchainEnabledState, setBlockchainEnabledState] = useState(blockchainEnabled);
  const demoDataRef = useRef<ReturnType<typeof generateDemoData> | null>(null);

  // Update blockchain enabled state when prop changes
  useEffect(() => {
    console.log('🔄 Prop blockchainEnabled changed to:', blockchainEnabled);
    setBlockchainEnabledState(blockchainEnabled);
  }, [blockchainEnabled]);

  // Initialize blockchain connection
  const connectWallet = useCallback(async () => {
    try {
      const address = await web3Service.connectWallet();
      setWalletAddress(address);
      setIsConnected(true);

      const correctNetwork = await web3Service.isCorrectNetwork();
      setIsCorrectNetwork(correctNetwork);

      if (correctNetwork) {
        console.log('Connected to Hardhat network with address:', address);
      }

      return address;
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  }, []);

  // Check network connection
  const checkNetwork = useCallback(async () => {
    if (isConnected) {
      const correctNetwork = await web3Service.isCorrectNetwork();
      setIsCorrectNetwork(correctNetwork);
      return correctNetwork;
    }
    return false;
  }, [isConnected]);

  useEffect(() => {
    // Configure block engine for demo mode
    if (demoMode === 'dynamic') {
      // Speed configurations for demo
      const speedConfig = {
        normal: { BLOCK_DURATION: 5000, EPOCH_MATCHING_DELAY: 1000 }, // 5s per block
        fast: { BLOCK_DURATION: 2000, EPOCH_MATCHING_DELAY: 500 },   // 2s per block
        'ultra-fast': { BLOCK_DURATION: 1000, EPOCH_MATCHING_DELAY: 200 } // 1s per block
      };

      // Reconfigure the block engine with demo speed
      blockEngineWithChain.updateConfig(speedConfig[speed]);
    }

    // Load demo data on first mount
    if (!demoDataLoaded) {
      // Initialize with empty data - no fabricated trading data
      demoDataRef.current = { epochs: [], blocks: [], orders: [] };

      // Start the engine for real-time data only
      if (demoMode === 'dynamic') {
        blockEngineWithChain.start();

        // Ensure there's at least one epoch for immediate interaction
        setTimeout(() => {
          blockEngineWithChain.getState();
        }, 100);
      }

      setDemoDataLoaded(true);
    }

    // Subscribe to block engine updates
    const unsubscribe = blockEngineWithChain.subscribe((newState) => {
      setState(newState);
      setVisualizations(blockEngineWithChain.getVisualizationData());
    });

    // Initial visualization data
    setVisualizations(blockEngineWithChain.getVisualizationData());

    // Force another update after a short delay to ensure epochs are visible
    setTimeout(() => {
      setVisualizations(blockEngineWithChain.getVisualizationData());
    }, 100);

    // Set blockchain enabled state
    blockEngineWithChain.setBlockchainEnabled(blockchainEnabledState);

    return unsubscribe;
  }, [demoDataLoaded, blockchainEnabledState]);

  // Check wallet connection when blockchain mode is enabled
  useEffect(() => {
    if (blockchainEnabledState) {
      // Check if wallet is already connected when blockchain mode is enabled
      const checkExistingConnection = async () => {
        try {
          if (window.ethereum) {
            const accounts = await window.ethereum.request({
              method: 'eth_accounts'
            });

            if (accounts.length > 0) {
              // Wallet is already connected, update state
              setIsConnected(true);
              setWalletAddress(accounts[0]);

              // Check network
              const correctNetwork = await web3Service.isCorrectNetwork();
              setIsCorrectNetwork(correctNetwork);

              console.log('Wallet already connected:', {
                address: accounts[0],
                correctNetwork
              });
            }
          }
        } catch (error) {
          console.error('Failed to check existing connection:', error);
        }
      };

      checkExistingConnection();
    }
  }, [blockchainEnabledState]);

  // Toggle blockchain integration
  const toggleBlockchain = useCallback((enabled: boolean) => {
    setBlockchainEnabledState(enabled);
    blockEngineWithChain.setBlockchainEnabled(enabled);
  }, []);

  const addOrder = useCallback(async (orderData: Omit<Order, 'id' | 'status' | 'createdAt' | 'blockId' | 'epochId'>) => {
    // If blockchain is enabled, ensure wallet is connected
    if (blockchainEnabledState && !isConnected) {
      await connectWallet();
    }

    // Check if connected to correct network
    if (blockchainEnabledState && !isCorrectNetwork) {
      const correctNetwork = await checkNetwork();
      if (!correctNetwork) {
        throw new Error('Please connect to Hardhat local network');
      }
    }

    return await blockEngineWithChain.addOrder(orderData);
  }, [blockchainEnabledState, isConnected, isCorrectNetwork, connectWallet, checkNetwork]);

  const getState = useCallback(() => {
    return blockEngineWithChain.getState();
  }, []);

  const getVisualizationData = useCallback(() => {
    return blockEngineWithChain.getVisualizationData();
  }, []);

  const getHistoricalEpochs = useCallback(() => {
    return demoDataRef.current?.epochs || [];
  }, []);

  const getDemoStats = useCallback(() => {
    // Return empty stats since we no longer use fabricated demo data
    return {
      totalEpochs: state.epochs.size,
      totalOrders: state.orders.size,
      totalMatched: Array.from(state.epochs.values()).reduce((sum, epoch) => sum + epoch.matchedOrders, 0),
      matchRate: state.orders.size > 0 ?
        Math.round((Array.from(state.epochs.values()).reduce((sum, epoch) => sum + epoch.matchedOrders, 0) / state.orders.size) * 100).toString() :
        '0'
    };
  }, [state]);

  // Get blockchain-specific stats
  const getBlockchainStats = useCallback(async () => {
    if (!blockchainEnabledState || !isConnected) {
      return {
        orderCount: 0,
        isConnected: false,
        isCorrectNetwork: false
      };
    }

    try {
      const orderCount = await web3Service.getOrderCount();
      const correctNetwork = await web3Service.isCorrectNetwork();

      return {
        orderCount,
        isConnected,
        isCorrectNetwork: correctNetwork
      };
    } catch (error) {
      console.error('Failed to get blockchain stats:', error);
      return {
        orderCount: 0,
        isConnected: false,
        isCorrectNetwork: false
      };
    }
  }, [blockchainEnabledState, isConnected]);

  return {
    state,
    visualizations,
    addOrder,
    getState,
    getVisualizationData,
    getHistoricalEpochs,
    getDemoStats,
    getBlockchainStats,
    demoDataLoaded,
    blockchainEnabled: blockchainEnabledState,
    toggleBlockchain,
    connectWallet,
    isConnected,
    walletAddress,
    isCorrectNetwork,
    checkNetwork
  };
}

// Enhanced hook for order management with blockchain support
export function useBlockOrdersWithChain(symbol?: string) {
  const { state, getHistoricalEpochs, blockchainEnabled, isConnected } = useBlockEngineWithChain();
  const [orders, setOrders] = useState<Order[]>([]);
  const [blockchainOrders, setBlockchainOrders] = useState<Order[]>([]);

  useEffect(() => {
    let allOrders: Order[] = [];

    // Get current orders from engine
    allOrders = Array.from(state.orders.values());

    // Add historical orders
    const historicalEpochs = getHistoricalEpochs();
    historicalEpochs.forEach((epoch: any) => {
      epoch.blocks.forEach((block: any) => {
        allOrders.push(...block.orders);
      });
    });

    // Filter by symbol if provided
    if (symbol) {
      allOrders = allOrders.filter(order => order.symbol === symbol);
    }

    // Sort by creation time (newest first)
    allOrders.sort((a, b) => {
      const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
      const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
      return bTime - aTime;
    });

    // Take only the most recent 20 orders for display
    setOrders(allOrders.slice(0, 20));
  }, [state.orders, symbol, getHistoricalEpochs]);

  // Sync blockchain orders if enabled
  useEffect(() => {
    if (blockchainEnabled && isConnected) {
      const syncBlockchainOrders = async () => {
        try {
          const web3Orders = await web3Service.getAllOrders();
          const formattedOrders: Order[] = web3Orders.map(web3Order => ({
            id: web3Order.id,
            anonymousId: web3Order.trader.slice(0, 8) + '...',
            symbol: 'ETH-USD',
            side: web3Order.isBuy ? 'buy' : 'sell',
            amount: parseFloat(web3Order.amount),
            price: parseFloat(web3Order.price),
            priceRange: {
              min: parseFloat(web3Order.price) * 0.99,
              max: parseFloat(web3Order.price) * 1.01
            },
            status: web3Order.executed ? 'executed' : 'pending',
            createdAt: new Date(web3Order.timestamp * 1000),
            blockId: '',
            epochId: '',
            counterparties: [],
            executedAt: web3Order.executed ? new Date(web3Order.timestamp * 1000) : undefined,
            executedPrice: web3Order.executed ? parseFloat(web3Order.price) : undefined
          }));

          setBlockchainOrders(formattedOrders);
        } catch (error) {
          console.error('Failed to sync blockchain orders:', error);
        }
      };

      syncBlockchainOrders();
    }
  }, [blockchainEnabled, isConnected]);

  // Combine local and blockchain orders
  const allOrders = [...orders, ...blockchainOrders].sort((a, b) => {
    const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
    const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
    return bTime - aTime;
  }).slice(0, 20);

  return allOrders;
}

// Enhanced hook for epoch progress with blockchain support
export function useEpochProgressWithChain() {
  const { state, getHistoricalEpochs, blockchainEnabled } = useBlockEngineWithChain();
  const [progress, setProgress] = useState({
    currentBlock: 0,
    totalBlocks: 5,
    epochProgress: 0,
    matchingProgress: 0,
    phase: 'collecting' as 'collecting' | 'matching' | 'idle',
    historicalEpochs: [] as Epoch[],
    blockchainSync: false
  });

  useEffect(() => {
    const historicalEpochs = getHistoricalEpochs();

    if (state.currentEpoch) {
      const epoch = state.currentEpoch;
      const currentBlock = epoch.blocks.length;
      const epochProgress = (currentBlock / 5) * 100;

      setProgress({
        currentBlock,
        totalBlocks: 5,
        epochProgress,
        matchingProgress: state.matchingProgress.progress,
        phase: state.matchingProgress.phase as 'collecting' | 'matching' | 'idle',
        historicalEpochs,
        blockchainSync: blockchainEnabled
      });
    } else {
      setProgress(prev => ({ ...prev, historicalEpochs, blockchainSync: blockchainEnabled }));
    }
  }, [state.currentEpoch, state.matchingProgress, getHistoricalEpochs, blockchainEnabled]);

  return progress;
}