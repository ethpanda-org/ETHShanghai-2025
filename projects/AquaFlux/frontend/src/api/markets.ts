import { apiGet, ApiResponse } from './config'

// Market Types
export interface TvlTotalResponse {
  totalTVL: string
  totalTVLFormatted: string
  lastUpdated: string
  previous24h: string | null
  previous24hFormatted: string | null
  change24h: string | null
  change24hFormatted: string | null
  changePercentage: string
  changeDirection: "up" | "down" | "stable"
}

export interface Volume24hResponse {
  currentVolume24h: string
  currentVolume24hFormatted: string
  previousVolume24h: string
  previousVolume24hFormatted: string
  change24h: string
  change24hFormatted: string
  changePercentage: string
  changeDirection: "up" | "down" | "stable"
  network: string
  lastUpdated: string
  dataSource: string
}

export const marketsApi = {
  // Get total TVL information
  getTvlTotal: async (): Promise<ApiResponse<TvlTotalResponse>> => {
    return await apiGet<TvlTotalResponse>('/tvl/total')
  },

  // Get 24h volume information
  getVolume24h: async (network: string = 'sepolia'): Promise<ApiResponse<Volume24hResponse>> => {
    return await apiGet<Volume24hResponse>(`/market/volume24h?network=${network}`)
  },
}

export default marketsApi