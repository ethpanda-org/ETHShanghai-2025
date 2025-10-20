import type {
  Block,
  Epoch,
  Order,
  MatchingEngineState,
  BlockMatchingConfig,
  BlockVisualization,
  EpochVisualization
} from '../types/block';
import { ObfuscationUtils } from '../utils/obfuscation';
import { DelayUtils } from '../utils/delay';
import { web3Service, type Web3Order } from './web3';

export class BlockEngineWithChain {
  private state: MatchingEngineState;
  private config: BlockMatchingConfig;
  private subscribers: Set<(state: MatchingEngineState) => void> = new Set();
  private blockTimer?: NodeJS.Timeout;
  private epochTimer?: NodeJS.Timeout;
  private syncTimer?: NodeJS.Timeout;
  private isBlockchainEnabled: boolean;

  constructor(config?: Partial<BlockMatchingConfig>, blockchainEnabled: boolean = true) {
    this.config = {
      BLOCKS_PER_EPOCH: 5,
      BLOCK_DURATION: 30000, // 30 seconds per block
      EPOCH_MATCHING_DELAY: 5000, // 5 seconds delay before matching
      RANDOM_PRIORITY_RANGE: {
        MIN: 1,
        MAX: 1000
      },
      ...config
    };

    this.isBlockchainEnabled = blockchainEnabled;

    this.state = {
      currentEpoch: null,
      epochs: new Map(),
      blocks: new Map(),
      orders: new Map(),
      matchingProgress: {
        phase: 'idle',
        progress: 0
      }
    };

    this.startEngine();

    if (blockchainEnabled) {
      this.startBlockchainSync();
    }
  }

  // Subscribe to state changes
  subscribe(callback: (state: MatchingEngineState) => void) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers() {
    this.subscribers.forEach(callback => callback({ ...this.state }));
  }

  // Start the block and epoch creation engine
  private startEngine() {
    this.createNewEpoch();

    // Create blocks periodically
    this.blockTimer = setInterval(() => {
      this.createNewBlock();
    }, this.config.BLOCK_DURATION);
  }

  // Start blockchain synchronization
  private startBlockchainSync() {
    // Sync with blockchain every 5 seconds
    this.syncTimer = setInterval(() => {
      this.syncWithBlockchain();
    }, 5000);

    // Initial sync
    this.syncWithBlockchain();
  }

  // Sync orders with blockchain
  private async syncWithBlockchain() {
    if (!this.isBlockchainEnabled) return;

    try {
      const blockchainOrders = await web3Service.getAllOrders();

      // Convert blockchain orders to our Order format
      blockchainOrders.forEach((web3Order: Web3Order) => {
        const order: Order = {
          id: web3Order.id,
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
        };

        // Add to state if not already present
        if (!this.state.orders.has(order.id)) {
          this.state.orders.set(order.id, order);
          console.log('Synced order from blockchain:', order.id);
        }
      });

      this.notifySubscribers();
    } catch (error) {
      console.error('Failed to sync with blockchain:', error);
    }
  }

  // Create a new epoch
  private createNewEpoch() {
    const epochId = ObfuscationUtils.generateId('epoch');

    // Find the maximum existing epoch index
    let maxIndex = -1;
    this.state.epochs.forEach(epoch => {
      if (epoch.index > maxIndex) {
        maxIndex = epoch.index;
      }
    });

    // New epoch index is one more than the maximum
    const epochIndex = maxIndex + 1;

    const epoch: Epoch = {
      id: epochId,
      index: epochIndex,
      blocks: [],
      status: 'active',
      startedAt: new Date(),
      totalOrders: 0,
      matchedOrders: 0
    };

    this.state.epochs.set(epochId, epoch);
    this.state.currentEpoch = epoch;

    // Schedule epoch completion after 5 blocks
    this.scheduleEpochCompletion(epochId);

    this.notifySubscribers();
  }

  // Create a new block in the current epoch
  private createNewBlock() {
    if (!this.state.currentEpoch) return;

    const epoch = this.state.currentEpoch;

    // Check if epoch is complete (5 blocks)
    if (epoch.blocks.length >= this.config.BLOCKS_PER_EPOCH) {
      this.createNewEpoch();
      return;
    }

    const blockId = ObfuscationUtils.generateId('block');

    const block: Block = {
      id: blockId,
      epochId: epoch.id,
      index: epoch.blocks.length,
      orders: [],
      status: 'pending',
      createdAt: new Date()
    };

    epoch.blocks.push(block);
    this.state.blocks.set(blockId, block);

    this.notifySubscribers();
  }

  // Schedule epoch completion and matching
  private scheduleEpochCompletion(epochId: string) {
    const totalDuration = this.config.BLOCKS_PER_EPOCH * this.config.BLOCK_DURATION;

    setTimeout(() => {
      this.completeEpoch(epochId);
    }, totalDuration + this.config.EPOCH_MATCHING_DELAY);
  }

  // Complete an epoch and start matching
  private async completeEpoch(epochId: string) {
    const epoch = this.state.epochs.get(epochId);
    if (!epoch) return;

    epoch.status = 'matching';
    this.state.matchingProgress = {
      currentEpochId: epochId,
      phase: 'matching',
      progress: 0
    };
    this.notifySubscribers();

    // Add random delay for privacy
    await DelayUtils.randomDelay(2000, 5000);

    // Assign random priorities to orders within the epoch
    this.assignRandomPriorities(epoch);

    // Perform matching within the epoch
    await this.matchWithinEpoch(epoch);

    // Mark epoch as completed
    epoch.status = 'completed';
    epoch.completedAt = new Date();
    this.state.matchingProgress.phase = 'idle';
    this.state.matchingProgress.progress = 0;

    this.notifySubscribers();
  }

  // Assign random priorities to orders for privacy
  private assignRandomPriorities(epoch: Epoch) {
    epoch.blocks.forEach(block => {
      block.orders.forEach(order => {
        order.matchPriority = Math.floor(
          Math.random() * (this.config.RANDOM_PRIORITY_RANGE.MAX - this.config.RANDOM_PRIORITY_RANGE.MIN + 1)
        ) + this.config.RANDOM_PRIORITY_RANGE.MIN;
      });
    });
  }

  // Match orders within an epoch with random priorities
  private async matchWithinEpoch(epoch: Epoch) {
    // Collect all orders from all blocks in the epoch
    const allOrders: Order[] = [];
    epoch.blocks.forEach(block => {
      allOrders.push(...block.orders);
    });

    // Separate buy and sell orders
    const buyOrders = allOrders
      .filter(o => o.side === 'buy')
      .sort((a, b) => (b.matchPriority || 0) - (a.matchPriority || 0)); // Higher priority first

    const sellOrders = allOrders
      .filter(o => o.side === 'sell')
      .sort((a, b) => (a.matchPriority || 0) - (b.matchPriority || 0)); // Lower priority first (better price)

    // Perform matching
    let matchCount = 0;
    const totalMatches = Math.min(buyOrders.length, sellOrders.length);

    for (let i = 0; i < totalMatches; i++) {
      const buyOrder = buyOrders[i];
      const sellOrder = sellOrders[i];

      // Check if prices are compatible
      if (this.canMatch(buyOrder, sellOrder)) {
        await this.executeMatch(buyOrder, sellOrder);
        matchCount++;

        // Update progress
        this.state.matchingProgress.progress = (i + 1) / totalMatches * 100;
        this.notifySubscribers();

        // Add delay between matches for privacy
        await DelayUtils.randomDelay(500, 1500);
      }
    }

    epoch.matchedOrders = matchCount;
  }

  // Check if two orders can be matched
  private canMatch(buyOrder: Order, sellOrder: Order): boolean {
    if (!buyOrder.price || !sellOrder.price) return false;

    // For limit orders, buy price should be >= sell price
    return buyOrder.price >= sellOrder.price;
  }

  // Execute a match between two orders
  private async executeMatch(buyOrder: Order, sellOrder: Order) {
    const executedPrice = (buyOrder.price! + sellOrder.price!) / 2;
    const executedAmount = Math.min(buyOrder.amount, sellOrder.amount);

    // Update buy order
    buyOrder.status = 'executed';
    buyOrder.executedAt = new Date();
    buyOrder.executedPrice = executedPrice;
    buyOrder.counterparties = [ObfuscationUtils.obfuscateId(sellOrder.id)];

    // Update sell order
    sellOrder.status = 'executed';
    sellOrder.executedAt = new Date();
    sellOrder.executedPrice = executedPrice;
    sellOrder.counterparties = [ObfuscationUtils.obfuscateId(buyOrder.id)];

    // Update in state
    this.state.orders.set(buyOrder.id, buyOrder);
    this.state.orders.set(sellOrder.id, sellOrder);
  }

  // Add a new order to the current block (with blockchain support)
  public async addOrder(orderData: Omit<Order, 'id' | 'status' | 'createdAt' | 'blockId' | 'epochId'>): Promise<Order> {
    const order: Order = {
      ...orderData,
      id: ObfuscationUtils.generateId('order'),
      status: 'pending',
      createdAt: new Date()
    };

    console.log('Adding order:', order.id);

    // If blockchain is enabled, submit to blockchain first
    if (this.isBlockchainEnabled) {
      console.log('🔗 Blockchain enabled, attempting to submit order to blockchain...');
      console.log('Order data:', {
        side: order.side,
        amount: order.amount.toString(),
        price: order.price?.toString() || '0'
      });

      try {
        const blockchainOrderId = await web3Service.placeOrder(
          order.side === 'buy',
          order.amount.toString(),
          order.price?.toString() || '0'
        );

        // Use blockchain order ID
        order.id = blockchainOrderId;
        console.log('✅ Order submitted to blockchain successfully:', blockchainOrderId);
      } catch (error) {
        console.error('❌ Failed to submit order to blockchain:', error);
        console.error('Error details:', error);
        throw error;
      }
    } else {
      console.log('📍 Local mode - skipping blockchain submission');
    }

    // Add to current block
    if (this.state.currentEpoch && this.state.currentEpoch.blocks.length > 0) {
      const currentBlock = this.state.currentEpoch.blocks[this.state.currentEpoch.blocks.length - 1];
      order.blockId = currentBlock.id;
      order.epochId = this.state.currentEpoch.id;
      order.status = 'in-block';

      currentBlock.orders.push(order);
      currentBlock.status = 'matching';

      // Update epoch order count
      this.state.currentEpoch.totalOrders++;
    }

    this.state.orders.set(order.id, order);
    this.notifySubscribers();

    // If blockchain is enabled, try to match orders after placing
    if (this.isBlockchainEnabled) {
      setTimeout(async () => {
        try {
          console.log('🔄 Attempting to match orders on blockchain...');
          const matchResult = await web3Service.matchOrders();
          console.log('✅ Orders matched on blockchain:', matchResult);

          // Update local state with matched orders
          const buyOrder = this.state.orders.get(matchResult.buyOrderId);
          const sellOrder = this.state.orders.get(matchResult.sellOrderId);

          if (buyOrder && sellOrder) {
            buyOrder.status = 'executed';
            buyOrder.executedAt = new Date();
            buyOrder.executedPrice = parseFloat(matchResult.price);

            sellOrder.status = 'executed';
            sellOrder.executedAt = new Date();
            sellOrder.executedPrice = parseFloat(matchResult.price);

            this.state.orders.set(buyOrder.id, buyOrder);
            this.state.orders.set(sellOrder.id, sellOrder);

            this.notifySubscribers();
          }
        } catch (error) {
          console.log('ℹ️ No matching orders available on blockchain:', error);
        }
      }, 2000); // Wait 2 seconds after placing order to try matching
    }

    return order;
  }

  // Get visualization data for UI
  public getVisualizationData(): EpochVisualization[] {
    const visualizations: EpochVisualization[] = [];

    this.state.epochs.forEach(epoch => {
      let totalOrders = 0;
      const blocks: BlockVisualization[] = epoch.blocks.map(block => {
        totalOrders += block.orders.length;
        return {
          block,
          isVisible: true,
          isAnimating: block.status === 'matching',
          matchProgress: block.status === 'completed' ? 100 : 0
        };
      });

      visualizations.push({
        epoch,
        blocks,
        isExpanded: epoch.status === 'matching' || epoch.status === 'completed',
        animationState: epoch.status === 'matching' ? 'matching' :
                       epoch.status === 'completed' ? 'completed' : 'collecting'
      });
    });

    return visualizations;
  }

  // Get current state
  public getState(): MatchingEngineState {
    return { ...this.state };
  }

  // Update configuration
  public updateConfig(newConfig: Partial<BlockMatchingConfig>) {
    this.config = { ...this.config, ...newConfig };

    // Restart timers if engine is running
    if (this.state.currentEpoch) {
      // Clear existing timers
      if (this.blockTimer) clearInterval(this.blockTimer);

      // Restart block generation with new timing
      this.blockTimer = setInterval(() => {
        this.createNewBlock();
      }, this.config.BLOCK_DURATION);
    }
  }

  // Start the engine
  public start() {
    // If there's no current epoch, create one
    if (!this.state.currentEpoch) {
      this.createNewEpoch();
    }

    if (this.isBlockchainEnabled && !this.syncTimer) {
      this.startBlockchainSync();
    }
  }

  // Stop the engine
  public stop() {
    // Clear timers but keep state
    if (this.blockTimer) {
      clearInterval(this.blockTimer);
      this.blockTimer = undefined;
    }
    if (this.epochTimer) {
      clearTimeout(this.epochTimer);
      this.epochTimer = undefined;
    }
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = undefined;
    }
  }

  // Enable/disable blockchain integration
  public setBlockchainEnabled(enabled: boolean) {
    console.log('🔧 setBlockchainEnabled called with:', enabled);
    this.isBlockchainEnabled = enabled;
    console.log('🔧 this.isBlockchainEnabled is now:', this.isBlockchainEnabled);

    if (enabled && !this.syncTimer) {
      console.log('🔧 Starting blockchain sync...');
      this.startBlockchainSync();
    } else if (!enabled && this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = undefined;
    }
  }

  // Check if blockchain is enabled
  public isBlockchainIntegrationEnabled(): boolean {
    return this.isBlockchainEnabled;
  }

  // Cleanup
  public destroy() {
    this.stop();
    this.subscribers.clear();
    web3Service.removeAllListeners();
  }
}

// Singleton instance
export const blockEngineWithChain = new BlockEngineWithChain();