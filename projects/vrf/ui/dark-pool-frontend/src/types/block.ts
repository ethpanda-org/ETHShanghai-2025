// Block and Epoch related types
export interface Block {
  id: string;
  epochId: string;
  index: number; // 0-4 within epoch
  orders: Order[];
  status: 'pending' | 'matching' | 'completed' | 'expired';
  createdAt: Date;
  matchedAt?: Date;
}

export interface Epoch {
  id: string;
  index: number;
  blocks: Block[];
  status: 'active' | 'matching' | 'completed';
  startedAt: Date;
  completedAt?: Date;
  totalOrders: number;
  matchedOrders: number;
}

export interface Order {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  amount: number;
  price?: number;
  priceRange?: {
    min: number;
    max: number;
  };
  status: 'pending' | 'in-block' | 'matching' | 'executed' | 'expired' | 'cancelled';
  blockId?: string;
  epochId?: string;
  createdAt: Date;
  executedAt?: Date;
  executedPrice?: number;
  matchPriority?: number; // Random priority within epoch
  counterparties?: string[]; // Obfuscated counterparties
}

export interface MatchingEngineState {
  currentEpoch: Epoch | null;
  epochs: Map<string, Epoch>;
  blocks: Map<string, Block>;
  orders: Map<string, Order>;
  matchingProgress: {
    currentEpochId?: string;
    currentBlockId?: string;
    phase: 'collecting' | 'shuffling' | 'matching' | 'idle';
    progress: number; // 0-100
  };
}

export interface BlockMatchingConfig {
  BLOCKS_PER_EPOCH: number;
  BLOCK_DURATION: number; // in milliseconds
  EPOCH_MATCHING_DELAY: number; // Delay before epoch matching starts
  RANDOM_PRIORITY_RANGE: {
    MIN: number;
    MAX: number;
  };
}

// UI related types
export interface BlockVisualization {
  block: Block;
  isVisible: boolean;
  isAnimating: boolean;
  matchProgress: number;
}

export interface EpochVisualization {
  epoch: Epoch;
  blocks: BlockVisualization[];
  isExpanded: boolean;
  animationState: 'idle' | 'collecting' | 'matching' | 'completed';
}