export const tplStore = defineStore("tplStore", () => {
  let withdrawData = $ref({});

  return $$({
    withdrawData,
  });
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(tplStore, import.meta.hot));
}
