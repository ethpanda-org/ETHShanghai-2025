<script lang="ts" setup>
import { _debounce } from "@/utils/debounce";

let { pwdInputRef, isPwdFocused } = $(uiStore());
let { oneTimePassword, doLogin, errorInfo } = $(privyStore());
const debug = useDebug('PasswordInput')

let inputArr = $computed(() => {
  if (!oneTimePassword) return []
  debug({ oneTimePassword })
  return oneTimePassword.toString().split("");
});

const onFocus = () => {
  isPwdFocused = true;
};

const onBlur = () => {
  isPwdFocused = false;
};

const onInput = async (event: any) => {
  if (!isPwdFocused) {
    return;
  }
  oneTimePassword = event.target.value.replace(/\D/g, '');
};

const isNumeric = (str) => {
  return /^\d+$/.test(str);
};

watch($$(oneTimePassword), async (newVal) => {
  if (!isNumeric(newVal)) return;
  if (newVal.length !== 6) return
  debug({ oneTimePassword, action: 'watch' })
  await doLogin()
  isPwdFocused = true;
  oneTimePassword = "";
})

</script>

<template>
  <div class="w-full relative flex justify-between mt-3">
    <span v-for="(n, index) in 6" :key="n"
      class="w-[40px] h-[50px] border-1 border-solid border-gray-400 rounded-xl flex justify-center items-center rounded"
      :class="`${isPwdFocused && inputArr.length === index && 'border-black!'}`">
      {{ inputArr[index] }}
      <span v-if="isPwdFocused && inputArr.length === index"
        class="cursor inline-block w-[1px] h-[1.2em] bg-black ml-1" />
    </span>

    <input id="password-input" ref="pwdInputRef" type="text" v-model="oneTimePassword"
      class="absolute top-0 left-0 w-full h-full" :class="[isPwdFocused ? 'focus' : 'not-focus', 'hidden-input']"
      maxlength="6" @input="(e) => _debounce(onInput(e), 100)" @focus.prevent="onFocus" @blur.prevent="onBlur" />
  </div>
</template>
<style>
.hidden-input {
  opacity: 0.1;
  color: transparent;
  caret-color: transparent;
}

.cursor {
  animation: blink 1.2s steps(1) infinite;
}

@keyframes blink {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0;
  }
}

.step-one .van-field__control,
.step-one .van-field__error-message {
  margin-left: 10px !important;
}
</style>
