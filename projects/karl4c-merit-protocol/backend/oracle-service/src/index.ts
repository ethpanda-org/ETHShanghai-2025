import { OracleService } from './services/OracleService';
import { ApiServer } from './api/server';
import { loadConfig, validateConfig } from './config';
import { logger } from './utils/logger';

/**
 * Main entry point for Merit Oracle Service
 */
async function main() {
  try {
    logger.info('=== Merit Protocol Oracle Service ===');
    logger.info('Starting...');

    // Load and validate configuration
    const config = loadConfig();
    validateConfig(config);
    logger.info('Configuration loaded successfully');

    // Initialize oracle service
    const oracleService = new OracleService(config);
    await oracleService.initialize();

    // Start API server
    const port = parseInt(process.env.PORT || '3001');
    const apiServer = new ApiServer(oracleService, port);
    await apiServer.start();

    logger.info('=== Oracle Service Ready ===');
    logger.info(`API: http://localhost:${port}`);
    logger.info('');
    logger.info('Available endpoints:');
    logger.info(`  GET  /health                    - Health check`);
    logger.info(`  GET  /score/:address            - Calculate score (no update)`);
    logger.info(`  GET  /score/:address/current    - Get current on-chain score`);
    logger.info(`  POST /update/:address           - Update score on-chain`);
    logger.info(`  POST /update/batch              - Batch update scores`);
    logger.info(`  GET  /presence/:address         - Check Web3 presence`);
    logger.info('');

  } catch (error: any) {
    logger.error('Fatal error:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Start the service
main();
