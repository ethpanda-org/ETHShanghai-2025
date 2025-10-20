import axios from 'axios';
import { ApiResponse, RiskAnalysisResult } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    // 可以在这里添加认证token等
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

// API 基础配置
// API_BASE_URL already declared at the top; remove duplicate declaration

// 错误类型定义
interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

// 重试配置
const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000,
  retryableErrors: ['NETWORK_ERROR', 'TIMEOUT', 'SERVER_ERROR']
};

// 通用错误处理函数
const handleApiError = (error: any): ApiError => {
  if (error.response) {
    // 服务器响应错误
    const status = error.response.status;
    const data = error.response.data;
    
    switch (status) {
      case 400:
        return {
          message: data?.message || '请求参数错误，请检查输入的合约地址',
          code: 'BAD_REQUEST',
          details: data
        };
      case 404:
        return {
          message: data?.message || '合约地址未找到或不存在',
          code: 'NOT_FOUND',
          details: data
        };
      case 429:
        return {
          message: 'API调用频率过高，请稍后重试',
          code: 'RATE_LIMIT',
          details: data
        };
      case 500:
        return {
          message: 'Qwen AI服务暂时不可用，请稍后重试',
          code: 'SERVER_ERROR',
          details: data
        };
      case 503:
        return {
          message: 'AI分析服务正在维护中，请稍后重试',
          code: 'SERVICE_UNAVAILABLE',
          details: data
        };
      default:
        return {
          message: data?.message || `服务器错误 (${status})`,
          code: 'HTTP_ERROR',
          details: data
        };
    }
  } else if (error.request) {
    // 网络错误
    return {
      message: '网络连接失败，请检查网络连接后重试',
      code: 'NETWORK_ERROR',
      details: error.request
    };
  } else {
    // 其他错误
    return {
      message: error.message || '未知错误，请重试',
      code: 'UNKNOWN_ERROR',
      details: error
    };
  }
};

// 重试函数
const retryRequest = async <T>(
  requestFn: () => Promise<T>,
  retries: number = RETRY_CONFIG.maxRetries
): Promise<T> => {
  try {
    return await requestFn();
  } catch (error) {
    const apiError = handleApiError(error);
    
    if (retries > 0 && RETRY_CONFIG.retryableErrors.includes(apiError.code || '')) {
      console.warn(`请求失败，${RETRY_CONFIG.retryDelay}ms后重试... (剩余重试次数: ${retries})`);
      await new Promise(resolve => setTimeout(resolve, RETRY_CONFIG.retryDelay));
      return retryRequest(requestFn, retries - 1);
    }
    
    throw apiError;
  }
};

// 验证合约地址格式
const validateContractAddress = (address: string): boolean => {
  const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
  return ethAddressRegex.test(address);
};

export const apiService = {
  // 分析合约 - 旧版本，用于交易分析
  async analyzeTransaction(contractAddress: string): Promise<ApiResponse<RiskAnalysisResult>> {
    // 输入验证
    if (!contractAddress || !contractAddress.trim()) {
      throw {
        message: '请输入有效的合约地址',
        code: 'INVALID_INPUT'
      } as ApiError;
    }

    const trimmedAddress = contractAddress.trim();
    if (!validateContractAddress(trimmedAddress)) {
      throw {
        message: '合约地址格式不正确，请输入有效的以太坊地址 (0x开头的40位十六进制字符)',
        code: 'INVALID_ADDRESS_FORMAT'
      } as ApiError;
    }

    return retryRequest(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/ai-monitoring/analyze-transaction`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            transactionHash: trimmedAddress,
            analysisType: 'comprehensive'
          }),
       
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.success) {
          throw {
            message: data.message || 'AI分析失败',
            code: 'ANALYSIS_FAILED',
            details: data
          } as ApiError;
        }

        return {
          success: true,
          data: data.data,
          message: 'AI分析完成'
        };
      } catch (error) {
        if ((error as any).name === 'AbortError') {
          throw {
            message: 'AI分析请求超时，请重试',
            code: 'TIMEOUT'
          } as ApiError;
        }
        throw error;
      }
    });
  },

  // 启动监控 - 增强错误处理
  async startMonitoring(): Promise<ApiResponse<any>> {
    return retryRequest(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/monitoring/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(10000) // 10秒超时
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        return {
          success: true,
          data: data,
          message: '监控启动成功'
        };
      } catch (error) {
        if ((error as any).name === 'AbortError') {
          throw {
            message: '监控启动请求超时，请重试',
            code: 'TIMEOUT'
          } as ApiError;
        }
        throw error;
      }
    });
  },

  // 健康检查 - 新增
  async healthCheck(): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${API_BASE_URL.replace('/api', '')}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5秒超时
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        data: data,
        message: '服务健康检查通过'
      };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // 获取Qwen AI状态 - 新增
  async getQwenStatus(): Promise<ApiResponse<any>> {
    return retryRequest(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/ai-monitoring/status`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        return {
          success: true,
          data: data,
          message: 'Qwen AI状态获取成功'
        };
      } catch (error) {
        throw handleApiError(error);
      }
    });
  },

  // 合约分析 - 新增智能合约地址分析功能
  async analyzeContract(contractAddress: string, network: string = 'holesky', userRequest?: string): Promise<ApiResponse<any>> {
    // 输入验证
    if (!contractAddress || !contractAddress.trim()) {
      throw {
        message: '请输入有效的合约地址',
        code: 'INVALID_INPUT'
      } as ApiError;
    }

    const trimmedAddress = contractAddress.trim();
    if (!validateContractAddress(trimmedAddress)) {
      throw {
        message: '合约地址格式不正确，请输入有效的以太坊地址 (0x开头的40位十六进制字符)',
        code: 'INVALID_ADDRESS_FORMAT'
      } as ApiError;
    }

    return retryRequest(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/contract-analysis/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            address: trimmedAddress,
            network,
            userRequest: userRequest || ''
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw {
            message: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
            code: errorData.code || 'HTTP_ERROR',
            status: response.status
          } as ApiError;
        }

        const data = await response.json();
        return {
          success: true,
          data: data.data,
          message: data.message || '合约分析完成'
        };
      } catch (error) {
        throw handleApiError(error);
      }
    });
  },

  // 快速风险检查
  async quickRiskCheck(contractAddress: string, network: string = 'holesky'): Promise<ApiResponse<any>> {
    if (!contractAddress || !contractAddress.trim()) {
      throw {
        message: '请输入有效的合约地址',
        code: 'INVALID_INPUT'
      } as ApiError;
    }

    const trimmedAddress = contractAddress.trim();
    if (!validateContractAddress(trimmedAddress)) {
      throw {
        message: '合约地址格式不正确',
        code: 'INVALID_ADDRESS_FORMAT'
      } as ApiError;
    }

    return retryRequest(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/contract-analysis/quick-check/${trimmedAddress}?network=${network}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw {
            message: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
            code: errorData.code || 'HTTP_ERROR',
            status: response.status
          } as ApiError;
        }

        const data = await response.json();
        return {
          success: true,
          data: data.data,
          message: data.message || '快速风险检查完成'
        };
      } catch (error) {
        throw handleApiError(error);
      }
    });
  },

  // 获取链上数据
  async getChainData(contractAddress: string, network: string = 'holesky'): Promise<ApiResponse<any>> {
    if (!contractAddress || !contractAddress.trim()) {
      throw {
        message: '请输入有效的合约地址',
        code: 'INVALID_INPUT'
      } as ApiError;
    }

    const trimmedAddress = contractAddress.trim();
    if (!validateContractAddress(trimmedAddress)) {
      throw {
        message: '合约地址格式不正确',
        code: 'INVALID_ADDRESS_FORMAT'
      } as ApiError;
    }

    return retryRequest(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/contract-analysis/chain-data/${trimmedAddress}?network=${network}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw {
            message: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
            code: errorData.code || 'HTTP_ERROR',
            status: response.status
          } as ApiError;
        }

        const data = await response.json();
        return {
          success: true,
          data: data.data,
          message: data.message || '链上数据获取成功'
        };
      } catch (error) {
        throw handleApiError(error);
      }
    });
  },

  // 合约解析 - 保留原有功能
  async parseContract(contractAddress: string, parseRequest: string): Promise<ApiResponse<any>> {
    // 输入验证
    if (!contractAddress || !contractAddress.trim()) {
      throw {
        message: '请输入有效的合约地址',
        code: 'INVALID_INPUT'
      } as ApiError;
    }

    if (!parseRequest || !parseRequest.trim()) {
      throw {
        message: '请输入解析请求',
        code: 'INVALID_INPUT'
      } as ApiError;
    }

    const trimmedAddress = contractAddress.trim();
    if (!validateContractAddress(trimmedAddress)) {
      throw {
        message: '合约地址格式不正确，请输入有效的以太坊地址 (0x开头的40位十六进制字符)',
        code: 'INVALID_ADDRESS_FORMAT'
      } as ApiError;
    }

    return retryRequest(async () => {
       try {
         const response = await fetch(`${API_BASE_URL}/api/risk-analysis/parse-contract`, {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json',
           },
           body: JSON.stringify({
             contractAddress: trimmedAddress,
             parseRequest: parseRequest.trim()
           }),
           signal: AbortSignal.timeout(30000) // 30秒超时
         });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.success) {
          throw {
            message: data.message || '合约解析失败',
            code: 'PARSE_FAILED',
            details: data
          } as ApiError;
        }

        return {
          success: true,
          data: data.data,
          message: '合约解析完成'
        };
      } catch (error) {
        if ((error as any).name === 'AbortError') {
          throw {
            message: '合约解析请求超时，请重试',
            code: 'TIMEOUT'
          } as ApiError;
        }
        throw error;
      }
    });
  }
};

export const api = {
  // 合约分析
  analyzeContract: async (contractAddress: string, network: string = 'holesky', userRequest?: string): Promise<any> => {
    try {
      const response = await apiClient.post('/api/contract-analysis/analyze', {
        address: contractAddress,
        network,
        userRequest: userRequest || ''
      });
      return response;
    } catch (error) {
      console.error('合约分析失败:', error);
      throw error;
    }
  },

  // 快速风险检查
  quickRiskCheck: async (contractAddress: string, network: string = 'holesky'): Promise<any> => {
    try {
      const response = await apiClient.get(`/api/contract-analysis/quick-check/${contractAddress}?network=${network}`);
      return response;
    } catch (error) {
      console.error('快速风险检查失败:', error);
      throw error;
    }
  },



  // Qwen AI 交易风险分析
  analyzeTransactionRisk: async (transactionData: any): Promise<any> => {
    try {
      const response = await apiClient.post('/api/qwen/analyze-transaction', transactionData);
      return response;
    } catch (error) {
      console.error('Qwen交易分析失败:', error);
      throw error;
    }
  },

  // 批量分析交易风险
  batchAnalyzeTransactions: async (transactions: any[]): Promise<any> => {
    try {
      const response = await apiClient.post('/api/qwen/batch-analyze', { transactions });
      return response;
    } catch (error) {
      console.error('批量交易分析失败:', error);
      throw error;
    }
  },

  // 开始监控
  startMonitoring: async (config: any): Promise<any> => {
    try {
      const response = await apiClient.post('/api/monitoring/start', config);
      return response;
    } catch (error) {
      console.error('开始监控失败:', error);
      throw error;
    }
  },

  // 获取监控状态
  getMonitoringStatus: async (): Promise<any> => {
    try {
      const response = await apiClient.get('/api/monitoring/status');
      return response;
    } catch (error) {
      console.error('获取监控状态失败:', error);
      throw error;
    }
  },

  // 启动实时交易监听
  startRealtimeMonitoring: async (addresses: string[]): Promise<any> => {
    try {
      const response = await apiClient.post('/api/monitoring/start-realtime', { addresses });
      return response;
    } catch (error) {
      console.error('启动实时监听失败:', error);
      throw error;
    }
  },

  // 停止实时交易监听
  stopRealtimeMonitoring: async (): Promise<any> => {
    try {
      const response = await apiClient.post('/api/monitoring/stop-realtime');
      return response;
    } catch (error) {
      console.error('停止实时监听失败:', error);
      throw error;
    }
  }
};

export default api;