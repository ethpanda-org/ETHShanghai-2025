import { defineStore } from "pinia";
import { fromBase64 } from "@/utils/inviteUtils";

export const tgStore = defineStore(
  "tgStore",
  () => {
    let webApp: any = undefined;
    let isInitialized = $ref<boolean>(false);
    let startParams = $ref<Record<string, string>>();
    const botUsername = useRuntimeConfig().public.tgBotInfo;

    const initialize = () => {

    };

    const initData = () => {
      if (!isInitialized) return;
      return webApp.initData;
    };

    const initDataUnsafe = () => {
      if (!isInitialized) return;
      return webApp.initDataUnsafe;
    };

    const version = () => {
      if (!isInitialized) return;
      return webApp.version;
    };

    const platform = () => {
      if (!isInitialized) return;
      return webApp.platform;
    };

    const colorScheme = () => {
      if (!isInitialized) return;
      return webApp.colorScheme;
    };

    // Determine whether the applet is opened or minimized
    const isActive = () => {
      if (!isInitialized) return;
      return webApp.isActive;
    };

    const isExpanded = () => {
      if (!isInitialized) return;
      return webApp.isExpanded;
    };

    const isFullscreen = () => {
      if (!isInitialized) return;
      return webApp.isFullscreen;
    };

    // https://core.telegram.org/bots/webapps#backbutton
    const getBackButton = () => {

    };

    // https://core.telegram.org/bots/webapps#bottombutton
    const getMainButton = () => {

    };

    // https://core.telegram.org/bots/webapps#settingsbutton
    const getSettingsButton = () => {

    };

    // A method that enables a confirmation dialog while the user is trying to close the Mini App.
    const enableClosingConfirmation = () => {

    };

    // A method that disables the confirmation dialog while the user is trying to close the Mini App.
    const disableClosingConfirmation = () => {

    };

    // https://core.telegram.org/bots/api#message
    const sendData = (data: string) => {

    };

    const switchInlineQuery = (
      query: string,
      chooseChatTypes: ("users" | "bots" | "groups" | "channels")[] = []
    ) => {

    };

    const openLink = (
      url: string,
      options: { try_instant_view?: boolean } = {}
    ) => {
    };

    const openTelegramLink = (url: string) => {

    };

    const shareMessage = (
      msg_id: string,
      callback?: (success: boolean) => void
    ) => {

    };

    // bot api //

    const savePreparedInlineMessage = () => {

    };

    return $$({
      webApp,
      isInitialized,
      botUsername,
      startParams,
      initialize,
      initData,
      initDataUnsafe,
      version,
      platform,
      colorScheme,
      isActive,
      isExpanded,
      isFullscreen,
      getBackButton,
      getMainButton,
      getSettingsButton,
      enableClosingConfirmation,
      disableClosingConfirmation,
      sendData,
      switchInlineQuery,
      openLink,
      openTelegramLink,
      shareMessage,
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
