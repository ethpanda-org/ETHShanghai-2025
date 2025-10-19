<script setup lang="ts">
const { setModal } = $(uiStore());
</script>
<template>
  <van-button
    icon="home-o"
    size="small"
    color="rgb(0 0 0 / 20%)"
    round
    hairline
    @click="setModal('settings', true)"
  />
</template>
