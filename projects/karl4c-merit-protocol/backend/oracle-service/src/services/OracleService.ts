import { DataAggregator } from './DataAggregator';
import { ScoreCalculator } from './ScoreCalculator';
import { BlockchainService } from './BlockchainService';
import { CalculatedScore, UpdateResponse, OracleConfig } from '../types';
import { logger } from '../utils/logger';

/**
 * Oracle Service
 * Main service that coordinates data fetching, score calculation, and on-chain updates
 */
export class OracleService {
  private aggregator: DataAggregator;
  private calculator: ScoreCalculator;
  private blockchain: BlockchainService;
  private config: OracleConfig;

  constructor(config: OracleConfig) {
    this.config = config;
    
    this.aggregator = new DataAggregator(
      config.gitcoinApiKey,
      config.rpcUrl,
      config.mainnetRpcUrl,
      config.alchemyApiKey,
      config.neynarApiKey,
      process.env.GRAPH_API_KEY
    );
    
    this.calculator = new ScoreCalculator(config.scoreWeights);
    
    this.blockchain = new BlockchainService(
      config.privateKey,
      config.rpcUrl,
      config.oracleAddress,
      config.chainId
    );
  }

  /**
   * Initialize oracle service
   */
  async initialize(): Promise<void> {
    logger.info('Initializing Oracle Service...');
    logger.info(`Oracle Address: ${this.blockchain.getOracleAddress()}`);
    logger.info(`Account Address: ${this.blockchain.getAccountAddress()}`);

    // Verify ownership (skip in test mode)
    const testMode = process.env.TEST_MODE === 'true';
    if (testMode) {
      logger.warn('⚠️  TEST MODE: Skipping ownership verification');
      logger.warn('⚠️  On-chain updates will be disabled');
    } else {
      const isOwner = await this.blockchain.verifyOwnership();
      if (!isOwner) {
        throw new Error('Account is not the oracle owner');
      }
    }

    logger.info('Oracle Service initialized successfully');
  }

  /**
   * Update score for a single user
   * @param address User address
   * @param forceUpdate Force update even if score hasn't changed
   * @returns Update response
   */
  async updateUserScore(
    address: string,
    forceUpdate: boolean = false
  ): Promise<UpdateResponse> {
    try {
      logger.info(`Processing score update for ${address}`);

      // 1. Aggregate data from all sources
      const aggregatedData = await this.aggregator.aggregateData(address);

      // 2. Calculate merit score
      const calculatedScore = this.calculator.calculateScore(aggregatedData);

      logger.info(`Calculated score for ${address}: ${calculatedScore.totalScore}`);
      logger.info('Breakdown:', calculatedScore.breakdown);

      // 3. Check if update is needed
      if (!forceUpdate) {
        const currentScore = await this.blockchain.getCurrentScore(address);
        if (currentScore === calculatedScore.totalScore) {
          logger.info(`Score unchanged (${currentScore}), skipping update`);
          return {
            success: true,
            address,
            score: currentScore,
          };
        }
      }

      // 4. Update on-chain
      const txHash = await this.blockchain.updateScore(calculatedScore);

      return {
        success: true,
        address,
        score: calculatedScore.totalScore,
        txHash,
      };
    } catch (error: any) {
      logger.error(`Failed to update score for ${address}:`, error.message);
      return {
        success: false,
        address,
        score: 0,
        error: error.message,
      };
    }
  }

  /**
   * Batch update scores for multiple users
   * @param addresses Array of user addresses
   * @returns Array of update responses
   */
  async batchUpdateScores(addresses: string[]): Promise<UpdateResponse[]> {
    try {
      logger.info(`Processing batch update for ${addresses.length} addresses`);

      // 1. Aggregate data for all users
      const aggregatedDataArray = await this.aggregator.aggregateMultiple(addresses);

      // 2. Calculate scores
      const calculatedScores = aggregatedDataArray.map(data =>
        this.calculator.calculateScore(data)
      );

      // 3. Update on-chain (batch)
      const txHash = await this.blockchain.batchUpdateScores(calculatedScores);

      // 4. Return responses
      return calculatedScores.map(score => ({
        success: true,
        address: score.address,
        score: score.totalScore,
        txHash,
      }));
    } catch (error: any) {
      logger.error('Batch update failed:', error.message);
      return addresses.map(address => ({
        success: false,
        address,
        score: 0,
        error: error.message,
      }));
    }
  }

  /**
   * Calculate score without updating on-chain
   * @param address User address
   * @returns Calculated score
   */
  async calculateScore(address: string): Promise<CalculatedScore> {
    const aggregatedData = await this.aggregator.aggregateData(address);
    return this.calculator.calculateScore(aggregatedData);
  }

  /**
   * Get current on-chain score
   * @param address User address
   * @returns Current score
   */
  async getCurrentScore(address: string): Promise<number> {
    return this.blockchain.getCurrentScore(address);
  }

  /**
   * Check if user has Web3 presence
   * @param address User address
   * @returns True if user has any Web3 activity
   */
  async hasWeb3Presence(address: string): Promise<boolean> {
    return this.aggregator.hasWeb3Presence(address);
  }

  /**
   * Get score interpretation
   * @param score Merit score
   * @returns Human-readable interpretation
   */
  getScoreInterpretation(score: number): string {
    return this.calculator.getScoreInterpretation(score);
  }
}
