import { BlockEngine } from '../services/blockEngine';
import type { Order, Epoch, Block } from '../types/block';

export interface DemoData {
  epochs: Epoch[];
  blocks: Block[];
  orders: Order[];
}

export function generateDemoData(numEpochs: number = 5673): DemoData {
  const epochs: Epoch[] = [];
  const blocks: Block[] = [];
  const orders: Order[] = [];

  // Generate historical epochs with realistic trading data
  // Epochs are numbered from 0 to numEpochs-1, with earlier epochs having lower numbers
  for (let epochIndex = 0; epochIndex < numEpochs; epochIndex++) {
    const epochId = `demo-epoch-${epochIndex}`;

    // Calculate time offset: more recent epochs have smaller offsets
    // Epoch 0 is the oldest, epoch numEpochs-1 is the most recent
    const hoursAgo = (numEpochs - epochIndex) * 2.5 / 60; // Each epoch is 2.5 minutes
    const epochStartTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

    const epoch: Epoch = {
      id: epochId,
      index: epochIndex, // Keep original index for proper ordering
      blocks: [],
      status: 'completed',
      startedAt: epochStartTime,
      completedAt: new Date(epochStartTime.getTime() + 2.5 * 60 * 1000), // 2.5 minutes later
      totalOrders: 0,
      matchedOrders: 0
    };

    // Generate 5 blocks per epoch
    for (let blockIndex = 0; blockIndex < 5; blockIndex++) {
      const blockId = `demo-block-${epochIndex}-${blockIndex}`;
      const blockCreatedAt = new Date(epochStartTime.getTime() + blockIndex * 30 * 1000); // 30 seconds per block
      const block: Block = {
        id: blockId,
        epochId: epochId,
        index: blockIndex,
        orders: [],
        status: 'completed',
        createdAt: blockCreatedAt,
        matchedAt: new Date(blockCreatedAt.getTime() + 15 * 1000) // 15 seconds after creation
      };

      // Generate 3-7 orders per block
      const numOrders = Math.floor(Math.random() * 5) + 3;

      for (let orderIndex = 0; orderIndex < numOrders; orderIndex++) {
        const orderId = `demo-order-${epochIndex}-${blockIndex}-${orderIndex}`;
        const isBuy = Math.random() > 0.5;
        const basePrice = 2000 + epochIndex * 50 + blockIndex * 10; // Price evolution
        const priceVariation = (Math.random() - 0.5) * 20;
        const price = Math.round((basePrice + priceVariation) * 100) / 100;

        // Determine if order should be executed (about 70% execution rate)
        const isExecuted = Math.random() > 0.3;

        const order: Order = {
          id: orderId,
          symbol: 'ETH-USD',
          side: isBuy ? 'buy' : 'sell',
          amount: Math.round((Math.random() * 2 + 0.1) * 100) / 100, // 0.1 to 2.1 ETH
          price: isExecuted ? price : undefined,
          priceRange: !isExecuted ? {
            min: price - 10,
            max: price + 10
          } : undefined,
          status: isExecuted ? 'executed' : 'expired',
          blockId: blockId,
          epochId: epochId,
          createdAt: new Date(blockCreatedAt.getTime() + orderIndex * 1000),
          executedAt: isExecuted ? new Date(blockCreatedAt.getTime() + 15 * 1000) : undefined,
          executedPrice: isExecuted ? price + (Math.random() - 0.5) * 5 : undefined,
          matchPriority: Math.floor(Math.random() * 1000) + 1,
          counterparties: isExecuted ? [ObfuscationUtils.obfuscateId(`demo-counterpart-${orderId}`)] : undefined
        };

        orders.push(order);
        block.orders.push(order);
      }

      blocks.push(block);
      epoch.blocks.push(block);
      epoch.totalOrders += block.orders.length;
    }

    // Calculate matched orders (pair buys and sells)
    const allOrders = epoch.blocks.flatMap(b => b.orders);
    const buyOrders = allOrders.filter(o => o.side === 'buy' && o.status === 'executed');
    const sellOrders = allOrders.filter(o => o.side === 'sell' && o.status === 'executed');
    epoch.matchedOrders = Math.min(buyOrders.length, sellOrders.length);

    epochs.push(epoch);
  }

  return { epochs, blocks, orders };
}

// Simple obfuscation for demo
const ObfuscationUtils = {
  generateId: (prefix: string) => `${prefix}-${Math.random().toString(36).substr(2, 9)}`,
  obfuscateId: (id: string) => `0x${id.substr(-8)}`
};

export function preloadDemoData(engine: BlockEngine): void {
  const demoData = generateDemoData();

  // For now, we'll just add some live orders to the current epoch
  // The historical data will be displayed differently

  // Add some current pending orders
  const currentOrders = [
    {
      symbol: 'ETH-USD',
      side: 'buy' as const,
      amount: 1.5,
      price: 2050.50
    },
    {
      symbol: 'ETH-USD',
      side: 'sell' as const,
      amount: 0.8,
      price: 2049.00
    },
    {
      symbol: 'ETH-USD',
      side: 'buy' as const,
      amount: 2.0,
      priceRange: { min: 2045, max: 2055 }
    },
    {
      symbol: 'ETH-USD',
      side: 'sell' as const,
      amount: 1.2,
      price: 2052.00
    },
    {
      symbol: 'ETH-USD',
      side: 'buy' as const,
      amount: 0.5,
      priceRange: { min: 2040, max: 2060 }
    }
  ];

  currentOrders.forEach(orderData => {
    engine.addOrder(orderData);
  });
}