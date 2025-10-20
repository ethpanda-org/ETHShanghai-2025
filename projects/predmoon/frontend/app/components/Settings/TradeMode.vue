<script setup lang="ts">
const { path } = $(useRoute());
console.log('path', path)
let checked = $ref(path.includes("/t"));
async function onChange(value: boolean) {
    if (value){
        await useNavigateTo("/t-1");
    } else {
        window.location.href = "/";
    }
}
</script>
<template>
    <div class="flex items-center justify-center">
       <van-switch v-model="checked" size="20px" @change="onChange">
            <template #node>
                <div class="icon-wrapper flex w-full h-full">
                    <van-icon :name="!checked ? '/icons/usdt-i.svg' : '/puzzle-logo.png'" />
                </div>
            </template>
        </van-switch>
    </div>
</template>