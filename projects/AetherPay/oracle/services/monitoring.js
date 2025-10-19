/**
 * Monitoring and Metrics Service
 *
 * Provides Prometheus metrics and monitoring capabilities for:
 * - API request latency
 * - Cache hit rates
 * - Price source availability
 * - Error rates
 * - Oracle consensus metrics
 */

const promClient = require('prom-client');

class MonitoringService {
  constructor() {
    // Create a Registry for metrics
    this.register = new promClient.Registry();

    // Add default metrics (CPU, memory, etc.)
    promClient.collectDefaultMetrics({ register: this.register });

    // === Custom Metrics ===

    // API Request Metrics
    this.httpRequestDuration = new promClient.Histogram({
      name: 'oracle_http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.1, 0.5, 1, 2, 5, 10]
    });

    this.httpRequestTotal = new promClient.Counter({
      name: 'oracle_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status']
    });

    // Price Source Metrics
    this.priceSourceLatency = new promClient.Histogram({
      name: 'oracle_price_source_latency_seconds',
      help: 'Latency of price source queries',
      labelNames: ['source', 'pair'],
      buckets: [0.1, 0.25, 0.5, 1, 2, 5]
    });

    this.priceSourceErrors = new promClient.Counter({
      name: 'oracle_price_source_errors_total',
      help: 'Total number of price source errors',
      labelNames: ['source', 'pair', 'error_type']
    });

    this.priceSourceSuccess = new promClient.Counter({
      name: 'oracle_price_source_success_total',
      help: 'Total number of successful price queries',
      labelNames: ['source', 'pair']
    });

    // Cache Metrics
    this.cacheHits = new promClient.Counter({
      name: 'oracle_cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['cache_type', 'key_prefix']
    });

    this.cacheMisses = new promClient.Counter({
      name: 'oracle_cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['cache_type', 'key_prefix']
    });

    this.cacheSize = new promClient.Gauge({
      name: 'oracle_cache_size_entries',
      help: 'Current size of cache in entries',
      labelNames: ['cache_type']
    });

    // Oracle Consensus Metrics
    this.consensusReached = new promClient.Counter({
      name: 'oracle_consensus_reached_total',
      help: 'Total number of times consensus was reached',
      labelNames: ['pair']
    });

    this.consensusFailed = new promClient.Counter({
      name: 'oracle_consensus_failed_total',
      help: 'Total number of consensus failures',
      labelNames: ['pair', 'reason']
    });

    this.submissionCount = new promClient.Gauge({
      name: 'oracle_submissions_count',
      help: 'Number of oracle submissions per pair',
      labelNames: ['pair']
    });

    // AI Model Metrics
    this.predictionConfidence = new promClient.Histogram({
      name: 'oracle_prediction_confidence',
      help: 'AI prediction confidence levels',
      labelNames: ['pair', 'model'],
      buckets: [0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 0.99, 1]
    });

    this.predictionError = new promClient.Histogram({
      name: 'oracle_prediction_error_percentage',
      help: 'Prediction error percentage',
      labelNames: ['pair', 'model'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 20, 50]
    });

    // Settlement Path Metrics
    this.settlementPathScore = new promClient.Histogram({
      name: 'oracle_settlement_path_score',
      help: 'Settlement path optimization score',
      labelNames: ['pair', 'protocol', 'amount_range'],
      buckets: [0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 1]
    });

    this.settlementCost = new promClient.Histogram({
      name: 'oracle_settlement_cost_percentage',
      help: 'Settlement cost as percentage of transaction',
      labelNames: ['protocol', 'amount_range'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5]
    });

    // 1inch API Metrics
    this.oneinchApiCalls = new promClient.Counter({
      name: 'oracle_1inch_api_calls_total',
      help: 'Total 1inch API calls',
      labelNames: ['endpoint', 'status']
    });

    this.oneinchRateLimit = new promClient.Gauge({
      name: 'oracle_1inch_rate_limit_remaining',
      help: 'Remaining 1inch API rate limit'
    });

    // Aggregator Metrics
    this.aggregatorOutliers = new promClient.Counter({
      name: 'oracle_aggregator_outliers_total',
      help: 'Number of outliers filtered by aggregator',
      labelNames: ['pair']
    });

    this.aggregatorConfidence = new promClient.Histogram({
      name: 'oracle_aggregator_confidence',
      help: 'Aggregated price confidence',
      labelNames: ['pair', 'source_count'],
      buckets: [0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 0.99, 1]
    });

    // System Metrics
    this.systemUptime = new promClient.Gauge({
      name: 'oracle_system_uptime_seconds',
      help: 'Oracle system uptime in seconds'
    });

    this.activeConnections = new promClient.Gauge({
      name: 'oracle_active_connections',
      help: 'Number of active connections',
      labelNames: ['type']
    });

    // Register all metrics
    this.register.registerMetric(this.httpRequestDuration);
    this.register.registerMetric(this.httpRequestTotal);
    this.register.registerMetric(this.priceSourceLatency);
    this.register.registerMetric(this.priceSourceErrors);
    this.register.registerMetric(this.priceSourceSuccess);
    this.register.registerMetric(this.cacheHits);
    this.register.registerMetric(this.cacheMisses);
    this.register.registerMetric(this.cacheSize);
    this.register.registerMetric(this.consensusReached);
    this.register.registerMetric(this.consensusFailed);
    this.register.registerMetric(this.submissionCount);
    this.register.registerMetric(this.predictionConfidence);
    this.register.registerMetric(this.predictionError);
    this.register.registerMetric(this.settlementPathScore);
    this.register.registerMetric(this.settlementCost);
    this.register.registerMetric(this.oneinchApiCalls);
    this.register.registerMetric(this.oneinchRateLimit);
    this.register.registerMetric(this.aggregatorOutliers);
    this.register.registerMetric(this.aggregatorConfidence);
    this.register.registerMetric(this.systemUptime);
    this.register.registerMetric(this.activeConnections);

    // Update system metrics periodically
    setInterval(() => {
      this.systemUptime.set(process.uptime());
    }, 10000);
  }

  /**
   * Express middleware for tracking HTTP requests
   */
  httpMiddleware() {
    return (req, res, next) => {
      const start = Date.now();

      res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        const route = req.route ? req.route.path : req.path;
        const labels = {
          method: req.method,
          route: route,
          status: res.statusCode
        };

        this.httpRequestDuration.observe(labels, duration);
        this.httpRequestTotal.inc(labels);
      });

      next();
    };
  }

  /**
   * Record price source query
   */
  recordPriceQuery(source, pair, success, latency, error = null) {
    const labels = { source, pair };

    if (success) {
      this.priceSourceSuccess.inc(labels);
      this.priceSourceLatency.observe(labels, latency);
    } else {
      this.priceSourceErrors.inc({
        ...labels,
        error_type: error || 'unknown'
      });
    }
  }

  /**
   * Record cache access
   */
  recordCacheAccess(cacheType, keyPrefix, hit) {
    const labels = { cache_type: cacheType, key_prefix: keyPrefix };

    if (hit) {
      this.cacheHits.inc(labels);
    } else {
      this.cacheMisses.inc(labels);
    }
  }

  /**
   * Update cache size
   */
  updateCacheSize(cacheType, size) {
    this.cacheSize.set({ cache_type: cacheType }, size);
  }

  /**
   * Record consensus result
   */
  recordConsensus(pair, success, reason = null) {
    if (success) {
      this.consensusReached.inc({ pair });
    } else {
      this.consensusFailed.inc({ pair, reason: reason || 'unknown' });
    }
  }

  /**
   * Record AI prediction metrics
   */
  recordPrediction(pair, model, confidence, errorPct = null) {
    const labels = { pair, model };

    this.predictionConfidence.observe(labels, confidence);

    if (errorPct !== null) {
      this.predictionError.observe(labels, errorPct);
    }
  }

  /**
   * Record settlement path metrics
   */
  recordSettlementPath(pair, protocol, amount, score, costPct) {
    const amountRange = this.getAmountRange(amount);

    this.settlementPathScore.observe(
      { pair, protocol, amount_range: amountRange },
      score
    );

    this.settlementCost.observe(
      { protocol, amount_range: amountRange },
      costPct
    );
  }

  /**
   * Record 1inch API call
   */
  record1inchCall(endpoint, success) {
    this.oneinchApiCalls.inc({
      endpoint,
      status: success ? 'success' : 'error'
    });
  }

  /**
   * Update 1inch rate limit
   */
  update1inchRateLimit(remaining) {
    this.oneinchRateLimit.set(remaining);
  }

  /**
   * Record aggregator metrics
   */
  recordAggregation(pair, outlierCount, confidence, sourceCount) {
    if (outlierCount > 0) {
      this.aggregatorOutliers.inc({ pair }, outlierCount);
    }

    this.aggregatorConfidence.observe(
      { pair, source_count: sourceCount.toString() },
      confidence
    );
  }

  /**
   * Get amount range for bucketing
   */
  getAmountRange(amount) {
    if (amount < 100) return '<100';
    if (amount < 1000) return '100-1k';
    if (amount < 10000) return '1k-10k';
    if (amount < 100000) return '10k-100k';
    return '>100k';
  }

  /**
   * Get metrics endpoint handler
   */
  getMetricsHandler() {
    return async (req, res) => {
      try {
        res.set('Content-Type', this.register.contentType);
        const metrics = await this.register.metrics();
        res.end(metrics);
      } catch (error) {
        res.status(500).send('Error generating metrics');
      }
    };
  }

  /**
   * Get current metrics summary
   */
  async getSummary() {
    const metrics = await this.register.getMetricsAsJSON();

    const summary = {
      http: {
        total_requests: this.getMetricValue(metrics, 'oracle_http_requests_total'),
        avg_duration: this.getMetricAverage(metrics, 'oracle_http_request_duration_seconds')
      },
      price_sources: {
        success_rate: this.calculateSuccessRate(metrics),
        avg_latency: this.getMetricAverage(metrics, 'oracle_price_source_latency_seconds')
      },
      cache: {
        hit_rate: this.calculateCacheHitRate(metrics),
        total_size: this.getMetricValue(metrics, 'oracle_cache_size_entries')
      },
      consensus: {
        success_rate: this.calculateConsensusRate(metrics),
        total_reached: this.getMetricValue(metrics, 'oracle_consensus_reached_total')
      },
      predictions: {
        avg_confidence: this.getMetricAverage(metrics, 'oracle_prediction_confidence'),
        avg_error: this.getMetricAverage(metrics, 'oracle_prediction_error_percentage')
      },
      settlement: {
        avg_cost_pct: this.getMetricAverage(metrics, 'oracle_settlement_cost_percentage'),
        avg_score: this.getMetricAverage(metrics, 'oracle_settlement_path_score')
      },
      system: {
        uptime_hours: process.uptime() / 3600,
        memory_mb: process.memoryUsage().heapUsed / 1024 / 1024
      }
    };

    return summary;
  }

  // Helper methods for calculating metrics
  getMetricValue(metrics, name) {
    const metric = metrics.find(m => m.name === name);
    if (!metric || !metric.values || metric.values.length === 0) return 0;

    return metric.values.reduce((sum, v) => sum + (v.value || 0), 0);
  }

  getMetricAverage(metrics, name) {
    const metric = metrics.find(m => m.name === name);
    if (!metric || !metric.values || metric.values.length === 0) return 0;

    const values = metric.values.map(v => v.value || 0);
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  calculateSuccessRate(metrics) {
    const success = this.getMetricValue(metrics, 'oracle_price_source_success_total');
    const errors = this.getMetricValue(metrics, 'oracle_price_source_errors_total');
    const total = success + errors;

    return total > 0 ? success / total : 1;
  }

  calculateCacheHitRate(metrics) {
    const hits = this.getMetricValue(metrics, 'oracle_cache_hits_total');
    const misses = this.getMetricValue(metrics, 'oracle_cache_misses_total');
    const total = hits + misses;

    return total > 0 ? hits / total : 0;
  }

  calculateConsensusRate(metrics) {
    const success = this.getMetricValue(metrics, 'oracle_consensus_reached_total');
    const failed = this.getMetricValue(metrics, 'oracle_consensus_failed_total');
    const total = success + failed;

    return total > 0 ? success / total : 1;
  }
}

// Create singleton instance
const monitoringService = new MonitoringService();

module.exports = {
  monitoringService,
  MonitoringService
};