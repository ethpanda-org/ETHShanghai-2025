import Request from "../utils/request";

//get nonce
export const getNonce = (params = {}) => {
  return Request({
    url: `/app-api/topic/user/getNonce`,
    method: "post",
    data: params,
  });
};

//wallet login
export const loginByWallet = (params = {}) => {
  return Request({
    url: `/app-api/topic/user/wallet-login`,
    method: "post",
    data: params,
  });
};

//withdraw
export const withdrawRequest = (params = {}) => {
  return Request({
    url: `/app-api/topic/user/withdraw`,
    method: "post",
    data: params,
  });
}

//mint
export const userMint = (params = {}) => {
  return Request({
    url: `/app-api/topic/user/mint`,
    method: "post",
    data: params,
  });
}

