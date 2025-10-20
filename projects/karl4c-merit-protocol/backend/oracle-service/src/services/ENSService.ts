import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { normalize } from 'viem/ens';
import { ENSData } from '../types';
import { logger } from '../utils/logger';

/**
 * ENS Service
 * Queries Ethereum Name Service data
 */
export class ENSService {
  private client;

  constructor(rpcUrl?: string) {
    this.client = createPublicClient({
      chain: mainnet,
      transport: http(rpcUrl || 'https://eth.llamarpc.com'),
    });
  }

  /**
   * Get ENS data for an address
   * @param address User's Ethereum address
   * @returns ENSData or null if error
   */
  async getENSData(address: string): Promise<ENSData | null> {
    try {
      // Get primary ENS name
      const ensName = await this.client.getEnsName({
        address: address as `0x${string}`,
      });

      if (!ensName) {
        return {
          hasENS: false,
          primaryName: null,
          registrationDate: null,
          expiryDate: null,
        };
      }

      // Get ENS registration details (simplified - full implementation would query ENS registry)
      return {
        hasENS: true,
        primaryName: ensName,
        registrationDate: null, // Would need to query ENS registry contract
        expiryDate: null,
      };
    } catch (error: any) {
      logger.error(`Error fetching ENS data for ${address}:`, error.message);
      return null;
    }
  }

  /**
   * Resolve ENS name to address
   */
  async resolveENS(ensName: string): Promise<string | null> {
    try {
      const address = await this.client.getEnsAddress({
        name: normalize(ensName),
      });
      return address;
    } catch (error: any) {
      logger.error(`Error resolving ENS name ${ensName}:`, error.message);
      return null;
    }
  }

  /**
   * Check if address has ENS
   */
  async hasENS(address: string): Promise<boolean> {
    const data = await this.getENSData(address);
    return data?.hasENS || false;
  }
}
