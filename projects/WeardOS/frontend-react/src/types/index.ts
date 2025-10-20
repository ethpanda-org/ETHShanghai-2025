// Web3 相关类型
export interface Web3State {
  web3: any;
  account: string | null;
  networkId: number | null;
  networkName: string;
  isConnected: boolean;
}

// 语言相关类型
export interface Language {
  code: string;
  name: string;
  flag: string;
}

// 导航相关类型
export type TabType = 'homepage' | 'auto-monitoring';

// API 响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// 风险分析结果类型
export interface RiskAnalysisResult {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  details: string;
  recommendations: string[];
  timestamp: string;
}

// 交易监控数据类型
export interface TransactionMonitorData {
  hash: string;
  from: string;
  to: string;
  value: string;
  gasPrice: string;
  gasUsed: string;
  status: 'pending' | 'success' | 'failed';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
}

// AI分析相关类型
export interface RiskFactor {
  factor: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface AnalysisResult {
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: string[];
  recommendation: string;
  confidence: number;
  comprehensiveConfidence?: number;
  detailedAnalysis?: {
    security?: {
      accessControl?: string;
      reentrancyProtection?: string;
      overflowProtection?: string;
    };
    ethAIFeatures?: Record<string, boolean>;
    stabilityMetrics?: {
      aiConfidence?: number;
      systemResilience?: number;
      ethIntegrationLevel?: number;
    };
  };
}

// 监控配置类型
export interface MonitoringConfig {
  riskThreshold: number;
  monitoringDuration: number;
}

// 监控数据类型
export interface MonitoringData {
  totalTransactions: number;
  highRiskTransactions: number;
  blockedTransactions: number;
  riskScore: number;
}

// 检测结果类型
export interface DetectionResult {
  id: number;
  hash: string;
  tags: Array<{
    text: string;
    type: 'danger' | 'warning' | 'success';
  }>;
  result: string;
  time: string;
  riskLevel: 'high' | 'normal';
}

// 轮播图数据类型
export interface SlideData {
  k1: string;
  t1: string;
  k2: string;
  t2: string;
}

// 功能特性类型
export interface FeatureData {
  title: string;
  description: string;
}

// Web3 Hook 返回类型
export interface UseWeb3Return {
  isConnected: boolean;
  account: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  isConnecting: boolean;
  web3: any;
  networkId: number | null;
  networkName: string;
}