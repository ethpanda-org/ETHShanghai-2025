export interface UserHoldInfo {
  proxyWallet: string;
  marketId: number;
  topicId: number;
  type: number;
  image: string;
  question: string;
  holdVolume: number;
  holdPrice: number;
  lastPrice: number;
  created: string;
  currentValue: number;
  initialValue: number;
  profit: number;
  profitRate: number;
  typeName: string;
  usableVolume: number;
  status: number;
  outcome: number;
  settleFee: number;
  nftId: number;
}

export interface UserOrderInfo {
  orderId: number;
  marketId: number;
  topicId: number;
  proxyWallet: string;
  type: number;
  typeName: string;
  image: string;
  question: string;
  volume: number;
  price: number;
  deal: number;
  created: string;
  orderType: number;
  expireTime: string;
  expireType: number;
  orderPrice: number;
}

export interface TopicMarketsRespVO {
  id: number;
  topicId: number;
  question: string;
  slug: string;
  image: string;
  description: string;
  startDate: string;
  endDate: string;
  liquidity: number;
  volume: number;
  active: boolean;
  closed: boolean;
  archived: boolean;
  groupItemTitle: string;
  groupItemThreshold: number;
  orderPriceMinTickSize: number;
  orderMinSize: number;
  volumeNum: number;
  lastTradePrice: number;
  createTime: string;
  yesName: string;
  noName: string;
  yesPrice: number;
  noPrice: number;
  marketPriceLimit: number;
  acceptingOrders: boolean;
  negRisk: boolean;
  status: number;
  outcome: number;
  redeemTime: string;
}

export interface SeriesTopicsRespVO {
  id: number;
  slug: string;
  closed: boolean;
  startDate: number;
  endDate: number;
}

export interface TopicsDetailRespVO {
  id: number;
  slug: string;
  description: string;
  title: string;
  startDate: string;
  endDate: string;
  image: string;
  active: number;
  closed: number;
  dynamicOrder: number;
  volume: number;
  competitive: number;
  commentCount: number;
  createTime: string;
  markets: TopicMarketsRespVO[];
  followed: boolean;
  negRisk: number;
  limitRatio: number;
  shareImg: string;
  buyFee: number;
  sellFee: number;
  settleFee: number;
  type: number;
  seriesTopics: SeriesTopicsRespVO[];
}

export interface TopicsPageReqVO {
  pageNo: number;
  pageSize: number;
  page: number | undefined;
  followed: boolean | undefined;
  closed: number | undefined;
  active: number | undefined;
  catalogId: number | undefined;
  tagId: number | undefined;
  title: string | undefined;
  ascending: boolean | undefined;
  order: string | undefined;
  userId: number | undefined;
}

export interface MarketsSimpleRespVO {
  id: number;
  question: string;
  image: string;
  active: boolean;
  closed: boolean;
  groupItemTitle: string;
  volume: number;
  lastTradePrice: number;
  yesName: string;
  noName: string;
  yesPrice: number;
  noPrice: number;
  acceptingOrders: boolean;
  status: number;
  outcome: number;
  startDate: string;
  endDate: string;
}

export interface TopicsSimpleRespVO {
  id: number;
  title: string;
  image: string;
  active: number;
  closed: number;
  dynamicOrder: number;
  volume: number;
  buyFee: number;
  sellFee: number;
  followed: boolean;
  markets: MarketsSimpleRespVO[];
}

export interface SeriesReqVO {
  seriesId: number | undefined;
  cycleId: number | undefined;
  weekId: number | undefined;
}

export interface SportMarketRespVO {
  id: number;
  image: string;
  volume: number;
  groupItemTitle: string;
  groupItemThreshold: number;
  yesName: string;
  noName: string;
  yesPrice: number;
  noPrice: number;
  acceptingOrders: boolean;
  status: number;
  outcome: number;
  redeemTime: string;
}

export interface SportLiveTopicsVO {
  topicId: number;
  title: string;
  startDate: string;
  endDate: string;
  image: string;
  leftTeamId: number;
  leftTeamName: string;
  leftTeamLogo: string;
  leftRecordSuccess: string;
  leftTeamScore: string;
  leftRecordFail: string;
  leftRecordDraw: string;
  rightTeamId: number;
  rightTeamName: string;
  rightTeamScore: string;
  rightTeamLogo: string;
  rightRecordSuccess: string;
  rightRecordFail: string;
  rightRecordDraw: string;
  eventDate: string;
  eventWeek: number;
  cycleId: number;
  gameDate: string;
  gameTime: number;
  seriesId: number;
  seriesName: string;
  limitRatio: number;
  shareImg: string;
  status: number;
  marketPriceLimit: number;
  orderPriceMinTickSize: number;
  orderMinSize: number;
  topicVolume: number;
  followed: boolean;
  buyFee: number;
  settleFee: number;
  markets: SportMarketRespVO[];
}

export interface TopicReqVO {
  topicId: number | undefined;
  marketId: number | undefined;
}

export interface AppLastPricesVO {
  prices: {
    mid: number;
    yes: {
      l: number;
      b: number;
      s: number;
    };
  }[];
}

export interface AppOrderPriceVO {
  price: number;
  volume: number;
}

export interface AppOrderBookRespVO {
  books: {
    mid: number;
    bids: AppOrderPriceVO[];
    asks: AppOrderPriceVO[];
    price: number;
  }[]
}

export interface TopicSummaryRespVO {
  response: string;
  sources: {
    avatar: string;
    link: string;
  }[];
}
