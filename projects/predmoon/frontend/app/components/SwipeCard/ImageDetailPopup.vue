<script setup lang="ts">
const { imgSrc } = defineProps({
  imgSrc: {
    type: String,
    default: '',
  }
})

const { showSwipeCardPopup } = $(pmDataStore());

</script>

<template>
  <van-popup v-model:show="showSwipeCardPopup" closeable round>
    <van-image width="100%" height="60%" :src="imgSrc" class="p-2" fit="contain" />
  </van-popup>
</template>
<i18n lang="json">
</i18n>

<style scoped>
</style>
