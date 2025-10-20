/**
 * API Client - Axios 封装
 * 处理所有后端 API 请求，包括 JWT 认证和错误处理
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { API_BASE_URL, TOKEN_KEYS } from '../config/api'

// 创建 Axios 实例
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器：自动添加 JWT Token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(TOKEN_KEYS.ACCESS_TOKEN)
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器：处理 Token 过期和错误
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // 统一处理响应格式
    return response
  },
  async (error) => {
    const originalRequest = error.config

    // 处理 401 错误（Token 过期）
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      const refreshToken = localStorage.getItem(TOKEN_KEYS.REFRESH_TOKEN)
      if (refreshToken) {
        try {
          // 尝试刷新 Token
          const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          })

          // 保存新的 Access Token
          localStorage.setItem(TOKEN_KEYS.ACCESS_TOKEN, data.access_token)

          // 重试原请求
          originalRequest.headers.Authorization = `Bearer ${data.access_token}`
          return apiClient(originalRequest)
        } catch (refreshError) {
          // 刷新失败，清除所有 Token 并跳转登录
          localStorage.removeItem(TOKEN_KEYS.ACCESS_TOKEN)
          localStorage.removeItem(TOKEN_KEYS.REFRESH_TOKEN)
          localStorage.removeItem(TOKEN_KEYS.USER_ID)
          
          // 可以在这里触发全局事件或跳转登录页
          window.dispatchEvent(new CustomEvent('auth:logout'))
          return Promise.reject(refreshError)
        }
      } else {
        // 没有 Refresh Token，直接跳转登录
        window.dispatchEvent(new CustomEvent('auth:logout'))
      }
    }

    // 处理其他错误
    return Promise.reject(error)
  }
)

/**
 * 统一的 API 响应格式
 */
export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
}

/**
 * 通用 GET 请求
 */
export const get = async <T = any>(
  url: string,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> => {
  const response = await apiClient.get<ApiResponse<T>>(url, config)
  return response.data
}

/**
 * 通用 POST 请求
 */
export const post = async <T = any>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> => {
  const response = await apiClient.post<ApiResponse<T>>(url, data, config)
  return response.data
}

/**
 * 通用 PUT 请求
 */
export const put = async <T = any>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> => {
  const response = await apiClient.put<ApiResponse<T>>(url, data, config)
  return response.data
}

/**
 * 通用 DELETE 请求
 */
export const del = async <T = any>(
  url: string,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> => {
  const response = await apiClient.delete<ApiResponse<T>>(url, config)
  return response.data
}

/**
 * 导出 apiClient 实例（用于特殊情况）
 */
export default apiClient

