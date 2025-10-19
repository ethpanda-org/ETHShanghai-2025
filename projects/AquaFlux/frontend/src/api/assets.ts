import { apiRequest, ApiResponse } from './config'

// Types
export interface Asset {
  id: string
  name: string
  issuer: string
  type: string
  rating: string
  chain: string
  maturity: string
  duration: number
  tvl: number
  vol24h: number
  pApy: number
  cApr: number
  sApyRange: number[]
  lcr: number
  nav: number
  discountP: number
  rewards: string[]
  isNew?: boolean
}

export interface AssetsListResponse {
  assets: Asset[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface AssetDetailResponse {
  asset: Asset
}

export const assetsApi = {
  getAll: async (): Promise<ApiResponse<AssetsListResponse>> => {
    return await apiRequest<AssetsListResponse>('/assets')
  },

  getById: async (id: string): Promise<ApiResponse<AssetDetailResponse>> => {
    return await apiRequest<AssetDetailResponse>(`/assets/${id}`)
  },
}

export default assetsApi