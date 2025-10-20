
export const useNavigateTo = async (path: string, isBlank = false) => {
  const { setModal } = $(uiStore());
  // how to get locale in composable
  const nuxtApp = useNuxtApp()
  const locale = $(nuxtApp.$i18n.locale)
  let url = locale === "en-US" ? path : `/${locale}${path}`;
  if(path.startsWith('http')) {
    url = path;
  }
  setModal('settings', false);
  if(isBlank) {
    await navigateTo(url, {
      external: true,
      open: {
        target: '_blank',
      }
    });
    return;
  }
  await navigateTo(url);
};
