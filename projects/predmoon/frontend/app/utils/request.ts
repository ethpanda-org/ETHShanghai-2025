import axios from "axios";
import { authStore } from "@/stores/authStore";

// need to change it to configuration

const baseUrl = import.meta.env.NUXT_PUBLIC_API_PREFIX;
//console.log('__VUE_commitHash', __VUE_commitHash)
//console.log('__VUE_branch', __VUE_branch)
//console.log('__VUE_commitHash', __VUE_commitHash)
const service = axios.create({
  baseURL: baseUrl,
  timeout: 100000,
  // allow carry cookie
  withCredentials: false,
  // modify the request data before sending it to the server
  transformRequest: [
    (data, headers) => {
      headers["Content-Type"] = "application/json";
      const { token } = $(authStore());
      if (token.accessToken) {
        headers["Authorization"] = token.accessToken;
      }
      headers.Language = "";
      return JSON.stringify(data);
    },
  ],
});

service.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

service.interceptors.response.use(
  (response) => {
    const res = response.data;
    if (res.code === 401) {
      //   ElMessage.error(res.msg);
      const { updateToken } = $(authStore());
      //api report 401 means login expired, need to clear personal information and expired token
      updateToken({});
    } else if (res.code !== 0) {
      return Promise.reject(new Error(res.msg || "Error"));
    } else {
      return res;
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default service;
