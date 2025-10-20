import axios from 'axios';
import { POAPData } from '../types';
import { logger } from '../utils/logger';

/**
 * POAP Service
 * Fetches user's POAP data using The Graph POAP Subgraph
 */
export class POAPService {
  private graphApiKey?: string;
  private subgraphId = 'HuioMeA9oSgs2vkBUQvhfxN9jhkBayadi1tmvKN3KG4s';

  constructor(graphApiKey?: string) {
    this.graphApiKey = graphApiKey;
  }

  private getSubgraphUrl(): string {
    // The Graph uses a single URL, API key goes in the Authorization header
    return `https://gateway.thegraph.com/api/subgraphs/id/${this.subgraphId}`;
  }

  /**
   * Get POAP data for an address
   * @param address User's Ethereum address
   * @returns POAPData or null if error
   */
  async getPOAPData(address: string): Promise<POAPData | null> {
    try {
      if (!this.graphApiKey) {
        logger.warn('The Graph API key not provided for POAP');
        return {
          totalPOAPs: 0,
          uniqueEvents: 0,
          oldestPOAP: null,
          recentPOAPs: 0,
        };
      }

      // GraphQL query to get POAPs for an address
      const query = `
        query GetPOAPs($owner: String!) {
          tokens(
            first: 1000
            where: { owner: $owner }
            orderBy: created
            orderDirection: asc
          ) {
            id
            created
            event {
              id
              created
            }
          }
        }
      `;

      const response = await axios.post(
        this.getSubgraphUrl(),
        {
          query,
          variables: {
            owner: address.toLowerCase(),
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.graphApiKey}`,
          },
          timeout: 10000,
        }
      );

      const tokens = response.data?.data?.tokens || [];

      if (!tokens || tokens.length === 0) {
        logger.info(`No POAPs found for ${address}`);
        return {
          totalPOAPs: 0,
          uniqueEvents: 0,
          oldestPOAP: null,
          recentPOAPs: 0,
        };
      }

      logger.info(`Found ${tokens.length} POAP(s) for ${address}`);

      // Calculate metrics
      const totalPOAPs = tokens.length;
      
      // Unique events (by event id)
      const uniqueEventIds = new Set(tokens.map((t: any) => t.event?.id));
      const uniqueEvents = uniqueEventIds.size;

      // Oldest POAP (by created timestamp)
      const dates = tokens
        .map((t: any) => t.created ? parseInt(t.created) * 1000 : null)
        .filter((d: any) => d !== null);
      const oldestPOAP = dates.length > 0 ? Math.min(...dates) : null;

      // Recent POAPs (last 6 months)
      const sixMonthsAgo = Date.now() - (6 * 30 * 24 * 60 * 60 * 1000);
      const recentPOAPs = tokens.filter((t: any) => {
        if (!t.created) return false;
        const createdTime = parseInt(t.created) * 1000;
        return createdTime >= sixMonthsAgo;
      }).length;

      return {
        totalPOAPs,
        uniqueEvents,
        oldestPOAP,
        recentPOAPs,
      };
    } catch (error: any) {
      logger.error(`Error fetching POAP data for ${address}:`, error.message);
      return null;
    }
  }

  /**
   * Check if user has any POAPs
   */
  async hasPOAPs(address: string): Promise<boolean> {
    const data = await this.getPOAPData(address);
    return (data?.totalPOAPs || 0) > 0;
  }
}
