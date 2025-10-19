import * as userApi from "~/api/userInfo";
import {
  getTopicsOrderPreview,
  getTopicsOrderCreate,
} from "~/api/markets";
import { parseUnits } from "viem";


export const requestQueueStore = defineStore("requestQueueStore", () => {

  const { tradeVolume } = $(tradeStore());
  const { signTradeData, updateWalletBalance } = $(walletStore());
  const { updateUserOrderAmountInfo } = $(userStore());

  let isLoading = $ref(true);
  let cards = $ref([]);
  let queue: any[] = $ref([]);
  let failCards = $ref([]);
  let isProcessing = $ref(false);
  let requestCount = $ref(0);
  let successCount = $ref(0);
  // const failCount = $computed(() => queue.filter((item: any) => item.status === 'fail').length);

  const addRequest = (transaction: any, card: any) => {
    queue.push({ transaction, card, status: 'init', createdAt: Date.now() });
    requestCount++;
    processRequest();
  };

  const processRequest = async () => {
    if (isProcessing || queue.length === 0) {
      return;
    }
    isProcessing = true;
    const payload = queue[0];
    if (!payload) {
      return;
    }
    if (payload.status === 'processing') {
      return;
    }
    payload.status = 'processing';
    // setLoadingToast("Processing transaction");

    await doProcess(payload);

    queue.shift()
    isProcessing = false;
    processRequest();
  };

  async function doProcess(payload: any) {
    const transaction = payload.transaction;
    try {
      const req = {
        marketId: transaction.marketsId || 1012110,
        type: transaction.type, //1-YES；2-NO,
        amount: null,
        volume: tradeVolume,
        priceType: 1, //1-market price ；2-limited price; 3-merged price; 4-split price
        orderType: 1, //1: buy, 2: sell
        price: transaction.textPrice * 100,
        isDeduction: false,
      };
      let result = await getTopicsOrderPreview(req);
      if (result.code === 0) {
        const order = { ...result.data };
        let tradeSign;

        result.data.slippageBps = parseUnits(result.data.slippageBps + "", 4);
        result.data.tokenAmount = parseUnits(result.data.tokenAmount + "", 6);
        result.data.tokenPriceInPaymentToken = parseUnits(
          result.data.tokenPriceInPaymentToken + "",
          6
        );
        tradeSign = '';

        if (tradeSign) {
          const params = {
            salt: order.salt,
            message: JSON.stringify(order),
            signContent: tradeSign,
          };


          let res = await getTopicsOrderCreate(params);
          if (res.code === 0) {
            payload.status = 'success';
            successCount++;

            updateWalletBalance();
            updateUserOrderAmountInfo();
            // showSuccessToast("Transaction Successful");
            // showNotify({ type: 'success', message: `${Object.keys(queueMap).length}` + " Transaction Successful" });
          }
        }
      }
    } catch (error) {
      payload.status = 'fail';
      // cards.unshift({ ...payload.card, retry: true })
      failCards.unshift({ ...payload.card, transaction: payload.transaction, error })
      console.error('error', error);
      showNotify(
        { type: 'danger', message: transaction.marketsTitle + " Transaction Failed" }
      );
    }
  }

  return $$({
    isProcessing,
    isLoading,
    cards,
    addRequest,
    requestCount,
    successCount,
    failCards,
  });
}, {
  persist: {
    omit: [
      'isLoading',
    ],
    debug: true,
  },
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(requestQueueStore, import.meta.hot));
}
