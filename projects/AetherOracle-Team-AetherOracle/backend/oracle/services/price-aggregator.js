/**
 * Multi-Source Price Aggregator Service
 *
 * Aggregates prices from multiple sources:
 * - 1inch DEX Aggregator (primary for DEX prices)
 * - Pyth Network Oracle
 * - Chainlink Oracle
 * - Uniswap V3 TWAP
 * - AI Predictions (for confidence scoring)
 *
 * Features:
 * - Weighted average based on source reliability
 * - Outlier detection and filtering
 * - Confidence scoring
 * - Failover mechanisms
 */

const { oneInchService } = require('./1inch-service');
const axios = require('axios');
const { ethers } = require('ethers');

// Weight configuration for different sources
const SOURCE_WEIGHTS = {
  '1inch': 0.35,      // Highest weight - real DEX liquidity
  'pyth': 0.25,       // Oracle data
  'chainlink': 0.25,  // Oracle data
  'uniswap': 0.10,    // Single DEX
  'ai_prediction': 0.05, // Lowest weight - predictive only
};

// Confidence thresholds
const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.9,
  MEDIUM: 0.7,
  LOW: 0.5,
};

// Cache for aggregated prices
const aggregatedPriceCache = new Map();
const CACHE_DURATION = 10000; // 10 seconds

class PriceAggregatorService {
  constructor() {
    this.sources = {
      '1inch': this.get1inchPrice.bind(this),
      'pyth': this.getPythPrice.bind(this),
      'chainlink': this.getChainlinkPrice.bind(this),
      'uniswap': this.getUniswapPrice.bind(this),
      'ai_prediction': this.getAIPrediction.bind(this),
    };

    this.stats = {
      totalQueries: 0,
      successfulQueries: 0,
      failedQueries: 0,
      sourceFailures: {},
      averageResponseTime: 0,
    };

    // Initialize Pyth connection
    this.pythEndpoint = 'https://api.pyth.network/v1';

    // Initialize provider for on-chain oracles
    this.provider = new ethers.providers.JsonRpcProvider(
      process.env.RPC_URL || 'https://sepolia.optimism.io'
    );
  }

  /**
   * Main aggregation function
   */
  async getAggregatedPrice(pair, amountUSD = 1000, options = {}) {
    const startTime = Date.now();
    this.stats.totalQueries++;

    // Check cache first
    const cacheKey = `${pair}_${amountUSD}`;
    const cached = aggregatedPriceCache.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log(`📦 Using cached aggregated price for ${pair}`);
      return cached;
    }

    try {
      // Fetch prices from all sources in parallel
      const pricePromises = Object.entries(this.sources).map(async ([source, fetchFunc]) => {
        try {
          const price = await fetchFunc(pair, amountUSD);
          return {
            source,
            price: price.price || price.rate || price,
            confidence: price.confidence || this.getDefaultConfidence(source),
            timestamp: Date.now(),
            metadata: price,
          };
        } catch (error) {
          console.error(`❌ ${source} failed for ${pair}: ${error.message}`);
          this.stats.sourceFailures[source] = (this.stats.sourceFailures[source] || 0) + 1;
          return null;
        }
      });

      const prices = (await Promise.all(pricePromises)).filter(p => p !== null);

      if (prices.length === 0) {
        throw new Error('All price sources failed');
      }

      // Filter outliers
      const filteredPrices = this.filterOutliers(prices);

      // Calculate weighted average
      const aggregatedPrice = this.calculateWeightedAverage(filteredPrices);

      // Calculate overall confidence
      const confidence = this.calculateConfidence(filteredPrices, prices);

      // Get the best settlement path (primarily from 1inch)
      const settlementPath = await this.getBestSettlementPath(pair, amountUSD, filteredPrices);

      // ✅ Convert sources to object format {sourceName: price} for consistency with Python fetcher
      const sourcesObject = {};
      filteredPrices.forEach(p => {
        sourcesObject[p.source] = p.price;
      });

      const result = {
        pair,
        aggregatedPrice,
        confidence,
        sources: sourcesObject,  // ✅ Now returns {sourceName: price} instead of array
        source_count: filteredPrices.length,  // ✅ Add source count for frontend
        outliers: prices.length - filteredPrices.length,
        settlementPath,
        timestamp: Date.now(),
        responseTime: Date.now() - startTime,
      };

      // Cache the result
      aggregatedPriceCache.set(cacheKey, result);

      // Update stats
      this.stats.successfulQueries++;
      this.stats.averageResponseTime =
        (this.stats.averageResponseTime * (this.stats.successfulQueries - 1) + result.responseTime) /
        this.stats.successfulQueries;

      return result;
    } catch (error) {
      this.stats.failedQueries++;
      console.error(`❌ Aggregation failed for ${pair}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get price from 1inch
   */
  async get1inchPrice(pair, amountUSD) {
    try {
      const result = await oneInchService.getPairPrice(pair, amountUSD);
      return {
        price: result.price,
        confidence: 0.95, // High confidence for real DEX prices
        protocols: result.protocols,
        estimatedGas: result.estimatedGas,
      };
    } catch (error) {
      console.error('1inch price fetch failed:', error.message);
      throw error;
    }
  }

  /**
   * Get price from Pyth Network
   */
  async getPythPrice(pair, amountUSD) {
    try {
      // Map pair to Pyth price feed ID
      const feedId = this.getPythFeedId(pair);
      if (!feedId) {
        throw new Error(`No Pyth feed for ${pair}`);
      }

      const response = await axios.get(
        `${this.pythEndpoint}/price_feeds/${feedId}`,
        { timeout: 3000 }
      );

      const priceData = response.data;
      const price = parseFloat(priceData.price) / Math.pow(10, priceData.expo);
      const confidence = 1 - (parseFloat(priceData.conf) / parseFloat(priceData.price));

      return {
        price,
        confidence,
        publishTime: priceData.publish_time,
      };
    } catch (error) {
      console.error('Pyth price fetch failed:', error.message);
      throw error;
    }
  }

  /**
   * Get price from Chainlink
   */
  async getChainlinkPrice(pair, amountUSD) {
    try {
      // Map pair to Chainlink aggregator address
      const aggregatorAddress = this.getChainlinkAggregator(pair);
      if (!aggregatorAddress) {
        throw new Error(`No Chainlink feed for ${pair}`);
      }

      // ABI for Chainlink price feed
      const abi = [
        'function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
        'function decimals() external view returns (uint8)',
      ];

      const contract = new ethers.Contract(aggregatorAddress, abi, this.provider);
      const [roundData, decimals] = await Promise.all([
        contract.latestRoundData(),
        contract.decimals(),
      ]);

      const price = parseFloat(roundData.answer) / Math.pow(10, decimals);
      const age = Date.now() / 1000 - roundData.updatedAt;
      const confidence = age < 3600 ? 0.9 : 0.7; // Lower confidence for stale data

      return {
        price,
        confidence,
        updatedAt: roundData.updatedAt.toNumber(),
        roundId: roundData.roundId.toString(),
      };
    } catch (error) {
      console.error('Chainlink price fetch failed:', error.message);
      throw error;
    }
  }

  /**
   * Get price from Uniswap V3 TWAP
   */
  async getUniswapPrice(pair, amountUSD) {
    try {
      // This is a simplified implementation
      // In production, you'd query the actual Uniswap V3 pool
      const [token0, token1] = pair.split('/');

      // Mock implementation - replace with actual Uniswap V3 integration
      const mockPrices = {
        'BTC/USDT': 65000,
        'ETH/USDT': 3500,
        'SOL/USDT': 120,
      };

      const price = mockPrices[pair];
      if (!price) {
        throw new Error(`No Uniswap pool for ${pair}`);
      }

      return {
        price,
        confidence: 0.85,
        source: 'uniswap_v3',
      };
    } catch (error) {
      console.error('Uniswap price fetch failed:', error.message);
      throw error;
    }
  }

  /**
   * Get AI prediction
   */
  async getAIPrediction(pair, amountUSD) {
    try {
      const response = await axios.get(
        `http://localhost:3001/predict?pair=${pair}&amount=${amountUSD}`,
        { timeout: 3000 }
      );

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      return {
        price: response.data.predicted_price,
        confidence: response.data.confidence,
        horizon: response.data.prediction_horizon,
      };
    } catch (error) {
      console.error('AI prediction failed:', error.message);
      throw error;
    }
  }

  /**
   * Filter outliers using IQR method
   */
  filterOutliers(prices) {
    if (prices.length < 3) return prices;

    const values = prices.map(p => p.price).sort((a, b) => a - b);
    const q1 = values[Math.floor(values.length * 0.25)];
    const q3 = values[Math.floor(values.length * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    return prices.filter(p => p.price >= lowerBound && p.price <= upperBound);
  }

  /**
   * Calculate weighted average price
   */
  calculateWeightedAverage(prices) {
    let totalWeight = 0;
    let weightedSum = 0;

    for (const priceData of prices) {
      const weight = SOURCE_WEIGHTS[priceData.source] || 0.1;
      const adjustedWeight = weight * priceData.confidence;

      weightedSum += priceData.price * adjustedWeight;
      totalWeight += adjustedWeight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : prices[0].price;
  }

  /**
   * Calculate overall confidence score
   */
  calculateConfidence(filteredPrices, allPrices) {
    // Base confidence on number of sources
    const sourceRatio = filteredPrices.length / Object.keys(this.sources).length;

    // Calculate price variance
    const prices = filteredPrices.map(p => p.price);
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
    const coefficientOfVariation = Math.sqrt(variance) / mean;

    // Lower confidence for high variance
    const varianceConfidence = Math.max(0.5, 1 - coefficientOfVariation * 10);

    // Average confidence from sources
    const avgSourceConfidence = filteredPrices.reduce((sum, p) => sum + p.confidence, 0) / filteredPrices.length;

    // Combine factors
    const overallConfidence = (sourceRatio * 0.3 + varianceConfidence * 0.3 + avgSourceConfidence * 0.4);

    return Math.min(0.99, Math.max(0.5, overallConfidence));
  }

  /**
   * Get best settlement path
   */
  async getBestSettlementPath(pair, amountUSD, prices) {
    // Prefer 1inch settlement path if available
    const oneInchPrice = prices.find(p => p.source === '1inch');
    if (oneInchPrice && oneInchPrice.metadata) {
      try {
        return await oneInchService.getOptimalSettlementPath(pair, amountUSD);
      } catch (error) {
        console.error('Failed to get 1inch settlement path:', error.message);
      }
    }

    // Fallback to generic settlement path
    return {
      name: 'Multi-Source Aggregated Route',
      protocol: 'Aggregated',
      estimated_cost_pct: 0.5,
      settlement_time_seconds: 30,
      reliability: 0.95,
      risk_level: 'low',
      reason: `Aggregated from ${prices.length} sources`,
      alternative_paths: ['1inch Router', 'Uniswap V3', 'Curve'],
    };
  }

  /**
   * Get Pyth feed ID for pair
   */
  getPythFeedId(pair) {
    const feedIds = {
      'BTC/USDT': '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
      'ETH/USDT': '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
      'SOL/USDT': '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
      // Add more feed IDs as needed
    };
    return feedIds[pair];
  }

  /**
   * Get Chainlink aggregator address for pair
   */
  getChainlinkAggregator(pair) {
    // These are example addresses - replace with actual Chainlink aggregators on Optimism Sepolia
    const aggregators = {
      'BTC/USD': '0x0000000000000000000000000000000000000001',
      'ETH/USD': '0x0000000000000000000000000000000000000002',
      'SOL/USD': '0x0000000000000000000000000000000000000003',
    };

    // Handle USDT pairs by converting to USD
    const convertedPair = pair.replace('/USDT', '/USD');
    return aggregators[convertedPair];
  }

  /**
   * Get default confidence for source
   */
  getDefaultConfidence(source) {
    const defaults = {
      '1inch': 0.95,
      'pyth': 0.90,
      'chainlink': 0.90,
      'uniswap': 0.85,
      'ai_prediction': 0.70,
    };
    return defaults[source] || 0.5;
  }

  /**
   * Get aggregator statistics
   */
  getStats() {
    return {
      ...this.stats,
      cacheSize: aggregatedPriceCache.size,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
    };
  }

  /**
   * Clear all caches
   */
  clearCache() {
    aggregatedPriceCache.clear();
    oneInchService.clearCache();
    console.log('✅ All caches cleared');
  }

  /**
   * Health check for all sources
   */
  async healthCheck() {
    const results = {};

    for (const [source, fetchFunc] of Object.entries(this.sources)) {
      try {
        // Try to fetch a common pair
        await fetchFunc('ETH/USDT', 1000);
        results[source] = { healthy: true };
      } catch (error) {
        results[source] = { healthy: false, error: error.message };
      }
    }

    return {
      timestamp: Date.now(),
      sources: results,
      overall: Object.values(results).some(r => r.healthy),
    };
  }
}

// Create singleton instance
const aggregatorService = new PriceAggregatorService();

module.exports = {
  aggregatorService,
  PriceAggregatorService,
  SOURCE_WEIGHTS,
  CONFIDENCE_THRESHOLDS,
};