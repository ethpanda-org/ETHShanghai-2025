import { ASSETS } from '../data/mockData'

// Token Parsing Functions
export function parseTokenId(id) {
  if (!id) return { type: 'UNKNOWN' }
  if (id === 'USDC') return { type: 'STABLE', symbol: 'USDC' }
  if (id.includes(':')) { 
    const [assetId, leg] = id.split(':')
    return { type: 'LEG', assetId, leg }
  }
  return { type: 'LEG', assetId: null, leg: id }
}

// Display Token Name
export function displayToken(id) {
  const info = parseTokenId(id)
  if (info.type === 'STABLE') return 'USDC'
  const a = info.assetId ? ASSETS.find(asset => asset.id === info.assetId) : null
  return info.assetId ? `${info.leg} · ${a ? a.name : info.assetId}` : info.leg
}

// Build Token Selector Data
export function buildTokenUniverse(currentAsset) {
  const makeLeg = (a, leg) => ({
    id: `${a.id}:${leg}`,
    label: `${leg} · ${a.name}`,
    searchText: `${a.id} ${a.name} ${a.issuer} ${a.type} ${a.rating} ${a.chain} ${leg}`.toLowerCase(),
    assetId: a.id,
    leg
  })
  
  const groups = []
  if (currentAsset) {
    groups.push({ 
      key: 'current', 
      label: `Current Asset · ${currentAsset.name}`, 
      tokens: ['P', 'C', 'S'].map(leg => makeLeg(currentAsset, leg)) 
    })
  }
  
  groups.push({ 
    key: 'stable', 
    label: 'Stablecoins', 
    tokens: [{ id: 'USDC', label: 'USDC', searchText: 'usdc stable coin' }] 
  })
  
  const others = ASSETS.filter(a => !currentAsset || a.id !== currentAsset.id)
  return { 
    groups, 
    subGroups: others.map(a => ({ 
      key: a.id, 
      label: `${a.id} · ${a.name} · ${a.issuer}`, 
      tokens: ['P', 'C', 'S'].map(leg => makeLeg(a, leg)) 
    })) 
  }
}

// Mock Price Function
export function mockPriceUSD(tokenId) {
  const info = parseTokenId(tokenId)
  if (info.type === 'STABLE') return 1 // USDC
  return 33.3333333333 // Demo price per leg
}

// Mock Quote Function
export function quoteMock({ from, to, amountIn }) {
  const pIn = mockPriceUSD(from)
  const pOut = mockPriceUSD(to)
  if (pIn <= 0 || pOut <= 0) return { amountOut: 0, price: 0, impact: 0 }
  
  const grossOut = amountIn * pIn / pOut
  const fee = grossOut * (20 / 10000) // 0.20% fee
  const amountOut = Math.max(0, grossOut - fee)
  const price = pIn / pOut
  const impact = Math.min(0.008, Math.max(0, amountIn / 10000))
  
  return { amountOut, price, impact, feeOut: fee }
}
