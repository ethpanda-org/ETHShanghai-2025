import { defineStore } from "pinia";
import liff from "@line/liff";
import { showFailToast } from "vant";

export interface LiffError {
  code: string;
  message: string;
  cause: unknown;
}
export interface Profile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

export const liffStore = defineStore(
  "liffStore",
  () => {
    const config = useRuntimeConfig();
    const endpointUrl = config.public.kaia?.endpointUrl as string;

    let isInitialized = $ref(false);
    let isLoginIn = $ref<boolean>();
    let profile = $ref<Profile>();
    let granted = $ref<Array<string>>();
    let friendship = $ref<boolean>();

    watchEffect(async () => {

    });

    const ready = async () => {
      return await liff.ready;
    };

    const getOS = () => {
      return liff.getOS();
    };

    const getAppLanguage = () => {
      return liff.getAppLanguage();
    };

    const getLanguage = () => {
      return liff.getLanguage();
    };

    const getVersion = () => {
      return liff.getVersion();
    };

    const login = (path: string) => {
      if (!liff.isLoggedIn()) {
        liff.login({ redirectUri: `${endpointUrl}${path}` });
      }
    };

    const logout = () => {

    };

    const getAccessToken = () => {

    };

    const getIDToken = () => {

    };

    const getDecodedIDToken = () => {

    };

    const getGrantedAllScopes = async () => {

    };

    const query = async (
      permission: "profile" | "chat_message.write" | "openid" | "email"
    ) => {
      return await liff.permission.query(permission);
    };

    const requestAll = async () => {

    };

    const getProfile = async () => {

    };

    const getFriendship = async () => {

    };

    const openWindow = (url: string, external: boolean) => {
      liff.openWindow({ url, external });
    };

    const closeWindow = () => {
      liff.closeWindow();
    };

    // https://developers.line.biz/en/reference/messaging-api/#message-objects
    const sendMessages = async (messages: Array<any>) => {

    };

    // https://developers.line.biz/en/reference/messaging-api/#message-objects
    const shareTargetPicker = async (
      messages: Array<any>,
      isMultiple: boolean
    ) => {

    };

    const scanCodeV2 = async () => {
      return await liff.scanCodeV2();
    };

    const createUrlBy = async (url: string) => {
      return await liff.permanentLink.createUrlBy(url);
    };

    return $$({
      liff,
      endpointUrl,
      isInitialized,
      isLoginIn,
      profile,
      granted,
      friendship,
      ready,
      getOS,
      getAppLanguage,
      getLanguage,
      getVersion,
      login,
      logout,
      getAccessToken,
      getIDToken,
      getDecodedIDToken,
      getGrantedAllScopes,
      query,
      requestAll,
      getProfile,
      getFriendship,
      openWindow,
      closeWindow,
      sendMessages,
      shareTargetPicker,
      scanCodeV2,
      createUrlBy,
    });
  },
  {
    // @ts-ignore
    persist: {
      debug: true,
      omit: ["isInitialized"],
    },
  }
);

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(liffStore, import.meta.hot));
}
