import { arbitrumSepolia, sepolia, arbitrum, mainnet, bsc } from 'viem/chains';

const usdtBsc = {
  chainId: bsc.id,
  symbol: 'USDT',
  decimals: 6,
  address: '0x55d398326f99059ff775485246999027b3197955',
}

const usdcArbitrumSepolia = {
  chainId: arbitrumSepolia.id,
  symbol: 'USDC',
  decimals: 6,
  address: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
  paymasterAddress: '0x3BA9A96eE3eFf3A69E2B18886AcF52027EFF8966'
}

const usdtArbitrum = {
  chainId: arbitrum.id,
  symbol: 'USDT',
  decimals: 6,
  address: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
}

const usdcArbitrum = {
  chainId: arbitrum.id,
  symbol: 'USDC',
  decimals: 6,
  address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  paymasterAddress: '0x0578cFB241215b77442a541325d6A4E6dFE700Ec'
}

const usdtMainnet = {
  chainId: mainnet.id,
  symbol: 'USDT',
  decimals: 6,
  address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
}

const usdcMainnet = {
  chainId: mainnet.id,
  symbol: 'USDC',
  decimals: 6,
  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  paymasterAddress: '0x0578cFB241215b77442a541325d6A4E6dFE700Ec'
}

const btcTestNet = {
  id: 'btc_testnet',
  name: 'Bitcoin Testnet',
  nativeCurrency: {
    symbol: 'BTC',
    decimals: 8,
  }
}

const btcMainnet = {
  id: 'btc_mainnet',
  name: 'Bitcoin',
  nativeCurrency: {
    symbol: 'BTC',
    decimals: 8,
  }
}

const prodChains = [arbitrum, mainnet, bsc, btcMainnet];
const testChains = [arbitrumSepolia, sepolia, btcTestNet];
const prodCoins = [usdcArbitrum, usdcMainnet, usdtArbitrum, usdtMainnet, usdtBsc];
const testCoins = [usdcArbitrumSepolia];
// 判断是否为生产环境
const isProduction = process.env.NODE_ENV === 'production';

export const chains = isProduction ? prodChains : [...prodChains, ...testChains]
export const coins = isProduction ? prodCoins : [...prodCoins, ...testCoins]
export const defaultChain = isProduction ? arbitrum : arbitrumSepolia;
export const defaultCoin = isProduction ? usdcArbitrum : usdcArbitrumSepolia;