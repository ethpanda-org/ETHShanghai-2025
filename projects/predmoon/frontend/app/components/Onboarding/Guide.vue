<script lang="ts" setup>
import { VOnboardingWrapper } from 'v-onboarding'
import 'v-onboarding/dist/style.css'

const { t } = useI18n();
const { onboarding } = $(uiStore());

const steps = [
  {
    attachTo: { element: "#step1" },
    content: {
      title: t("Your Balance"),
      description: t("This is your USDT Balance!"),
    },
  },
  {
    attachTo: { element: "#step2" },
    content: {
      title: t("Your Order list"),
      description: t("You could trade for your failed orders again here!"),
    },
  },
  {
    attachTo: { element: "#step3" },
    content: {
      title: t("Set Share volumes"),
      description: t("Set Share volumes"),
    },
  },
  {
    attachTo: { element: "#step4" },
    content: {
      title: t("Swipe left"),
      description: t("Swipe left to buy YES"),
    },
  },
  {
    attachTo: { element: "#step5" },
    content: {
      title: t("Swipe right"),
      description: t("Swipe right to buy NO"),
    },
  },
    {
    attachTo: { element: "#step6" },
    content: {
      title: t("Swipe up"),
      description: t("Swipe up to skip"),
    },
  },
];

</script>

<template>
  <div>
    <VOnboardingWrapper ref="onboarding" :steps="steps" />
  </div>
</template>
