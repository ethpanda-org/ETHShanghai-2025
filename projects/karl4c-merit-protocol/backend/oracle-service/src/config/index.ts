import dotenv from 'dotenv';
import { OracleConfig } from '../types';

// Load environment variables
dotenv.config();

/**
 * Load configuration from environment variables
 */
export function loadConfig(): OracleConfig {
  const requiredVars = ['RPC_URL', 'PRIVATE_KEY', 'ORACLE_ADDRESS'];
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      throw new Error(`Missing required environment variable: ${varName}`);
    }
  }

  return {
    rpcUrl: process.env.RPC_URL!,
    mainnetRpcUrl: process.env.MAINNET_RPC_URL,
    privateKey: process.env.PRIVATE_KEY!,
    oracleAddress: process.env.ORACLE_ADDRESS!,
    chainId: parseInt(process.env.CHAIN_ID || '31337'),
    gitcoinApiKey: process.env.GITCOIN_API_KEY,
    alchemyApiKey: process.env.ALCHEMY_API_KEY,
    neynarApiKey: process.env.NEYNAR_API_KEY,
    scoreWeights: {
      gitcoin: parseFloat(process.env.WEIGHT_GITCOIN || '35'),
      ens: parseFloat(process.env.WEIGHT_ENS || '20'),
      // lens: parseFloat(process.env.WEIGHT_LENS || '12'), // 已删除
      farcaster: parseFloat(process.env.WEIGHT_FARCASTER || '15'),
      onChain: parseFloat(process.env.WEIGHT_ONCHAIN || '10'),
      poap: parseFloat(process.env.WEIGHT_POAP || '10'), // 使用 GitPOAP Public API
      // aaveGovernance: parseFloat(process.env.WEIGHT_AAVE_GOVERNANCE || '15'), // 已删除
      nounsDAO: parseFloat(process.env.WEIGHT_NOUNS_DAO || '10'), // 使用 Alchemy NFT API
    },
  };
}

/**
 * Validate configuration
 */
export function validateConfig(config: OracleConfig): void {
  // Validate RPC URL
  if (!config.rpcUrl.startsWith('http')) {
    throw new Error('Invalid RPC URL');
  }

  // Validate private key format
  if (!config.privateKey.startsWith('0x') || config.privateKey.length !== 66) {
    throw new Error('Invalid private key format');
  }

  // Validate oracle address
  if (!config.oracleAddress.startsWith('0x') || config.oracleAddress.length !== 42) {
    throw new Error('Invalid oracle address format');
  }

  // Validate weights sum to 100
  const totalWeight = Object.values(config.scoreWeights).reduce((sum, w) => sum + w, 0);
  if (Math.abs(totalWeight - 100) > 0.01) {
    throw new Error(`Score weights must sum to 100, got ${totalWeight}`);
  }
}
