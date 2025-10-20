/**
 * 认证服务
 * 处理用户登录、注册、Token 刷新等
 */

import { post } from './apiClient'
import { API_ENDPOINTS, TOKEN_KEYS } from '../config/api'
import type {
  LoginRequest,
  LoginResponse,
  SendCodeRequest,
  RefreshTokenRequest,
  RefreshTokenResponse,
} from '../types/api'

class AuthService {
  /**
   * 发送验证码
   */
  async sendCode(contact: string): Promise<void> {
    const request: SendCodeRequest = { contact }
    await post(API_ENDPOINTS.AUTH.SEND_CODE, request)
  }

  /**
   * 登录
   */
  async login(contact: string, code: string): Promise<LoginResponse> {
    const request: LoginRequest = { contact, code }
    const response = await post<LoginResponse>(API_ENDPOINTS.AUTH.LOGIN, request)
    
    // 保存 Token 到 localStorage
    if (response.data) {
      this.saveTokens(response.data)
    }
    
    return response.data
  }

  /**
   * 刷新 Token
   */
  async refreshToken(): Promise<string> {
    const refreshToken = localStorage.getItem(TOKEN_KEYS.REFRESH_TOKEN)
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    const request: RefreshTokenRequest = { refresh_token: refreshToken }
    const response = await post<RefreshTokenResponse>(
      API_ENDPOINTS.AUTH.REFRESH,
      request
    )

    // 更新 Access Token
    if (response.data.access_token) {
      localStorage.setItem(TOKEN_KEYS.ACCESS_TOKEN, response.data.access_token)
    }

    return response.data.access_token
  }

  /**
   * 登出
   */
  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem(TOKEN_KEYS.REFRESH_TOKEN)
    if (refreshToken) {
      try {
        await post(API_ENDPOINTS.AUTH.LOGOUT, { refresh_token: refreshToken })
      } catch (error) {
        console.error('Logout error:', error)
      }
    }
    
    this.clearTokens()
  }

  /**
   * 保存 Token
   */
  private saveTokens(data: LoginResponse): void {
    localStorage.setItem(TOKEN_KEYS.ACCESS_TOKEN, data.access_token)
    localStorage.setItem(TOKEN_KEYS.REFRESH_TOKEN, data.refresh_token)
    localStorage.setItem(TOKEN_KEYS.USER_ID, data.user_id)
    localStorage.setItem(TOKEN_KEYS.EXPIRES_IN, data.expires_in.toString())
  }

  /**
   * 清除 Token
   */
  clearTokens(): void {
    localStorage.removeItem(TOKEN_KEYS.ACCESS_TOKEN)
    localStorage.removeItem(TOKEN_KEYS.REFRESH_TOKEN)
    localStorage.removeItem(TOKEN_KEYS.USER_ID)
    localStorage.removeItem(TOKEN_KEYS.EXPIRES_IN)
  }

  /**
   * 检查是否已登录
   */
  isAuthenticated(): boolean {
    return !!localStorage.getItem(TOKEN_KEYS.ACCESS_TOKEN)
  }

  /**
   * 获取当前用户 ID
   */
  getCurrentUserId(): string | null {
    return localStorage.getItem(TOKEN_KEYS.USER_ID)
  }
}

export default new AuthService()

