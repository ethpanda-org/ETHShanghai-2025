// Mock Asset Data
export const ASSETS = [
  { 
    id: "UST-2026", 
    name: "US Treasury 2Y", 
    issuer: "U.S. Treasury", 
    type: "Treasury Bond", 
    rating: "AAA", 
    chain: "Pharos", 
    maturity: "2026-07-15", 
    duration: 1.9, 
    tvl: 12.3, 
    vol24h: 2.1, 
    pApy: 5.1, 
    cApr: 4.2, 
    sApy: [12, 20], 
    lcr: 1.25, 
    nav: 100, 
    discountP: -1.5, 
    rewards: ["Points"], 
    isNew: true 
  },
  { 
    id: "CORP-2027-A", 
    name: "Corp Bond A 2027", 
    issuer: "Contoso Energy", 
    type: "Corporate Bond", 
    rating: "A-", 
    chain: "Pharos", 
    maturity: "2027-03-30", 
    duration: 2.5, 
    tvl: 8.9, 
    vol24h: 0.8, 
    pApy: 6.4, 
    cApr: 5.6, 
    sApy: [16, 28], 
    lcr: 1.1, 
    nav: 100, 
    discountP: -2.2, 
    rewards: ["External Rewards"], 
    isNew: false 
  },
  { 
    id: "CP-180D-2026", 
    name: "Commercial Paper 180D", 
    issuer: "Fabrikam Finance", 
    type: "Commercial Paper", 
    rating: "A2/P2", 
    chain: "Pharos", 
    maturity: "2026-01-10", 
    duration: 0.5, 
    tvl: 4.1, 
    vol24h: 1.2, 
    pApy: 4.8, 
    cApr: 6.2, 
    sApy: [20, 35], 
    lcr: 1.05, 
    nav: 100, 
    discountP: -0.9, 
    rewards: ["None"], 
    isNew: false 
  },
  { 
    id: "MUNI-2030", 
    name: "Municipal Bond 2030", 
    issuer: "Metro City", 
    type: "Municipal Bond", 
    rating: "AA", 
    chain: "Pharos", 
    maturity: "2030-09-01", 
    duration: 4.8, 
    tvl: 5.7, 
    vol24h: 0.4, 
    pApy: 5.9, 
    cApr: 4.0, 
    sApy: [10, 18], 
    lcr: 1.3, 
    nav: 100, 
    discountP: -1.1, 
    rewards: ["Points"], 
    isNew: false 
  },
]

// Investment Goal Data
export const GOALS = [
  { key: "Conservative", hint: "P-focused: Principal/maturity returns more stable" },
  { key: "Income", hint: "C-focused: Coupon income growth" },
  { key: "Shield", hint: "S-focused: Sell protection for premiums (high risk)" },
]

// Mock Portfolio Holdings Data
export const PORTFOLIO_HOLDINGS = [
  {
    assetId: "UST-2026",
    holdings: {
      P: { amount: 1250.00, costBasis: 124750.00 },
      C: { amount: 850.00, costBasis: 84150.00 },
      S: { amount: 300.00, costBasis: 29700.00 }
    }
  },
  {
    assetId: "CORP-2027-A", 
    holdings: {
      P: { amount: 800.00, costBasis: 79200.00 },
      C: { amount: 950.00, costBasis: 94050.00 },
      S: { amount: 450.00, costBasis: 44550.00 }
    }
  },
  {
    assetId: "CP-180D-2026",
    holdings: {
      P: { amount: 600.00, costBasis: 59400.00 },
      C: { amount: 200.00, costBasis: 19800.00 },
      S: { amount: 100.00, costBasis: 9900.00 }
    }
  },
  {
    assetId: "MUNI-2030",
    holdings: {
      P: { amount: 450.00, costBasis: 44550.00 },
      C: { amount: 380.00, costBasis: 37620.00 },
      S: { amount: 120.00, costBasis: 11880.00 }
    }
  }
]

// Helper functions
export function getAsset(assetId) { 
  return ASSETS.find(a => a.id === assetId) 
}

export function getPortfolioHolding(assetId) {
  return PORTFOLIO_HOLDINGS.find(h => h.assetId === assetId)
}

export function calculatePortfolioSummary() {
  let totalValue = 0
  let totalP = 0
  let totalC = 0 
  let totalS = 0
  let nearMaturityCount = 0

  PORTFOLIO_HOLDINGS.forEach(holding => {
    const asset = getAsset(holding.assetId)
    if (asset) {
      // Calculate current values (using NAV as current price)
      const pValue = holding.holdings.P.amount * asset.nav
      const cValue = holding.holdings.C.amount * asset.nav 
      const sValue = holding.holdings.S.amount * asset.nav
      
      totalP += pValue
      totalC += cValue
      totalS += sValue
      totalValue += pValue + cValue + sValue

      // Check if near maturity (≤90 days)
      const maturityDate = new Date(asset.maturity)
      const today = new Date()
      const daysToMaturity = Math.ceil((maturityDate - today) / (1000 * 60 * 60 * 24))
      if (daysToMaturity <= 90 && daysToMaturity > 0) {
        nearMaturityCount++
      }
    }
  })

  const pPercent = totalValue > 0 ? (totalP / totalValue) * 100 : 0
  const cPercent = totalValue > 0 ? (totalC / totalValue) * 100 : 0
  const sPercent = totalValue > 0 ? (totalS / totalValue) * 100 : 0

  return {
    totalValue,
    pValue: totalP,
    cValue: totalC,
    sValue: totalS,
    pPercent,
    cPercent, 
    sPercent,
    nearMaturityCount
  }
}
