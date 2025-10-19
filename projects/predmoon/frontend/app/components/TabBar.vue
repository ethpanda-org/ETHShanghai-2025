<template>
  <van-tabbar v-model="active" safe-area-inset-bottom>
    <van-tabbar-item v-for="item in tabList" :key="item.name" @click="useNavigateTo(item.path)" :icon="item.icon"
      :name="item.key">
      {{ $t(item.name) }}</van-tabbar-item>
  </van-tabbar>
</template>

<script setup lang="ts">
const tabList = $ref([
  { key: 'index', name: "Markets", icon: "chart-trending-o", path: "/" },
  { key: 'earn', name: "Earn", icon: "balance-o", path: "/earn" },
  { key: 'invite', name: "Invite", icon: "hot-o", path: "/invite" },
  { key: 'my', name: "My", icon: "user-o", path: "/my" },
]);
const { locale } = $(useI18n());
const { path } = $(useRoute());

const getLastPath = (path: string) => {
  const paths = path.split("/");
  return paths[paths.length - 1];
};

let active = $ref(tabList[0]?.key || 'index');

onMounted(() => {
  active = tabList.find((item) => getLastPath(path) === getLastPath(item.path))?.key || tabList[0]?.key || 'index';
})

</script>
