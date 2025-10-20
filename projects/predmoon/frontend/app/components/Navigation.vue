<script setup lang="ts">

</script>

<template>
  <div class="h-16 flex items-center justify-between px-4">
    <div class="flex justify-center items-center space-x-2">
      <BalanceNavButton id="step1" />
      <RequestQueueButton id="step2" />
      <SettingsTradeMode />
    </div>
    <div class="flex justify-center items-center space-x-2">
      <!-- <KaiaButton /> -->
      <!-- <SettingsXLink /> -->
      <SettingsVolumeButton id="step3" />
      <SettingsButton />
    </div>
  </div>
</template>

<style>
wui-flex>wui-text {
  color: white;
}
</style>
