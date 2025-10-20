export const shareStore = defineStore("shareStore", () => {
  let startParam: any = $ref({});

  return $$({
    startParam,
  });
},
  {
    persist: {
      debug: true,
    },
  });

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(shareStore, import.meta.hot));
}
