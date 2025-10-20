const winston = require('winston');
const fs = require('fs');
const path = require('path');
const toml = require('@iarna/toml');

// 
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    // winston.format.timestamp(),
    winston.format.prettyPrint()
  ),
  transports: [
    // 输出到控制台
    new winston.transports.Console({
      format: winston.format.combine(
        // winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Main function
async function yourFirstFunction() {
  logger.info('Picker is AI powered Smart System that supports Web3.');
  await new Promise(resolve => setTimeout(resolve, 1000));
  logger.warn('This is a test warning message from nodejs project.');
  await new Promise(resolve => setTimeout(resolve, 1000));
  logger.error('This is a test error message from nodejs project.');
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Read config file path
  const configPath = path.join(path.dirname(path.dirname(__filename)), 'config.toml');
  // Read config file
  const config = toml.parse(fs.readFileSync(configPath, 'utf8'));
  // Read environment namespace
  const env = config.environment || {};

  // Print all parameters in environment namespace
  logger.info('Print environment variable parameters in the configuration file...');
  for (const [key, value] of Object.entries(env)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      logger.info(`${key}:`);
      for (const [subKey, subValue] of Object.entries(value)) {
        logger.info(`${subKey}: ${JSON.stringify(subValue)}`);
      }
    } else {
      logger.info(`${key}: ${JSON.stringify(value)}`);
    }
  }
}

async function main() {
  try {
    await yourFirstFunction();
  } catch (error) {
    logger.error('Error in main function:', error);
    throw error;
  }
}

// Export main function for entry.js
module.exports = { main };