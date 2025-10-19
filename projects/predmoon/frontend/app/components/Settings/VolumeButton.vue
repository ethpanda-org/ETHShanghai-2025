<script setup lang="ts">
const { setModal } = $(uiStore());
const { tradeVolume } = $(tradeStore());
</script>
<template>
  <van-button
    size="small"
    class="mr-1! w-8 h-8"
    color="rgb(0 0 0 / 20%)"
    round
    hairline
    @click="setModal('tradeSetting', true)"
    >{{ tradeVolume }}x</van-button
  >
</template>
