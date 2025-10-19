import Request from "@/utils/request";

// const config = useRuntimeConfig();
// const host = config.public.host;
// use the email to get the verification code
export const sendEmailCode = (params = {}) => {
  return Request({
    url: `/app-api/topic/user/send-email-code`,
    method: "post",
    data: params,
  });
};

// register by email password
export const emailRegistration = (params = {}) => {
  return Request({
    url: `/app-api/topic/user/userReg`,
    method: "post",
    data: params,
  });
};

// login by email password
export const emailLogin = (params = {}) => {
  return Request({
    url: `/app-api/topic/user/mail-login`,
    method: "post",
    data: params,
  });
};

// forgot password
export const emailForgotPassword = (params = {}) => {
  return Request({
    url: `/app-api/topic/user/resetPwd`,
    method: "put",
    data: params,
  });
};

// logout
export const getLogout = async (params = {}) => {
  return Request({
    url: `/app-api/topic/user/logout`,
    method: "post",
    data: params,
  });
};
