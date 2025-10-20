import { DelayUtils } from '../utils/index.js';
import { type AuthInitRequest, type AuthInitResponse } from '../types/auth.js';

/**
 * Privacy-preserving API client
 */

class APIClient {
  private baseURL: string;
  private sessionToken: string | null = null;

  constructor(baseURL: string = import.meta.env.VITE_API_URL || '/api') {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Add random delay to prevent timing analysis
    await DelayUtils.randomDelay(100, 500);

    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(this.sessionToken && { Authorization: `Bearer ${this.sessionToken}` }),
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      // Add jitter to response timing
      const data = await DelayUtils.addJitter(response.json(), 200);
      return data as T;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Authentication endpoints
  async initAuth(request: AuthInitRequest): Promise<AuthInitResponse> {
    const response = await this.request<AuthInitResponse>('/auth/init', {
      method: 'POST',
      body: JSON.stringify(request),
    });

    this.sessionToken = response.sessionToken;
    return response;
  }

  // Trading endpoints
  async submitOrder(order: {
    anonymousId: string;
    symbol: string;
    side: 'buy' | 'sell';
    amount: string;
    priceRange?: { min: string; max: string };
    type: 'limit' | 'market';
  }): Promise<{ orderId: string; status: string }> {
    return this.request('/orders/submit', {
      method: 'POST',
      body: JSON.stringify(order),
    });
  }

  async getOrderStatus(orderId: string): Promise<{
    orderId: string;
    status: 'pending' | 'matching' | 'executed' | 'expired';
    estimatedCompletion: 'within 5 minutes' | 'within 30 minutes' | 'unknown';
  }> {
    // Add extra delay for order status checks to prevent timing attacks
    await DelayUtils.randomDelay(1000, 3000);

    return this.request(`/orders/status/${orderId}`);
  }

  async cancelOrder(orderId: string): Promise<{ success: boolean }> {
    return this.request(`/orders/cancel/${orderId}`, {
      method: 'DELETE',
    });
  }

  // Market data endpoints
  async getMarketOverview(symbol: string): Promise<{
    symbol: string;
    price: '****';
    change: '+*.*%';
    liquidity: 'high' | 'medium' | 'low';
    spread: {
      min: string;
      max: string;
    };
  }> {
    return this.request(`/market/overview/${symbol}`);
  }

  async getLiquidityIndicator(symbol: string): Promise<{
    level: 'very-low' | 'low' | 'medium' | 'high' | 'very-high';
    description: string;
  }> {
    return this.request(`/market/liquidity/${symbol}`);
  }

  // Compliance endpoints
  async generateComplianceProof(request: {
    anonymousId: string;
    period: {
      start: string;
      end: string;
    };
    disclosureLevel: 'pnl' | 'counterparties' | 'full';
  }): Promise<{
    zkProof: string;
    encryptedData: string;
    verificationKey: string;
  }> {
    // Simulate ZK-proof generation time
    await DelayUtils.randomDelay(2000, 5000);

    return this.request('/compliance/proof', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async submitAuditReport(request: {
    anonymousId: string;
    reportData: string;
    period: string;
  }): Promise<{ reportId: string; timestamp: string }> {
    return this.request('/compliance/audit', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Privacy endpoints
  async updatePrivacySettings(settings: {
    blurLevel: number;
    showAmounts: boolean;
    showHistory: boolean;
    dataRetention: number;
  }): Promise<{ success: boolean }> {
    return this.request('/privacy/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
  }

  async requestDataDeletion(): Promise<{ deletionId: string; estimatedDays: number }> {
    return this.request('/privacy/delete', {
      method: 'POST',
    });
  }

  // Session management
  setSessionToken(token: string): void {
    this.sessionToken = token;
  }

  clearSession(): void {
    this.sessionToken = null;
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.request('/health');
  }
}

export const apiClient = new APIClient();