import { useEffect, useState, useCallback } from 'react';
import { blockEngine } from '../services/blockEngine';
import type {
  MatchingEngineState,
  EpochVisualization,
  Order,
  BlockMatchingConfig
} from '../types/block';

export function useBlockEngine() {
  const [state, setState] = useState<MatchingEngineState>(blockEngine.getState());
  const [visualizations, setVisualizations] = useState<EpochVisualization[]>([]);

  useEffect(() => {
    // Subscribe to block engine updates
    const unsubscribe = blockEngine.subscribe((newState) => {
      setState(newState);
      setVisualizations(blockEngine.getVisualizationData());
    });

    // Initial visualization data
    setVisualizations(blockEngine.getVisualizationData());

    return unsubscribe;
  }, []);

  const addOrder = useCallback((orderData: Omit<Order, 'id' | 'status' | 'createdAt' | 'blockId' | 'epochId'>) => {
    return blockEngine.addOrder(orderData);
  }, []);

  const getState = useCallback(() => {
    return blockEngine.getState();
  }, []);

  const getVisualizationData = useCallback(() => {
    return blockEngine.getVisualizationData();
  }, []);

  return {
    state,
    visualizations,
    addOrder,
    getState,
    getVisualizationData
  };
}

// Hook for order management with block context
export function useBlockOrders(symbol?: string) {
  const { state } = useBlockEngine();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    let filteredOrders = Array.from(state.orders.values());

    if (symbol) {
      filteredOrders = filteredOrders.filter(order => order.symbol === symbol);
    }

    // Sort by creation time (newest first)
    filteredOrders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    setOrders(filteredOrders);
  }, [state.orders, symbol]);

  return orders;
}

// Hook for epoch progress tracking
export function useEpochProgress() {
  const { state } = useBlockEngine();
  const [progress, setProgress] = useState({
    currentBlock: 0,
    totalBlocks: 5,
    epochProgress: 0,
    matchingProgress: 0,
    phase: 'collecting' as 'collecting' | 'matching' | 'idle'
  });

  useEffect(() => {
    if (state.currentEpoch) {
      const epoch = state.currentEpoch;
      const currentBlock = epoch.blocks.length;
      const epochProgress = (currentBlock / 5) * 100;

      setProgress({
        currentBlock,
        totalBlocks: 5,
        epochProgress,
        matchingProgress: state.matchingProgress.progress,
        phase: state.matchingProgress.phase as 'collecting' | 'matching' | 'idle'
      });
    }
  }, [state.currentEpoch, state.matchingProgress]);

  return progress;
}