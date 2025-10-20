<script setup lang="ts">
const { labelWidth, setModal } = $(uiStore());
let { hasSetLocale } = $(userStore());
const { locale, locales } = useI18n();
const localeName = $computed(
  () => locales.value.find((item) => item.code === locale.value)?.language
);

const setLocale = (code: string) => {
  hasSetLocale = true;
  setModal("langSwitcher", true);
};
</script>

<template>
  <van-field
    input-align="right"
    v-model="localeName"
    :label-width="labelWidth"
    is-link
    readonly
    :label="$t('Language')"
    @click="setLocale"
  />
</template>
