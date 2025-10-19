export const uiStore = defineStore("uiStore", () => {
  let modalIsShow = $ref({
    settings: false,
    tradeSetting: false,
    langSwitcher: false,
    authLogout: false,
    share: false,
    showTradePicker: false,
    showRedeemPopup: false,
    loginModal: false,
    balanceModal: false,
    requestQueueErrorModal: false,
    tuitModal: false,
    rewardModal: false,
    sharesModal: false
  });
  let onboarding = $ref(null);
  let labelWidth = $ref("12em");
  let pwdInputRef: (HTMLInputElement | null) = $ref(null);
  let isPwdFocused = $ref(false);

  const setModal = (
    name: keyof typeof modalIsShow,
    isShow: boolean,
    cb?: () => void
  ) => {
    modalIsShow[name] = isShow;
    if (typeof cb === "function") {
      cb();
    }
  };

  const startOnboarding = () => {
    onboarding?.start();
  };

  const setLoadingToast = (message: string) =>
    showLoadingToast({
      message,
      forbidClick: true,
      loadingType: "spinner",
      duration: 0,
      wordBreak: "normal",
    });

  const showMsgDialog = (title: string, message: string) =>
    showDialog({
      title,
      message,
      confirmButtonText: "OK",
    });

  return $$({
    labelWidth,
    modalIsShow,
    onboarding,
    pwdInputRef,
    isPwdFocused,
    setModal,
    setLoadingToast,
    showMsgDialog,
    startOnboarding,
  });
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(uiStore, import.meta.hot));
}
