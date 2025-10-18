// API基础配置 - 修正后端地址和端点
const API_BASE_URL = 'http://localhost:8080';

// ============ 请求参数 - 完全匹配后端AnalysisRequest ============
export interface ContractFile {
  fileName: string;
  code: string;
  isMain: boolean;
}

export interface BusinessContext {
  projectName: string;
  businessType: string;
  businessDescription: string;
  expectedBehavior: string;
  securityRequirements?: string;
}

export interface AnalysisRequest {
  contracts: ContractFile[];
  businessContext: BusinessContext;
  analysisType: 'security' | 'gas' | 'business' | 'all';
  aiStrategy?: string;
}

// ============ 响应数据结构 - 匹配后端四维度分析 ============

export interface CodeVulnerability {
  id: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  title: string;
  description: string;
  location: {
    contractFile: string;
    lineNumber?: number;
    function?: string;
  };
  impact: string;
  exploitScenario?: string;
  affectedCode: string;
  references?: string[];
}

export interface DesignFlaw {
  id: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  title: string;
  description: string;
  currentDesign: string;
  recommendedDesign: string;
  designImpact: string;
  affectedContracts: string[];
}

export interface BusinessLogicIssue {
  id: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  title: string;
  description: string;
  expectedBehavior: string;
  actualImplementation: string;
  discrepancy: string;
  businessImpact: string;
  affectedFunctions: string[];
  examples: string[];
}

export interface GasOptimization {
  id: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  title: string;
  description: string;
  location: {
    contractFile: string;
    function?: string;
    lineNumber?: number;
  };
  gasComparison: {
    currentGas: number;
    optimizedGas: number;
    savings: number;
    savingsPercentage: string;
  };
  implementation: {
    beforeCode: string;
    afterCode: string;
    changeDescription: string;
  };
  explanation: string;
}

export interface FixSolution {
  id: string;
  issueId: string;
  issueType: 'CODE_VULNERABILITY' | 'DESIGN_FLAW' | 'BUSINESS_LOGIC' | 'GAS_OPTIMIZATION';
  priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
  solutionTitle: string;
  solutionDescription: string;
  implementationSteps: string[];
  codeChanges: {
    file: string;
    function?: string;
    lineNumber?: number;
    beforeCode: string;
    afterCode: string;
    explanation: string;
    changeType: 'ADD' | 'MODIFY' | 'DELETE';
  }[];
  estimatedEffort: string;
  complexity: 'SIMPLE' | 'MODERATE' | 'COMPLEX';
  testingAdvice: string;
}

// ============ 完整分析结果 ============
export interface AnalysisResult {
  success: boolean;
  projectName: string;
  analysisTime: string;
  
  // 四个核心分析维度
  codeVulnerabilityAnalysis: {
    summary: {
      total: number;
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    vulnerabilities: CodeVulnerability[];
  };
  
  designFlawAnalysis: {
    summary: {
      total: number;
      architectural: number;
      upgradeability: number;
      emergencyControl: number;
      eventLogging: number;
    };
    flaws: DesignFlaw[];
  };
  
  businessLogicAnalysis: {
    summary: {
      totalIssues: number;
      logicMismatches: number;
      missingFeatures: number;
      implementationGaps: number;
    };
    issues: BusinessLogicIssue[];
    missingFeatures: any[];
  };
  
  gasAnalysis: {
    currentGasReport: {
      totalEstimatedGas: number;
      averageGasPrice: string;
      estimatedCostETH: string;
      estimatedCostUSD: string;
      highGasFunctions: {
        contractFile: string;
        functionName: string;
        estimatedGas: number;
        gasLevel: 'HIGH' | 'MEDIUM' | 'LOW';
        costETH: string;
        explanation: string;
      }[];
      analysis: string;
    };
    optimizations: GasOptimization[];
    summary: {
      totalOptimizations: number;
      totalPotentialSavings: number;
      estimatedSavingsPercentage: string;
      potentialCostReduction: string;
    };
  };
  
  fixSolutions: FixSolution[];
  overallAssessment: {
    overallScore: number;
    riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'SAFE';
    scoreBreakdown: {
      securityScore: number;
      designScore: number;
      businessScore: number;
      gasScore: number;
    };
    aiInsights: string;
    keyFindings: string[];
    priorityRecommendations: string[];
    conclusionSummary: string;
  };
}

// ============ API方法 ============
export const contractAPI = {
  analyze: async (data: AnalysisRequest): Promise<AnalysisResult> => {
    try {
      console.log('发送分析请求到后端');
      
      const response = await fetch(`${API_BASE_URL}/security/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('收到后端响应:', result);
      return result;
    } catch (error) {
      console.error('分析失败:', error);
      throw error;
    }
  },

  healthCheck: async (): Promise<{ status: string; timestamp: string }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/security/health`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('后端连接失败:', error);
      throw error;
    }
  }
};

export default contractAPI;