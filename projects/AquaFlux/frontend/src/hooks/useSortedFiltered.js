import { useMemo } from 'react'
import { avg } from '../utils/helpers'

export function useSortedFiltered(assets, { sort, search, goal }) {
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
                 avg(a.sApy) 
    }))
    
    list.sort((x, y) => {
      if (sort === "trend") { 
        const score = (z) => Math.sqrt(z.vol24h) * 0.6 + 
                            Math.sqrt(z.tvl) * 0.3 + 
                            (z.isNew ? 0.4 : 0) + 
                            z._goalBias * 0.02
        return score(y) - score(x)
      } 
      if (sort === "pApy") return y.pApy - x.pApy
      if (sort === "cApr") return y.cApr - x.cApr
      if (sort === "sApy") return avg(y.sApy) - avg(x.sApy)
      if (sort === "tvl") return y.tvl - x.tvl
      if (sort === "maturity") return new Date(x.maturity) - new Date(y.maturity)
      return 0
    })
    
    return list
  }, [assets, sort, search, goal])
}
