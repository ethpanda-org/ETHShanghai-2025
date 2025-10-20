/**
 * Ring VRM (Virtual Ring Mixer) Types
 * Implements ring signatures and mixing for blockchain analysis resistance
 */

export interface RingMember {
  address: string;
  publicKey: string;
  index?: number;
}

export interface RingSignature {
  ringSize: number;
  messageHash: string;
  c0: string; // Initial challenge
  s: string[]; // Responses for each ring member
  keyImage: string; // Prevents double-spending
  ringMembers: string[]; // Public keys in the ring
}

export interface MixPool {
  id: string;
  asset: string;
  mixDepth: number;
  minMixAmount: string;
  maxMixAmount: string;
  feePercentage: number;
  anonymitySet: RingMember[];
  status: 'pending' | 'active' | 'mixing' | 'completed';
  createdAt: number;
  expiresAt: number;
}

export interface MixRequest {
  poolId: string;
  inputAddress: string;
  outputAddresses: string[];
  amount: string;
  mixDepth: number;
  delayRange: {
    min: number; // blocks
    max: number; // blocks
  };
  ringSignature: RingSignature;
}

export interface MixTransaction {
  id: string;
  poolId: string;
  inputs: {
    address: string;
    amount: string;
    ringSignature: RingSignature;
  }[];
  outputs: {
    address: string;
    amount: string;
  }[];
  mixProof: string; // ZK proof of correct mixing
  timestamp: number;
  blockNumber?: number;
  status: 'pending' | 'confirmed' | 'mixed' | 'completed';
}

export interface RingVRMConfig {
  minRingSize: number;
  maxRingSize: number;
  defaultMixDepth: number;
  maxMixDepth: number;
  minDelay: number; // blocks
  maxDelay: number; // blocks
  decoySelectionStrategy: 'uniform' | 'poisson' | 'recent';
}

export interface RingVRMStats {
  totalMixed: string;
  totalVolume: string;
  averageMixTime: number; // blocks
  currentAnonymitySet: number;
  activePools: number;
  mixSuccessRate: number;
}

export interface VRMProof {
  type: 'ring' | 'mix' | 'zero-knowledge';
  proof: string;
  publicInputs: string[];
  verificationKey: string;
}