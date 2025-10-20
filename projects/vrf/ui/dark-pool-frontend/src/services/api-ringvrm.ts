import { DelayUtils } from '../utils/index.js';
import { RingMixerService } from './ring-mixer.js';
import { RingSignatureGenerator } from '../utils/ring-signature.js';
import type {
  MixPool,
  MixRequest,
  MixTransaction,
  RingVRMStats
} from '../types/ringvrm.js';

/**
 * Ring VRM API Extension
 * Adds blockchain analysis resistance to the dark pool
 */

class RingVRMAPIClient {
  private baseURL: string;
  private sessionToken: string | null = null;
  private mixerService: RingMixerService;
  private ringGenerator: RingSignatureGenerator;

  constructor(baseURL: string = import.meta.env.VITE_API_URL || '/api') {
    this.baseURL = baseURL;
    this.mixerService = new RingMixerService();
    this.ringGenerator = new RingSignatureGenerator();
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Add enhanced random delay for Ring VRM operations
    await DelayUtils.randomDelay(200, 1000);

    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'X-Ring-VRM': 'true',
      ...(this.sessionToken && { Authorization: `Bearer ${this.sessionToken}` }),
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        throw new Error(`Ring VRM API Error: ${response.status} ${response.statusText}`);
      }

      // Add enhanced jitter for timing analysis resistance
      const data = await DelayUtils.addJitter(response.json(), 500);
      return data as T;
    } catch (error) {
      console.error('Ring VRM API request failed:', error);
      throw error;
    }
  }

  /**
   * Create a new mixing pool
   */
  async createMixPool(request: {
    asset: string;
    minAmount: string;
    maxAmount: string;
    mixDepth?: number;
  }): Promise<MixPool> {
    return this.mixerService.createMixPool(
      request.asset,
      request.minAmount,
      request.maxAmount,
      request.mixDepth
    );
  }

  /**
   * Submit a mix request with ring signature
   */
  async submitMix(request: {
    poolId: string;
    inputAddress: string;
    outputAddresses: string[];
    amount: string;
    privateKey: string;
    mixDepth?: number;
    delayRange?: { min: number; max: number };
  }): Promise<MixTransaction> {
    // Generate ring signature for the mix
    const decoys = await this.ringGenerator.selectDecoys(
      10, // Ring size of 11 including signer
      request.inputAddress,
      'ETH'
    );

    const ringMembers = [
      { address: request.inputAddress, publicKey: '' }, // Will be filled by wallet
      ...decoys
    ];

    const signerIndex = 0;
    const ringSignature = await this.ringGenerator.generateRingSignature(
      `mix-${request.poolId}-${request.amount}`,
      request.privateKey,
      ringMembers,
      signerIndex
    );

    const mixRequest: MixRequest = {
      poolId: request.poolId,
      inputAddress: request.inputAddress,
      outputAddresses: request.outputAddresses,
      amount: request.amount,
      mixDepth: request.mixDepth || 3,
      delayRange: request.delayRange || { min: 10, max: 50 },
      ringSignature
    };

    return this.mixerService.joinMixPool(request.poolId, mixRequest);
  }

  /**
   * Execute mixing for a pool
   */
  async executeMix(poolId: string): Promise<void> {
    await this.mixerService.executeMix(poolId);
  }

  /**
   * Get available mixing pools
   */
  async getAvailablePools(asset?: string): Promise<MixPool[]> {
    const pools = await this.mixerService.findEligiblePools(
      asset || 'ETH',
      '1' // Minimum amount
    );
    return pools;
  }

  /**
   * Get pool statistics
   */
  async getPoolStats(poolId: string): Promise<{
    pool: MixPool;
    transactionCount: number;
    totalVolume: string;
    averageMixTime: number;
  }> {
    return this.mixerService.getPoolStats(poolId);
  }

  /**
   * Get Ring VRM system statistics
   */
  async getRingVRMStats(): Promise<RingVRMStats> {
    return this.mixerService.getRingVRMStats();
  }

  /**
   * Verify a ring signature
   */
  async verifyRingSignature(
    signature: any,
    message: string
  ): Promise<boolean> {
    return this.ringGenerator.verifyRingSignature(signature, message);
  }

  /**
   * Enhanced trading endpoint with Ring VRM
   */
  async submitOrderWithRingVRM(order: {
    symbol: string;
    side: 'buy' | 'sell';
    amount: string;
    priceRange?: { min: string; max: string };
    useMixing: boolean;
    mixDepth?: number;
    privateKey?: string;
  }): Promise<{ orderId: string; mixTxId?: string }> {
    // First submit the regular order with enhanced delay
    await DelayUtils.randomDelay(500, 2000);

    const orderResponse = await this.request<{ orderId: string }>('/orders/submit', {
      method: 'POST',
      body: JSON.stringify({
        symbol: order.symbol,
        side: order.side,
        amount: order.amount,
        priceRange: order.priceRange,
        anonymousId: localStorage.getItem('anonymousId'),
        timestamp: Date.now()
      })
    });

    // If mixing is enabled, create mix transaction
    if (order.useMixing && order.privateKey) {
      const pools = await this.getAvailablePools('ETH');

      if (pools.length > 0) {
        const pool = pools[0]; // Use the first available pool

        const mixTx = await this.submitMix({
          poolId: pool.id,
          inputAddress: '0x' + '0'.repeat(40), // User's address (would come from wallet)
          outputAddresses: [
            '0x' + '0'.repeat(40), // Output address 1
            '0x' + '0'.repeat(40)  // Output address 2
          ],
          amount: order.amount,
          privateKey: order.privateKey,
          mixDepth: order.mixDepth || 3
        });

        // Execute mixing
        await this.executeMix(pool.id);

        return {
          orderId: orderResponse.orderId,
          mixTxId: mixTx.id
        };
      }
    }

    return orderResponse;
  }

  /**
   * Get order status with Ring VRM information
   */
  async getOrderStatusWithRingVRM(orderId: string): Promise<{
    orderId: string;
    status: string;
    mixStatus?: string;
    mixTxId?: string;
    estimatedCompletion: string;
  }> {
    // Add extra delay for privacy
    await DelayUtils.randomDelay(1000, 3000);

    const status = await this.request<any>(`/orders/${orderId}/status`);

    // If order has associated mix transaction, get its status
    if (status.mixTxId) {
      const mixTx = this.mixerService.mixTransactions.get(status.mixTxId);
      if (mixTx) {
        return {
          orderId: status.orderId,
          status: status.status,
          mixStatus: mixTx.status,
          mixTxId: mixTx.id,
          estimatedCompletion: 'within 30 minutes'
        };
      }
    }

    return {
      orderId: status.orderId,
      status: status.status,
      estimatedCompletion: status.estimatedCompletion || 'unknown'
    };
  }

  /**
   * Get market data with Ring VRM obfuscation
   */
  async getMarketDataWithRingVRM(symbol: string): Promise<{
    symbol: string;
    price: string;
    change: string;
    liquidity: 'high' | 'medium' | 'low';
    ringVRMActive: boolean;
    anonymitySetSize: number;
  }> {
    await DelayUtils.randomDelay(300, 800);

    const baseData = await this.request<any>(`/market/${symbol}`);
    const stats = await this.getRingVRMStats();

    return {
      symbol: baseData.symbol,
      price: '****', // Always obscured with Ring VRM
      change: '+*.*%',
      liquidity: baseData.liquidity,
      ringVRMActive: true,
      anonymitySetSize: stats.currentAnonymitySet
    };
  }

  /**
   * Clean up expired pools
   */
  async cleanup(): Promise<void> {
    await this.mixerService.cleanupExpiredPools();
  }
}

// Export singleton instance
export const ringVRMAPI = new RingVRMAPIClient();
export default ringVRMAPI;