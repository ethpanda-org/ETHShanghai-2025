import {
  AggregatedData,
  CalculatedScore,
  ScoreWeights,
  GitcoinPassportData,
  ENSData,
  // LensData, // 已删除
  FarcasterData,
  OnChainData,
  POAPData, // 使用 GitPOAP Public API
  // AaveGovernanceData, // 已删除
  NounsDAOData, // 使用 Alchemy NFT API
} from '../types';
import { logger } from '../utils/logger';

/**
 * Score Calculator
 * Calculates merit score based on aggregated Web3 data
 */
export class ScoreCalculator {
  private weights: ScoreWeights;

  constructor(weights?: Partial<ScoreWeights>) {
    // Default weights (total = 100)
    this.weights = {
      gitcoin: weights?.gitcoin ?? 35,
      ens: weights?.ens ?? 20,
      // lens: weights?.lens ?? 10, // 已删除
      farcaster: weights?.farcaster ?? 15,
      onChain: weights?.onChain ?? 10,
      poap: weights?.poap ?? 10, // 使用 GitPOAP Public API
      // aaveGovernance: weights?.aaveGovernance ?? 15, // 已删除
      nounsDAO: weights?.nounsDAO ?? 10, // 使用 Alchemy NFT API
    };

    this.validateWeights();
  }

  /**
   * Validate that weights sum to 100
   */
  private validateWeights(): void {
    const total = Object.values(this.weights).reduce((sum, w) => sum + w, 0);
    if (Math.abs(total - 100) > 0.01) {
      logger.warn(`Score weights sum to ${total}, expected 100. Normalizing...`);
      const factor = 100 / total;
      this.weights = {
        gitcoin: this.weights.gitcoin * factor,
        ens: this.weights.ens * factor,
        // lens: this.weights.lens * factor, // 已删除
        farcaster: this.weights.farcaster * factor,
        onChain: this.weights.onChain * factor,
        poap: this.weights.poap * factor, // 使用 GitPOAP Public API
        // aaveGovernance: this.weights.aaveGovernance * factor, // 已删除
        nounsDAO: this.weights.nounsDAO * factor, // 使用 Alchemy NFT API
      };
    }
  }

  /**
   * Calculate merit score from aggregated data
   * @param data Aggregated Web3 data
   * @returns Calculated score with breakdown
   */
  calculateScore(data: AggregatedData): CalculatedScore {
    const gitcoinScore = this.calculateGitcoinScore(data.gitcoin);
    const ensScore = this.calculateENSScore(data.ens);
    // const lensScore = this.calculateLensScore(data.lens); // 已删除
    const farcasterScore = this.calculateFarcasterScore(data.farcaster);
    const onChainScore = this.calculateOnChainScore(data.onChain);
    const poapScore = this.calculatePOAPScore(data.poap); // 使用 GitPOAP Public API
    // const aaveScore = this.calculateAaveGovernanceScore(data.aaveGovernance); // 已删除
    const nounsScore = this.calculateNounsDAOScore(data.nounsDAO); // 使用 Alchemy NFT API

    const totalScore = Math.round(
      gitcoinScore * (this.weights.gitcoin / 100) +
      ensScore * (this.weights.ens / 100) +
      // lensScore * (this.weights.lens / 100) + // 已删除
      farcasterScore * (this.weights.farcaster / 100) +
      onChainScore * (this.weights.onChain / 100) +
      poapScore * (this.weights.poap / 100) + // 使用 GitPOAP Public API
      // aaveScore * (this.weights.aaveGovernance / 100) + // 已删除
      nounsScore * (this.weights.nounsDAO / 100) // 使用 Alchemy NFT API
    );

    return {
      address: data.address,
      totalScore: Math.max(0, Math.min(1000, totalScore)), // Cap between 0-1000
      breakdown: {
        gitcoin: Math.round(gitcoinScore),
        ens: Math.round(ensScore),
        // lens: Math.round(lensScore), // 已删除
        farcaster: Math.round(farcasterScore),
        onChain: Math.round(onChainScore),
        poap: Math.round(poapScore), // 使用 GitPOAP Public API
        // aaveGovernance: Math.round(aaveScore), // 已删除
        nounsDAO: Math.round(nounsScore), // 使用 Alchemy NFT API
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Calculate Gitcoin Passport score (0-1000)
   * High weight: Gitcoin score is a strong reputation signal
   */
  private calculateGitcoinScore(data: GitcoinPassportData | null): number {
    if (!data || data.score === 0) return 0;

    // Gitcoin score is typically 0-100
    // We scale it to 0-1000 with diminishing returns
    const baseScore = Math.min(data.score * 10, 800);
    
    // Bonus for having many stamps (shows diverse verification)
    const stampBonus = Math.min(data.stamps * 5, 200);

    return baseScore + stampBonus;
  }

  /**
   * Calculate ENS score (0-1000)
   * Having ENS shows commitment to Web3 identity
   */
  private calculateENSScore(data: ENSData | null): number {
    if (!data || !data.hasENS) return 0;

    let score = 500; // Base score for having ENS

    // Bonus for longer registration (shows commitment)
    if (data.registrationDate) {
      const ageInDays = (Date.now() - data.registrationDate) / (1000 * 60 * 60 * 24);
      const ageBonus = Math.min(ageInDays * 0.5, 300); // Up to 300 bonus
      score += ageBonus;
    }

    // Bonus for longer expiry (shows long-term commitment)
    if (data.expiryDate && data.expiryDate > Date.now()) {
      const daysUntilExpiry = (data.expiryDate - Date.now()) / (1000 * 60 * 60 * 24);
      const expiryBonus = Math.min(daysUntilExpiry * 0.2, 200); // Up to 200 bonus
      score += expiryBonus;
    }

    return Math.min(score, 1000);
  }

  // Lens Protocol removed
  // private calculateLensScore(data: LensData | null): number { ... }

  /**
   * Calculate POAP score (0-1000)
   * POAPs show event participation and community involvement
   * Using GitPOAP Public API
   */
  private calculatePOAPScore(data: POAPData | null): number {
    if (!data || data.totalPOAPs === 0) return 0;

    let score = 200; // Base score for having POAPs

    // Total POAPs score
    const totalScore = Math.min(data.totalPOAPs * 10, 300);
    
    // Unique events score (diversity)
    const uniqueScore = Math.min(data.uniqueEvents * 15, 300);
    
    // Longevity score (older POAPs = longer involvement)
    if (data.oldestPOAP) {
      const ageInDays = (Date.now() - data.oldestPOAP) / (1000 * 60 * 60 * 24);
      const longevityScore = Math.min(ageInDays * 0.3, 150);
      score += longevityScore;
    }
    
    // Recent activity score
    const recentScore = Math.min(data.recentPOAPs * 20, 150);

    score += totalScore + uniqueScore + recentScore;

    return Math.min(score, 1000);
  }

  /**
   * Calculate Farcaster score (0-1000)
   * Similar to Lens, shows social Web3 engagement
   */
  private calculateFarcasterScore(data: FarcasterData | null): number {
    if (!data || !data.hasProfile) return 0;

    let score = 300; // Base score for having profile

    // Follower score (logarithmic scale)
    const followerScore = Math.min(Math.log10(data.followers + 1) * 150, 300);
    
    // Cast activity score
    const castScore = Math.min(data.casts * 2, 250);
    
    // Following score
    const followingScore = Math.min(Math.log10(data.following + 1) * 50, 150);

    score += followerScore + castScore + followingScore;

    return Math.min(score, 1000);
  }

  /**
   * Calculate on-chain activity score (0-1000)
   * Account age and activity shows long-term Web3 involvement
   */
  private calculateOnChainScore(data: OnChainData | null): number {
    if (!data) return 0;

    let score = 0;

    // Account age score (older = better)
    const ageScore = Math.min(data.accountAge * 0.5, 400); // Up to 400 for 800+ days
    
    // Transaction count score (logarithmic)
    const txScore = Math.min(Math.log10(data.transactionCount + 1) * 100, 300);
    
    // Contract deployment score (shows builder activity)
    const contractScore = Math.min(data.contractsDeployed * 100, 200);
    
    // Unique interactions score
    const interactionScore = Math.min(Math.log10(data.uniqueInteractions + 1) * 50, 100);

    score = ageScore + txScore + contractScore + interactionScore;

    return Math.min(score, 1000);
  }

  /**
   * Calculate POAP score (0-1000)
   * POAPs show event participation and community involvement
   * TODO: 待添加 POAP API
   */
  // private calculatePOAPScore(data: POAPData | null): number {
  //   if (!data || data.totalPOAPs === 0) return 0;
  //
  //   let score = 200; // Base score for having POAPs
  //
  //   // Total POAPs score
  //   const totalScore = Math.min(data.totalPOAPs * 10, 300);
  //   
  //   // Unique events score (diversity)
  //   const uniqueScore = Math.min(data.uniqueEvents * 15, 300);
  //   
  //   // Longevity score (older POAPs = longer involvement)
  //   if (data.oldestPOAP) {
  //     const ageInDays = (Date.now() - data.oldestPOAP) / (1000 * 60 * 60 * 24);
  //     const longevityScore = Math.min(ageInDays * 0.3, 150);
  //     score += longevityScore;
  //   }
  //   
  //   // Recent activity score
  //   const recentScore = Math.min(data.recentPOAPs * 20, 150);
  //
  //   score += totalScore + uniqueScore + recentScore;
  //
  //   return Math.min(score, 1000);
  // }

  // Aave Governance removed
  // private calculateAaveGovernanceScore(data: AaveGovernanceData | null): number { ... }

  /**
   * Calculate Nouns DAO score (0-1000)
   * NFT holding shows high-value participation
   * Using Alchemy NFT API
   */
  private calculateNounsDAOScore(data: NounsDAOData | null): number {
    if (!data || !data.hasNounsNFT) return 0;

    let score = 400; // Base score for holding Nouns NFT (high value)

    // Number of Nouns held (very valuable)
    const countScore = Math.min(data.nounsCount * 150, 300);
    
    // Participation score (based on NFT count)
    const participationScore = Math.min(data.participationScore, 300);

    score += countScore + participationScore;

    return Math.min(score, 1000);
  }

  /**
   * Get score interpretation
   */
  getScoreInterpretation(score: number): string {
    if (score >= 800) return 'Excellent - Top tier Web3 builder';
    if (score >= 600) return 'Very Good - Established Web3 presence';
    if (score >= 400) return 'Good - Active Web3 participant';
    if (score >= 200) return 'Fair - Emerging Web3 user';
    return 'Low - New to Web3 or limited activity';
  }

  /**
   * Update weights
   */
  updateWeights(newWeights: Partial<ScoreWeights>): void {
    this.weights = { ...this.weights, ...newWeights };
    this.validateWeights();
  }
}
