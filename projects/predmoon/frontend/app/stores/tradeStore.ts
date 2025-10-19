export const tradeStore = defineStore("tradeStore", () => {
  let tradeVolume = $ref(5)
  let holdResult = $ref<any>(null)
  let isUpdatePosition = $ref(false)

  const updateVolume = (volume: number) => {
    tradeVolume = volume
  }

  return $$({
    tradeVolume,
    updateVolume,
    holdResult,
    isUpdatePosition,
  });
}, {
  persist: true,
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(tradeStore, import.meta.hot));
}
