// Oracle API Client for AI Predictions
export const ORACLE_API_URL = process.env.NEXT_PUBLIC_ORACLE_API_URL || 'http://localhost:3001';

export interface SettlementPath {
  recommended?: string;
  name: string;
  protocol: string;
  estimated_cost_pct: number;
  settlement_time_seconds: number;
  finality_time_seconds?: number;
  reliability: number;
  reason: string;
  gas_estimate?: string;
  alternative_paths?: string[];
  risk_level: 'low' | 'medium' | 'high' | 'very_low';
  batch_size?: number;
  selected_at?: string;
  optimization_factors?: {
    pair: string;
    pair_type: string;
    amount_usd: number;
    confidence: number;
    score: number;
  };
}

export interface AIPrediction {
  pair: string;
  predicted_price: number;
  confidence: number;
  meets_threshold: boolean;
  timestamp: string;
  current_price?: number;
  price_change?: number;
  prediction_horizon?: string;
  optimal_settlement_path?: SettlementPath;
  source_count?: number;
  // ✅ Support object format {sourceName: price} (unified across all sources)
  sources?: Record<string, number>;
  is_realtime?: boolean;
}

export interface RealtimePrice {
  pair: string;
  aggregated_price: number;
  source_count: number;
  sources: Record<string, number>;
  confidence: number;
  spread: number;
  timestamp: string;
  reference_price?: number;
  is_simulated?: boolean;
}

export async function fetchRealtimePrice(pair: string): Promise<RealtimePrice | null> {
  try {
    const encodedPair = encodeURIComponent(pair);
    const response = await fetch(`${ORACLE_API_URL}/realtime?pair=${encodedPair}` , {
      method: 'GET',
      mode: 'cors',
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch realtime price:', error);
    return null;
  }
}

export async function fetchAIPrediction(pair: string): Promise<AIPrediction | null> {
  try {
    // First try to get real-time price from 6 data sources
    const realtimePrice = await fetchRealtimePrice(pair);

    // URL encode the trading pair (e.g., "USDC/USDT" -> "USDC%2FUSDT")
    const encodedPair = encodeURIComponent(pair);
    const response = await fetch(`${ORACLE_API_URL}/predict?pair=${encodedPair}`, {
      method: 'GET',
      mode: 'cors',
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      // If AI prediction fails but we have realtime price, use that
      if (realtimePrice) {
        return {
          pair: pair,
          predicted_price: realtimePrice.aggregated_price,
          confidence: realtimePrice.confidence,
          meets_threshold: true,
          timestamp: realtimePrice.timestamp,
          current_price: realtimePrice.aggregated_price,
          price_change: 0,
          prediction_horizon: 'realtime',
          source_count: realtimePrice.source_count,
          sources: realtimePrice.sources,
          is_realtime: true,
        };
      }

      // If 404 or other error, check if response has JSON error message
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        if (errorData.error === 'prediction_unavailable') {
          // Gracefully handle unavailable predictions (e.g., for stablecoin pairs)
          console.info(`AI prediction not available for ${pair}, using on-chain fallback`);
          return null;
        }
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Check if data indicates prediction error
    if (data.error === 'prediction_unavailable') {
      // If we have realtime price, use it
      if (realtimePrice) {
        return {
          pair: pair,
          predicted_price: realtimePrice.aggregated_price,
          confidence: realtimePrice.confidence,
          meets_threshold: true,
          timestamp: realtimePrice.timestamp,
          current_price: realtimePrice.aggregated_price,
          price_change: 0,
          prediction_horizon: 'realtime',
          source_count: realtimePrice.source_count,
          sources: realtimePrice.sources,
          is_realtime: true,
        };
      }
      console.info(`AI prediction not available for ${pair}, using on-chain fallback`);
      return null;
    }

    // Merge realtime price with AI prediction
    if (realtimePrice && realtimePrice.aggregated_price) {
      data.current_price = realtimePrice.aggregated_price;
      // If AI prediction is way off, prefer realtime price
      const priceDiff = Math.abs(data.predicted_price - realtimePrice.aggregated_price) / realtimePrice.aggregated_price;
      if (priceDiff > 0.1) { // More than 10% difference
        data.predicted_price = realtimePrice.aggregated_price;
        data.is_realtime = true;
      }
      data.source_count = realtimePrice.source_count;
      data.sources = realtimePrice.sources;
    }

    return data;
  } catch (error) {
    console.error('Failed to fetch AI prediction:', error);
    return null;
  }
}

export interface OracleStats {
  uptime: number;
  memory_usage: any;
  active_pairs: string[];
  last_update: string;
  redis_connected: boolean;
  blockchain_connected: boolean;
}

export async function fetchOracleStats(): Promise<OracleStats | null> {
  try {
    const response = await fetch(`${ORACLE_API_URL}/stats`);
    if (!response.ok) throw new Error('Failed to fetch stats');
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch oracle stats:', error);
    return null;
  }
}

/**
 * Fetch optimal settlement path recommendation from AI optimizer
 * @param pair Trading pair (e.g., "USDC/USDT")
 * @param amount Order amount in USD
 * @param confidence AI prediction confidence (0-1)
 * @returns Settlement path recommendation or null if unavailable
 */
export async function fetchSettlementPath(
  pair: string,
  amount: number = 1000,
  confidence: number = 0.9
): Promise<SettlementPath | null> {
  try {
    const encodedPair = encodeURIComponent(pair);
    const url = `${ORACLE_API_URL}/settlement-path?pair=${encodedPair}&amount=${amount}&confidence=${confidence}`;

    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.warn(`Failed to fetch settlement path for ${pair}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch settlement path:', error);
    return null;
  }
}

