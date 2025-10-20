import Request from "@/utils/request";

export const userHoldInfoList = (params: any) => {
  return Request({
    url: `/app-api/topic/user/userHoldInfoList`,
    method: "post",
    data: params,
  });
};

/**
 * /topic/%E7%94%A8%E6%88%B7%E5%89%8D%E7%AB%AF%20-%20%E7%94%A8%E6%88%B7%E7%9B%B8%E5%85%B3%E4%BF%A1%E6%81%AF/userOrderList
 * @param params
 * @returns
 */
export const userOrderList=(params:any)=>{
  return Request({
    url: `/app-api/topic/user/userOrderList`,
    method: "post",
    data: params,
  });
}

/**
 *
 * @param params {
  "pageNo": 1,
  "pageSize": 10,
  "orderBy": "",
  "orderType": 0,
  "key": "",
  "startDate": 0,
  "endDate": 0
}
 * @returns
 */
export const userTradeInfo=(params:any)=>{
  return Request({
    url: `/app-api/topic/user/userTradeInfo`,
    method: "post",
    data: params,
  });
}
