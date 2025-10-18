// src/services/api.ts
import axios from 'axios';
import type { AxiosResponse } from 'axios';

// Windows后端地址 - WSL2可以直接访问Windows的localhost
const API_BASE_URL = 'http://localhost:8080';

// 创建axios实例
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    console.log('🚀 发送请求:', {
      method: config.method?.toUpperCase(),
      url: `${config.baseURL}${config.url}`,
    });
    
    return config;
  },
  (error) => {
    console.error('❌ 请求错误:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器 - 返回data部分
api.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log('✅ 收到响应:', response.status);
    return response.data; // 直接返回data部分
  },
  (error) => {
    console.error('❌ 响应错误:', error);
    
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      // 如果当前不在登录页，则跳转
      if (!window.location.pathname.includes('login')) {
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// 类型定义
export interface AnalysisRequest {
  contractName: string;
  contractCode: string;
}

export interface AnalysisResult {
  id: string;
  contractName: string;
  basicIssues: string[];
  aiInsights: string;
  status: 'PENDING' | 'ANALYZING' | 'COMPLETED' | 'FAILED';
  timestamp: number;
}

// 合约分析API
export const contractAPI = {
  // 提交分析任务
  analyze: async (data: AnalysisRequest) => {
    try {
      // 后端返回格式可能是 { taskId: "xxx" } 或 { success: true, data: { taskId: "xxx" } }
      const response: any = await api.post('/analyze', data);
      
      // 处理不同的响应格式
      if (response.taskId) {
        return { taskId: response.taskId as string };
      } else if (response.data && response.data.taskId) {
        return { taskId: response.data.taskId as string };
      } else if (response.id) {
        // 有些后端可能返回id而不是taskId
        return { taskId: response.id as string };
      } else {
        throw new Error('后端响应格式不正确');
      }
    } catch (error) {
      console.error('分析请求失败:', error);
      throw error;
    }
  },
    
  // 获取分析结果  
  getResult: async (taskId: string): Promise<AnalysisResult> => {
    try {
      const response: any = await api.get(`/analyze/${taskId}`);
      
      // 处理不同的响应格式
      if (response.data) {
        return response.data;
      } else {
        return response;
      }
    } catch (error) {
      console.error('获取结果失败:', error);
      throw error;
    }
  },
};

// 测试连接函数
export const testConnection = async (): Promise<boolean> => {
  try {
    const response = await api.get('/health');
    console.log('✅ 后端连接成功:', response);
    return true;
  } catch (error) {
    console.error('❌ 后端连接失败:', error);
    console.log('💡 请检查:');
    console.log('   1. Windows后端是否在localhost:8080运行');
    console.log('   2. 后端是否允许跨域访问');
    console.log('   3. WSL2网络是否正常');
    return false;
  }
};

export default api;