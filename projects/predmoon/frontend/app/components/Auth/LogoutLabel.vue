<script setup lang="ts">
  const { logOut } = $(authStore());
  const { setModal } = $(uiStore());

  const onClick = async () => {
    await logOut();
    setModal('settings', false);
    // window.location.reload();
  };
</script>

<template>
  <van-field input-align="right" readonly :label="$t('Logout')" @click="onClick" />
</template>
