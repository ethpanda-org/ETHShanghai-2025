import list from '#shared/data/token2049/eventList.js'

export const token2049Store = defineStore("token2049Store", () => {
  const { x_user, doLogin } = $(supabaseStore())

  let isLoading = $ref(true)
  let eventList = $ref(list)

  async function loadEventData() {
  }

  function handleJoin(event: any) {
  }

  function handleShowInfo(event: any) {
    console.log('show info', event)
    event.isInfoShow = true
  }

  return $$({
    isLoading,
    eventList,
    loadEventData,
    handleJoin,
    handleShowInfo,
  });
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(token2049Store, import.meta.hot));
}
