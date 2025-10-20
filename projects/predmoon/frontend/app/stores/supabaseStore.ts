export const supabaseStore = defineStore("supabaseStore", () => {
  const supabseUser = useSupabaseUser();
  const client = useSupabaseClient();
  let anyUser: any = $ref(null);

  const twitterIdentity = $computed(() => {
  });

  const x_user = $computed(() => ({
    id: supabseUser.value?.id,
    avatar: twitterIdentity?.identity_data?.avatar_url,
    name: twitterIdentity?.identity_data?.full_name,
    user_name: twitterIdentity?.identity_data?.user_name,
    refCount: 0,
  }));

  const hasTwitterLogin = $computed(() => !!twitterIdentity);

  const doLogin = async (
    { pathname, refId, reason, confirmPath } = {
      pathname: "",
      refId: "",
      reason: "",
      confirmPath: "",
    },
  ) => {

  };

  const doLogout = async () => {

  };

  let isAnyUserLoading = $ref(false);
  async function loadAnyUserInfo(userId: string) {

  }

  let marketParticipationHistory: any = $ref(null);
  const loadMarketParticipationHistory = async (userId: string) => {
  };

  return $$({
    supabseUser,
    twitterIdentity,
    x_user,
    hasTwitterLogin,
    doLogin,
    doLogout,
    anyUser,
    loadAnyUserInfo,
    isAnyUserLoading,
    marketParticipationHistory,
    loadMarketParticipationHistory,
  });
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(supabaseStore, import.meta.hot));
}
