<script setup lang="ts">
const { setModal } = $(uiStore());
const { requestCount, successCount, isProcessing } = $(requestQueueStore());
</script>
<template>
  <van-button
    v-if="requestCount > 0 || true"
    size="small"
    class="mr-1!"
    round
    color="rgb(0 0 0 / 5%)"
    @click="setModal('requestQueueErrorModal', true)"
  >
  <div class="flex">
    <van-loading size="12" v-if="isProcessing"/>
    <span v-else><van-icon name="points" /></span>
    <span class="text-xs ml-1 text-white">
      {{ successCount }}/{{ requestCount }}
    </span>
  </div>
  </van-button>
</template>
