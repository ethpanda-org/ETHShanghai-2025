import { initializeSDK, isLineEnabled, getSDK, getCurrentNetwork } from "~/config/kaia";

export default defineNuxtPlugin(() => {
  if (import.meta.server) {
    return;
  }

  if (!isLineEnabled.value) {
    console.log("Kaia SDK: Disabled by configuration");
    return;
  }

  initializeSDK()
    .then((sdk) => {
      if (!sdk) {
        console.error("Kaia SDK: Failed to initialize");
        return;
      }

      if (!sdk.isSupportedBrowser()) {
        console.warn("Kaia SDK: Browser not supported");
        return;
      }

      console.log("Kaia SDK: Plugin loaded successfully");
    })
    .catch((error) => {
      console.error("Kaia SDK Plugin Error:", error);
    });

  return {
    provide: {
      lineSDK: () => getSDK(),
      lineWalletProvider: () => getSDK()?.getWalletProvider(),
      linePaymentProvider: () => getSDK()?.getPaymentProvider(),
      lineCurrentNetwork: () => getCurrentNetwork(),
      isLineEnabled: isLineEnabled
    },
  };
});
