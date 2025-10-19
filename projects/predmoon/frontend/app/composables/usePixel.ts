export function usePixelInit() {
  const { $fbq } = useNuxtApp();
  const { public: { metapixel } } = useRuntimeConfig();

  if (typeof $fbq === "function") {
    $fbq("track", "CompleteRegistration");
    const id = metapixel?.default?.id;
    if (id) {
      $fbq("trackSingle", id, "CompleteRegistration");
    }
  }
}
