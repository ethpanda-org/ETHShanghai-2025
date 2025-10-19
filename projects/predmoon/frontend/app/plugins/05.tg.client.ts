export default defineNuxtPlugin(() => {
  if (import.meta.server) {
    return;
  }
  const webApp = window?.Telegram?.WebApp;
  if (!webApp) {
    console.log("Telegram SDK: Disabled by environment");
    return;
  }

  let { initialize } = $(tgStore());
  initialize();

  return {
    provide: {},
  };
});
