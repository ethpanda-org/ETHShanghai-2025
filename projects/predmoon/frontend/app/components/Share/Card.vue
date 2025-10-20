<script setup>
import { useI18n } from 'vue-i18n'
import {
  web_share_url,
  x_share_url,
  telegram_share_url,
  telegram_bot_app_url,
  telegram_bot_group_url,
  replacePlaceholders,
  addHashtags,
  getShareImage
} from '@/utils/inviteUtils'
import {
  captureElementToBlob,
  downloadBlob
} from '@/utils/imagesUtils'
import { _debounce } from "@/utils/debounce";

const emit = defineEmits(['update:show'])
const props = defineProps({
  show: {
    type: Boolean,
    default: () => false,
  },
  topic: {
    type: Object,
    default: () => { },
  },
})

const { t } = useI18n()
const { x_user } = $(supabaseStore())
const { topic } = props
let dialogShow = $ref(props.show)

watch(() => props.show, (v) => {
  dialogShow = v
})

async function onClickDownload() {
  const target = document.getElementById('share-download');
  await downloadBlob(await captureElementToBlob(target, { proxyImage: null }));
}

let shareImageLoading = $ref(false)
const onShareImage = _debounce(async () => {
  try {
    shareImageLoading = true
    const target = document.getElementById('share-download');
    const data = await getShareImage(target, topic.id);
    if (data?.id) {
      const shareText = topic.meta?.x_info?.text;
      if (shareText) {
        let text = replacePlaceholders(shareText, { title: topic.title });
        text = text + addHashtags(topic.meta?.x_info?.hashtags || '');
        const url = x_share_url(text, await web_share_url('', { refId: x_user.id, imgId: data?.id }));
        window.open(url, "_blank");
      }
    }
  } finally {
    shareImageLoading = false
  }
}, 200);

const beforeClose = () => {
  emit('update:show', false)
  return true
}
</script>
<template>
  <van-dialog closeable v-model:show="dialogShow" :title="$t('Create Twitter profile cover')"
    :show-confirm-button="false" @closed="beforeClose">
    <div class="w-full flex flex-col items-center justify-center px-6 py-8">
      <div id="share-download" class="relative w-full rounded-[12px] bg-black overflow-hidden"
        style="aspect-ratio: 1200 / 628;">
        <slot></slot>
      </div>

      <button
        class="w-full bg-[var(--turing-purple-color)] h-11 rounded-[8px] mt-8 flex items-center justify-center space-x-2 cursor-pointer"
        style="box-shadow: 0px 12px 32px -8px rgba(112,0,255,0.5);" @click="onClickDownload">
        <img src="/icons/download.svg" alt="" class="size-6">
        <span class="text-white font-[900]">{{ t('Download Photo') }}</span>
      </button>

      <button
        class="w-full bg-[#070707] opacity-70 h-11 rounded-[8px] mt-4 flex items-center justify-center space-x-2 cursor-pointer"
        @click="onShareImage">
        <img src="/topic/x.svg" alt="" class="size-6">
        <span class="text-white font-[900]">{{ t('Share on X') }}</span>
      </button>
    </div>
  </van-dialog>
</template>
