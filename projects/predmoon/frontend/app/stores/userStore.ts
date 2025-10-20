import * as userApi from "~/api/userInfo";
import { getOrderAmount } from "~/api/markets";
import type { UserInfo } from "@/types"

export const userStore = defineStore(
  "userStore",
  () => {
    const { token } = $(authStore());
    const { userBalance } = $(walletStore());

    let userInfo = $ref<UserInfo>();
    let userOrderAmountInfo = $ref({ feeAmount: 0, totalAmount: 0 });
    const userOrderAmount = $computed(
      () => userOrderAmountInfo.feeAmount + userOrderAmountInfo.totalAmount
    );
    const userCanUseAmount = $computed(() => {
      return userBalance ?? 0 - userOrderAmount;
    });

    let hasSetLocale = $ref(false);
    let order = $ref({
      positionList: [] as any[],
      openOrderList: [] as any[],
      historyList: [] as any[],
    });

    //refresh user info after login
    const loadUserInfo = async () => {
      if (!token.accessToken) {
        return;
      }

      try {
        let user = await userApi.getUserInfo();
        if (user.data) {
          userInfo = user.data;
        }
      } catch (error) {
        console.error("get user info error:", error);
      }
    };

    async function updateUserOrderAmountInfo() {
      try {
        const rz = await getOrderAmount();
        if (rz.data) {
          userOrderAmountInfo = rz.data;
        }
      } catch (error) {
        console.error("get user order amount error:", error);
      }
    }

    return $$({
      userInfo,
      userBalance,
      order,
      hasSetLocale,
      loadUserInfo,
      updateUserOrderAmountInfo,
      userOrderAmountInfo,
      userOrderAmount,
      userCanUseAmount,
    });
  },
  {
    // @ts-ignore
    persist: {
      debug: true,
      omit: ["order"],
    },
  }
);

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(userStore, import.meta.hot));
}
