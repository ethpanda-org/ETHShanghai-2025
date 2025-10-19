import { apiGet, ApiResponse } from './config'

// API response types for all-balances endpoint
export interface AssetInfo {
  assetId: string
  name: string
  chain: string
  rating: string
  type: string
  maturity: string
  issuer: string
}

export interface BalanceRaw {
  pBalance: string
  cBalance: string
  sBalance: string
  pDecimals: number
  cDecimals: number
  sDecimals: number
}

export interface BalanceDisplay {
  pBalance: string
  cBalance: string
  sBalance: string
  pValueUSD: string
  cValueUSD: string
  sValueUSD: string
  totalValueUSD: string
}

export interface Balances {
  pBalance: number
  cBalance: number
  sBalance: number
  pValueUSD: number
  cValueUSD: number
  sValueUSD: number
  totalValueUSD: number
  raw: BalanceRaw
  display: BalanceDisplay
}

export interface Prices {
  pPrice: number
  cPrice: number
  sPrice: number
  lastUpdated: string
  source: string
}

export interface AssetBalance {
  assetInfo: AssetInfo
  balances: Balances
  prices: Prices
  totalValue: number
  totalValueUSD: number
  lastUpdated: string
  lastUpdatedBlock: number | null
}

export interface PortfolioSummary {
  totalAssets: number
  totalValue: number
  totalValueUSD: number
  totalPBalance: number
  totalCBalance: number
  totalSBalance: number
  totalPValueUSD: number
  totalCValueUSD: number
  totalSValueUSD: number
}

export interface PortfolioMeta {
  source: string
  timestamp: string
  network: string
  queryMethod: string
}

export interface PortfolioStats {
  assetsWithBalance: number
  assetsWithUSDValue: number
  highestValueAsset: AssetBalance
  priceDataFreshness: {
    hasCachedPrices: boolean
    usingDefaultPrices: boolean
  }
}

export interface AllBalancesResponse {
  walletAddress: string
  network: string
  balances: AssetBalance[]
  summary: PortfolioSummary
  meta: PortfolioMeta
  stats: PortfolioStats
}

export const portfolioApi = {
  // Get all balances for a wallet address
  getAllBalances: async (walletAddress: string): Promise<ApiResponse<AllBalancesResponse>> => {
    const queryParams = new URLSearchParams({
      walletAddress: walletAddress
    })
    return await apiGet<AllBalancesResponse>(`/portfolio/all-balances?${queryParams.toString()}`)
  },
}

export default portfolioApi