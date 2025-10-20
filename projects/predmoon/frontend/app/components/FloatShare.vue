<script setup lang="ts">
import { useWindowSize } from '@vueuse/core'

const route = useRoute()
const { t } = useI18n()
let show = $ref(false);
const { topic } = $(pmDataStore())
const { x_user, hasTwitterLogin, doLogin } = $(supabaseStore())
let { width, height } = useWindowSize()
const offset = $computed(() => {
  return {
    x: width.value - 60,
    y: height.value - 60,
  }
})

const actions = computed(() => {
  if (hasTwitterLogin) {
    return [
      { icon: '/icons/rank.svg', name: t('Back to Topic'), subname: t('Back to topic home page'), callback: () => useNavigateTo(`/t-${route.params.id}`) },
      { icon: '/icons/download.svg', name: t('Download Photo'), subname: t('Download rank wall to a picture'), callback: onClickDownload },
      { icon: '/icons/x.svg', name: t('Share on X'), subname: t('Share rank wall link to inivite friends'), callback: onClickShareX }
    ]
  }
  return [
    { icon: '/icons/rank.svg', name: t('Back to Topic'), subname: t('Back to topic home page'), callback: () => useNavigateTo(`/t-${route.params.id}`) },
    { icon: '/icons/x.svg', name: t('Auth with X'), subname: t('Auth you X account to login'), callback: handleLogin },
  ]
})

const onSelect = (item: any) => {
  show = false;
};

async function onClickDownload() {
  const target = document.getElementById('share-download');
  await captureTargetToPng('shareImageName', target);
}

function onClickShareX() {
  // console.log('topic', topic)
  handleRetweet({
    hashtags: topic.meta?.x_info?.hashtags,
    retweetTargetUrl: topic.meta?.x_info?.retweetTargetLink,
    text: topic.meta?.x_info?.shareRankText,
    refId: x_user.id,
    title: topic.title,
  })
}

async function handleLogin() {
  const query = new URLSearchParams(location.search)
  const refId = query.get('refId')
  await doLogin({ pathname: location.pathname, refId, reason: `topic-${route.params.id}` })
}

</script>
<template>
  <div>
    <van-floating-bubble :offset teleport="#float-bubble-rank" axis="xy" icon="share" magnetic="x" @click="show = true" />
    <van-action-sheet v-model:show="show" :actions @select="onSelect" :cancel-text="$t('Cancel')" />
  </div>
</template>
