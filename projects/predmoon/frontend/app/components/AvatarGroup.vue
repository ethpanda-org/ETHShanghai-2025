<script setup lang="ts">
interface Props {
  list: string[]
}

const {
  list = []
} = defineProps<Props>()

const emit = defineEmits<{
  (e: 'click', index: number): void
  (e: 'more'): void
}>()

const displayList = $computed(() => (list ?? []).slice(0, 5))
const rest = $computed(() => Math.max((list?.length ?? 0) - 5, 0))

const onClickItem = (idx: number) => emit('click', idx)
const onClickMore = () => rest > 0 && emit('more')
</script>

<template>
  <div class="flex items-center">
    <template v-for="(url, idx) in displayList" :key="idx">
      <div
        class="inline-flex"
        :style="{ marginLeft: idx === 0 ? '0px' : '-6px', zIndex: idx + 1 }"
        @click="onClickItem(idx)"
      >
        <XAvatar
          :src="url"
          :isRound="true"
          class="ring-2 ring-white box-border w-5 h-5"
        />
      </div>
    </template>

    <div
      v-if="rest > 5"
      class="inline-flex items-center justify-center w-5 h-5 text-xs rounded-full select-none cursor-pointer ring-2 ring-white box-border bg-gray-200 text-gray-800"
      :style="{
        marginLeft: displayList.length ? '-7px' : '0px',
        zIndex: displayList.length + 2,
      }"
      @click="onClickMore"
      aria-label="more avatars"
    >
      +{{ rest }}
    </div>
  </div>
</template>
