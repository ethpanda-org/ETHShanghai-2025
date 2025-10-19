
<script setup lang="ts">
import { onMounted } from "vue";
import { getUserProfile, getUserPortfolio } from "@/api/userInfo";
import {
  amountSeparate,
} from "@/utils/processing";

const { wallet } = $(walletStore());
const { userInfo } = $(userStore());

let voData = $ref({
  portfolio: 0,
  userInfo: {},
  pageNo: 1,
  pageSize: 10,
  holdList: [],
  holdTotal: 0,
  activityList: [],
  activityTotal: 0,
  showShare: false,
  shareId: "",
});

const positionValueFiexed = $computed(() => {
  if (voData.userInfo && voData.userInfo.positionValue) {
    return `$${voData.userInfo.positionValue.toFixed(2)}`;
  } else {
    return 0;
  }
});

const positionValue = $computed(() => {
  if (voData.userInfo && voData.userInfo.positionValue) {
    return `$${voData.userInfo.positionValue}`;
  } else {
    return 0;
  }
});

const profit = $computed(() => {
  if (voData.userInfo && voData.userInfo.profit) {
    return `$${amountSeparate(voData.userInfo.profit)}`;
  } else {
    return 0;
  }
});

const volumnTrade = $computed(() => {
  if (voData.userInfo && voData.userInfo.volumnTrade) {
    return `$${amountSeparate(voData.userInfo.volumnTrade)}`;
  } else {
    return 0;
  }
});

const tradeMarkets = $computed(() => {
  if (voData.userInfo && voData.userInfo.tradeMarkets) {
    return voData.userInfo.tradeMarkets;
  } else {
    return 0;
  }
});

const getUserInfo = async () => {
  try {
    let res = await getUserProfile({
      proxyWallet: wallet.address,
    });
    if (res.code === 0) {
      voData.userInfo = res.data;
      userInfo.profile = res.data;
    }
  } catch (e) {}
};

const getPortfolio = async () => {
  try {
    let res = await getUserPortfolio();
    if (res.code === 0) {
      voData.portfolio = res.data.portfolio;
    }
  } catch (e) {}
};

onMounted(() => {
  getUserInfo();
  getPortfolio();
});
</script>

<template>
  <div class="w-full">
    <div class="w-full h-full flex flex-col">
      <div
        class="user-container text-center mx-auto flex justify-center items-center pt-4"
      >
        <img
          v-if="voData.userInfo.avatar"
          class="w-12 h-12 mx-auto rounded-full"
          :src="voData.userInfo.avatar"
        />
        <img
          v-else
          class="w-12 h-12 mx-auto rounded-full"
          src="~/assets/img/logo_primary.png"
        />
        <div class="flex-1 h-6 flex flex-col pl-2">
          <p class="text-xl font-bold">
            {{ voData.userInfo.nickname }}
          </p>
        </div>
      </div>
      <div class="potifolio-container p-4">
        <ul class="my-2 grid grid-cols-2 gap-4">
          <li class="p-2 bg-sky-100 rounded-lg flex justify-center">
            <div class="text-center">
              <p class="my-1 text-xs text-[#727272]">
                {{ $t("Position Value") }}
              </p>
              <p class="text-xl font-bold">
                {{ voData.portfolio }}
              </p>
            </div>
          </li>

          <li class="p-2 bg-sky-100 rounded-lg flex flex-col justify-center">
            <div class="text-center">
              <p class="my-1 text-xs text-[#727272]">
                {{ $t("Profit") }}
              </p>
              <p class="text-xl font-bold">
                {{ profit }}
              </p>
            </div>
          </li>
          <li class="p-2 bg-sky-100 rounded-lg flex flex-col justify-center">
            <div class="text-center">
              <p class="my-1 text-xs text-[#727272]">
                {{ $t("Traded Volume") }}
              </p>
              <p class="text-xl font-bold">
                {{ volumnTrade }}
              </p>
            </div>
          </li>
          <li class="p-2 bg-sky-100 rounded-lg flex flex-col justify-center">
            <div class="text-center">
              <p class="my-1 text-xs text-[#727272]">
                {{ $t("Markets Traded") }}
              </p>
              <p class="text-xl font-bold">
                {{ tradeMarkets }}
              </p>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style>
.van-swipe-cell__right button {
  height: 100% !important;
}
</style>
