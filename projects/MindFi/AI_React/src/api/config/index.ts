// import axios, {type AxiosRequestConfig, type AxiosResponse} from "axios";
import axios from "axios";
import {interceptor} from "@/api/config/interceptor.ts";
// import type {Response} from "@/api/interface/auth.ts";

const BACKEND = import.meta.env.VITE_SERVER as string

const service = axios.create({
    // 设置超时时间（10s）
    baseURL: BACKEND,
    timeout: 6000000,
    // 跨域时候允许携带凭证
    // withCredentials: true
})
interceptor(service)
//
// function requestWrap(baseUrl: string = '') {
//     return (params: AxiosRequestConfig) => service({
//         ...params,
//         url: baseUrl.concat(params.url || '').replace(/\/\//g, '/')
//     }).then((res: AxiosResponse<Response<any>>) => res.data)
// }

// 默认请求实例
export const request = service
export default service;
