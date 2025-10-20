export interface TradingParams {
  user_id: string;
  token_pair: string;
  base_token: string;
  quote_token: string;
  base_token_symbol?: string;
  quote_token_symbol?: string;
  grid_count: number;
  price_range_min: string;
  price_range_max: string;
  total_investment: string;
}

// 网格配置接口 - 匹配后端GridConfig结构体
export interface GridConfig {
  trading_pair: string;
  exchange: string;
  upper_price: number;
  lower_price: number;
  grid_count: number;
  total_amount: number;
  private_key: string;
}

export interface StartStrategyRequest {
  config: GridConfig;
}

export interface StartStrategyResponse {
  strategy_id: string;
  message: string;
}

export interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
}

export interface StrategyStatus {
  status: 'Running' | 'Paused' | 'Stopped' | 'Error';
  message: string;
}

export interface StrategyStatusResponse {
  strategy_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  config: GridConfig;
}

export interface ApiError {
  error: string;
  message: string;
}

export interface PriceResponse {
  pair: string;
  price: number;
  timestamp: string;
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
}

export interface LogsResponse {
  strategy_id: string;
  logs: LogEntry[];
}

const API_BASE_URL = 'http://localhost:8080';

class TradingAPI {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, defaultOptions);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // 启动策略
  async startStrategy(config: GridConfig): Promise<StartStrategyResponse> {
    const response = await this.request<StartStrategyResponse>('/api/strategy/start', {
      method: 'POST',
      body: JSON.stringify({ config }),
    });
    return response;
  }

  // 停止策略
  async stopStrategy(strategyId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/strategy/${strategyId}/stop`, {
      method: 'POST',
    });
  }

  // 暂停策略
  async pauseStrategy(strategyId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/strategy/${strategyId}/pause`, {
      method: 'POST',
    });
  }

  // 恢复策略
  async resumeStrategy(strategyId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/strategy/${strategyId}/resume`, {
      method: 'POST',
    });
  }

  // 获取策略状态
  async getStrategyStatus(strategyId: string): Promise<StrategyStatusResponse> {
    return this.request<StrategyStatusResponse>(`/api/strategy/${strategyId}/status`, {
      method: 'GET',
    });
  }

  async getPrice(pair: string): Promise<PriceResponse> {
    const response = await fetch(`${API_BASE_URL}/api/price/${pair}`);
    if (!response.ok) {
      throw new Error(`Failed to get price: ${response.statusText}`);
    }
    return response.json();
  }

  async getStrategyLogs(strategyId: string): Promise<LogsResponse> {
    const response = await fetch(`${API_BASE_URL}/api/strategy/${strategyId}/logs`);
    if (!response.ok) {
      throw new Error(`Failed to get strategy logs: ${response.statusText}`);
    }
    return response.json();
  }

  // 健康检查
  async healthCheck(): Promise<{ status: string; timestamp: string; version: string }> {
    return this.request<{ status: string; timestamp: string; version: string }>('/health', {
      method: 'GET',
    });
  }
}

export const tradingAPI = new TradingAPI();
