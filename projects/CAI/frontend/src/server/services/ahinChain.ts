import { ethers } from 'ethers';
import { logger } from '../utils/logger';

export interface AHINTransaction {
  id: string;
  data: Record<string, unknown>;
  timestamp: number;
}

export interface AHINBlock {
  blockNumber: number;
  merkleRoot: string;
  prevHash: string;
  timestamp: number;
  transactions: Array<{ id: string; data: Record<string, unknown> }>;
  transactionCount: number;
  hash: string;
}

class AHINChainService {
  private chain: AHINBlock[] = [];
  private pendingTransactions: AHINTransaction[] = [];

  addTransaction(txData: Record<string, unknown>) {
    const transaction: AHINTransaction = {
      id: ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(txData))),
      data: txData,
      timestamp: Date.now(),
    };

    this.pendingTransactions.push(transaction);
    logger.info('Transaction added to AHIN queue', { txId: transaction.id });

    return transaction.id;
  }

  buildBlock(): AHINBlock | null {
    if (this.pendingTransactions.length === 0) {
      return null;
    }

    const batchSize = parseInt(process.env.AHIN_BATCH_SIZE || '100', 10);
    const transactions = this.pendingTransactions.splice(0, batchSize);

    const leaves = transactions.map((tx) => tx.id);
    const merkleRoot = this.calculateMerkleRoot(leaves);

    const prevHash =
      this.chain.length > 0 ? this.chain[this.chain.length - 1].hash : ethers.ZeroHash;

    const block: AHINBlock = {
      blockNumber: this.chain.length + 1,
      merkleRoot,
      prevHash,
      timestamp: Date.now(),
      transactions: transactions.map((tx) => ({ id: tx.id, data: tx.data })),
      transactionCount: transactions.length,
      hash: '',
    };

    block.hash = ethers.keccak256(
      ethers.toUtf8Bytes(
        JSON.stringify({
          merkleRoot: block.merkleRoot,
          prevHash: block.prevHash,
          timestamp: block.timestamp,
        })
      )
    );

    this.chain.push(block);

    logger.info('AHIN block built', {
      blockNumber: block.blockNumber,
      txCount: block.transactionCount,
      merkleRoot: block.merkleRoot,
    });

    return block;
  }

  private calculateMerkleRoot(leaves: string[]): string {
    if (leaves.length === 0) return ethers.ZeroHash;
    if (leaves.length === 1) return leaves[0];

    const newLevel: string[] = [];

    for (let i = 0; i < leaves.length; i += 2) {
      const left = leaves[i];
      const right = i + 1 < leaves.length ? leaves[i + 1] : left;
      const combined =
        left < right ? ethers.concat([left, right]) : ethers.concat([right, left]);

      newLevel.push(ethers.keccak256(combined));
    }

    return this.calculateMerkleRoot(newLevel);
  }

  generateMerkleProof(txId: string): string[] | null {
    const block = this.chain.find((b) => b.transactions.some((tx) => tx.id === txId));

    if (!block) {
      return null;
    }

    const leaves = block.transactions.map((tx) => tx.id);
    const index = leaves.findIndex((id) => id === txId);

    return this.buildProof(leaves, index);
  }

  private buildProof(leaves: string[], index: number): string[] {
    const proof: string[] = [];
    let currentLevel = leaves;
    let currentIndex = index;

    while (currentLevel.length > 1) {
      const newLevel: string[] = [];

      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;

        if (i === currentIndex || i + 1 === currentIndex) {
          const siblingIndex = i === currentIndex ? i + 1 : i;
          if (siblingIndex < currentLevel.length) {
            proof.push(currentLevel[siblingIndex]);
          }
        }

        const combined =
          left < right ? ethers.concat([left, right]) : ethers.concat([right, left]);
        newLevel.push(ethers.keccak256(combined));
      }

      currentIndex = Math.floor(currentIndex / 2);
      currentLevel = newLevel;
    }

    return proof;
  }

  getStats() {
    const totalBlocks = this.chain.length;
    const totalTransactions = this.chain.reduce(
      (sum, block) => sum + block.transactionCount,
      0
    );

    return {
      totalBlocks,
      totalTransactions,
      pendingTransactions: this.pendingTransactions.length,
      latestBlock: this.chain[this.chain.length - 1] || null,
    };
  }
}

export const ahinChainService = new AHINChainService();
