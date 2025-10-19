<script setup lang="ts">

let { modalIsShow, pwdInputRef, isPwdFocused }: any = $(uiStore());
let {
  isLoading,
  sendEmail,
  errorInfo,
  email,
} = $(privyStore());
const { t } = useI18n();

let countdown = $ref(0);
let isFocused = $ref(false);
let resendDisabled = $computed(() => countdown > 0);
let step = $ref(1); // 1: email input, 2: code input

const validEmail = $computed(() => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
});

const counterText = $computed(() => {
  return countdown > 0
    ? t("Resend ({countdown}s)", { countdown })
    : t("Resend Code");
});

/**
 * Send email to Privy to get one time password
 */
const getOTP = async () => {
  startCountdown();
  await sendEmail();
  step = 2;
  setTimeout(() => {
    if (pwdInputRef) {
      isPwdFocused = true;
      pwdInputRef.focus();
    }
  }, 300);
};


let countdownInterval: any;
const startCountdown = () => {
  countdown = 60;

  clearInterval(countdownInterval);
  countdownInterval = setInterval(() => {
    countdown--;

    if (countdown <= 0) {
      clearInterval(countdownInterval);
    }
  }, 1000);
};

watch(
  () => [modalIsShow.loginModal],
  async (newVal: boolean) => {
    if (newVal) {
      step = 1;
      errorInfo = "";
      clearInterval(countdownInterval);
      countdown = 0;
    }
  }
);

</script>

<template>
  <van-dialog v-model:show="modalIsShow.loginModal" closeable :show-confirm-button="false">
    <div v-if="step === 1" class="step-one">
      <h2 class="text-center font-bold text-2xl my-8 text-gray-600">{{ $t('Login in or sign up') }}</h2>
      <van-form>
        <van-cell-group inset>
          <div class="flex items-center w-full max-w-sm mx-auto space-x-2 border-2 border-gray-200 rounded-lg"
            :class="isFocused ? 'border border-gray-400!' : ''">
            <div class="px-2 py-1 rounded-lg mx-2" color="#333">
              <van-icon name="envelop-o" />
            </div>

            <input class="w-[80%] bg-transparent outline-none placeholder-gray-400" type="email"
              placeholder="your@email.com" v-model="email" @focus="isFocused = true" @blur="isFocused = false" />
            <div class="email-submit-btn py-2 mx-2 text-gray-400 rounded-full whitespace-nowrap ">
              <van-button plain size="small" @click="getOTP" native-type="submit" :loading="isLoading"
                :disabled="!validEmail || resendDisabled">
                {{ $t("Submit") }}
              </van-button>
            </div>
          </div>
          <div class="mt-10 mb-4 text-center text-sm text-gray-500">
            {{ $t("Powered by Pred.WTF") }}
          </div>
        </van-cell-group>
      </van-form>
    </div>
    <div v-else
      class="px-6 pt-6 pb-4 w-full flex flex-col justify-center items-center gap-4 transition-all duration-200 relative">
      <div class="absolute left-6 top-3 rounded-full bg-gray-100 w-[30px] h-[30px] text-center" @click="step = 1">
        <van-icon name="down" class="transform rotate-90 text-gray-500 left-arrow" />
      </div>
      <div class="flex flex-col items-center gap-2 mt-6">
        <van-icon size="48" name="envelop-o" color="#1652f0" />
        <p class="mt-2 text-lg font-bold">{{ $t("Enter confirmation code") }}</p>
      </div>
      <!--OTP input-->
      <AuthPasswordInput v-model="step" />

      <!--error message-->
      <span v-if="isLoading || errorInfo" :class="`text-sm float-right ${errorInfo ? 'text-red-400' : 'text-gray-500'
        }`">{{ errorInfo ? errorInfo : $t("Sending...") }}</span>

      <div class="mt-5 text-base">
        <p class="text-gray-500">
          {{ $t("Please check yourEmail for an email from privy.io and enter your code below.", { email: email }) }}</p>
      </div>


      <div class="w-full pt-3 pb-1 text-sm flex justify-between text-gray-500">
        <span>{{ $t("Didn't get an email?") }}</span>
        <span class="flex justify-end">
          <button :class="{
            'decoration-gray-500': countdown > 0,
            'decoration-blue-500': countdown <= 0,
          }" @click="getOTP" :disabled="resendDisabled">
            <span class="text-sm" :class="{
              'text-gray-500': countdown > 0,
              'text-blue-500': countdown <= 0,
            }">
              {{ counterText }}</span>
          </button>
        </span>
      </div>
    </div>
  </van-dialog>
</template>

<style scoped>
.email-submit-btn .van-button {
  border: none !important;
}

.left-arrow {
  line-height: 30px;
}
</style>
