import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { OnChainData } from '../types';
import { logger } from '../utils/logger';

/**
 * On-Chain Data Service
 * Analyzes user's on-chain activity
 */
export class OnChainService {
  private client;
  private alchemyApiKey?: string;

  constructor(rpcUrl?: string, alchemyApiKey?: string) {
    this.client = createPublicClient({
      chain: mainnet,
      transport: http(rpcUrl || 'https://eth.llamarpc.com'),
    });
    this.alchemyApiKey = alchemyApiKey;
  }

  /**
   * Get on-chain data for an address
   * @param address User's Ethereum address
   * @returns OnChainData or null if error
   */
  async getOnChainData(address: string): Promise<OnChainData | null> {
    try {
      // Use Promise.race to add timeout
      const timeout = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('OnChain query timeout')), 8000)
      );

      const dataPromise = this.fetchOnChainData(address);
      
      return await Promise.race([dataPromise, timeout]);
    } catch (error: any) {
      logger.error(`Error fetching on-chain data for ${address}:`, error.message);
      return null;
    }
  }

  private async fetchOnChainData(address: string): Promise<OnChainData | null> {
    try {
      // Get current block number
      const currentBlock = await this.client.getBlockNumber();

      // Get transaction count (nonce)
      const txCount = await this.client.getTransactionCount({
        address: address as `0x${string}`,
      });

      // Estimate account age (simplified - would need to scan blocks or use indexer)
      const accountAge = await this.estimateAccountAge(address, currentBlock);

      // Get code to check if it's a contract
      const code = await this.client.getBytecode({
        address: address as `0x${string}`,
      });
      const isContract = code !== undefined && code !== '0x';

      return {
        accountAge,
        transactionCount: Number(txCount),
        contractsDeployed: isContract ? 1 : 0, // Simplified
        uniqueInteractions: Math.floor(Number(txCount) * 0.7), // Estimate
      };
    } catch (error: any) {
      logger.error(`Error in fetchOnChainData for ${address}:`, error.message);
      return null;
    }
  }

  /**
   * Estimate account age in days (simplified version)
   */
  private async estimateAccountAge(address: string, currentBlock: bigint): Promise<number> {
    try {
      // In production, you'd use an indexer like Etherscan API or The Graph
      // For now, use a simplified estimation based on transaction count
      const txCount = await this.client.getTransactionCount({
        address: address as `0x${string}`,
      });

      if (txCount === 0) return 0;

      // Rough estimate: assume 1 tx per week on average
      const estimatedWeeks = Number(txCount) / 1;
      return Math.floor(estimatedWeeks * 7); // Convert to days
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get mock data for testing
   */
  private getMockData(address: string): OnChainData {
    const hash = parseInt(address.slice(2, 10), 16);

    return {
      accountAge: (hash % 1000) + 30, // 30-1030 days
      transactionCount: (hash % 500) + 10,
      contractsDeployed: hash % 5, // 0-4 contracts
      uniqueInteractions: (hash % 200) + 5,
    };
  }

  /**
   * Check if account is active (has transactions)
   */
  async isActiveAccount(address: string): Promise<boolean> {
    try {
      const txCount = await this.client.getTransactionCount({
        address: address as `0x${string}`,
      });
      return Number(txCount) > 0;
    } catch (error) {
      return false;
    }
  }
}
