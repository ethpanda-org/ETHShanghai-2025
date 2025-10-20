import { mainnet, sepolia, polygon, polygonAmoy, bsc, avalanche, avalancheFuji  } from '@reown/appkit/networks'
import { type AppKitNetwork } from '@reown/appkit/networks'
import type { CaipNetwork } from '@reown/appkit'

export const getNetworks = (isTestnet: boolean) => {
    if (isTestnet) {
      return [
            avalancheFuji,
            sepolia,
            polygonAmoy
        ]
    } else {
      return [
            bsc,
            avalanche,
            mainnet,
            polygon
        ]
    }
}

export const getUsdcAddress = (network: AppKitNetwork | CaipNetwork) => {
  switch (network.name) {
    case avalanche.name:
      return "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E";
    case mainnet.name:
      return "0xA0b86991c6218b36c1d19d4a2e9Eb0cE3606eB48";
    case polygon.name:
      return "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359";
    case avalancheFuji.name:
      return "0x5425890298aed601595a70AB815c96711a31Bc65";
    case sepolia.name:
      return "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
    case polygonAmoy.name:
      return "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582";
    default:
      return "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
  }
}

export const getDomain = (network: AppKitNetwork) => {
  switch (network.name) {
    case avalanche.name:
    case avalancheFuji.name:
      return 1;
    case mainnet.name:
    case sepolia.name:
      return 0;
    case polygon.name:
    case polygonAmoy.name:
      return 7;
    default:
      return 1;
  }
}

export const getTokenMessager = (network: AppKitNetwork) => {
  if (network.testnet === true) {
    return "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA";
  } else {
    return "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d";
  }
}

export const getMessageTransmitter = (network: AppKitNetwork) => {
  if (network.testnet === true) {
    return "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275";
  } else {
    return "0x81D40F21F12A8F0E3252Bccb954D722d4c464B64";
  }
}
