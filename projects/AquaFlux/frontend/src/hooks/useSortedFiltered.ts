import { useMemo } from 'react'
import { avg } from '../utils/helpers'

interface Asset {
  id: string
  name: string
  issuer: string
  pApy: number
  cApr: number
  sApyRange: number[]
  vol24h: number
  tvl: number
  isNew?: boolean
  maturity: string
}

interface AssetWithGoalBias extends Asset {
  _goalBias: number
}

interface FilterOptions {
  sort: 'trend' | 'pApy' | 'cApr' | 'sApyRange' | 'tvl' | 'maturity'
  search: string
  goal: 'Conservative' | 'Income' | string
}

export function useSortedFiltered(assets: Asset[], { sort, search, goal }: FilterOptions): AssetWithGoalBias[] {
  return useMemo(() => {
    let list = assets.filter((a) => {
      const q = search.trim().toLowerCase()
      if (!q) return true
      return a.name.toLowerCase().includes(q) || 
             a.issuer.toLowerCase().includes(q) || 
             a.id.toLowerCase().includes(q)
    })
    
    list = list.map((a) => ({ 
      ...a, 
      _goalBias: goal === "Conservative" ? a.pApy : 
                 goal === "Income" ? a.cApr : 
                 avg(a.sApyRange) 
    })) as AssetWithGoalBias[]
    
    list.sort((x, y) => {
      if (sort === "trend") { 
        const score = (z: AssetWithGoalBias) => Math.sqrt(z.vol24h) * 0.6 + 
                            Math.sqrt(z.tvl) * 0.3 + 
                            (z.isNew ? 0.4 : 0) + 
                            z._goalBias * 0.02
        return score(y) - score(x)
      } 
      if (sort === "pApy") return y.pApy - x.pApy
      if (sort === "cApr") return y.cApr - x.cApr
      if (sort === "sApyRange") return avg(y.sApyRange) - avg(x.sApyRange)
      if (sort === "tvl") return y.tvl - x.tvl
      if (sort === "maturity") return new Date(x.maturity).getTime() - new Date(y.maturity).getTime()
      return 0
    })
    
    return list
  }, [assets, sort, search, goal])
}