

export const useInitialRedirect = () => {
  const route = useRoute();
  const { startParams } = $(tgStore());

  onMounted(() => {
    const liffState = route.query["liff.state"];
    if (typeof liffState === "string" && liffState.length > 0) {
      navigateTo(liffState);
      return;
    }
    if (startParams?.redirect) {
      navigateTo(startParams.redirect);
    }
  });
}
