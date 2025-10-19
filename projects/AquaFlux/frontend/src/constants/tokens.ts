// Types
export interface Token {
  chainId: number
  address: string
  name: string
  symbol: string
  decimals: number
  logoURI?: string
}

interface TokenMap {
  [key: string]: Token
}

interface SepoliaTokens {
  ETH: Token
  WETH: Token
  USDC: Token
  DAI: Token
  LINK: Token
  UNI: Token
}

// Sepolia 测试网 token 定义
export const SEPOLIA_CHAIN_ID = 11155111

// Sepolia 测试网上的常用 token 地址
export const SEPOLIA_TOKENS: SepoliaTokens = {
  // ETH (原生代币)
  ETH: {
    chainId: SEPOLIA_CHAIN_ID,
    address: '0x0000000000000000000000000000000000000000', // ETH 使用 0x0 地址
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
    logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png'
  },

  // WETH (Wrapped Ethereum) on Sepolia
  WETH: {
    chainId: SEPOLIA_CHAIN_ID,
    address: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14', // Sepolia WETH
    name: 'Wrapped Ethereum',
    symbol: 'WETH',
    decimals: 18,
    logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png'
  },

  // USDC on Sepolia (测试版本)
  USDC: {
    chainId: SEPOLIA_CHAIN_ID,
    address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Sepolia USDC (示例地址)
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86a33E6417c6Da768DD4c2bca1E4a0A8D8a5a/logo.png'
  },

  // DAI on Sepolia (测试版本)
  DAI: {
    chainId: SEPOLIA_CHAIN_ID,
    address: '0x3e622317f8C93f7328350cF0B56d9eD4C620C5d6', // Sepolia DAI (示例地址)
    name: 'Dai Stablecoin',
    symbol: 'DAI',
    decimals: 18,
    logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6B175474E89094C44Da98b954EedeAC495271d0F/logo.png'
  },

  // LINK on Sepolia
  LINK: {
    chainId: SEPOLIA_CHAIN_ID,
    address: '0x779877A7B0D9E8603169DdbD7836e478b4624789', // Sepolia LINK
    name: 'Chainlink Token',
    symbol: 'LINK',
    decimals: 18,
    logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x514910771AF9Ca656af840dff83E8264EcF986CA/logo.png'
  },

  // UNI on Sepolia (测试版本)
  UNI: {
    chainId: SEPOLIA_CHAIN_ID,
    address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', // 使用主网地址作为示例
    name: 'Uniswap Token',
    symbol: 'UNI',
    decimals: 18,
    logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984/logo.png'
  }
}

// 常用 token 列表（用于快速选择）- 只显示 ETH 和 USDC
export const POPULAR_SEPOLIA_TOKENS: Token[] = [
  SEPOLIA_TOKENS.ETH,
  SEPOLIA_TOKENS.USDC
]

// 所有 token 列表 - 只显示 ETH 和 USDC
export const ALL_SEPOLIA_TOKENS: Token[] = [
  SEPOLIA_TOKENS.ETH,
  SEPOLIA_TOKENS.USDC
]

// Token 查找映射
export const SEPOLIA_TOKEN_MAP: TokenMap = Object.keys(SEPOLIA_TOKENS).reduce((map: TokenMap, key) => {
  const token = SEPOLIA_TOKENS[key as keyof SepoliaTokens]
  map[token.address.toLowerCase()] = token
  map[token.symbol.toLowerCase()] = token
  return map
}, {})

// 根据地址或符号查找 token
export function findSepoliaToken(addressOrSymbol: string): Token | null {
  if (!addressOrSymbol) return null
  return SEPOLIA_TOKEN_MAP[addressOrSymbol.toLowerCase()] || null
}

// 检查是否是有效的 token 地址
export function isValidTokenAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

// 格式化 token 显示
export function formatTokenSymbol(token: Token | null | undefined): string {
  return token?.symbol || 'Unknown'
}

// 格式化 token 金额
export function formatTokenAmount(
  amount: string | number,
  decimals: number = 18,
  displayDecimals: number = 6
): string {
  if (!amount || amount === '0') return '0'

  try {
    // 先尝试转换为数字，如果是小数，直接处理
    const numAmount = parseFloat(String(amount))

    // 如果可以正常转换且不是科学计数法形式的大数，直接处理
    if (!isNaN(numAmount) && isFinite(numAmount) && numAmount < 1e15) {
      if (numAmount === 0) return '0'
      if (numAmount < 0.000001) return '< 0.000001'
      return numAmount.toFixed(displayDecimals)
    }

    // 如果是大整数字符串（原始 wei 格式），且不包含小数点
    if (typeof amount === 'string' && !amount.includes('.') && amount.length > 15) {
      // 使用 BigInt 处理大数
      const bigIntAmount = BigInt(amount)
      const divisor = BigInt(10 ** decimals)

      // 整数部分
      const integerPart = bigIntAmount / divisor
      // 小数部分
      const fractionalPart = bigIntAmount % divisor

      // 转换为数字
      const result = Number(integerPart) + Number(fractionalPart) / Number(divisor)

      if (result === 0) return '0'
      if (result < 0.000001) return '< 0.000001'

      return result.toFixed(displayDecimals)
    }

    // 其他情况，尝试常规数字处理
    if (!isNaN(numAmount)) {
      if (numAmount === 0) return '0'
      if (numAmount < 0.000001) return '< 0.000001'
      return numAmount.toFixed(displayDecimals)
    }

    return '0'
  } catch (error) {
    console.error('Format token amount error:', error, amount)
    return '0'
  }
}

// 获取 token logo URL
export function getTokenLogoUrl(token: Token | null | undefined): string {
  return token?.logoURI || `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${token?.address}/logo.png`
}