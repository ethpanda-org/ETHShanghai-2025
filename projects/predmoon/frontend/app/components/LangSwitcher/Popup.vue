<script setup lang="ts">
  import { Locale } from 'vant'

  const { setModal, modalIsShow } = $(uiStore())
  const { locale, locales, setLocale } = useI18n()
  const columns = $computed(() => {
    const rz = locales.value.map(item => {
      return {
        text: item.language,
        value: item.code,
      }
    })
    return rz
  })
  let currentLocale = $computed({
    get() {
      return [locale.value]
    },
    set(code) {
      setLocale(code)
      Locale.use(code)
    }
  })
  const onConfirm = ({ selectedValues }) => {
    setModal('langSwitcher', false);
    currentLocale = selectedValues[0];
  };
</script>

<template>
  <van-popup v-model:show="modalIsShow.langSwitcher" destroy-on-close round position="bottom">
    <van-picker :model-value="currentLocale" :columns="columns" @cancel="setModal('langSwitcher', false)"
      @confirm="onConfirm" />
  </van-popup>
</template>
