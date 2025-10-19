
export const useLinkTo = (path: string) => {
  const nuxtApp = useNuxtApp()
  const locale = $(nuxtApp.$i18n.locale)
  const url = locale === "en-US" ? path : `/${locale}${path}`;
  return url
};
