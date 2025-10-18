// API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// 合约分析请求
export interface AnalysisRequest {
  contractName: string;
  contractCode: string;
}

// 任务状态
export type TaskStatus = 'PENDING' | 'ANALYZING' | 'COMPLETED' | 'FAILED';

// 安全问题类型
export interface SecurityIssue {
  type: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  location?: string;
  impact?: string;
  recommendation?: string;
}

// Gas优化建议
export interface GasOptimization {
  type: string;
  location: string;
  currentIssue: string;
  optimization: string;
  estimatedSaving?: string;
}

// 代码质量评估
export interface CodeQuality {
  score: number;
  issues: string[];
  strengths: string[];
}

// 分析结果
export interface AnalysisResult {
  id: string;
  contractName: string;
  contractCode: string;
  status: TaskStatus;
  basicIssues: string[];
  securityInsights?: SecurityIssue[];
  gasOptimizations?: GasOptimization[];
  codeQuality?: CodeQuality;
  aiInsights?: string;
  overallAssessment?: string;
  timestamp: number;
  createTime?: string;
}

// 分析历史记录
export interface AnalysisHistory {
  id: string;
  contractName: string;
  status: TaskStatus;
  createTime: string;
  summary?: string;
}

// 用户相关类型
export interface User {
  id: number;
  username: string;
  email: string;
  createTime: string;
}

export interface AuthRequest {
  username: string;
  password: string;
}

export interface RegisterRequest extends AuthRequest {
  email: string;
}

// 组件Props类型
export interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}