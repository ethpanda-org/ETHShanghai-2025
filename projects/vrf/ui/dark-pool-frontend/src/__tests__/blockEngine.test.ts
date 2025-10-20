import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BlockEngine } from '../services/blockEngine';
import type { Order } from '../types/block';

describe('BlockEngine', () => {
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

  it('should create a new epoch on initialization', () => {
    const state = engine.getState();
    expect(state.currentEpoch).toBeDefined();
    expect(state.epochs.size).toBe(1);
    expect(state.currentEpoch?.blocks.length).toBe(0);
  });

  it('should add orders to current block', async () => {
    const orderData = {
      symbol: 'ETH-USD',
      side: 'buy' as const,
      amount: 1.5,
      price: 2000
    };

    const order = engine.addOrder(orderData);

    expect(order.status).toBe('in-block');
    expect(order.blockId).toBeDefined();
    expect(order.epochId).toBeDefined();

    const state = engine.getState();
    expect(state.orders.size).toBe(1);
  });

  it('should create blocks over time', async () => {
    // Wait for first block creation
    await new Promise(resolve => setTimeout(resolve, 150));

    const state = engine.getState();
    expect(state.currentEpoch?.blocks.length).toBeGreaterThan(0);
  });

  it('should complete epoch after 5 blocks', async () => {
    // Wait for epoch completion
    await new Promise(resolve => setTimeout(resolve, 600));

    const state = engine.getState();
    const epochs = Array.from(state.epochs.values());
    const firstEpoch = epochs[0];

    expect(firstEpoch.status).toBe('completed');
    expect(firstEpoch.blocks.length).toBe(5);
  });

  it('should assign random priorities to orders', async () => {
    // Add multiple orders
    for (let i = 0; i < 5; i++) {
      engine.addOrder({
        symbol: 'ETH-USD',
        side: i % 2 === 0 ? 'buy' as const : 'sell' as const,
        amount: 1 + i * 0.1,
        price: 2000 + i * 10
      });
    }

    // Wait for epoch completion
    await new Promise(resolve => setTimeout(resolve, 600));

    const state = engine.getState();
    const orders = Array.from(state.orders.values());

    orders.forEach(order => {
      expect(order.matchPriority).toBeDefined();
      expect(order.matchPriority).toBeGreaterThanOrEqual(1);
      expect(order.matchPriority).toBeLessThanOrEqual(100);
    });
  });

  it('should match compatible orders', async () => {
    // Add buy order
    const buyOrder = engine.addOrder({
      symbol: 'ETH-USD',
      side: 'buy',
      amount: 1.5,
      price: 2000
    });

    // Add sell order with compatible price
    const sellOrder = engine.addOrder({
      symbol: 'ETH-USD',
      side: 'sell',
      amount: 1.5,
      price: 1990
    });

    // Wait for matching
    await new Promise(resolve => setTimeout(resolve, 600));

    const state = engine.getState();
    const updatedBuyOrder = state.orders.get(buyOrder.id);
    const updatedSellOrder = state.orders.get(sellOrder.id);

    expect(updatedBuyOrder?.status).toBe('executed');
    expect(updatedSellOrder?.status).toBe('executed');
    expect(updatedBuyOrder?.executedPrice).toBeDefined();
    expect(updatedSellOrder?.executedPrice).toBeDefined();
  });

  it('should provide visualization data', () => {
    const visualizations = engine.getVisualizationData();
    expect(Array.isArray(visualizations)).toBe(true);
    expect(visualizations[0]).toHaveProperty('epoch');
    expect(visualizations[0]).toHaveProperty('blocks');
  });

  it('should notify subscribers on state changes', () => {
    let notified = false;
    const unsubscribe = engine.subscribe(() => {
      notified = true;
    });

    engine.addOrder({
      symbol: 'BTC-USD',
      side: 'buy',
      amount: 0.1,
      price: 43000
    });

    expect(notified).toBe(true);
    unsubscribe();
  });
});