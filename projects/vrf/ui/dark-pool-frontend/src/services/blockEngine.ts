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

export class BlockEngine {
  private state: MatchingEngineState;
  private config: BlockMatchingConfig;
  private subscribers: Set<(state: MatchingEngineState) => void> = new Set();
  private blockTimer?: NodeJS.Timeout;
  private epochTimer?: NodeJS.Timeout;

  constructor(config?: Partial<BlockMatchingConfig>) {
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

    // Demo order generation disabled - no fabricated trading data
    // Blocks will only contain real user orders
    const demoOrders: Order[] = [];

    const block: Block = {
      id: blockId,
      epochId: epoch.id,
      index: epoch.blocks.length,
      orders: demoOrders, // Empty until real orders are added
      status: 'pending',
      createdAt: new Date()
    };

    // Add real orders to the state (none for now - will be added by users)
    demoOrders.forEach(order => {
      this.state.orders.set(order.id, order);
    });

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

  // Add a new order to the current block
  public addOrder(orderData: Omit<Order, 'id' | 'status' | 'createdAt' | 'blockId' | 'epochId'>): Order {
    const order: Order = {
      ...orderData,
      id: ObfuscationUtils.generateId('order'),
      status: 'pending',
      createdAt: new Date()
    };

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

    return order;
  }

  // Get visualization data for UI
  public getVisualizationData(): EpochVisualization[] {
    const visualizations: EpochVisualization[] = [];

    this.state.epochs.forEach(epoch => {
      const blocks: BlockVisualization[] = epoch.blocks.map(block => ({
        block,
        isVisible: true,
        isAnimating: block.status === 'matching',
        matchProgress: block.status === 'completed' ? 100 : 0
      }));

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
  }

  // Demo order generation function removed to prevent fabricated trading data
  // Blocks will now only contain real user orders

  // Cleanup
  public destroy() {
    this.stop();
    this.subscribers.clear();
  }
}

// Singleton instance
export const blockEngine = new BlockEngine();