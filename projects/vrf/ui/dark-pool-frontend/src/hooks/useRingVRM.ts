import { useState, useEffect, useCallback } from 'react';
import { ringVRMAPI } from '@/services/api-ringvrm';
import type {
  MixPool,
  MixTransaction,
  RingVRMStats,
  RingVRMConfig
} from '@/types/ringvrm';

/**
 * React Hook for Ring VRM functionality
 * Manages state and operations for blockchain analysis resistance
 */

export interface UseRingVRMOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableMixing?: boolean;
  defaultMixDepth?: number;
}

export function useRingVRM(options: UseRingVRMOptions = {}) {
  const {
    autoRefresh = false,
    refreshInterval = 30000, // 30 seconds
    enableMixing = true,
    defaultMixDepth = 3
  } = options;

  // State management
  const [pools, setPools] = useState<MixPool[]>([]);
  const [activePool, setActivePool] = useState<MixPool | null>(null);
  const [transactions, setTransactions] = useState<MixTransaction[]>([]);
  const [stats, setStats] = useState<RingVRMStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMixing, setIsMixing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load available pools
  const loadPools = useCallback(async (asset?: string) => {
    if (!enableMixing) return;

    setIsLoading(true);
    setError(null);

    try {
      const availablePools = await ringVRMAPI.getAvailablePools(asset);
      setPools(availablePools);

      // Auto-select best pool
      if (availablePools.length > 0 && !activePool) {
        // Select pool with largest anonymity set
        const bestPool = availablePools.reduce((prev, current) =>
          prev.anonymitySet.length > current.anonymitySet.length ? prev : current
        );
        setActivePool(bestPool);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pools');
    } finally {
      setIsLoading(false);
    }
  }, [enableMixing, activePool]);

  // Create a new mix pool
  const createPool = useCallback(async (
    asset: string,
    minAmount: string,
    maxAmount: string,
    mixDepth?: number
  ) => {
    if (!enableMixing) return null;

    setIsLoading(true);
    setError(null);

    try {
      const newPool = await ringVRMAPI.createMixPool({
        asset,
        minAmount,
        maxAmount,
        mixDepth: mixDepth || defaultMixDepth
      });

      setPools(prev => [...prev, newPool]);
      return newPool;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create pool');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [enableMixing, defaultMixDepth]);

  // Submit a mix transaction
  const submitMix = useCallback(async (
    inputAddress: string,
    outputAddresses: string[],
    amount: string,
    privateKey: string,
    poolId?: string
  ) => {
    if (!enableMixing) return null;

    setIsMixing(true);
    setError(null);

    try {
      const targetPoolId = poolId || activePool?.id;
      if (!targetPoolId) {
        throw new Error('No active pool available');
      }

      const mixTx = await ringVRMAPI.submitMix({
        poolId: targetPoolId,
        inputAddress,
        outputAddresses,
        amount,
        privateKey,
        mixDepth: defaultMixDepth
      });

      setTransactions(prev => [...prev, mixTx]);
      return mixTx;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit mix');
      return null;
    } finally {
      setIsMixing(false);
    }
  }, [enableMixing, activePool, defaultMixDepth]);

  // Submit order with Ring VRM protection
  const submitOrderWithRingVRM = useCallback(async (
    order: {
      symbol: string;
      side: 'buy' | 'sell';
      amount: string;
      priceRange?: { min: string; max: string };
      privateKey?: string;
    }
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await ringVRMAPI.submitOrderWithRingVRM({
        ...order,
        useMixing: enableMixing && !!order.privateKey,
        mixDepth: defaultMixDepth,
        privateKey: order.privateKey
      });

      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit order');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [enableMixing, defaultMixDepth]);

  // Load statistics
  const loadStats = useCallback(async () => {
    if (!enableMixing) return;

    try {
      const ringStats = await ringVRMAPI.getRingVRMStats();
      setStats(ringStats);
    } catch (err) {
      console.error('Failed to load Ring VRM stats:', err);
    }
  }, [enableMixing]);

  // Get transaction status
  const getTransactionStatus = useCallback(async (txId: string) => {
    try {
      const transaction = transactions.find(tx => tx.id === txId);
      if (transaction) {
        return transaction.status;
      }

      // In production, fetch from API
      return 'unknown';
    } catch (err) {
      console.error('Failed to get transaction status:', err);
      return 'error';
    }
  }, [transactions]);

  // Calculate privacy score
  const getPrivacyScore = useCallback(() => {
    if (!stats || !enableMixing) return 0;

    let score = 0;

    // Anonymity set size contributes to score
    if (stats.currentAnonymitySet > 50) score += 40;
    else if (stats.currentAnonymitySet > 20) score += 30;
    else if (stats.currentAnonymitySet > 10) score += 20;
    else if (stats.currentAnonymitySet > 5) score += 10;

    // Mix success rate contributes to score
    if (stats.mixSuccessRate > 95) score += 30;
    else if (stats.mixSuccessRate > 90) score += 25;
    else if (stats.mixSuccessRate > 80) score += 20;
    else if (stats.mixSuccessRate > 70) score += 15;

    // Active pools contribute to score
    if (stats.activePools > 10) score += 30;
    else if (stats.activePools > 5) score += 25;
    else if (stats.activePools > 2) score += 20;
    else if (stats.activePools > 0) score += 15;

    return Math.min(score, 100);
  }, [stats, enableMixing]);

  // Initialize and auto-refresh
  useEffect(() => {
    if (enableMixing) {
      loadPools();
      loadStats();

      if (autoRefresh) {
        const interval = setInterval(() => {
          loadPools();
          loadStats();
        }, refreshInterval);

        return () => clearInterval(interval);
      }
    }
  }, [enableMixing, autoRefresh, refreshInterval, loadPools, loadStats]);

  // Cleanup expired pools
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      ringVRMAPI.cleanup();
    }, 60000); // Every minute

    return () => clearInterval(cleanupInterval);
  }, []);

  return {
    // State
    pools,
    activePool,
    transactions,
    stats,
    isLoading,
    isMixing,
    error,

    // Actions
    loadPools,
    createPool,
    submitMix,
    submitOrderWithRingVRM,
    loadStats,
    getTransactionStatus,

    // Computed
    privacyScore: getPrivacyScore(),
    hasActivePool: !!activePool,
    canMix: enableMixing && pools.length > 0,

    // Configuration
    config: {
      enableMixing,
      defaultMixDepth,
      autoRefresh
    }
  };
}