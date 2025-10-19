import DappPortalSDK from "@linenext/dapp-portal-sdk";
import type { DappPortalSDKClientConfig } from "@linenext/dapp-portal-sdk";
import { defineChain } from "viem";

// Kaia Network configurations
export const KAIA_NETWORKS = {
  mainnet: defineChain({
    id: 8217,
    name: "Kaia Mainnet",
    nativeCurrency: { name: "KAIA", symbol: "KAIA", decimals: 18 },
    rpcUrls: {
      default: {
        http: ["https://public-en.node.kaia.io"],
      },
    },
    blockExplorers: {
      default: {
        name: "KaiaScan",
        url: "https://kaiascan.io",
      },
    },
  }),
  testnet: defineChain({
    id: 1001,
    name: "Kaia Kairos Testnet",
    nativeCurrency: { name: "KAIA", symbol: "KAIA", decimals: 18 },
    rpcUrls: {
      default: {
        http: ["https://public-en-kairos.node.kaia.io"],
      },
    },
    blockExplorers: {
      default: {
        name: "KaiaScan",
        url: "https://kairos.kaiascan.io",
      },
    },
    testnet: true,
  }),
} as const;

// Singleton variables
let lineSDK: DappPortalSDK | null = null;
let isInitializing = false;

export const getSDK = (): DappPortalSDK | null => {
  return lineSDK;
};

export const initializeSDK = async (): Promise<DappPortalSDK | null> => {
  if (lineSDK || isInitializing) return lineSDK;

  isInitializing = true;

  try {
    const config = useRuntimeConfig();
    const clientId = config.public.kaia?.clientId as string;
    const chainId = config.public.kaia?.chainId as string;

    if (!clientId) {
      console.warn("Kaia SDK: clientId not configured");
      return null;
    }

    const sdkConfig: DappPortalSDKClientConfig = {
      clientId,
      chainId: chainId || "1001",
    };
    lineSDK = await DappPortalSDK.init(sdkConfig);
    // debugger

    return lineSDK;
  } catch (error) {
    console.error("Failed to initialize Kaia SDK:", error);
    return null;
  } finally {
    isInitializing = false;
  }
};

export const getInitializedSDK = (): DappPortalSDK | null => {
  return lineSDK;
};

export const isLineEnabled = computed(() => {
  const config = useRuntimeConfig();
  return config.public.kaia?.enabled === true;
});

export const isSupportedBrowser = computed(() => {
  const sdk = getSDK();
  return sdk?.isSupportedBrowser() ?? false;
});

export async function showUnsupportedBrowserGuide(): Promise<void> {
  const sdk = getSDK();
  if (sdk) {
    await sdk.showUnsupportedBrowserGuide();
  }
}

export function getWalletProvider() {
  const sdk = getSDK();
  return sdk?.getWalletProvider();
}

export function getPaymentProvider() {
  const sdk = getSDK();
  return sdk?.getPaymentProvider();
}

export function getCurrentNetwork() {
  const config = useRuntimeConfig();
  const chainId = config.public.kaia?.chainId as string;

  if (chainId === "8217") {
    return KAIA_NETWORKS.mainnet;
  } else {
    return KAIA_NETWORKS.testnet;
  }
}
