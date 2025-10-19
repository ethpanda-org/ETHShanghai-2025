<script lang="ts" setup>
const props = defineProps({
  lastTradePrice: {
    type: Number,
  },
});
const { lastTradePrice } = props;
// const lastTradePrice = 10;
</script>

<template>
  <div class="flex items-center w-full max-w-lg rounded-full bg-[#272632]">
    <div class="relative flex-grow h-4 rounded-full overflow-hidden items-center justify-center">
      <div
        class="absolute inset-y-0 left-0 bg-gradient-to-r from-[#1652F0] to-[#0EC5FD] text-white pl-2 text-xs flex items-center justify-center"
        :style="{ width: lastTradePrice + '%' }"
      >
        <span>{{ lastTradePrice }}%</span>
      </div>
    </div>
  </div>
</template>
