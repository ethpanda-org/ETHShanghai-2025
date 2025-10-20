import { logger } from '../utils/logger';
import { getContract } from '../utils/ethereum';
import { ahinChainService } from './ahinChain';

const AHIN_ANCHOR_ABI = [
  'function anchorBlock(bytes32 merkleRoot, uint256 transactionCount, string metadataURI) external',
  'function currentBlockNumber() view returns (uint256)',
] as const;

class AHINAnchorService {
  private anchor;
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    const anchorAddress =
      process.env.AHIN_ANCHOR_ADDRESS || process.env.NEXT_PUBLIC_AHIN_ANCHOR;

    if (!anchorAddress) {
      throw new Error(
        'AHIN_ANCHOR_ADDRESS is not configured. Set it in your environment variables.'
      );
    }

    this.anchor = getContract(anchorAddress, AHIN_ANCHOR_ABI);
  }

  start() {
    if (this.intervalId) {
      return;
    }

    const interval = parseInt(process.env.AHIN_ANCHOR_INTERVAL || '300000', 10);

    this.intervalId = setInterval(async () => {
      try {
        await this.anchorPendingBlocks();
      } catch (error) {
        logger.error('AHIN anchor interval failed', { error });
      }
    }, interval);

    logger.info('AHIN Anchor service schedule started', { interval });
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('AHIN Anchor service stopped');
    }
  }

  async anchorPendingBlocks() {
    const block = ahinChainService.buildBlock();

    if (!block) {
      logger.debug('No pending transactions to anchor');
      return null;
    }

    const metadataURI = `ipfs://Qm${block.hash.slice(2, 48)}`;

    logger.info('Anchoring block to blockchain', {
      blockNumber: block.blockNumber,
      merkleRoot: block.merkleRoot,
      txCount: block.transactionCount,
    });

    const tx = await this.anchor.anchorBlock(
      block.merkleRoot,
      block.transactionCount,
      metadataURI
    );

    const receipt = await tx.wait();

    logger.info('Block anchored successfully', {
      blockNumber: block.blockNumber,
      txHash: receipt.hash,
      gasUsed: receipt.gasUsed?.toString(),
    });

    return {
      blockNumber: block.blockNumber,
      txHash: receipt.hash,
      metadataURI,
    };
  }

  async getStats() {
    const currentBlock = await this.anchor.currentBlockNumber();
    const chainStats = ahinChainService.getStats();

    return {
      onChainBlocks: currentBlock.toString(),
      offChainBlocks: chainStats.totalBlocks,
      pendingTransactions: chainStats.pendingTransactions,
    };
  }
}

export const ahinAnchorService = new AHINAnchorService();

export const startAHINAnchorService = () => {
  ahinAnchorService.start();
  return ahinAnchorService;
};
