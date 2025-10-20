import {AxiosError, type AxiosInstance, type AxiosResponse, type InternalAxiosRequestConfig} from "axios";
import {message} from 'antd'
import {STORAGE} from "@/const";
export interface DataRes {
    ok: Boolean,
    msg: string
}
export function interceptor(axios: AxiosInstance) {
    axios.interceptors.request.use(
        (config: InternalAxiosRequestConfig) => {
            try {
                const v = localStorage.getItem(STORAGE.AUTH_KEY)
                const {token} = v ? JSON.parse(v) : {}
                config.headers.set('Authorization', `Bearer ${token}`);
            } catch (err) {
                console.error(err);
            }
            return config;
        },
        (error: AxiosError) => {
            return Promise.reject(error);
        })
    axios.interceptors.response.use(
        (response: AxiosResponse) => {
            const {data} = response
            const {ok, message: msg} = data
            if (ok) {
                return response.data;
            } else {
                message.error(msg);
                return Promise.reject(msg);
            }
        },
        async (error: AxiosError) => {
            const res: AxiosResponse<any> | undefined = error.response;

            if (res?.data) {
                // 假设后端返回格式是 { ok: boolean, msg: string }
                const { ok, msg } = res.data as { ok?: boolean; msg?: string };
                if (!ok) {
                    message.error(msg);
                }
            } else {
                message.error(error.message || "请求失败");
            }
            return Promise.reject(error.message);
        })
}