import { createWalletClient, publicActions, custom } from "viem";

import { getNetworks } from "~/config/networks";

export const privyStore = defineStore(
  "privyStore",
  () => {
    const debug = useDebug("privyStore");
    const { $privy, $PrivySDK }: any = useNuxtApp();
    const { token } = $(authStore());
    const networks = getNetworks(
      useRuntimeConfig().public.isTestnet as boolean
    );
    const { setLoadingToast } = $(uiStore());
    const { t } = $(useI18n());

    let email = $ref("");
    let hasSend = $ref(false);
    let oneTimePassword = $ref("");
    let isLoading = $ref(false);
    let session: any = $ref(null);
    const isNewUser = $computed(() => {
      return session?.user?.is_new_user;
    });
    let errorInfo: any = $ref("");
    let walletClient: any = $ref(null);
    let cleanupIframe: () => void = () => {};
    let iframeRef: HTMLIFrameElement | null = $ref(null);

    const userId = $computed(() => session?.user?.id || false);
    let wallet = $ref<any>(null);
    const userEmail = $computed(() => {

    });

    const doLogin = async () => {

    };

    const sendEmail = async () => {

    };

    const logoutPrivy = async () => {

    };

    // above wait for clear
    let isInitWallet = false;
    const initWallet = async () => {

    };

    const msgPoster = {

    };

    const setupEmbeddedWalletIframe = async () => {

    };

    const initWalletClient = async () => {

    };

    watchEffect(async () => {

    });

    watch(
      () => userId,
      async (newVal) => {
        if (!newVal) return;
        if (token.accessToken) return;
        await initWallet();
      }
    );

    return $$({
      iframeRef,
      email,
      hasSend,
      oneTimePassword,
      isLoading,
      session,
      userId,
      wallet,
      userEmail,
      walletClient,
      errorInfo,
      isNewUser,
      doLogin,
      initWallet,
      setupEmbeddedWalletIframe,
      cleanupIframe,
      logoutPrivy,
      sendEmail,
    });
  },
  {
    // @ts-ignore
    persist: {
      omit: [
        "isLoading",
        "userId",
        "oneTimePassword",
        "hasSend",
        "errorInfo",
        "initWallet",
      ],
      debug: true,
    },
  }
);

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(privyStore, import.meta.hot));
}
