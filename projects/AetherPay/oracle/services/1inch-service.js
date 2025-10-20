/**
 * 1inch DEX Aggregator Service for Oracle Backend
 *
 * This service integrates 1inch API to provide:
 * - Real-time DEX price quotes
 * - Optimal swap routes
 * - Multi-protocol aggregation
 * - MEV protection through proper slippage settings
 */

const axios = require('axios');

// Configuration
const INCH_API_KEY = 'q2hUCarQSIrIGoCKKvKAylvyLiwebTpH';
const INCH_API_BASE = 'https://api.1inch.dev';
const CHAIN_ID = 11155420; // Optimism Sepolia

// Cache configuration
const priceCache = new Map();
const CACHE_DURATION = 10000; // 10 seconds cache

// Token addresses (Optimism Sepolia)
const TOKEN_ADDRESSES = {
  // Stablecoins
  USDC: '0xb7225051e57db0296C1F56fbD536Acd06c889724',
  USDT: '0x87a9Ce8663BF89D0e273068c2286Df44Ef6622D2',
  DAI: '0x453Cbf07Af7293FDee270C9A15a95aedaEaA383e',

  // Wrapped Assets
  WETH: '0x134AA0b1B739d80207566B473534601DCea2aD92',
  WBTC: '0xCA38436dB07b3Ee43851E6de3A0A9333738eAC9A',
  ETH: '0x134AA0b1B739d80207566B473534601DCea2aD92', // Same as WETH
  BTC: '0xCA38436dB07b3Ee43851E6de3A0A9333738eAC9A', // Same as WBTC

  // Additional Crypto
  SOL: '0x738A919d321b2684f2020Ba05eb754785B59Cfa1',
  ADA: '0x2FB8F2b959fEA1fAC5A85d5eFaD9AF194028365d',
  BNB: '0xcF20D332E50cF90cd37bD716480A58a7CFE71C2B',
  MATIC: '0x5eC2F154e608Bc6e928a46a8BE8ADB51F912192B',
  AVAX: '0xe6e9a8ff8B88B81DE680f08dd78B82F93f24A456',
};

// Token decimals
const TOKEN_DECIMALS = {
  USDC: 6,
  USDT: 6,
  DAI: 18,
  WETH: 18,
  ETH: 18,
  WBTC: 8,
  BTC: 8,
  SOL: 9,
  ADA: 6,
  BNB: 18,
  MATIC: 18,
  AVAX: 18,
};

class OneInchService {
  constructor() {
    this.apiKey = INCH_API_KEY;
    this.baseUrl = INCH_API_BASE;
    this.chainId = CHAIN_ID;
    this.requestCount = 0;
    this.lastRequestTime = 0;
    this.rateLimit = 10; // 10 requests per second
  }

  /**
   * Rate limiting helper
   */
  async _rateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < 100) { // 100ms minimum between requests
      await new Promise(resolve => setTimeout(resolve, 100 - timeSinceLastRequest));
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  /**
   * Get token address from symbol
   */
  getTokenAddress(symbol) {
    // Handle wrapped tokens
    const normalizedSymbol = symbol.replace('W', ''); // WETH -> ETH, WBTC -> BTC

    return TOKEN_ADDRESSES[symbol] || TOKEN_ADDRESSES[normalizedSymbol] || null;
  }

  /**
   * Get token decimals
   */
  getTokenDecimals(symbol) {
    const normalizedSymbol = symbol.replace('W', '');
    return TOKEN_DECIMALS[symbol] || TOKEN_DECIMALS[normalizedSymbol] || 18;
  }

  /**
   * Parse pair string (e.g., "BTC/USDT" -> ["BTC", "USDT"])
   */
  parsePair(pair) {
    const parts = pair.split('/');
    if (parts.length !== 2) {
      throw new Error(`Invalid pair format: ${pair}`);
    }
    return parts;
  }

  /**
   * Get swap quote from 1inch
   */
  async getQuote(fromToken, toToken, amountIn, options = {}) {
    await this._rateLimit();

    const fromAddress = this.getTokenAddress(fromToken);
    const toAddress = this.getTokenAddress(toToken);

    if (!fromAddress || !toAddress) {
      throw new Error(`Token addresses not found: ${fromToken} or ${toToken}`);
    }

    const fromDecimals = this.getTokenDecimals(fromToken);
    const amountWei = (parseFloat(amountIn) * Math.pow(10, fromDecimals)).toFixed(0);

    const params = new URLSearchParams({
      src: fromAddress,
      dst: toAddress,
      amount: amountWei,
      slippage: options.slippage || '1', // 1% default slippage
      fee: options.fee || '0',
      complexityLevel: options.complexityLevel || '2',
      parts: options.parts || '10',
      mainRouteParts: options.mainRouteParts || '10',
      protocols: options.protocols || '', // Empty means all protocols
    });

    if (options.from) {
      params.append('from', options.from);
    }
    if (options.gasPrice) {
      params.append('gasPrice', options.gasPrice);
    }

    try {
      const url = `${this.baseUrl}/swap/v6.0/${this.chainId}/quote?${params.toString()}`;

      console.log(`📊 Fetching 1inch quote for ${fromToken} -> ${toToken}, amount: ${amountIn}`);

      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json',
        },
        timeout: 5000,
      });

      const data = response.data;

      // Calculate the exchange rate
      const toDecimals = this.getTokenDecimals(toToken);
      const dstAmount = parseFloat(data.dstAmount) / Math.pow(10, toDecimals);
      const srcAmount = parseFloat(data.srcAmount) / Math.pow(10, fromDecimals);
      const rate = dstAmount / srcAmount;

      // Extract protocols used
      const protocols = data.protocols || [];
      const protocolNames = [...new Set(protocols.map(p => p[0][0].name))];

      return {
        rate,
        srcAmount,
        dstAmount,
        srcToken: fromToken,
        dstToken: toToken,
        protocols: protocolNames,
        estimatedGas: data.estimatedGas,
        tx: data.tx,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error(`❌ 1inch API error: ${error.message}`);

      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }

      throw error;
    }
  }

  /**
   * Get price for a trading pair with caching
   */
  async getPairPrice(pair, amountUSD = 1000) {
    const cacheKey = `${pair}_${amountUSD}`;
    const cached = priceCache.get(cacheKey);

    // Return cached price if still valid
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log(`📦 Using cached price for ${pair}`);
      return cached;
    }

    const [fromToken, toToken] = this.parsePair(pair);

    try {
      const quote = await this.getQuote(fromToken, toToken, amountUSD);

      const result = {
        pair,
        price: quote.rate,
        srcAmount: quote.srcAmount,
        dstAmount: quote.dstAmount,
        protocols: quote.protocols,
        estimatedGas: quote.estimatedGas,
        timestamp: Date.now(),
        source: '1inch',
      };

      // Cache the result
      priceCache.set(cacheKey, result);

      return result;
    } catch (error) {
      console.error(`Failed to get price for ${pair}:`, error.message);

      // Return last cached value if available
      if (cached) {
        console.log(`⚠️ Using stale cache for ${pair} due to API error`);
        return { ...cached, stale: true };
      }

      throw error;
    }
  }

  /**
   * Get optimal settlement path based on 1inch routing
   */
  async getOptimalSettlementPath(pair, amountUSD = 1000, confidence = 0.9) {
    try {
      const quote = await this.getPairPrice(pair, amountUSD);

      if (!quote || !quote.protocols) {
        return this.getFallbackSettlementPath(pair, amountUSD);
      }

      const gasEstimate = parseInt(quote.estimatedGas || 200000);
      const protocolCount = quote.protocols.length;

      // Calculate estimated cost based on gas
      // Assume gas price of 0.1 Gwei on Optimism
      const gasPrice = 0.1; // Gwei
      const ethPrice = 3500; // USD
      const gasCostUSD = (gasEstimate * gasPrice * ethPrice) / 1e9;
      const costPercentage = Math.min((gasCostUSD / amountUSD) * 100, 2.0);

      // Determine settlement time based on routing complexity
      let settlementTime;
      let riskLevel;

      if (protocolCount === 1) {
        settlementTime = 15;
        riskLevel = 'low';
      } else if (protocolCount <= 3) {
        settlementTime = 25;
        riskLevel = 'low';
      } else {
        settlementTime = 35;
        riskLevel = 'medium';
      }

      // Build protocol path description
      const pathDescription = quote.protocols.slice(0, 3).join(' → ');
      const hasMoreProtocols = protocolCount > 3;

      return {
        name: `1inch Aggregation via ${quote.protocols[0]}`,
        protocol: '1inch Router v6',
        estimated_cost_pct: costPercentage,
        settlement_time_seconds: settlementTime,
        reliability: 0.99,
        risk_level: riskLevel,
        reason: `Optimal route across ${protocolCount} protocol${protocolCount > 1 ? 's' : ''}: ${pathDescription}${hasMoreProtocols ? ' (+more)' : ''}`,
        alternative_paths: quote.protocols.slice(1, 4),
        gas_estimate: gasEstimate.toString(),
        is_realtime: true,
        quote_details: {
          rate: quote.price,
          srcAmount: quote.srcAmount,
          dstAmount: quote.dstAmount,
          timestamp: quote.timestamp,
        },
      };
    } catch (error) {
      console.error('Failed to get optimal settlement path:', error.message);
      return this.getFallbackSettlementPath(pair, amountUSD);
    }
  }

  /**
   * Fallback settlement path when 1inch is unavailable
   */
  getFallbackSettlementPath(pair, amountUSD) {
    const isStablePair = pair.includes('USDC') || pair.includes('USDT') || pair.includes('DAI');

    if (isStablePair) {
      return {
        name: 'Curve Finance (Fallback)',
        protocol: 'Curve',
        estimated_cost_pct: 0.04,
        settlement_time_seconds: 20,
        reliability: 0.98,
        risk_level: 'low',
        reason: 'Optimized for stablecoin swaps',
        alternative_paths: ['Uniswap V3', 'Balancer'],
        is_realtime: false,
      };
    }

    return {
      name: 'Uniswap V3 (Fallback)',
      protocol: 'Uniswap',
      estimated_cost_pct: 0.3,
      settlement_time_seconds: 20,
      reliability: 0.97,
      risk_level: 'low',
      reason: 'Deep liquidity and proven reliability',
      alternative_paths: ['SushiSwap', 'Balancer'],
      is_realtime: false,
    };
  }

  /**
   * Get multiple quotes in parallel (batch processing)
   */
  async getBatchQuotes(pairs, amountUSD = 1000) {
    const promises = pairs.map(pair =>
      this.getPairPrice(pair, amountUSD).catch(err => ({
        pair,
        error: err.message,
      }))
    );

    const results = await Promise.all(promises);

    return results.reduce((acc, result) => {
      if (!result.error) {
        acc.success.push(result);
      } else {
        acc.failed.push(result);
      }
      return acc;
    }, { success: [], failed: [] });
  }

  /**
   * Check if 1inch API is healthy
   */
  async healthCheck() {
    try {
      await this._rateLimit();

      const url = `${this.baseUrl}/swap/v6.0/${this.chainId}/liquidity-sources`;
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json',
        },
        timeout: 3000,
      });

      return {
        healthy: true,
        protocols: response.data.protocols || [],
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Clear price cache
   */
  clearCache() {
    priceCache.clear();
    console.log('📦 Price cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: priceCache.size,
      entries: Array.from(priceCache.keys()),
      memoryUsage: process.memoryUsage().heapUsed,
    };
  }
}

// Export singleton instance
const oneInchService = new OneInchService();

module.exports = {
  oneInchService,
  OneInchService,
  TOKEN_ADDRESSES,
  TOKEN_DECIMALS,
};