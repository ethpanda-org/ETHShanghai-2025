// Types
export interface ApiConfig {
  baseUrl: string
  timeout: number
  headers: Record<string, string>
}

export interface RequestOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>
  timeout?: number
}

export interface ApiResponse<T = any> {
  status: string
  data: T
  message: string
}

// Configuration
const API_BASE_URL = '/api/v1'

export const apiConfig: ApiConfig = {
  baseUrl: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
}

export const createApiUrl = (endpoint: string): string => {
  return `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`
}

export const apiRequest = async <T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> => {
  const url = createApiUrl(endpoint)
  const config: RequestOptions = {
    ...options,
    headers: {
      ...apiConfig.headers,
      ...options.headers,
    },
  }

  try {
    const response = await fetch(url, {
      ...config,
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('API request error:', error)
    throw error
  }
}

// Convenience methods for different HTTP methods
export const apiGet = async <T = any>(
  endpoint: string,
  options: Omit<RequestOptions, 'method'> = {}
): Promise<ApiResponse<T>> => {
  return apiRequest<T>(endpoint, { ...options, method: 'GET' })
}

export const apiPost = async <T = any>(
  endpoint: string,
  data?: any,
  options: Omit<RequestOptions, 'method' | 'body'> = {}
): Promise<ApiResponse<T>> => {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  })
}

export const apiPut = async <T = any>(
  endpoint: string,
  data?: any,
  options: Omit<RequestOptions, 'method' | 'body'> = {}
): Promise<ApiResponse<T>> => {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  })
}

export const apiDelete = async <T = any>(
  endpoint: string,
  options: Omit<RequestOptions, 'method'> = {}
): Promise<ApiResponse<T>> => {
  return apiRequest<T>(endpoint, { ...options, method: 'DELETE' })
}