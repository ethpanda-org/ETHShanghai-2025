<template />

<script setup lang="ts">
  import { userConfig } from "~/api/userInfo";

  const loadWalletConfig = async () => {
    try {
      const res = await userConfig();
      if (res.data) {
      }
    } catch (error) {
      console.error("Failed to load contract configuration:", error);
    }
  };

  onMounted(() => {
    loadWalletConfig();
  });
</script>
