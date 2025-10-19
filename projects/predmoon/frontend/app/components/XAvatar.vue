<script setup lang="ts">
defineProps({
  src: {
    type: String,
    default: '',
  },
  isRound: {
    type: Boolean,
    default: false,
  }
})
</script>
<template>
  <van-image :src="xAvatar(src)" :round="isRound" v-bind="$attrs">
    <template v-slot:loading>
      <van-loading type="spinner" size="20" />
    </template>
  </van-image>
</template>
