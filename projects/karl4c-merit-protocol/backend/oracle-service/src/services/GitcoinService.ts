import axios from 'axios';
import { GitcoinPassportData } from '../types';
import { logger } from '../utils/logger';

/**
 * Gitcoin Passport Service
 * Fetches user's Gitcoin Passport score and stamps
 */
export class GitcoinService {
  private apiKey: string;
  private baseUrl = 'https://api.scorer.gitcoin.co';
  private scorerId: string;

  constructor(apiKey?: string, scorerId: string = '1') {
    this.apiKey = apiKey || '';
    this.scorerId = scorerId;
  }

  /**
   * Fetch Gitcoin Passport data for a user
   * @param address User's Ethereum address
   * @returns GitcoinPassportData or null if not found
   */
  async getPassportData(address: string): Promise<GitcoinPassportData | null> {
    try {
      if (!this.apiKey) {
        logger.warn('Gitcoin API key not configured, using mock data');
        return this.getMockData(address);
      }

      const response = await axios.get(
        `${this.baseUrl}/registry/score/${this.scorerId}/${address}`,
        {
          headers: {
            'X-API-KEY': this.apiKey,
          },
          timeout: 10000,
        }
      );

      const data = response.data;

      return {
        score: parseFloat(data.score || '0'),
        stamps: data.evidence?.rawScore || 0,
        lastUpdated: data.last_score_timestamp || new Date().toISOString(),
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        logger.info(`No Gitcoin Passport found for ${address}`);
        return {
          score: 0,
          stamps: 0,
          lastUpdated: new Date().toISOString(),
        };
      }

      logger.error(`Error fetching Gitcoin Passport for ${address}:`, error.message);
      return null;
    }
  }

  /**
   * Get mock data for testing (when API key is not available)
   */
  private getMockData(address: string): GitcoinPassportData {
    // Generate deterministic mock score based on address
    const hash = parseInt(address.slice(2, 10), 16);
    const score = (hash % 50) + 10; // Score between 10-60

    return {
      score,
      stamps: Math.floor(score / 2),
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Check if user has a valid Gitcoin Passport
   */
  async hasValidPassport(address: string, minScore: number = 15): Promise<boolean> {
    const data = await this.getPassportData(address);
    return data !== null && data.score >= minScore;
  }
}
