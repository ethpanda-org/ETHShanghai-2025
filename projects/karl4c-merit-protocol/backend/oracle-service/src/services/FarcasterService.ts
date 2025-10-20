import axios from 'axios';
import { FarcasterData } from '../types';
import { logger } from '../utils/logger';

/**
 * Farcaster Service
 * Fetches user's Farcaster profile data using Neynar API
 */
export class FarcasterService {
  private neynarApiUrl = 'https://api.neynar.com/v2/farcaster';
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  /**
   * Get Farcaster profile data for an address
   * @param address User's Ethereum address
   * @returns FarcasterData or null if error
   */
  async getFarcasterData(address: string): Promise<FarcasterData | null> {
    try {
      if (!this.apiKey) {
        logger.warn('Neynar API key not configured, using mock data');
        return this.getMockData(address);
      }

      // Neynar API: Get user by verified address
      const response = await axios.get(
        `${this.neynarApiUrl}/user/bulk-by-address`,
        {
          params: {
            addresses: address.toLowerCase(),
          },
          headers: {
            'api_key': this.apiKey,
          },
          timeout: 10000,
        }
      );

      const users = response.data?.[address.toLowerCase()];

      if (!users || users.length === 0) {
        logger.info(`No Farcaster profile found for ${address}`);
        return {
          hasProfile: false,
          username: null,
          followers: 0,
          following: 0,
          casts: 0,
        };
      }

      const user = users[0];

      return {
        hasProfile: true,
        username: user?.username || null,
        followers: user?.follower_count || 0,
        following: user?.following_count || 0,
        casts: user?.cast_count || 0,
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        logger.info(`No Farcaster profile found for ${address}`);
        return {
          hasProfile: false,
          username: null,
          followers: 0,
          following: 0,
          casts: 0,
        };
      }
      
      logger.error(`Error fetching Farcaster data for ${address}:`, error.message);
      return null;
    }
  }

  /**
   * Get mock data for testing
   */
  private getMockData(address: string): FarcasterData {
    const hash = parseInt(address.slice(2, 10), 16);
    const hasProfile = hash % 4 === 0; // ~25% have Farcaster

    if (!hasProfile) {
      return {
        hasProfile: false,
        username: null,
        followers: 0,
        following: 0,
        casts: 0,
      };
    }

    return {
      hasProfile: true,
      username: `fc-${address.slice(2, 8)}`,
      followers: (hash % 300) + 5,
      following: (hash % 150) + 3,
      casts: (hash % 200) + 1,
    };
  }

  /**
   * Check if user has Farcaster profile
   */
  async hasFarcasterProfile(address: string): Promise<boolean> {
    const data = await this.getFarcasterData(address);
    return data?.hasProfile || false;
  }
}
