// Contract addresses - will be updated after deployment
// TODO: Update these addresses after deploying to testnet/mainnet

export const contractAddresses = {
  // BSC Testnet addresses - Updated 2025-10-11 (Router v2)
  97: {
    // Core Contracts
    blockETFCore: '0xa63E59DEf7Ab22C17030467E75829C7F90f44d0C',
    priceOracle: '0xcF5d2d59810128fDE6d332827A0b1B01cb50245b',
    etfRouter: '0xa87f31e7c044260d466727607FF3Aed5c8330743',
    rebalancer: '0x797739bA3af7427066CeF9dbBC755e33082bF26E',
    quoterV3: '0x6a12F38238fC16e809F1eaBbe8E893812cC627f7',

    // USDT
    usdt: '0xe4e93c531697aeb44904f9579c3cce1034eb4886',

    // Faucets
    faucets: {
      usdt: '0x2bed84630e430f5bf1295b11a66266eae661aad8',
    },

    // Mock Tokens
    tokens: {
      usdt: '0xe4e93c531697aeb44904f9579c3cce1034eb4886',
      wbnb: '0x998367e7de460b309500e06cfdabb0c94adb18de',
      btcb: '0xd20268cb7065d20307b0793f702febddf5d24856',
      eth: '0xd81e1ac7f2ccdd106701e484f12b842684719bd3',
      ada: '0x8dcd14418995d376e40255dabf55ce58d994bfc4',
      bch: '0xe9636149f4ebda9e1d368385e39e74021d7bf53f',
    },

    // V3 Pools (Asset-USDT pairs)
    v3Pools: {
      wbnb: '0xAA2EeCccc51f1F2716Fc531E19eC83d3094f437c', // 0.01% fee
      btcb: '0x757fb48255e0470035a95a28fb9f3cec20a20e1f', // 0.05% fee
      eth: '0xab30c22eaf3aa69804b2eca3cccf2d1a2ff434bd',  // 0.05% fee
      ada: '0x038df8c35068b9322780f38c61015a6d34e84fed',  // 0.25% fee
      bch: '0xed441cca35f387cece32b9dc4a766e93f56f9f2b',  // 0.25% fee
    },
  },
  // BSC Mainnet addresses (placeholder)
  56: {
    blockETFCore: '0x0000000000000000000000000000000000000000',
    priceOracle: '0x0000000000000000000000000000000000000000',
    etfRouter: '0x0000000000000000000000000000000000000000',
    usdt: '0x55d398326f99059fF775485246999027B3197955', // Real USDT on BSC
    faucets: {
      usdt: '0x0000000000000000000000000000000000000000',
    },
    tokens: {
      usdt: '0x55d398326f99059fF775485246999027B3197955',
    },
  },
} as const;

export type SupportedChainId = keyof typeof contractAddresses;

export function getContractAddress(
  chainId: SupportedChainId,
  contract: keyof (typeof contractAddresses)[SupportedChainId]
): `0x${string}` {
  return contractAddresses[chainId][contract] as `0x${string}`;
}
