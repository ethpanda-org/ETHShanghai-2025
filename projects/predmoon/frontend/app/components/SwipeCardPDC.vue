<script setup lang="ts">
import _ from "lodash";

let {
  pAmount,
  yesMarkets,
  noMarkets,
  matchedUsers,
  showMatch,
  topic,
  marketId_,
  showSwipeCardPopup,
  loadTopic,
}: any = $(pmDataStore());
const { hasTwitterLogin } = $(supabaseStore());

const route = useRoute();
const markets = $computed(() => topic?.markets || []);

let offset = $ref({ X: 0 });
let isTrading = $ref(false);
let isSettlement = $ref(false);
let currentDelta = $ref(0);
const carouselTrack = $ref(null);
let isSelectedYes: Boolean = $ref(false);
let imgSrc: string = $ref("");

const { apply } = useMotion(carouselTrack, {
  initial: { x: 0, rotate: 0 },
  next: { x: 0, transition: { type: "spring" } },
});

let threshold = { X: 50 };
let movingYes = $computed(() => isSettlement && offset.X < 0);
let movingNo = $computed(() => isSettlement && offset.X > 0);
const userSelectedMarkets = $computed(() => yesMarkets.concat(noMarkets));

let start = { X: 0 };
let currentMarketIndex = 0;
const touchStart = (e: TouchEvent | any) => {
  const { clientX } = e.touches[0];
  start.X = clientX;
  offset.X = 0;
};

const touchMove: any = (e: TouchEvent | any) => {
  const { clientX } = e.touches[0];
  offset.X = clientX - start.X;
  if (Math.abs(offset.X) > threshold.X) {
    currentDelta = offset.X > 0 ? 1 : -1;
    isSettlement = true;
  } else {
    currentDelta = 0;
    isSettlement = false;
  }
  apply({ x: currentDelta * threshold.X });
};

const touchEnd = (card: any) => {
  if (offset.X >= threshold.X) {
    goDeposit(card, false); // swipe to left means reject
  } else if (offset.X <= -threshold.X) {
    goDeposit(card, true); // swipe to right means accept
  } else {
    resetCard(); // reset the position of card
  }
};

const swipeCard = (card: any) => {
  // Switch to next card after 0.3 second
  currentMarketIndex = markets.findIndex((m: any) => m.id === card.id);
  marketId_ = markets[(currentMarketIndex + 1) % markets.length].id;
};

const resetCard = () => {
  currentDelta = 0;
  offset.X = 0;
  apply({ x: 0 });
};

async function requestTrade(marketId: any, isYes: boolean) {
  try {
    const rz: any = await doFetch(
      `/api/usermarkets/${route.params.id}/${marketId}/trade`,
      {
        method: "POST",
        body: JSON.stringify({
          isYes,
        }),
      },
    );
    if (isYes) {
      yesMarkets.push(marketId);
    } else {
      noMarkets.push(marketId);
    }
    if (!!rz?.data.success) {
      pAmount -= 10;
      useConfetti();
      matchedUsers = rz?.data?.users;
      setTimeout(() => {
        showMatch = matchedUsers.length > 0;
      }, 3000);
    }
  } catch (error) {
    throw error;
  }
}

const tradeEnd = async (id: any) => {
  resetCard();
  closeToast();
  await loadTopic(route.params.id);
  // await getUserMarkets();
  marketId_ = id;
  isTrading = false;
};

// start transaction
const goDeposit = async (card: any, isYes: boolean) => {
  if (!hasTwitterLogin) {
    scrollToElement("login-section");
    return;
  }
  if (userSelectedMarkets.includes(card.id)) {
    showToast("You have already selected this market.");
    resetCard();
    return;
  }

  isTrading = true;

  isSelectedYes = isYes;

  // await nextTick();
  if (userSelectedMarkets.includes(card.id)) {
    swipeCard(card);
    return;
  }

  if (pAmount - 10 < 0) {
    showToast(
      "You don't have enough $P, please go to market page to get more.",
    );
    tradeEnd(card.id);
    return;
  }
  try {
    resetCard();
    await requestTrade(card.id, isYes);
  } catch (error) {
    showToast("Update $P amount failed, please try again.");
  } finally {
    tradeEnd(card.id);
  }
};

const getUserMarkets = async () => {
  if (!hasTwitterLogin) return;

  let res: any = await doFetch(`/api/usermarkets/${route.params.id}`, {
    method: "GET",
  });
  console.trace(res.data);
  if (res?.status === 200 && res?.data?.length) {
    yesMarkets = res.data.filter((i) => i.isYes).map((i) => i.marketId) || [];
    noMarkets = res.data.filter((i) => !i.isYes).map((i) => i.marketId) || [];
  }
};

const openImgDetail = (img: string) => {
  imgSrc = img;
  showSwipeCardPopup = true;
};

onMounted(async () => {
  await getUserMarkets();
});
</script>

<template>
  <div
    v-if="topic?.meta?.status === 'started'"
    class="w-full h-full flex flex-col justify-center items-center mt-6"
  >
    <!-- {{ topic.markets }} -->
    <article class="w-full h-[440px] relative z-10!">
      <section v-if="markets.length">
        <div
          v-for="(card, index) in markets"
          :key="card.id"
          ref="carouselTrack"
          class="absolute w-full h-full bg-white rounded-[15px] overflow-hidden transition-all duration-300 ease-in-out shadow-md"
          @touchstart="(e) => touchStart(e)"
          @touchmove="(e) => touchMove(e)"
          @touchend="touchEnd(card)"
          :style="{
            'z-index': card.id === marketId_ ? 100 : 30 - index,
            transform:
              card.id === marketId_
                ? `translateX(${currentDelta * 100}px) rotate(${currentDelta * 8}deg)`
                : `translateX(${0}px) translateY(${1 * index}px)`,
          }"
        >
          <van-image
            width="100%"
            height="60%"
            :src="card.image"
            class="p-2 cursor-pointer"
            fit="cover"
            @click="openImgDetail(card.image)"
          >
            <div v-if="card.id === marketId_" class="hint-box">
              <div
                v-if="movingYes"
                class="hint-box hint font-bold text-white border-white bg-[var(--user-selected-yes-color)]"
              >
                {{ card.meta?.leftButton || "YES" }}
              </div>
              <div
                v-else-if="movingNo"
                class="hint-box hint font-bold text-white border-white bg-[var(--user-selected-no-color)]"
              >
                {{ card.meta?.rightButton || "NO" }}
              </div>
            </div>
          </van-image>

          <div class="overflow-hidden px-4 pb-2 relative">
            <div class="mh-[120px] text-center">
              <div class="items-center flex justify-center">
                <div class="text-gray-900 flex items-center justify-between">
                  {{ card.title }}
                </div>
                <a
                  v-if="card.xUrl"
                  :href="card.xUrl"
                  class="p-2"
                  target="_blank"
                >
                  <van-icon name="/icons/x.svg" />
                </a>
              </div>
            </div>

            <div class="w-full h-16 z-50 mt-2 relative">
              <!--loading on buttons-->
              <div
                v-if="isTrading"
                class="h-full bg-gray-500 opacity-85 rounded-lg flex items-center justify-center"
              >
                BUYING {{ isSelectedYes ? "YES" : "NO" }}...
              </div>

              <template v-else>
                <!--selected status-->
                <div
                  v-if="userSelectedMarkets.includes(card.id)"
                  :class="
                    yesMarkets.includes(card.id)
                      ? 'text-[var(--turing-purple-color)]'
                      : 'text-[#B30FE7]'
                  "
                  class="h-full font-bold left-0 rounded-lg flex items-center justify-center text-xl"
                >
                  YOU SELECTED
                  {{
                    yesMarkets.includes(card.id)
                      ? card.meta?.leftButton || "YES"
                      : card.meta?.rightButton || "NO"
                  }}({{
                    yesMarkets.includes(card.id) ? card.yesNum : card.noNum
                  }})
                </div>

                <div v-else class="flex justify-between items-center h-full">
                  <div
                    class="relative cursor-pointer"
                    @click="goDeposit(card, true)"
                  >
                    <img class="h-[56px]" src="@/assets/icon/yes.png" alt="" />
                    <span
                      class="absolute inset-0 flex items-center justify-center w-full h-full text-white text-xl font-bold"
                    >
                      {{ card.meta?.leftButton || "YES" }}({{ card.yesNum }})
                    </span>
                  </div>
                  <div
                    class="relative cursor-pointer"
                    @click="goDeposit(card, false)"
                  >
                    <img class="h-[56px]" src="@/assets/icon/no.png" alt="" />
                    <span
                      class="absolute inset-0 flex items-center justify-center w-full h-full text-white text-xl font-bold"
                    >
                      {{ card.meta?.rightButton || "NO" }}({{ card.noNum }})
                    </span>
                  </div>
                </div>
              </template>
            </div>
            <div
              v-if="markets.length !== 1"
              class="w-[20%] text-gray-400 text-right float-right underline cursor-pointer"
              @click="swipeCard(card)"
            >
              next>>
            </div>
          </div>
        </div>
      </section>
    </article>
    <SwipeCardMatchPopup :isSelectedYes />
    <SwipeCardImageDetailPopup :imgSrc="imgSrc" />
  </div>
</template>

<style scoped>
.hint-box {
  @apply absolute top-[2px] bottom-[2px] left-[2px] right-[2px] z-0 rounded-[15px] flex justify-center items-center;
}

.hint {
  @apply text-[36px] border-[3px] border-solid opacity-100 transition-opacity duration-300;
}
</style>
