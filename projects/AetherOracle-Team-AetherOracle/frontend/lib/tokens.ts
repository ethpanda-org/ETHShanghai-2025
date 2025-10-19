import { CONTRACTS } from './contracts';

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  type: 'stablecoin' | 'crypto' | 'fiat';
  isTestnetDeployed?: boolean; // 🆕 标记是否在测试网真实部署
}

// TOKEN_INFO object for SwapInterface and other components
export const TOKEN_INFO = {
  USDC: {
    address: CONTRACTS.MOCK_USDC,
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    type: 'stablecoin' as const,
    isTestnetDeployed: true
  },
  USDT: {
    address: CONTRACTS.MOCK_USDT,
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    type: 'stablecoin' as const,
    isTestnetDeployed: true
  },
  DAI: {
    address: CONTRACTS.MOCK_DAI,
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    type: 'stablecoin' as const,
    isTestnetDeployed: true
  },
  WETH: {
    address: CONTRACTS.MOCK_WETH,
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    type: 'crypto' as const,
    isTestnetDeployed: true
  },
  WBTC: {
    address: CONTRACTS.MOCK_WBTC,
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    decimals: 8,
    type: 'crypto' as const,
    isTestnetDeployed: true
  },
  SOL: {
    address: CONTRACTS.MOCK_SOL,
    symbol: 'SOL',
    name: 'Mock Solana',
    decimals: 9,
    type: 'crypto' as const,
    isTestnetDeployed: true
  },
  ADA: {
    address: CONTRACTS.MOCK_ADA,
    symbol: 'ADA',
    name: 'Mock Cardano',
    decimals: 6,
    type: 'crypto' as const,
    isTestnetDeployed: true
  },
  BNB: {
    address: CONTRACTS.MOCK_BNB,
    symbol: 'BNB',
    name: 'Mock Binance Coin',
    decimals: 18,
    type: 'crypto' as const,
    isTestnetDeployed: true
  },
  MATIC: {
    address: CONTRACTS.MOCK_MATIC,
    symbol: 'MATIC',
    name: 'Mock Polygon',
    decimals: 18,
    type: 'crypto' as const,
    isTestnetDeployed: true
  },
  AVAX: {
    address: CONTRACTS.MOCK_AVAX,
    symbol: 'AVAX',
    name: 'Mock Avalanche',
    decimals: 18,
    type: 'crypto' as const,
    isTestnetDeployed: true
  }
} as const;

export const TOKENS: TokenInfo[] = [
  // ============ Stablecoins (已部署到Optimism Sepolia) ============
  TOKEN_INFO.USDC,
  TOKEN_INFO.USDT,
  TOKEN_INFO.DAI,

  // ============ Cryptocurrencies (已部署到Optimism Sepolia) ============
  TOKEN_INFO.WETH,
  TOKEN_INFO.WBTC,

  // ============ 更多加密货币 (已部署到Optimism Sepolia - 2025-10-15) ============
  TOKEN_INFO.SOL,
  TOKEN_INFO.ADA,
  TOKEN_INFO.BNB,
  TOKEN_INFO.MATIC,
  TOKEN_INFO.AVAX,

  // ============ Fiat Currencies (虚拟地址 - 仅用于汇率展示) ============
  {
    address: '0x0000000000000000000000000000000000001001',
    symbol: 'USD',
    name: 'US Dollar',
    decimals: 6,
    type: 'fiat',
    isTestnetDeployed: false
  },
  {
    address: '0x0000000000000000000000000000000000001002',
    symbol: 'EUR',
    name: 'Euro',
    decimals: 6,
    type: 'fiat',
    isTestnetDeployed: false
  },
  {
    address: '0x0000000000000000000000000000000000001003',
    symbol: 'GBP',
    name: 'British Pound',
    decimals: 6,
    type: 'fiat',
    isTestnetDeployed: false
  },
  {
    address: '0x0000000000000000000000000000000000001004',
    symbol: 'CNY',
    name: 'Chinese Yuan',
    decimals: 6,
    type: 'fiat',
    isTestnetDeployed: false
  },
  {
    address: '0x0000000000000000000000000000000000001005',
    symbol: 'JPY',
    name: 'Japanese Yen',
    decimals: 6,
    type: 'fiat',
    isTestnetDeployed: false
  },
];

export const getTokenInfo = (address: string): TokenInfo | undefined => {
  return TOKENS.find(t => t.address.toLowerCase() === address.toLowerCase());
};

export const getTokenSymbol = (address: string): string => {
  return getTokenInfo(address)?.symbol || 'Unknown';
};

export const getTokensByType = (type: 'stablecoin' | 'crypto' | 'fiat'): TokenInfo[] => {
  return TOKENS.filter(t => t.type === type);
};

// Default exchange rates (2024-10 reference prices)
export const DEFAULT_RATES: Record<string, number> = {
  // ============ Stablecoin pairs (1:1 with minor variations) ============
  'USDC/USDT': 1.0,
  'USDT/USDC': 1.0,
  'DAI/USDC': 1.0,
  'USDC/DAI': 1.0,
  'DAI/USDT': 1.0,
  'USDT/DAI': 1.0,

  // ============ WETH rates (ETH price ~$2600) ============
  'WETH/USDC': 2600.0,
  'WETH/USDT': 2600.0,
  'WETH/DAI': 2600.0,
  'USDC/WETH': 1 / 2600.0,
  'USDT/WETH': 1 / 2600.0,
  'DAI/WETH': 1 / 2600.0,

  // ============ WBTC rates (BTC price ~$65000) ============
  'WBTC/USDC': 65000.0,
  'WBTC/USDT': 65000.0,
  'WBTC/DAI': 65000.0,
  'USDC/WBTC': 1 / 65000.0,
  'USDT/WBTC': 1 / 65000.0,
  'DAI/WBTC': 1 / 65000.0,

  // ============ Crypto-to-Crypto pairs ============
  'WBTC/WETH': 65000.0 / 2600.0,  // ~25 ETH per BTC
  'WETH/WBTC': 2600.0 / 65000.0,   // ~0.04 BTC per ETH

  // ============ SOL rates (SOL price ~$140) ============
  'SOL/USDC': 140.0,
  'SOL/USDT': 140.0,
  'SOL/DAI': 140.0,
  'USDC/SOL': 1 / 140.0,
  'USDT/SOL': 1 / 140.0,
  'DAI/SOL': 1 / 140.0,

  // ============ ADA rates (ADA price ~$0.35) ============
  'ADA/USDC': 0.35,
  'ADA/USDT': 0.35,
  'ADA/DAI': 0.35,
  'USDC/ADA': 1 / 0.35,
  'USDT/ADA': 1 / 0.35,
  'DAI/ADA': 1 / 0.35,

  // ============ BNB rates (BNB price ~$310) ============
  'BNB/USDC': 310.0,
  'BNB/USDT': 310.0,
  'BNB/DAI': 310.0,
  'USDC/BNB': 1 / 310.0,
  'USDT/BNB': 1 / 310.0,
  'DAI/BNB': 1 / 310.0,

  // ============ MATIC rates (MATIC price ~$0.80) ============
  'MATIC/USDC': 0.80,
  'MATIC/USDT': 0.80,
  'MATIC/DAI': 0.80,
  'USDC/MATIC': 1 / 0.80,
  'USDT/MATIC': 1 / 0.80,
  'DAI/MATIC': 1 / 0.80,

  // ============ AVAX rates (AVAX price ~$36) ============
  'AVAX/USDC': 36.0,
  'AVAX/USDT': 36.0,
  'AVAX/DAI': 36.0,
  'USDC/AVAX': 1 / 36.0,
  'USDT/AVAX': 1 / 36.0,
  'DAI/AVAX': 1 / 36.0,

  // ============ Fiat pairs (approximate rates) ============
  // USD as base
  'USD/EUR': 0.92,
  'EUR/USD': 1.09,
  'USD/GBP': 0.79,
  'GBP/USD': 1.27,
  'USD/CNY': 7.25,
  'CNY/USD': 0.138,
  'USD/JPY': 149.5,
  'JPY/USD': 0.0067,

  // EUR pairs
  'EUR/GBP': 0.86,
  'GBP/EUR': 1.16,
  'EUR/CNY': 7.90,
  'CNY/EUR': 0.127,

  // Crypto to Fiat (examples)
  'WETH/USD': 2600.0,
  'WBTC/USD': 65000.0,
  'SOL/USD': 140.0,
  'BNB/USD': 310.0,
};

export const getDefaultRate = (pair: string): number | null => {
  return DEFAULT_RATES[pair] || null;
};

// AI supported trading pairs (有真实训练好的LightGBM模型)
export const SUPPORTED_AI_PAIRS = [
  // Stablecoin pairs
  'USDC/USDT', 'USDT/USDC', 'DAI/USDC', 'USDC/DAI', 'DAI/USDT', 'USDT/DAI',
  // WETH pairs
  'WETH/USDC', 'WETH/USDT', 'WETH/DAI',
  // WBTC pairs
  'WBTC/USDC', 'WBTC/USDT', 'WBTC/DAI',
  // Crypto-to-Crypto
  'WBTC/WETH', 'WETH/WBTC',
  // 🆕 新增加密货币对 (已有训练好的AI模型 - 2025-10-03)
  'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'ADA/USDT', 'BNB/USDT'
];

export const isAISupportedPair = (pair: string): boolean => {
  return SUPPORTED_AI_PAIRS.includes(pair);
};
