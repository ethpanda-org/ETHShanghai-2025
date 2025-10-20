<script setup lang="ts">
import { useWindowSize } from '@vueuse/core'
const { height } = useWindowSize()
const offset = $computed(() => {
  return {
    x: 20,
    y: height.value * 4 / 5,
  }
})
const { t } = useI18n()
let show = $ref(false);

const onOffsetChange = (p) => {
  // showToast(`x: ${p.x.toFixed(0)}, y: ${p.y.toFixed(0)}`);
};


const actions = $computed(() => [
  { to: '/', icon: '/puzzle-logo.png', name: t('Puzzle'), subname: t('PEX: Prediction Market with USDT on chain') },
  // { to: `/t-${id}/rank`, icon: '/icons/rank.svg', name: t('Rank Wall'), subname: t('A rank wall shows the top 50 inviters') },
  // { to: `/t-${id}/friends`, icon:'/icons/friends.svg', name: t('Friends'), subname: t('More friends, more rewards') },
  // { to: `/checkin`, icon:'/icons/deposit.svg', name: t('Daily Deposit'), subname: t('Daily deposit rewards') },``
])
const onSelect = (item) => {
  show = false;
  useNavigateTo(item.to)
};

</script>
<template>
  <div>
      <van-floating-bubble axis="xy" teleport="#float-bubble-topic" :offset icon="/puzzle-logo.png" magnetic="x"
        @offset-change="onOffsetChange"
        @click="show = true" />
      <van-action-sheet v-model:show="show" :actions @select="onSelect"  :cancel-text="$t('Cancel')" />
  </div>
</template>
