<script setup lang="ts">
const { setModal } = $(uiStore());
const { token } = $(authStore());
const { userInfo } = $(userStore());
const { userBalance } = $(walletStore());
const { isEnable, requestAccount } = $(lineStore());

const avatar = computed(() => {
  return '/puzzle-logo.png'
  // return userInfo?.avatar || '/puzzle-logo.png'
})
</script>

<template>
  <div>
    <button v-if="token?.accessToken" class="px-3 py-1 bg-gray-500/20 rounded-xl transition-colors"
      @click="setModal('balanceModal', true)">
      <div class="flex items-center">
        <img class="w-5 h-5 rounded-full mr-2" :src="avatar" alt="" />
        <span class="text-white/80">${{ Math.floor(userBalance * 100) / 100 }}</span>
      </div>
    </button>
    <div v-else>
      <van-button v-if="isEnable" size="small" round type="primary" class="px-3 text-white/80 right mr-2!"
        @click="requestAccount">{{
          $t("Login") }} with kaia</van-button>
      <van-button v-else size="small" round type="primary" class="px-3 text-white/80 right mr-2!"
        @click="setModal('loginModal', true)">{{ $t("Login") }}</van-button>
    </div>
  </div>
</template>

<style></style>
