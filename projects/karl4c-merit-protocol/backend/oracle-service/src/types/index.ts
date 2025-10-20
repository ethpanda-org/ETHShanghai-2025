/**
 * Merit Protocol Oracle Service Types
 */

export interface UserAddress {
  address: string;
}

export interface MeritData {
  score: number;
  lastUpdated: number;
}

export interface GitcoinPassportData {
  score: number;
  stamps: number;
  lastUpdated: string;
}

export interface ENSData {
  hasENS: boolean;
  primaryName: string | null;
  registrationDate: number | null;
  expiryDate: number | null;
}

export interface LensData {
  hasProfile: boolean;
  handle: string | null;
  followers: number;
  following: number;
  posts: number;
}

export interface FarcasterData {
  hasProfile: boolean;
  username: string | null;
  followers: number;
  following: number;
  casts: number;
}

export interface OnChainData {
  accountAge: number; // in days
  transactionCount: number;
  contractsDeployed: number;
  uniqueInteractions: number;
}

// POAP (Proof of Attendance Protocol) Data
export interface POAPData {
  totalPOAPs: number;
  uniqueEvents: number;
  oldestPOAP: number | null; // timestamp
  recentPOAPs: number; // last 6 months
}

// Aave DAO Governance Data
export interface AaveGovernanceData {
  hasVoted: boolean;
  proposalsVoted: number;
  votingPower: number;
  delegatedPower: number;
  proposalsCreated: number;
}

// Nouns DAO NFT Holding Data
export interface NounsDAOData {
  hasNounsNFT: boolean;
  nounsCount: number;
  holdingDuration: number; // in days
  longestHold: number; // in days
  participationScore: number; // based on voting/proposals
}

export interface AggregatedData {
  address: string;
  gitcoin: GitcoinPassportData | null;
  ens: ENSData | null;
  // lens: LensData | null; // 已删除
  farcaster: FarcasterData | null;
  onChain: OnChainData | null;
  poap: POAPData | null; // 使用 GitPOAP Public API
  // aaveGovernance: AaveGovernanceData | null; // 已删除
  nounsDAO: NounsDAOData | null; // 使用 Alchemy NFT API
  timestamp: number;
}

export interface ScoreWeights {
  gitcoin: number;
  ens: number;
  // lens: number; // 已删除
  farcaster: number;
  onChain: number;
  poap: number; // 使用 GitPOAP Public API
  // aaveGovernance: number; // 已删除
  nounsDAO: number; // 使用 Alchemy NFT API
}

export interface CalculatedScore {
  address: string;
  totalScore: number;
  breakdown: {
    gitcoin: number;
    ens: number;
    // lens: number; // 已删除
    farcaster: number;
    onChain: number;
    poap: number; // 使用 GitPOAP Public API
    // aaveGovernance: number; // 已删除
    nounsDAO: number; // 使用 Alchemy NFT API
  };
  timestamp: number;
}

export interface OracleConfig {
  rpcUrl: string;
  mainnetRpcUrl?: string;
  privateKey: string;
  oracleAddress: string;
  chainId: number;
  gitcoinApiKey?: string;
  alchemyApiKey?: string;
  neynarApiKey?: string;
  scoreWeights: ScoreWeights;
}

export interface UpdateRequest {
  address: string;
  forceUpdate?: boolean;
}

export interface UpdateResponse {
  success: boolean;
  address: string;
  score: number;
  txHash?: string;
  error?: string;
}
