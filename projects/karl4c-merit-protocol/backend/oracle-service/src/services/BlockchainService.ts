import { createWalletClient, createPublicClient, http, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { CalculatedScore } from '../types';
import { logger } from '../utils/logger';

/**
 * Blockchain Service
 * Handles on-chain updates to MeritScoreOracle contract
 */
export class BlockchainService {
  private walletClient;
  private publicClient;
  private oracleAddress: `0x${string}`;
  private account;

  // MeritScoreOracle ABI (only what we need)
  private oracleAbi = parseAbi([
    'function updateMerits(address user, (uint256 score, uint256 lastUpdated) data) external',
    'function batchUpdateMerits(address[] users, (uint256 score, uint256 lastUpdated)[] dataArray) external',
    'function getScore(address user) external view returns (uint256)',
    'function owner() external view returns (address)',
  ]);

  constructor(
    privateKey: string,
    rpcUrl: string,
    oracleAddress: string,
    chainId: number
  ) {
    this.account = privateKeyToAccount(privateKey as `0x${string}`);
    this.oracleAddress = oracleAddress as `0x${string}`;

    this.walletClient = createWalletClient({
      account: this.account,
      chain: {
        id: chainId,
        name: 'Custom',
        network: 'custom',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: {
          default: { http: [rpcUrl] },
          public: { http: [rpcUrl] },
        },
      },
      transport: http(rpcUrl),
    });

    this.publicClient = createPublicClient({
      chain: {
        id: chainId,
        name: 'Custom',
        network: 'custom',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: {
          default: { http: [rpcUrl] },
          public: { http: [rpcUrl] },
        },
      },
      transport: http(rpcUrl),
    });
  }

  /**
   * Update merit score for a single user
   * @param score Calculated score
   * @returns Transaction hash
   */
  async updateScore(score: CalculatedScore): Promise<string> {
    try {
      logger.info(`Updating score for ${score.address}: ${score.totalScore}`);

      // Use current time in seconds, subtract 60 seconds to ensure it's before block.timestamp
      const currentTimestamp = BigInt(Math.floor(Date.now() / 1000) - 60);
      
      const hash = await this.walletClient.writeContract({
        address: this.oracleAddress,
        abi: this.oracleAbi,
        functionName: 'updateMerits',
        args: [
          score.address as `0x${string}`,
          {
            score: BigInt(score.totalScore),
            lastUpdated: currentTimestamp,
          },
        ],
      });

      logger.info(`Score updated. TX: ${hash}`);
      return hash;
    } catch (error: any) {
      logger.error(`Error updating score for ${score.address}:`, error.message);
      throw error;
    }
  }

  /**
   * Batch update merit scores for multiple users
   * @param scores Array of calculated scores
   * @returns Transaction hash
   */
  async batchUpdateScores(scores: CalculatedScore[]): Promise<string> {
    try {
      logger.info(`Batch updating ${scores.length} scores`);

      // Use current time in seconds, subtract 60 seconds to ensure it's before block.timestamp
      const currentTimestamp = BigInt(Math.floor(Date.now() / 1000) - 60);
      
      const addresses = scores.map(s => s.address as `0x${string}`);
      const dataArray = scores.map(s => ({
        score: BigInt(s.totalScore),
        lastUpdated: currentTimestamp,
      }));

      const hash = await this.walletClient.writeContract({
        address: this.oracleAddress,
        abi: this.oracleAbi,
        functionName: 'batchUpdateMerits',
        args: [addresses, dataArray],
      });

      logger.info(`Batch update complete. TX: ${hash}`);
      return hash;
    } catch (error: any) {
      logger.error('Error in batch update:', error.message);
      throw error;
    }
  }

  /**
   * Get current on-chain score for a user
   * @param address User address
   * @returns Current score
   */
  async getCurrentScore(address: string): Promise<number> {
    try {
      const score = await this.publicClient.readContract({
        address: this.oracleAddress,
        abi: this.oracleAbi,
        functionName: 'getScore',
        args: [address as `0x${string}`],
      });

      return Number(score);
    } catch (error: any) {
      logger.error(`Error reading score for ${address}:`, error.message);
      return 0;
    }
  }

  /**
   * Verify oracle ownership
   */
  async verifyOwnership(): Promise<boolean> {
    try {
      const owner = await this.publicClient.readContract({
        address: this.oracleAddress,
        abi: this.oracleAbi,
        functionName: 'owner',
      });

      const isOwner = owner.toLowerCase() === this.account.address.toLowerCase();
      
      if (!isOwner) {
        logger.error(`Account ${this.account.address} is not the oracle owner (${owner})`);
      }

      return isOwner;
    } catch (error: any) {
      logger.error('Error verifying ownership:', error.message);
      return false;
    }
  }

  /**
   * Get oracle address
   */
  getOracleAddress(): string {
    return this.oracleAddress;
  }

  /**
   * Get account address
   */
  getAccountAddress(): string {
    return this.account.address;
  }
}
