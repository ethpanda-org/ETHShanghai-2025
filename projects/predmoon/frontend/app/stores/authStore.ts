import { getUserProfile } from "@/api/userInfo";
import { getLogout } from "~/api/login";
import * as walletApi from "~/api/wallet";
import { getAddress } from "viem";
import { createSiweMessage } from "viem/siwe";
import type { SiweMessage } from "@/types";

export const authStore = defineStore(
  "authStore",
  () => {
    const debug = useDebug("authStore");
    const { t } = $(useI18n());
    const { setModal, startOnboarding, setLoadingToast } = $(uiStore());
    const { startParam } = $(shareStore());
    const { amountPermit } = $(walletStore());
    let { loadUserInfo, userInfo } = $(userStore());

    const { address, walletClient, updateWalletBalance } = $(walletStore());
    const { disconnect } = $(lineStore());
    const { logoutPrivy, isNewUser } = $(privyStore());
    let { errorInfo } = $(privyStore());

    let token: any = $ref({
      accessToken: "",
      expiresTime: "",
      openid: "",
      refreshToken: "",
      userId: "",
    });

    // refresh local cache token
    const updateToken = (tokenInfo: any) => {

    };

    const deleteAllCookies = () => {

    };

    // refresh user login status after login successfully
    const afterLoginSuccess = async (data: any) => {

    };

    // disconnect wallet and log out
    const logOut = async () => {

    };

    /**
     * Sign in, after the user connects the wallet, call the backend service to get the message
     * Then request the signature, get the signature string, and call the backend interface to verify the signature
     */
    const signLoginMessage = async (nonce: string) => {

    };

    const getNonce = async (_address: any) => {

    };

    //start login process
    const requestWalletLogin = async (data: {
      message: SiweMessage;
      signature: string;
    }) => {

    };

    const doSign = useDebounceFn(async () => {

    }, 100);

    watchEffect(async () => {

    });

    return $$({
      token,
      doSign,
      logOut,
      updateToken,
      afterLoginSuccess,
    });
  },
  {
    // @ts-ignore
    persist: {
      debug: true,
    },
  }
);

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(authStore, import.meta.hot));
}
