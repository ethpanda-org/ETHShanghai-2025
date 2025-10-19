<script setup lang="ts">
const { isSelectedYes } = $defineProps<{
  isSelectedYes: boolean,
}>()


let { matchedUsers, showMatch }: any = $(pmDataStore());
const { x_user } = $(supabaseStore());

function getRandomElement(array: any) {
  if (!array || array.length === 0) {
    return null;
  }

  const length = array.length;
  const randomIndex = Math.floor(Math.random() * length);
  return array[randomIndex];
}


</script>

<template>
  <van-popup v-model:show="showMatch" closeable class="p-10 rounded-[24px] font-sans text-gray-700 w-[400px]!">
    <div class="w-full h-full flex flex-col justify-center items-center bg-white rounded-[24px] p-6">
      <div class="text-3xl font-bold mb-8 text-center text-[var(--turing-purple-color)]">You have got a prediction
        match!</div>
      <div class="flex justify-center items-center">
        <div class="flex flex-col justify-center items-center slide-left">
          <XAvatar :src="x_user?.avatar" class="size-20 border-6 border-[var(--turing-purple-color)]" isRound />
          <span class="text-sm mt-2 truncate w-[80px] text-center">{{ x_user.name }}</span>
        </div>

        <div class="flex flex-col justify-center items-center slide-right">
          <XAvatar :src="getRandomElement(matchedUsers)?.x_profiles?.avatar"
            class="size-20 border-6 border-[var(--turing-purple-color)]" isRound />
          <span class="text-sm mt-2 truncate w-[80px] text-center">{{ getRandomElement(matchedUsers)?.x_profiles?.fullname
            || 'default'
          }}</span>
        </div>
      </div>
      <NuxtLink to="https://t.me/+IbA4402dDEdiOWJl" target="_blank"
        class="w-full h-12 size-9 flex items-center justify-center border rounded-full bg-[var(--turing-purple-color)] mt-4"
        style="box-shadow: 0px 12px 32px -8px rgba(112,0,255,0.5);">
        <span class="text-white font-[900]">Join group chat</span>
      </NuxtLink>
      <div class="mt-4 text-gray-500">Others who chose the <span class="font-bold">{{ isSelectedYes ? 'Yes' : 'No'
      }}</span>
      </div>
      <div class="flex space-x-2 mt-6 flex-wrap justify-center items-center">
        <xAvatar v-for="(user, index) in matchedUsers" :src="user?.x_profiles?.avatar" class="size-9 mt-1" isRound />
      </div>
    </div>
  </van-popup>
</template>
<i18n lang="json">
</i18n>

<style scoped>
.slide-left {
  /* Apply the animation */
  animation: slidefromleft 1.5s infinite alternate ease-in-out;
}

.slide-right {
  /* Apply the animation */
  animation: slidefromright 1.5s infinite alternate ease-in-out;
}


@keyframes slidefromleft {
  0% {
    transform: translateX(-20px);
    opacity: 1;
  }

  100% {
    transform: translateX(0);
    opacity: 0.6;
  }
}

@keyframes slidefromright {
  0% {
    transform: translateX(20px);
    opacity: 1;
  }

  100% {
    transform: translateX(0);
    opacity: 0.6;
  }
}

.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
