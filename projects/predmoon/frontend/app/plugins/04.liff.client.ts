import liff from "@line/liff";

export default defineNuxtPlugin(() => {
  if (import.meta.server) {
    return;
  }

  const liffId = useRuntimeConfig().public.kaia?.liffId as string;
  if (!liffId) {
    console.log("Liff SDK: Disabled by configuration");
    return;
  }

  let {
    isInitialized,
    isLoginIn,
    granted,
    profile,
    friendship,
    getGrantedAllScopes,
    requestAll,
    getProfile,
    getFriendship,
  } = $(liffStore());

  liff
    .init({ liffId: liffId })
    .then(async () => {
      isInitialized = true;
      //liff.i18n.setLang(locale.value);
      if (liff.isLoggedIn()) {
        isLoginIn = true;
        granted = await getGrantedAllScopes();
        if (
          !granted?.includes("profile") ||
          !granted?.includes("openid") ||
          !granted?.includes("chat_message.write")
        ) {
          await requestAll();
        }
        profile = await getProfile();
        friendship = await getFriendship();
      }
    })
    .catch((err) => {
      console.error("liff init error", err);
    });

  return {
    provide: {},
  };
});
