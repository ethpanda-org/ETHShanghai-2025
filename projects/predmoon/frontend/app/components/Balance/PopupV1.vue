<script setup lang="ts">
import QrcodeVue from "qrcode.vue";

const { modalIsShow } = $(uiStore());
const { wallet } = $(privyStore());
const { userBalance } = $(walletStore());
const { copy, copied, text } = useClipboard();
const currentSite = ref(0);

const depositPlatforms = [
  {
    icon: "/icons/houdini.png",
    name: "Houdini",
    link: "https://houdiniswap.com/?tokenIn=USDTTRON&tokenOut=USDTBSC&amount=1000",
  },
  {
    icon: "/icons/transit.png",
    name: "Transit",
    link: "https://swap.transit.finance/?inputChain=TRX&inputSymbol=USDT&inputCurrency=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t&outputChain=BSC&outputSymbol=USDT&outputCurrency=0x55d398326f99059fF775485246999027B3197955",
  },
  {
    icon: "/icons/symbiosis.png",
    name: "Symbiosis",
    link: "https://app.symbiosis.finance/swap?amountIn=1000&chainIn=Tron&chainOut=BNB&tokenIn=0xa614f803b6fd780986a42c78ec9c7f77e6ded13c&tokenOut=0x55d398326f99059fF775485246999027B3197955",
  },
  {
    icon: "/icons/rubic.png",
    name: "Rubic",
    link: "https://app.rubic.exchange/?fromChain=TRON&toChain=BSC&from=USDT&to=USDT&amount=1000",
  },
  {
    icon: "/icons/rocketx.png",
    name: "Rocketx",
    link: "https://app.rocketx.exchange/swap/TRON.tether/BNB.tether/1000?from=Tether&to=Tether&mode=w",
  },
  {
    icon: "/icons/okx.png",
    name: "Okx",
    link: "https://web3.okx.com/zh-hans/dex-swap/bridge?chain=tron,bsc&token=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t,0x55d398326f99059ff775485246999027b3197955",
  },
];

const CRYPTO_URI = $computed(() => {
  return 'https://meldcrypto.com/?destinationCurrencyCode=USDT_BSC&walletAddress=' + wallet?.address;
})

const openProvider = async (link: string | undefined) => {
  window.open(
    link,
    "Puzzle",
    "width=600,height=800"
  );
};

const closeModal = () => {
  modalIsShow.balanceModal = false;
};
</script>

<template>
  <van-dialog width="80vw" closeable v-model:show="modalIsShow.balanceModal" :title="$t('Transfer Crypto')"
    :showConfirmButton="false" :showCancelButton="false" :z-index="50">
    <div class="text-center text-gray-400 border-b-[1px] border-gray-100 pb-3 mb-3">
      <span>{{ $t("Balance") }}: ${{ userBalance }}</span>
    </div>
    <van-tabs>
      <van-tab :title="$t('Deposit')">
        <div class="text-sm px-4 pb-5 !max-h-[65vh] !overflow-y-scroll">
          <div class="text-[22px] font-bold flex flex-row items-center mt-4">
            <span>{{ $t("Deposit Title") }}</span>
          </div>
          <div class="py-2 opacity-50">{{ $t("Deposit Description") }}</div>
          <div class="flex md:items-center rounded-lg bg-[#3663891A] pl-4 py-2 mb-2">
            <van-icon class="top-[1px]" name="info-o" color="#df2d00" size="16" />
            <span class="text-sm pl-1 text-[#df2d00]">
              {{ $t("Deposit Warning") }}
            </span>
          </div>
          <div class="md:flex justify-between sm:flex-row sm:gap-x-3 bg-[#0000000d] rounded-lg px-4 py-3">
            <div class="w-full">
              <p class="text-sm opacity-60 break-all">
                {{ $t("Embedded Wallet Tips") }}
              </p>
              <p class="py-1 mb-2 sm:mb-0 flex-1 flex flex-row md:items-center">
                <span class="flex-1 font-semibold break-all">{{ wallet?.address }}</span>
                <van-button @click="copy(wallet?.address)" type="primary"
                  class="min-w-16 h-11 text-white !font-semibold bg-[var(--van-button-primary-background)] border-none !ml-4">
                  {{ copied ? "✔" : "Copy" }}
                </van-button>
              </p>
              <div class="w-min rounded-xl mx-auto bg-white p-3">
                <QrcodeVue :value="wallet?.address" :size="120" />
              </div>
              <p class="text-sm opacity-50 pt-4 pb-2">
                {{ $t("Wallet Deposit Tips") }}
              </p>
            </div>
          </div>
          <div class="md:flex justify-between mt-7 md:mt-11 md:space-x-4">
            <div class="md:w-1/3 mb-7 md:mb-0">
              <p class="text-lg font-semibold">{{ $t("Deposit Method 1") }}</p>
              <p class="text-sm opacity-50">
                {{ $t("Deposit Method 1 Instructions") }}
              </p>
            </div>
            <div class="md:w-1/3 mb-4 md:mb-0">
              <p class="text-lg font-semibold">{{ $t("Deposit Method 2") }}</p>
              <p class="text-sm opacity-50">
                {{ $t("Deposit Method 2 Instructions") }}
              </p>
            </div>
            <div
              class="mb-8 bg-[var(--bg-light-gray)] dark:bg-[var(--bg-cyan-dark)] rounded-md flex-1 flex flex-row justify-start items-center">
              <span class="text-xl sm:text-2xl text-[var(--text-primary)] font-bold">VISA</span>
              <img class="w-8 mr-4" src="/icons/pay-icon.png" />
              <van-button size="small" type="primary" @click="openProvider(CRYPTO_URI)">
                {{ $t("Buy USDT") }}
              </van-button>
            </div>
            <div>
              <p class="text-lg font-semibold">{{ $t("Deposit Method 3") }}</p>
              <p class="text-sm opacity-50">
                {{ $t("Deposit Method 3 Instructions") }}
              </p>
              <div class="grid grid-cols-3 lg:grid-cols-6 gap-3 mt-7 md:mt-4 px-4 md:px-0">
                <div class="flex flex-col justify-center py-2.5 cursor-pointer bg-[#00000005] rounded"
                  :class="{ '!bg-[#0000001f]': ind == currentSite }" v-for="(item, ind) in depositPlatforms"
                  @click="currentSite = ind">
                  <div class="h-11 md:h-8 flex justify-center items-center">
                    <img class="w-11 md:w-8" :class="{ '!w-16 md:!w-12': item.name == 'Okx' }" :src="item.icon" />
                  </div>
                  <div class="pt-2 text-sm text-center text-[var(--gent-text)]">
                    {{ item.name }}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <van-button
            class="w-full rounded-lg text-white !font-semibold border-0 bg-[var(--van-button-primary-background)] !mt-7 md:mt-4"
            size="large" @click="openProvider(depositPlatforms[currentSite]?.link)" type="primary">{{ $t("Start Deposit") }}</van-button>
          <div class="text-sm opacity-50 mt-3">
            {{ $t("Deposit Declaration") }}
          </div>
        </div>
      </van-tab>
      <van-tab :title="$t('Withdraw')">
        <BalanceWithdraw @close="closeModal" class="pt-4" />
      </van-tab>
    </van-tabs>
  </van-dialog>
</template>
