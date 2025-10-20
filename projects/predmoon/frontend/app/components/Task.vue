<script setup lang="ts">
import { onMounted } from "vue";
import { getUserTask, userTaskReceive } from "@/api/userInfo";

type TaskItem = {
  id: number;
  name: string;
  description: string;
  rewardType: string;
  rewardNumber: number;
  skipUrl: string;
  skipTip: string;
  isFinish: boolean;
  image: any;
  finishedCount: number;
  totalCount: number;
  eventTasks: Array<{
    taskEvent: string;
    currentEventValue: number;
    targetEventValue: number;
  }>;
  subTasks: subTaskItem[];
};

type subTaskItem = {
  id: number;
  name: string;
  description: string;
  rewardType: string;
  rewardNumber: number;
  skipUrl: string;
  isReceive: boolean;
  skipTip: string;
  isFinish: boolean;
  finishedCount: number;
  totalCount: number;
  eventTasks: Array<{
    taskEvent: string;
    currentEventValue: any;
    targetEventValue: number;
  }>;

};

const { modalIsShow } = $(uiStore());
const router = useRouter();
const voData = $ref({
  taskList: [] as TaskItem[],
  chooseTask: null as TaskItem | null,
  openDrawer: false,
});
console.log(router, 'router');

const receiveTask = async (sub: any) => {
  const res = await userTaskReceive({ id: sub.id });
  if (res.code == 0) getTasks();
};

const getTasks = async () => {
  try {
    let res = await getUserTask();
    if (res.code == 0) {
      voData.taskList = res.data;
    }
  } finally {
    // Handle any cleanup or final actions here if needed
  }
};
let active = $ref(0)
onMounted(() => {
  getTasks();
});

const theTaskImg = (img: any) => {
  return img === 'TaskImage' ? '/puzzle-logo.png' : img
}
</script>

<template>
  <div class="p-4">
    <van-tabs v-model:active="active">
      <van-tab v-for="task in voData.taskList" :title="task.name" :key="task.id" class="rounded-xl">
        <div v-for="sub in task.subTasks" :key="sub.id" class="task container mt-2">
          <van-card :desc="sub.description" :title="sub.name" :thumb="theTaskImg(task.image)">
            <template #title>
              <h1 class="text-lg font-bold"> {{ task.name }}</h1>
            </template>

            <template #desc>
              <div class="text-sm"><span class="text-black">Task:</span> {{ sub.description }}</div>
            </template>

            <template #tags>
              <span class="text-green-500">{{ $t("Award") }}: {{ sub.rewardNumber }}
                {{ sub.rewardType }}</span>
            </template>

            <template #price>
              <span class="text-black">
                {{ $t('Obtained: ') }}{{ sub.rewardNumber * sub.finishedCount +
                  ' ' + sub.rewardType }}
              </span>
            </template>

            <template #num>
              <div v-if="sub.isReceive">
                <van-button disabled type="primary" size="mini" plain>
                  Completed
                </van-button>
              </div>
              <div v-else>
                <van-button v-if="sub.isFinish" type="primary" size="mini" plain @click="receiveTask(sub)">
                  {{ $t("Get Rewards") }}
                </van-button>
                <van-button v-else-if="sub.eventTasks[0]?.currentEventValue > 0" size="mini" type="primary" plain
                  @click="router.push(sub.skipUrl)">
                  {{ $t("In Progress") }}
                </van-button>
                <van-button v-else-if="sub.eventTasks[0]?.taskEvent == 'INVITE'" size="mini" type="primary" plain
                  @click="modalIsShow.share = true">
                  {{ $t("Go To Invite") }}
                </van-button>
                <van-button v-else-if="sub.eventTasks[0]?.taskEvent == 'TRADE'" size="mini" type="primary" plain>
                  {{ $t("Go To Trade") }}
                </van-button>
                <van-button v-else type="primary" size="mini" plain @click="router.push(sub.skipUrl)">
                  {{ sub.skipTip }}
                </van-button>
              </div>

            </template>
          </van-card>
        </div>
      </van-tab>
    </van-tabs>
  </div>
</template>

<style scoped>
.van-tag--primary.van-tag--plain {
  color: #00c58d;
}
</style>
