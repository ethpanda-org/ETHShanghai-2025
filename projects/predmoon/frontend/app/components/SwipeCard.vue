<script setup lang="ts">
import { getTopicsRecommend, addTopicsWatchlist } from "~/api/markets";
import { convertCurrency, percentage } from "@/utils/processing";
import { _debounce } from "@/utils/debounce";
const debug = useDebug("SwipeCard");

type Card = {
  id: number;
  title: string;
  description: string;
  image: string;
  volume: number;
  markets: Array<any>;
  followed: boolean;
};
type cardsType = Array<Card>;
type QueryParams = {
  cardID: string;
  inviteCode?: string;
};
const { query, path } = $(useRoute());
const { t } = useI18n();

const statusList = ["YES", "NO", "BOOKMARK", "NEXT"];
let start = { X: 0, Y: 0 };
const threshold = { X: 50, Y: 100 }; // Threshold of swiping
let pageSize = 12;
let total = 0;
let queryParams: any = {
  cardID: "",
  inviteCode: "",
};

// The data from store
const { userBalance } = $(walletStore());
let { addRequest, cards, isLoading } = $(requestQueueStore());
const { token } = $(authStore());
const { setModal } = $(uiStore());
const { userOrderAmount } = $(userStore());

const carouselTrack = $ref(null);
let offset = $ref({ X: 0, Y: 0 });
let isSettlement = $ref(false);
let currentDelta = $ref({ X: 0, Y: 0 });
const recommondQueryParams = $ref({
  pageNo: 1,
  pageSize,
  title: null,
  active: null,
  closed: null,
  order: "trending",
  ascending: false,
  page: 1,
  tagId: null,
  followed: false,
});

const { apply } = useMotion(carouselTrack, {
  initial: { x: 0, y: 0, rotate: 0 },
  next: { x: 0, y: 0, transition: { type: "spring" } },
});

let movingYes = $computed(() => isSettlement && offset.X < 0);
let movingNo = $computed(() => isSettlement && offset.X > 0);
let movingNext = $computed(
  () => offset.Y > threshold.Y || offset.Y < -threshold.Y,
);

// get the list of cards
const getInfoList = async (refresh: boolean) => {
  if (refresh) {
    isLoading = false;
    if (recommondQueryParams.pageNo * pageSize >= total) {
      recommondQueryParams.pageNo = 1;
      getInfoList(false);
      return;
    }
    recommondQueryParams.pageNo++;
  } else {
    isLoading = true;
    cards = [];
  }

  const res: any = await getTopicsRecommend(recommondQueryParams);
  total = res.data.total;

  if (res.code === 0) {
    pageSize = res?.data?.list.length;
    cards.push(...res?.data?.list);
    cards = cards.filter(
      (item: any) =>
        item.markets && item.markets.length && item.markets[0].status !== 4,
    );
    // If there is cardID in the url, put this card to the first
    if (queryParams.cardID) {
      const index = cards.findIndex(
        (item: any) => item.id === Number(queryParams.cardID),
      );
      if (index > -1) {
        const card: any = cards.splice(index, 1)[0];
        cards.unshift(card);
      }
    }
  }
  isLoading = false;
};

// Touch start
const touchStart = (e: TouchEvent | any) => {
  const { clientX, clientY } = e.touches[0];
  start.X = clientX;
  start.Y = clientY;
  offset.X = 0;
  offset.Y = 0;
};

// Touch move
const touchMove = (e: TouchEvent | any) => {
  const { clientX, clientY } = e.touches[0];
  offset.X = clientX - start.X;
  offset.Y = clientY - start.Y;
  if (Math.abs(offset.X) > threshold.X) {
    currentDelta.X = offset.X > 0 ? 1 : -1;
    currentDelta.Y = 0;
    isSettlement = true;
  } else if (Math.abs(offset.Y) > threshold.Y) {
    currentDelta.Y = offset.Y > 0 ? 1 : -1;
    currentDelta.X = 0;
  } else {
    currentDelta.X = 0;
    currentDelta.Y = 0;
    isSettlement = false;
  }
  apply({ x: currentDelta.X * threshold.X, y: currentDelta.Y * threshold.Y });
};

// Touch end
const touchEnd = (card: Card) => {
  if (cards.length === 1) {
    getInfoList(true);
  }
  if (offset.X >= threshold.X) {
    goDeposit(card, false); // swipe to left means reject
  } else if (offset.X <= -threshold.X) {
    goDeposit(card, true); // swipe to right means accept
  } else if (offset.Y >= threshold.Y - 50 || offset.Y <= -threshold.Y + 50) {
    swipeCard(statusList[3]); // swipe down means pick next card
  } else {
    resetCard(); // reset the position of card
  }
};

// Card swipe Animation
const swipeCard = (status: any) => {
  // Switch to next card after 0.3 second
  setTimeout(() => {
    resetCard();
    cards.shift();
  }, 0);
};

// reset the position of cards
const resetCard = () => {
  offset.X = 0;
  offset.Y = 0;
  currentDelta.X = 0;
  currentDelta.Y = 0;
  apply({ x: 0, y: 0 });
};

// start transaction
const goDeposit = async (card: Card, isYes: boolean) => {
  if (path.includes("market")) {
    return;
  }
  const transaction = {
    parentId: null,
    textColor: "",
    marketsId: card.markets[0].id,
    marketsTitle: card.title,
    fee: null,
    marketsItem: {},
    textName: "",
    textPrice: 0,
    type: 0, // 1: yes, 2: no
  };

  if (isYes) {
    transaction.textName = card.markets[0].yesName;
    transaction.textPrice = card.markets[0].yesPrice;
    transaction.type = 1;
  } else {
    transaction.textName = card.markets[0].noName;
    transaction.textPrice = card.markets[0].noPrice;
    transaction.type = 2;
  }

  if (token.accessToken === "") {
    setModal("loginModal", true);
    closeToast();
    resetCard();
  } else {
    // balance check
    const userCanUseBalance = userBalance - userOrderAmount;
    debug({
      userBalance,
      textPrice: transaction.textPrice,
      userOrderAmount,
      userCanUseBalance,
    });
    if (userCanUseBalance < transaction.textPrice) {
      showFailToast(t("Insufficient balance"));
      resetCard();
      return false;
    }

    // add request to queue
    addRequest(transaction, card);

    if (transaction.type === 1) {
      swipeCard(statusList[0]);
    } else {
      swipeCard(statusList[1]);
    }
  }
  resetCard();
};

onMounted(() => {
  getInfoList(false);
  queryParams = getFatherInviteCode();
});
</script>

<template>
  <OnboardingGuide />
  <div class="w-full h-[95%] relative z-10!">
    <van-skeleton :loading="isLoading">
      <template #template>
        <div class="w-full h-[80vh] flex flex-col justify-center items-center">
          <div
            class="w-full h-[70vw] flex justify-center items-center bg-[var(--van-active-color)] rounded-[24px]"
          >
            <van-loading size="48" />
          </div>

          <!-- <van-skeleton-image /> -->
          <div :style="{ marginTop: '42px', width: '100%' }">
            <van-skeleton-paragraph row-width="60%" />
            <van-skeleton-paragraph />
            <van-skeleton-paragraph />
            <van-skeleton-paragraph />
          </div>
        </div>
      </template>

      <template v-if="cards.length">
        <article
          v-for="(card, index) in cards as cardsType"
          :key="card.id"
          ref="carouselTrack"
          class="absolute w-full bg-[#323345] text-white rounded-3xl transition-all duration-300 ease-in-out overflow-hidden shadow-md border border-[#323365] flex flex-col"
          @touchstart="touchStart"
          @touchmove="(e) => _debounce(touchMove(e))"
          @touchend="(e) => _debounce(touchEnd(card))"
          :style="{
            'z-index': 30 - index,
            opacity: `${100 - index * 10}%`,
            transform:
              index == 0
                ? `translateX(${currentDelta.X * 100}px) translateY(${currentDelta.Y * 100}px) rotate(${currentDelta.X * 8}deg)`
                : `translateY(${2 * (index + 1)}%) scale(${1 - 0.03 * (index + 1)})`,
          }"
        >
          <van-image
            width="100%"
            height="37%"
            :src="card.image"
            fit="contain"
          >
            <div v-if="index === 0" class="hint-box" id="step6">
              <div
                v-if="movingYes"
                class="hint-box hint font-bold text-white border-white bg-[var(--user-selected-yes-color)]"
              >
                YES
              </div>
              <div
                v-else-if="movingNo"
                class="hint-box hint font-bold text-white border-white bg-[var(--user-selected-no-color)]"
              >
                NO
              </div>
              <div
                v-else-if="movingNext"
                class="hint-box hint font-bold text-white border-white bg-[var(--user-selected-next-color)]"
              >
                NEXT
              </div>
            </div>
          </van-image>

          <section
            v-if="card.markets"
            class="px-5 h-84 border-0 rounded-3xl flex flex-col justify-around pb-4"
          >
            <div>
              <div class="flex justify-between opacity-60">
                <text> ${{ convertCurrency(card.volume) }} Vol.</text>
                <SwipeCardShareIcon :topicInfo="card" />
              </div>
              <SwipeCardProgressBar class="mt-2" :lastTradePrice="percentage(card?.markets[0].lastTradePrice, 'num')" />
              </div>

            <!-- Title and question -->
            <div class="mh-[120px]">
              <p class="text-[18px] font-bold block leading-[1.2]">
                {{ card.title }}
              </p>
              <p
                v-if="card?.markets.length"
                class="mt-2 leading-none! opacity-60"
              >
                {{ card?.markets[0].question }}
              </p>
            </div>

            <div>
              <div class="w-full h-[50px] z-50 mt-5 flex justify-between items-center space-x-3 border-0">
                <div id="step4" class="flex-1 h-full rounded-md bg-gradient-to-b from-[#4A7CFF] to-[#144DE4]"
                  @click="goDeposit(card, true)">
                  <!-- <img class="h-full" src="@/assets/icon/yes.png" alt="" /> -->
                  <span class="flex items-center justify-between px-3 w-full h-full text-white text-lg font-bold">
                    <img class="h-4 mt-1" src="/swipe.svg" alt="" />
                    Yes {{ unitConvert(card.markets[0].yesPrice || 0) }}¢
                  </span>
                  </div>
                  <div id="step5" class="flex-1 h-full rounded-md bg-gradient-to-b from-[#A468EA] to-[#7D22E6]"
                    @click="goDeposit(card, false)">
                    <span class="flex items-center justify-between px-3 w-full h-full text-white text-lg font-bold">
                      No {{ unitConvert(card.markets[0].noPrice || 0) }}¢
                      <img class="rotate-180 h-4 mb-1" src="/swipe.svg" alt="" />
                    </span>
                  </div>
                  </div>

              <div class="border-0 h-10 mt-4 text-center leading-9 text-xs rounded-md bg-[#1E1C238C]/55"
                @click="swipeCard(statusList[3])">
                SKIP
              </div>
            </div>
          </section>
        </article>
      </template>

      <div v-else>
        <van-empty
          description="If you are interested in Puzzle, please go to our official version"
          style="--van-empty-description-color: #323232"
        >
          <template #image>
            <img src="/assets/icon/logo.svg" />
          </template>

          <van-button round type="primary" class="bottom-button"
            >Launch App</van-button
          >
        </van-empty>
      </div>
    </van-skeleton>
  </div>
</template>

<style scoped>
.hint-box {
  @apply absolute top-[2px] bottom-[2px] left-[2px] right-[2px] z-0 rounded-[15px] flex justify-center items-center;
}

.hint {
  @apply text-[36px] border-[3px] border-solid opacity-100 transition-opacity duration-300;
}

.van-image img {
  border-radius: 15px;
}
</style>
