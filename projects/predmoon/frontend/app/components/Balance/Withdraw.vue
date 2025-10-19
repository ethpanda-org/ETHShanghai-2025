<script setup lang="ts">
import { withdrawRequest } from "@/api/wallet";
import { getWithdrawSign } from "@/api/transaction";
import { shortenHash } from "@/utils/processing";
import { parseUnits } from "viem";

const { t } = useI18n();
const { wallet, publicClient } = $(privyStore());
const { signWithdraw, walletConfig, userBalance } = $(walletStore());
const { withdrawData } = $(withdrawStore());

let depositHash = $ref("");
let completionHash = ref("");
let seconds = $ref(30);
let timer = null;
const activeNames = $ref(["1"]);
let currentStep = $ref(1);
let status = $ref("processing");

const startCountdown = () => {
  timer = setInterval(() => {
    if (seconds > 0) {
      seconds--;
    } else {
      clearInterval(timer);
    }
  }, 1000);
};

const waitTransaction = async (hash: string) => {
  try {
    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
    });
    if (receipt && receipt.status === "success") {
      return receipt.transactionHash;
    } else {
      throw new Error("Transaction failed");
    }
  } catch (error) {
    throw error;
  }
};

const newWithdrawal = () => {
  currentStep = 1;
  resetForm();
};

const waitTx = async () => {
  try {
    const hash = await waitTransaction(depositHash);
    if (hash) {
      completionHash = hash;
    }
  } catch (e) {
    console.error("waitTx ", e);
  } finally {
    resetTimer();
  }
};

const withdraw = async (form) => {
  try {
    status = "processing";
    startCountdown();
    const { toAddress, tokenAmount } = withdrawData;
    currentStep = 2;
    // get a new nonce here
    const res = await getWithdrawSign({
      amount: tokenAmount,
      to: toAddress,
    });
    if (res.code !== 0) return;

    res.data.amount = parseUnits(res.data.amount.toString(), 6);
    const signData = await signWithdraw(res.data);
    if (!signData) return;

    const rs = await withdrawRequest({
      nonce: res.data.nonce,
      userSign: signData,
    });
    if (rs.code != 0) return;
    await waitTx();
    depositHash = rs.data;
    status = "success";
  } catch (error) {
    status = "failed";
    resetTimer();
  }
};
const resetTimer = () => {
  clearInterval(timer);
  seconds = 30;
};

const resetForm = () => {
  withdrawData.toAddress = "";
  withdrawData.tokenAmount = 0;
};
</script>

<template>
  <div>
    <div v-if="currentStep === 1" class="step-one w-full pb-3">
      <van-form @submit="withdraw">
        <van-field name="toAddress">
          <template #input>
            <BalanceForm
              v-model="withdrawData.toAddress"
              :maxlength="42"
              :label="$t('Recipient address')"
              name="toAddress"
              placeholder="0x..."
            />
          </template>
        </van-field>
        <van-field name="tokenAmount">
          <template #input>
            <BalanceForm
              v-model="withdrawData.tokenAmount"
              :label="$t('Amount')"
              name="tokenAmount"
              placeholder="10.00"
            >
              <template #input-right>
                <div
                  class="absolute right-1 top-1/2 transform -translate-y-1/2 flex items-center space-x-2"
                >
                  <span class="text-gray-500 font-medium">USDT</span>
                  <button
                    class="px-3 bg-blue-50 text-blue-600 text-xs font-semibold rounded-md hover:bg-blue-100 transition-colors border border-blue-200"
                    type="button"
                    @click="withdrawData.tokenAmount = userBalance"
                  >
                    {{ $t("MAX") }}
                  </button>
                </div>
              </template>
              <template #input-tips>
                <div class="flex justify-between space-x-2">
                  <span></span>
                  <!-- <span class="text-gray-400 font-medium text-xs">${{ tokenAmount }}</span> -->
                  <span class="text-gray-400 text-xs ml-2"
                    >{{ $t("Balance") }}:{{ userBalance }}
                  </span>
                </div>
              </template>
            </BalanceForm>
          </template>
        </van-field>
        <van-cell>
          <van-button
            :disabled="withdrawData.tokenAmount < 10 || !withdrawData.toAddress"
            class="rounded-lg"
            block
            type="primary"
            native-type="submit"
          >
            {{ $t("Withdraw") }}
          </van-button>
        </van-cell>
      </van-form>
    </div>
    <div v-if="currentStep === 2" class="step-two w-full">
      <div>
        <div
          v-if="status === 'processing'"
          class="flex justify-center items-center flex-col mt-5"
        >
          <van-circle
            :current-rate="seconds"
            size="40px"
            :rate="60"
            :speed="100"
            layer-color="#f3f3f3"
            :text="seconds + 's'"
          />
          <div class="text-center my-5">
            <p class="text-sm">{{ $t("Submitting transaction") }}...</p>
            <p class="text-center text-gray-500 text-xs">
              {{ $t("Filling your transaction on the blockchain") }}
            </p>
          </div>
        </div>
        <div
          v-else-if="status === 'success'"
          class="min-h-[100px] flex justify-center items-center text-green-500"
        >
          <van-icon name="passed" size="70" />
        </div>
        <div
          v-else
          class="min-h-[100px] flex justify-center items-center text-red-500"
        >
          <van-icon name="close" size="50" />
        </div>

        <van-cell :title="$t('Fill status')" :value="status" />
        <van-cell
          :title="$t('You receive')"
          :value="withdrawData.tokenAmount"
        />
        <van-collapse v-model="activeNames">
          <van-collapse-item name="1">
            <template #title>
              <div class="text-xs leading-6 text-gray-400">
                {{ $t("More Details") }}
              </div>
            </template>
            <div class="flex justify-between text-xs text-gray-400">
              <span class="leading-6">{{ $t("Deposit tx") }}</span>
              <span>{{ shortenHash(depositHash, 20) || "0x...." }}</span>
            </div>
            <!-- <div class="flex justify-between text-xs text-gray-400">
              <span>{{ $t("Order submitted") }}</span>
              <span>{{ $t("time") }}</span>
            </div> -->
          </van-collapse-item>
        </van-collapse>
        <van-notice-bar color="#a7a7a7" background="#f9f9f9" left-icon="info-o">
          <span class="font-xs">{{ $t("Experiencing problems") }}?</span>
          <a>{{ $t("Get help") }}</a>
        </van-notice-bar>
      </div>
      <van-cell>
        <div class="flex mt-2 gap-2">
          <van-button
            block
            type="primary"
            plain
            native-type="submit"
            @click="currentStep = 1"
          >
            {{ $t("Back") }}
          </van-button>
          <van-button
            block
            type="primary"
            native-type="submit"
            @click="newWithdrawal"
          >
            {{ $t("New Withdrawal") }}
          </van-button>
        </div>
      </van-cell>
    </div>
  </div>
</template>

<style>
</style>
