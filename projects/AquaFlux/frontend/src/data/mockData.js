// Mock Asset Data
export const ASSETS = [
  {
    "assetId": "0x90884d8c3a5ce7f76d651c63395429ccd7ea73310751ef56fcb98938343996ec",
    "name": "Municipal Bond 2030",
    "issuer": "Metro City",
    "type": "Corporate Bond",
    "rating": "AA",
    "chain": "Pharos",
    "maturity": "2030-10-10T14:18:44.000Z",
    "duration": 2,
    "rwaToken": "0x05E515224A8f941DF3f3744faaEA6f642b802cA9",
    "aqToken": "0xA64f69Da13Ca5e0101413fb4E0c7a173F2A9270D",
    "pTokenAddress": "0x00F63752d43EfA522EF8089fc931eC279b37902c",
    "cTokenAddress": "0x032D90F0F42EbC05954B2a02410a3e6d8A9bA23a",
    "sTokenAddress": "0x1e17279cB7748B54447b0a23a85efCaB17bc15F9",
    "tvl": 199620,
    "vol24h": 0,
    "pApr": 14.9,
    "cApr": 5.9,
    "sApr": 6.3,
    "sAprRange": [0, 0],
    "lcr": 1.1,
    "nav": 100,
    "discountP": 50,
    "rewards": [],
    "isNew": true,
    "isActive": true,
    "createdAt": "2025-10-10T14:19:49.000Z",
    "updatedAt": "2025-10-15T08:40:00.461Z",
    "daysToMaturity": 1822,
    "riskScore": 3,
    "priceHistoryCount": 731
  }
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

// Create fallback asset data for display purposes
export function createFallbackAsset(assetId) {
  const fallbackAssets = {
    "UST-2026": {
      assetId: "UST-2026",
      name: "US Treasury 2026",
      issuer: "US Treasury",
      type: "Government Bond",
      rating: "AAA",
      chain: "Ethereum",
      maturity: "2026-12-31",
      nav: 100,
      pApr: 4.2,
      cApr: 2.8,
      sAprRange: [1.5, 3.2]
    },
    "CORP-2027-A": {
      assetId: "CORP-2027-A",
      name: "Corporate Bond 2027-A",
      issuer: "TechCorp Inc",
      type: "Corporate Bond",
      rating: "AA",
      chain: "Ethereum",
      maturity: "2027-08-15",
      nav: 98,
      pApr: 5.1,
      cApr: 3.4,
      sAprRange: [2.1, 4.8]
    },
    "CP-180D-2026": {
      assetId: "CP-180D-2026",
      name: "Commercial Paper 180D",
      issuer: "FinanceGroup LLC",
      type: "Commercial Paper",
      rating: "A+",
      chain: "Polygon",
      maturity: "2026-06-20",
      nav: 99,
      pApr: 3.8,
      cApr: 2.2,
      sAprRange: [1.2, 2.9]
    },
    "MUNI-2030": {
      assetId: "MUNI-2030",
      name: "Municipal Bond 2030",
      issuer: "Metro City",
      type: "Municipal Bond",
      rating: "AA-",
      chain: "Arbitrum",
      maturity: "2030-03-10",
      nav: 102,
      pApr: 4.7,
      cApr: 3.1,
      sAprRange: [1.8, 4.2]
    }
  }

  return fallbackAssets[assetId] || {
    assetId: assetId,
    name: `Asset ${assetId}`,
    issuer: "Unknown Issuer",
    type: "Bond",
    rating: "N/A",
    chain: "Ethereum",
    maturity: "2025-12-31",
    nav: 100,
    pApr: 0,
    cApr: 0,
    sAprRange: [0, 0]
  }
}

// Helper functions
export function getAsset(assetId) {
  return ASSETS.find(a => a.assetId === assetId)
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
    let asset = getAsset(holding.assetId)

    // Use fallback asset if not found
    if (!asset) {
      asset = createFallbackAsset(holding.assetId)
    }

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
