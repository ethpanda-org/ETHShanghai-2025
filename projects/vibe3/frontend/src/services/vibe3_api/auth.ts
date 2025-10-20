import { isAddress } from 'viem';

// API 基础配置
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_API || "http://localhost:3001";


export function isValidEthAddress(address: string): boolean {
  return isAddress(address);
}

export function generateSignatureMessage(nonce: string, ethAddress: string): string {
  return `Welcome to Vibe3!\n\nClick to sign in and accept the Vibe3 Terms of Service: https://vibe3.com/terms\n\nThis request will not trigger a blockchain transaction or cost any gas fees.\n\nWallet address:\n${ethAddress}\n\nNonce:\n${nonce}`;
}

export interface Profile {
  id: string;
  email?: string;
  avatar?: string;
  bio?: string;
  nickname?: string;
  eth_address?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  data: {
    userId: string;
    email?: string;
    id: string;
    token: string;
    eth_address?: string;
  };
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    email: string;
    avatar?: string;
    bio?: string;
    nickname?: string;
    created_at: string;
    updated_at: string;
    token: string;
  };
}

export interface UserInfoResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    email: string;
    avatar?: string;
    bio?: string;
    nickname?: string;
  };
}

export interface ApiError {
  success: false;
  message: string;
  error?: string;
}

// Ethereum login related types
export interface NonceResponse {
  success: boolean;
  data: {
    nonce: string;
  };
}

export interface EthLoginRequest {
  eth_address: string;
  signature: string;
  nonce: string;
  signature_message: string;
}

export interface EthLoginResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    eth_address: string;
    nickname?: string;
    created_at: string;
    updated_at: string;
    token: string;
  };
}

// custom error class
export class ApiException extends Error {
  constructor(
    public status: number,
    public message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = "ApiException";
  }
}

// Token management
const TOKEN_KEY = "vibe3_auth_token";

export const tokenManager = {
  setToken: (token: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(TOKEN_KEY, token);
    }
  },
  getToken: () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(TOKEN_KEY);
    }
    return null;
  },
  clearToken: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY);
    }
  },
  isAuthenticated: () => {
    if (typeof window !== "undefined") {
      return !!localStorage.getItem(TOKEN_KEY);
    }
    return false;
  },
};

// general request
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const config: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new ApiException(
        response.status,
        data.error || `HTTP ${response.status}`,
        data
      );
    }

    if (data.success === false) {
      throw new ApiException(response.status, data.message, data);
    }

    return data;
  } catch (error) {
    console.error(error);
    if (error instanceof ApiException) {
      throw error;
    }
    throw new ApiException(500, "网络请求失败", error);
  }
}

// authenticated request
export async function authenticatedRequest<T>(
  endpoint: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  return apiRequest<T>(endpoint, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });
}


export async function register(
  email: string,
  password: string
): Promise<RegisterResponse> {
  return apiRequest<RegisterResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function login(
  email: string,
  password: string
): Promise<LoginResponse> {
  const response = await apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  // 登录成功后自动保存token
  if (response.success && response.data.token) {
    tokenManager.setToken(response.data.token);
  }

  return response;
}

/**
 * 获取当前用户信息
 * @returns 用户信息响应
 */
export async function getCurrentUser(): Promise<UserInfoResponse> {
  const token = tokenManager.getToken();
  if (!token) {
    throw new ApiException(401, "Unauthorized");
  }

  return authenticatedRequest<UserInfoResponse>("/auth/me", token);
}

/**
 * 用户登出
 */
export function logout(): void {
  tokenManager.clearToken();
}

/**
 * 检查是否已登录
 * @returns 是否已登录
 */
export function isAuthenticated(): boolean {
  return tokenManager.isAuthenticated();
}

/**
 * 获取nonce用于以太坊签名
 * @returns nonce响应
 */
export async function getNonce(): Promise<NonceResponse> {
  return apiRequest<NonceResponse>("/auth/nonce", {
    method: "GET",
  });
}

// 系统相关API函数

/**
 * 健康检查
 * @returns 健康状态
 */
export async function healthCheck(): Promise<{ status: string }> {
  return apiRequest<{ status: string }>("/health");
}


export const authApi = {
  register,
  login,
  getCurrentUser,
  logout,
  isAuthenticated,
  getNonce,
  signInWithEth,
};

export async function signInWithEth(
  ethAddress: string,
  signature: string,
  nonce: string,
  signatureMessage: string
): Promise<EthLoginResponse> {
  if (!isValidEthAddress(ethAddress)) {
    throw new ApiException(400, "Invalid Ethereum address format");
  }

  const loginData: EthLoginRequest = {
    eth_address: ethAddress,
    signature,
    nonce,
    signature_message: signatureMessage,
  };

  const response = await apiRequest<EthLoginResponse>("/auth/login_with_eth_address", {
    method: "POST",
    body: JSON.stringify(loginData),
  });

  // 登录成功后自动保存token
  if (response.success && response.data.token) {
    tokenManager.setToken(response.data.token);
  }

  return response;
}