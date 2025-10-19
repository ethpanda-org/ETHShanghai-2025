// 根据NODE_ENV加载不同的配置文件
const nodeEnv = process.env.NODE_ENV || 'default';
const configPath = nodeEnv === 'default'
    ? './config/.env'
    : `./config/.env.${nodeEnv}`;

require('dotenv').config({ path: configPath });
console.log(`Loading config from: ${configPath}`);
const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
const redis = require('redis');
const winston = require('winston');
const cron = require('node-cron');
const { spawn } = require('child_process');
const path = require('path');

// 🆕 Import new services
const { oneInchService } = require('./services/1inch-service');
const { aggregatorService } = require('./services/price-aggregator');
const { monitoringService } = require('./services/monitoring');

class OracleServer {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3001;
        this.nodeName = process.env.NODE_NAME || `Oracle-${this.port}`;

        // Initialize logger
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.printf(({ timestamp, level, message }) => {
                    return `[${this.nodeName}] ${timestamp} ${level}: ${message}`;
                }),
                winston.format.json()
            ),
            transports: [
                new winston.transports.File({ filename: `oracle-${this.nodeName}.log` }),
                new winston.transports.Console()
            ]
        });
        
        // Initialize Redis
        this.initRedis();
        
        // Initialize blockchain connection
        this.initBlockchain();
        
        // Setup Express middleware
        this.setupMiddleware();
        
        // Setup routes
        this.setupRoutes();
        
        // Start scheduled tasks
        this.startScheduledTasks();

        this.logger.info(`${this.nodeName} initialized on port ${this.port}`);
    }
    
    async initRedis() {
        try {
            this.redisClient = redis.createClient({
                url: process.env.REDIS_URL || 'redis://localhost:6379'
            });
            
            this.redisClient.on('error', (err) => {
                this.logger.error('Redis error:', err);
            });
            
            await this.redisClient.connect();
            this.logger.info('Redis connected');
        } catch (error) {
            this.logger.error('Redis connection failed:', error);
            this.redisClient = null;
        }
    }
    
    initBlockchain() {
        try {
            this.provider = new ethers.providers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
            
            if (process.env.PRIVATE_KEY) {
                this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
                this.logger.info('Blockchain wallet initialized');
            }
            
            // Contract ABI for AetherOracleV2
            this.contractABI = [
                "function submitRate(string memory pair, uint256 rate, uint256 confidence, bytes memory signature) external",
                "function getLatestRate(string memory pair) external view returns (uint256 rate, uint256 confidence, uint256 timestamp, bool isValid)",
                "function getPendingSubmissions(string memory pair) external view returns (uint256[] memory rates, address[] memory submitters, uint256 count)",
                "event RateSubmitted(string indexed pair, address indexed oracle, uint256 rate, uint256 confidence, uint256 timestamp)",
                "event ConsensusReached(string indexed pair, uint256 rate, uint256 confidence, uint256 submissionCount, uint256 timestamp)"
            ];
            
            if (process.env.CONTRACT_ADDRESS) {
                this.contract = new ethers.Contract(
                    process.env.CONTRACT_ADDRESS,
                    this.contractABI,
                    this.wallet
                );
            }
            
        } catch (error) {
            this.logger.error('Blockchain initialization failed:', error);
        }
    }
    
    setupMiddleware() {
        // ✅ CORS configuration - Allow all origins for development
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
            
            // Handle preflight
            if (req.method === 'OPTIONS') {
                return res.sendStatus(204);
            }
            next();
        });

        this.app.use(express.json());

        // 🆕 Add monitoring middleware
        this.app.use(monitoringService.httpMiddleware());

        // Request logging
        this.app.use((req, res, next) => {
            this.logger.info(`${req.method} ${req.path}`, {
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });
            next();
        });
        
        // Error handling
        this.app.use((error, req, res, next) => {
            this.logger.error('Express error:', error);
            res.status(500).json({ error: 'Internal server error' });
        });
    }
    
    setupRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                version: '1.0.0'
            });
        });

        // Get real-time aggregated price from 6 sources (path param)
        this.app.get('/realtime/:pair', async (req, res) => {
            try {
                const raw = req.params.pair || '';
                const pair = decodeURIComponent(raw);
                const price = await this.getRealtimePrice(pair);

                if (price) {
                    res.json(price);
                } else {
                    res.status(404).json({ error: 'Price not available' });
                }
            } catch (error) {
                this.logger.error('Realtime price fetch error:', error);
                res.status(500).json({ error: 'Failed to fetch real-time price' });
            }
        });

        // Support encoded slash by accepting wildcard path: /realtime/* (e.g., ETH%2FUSDT)
        this.app.get('/realtime/*', async (req, res) => {
            try {
                const raw = req.params[0] || '';
                const decoded = decodeURIComponent(raw.startsWith('/') ? raw.slice(1) : raw);
                const price = await this.getRealtimePrice(decoded);
                if (price) {
                    res.json(price);
                } else {
                    res.status(404).json({ error: 'Price not available' });
                }
            } catch (error) {
                this.logger.error('Realtime wildcard error:', error);
                res.status(500).json({ error: 'Failed to fetch real-time price' });
            }
        });

        // Also support query param style: /realtime?pair=ETH%2FUSDT
        this.app.get('/realtime', async (req, res) => {
            try {
                const raw = req.query.pair || '';
                const decoded = decodeURIComponent(String(raw));
                if (!decoded) return res.status(400).json({ error: 'Missing pair' });
                const price = await this.getRealtimePrice(decoded);
                if (price) {
                    res.json(price);
                } else {
                    res.status(404).json({ error: 'Price not available' });
                }
            } catch (error) {
                this.logger.error('Realtime (query) error:', error);
                res.status(500).json({ error: 'Failed to fetch real-time price' });
            }
        });

        // Get current rate
        this.app.get('/rates/:pair', async (req, res) => {
            try {
                const { pair } = req.params;
                const rate = await this.getCurrentRate(pair);
                
                if (rate) {
                    res.json(rate);
                } else {
                    res.status(404).json({ error: 'Rate not found' });
                }
            } catch (error) {
                this.logger.error('Rate fetch error:', error);
                res.status(500).json({ error: 'Failed to fetch rate' });
            }
        });
        
        // Get prediction (path param)
        this.app.get('/predict/:pair', async (req, res) => {
            try {
                const raw = req.params.pair || '';
                const pair = decodeURIComponent(raw);
                const confidence_threshold = parseFloat(req.query.confidence) || 0.95;
                const amount = parseFloat(req.query.amount) || 1000;  // ✅ 支持订单金额

                const prediction = await this.getPrediction(pair, confidence_threshold, amount);

                if (prediction) {
                    // ✅ Add Settlement Path recommendation
                    prediction.optimal_settlement_path = this.getOptimalSettlementPath(pair, prediction);
                    res.json(prediction);
                } else {
                    // Return 200 with error object and fallback settlement path
                    res.status(200).json({
                        error: 'prediction_unavailable',
                        pair: pair,
                        message: 'No AI model available for this trading pair',
                        // ✅ Provide fallback settlement path even without AI prediction
                        optimal_settlement_path: this.getOptimalSettlementPath(pair, {
                            confidence: 0.8,
                            price_change: 0
                        })
                    });
                }
            } catch (error) {
                this.logger.error('Prediction error:', error);
                res.status(500).json({ error: 'Failed to generate prediction' });
            }
        });

        // Support encoded slash with wildcard: /predict/* (e.g., ETH%2FUSDT)
        this.app.get('/predict/*', async (req, res) => {
            try {
                const raw = req.params[0] || '';
                const pair = decodeURIComponent(raw.startsWith('/') ? raw.slice(1) : raw);
                const confidence_threshold = parseFloat(req.query.confidence) || 0.95;
                const amount = parseFloat(req.query.amount) || 1000;

                const prediction = await this.getPrediction(pair, confidence_threshold, amount);
                if (prediction) {
                    prediction.optimal_settlement_path = this.getOptimalSettlementPath(pair, prediction);
                    res.json(prediction);
                } else {
                    res.status(200).json({
                        error: 'prediction_unavailable',
                        pair,
                        message: 'No AI model available for this trading pair',
                        optimal_settlement_path: this.getOptimalSettlementPath(pair, { confidence: 0.8, price_change: 0 })
                    });
                }
            } catch (error) {
                this.logger.error('Prediction wildcard error:', error);
                res.status(500).json({ error: 'Failed to generate prediction' });
            }
        });

        // Also support query param: /predict?pair=ETH%2FUSDT
        this.app.get('/predict', async (req, res) => {
            try {
                const raw = req.query.pair || '';
                const pair = decodeURIComponent(String(raw));
                if (!pair) return res.status(400).json({ error: 'Missing pair' });
                const confidence_threshold = parseFloat(req.query.confidence) || 0.95;
                const amount = parseFloat(req.query.amount) || 1000;

                const prediction = await this.getPrediction(pair, confidence_threshold, amount);
                if (prediction) {
                    prediction.optimal_settlement_path = this.getOptimalSettlementPath(pair, prediction);
                    res.json(prediction);
                } else {
                    res.status(200).json({
                        error: 'prediction_unavailable',
                        pair,
                        message: 'No AI model available for this trading pair',
                        optimal_settlement_path: this.getOptimalSettlementPath(pair, { confidence: 0.8, price_change: 0 })
                    });
                }
            } catch (error) {
                this.logger.error('Prediction (query) error:', error);
                res.status(500).json({ error: 'Failed to generate prediction' });
            }
        });
        
        // Get multiple predictions
        this.app.post('/predict/batch', async (req, res) => {
            try {
                const { pairs, confidence_threshold = 0.95 } = req.body;
                
                if (!Array.isArray(pairs)) {
                    return res.status(400).json({ error: 'Pairs must be an array' });
                }
                
                const predictions = await this.getBatchPredictions(pairs, confidence_threshold);
                res.json(predictions);
                
            } catch (error) {
                this.logger.error('Batch prediction error:', error);
                res.status(500).json({ error: 'Failed to generate batch predictions' });
            }
        });
        
        // Trigger manual update
        this.app.post('/update', async (req, res) => {
            try {
                const { pair } = req.body;
                
                if (pair) {
                    await this.updateSingleRate(pair);
                } else {
                    await this.updateAllRates();
                }
                
                res.json({ success: true, message: 'Update triggered' });
                
            } catch (error) {
                this.logger.error('Manual update error:', error);
                res.status(500).json({ error: 'Update failed' });
            }
        });
        
        // Get model health
        this.app.get('/health/:pair', async (req, res) => {
            try {
                const { pair } = req.params;
                const health = await this.getModelHealth(pair);
                res.json(health);
            } catch (error) {
                this.logger.error('Health check error:', error);
                res.status(500).json({ error: 'Health check failed' });
            }
        });
        
        // 🆕 Get optimal settlement path (独立endpoint)
        this.app.get('/settlement-path/:pair', async (req, res) => {
            try {
                const raw = req.params.pair || '';
                const pair = decodeURIComponent(raw);
                const amount = parseFloat(req.query.amount) || 1000;
                const confidence = parseFloat(req.query.confidence) || 0.9;

                this.logger.info(`Fetching settlement path for ${pair}, amount: $${amount}, confidence: ${confidence}`);

                const path = await this.getOptimalSettlementPathV2(pair, amount, confidence);
                res.json(path);
            } catch (error) {
                this.logger.error('Settlement path error:', error);
                res.status(500).json({ error: 'Failed to get settlement path' });
            }
        });

        // Support wildcard path
        this.app.get('/settlement-path/*', async (req, res) => {
            try {
                const raw = req.params[0] || '';
                const pair = decodeURIComponent(raw.startsWith('/') ? raw.slice(1) : raw);
                const amount = parseFloat(req.query.amount) || 1000;
                const confidence = parseFloat(req.query.confidence) || 0.9;

                const path = await this.getOptimalSettlementPathV2(pair, amount, confidence);
                res.json(path);
            } catch (error) {
                this.logger.error('Settlement path wildcard error:', error);
                res.status(500).json({ error: 'Failed to get settlement path' });
            }
        });

        // Support query param
        this.app.get('/settlement-path', async (req, res) => {
            try {
                const raw = req.query.pair || '';
                const pair = decodeURIComponent(String(raw));
                if (!pair) return res.status(400).json({ error: 'Missing pair' });
                const amount = parseFloat(req.query.amount) || 1000;
                const confidence = parseFloat(req.query.confidence) || 0.9;

                const path = await this.getOptimalSettlementPathV2(pair, amount, confidence);
                res.json(path);
            } catch (error) {
                this.logger.error('Settlement path (query) error:', error);
                res.status(500).json({ error: 'Failed to get settlement path' });
            }
        });

        // Get oracle statistics
        this.app.get('/stats', async (req, res) => {
            try {
                const stats = await this.getOracleStats();
                res.json(stats);
            } catch (error) {
                this.logger.error('Stats error:', error);
                res.status(500).json({ error: 'Failed to fetch stats' });
            }
        });

        // 🆕 Get aggregated price from all sources
        this.app.get('/aggregated/:pair', async (req, res) => {
            try {
                const pair = decodeURIComponent(req.params.pair);
                const amount = parseFloat(req.query.amount) || 1000;

                this.logger.info(`Getting aggregated price for ${pair}, amount: $${amount}`);

                const aggregated = await aggregatorService.getAggregatedPrice(pair, amount);
                res.json(aggregated);
            } catch (error) {
                this.logger.error('Aggregated price error:', error);
                res.status(500).json({ error: 'Failed to get aggregated price' });
            }
        });

        // 🆕 Get 1inch quote directly
        this.app.get('/1inch/:pair', async (req, res) => {
            try {
                const pair = decodeURIComponent(req.params.pair);
                const amount = parseFloat(req.query.amount) || 1000;

                this.logger.info(`Getting 1inch quote for ${pair}, amount: $${amount}`);

                const quote = await oneInchService.getPairPrice(pair, amount);
                res.json(quote);
            } catch (error) {
                this.logger.error('1inch quote error:', error);
                res.status(500).json({ error: 'Failed to get 1inch quote' });
            }
        });

        // 🆕 Health check for all services
        this.app.get('/health/services', async (req, res) => {
            try {
                const [oneinchHealth, aggregatorHealth] = await Promise.all([
                    oneInchService.healthCheck(),
                    aggregatorService.healthCheck()
                ]);

                res.json({
                    timestamp: Date.now(),
                    services: {
                        '1inch': oneinchHealth,
                        'aggregator': aggregatorHealth
                    },
                    overall: oneinchHealth.healthy && aggregatorHealth.overall
                });
            } catch (error) {
                this.logger.error('Service health check error:', error);
                res.status(500).json({ error: 'Health check failed' });
            }
        });

        // 🆕 Clear caches
        this.app.post('/cache/clear', async (req, res) => {
            try {
                oneInchService.clearCache();
                aggregatorService.clearCache();

                res.json({
                    success: true,
                    message: 'All caches cleared'
                });
            } catch (error) {
                this.logger.error('Cache clear error:', error);
                res.status(500).json({ error: 'Failed to clear caches' });
            }
        });

        // 🆕 Prometheus metrics endpoint
        this.app.get('/metrics', monitoringService.getMetricsHandler());

        // 🆕 Get metrics summary
        this.app.get('/metrics/summary', async (req, res) => {
            try {
                const summary = await monitoringService.getSummary();
                res.json(summary);
            } catch (error) {
                this.logger.error('Metrics summary error:', error);
                res.status(500).json({ error: 'Failed to get metrics summary' });
            }
        });
    }
    
    async getCurrentRate(pair) {
        // Try cache first
        if (this.redisClient) {
            try {
                const cached = await this.redisClient.get(`rate:${pair}`);
                if (cached) {
                    return JSON.parse(cached);
                }
            } catch (error) {
                this.logger.warn('Redis get error:', error);
            }
        }

        // Fall back to database
        try {
            const sqlite3 = require('sqlite3').verbose();
            const db = new sqlite3.Database('aether_oracle.db');

            return new Promise((resolve, reject) => {
                db.get(
                    `SELECT pair, source, price, timestamp
                     FROM exchange_rates
                     WHERE pair = ?
                     ORDER BY timestamp DESC
                     LIMIT 1`,
                    [pair],
                    (err, row) => {
                        db.close();
                        if (err) {
                            reject(err);
                        } else if (row) {
                            resolve({
                                pair: row.pair,
                                price: row.price,
                                source: row.source,
                                timestamp: row.timestamp
                            });
                        } else {
                            resolve(null);
                        }
                    }
                );
            });
        } catch (error) {
            this.logger.error('Database query error:', error);
            return null;
        }
    }

    async getRealtimePrice(pair) {
        try {
            // 🆕 First try to get aggregated price from multiple sources
            const aggregatedData = await aggregatorService.getAggregatedPrice(pair, 1000);

            if (aggregatedData) {
                return {
                    pair,
                    aggregated_price: aggregatedData.aggregatedPrice,
                    confidence: aggregatedData.confidence,
                    sources: aggregatedData.sources,
                    timestamp: aggregatedData.timestamp,
                    response_time: aggregatedData.responseTime,
                    source: 'multi-source-aggregator'
                };
            }
        } catch (error) {
            this.logger.warn('Aggregator failed, falling back to Python fetcher:', error.message);
        }

        // Fall back to Python script if aggregator fails
        return new Promise((resolve, reject) => {
            const pyCmd = process.platform === 'win32' ? 'python' : 'python3';
            const pythonScript = path.join(__dirname, 'realtime_price_fetcher.py');
            const python = spawn(pyCmd, [pythonScript, pair]);

            let result = '';
            let error = '';

            python.stdout.on('data', (data) => {
                result += data.toString();
            });

            python.stderr.on('data', (data) => {
                error += data.toString();
            });

            python.on('close', (code) => {
                if (code === 0) {
                    try {
                        const priceData = JSON.parse(result);
                        resolve(priceData);
                    } catch (e) {
                        reject(new Error('Failed to parse price data'));
                    }
                } else {
                    this.logger.error('Realtime price fetch error:', error);
                    resolve(null);
                }
            });
        });
    }
    
    async getPrediction(pair, confidence_threshold, amount = 1000) {
        return new Promise((resolve, reject) => {
            // 根据操作系统选择 Python 命令
            const pyCmd = process.platform === 'win32' ? 'python' : 'python3';
            // ✅ 使用优化版5分钟预测器
            let pythonScript = path.join(__dirname, '../models/aetherpay_predictor_optimized.py');

            // 检查文件是否存在
            const fs = require('fs');
            if (!fs.existsSync(pythonScript)) {
                // 降级到原始30秒预测器
                pythonScript = path.join(__dirname, '../models/aetherpay_predictor.py');
                if (!fs.existsSync(pythonScript)) {
                    // 最后尝试6小时预测器
                    pythonScript = path.join(__dirname, '../models/oracle_predictor.py');
                }
            }

            const python = spawn(pyCmd, [pythonScript, pair, amount.toString(), confidence_threshold.toString()]);

            let result = '';
            let error = '';

            python.stdout.on('data', (data) => {
                result += data.toString();
            });

            python.stderr.on('data', (data) => {
                error += data.toString();
            });

            python.on('close', (code) => {
                if (code === 0) {
                    try {
                        const prediction = JSON.parse(result);
                        resolve(prediction);
                    } catch (e) {
                        reject(new Error('Failed to parse prediction result'));
                    }
                } else {
                    reject(new Error(`Python process failed: ${error}`));
                }
            });
        });
    }
    
    async getBatchPredictions(pairs, confidence_threshold) {
        const predictions = {};
        
        // Process pairs in parallel
        const promises = pairs.map(async (pair) => {
            try {
                const prediction = await this.getPrediction(pair, confidence_threshold);
                if (prediction) {
                    predictions[pair] = prediction;
                }
            } catch (error) {
                this.logger.error(`Prediction failed for ${pair}:`, error);
                predictions[pair] = { error: 'Prediction failed' };
            }
        });
        
        await Promise.all(promises);
        return predictions;
    }
    
    async updateSingleRate(pair) {
        try {
            const prediction = await this.getPrediction(pair, 0.8);
            
            if (prediction && prediction.meets_threshold) {
                // Cache the prediction
                if (this.redisClient) {
                    await this.redisClient.setEx(
                        `rate:${pair}`,
                        300, // 5 minutes TTL
                        JSON.stringify(prediction)
                    );
                }
                
                // Update on blockchain if available
                if (this.contract) {
                    await this.updateBlockchainRate(pair, prediction);
                }
                
                this.logger.info(`Rate updated for ${pair}:`, prediction);
            }
        } catch (error) {
            this.logger.error(`Failed to update rate for ${pair}:`, error);
        }
    }
    
    async updateAllRates() {
        // 仅更新Binance存在的加密交易对，避免法币对导致解析失败
        const pairs = ['BTC/USDT', 'ETH/USDT'];
        
        for (const pair of pairs) {
            await this.updateSingleRate(pair);
            // Add small delay to avoid overwhelming the system
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    
    async updateBlockchainRate(pair, prediction) {
        if (!this.contract) {
            return;
        }

        try {
            // 添加随机延迟(0-5秒)，避免多个节点同时提交
            const delay = Math.random() * 5000;
            this.logger.info(`${this.nodeName} waiting ${Math.round(delay)}ms before submitting...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            // Convert to blockchain format
            // Round the price to 8 decimal places to avoid NUMERIC_FAULT error
            const roundedPrice = Math.round(prediction.predicted_price * 100000000) / 100000000;
            const rate = ethers.utils.parseUnits(roundedPrice.toFixed(8), 8);
            const confidence = Math.floor(prediction.confidence * 10000); // Convert to basis points

            // Generate ECDSA signature for V2
            // Message hash includes: pair, rate, confidence, and current minute (1-minute time window)
            const currentMinute = Math.floor(Date.now() / 60000);
            const messageHash = ethers.utils.solidityKeccak256(
                ['string', 'uint256', 'uint256', 'uint256'],
                [pair, rate, confidence, currentMinute]
            );

            // Sign the message
            const signature = await this.wallet.signMessage(
                ethers.utils.arrayify(messageHash)
            );

            // Get dynamic gas price for Optimism
            const feeData = await this.provider.getFeeData();

            // Submit rate to V2 contract
            const tx = await this.contract.submitRate(
                pair,
                rate,
                confidence,
                signature,
                {
                    maxFeePerGas: feeData.maxFeePerGas,
                    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
                }
            );

            this.logger.info(`V2: Rate submitted for ${pair}:`, tx.hash);
            await tx.wait();

            // Check consensus status
            const pending = await this.contract.getPendingSubmissions(pair);
            this.logger.info(`Pending submissions for ${pair}: ${pending.count} / required`);

        } catch (error) {
            this.logger.error(`V2 update failed for ${pair}:`, error.message || 'Unknown error');

            // Log the error object structure
            this.logger.error('Error details:', {
                message: error.message,
                reason: error.reason,
                code: error.code,
                data: error.data,
                stack: error.stack ? error.stack.substring(0, 500) : undefined
            });

            // Check if this is an RPC error
            if (error.error && error.error.message) {
                this.logger.error('RPC Error:', error.error.message);
            }
        }
    }
    
    async getModelHealth(pair) {
        return new Promise((resolve, reject) => {
            const pyCmd = process.platform === 'win32' ? 'python' : 'python3';
            // ✅ Fix: Use correct path from oracle/ directory
            const pythonScript = path.join(__dirname, '../models/oracle_predictor.py');
            const python = spawn(pyCmd, [pythonScript, 'health', pair]);

            let result = '';

            python.stdout.on('data', (data) => {
                result += data.toString();
            });

            python.on('close', (code) => {
                if (code === 0) {
                    try {
                        const health = JSON.parse(result);
                        resolve(health);
                    } catch (e) {
                        resolve({ status: 'unknown' });
                    }
                } else {
                    resolve({ status: 'error' });
                }
            });
        });
    }
    
    async getOracleStats() {
        const stats = {
            uptime: process.uptime(),
            memory_usage: process.memoryUsage(),
            active_pairs: ['BTC/USDT', 'ETH/USDT', 'EUR/USD', 'GBP/USD'],
            last_update: new Date().toISOString(),
            redis_connected: !!this.redisClient,
            blockchain_connected: !!this.provider
        };

        return stats;
    }

    /**
     * Get optimal settlement path recommendation
     * @param {string} pair - Trading pair
     * @param {object} prediction - AI prediction data
     * @returns {object} Settlement path recommendation
     */
    getOptimalSettlementPath(pair, prediction) {
        // Default settlement paths with their characteristics
        const settlementPaths = [
            {
                name: 'FXPool Direct Swap',
                protocol: 'FXPool',
                estimated_cost_pct: 0.6,
                settlement_time_seconds: 12,
                reliability: 0.98,
                risk_level: 'low',
                reason: 'Concentrated liquidity pool with AI-optimized rates'
            },
            {
                name: 'Uniswap V3',
                protocol: 'Uniswap V3',
                estimated_cost_pct: 0.3,
                settlement_time_seconds: 15,
                reliability: 0.95,
                risk_level: 'low',
                reason: 'Deep liquidity but higher slippage'
            },
            {
                name: 'Curve Finance',
                protocol: 'Curve',
                estimated_cost_pct: 0.04,
                settlement_time_seconds: 18,
                reliability: 0.99,
                risk_level: 'low',
                reason: 'Best for stablecoin swaps'
            }
        ];

        // Determine risk level based on prediction confidence
        let optimalPath = settlementPaths[0]; // Default to FXPool

        if (prediction.confidence >= 0.95) {
            // High confidence - use FXPool with AI optimization
            optimalPath = settlementPaths[0];
        } else if (prediction.confidence >= 0.85) {
            // Medium confidence - consider alternative
            const [tokenA, tokenB] = pair.split('/');
            const isStablecoinPair = ['USDC', 'USDT', 'DAI'].includes(tokenA) &&
                                     ['USDC', 'USDT', 'DAI'].includes(tokenB);

            if (isStablecoinPair) {
                optimalPath = settlementPaths[2]; // Curve for stablecoins
            } else {
                optimalPath = settlementPaths[1]; // Uniswap V3
            }
        } else {
            // Low confidence - use most reliable path
            optimalPath = settlementPaths[1];
        }

        // Adjust risk level based on market volatility
        if (prediction.price_change && Math.abs(prediction.price_change) > 5) {
            optimalPath.risk_level = 'medium';
            optimalPath.reason += ' (High volatility detected)';
        }

        // Add alternative paths
        const alternatives = settlementPaths
            .filter(p => p.name !== optimalPath.name)
            .map(p => p.name);

        return {
            ...optimalPath,
            alternative_paths: alternatives,
            selected_at: new Date().toISOString()
        };
    }

    /**
     * Get optimal settlement path using real DEX data (V2 - 1inch powered)
     * @param {string} pair - Trading pair (e.g., "USDC/USDT")
     * @param {number} amount - Order amount in USD
     * @param {number} confidence - AI prediction confidence (0-1)
     * @returns {Promise<object>} Settlement path recommendation
     */
    async getOptimalSettlementPathV2(pair, amount, confidence) {
        // Try cache first (30-second TTL)
        const cacheKey = `settlement:${pair}:${Math.floor(amount / 100) * 100}:${Math.floor(confidence * 10) / 10}`;

        if (this.redisClient) {
            try {
                const cached = await this.redisClient.get(cacheKey);
                if (cached) {
                    this.logger.info(`Settlement path cache hit for ${pair}`);
                    return JSON.parse(cached);
                }
            } catch (error) {
                this.logger.warn('Redis cache read failed:', error.message);
            }
        }

        // 🆕 Try to get real 1inch settlement path first
        try {
            this.logger.info(`Getting 1inch settlement path for ${pair}, amount: $${amount}`);
            const oneinchPath = await oneInchService.getOptimalSettlementPath(pair, amount, confidence);

            if (oneinchPath && oneinchPath.is_realtime) {
                // Cache the result for 30 seconds
                if (this.redisClient) {
                    this.redisClient.setEx(
                        cacheKey,
                        30,
                        JSON.stringify(oneinchPath)
                    ).catch(err => this.logger.warn('Redis cache write failed:', err.message));
                }

                this.logger.info(`✅ Real-time settlement path from 1inch: ${oneinchPath.name}`);
                return oneinchPath;
            }
        } catch (error) {
            this.logger.warn('1inch settlement path failed, trying Python optimizer:', error.message);
        }

        // Fall back to Python optimizer if 1inch fails
        return new Promise((resolve, reject) => {
            const pyCmd = process.platform === 'win32' ? 'python' : 'python3';
            const pythonScript = path.join(__dirname, 'dex_path_optimizer.py');

            this.logger.info(`Calling Python optimizer: ${pair}, $${amount}, confidence ${confidence}`);

            const python = spawn(pyCmd, [
                pythonScript,
                pair,
                amount.toString(),
                confidence.toString()
            ]);

            let result = '';
            let error = '';

            python.stdout.on('data', (data) => {
                result += data.toString();
            });

            python.stderr.on('data', (data) => {
                error += data.toString();
            });

            python.on('close', (code) => {
                if (code === 0) {
                    try {
                        const pathData = JSON.parse(result);

                        // Cache the result for 30 seconds
                        if (this.redisClient) {
                            this.redisClient.setEx(
                                cacheKey,
                                30,
                                JSON.stringify(pathData)
                            ).catch(err => this.logger.warn('Redis cache write failed:', err.message));
                        }

                        this.logger.info(`Settlement path optimized: ${pathData.name} (score: ${pathData.optimization_factors?.score || 'N/A'})`);
                        resolve(pathData);

                    } catch (e) {
                        this.logger.error('Failed to parse settlement path data:', e.message);
                        reject(new Error('Failed to parse settlement path data'));
                    }
                } else {
                    this.logger.error('Python optimizer failed:', error);

                    // Fallback to old method if Python fails
                    this.logger.warn('Falling back to legacy settlement path method');
                    const fallbackPath = this.getOptimalSettlementPath(pair, {
                        confidence,
                        price_change: 0
                    });
                    resolve(fallbackPath);
                }
            });

            // Handle timeout (10 seconds)
            setTimeout(() => {
                python.kill();
                this.logger.error('Settlement path optimization timeout');
                const fallbackPath = this.getOptimalSettlementPath(pair, {
                    confidence,
                    price_change: 0
                });
                resolve(fallbackPath);
            }, 10000);
        });
    }

    startScheduledTasks() {
        // Update rates every minute with AI prediction
        cron.schedule('* * * * *', async () => {
            this.logger.info('Running scheduled rate update');
            await this.updateAllRates();
        });
        
        // Collect data every 5 minutes
        cron.schedule('*/5 * * * *', () => {
            this.logger.info('Running scheduled data collection');
            const pyCmd = process.platform === 'win32' ? 'python' : 'python3';
            // ✅ Fix: Use correct path from oracle/ directory
            const python = spawn(pyCmd, ['../data/data_collector.py']);

            python.on('close', (code) => {
                if (code === 0) {
                    this.logger.info('Data collection completed');
                } else {
                    this.logger.error('Data collection failed');
                }
            });
        });
        
        // Health check every hour
        cron.schedule('0 * * * *', () => {
            this.logger.info('Running health check');
            // Additional health checks can be added here
        });
    }
    
    start() {
        this.app.listen(this.port, '0.0.0.0', () => {
            this.logger.info(`🚀 ${this.nodeName} running on http://0.0.0.0:${this.port}`);
            this.logger.info(`📊 Wallet: ${this.wallet ? this.wallet.address : 'Not configured'}`);
            this.logger.info(`⛓️ Contract: ${process.env.CONTRACT_ADDRESS}`);
        });
    }
}

// Start the server
if (require.main === module) {
    const server = new OracleServer();
    server.start();
}

module.exports = OracleServer;