export const pmDataStore = defineStore("pmDataStore", () => {
  let pAmount = $ref(0);
  let pdcCards = $ref([]);
  let yesMarkets = $ref([]);
  let noMarkets = $ref([]);
  let refreshTime = $ref(new Date());
  let topic: any = $ref({});
  let matchedUsers = $ref([]);
  let showMatch = $ref(false);
  let showSwipeCardPopup = $ref(false);
  let marketId_: any = $ref(0);

  const tradeMarket = async (marketId, isYes) => {

  };

  const loadTopic = async (topicId) => {

  };

  return $$({
    pAmount,
    pdcCards,
    yesMarkets,
    noMarkets,
    refreshTime,
    topic,
    matchedUsers,
    showMatch,
    showSwipeCardPopup,
    marketId_,
    tradeMarket,
    loadTopic,
  });
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(pmDataStore, import.meta.hot));
}
