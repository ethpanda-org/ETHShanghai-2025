<script setup lang="ts">
  import { onMounted } from "vue";

  let { modalIsShow, setModal } = $(uiStore());
  let { tradeVolume, updateVolume } = $(tradeStore());
  const columns = [];
  //create an object array that contains text and value and the text is from 1 to 100 and the value is the same as text
  const initColumns = () => {
    for (let i = 5; i <= 100; i++) {
      columns.push({ text: i.toString(), value: i.toString() });
    }
  };
  const setVolume = (val) => {
    updateVolume(Number(val.selectedValues[0]));
    setModal("tradeSetting", false);
  };

  onMounted(() => {
    initColumns();
  });
</script>

<template>
  <van-popup position="bottom" v-model:show="modalIsShow.tradeSetting">
    <div class="text-center px-4 pt-4">
      <van-picker
        :value="tradeVolume"
        :columns="columns"
        :title="$t('Set Volume')"
        :confirm-button-text="$t('Confirm')"
        :cancel-button-text="$t('Cancel')"
        @confirm="setVolume"
        @cancel="setModal('tradeSetting', false)"
      />
    </div>
  </van-popup>
</template>
