/**
 * 用户服务
 * 处理用户信息、钱包连接、身份验证等
 */

import { get, post, put, del } from './apiClient'
import { API_ENDPOINTS } from '../config/api'
import type {
  UserProfile,
  UserBindings,
  ConnectWalletRequest,
  SetPrimaryWalletRequest,
  VerifyWorldcoinRequest,
  BindSocialRequest,
} from '../types/api'

class UserService {
  /**
   * 获取用户资料
   */
  async getProfile(): Promise<UserProfile> {
    const response = await get<UserProfile>(API_ENDPOINTS.USER.PROFILE)
    return response.data
  }

  /**
   * 更新用户资料
   */
  async updateProfile(data: Partial<UserProfile>): Promise<UserProfile> {
    const response = await put<UserProfile>(API_ENDPOINTS.USER.UPDATE_PROFILE, data)
    return response.data
  }

  /**
   * 获取用户绑定信息
   */
  async getBindings(): Promise<UserBindings> {
    const response = await get<UserBindings>(API_ENDPOINTS.USER.BINDINGS)
    return response.data
  }

  /**
   * 连接钱包
   */
  async connectWallet(
    address: string,
    chainType: 'ethereum' | 'polygon' | 'bsc' | 'solana',
    signature?: string,
    message?: string
  ): Promise<void> {
    const request: ConnectWalletRequest = {
      address,
      chain_type: chainType,
      signature,
      message,
    }
    await post(API_ENDPOINTS.USER.WALLET_CONNECT, request)
  }

  /**
   * 设置主钱包
   */
  async setPrimaryWallet(address: string): Promise<void> {
    const request: SetPrimaryWalletRequest = { address }
    await put(API_ENDPOINTS.USER.WALLET_PRIMARY, request)
  }

  /**
   * 移除钱包
   */
  async removeWallet(address: string): Promise<void> {
    await del(`${API_ENDPOINTS.USER.WALLET_REMOVE}?address=${address}`)
  }

  /**
   * 验证 World ID
   */
  async verifyWorldcoin(
    proof: string,
    merkleRoot: string,
    nullifierHash: string
  ): Promise<void> {
    const request: VerifyWorldcoinRequest = {
      proof,
      merkle_root: merkleRoot,
      nullifier_hash: nullifierHash,
    }
    await post(API_ENDPOINTS.USER.VERIFY_WORLDCOIN, request)
  }

  /**
   * 绑定社交账号
   */
  async bindSocial(
    provider: 'github' | 'twitter' | 'facebook' | 'wechat',
    code: string,
    redirectUri: string
  ): Promise<void> {
    const request: BindSocialRequest = {
      provider,
      code,
      redirect_uri: redirectUri,
    }
    await post(API_ENDPOINTS.USER.BIND_SOCIAL, request)
  }
}

export default new UserService()

