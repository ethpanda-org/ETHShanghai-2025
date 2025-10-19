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

// Get Asset
export function getAsset(assetId) { 
  return ASSETS.find(a => a.id === assetId) 
}
