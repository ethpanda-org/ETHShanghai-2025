<script setup lang="ts">
  let errorInfo = $ref("");
  const { t } = useI18n();

  const props = defineProps({
    modelValue: {
      type: [String, Number],
      required: true,
    },
    name: {
      type: [String],
      required: true,
    },
    label: {
      type: [String],
      required: false,
      default: "",
    },
    placeholder: {
      type: [String],
      required: false,
      default: "",
    },
    maxlength: {
      type: [Number],
      required: false,
      default: 10,
    },
  });

  let modelValue = $(defineModel());

  const onInput = (event) => {
    const value = event.target.value;
    modelValue = value;
    if (event.target.value === "") {
      errorInfo = "";
      return;
    }
    switch (props.name) {
      case "depositToAddress":
      case "depositFromAddress":
        if (!/^0x[a-fA-F0-9]{0,40}$/.test(value)) {
          errorInfo = t("Please enter a valid address");
        } else {
          errorInfo = "";
        }
        break;
      case "tokenAmount":
        if (!/^\d*\.?\d{0,18}$/.test(value)) {
          errorInfo = t("Please enter a valid amount");
        } else if (Number(value) < 10) {
          errorInfo = t("Please enter an amount more than 10");
        } else {
          errorInfo = "";
        }
        break;
      default:
        errorInfo = "";
    }
  };
</script>

<template>
  <div class="flex flex-col gap-1 w-full">
    <label class="font-bold" :for="name">{{ label }}</label>
    <div class="relative w-full">
      <input :key="name" :maxlength="maxlength" :class="`w-full border-1 border-solid border-gray-300 h-[38px] px-2 rounded-lg ${errorInfo ? 'focus:border-red' : 'focus:border-black'
        }`" type="text" :name="name" :placeholder="placeholder" :value="modelValue" @input="onInput" />
      <slot name="input-right" />
    </div>
    <slot name="input-tips" />
    <div v-if="errorInfo" class="errorInfo text-red-500">{{ errorInfo }}</div>
  </div>
</template>
