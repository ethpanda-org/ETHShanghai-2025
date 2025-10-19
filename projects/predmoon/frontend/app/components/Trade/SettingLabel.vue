<script setup lang="ts">
    const { labelWidth, setModal } = $(uiStore())
    const { tradeVolume } = $(tradeStore())
</script>

<template>
    <van-field v-model="tradeVolume" :label-width="labelWidth" input-align="right" is-link readonly
        :label="$t('Trade Volume')" @click="setModal('tradeSetting', true)" />
</template>
