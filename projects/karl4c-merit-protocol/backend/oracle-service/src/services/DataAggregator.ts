import { AggregatedData } from '../types';
import { GitcoinService } from './GitcoinService';
import { ENSService } from './ENSService';
// import { LensService } from './LensService'; // 已删除
import { FarcasterService } from './FarcasterService';
import { OnChainService } from './OnChainService';
import { POAPService } from './POAPService'; // 使用 GitPOAP Public API
// import { AaveGovernanceService } from './AaveGovernanceService'; // 已删除
import { NounsDAOService } from './NounsDAOService'; // 使用 Alchemy NFT API
import { logger } from '../utils/logger';

/**
 * Data Aggregator
 * Fetches and aggregates data from all sources
 */
export class DataAggregator {
  private gitcoinService: GitcoinService;
  private ensService: ENSService;
  // private lensService: LensService; // 已删除
  private farcasterService: FarcasterService;
  private onChainService: OnChainService;
  private poapService: POAPService; // 使用 GitPOAP Public API
  // private aaveGovernanceService: AaveGovernanceService; // 已删除
  private nounsDAOService: NounsDAOService; // 使用 Alchemy NFT API

  constructor(
    gitcoinApiKey?: string,
    rpcUrl?: string,
    mainnetRpcUrl?: string,
    alchemyApiKey?: string,
    neynarApiKey?: string,
    graphApiKey?: string
  ) {
    this.gitcoinService = new GitcoinService(gitcoinApiKey);
    this.ensService = new ENSService(mainnetRpcUrl || rpcUrl);
    // this.lensService = new LensService(); // 已删除
    this.farcasterService = new FarcasterService(neynarApiKey);
    this.onChainService = new OnChainService(rpcUrl, alchemyApiKey);
    this.poapService = new POAPService(graphApiKey); // 使用 The Graph POAP Subgraph
    // this.aaveGovernanceService = new AaveGovernanceService(mainnetRpcUrl || rpcUrl); // 已删除
    this.nounsDAOService = new NounsDAOService(mainnetRpcUrl || rpcUrl, alchemyApiKey); // 使用 Alchemy NFT API
  }

  /**
   * Aggregate all data for a user
   * @param address User's Ethereum address
   * @returns Aggregated data from all sources
   */
  async aggregateData(address: string): Promise<AggregatedData> {
    logger.info(`Aggregating data for ${address}`);

    // Fetch data from all sources in parallel
    const [gitcoin, ens, farcaster, onChain, poap, nounsDAO] = await Promise.all([
      this.gitcoinService.getPassportData(address).catch((err: any) => {
        logger.error('Gitcoin fetch error:', err);
        return null;
      }),
      this.ensService.getENSData(address).catch((err: any) => {
        logger.error('ENS fetch error:', err);
        return null;
      }),
      // Lens removed
      this.farcasterService.getFarcasterData(address).catch((err: any) => {
        logger.error('Farcaster fetch error:', err);
        return null;
      }),
      this.onChainService.getOnChainData(address).catch((err: any) => {
        logger.error('OnChain fetch error:', err);
        return null;
      }),
      this.poapService.getPOAPData(address).catch((err: any) => {
        logger.error('POAP fetch error:', err);
        return null;
      }),
      // Aave Governance removed
      this.nounsDAOService.getNounsData(address).catch((err: any) => {
        logger.error('Nouns DAO fetch error:', err);
        return null;
      }),
    ]);

    const aggregated: AggregatedData = {
      address,
      gitcoin,
      ens,
      // lens, // 已删除
      farcaster,
      onChain,
      poap, // 使用 GitPOAP Public API
      // aaveGovernance, // 已删除
      nounsDAO, // 使用 Alchemy NFT API
      timestamp: Date.now(),
    };

    logger.info(`Data aggregation complete for ${address}`);
    return aggregated;
  }

  /**
   * Aggregate data for multiple users
   */
  async aggregateMultiple(addresses: string[]): Promise<AggregatedData[]> {
    logger.info(`Aggregating data for ${addresses.length} addresses`);
    
    const results = await Promise.all(
      addresses.map(address => this.aggregateData(address))
    );

    return results;
  }

  /**
   * Quick check if user has any Web3 presence
   */
  async hasWeb3Presence(address: string): Promise<boolean> {
    const [hasGitcoin, hasENS, hasFarcaster, isActive, hasPOAP, hasNouns] = await Promise.all([
      this.gitcoinService.hasValidPassport(address),
      this.ensService.hasENS(address),
      // Lens removed
      this.farcasterService.hasFarcasterProfile(address),
      this.onChainService.isActiveAccount(address),
      this.poapService.hasPOAPs(address),
      // Aave removed
      this.nounsDAOService.hasNounsNFT(address),
    ]);

    return hasGitcoin || hasENS || hasFarcaster || isActive || hasPOAP || hasNouns;
  }
}
