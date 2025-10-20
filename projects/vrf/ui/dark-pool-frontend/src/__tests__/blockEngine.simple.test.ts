import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BlockEngine } from '../services/blockEngine.js';

describe('BlockEngine Simple Tests', () => {
  let engine: BlockEngine;

  beforeEach(() => {
    engine = new BlockEngine({
      BLOCKS_PER_EPOCH: 5,
      BLOCK_DURATION: 100, // 100ms for fast testing
      EPOCH_MATCHING_DELAY: 50,
      RANDOM_PRIORITY_RANGE: { MIN: 1, MAX: 100 }
    });
  });

  afterEach(() => {
    engine.destroy();
  });

  it('should initialize with current epoch', () => {
    const state = engine.getState();
    expect(state.currentEpoch).toBeDefined();
    expect(state.epochs.size).toBe(1);
  });

  it('should add order to current block', () => {
    const order = engine.addOrder({
      symbol: 'ETH-USD',
      side: 'buy',
      amount: 1.5,
      price: 2000
    });

    expect(order.id).toBeDefined();
    expect(order.symbol).toBe('ETH-USD');
    expect(order.side).toBe('buy');
    // Order might be pending or in-block depending on timing
    expect(['pending', 'in-block']).toContain(order.status);
  });

  it('should provide visualization data', () => {
    const visualizations = engine.getVisualizationData();
    expect(Array.isArray(visualizations)).toBe(true);
    expect(visualizations.length).toBeGreaterThan(0);
    expect(visualizations[0]).toHaveProperty('epoch');
    expect(visualizations[0]).toHaveProperty('blocks');
  });

  it('should update state when order is added', () => {
    const initialState = engine.getState();
    expect(initialState.orders.size).toBe(0);

    engine.addOrder({
      symbol: 'BTC-USD',
      side: 'sell',
      amount: 0.1,
      price: 43000
    });

    const newState = engine.getState();
    expect(newState.orders.size).toBe(1);
  });
});