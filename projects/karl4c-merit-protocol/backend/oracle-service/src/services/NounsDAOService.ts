import axios from 'axios';
import { NounsDAOData } from '../types';
import { logger } from '../utils/logger';

/**
 * Nouns DAO Service
 * Fetches user's Nouns NFT holding data using Alchemy NFT API
 */
export class NounsDAOService {
  private nounsTokenAddress = '0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03'; // Nouns Token
  private alchemyApiKey?: string;

  constructor(rpcUrl?: string, alchemyApiKey?: string) {
    this.alchemyApiKey = alchemyApiKey;
  }

  /**
   * Get Nouns DAO data for an address
   * @param address User's Ethereum address
   * @returns NounsDAOData or null if error
   */
  async getNounsData(address: string): Promise<NounsDAOData | null> {
    try {
      // Use Alchemy NFT API to get Nouns NFTs
      const nounsNFTs = await this.getNounsNFTsFromAlchemy(address);
      
      if (!nounsNFTs || nounsNFTs.length === 0) {
        logger.info(`No Nouns NFT found for ${address}`);
        return {
          hasNounsNFT: false,
          nounsCount: 0,
          holdingDuration: 0,
          longestHold: 0,
          participationScore: 0,
        };
      }

      logger.info(`Found ${nounsNFTs.length} Nouns NFT(s) for ${address}`);
      
      // Calculate participation score based on NFT count
      // More Nouns = higher participation potential
      const participationScore = this.calculateParticipationScore(nounsNFTs.length);

      return {
        hasNounsNFT: true,
        nounsCount: nounsNFTs.length,
        holdingDuration: 0, // Would need historical data from Alchemy
        longestHold: 0, // Would need historical data
        participationScore,
      };
    } catch (error: any) {
      logger.error(`Error fetching Nouns DAO data for ${address}:`, error.message);
      return null;
    }
  }

  /**
   * Get Nouns NFTs from Alchemy NFT API
   */
  private async getNounsNFTsFromAlchemy(address: string): Promise<any[]> {
    if (!this.alchemyApiKey) {
      logger.warn('Alchemy API key not provided, cannot fetch Nouns NFTs');
      return [];
    }

    try {
      const url = `https://eth-mainnet.g.alchemy.com/nft/v3/${this.alchemyApiKey}/getNFTsForOwner`;
      
      const response = await axios.get(url, {
        params: {
          owner: address,
          'contractAddresses[]': this.nounsTokenAddress,
          withMetadata: false,
        },
        timeout: 10000,
      });

      const nfts = response.data?.ownedNfts || [];
      logger.info(`Alchemy returned ${nfts.length} Nouns NFT(s) for ${address}`);
      
      return nfts;
    } catch (error: any) {
      logger.error(`Error fetching Nouns NFTs from Alchemy for ${address}:`, error.message);
      return [];
    }
  }

  /**
   * Calculate participation score based on NFT count
   * More Nouns = higher potential participation
   */
  private calculateParticipationScore(nounsCount: number): number {
    // Score based on number of Nouns held
    // 1 Noun = 300, 2-3 = 500, 4-5 = 700, 6+ = 1000
    if (nounsCount === 0) return 0;
    if (nounsCount === 1) return 300;
    if (nounsCount <= 3) return 500;
    if (nounsCount <= 5) return 700;
    return 1000;
  }

  /**
   * Check if user holds Nouns NFT
   */
  async hasNounsNFT(address: string): Promise<boolean> {
    const data = await this.getNounsData(address);
    return data?.hasNounsNFT || false;
  }
}
