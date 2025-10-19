<script setup lang="ts">
import "@vant/touch-emulator";
import { useAppHead } from "~/composables/useAppHead";
import { usePixelInit } from "~/composables/usePixel";
import { useInitialRedirect } from "~/composables/useInitialRedirect";
import { useDebugParam } from "~/composables/useDebugParam";
import { useSyncVantLocale } from "~/composables/useSyncVantLocale";

const { iframeRef } = $(privyStore());

useAppHead();

useDebugParam();

onMounted(() => {
  useSyncVantLocale();
  usePixelInit();
  useInitialRedirect();
});
</script>

<template>
  <div>
    <van-config-provider>
      <NuxtLoadingIndicator />
      <NuxtLayout>
        <NuxtPage />
        <SettingsRightDrawer />
        <LangSwitcherPopup />
        <TradeSettingPopup />
        <OrderSharePopup />
        <AuthLoginModal />
        <BalancePopupV1 />
        <RequestQueueError />
      </NuxtLayout>
    </van-config-provider>
    <iframe ref="iframeRef" />
  </div>
</template>

<style>
:root {
  --nav-height: 110px;
  --nav-height: 70px;
}

.van-floating-bubble {
  overflow: hidden;
  --van-floating-bubble-background: none;
  --van-floating-bubble-icon-size: 40px;
}
.van-floating-bubble__icon {
  border-radius: 999px;
  overflow: hidden;
}
</style>
