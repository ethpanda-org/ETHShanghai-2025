export const withdrawStore = defineStore("withdrawStore", () => {
  let withdrawData = $ref({});

  return $$({
    withdrawData,
  });
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(withdrawStore, import.meta.hot));
}
