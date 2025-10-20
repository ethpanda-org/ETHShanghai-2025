// aiService.ts - AI分析服务
import { WalletBalance, Transaction } from './walletService';

export interface AIInsight {
  id: string;
  type: 'risk' | 'opportunity' | 'trend' | 'recommendation';
  title: string;
  description: string;
  confidence: number; // 0-100
  severity: 'low' | 'medium' | 'high';
  timestamp: string;
  data?: any;
}

export interface InvestmentProfile {
  riskLevel: 'conservative' | 'moderate' | 'aggressive';
  tradingFrequency: 'low' | 'medium' | 'high';
  preferredAssets: string[];
  diversificationScore: number; // 0-100
  liquidityPreference: 'low' | 'medium' | 'high';
  timeHorizon: 'short' | 'medium' | 'long';
}

export interface TrendAnalysis {
  period: '24h' | '7d' | '30d' | '90d';
  totalTransactions: number;
  totalVolume: number;
  averageTransactionSize: number;
  mostActiveTokens: string[];
  spendingCategories: {
    defi: number;
    nft: number;
    trading: number;
    transfers: number;
  };
  gasSpent: number;
  profitLoss: number;
}

export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high';
  factors: {
    concentration: number; // 资产集中度风险
    volatility: number; // 波动性风险
    liquidity: number; // 流动性风险
    counterparty: number; // 对手方风险
    smart_contract: number; // 智能合约风险
  };
  recommendations: string[];
}

export interface NLQueryResult {
  query: string;
  answer: string;
  confidence: number;
  data?: any;
  visualizations?: {
    type: 'chart' | 'table' | 'metric';
    config: any;
  }[];
}

class AIService {
  private insights: AIInsight[] = [];
  private analysisCache: Map<string, any> = new Map();

  // 分析钱包数据并生成洞察
  async analyzeWallet(walletData: WalletBalance[], transactions: Transaction[]): Promise<AIInsight[]> {
    const insights: AIInsight[] = [];

    // 资产集中度分析
    const concentrationInsight = this.analyzeConcentration(walletData);
    if (concentrationInsight) insights.push(concentrationInsight);

    // 交易模式分析
    const tradingPatternInsight = this.analyzeTradingPatterns(transactions);
    if (tradingPatternInsight) insights.push(tradingPatternInsight);

    // 风险评估
    const riskInsight = this.analyzeRisks(walletData, transactions);
    if (riskInsight) insights.push(riskInsight);

    // 机会识别
    const opportunityInsight = this.identifyOpportunities(walletData, transactions);
    if (opportunityInsight) insights.push(opportunityInsight);

    // 趋势分析
    const trendInsight = this.analyzeTrends(transactions);
    if (trendInsight) insights.push(trendInsight);

    this.insights = insights;
    return insights;
  }

  // 资产集中度分析
  private analyzeConcentration(walletData: WalletBalance[]): AIInsight | null {
    const totalValue = walletData.reduce((sum, wallet) => sum + wallet.totalValue, 0);
    
    if (totalValue === 0) return null;

    // 计算最大资产占比
    const maxAssetRatio = Math.max(...walletData.map(wallet => wallet.totalValue / totalValue));
    
    let type: AIInsight['type'] = 'recommendation';
    let severity: AIInsight['severity'] = 'low';
    let title = '资产分布分析';
    let description = '';
    let confidence = 85;

    if (maxAssetRatio > 0.8) {
      type = 'risk';
      severity = 'high';
      title = '高风险：资产过度集中';
      description = `您的资产过度集中在单一钱包或链上（${(maxAssetRatio * 100).toFixed(1)}%），建议分散投资以降低风险。`;
      confidence = 95;
    } else if (maxAssetRatio > 0.6) {
      type = 'risk';
      severity = 'medium';
      title = '中等风险：资产集中度较高';
      description = `您的资产集中度为${(maxAssetRatio * 100).toFixed(1)}%，建议适当分散投资。`;
      confidence = 90;
    } else {
      title = '良好的资产分布';
      description = `您的资产分布相对均衡，最大集中度为${(maxAssetRatio * 100).toFixed(1)}%，风险控制良好。`;
    }

    return {
      id: `concentration-${Date.now()}`,
      type,
      title,
      description,
      confidence,
      severity,
      timestamp: new Date().toISOString(),
      data: { maxAssetRatio, totalValue }
    };
  }

  // 交易模式分析
  private analyzeTradingPatterns(transactions: Transaction[]): AIInsight | null {
    if (transactions.length === 0) return null;

    const recentTxs = transactions.filter(tx => 
      Date.now() - tx.timestamp < 7 * 24 * 60 * 60 * 1000 // 最近7天
    );

    const dailyTxCount = recentTxs.length / 7;
    const avgTxValue = recentTxs.reduce((sum, tx) => sum + parseFloat(tx.value), 0) / recentTxs.length;

    let type: AIInsight['type'] = 'trend';
    let severity: AIInsight['severity'] = 'low';
    let title = '';
    let description = '';
    let confidence = 80;

    if (dailyTxCount > 10) {
      type = 'trend';
      severity = 'medium';
      title = '高频交易模式';
      description = `检测到高频交易活动，平均每天${dailyTxCount.toFixed(1)}笔交易。建议关注gas费用成本。`;
      confidence = 90;
    } else if (dailyTxCount > 3) {
      title = '活跃交易模式';
      description = `您保持着活跃的交易频率，平均每天${dailyTxCount.toFixed(1)}笔交易，交易活跃度良好。`;
    } else {
      title = '稳健交易模式';
      description = `您的交易频率较低，平均每天${dailyTxCount.toFixed(1)}笔交易，属于稳健型投资者。`;
    }

    return {
      id: `trading-pattern-${Date.now()}`,
      type,
      title,
      description,
      confidence,
      severity,
      timestamp: new Date().toISOString(),
      data: { dailyTxCount, avgTxValue, recentTxCount: recentTxs.length }
    };
  }

  // 风险分析
  private analyzeRisks(walletData: WalletBalance[], transactions: Transaction[]): AIInsight | null {
    const riskFactors = [];
    let overallRisk = 0;

    // 检查失败交易比例
    const failedTxRatio = transactions.filter(tx => tx.status === 'failed').length / transactions.length;
    if (failedTxRatio > 0.1) {
      riskFactors.push('交易失败率较高');
      overallRisk += 30;
    }

    // 检查gas费用
    const avgGasPrice = transactions.reduce((sum, tx) => sum + parseFloat(tx.gasPrice), 0) / transactions.length;
    if (avgGasPrice > 100) {
      riskFactors.push('gas费用偏高');
      overallRisk += 20;
    }

    // 检查资产波动性
    const highVolatilityAssets = walletData.filter(wallet => 
      wallet.tokens.some(token => Math.abs(token.change24h) > 10)
    );
    if (highVolatilityAssets.length > 0) {
      riskFactors.push('持有高波动性资产');
      overallRisk += 25;
    }

    if (riskFactors.length === 0) return null;

    let severity: AIInsight['severity'] = 'low';
    if (overallRisk > 50) severity = 'high';
    else if (overallRisk > 25) severity = 'medium';

    return {
      id: `risk-assessment-${Date.now()}`,
      type: 'risk',
      title: '风险评估报告',
      description: `检测到以下风险因素：${riskFactors.join('、')}。建议关注风险管理。`,
      confidence: 85,
      severity,
      timestamp: new Date().toISOString(),
      data: { riskFactors, overallRisk }
    };
  }

  // 机会识别
  private identifyOpportunities(walletData: WalletBalance[], transactions: Transaction[]): AIInsight | null {
    const opportunities = [];

    // 检查闲置资产
    const idleAssets = walletData.filter(wallet => 
      wallet.tokens.some(token => parseFloat(token.balance) > 0 && token.symbol === 'USDC' || token.symbol === 'USDT')
    );
    
    if (idleAssets.length > 0) {
      opportunities.push('发现闲置稳定币，可考虑DeFi收益机会');
    }

    // 检查gas优化机会
    const recentHighGasTxs = transactions.filter(tx => 
      parseFloat(tx.gasPrice) > 50 && Date.now() - tx.timestamp < 24 * 60 * 60 * 1000
    );
    
    if (recentHighGasTxs.length > 3) {
      opportunities.push('建议优化交易时间以降低gas费用');
    }

    if (opportunities.length === 0) return null;

    return {
      id: `opportunity-${Date.now()}`,
      type: 'opportunity',
      title: '投资机会识别',
      description: opportunities.join('；'),
      confidence: 75,
      severity: 'low',
      timestamp: new Date().toISOString(),
      data: { opportunities }
    };
  }

  // 趋势分析
  private analyzeTrends(transactions: Transaction[]): AIInsight | null {
    if (transactions.length < 5) return null;

    const recentTxs = transactions.slice(0, 10);
    const olderTxs = transactions.slice(10, 20);

    const recentAvgValue = recentTxs.reduce((sum, tx) => sum + parseFloat(tx.value), 0) / recentTxs.length;
    const olderAvgValue = olderTxs.length > 0 ? 
      olderTxs.reduce((sum, tx) => sum + parseFloat(tx.value), 0) / olderTxs.length : recentAvgValue;

    const valueChange = ((recentAvgValue - olderAvgValue) / olderAvgValue) * 100;

    let title = '';
    let description = '';
    const type: AIInsight['type'] = 'trend';

    if (Math.abs(valueChange) < 10) {
      title = '交易规模稳定';
      description = `您的交易规模保持稳定，平均交易金额变化${valueChange.toFixed(1)}%。`;
    } else if (valueChange > 0) {
      title = '交易规模上升趋势';
      description = `检测到交易规模上升趋势，平均交易金额增长${valueChange.toFixed(1)}%。`;
    } else {
      title = '交易规模下降趋势';
      description = `检测到交易规模下降趋势，平均交易金额下降${Math.abs(valueChange).toFixed(1)}%。`;
    }

    return {
      id: `trend-${Date.now()}`,
      type,
      title,
      description,
      confidence: 70,
      severity: 'low',
      timestamp: new Date().toISOString(),
      data: { valueChange, recentAvgValue, olderAvgValue }
    };
  }

  // 生成投资画像
  generateInvestmentProfile(walletData: WalletBalance[], transactions: Transaction[]): InvestmentProfile {
    const totalValue = walletData.reduce((sum, wallet) => sum + wallet.totalValue, 0);
    const recentTxs = transactions.filter(tx => 
      Date.now() - tx.timestamp < 30 * 24 * 60 * 60 * 1000 // 最近30天
    );

    // 风险等级评估
    const volatileAssets = walletData.reduce((count, wallet) => 
      count + wallet.tokens.filter(token => Math.abs(token.change24h) > 5).length, 0
    );
    const totalAssets = walletData.reduce((count, wallet) => count + wallet.tokens.length, 0);
    const volatileRatio = totalAssets > 0 ? volatileAssets / totalAssets : 0;

    let riskLevel: InvestmentProfile['riskLevel'] = 'conservative';
    if (volatileRatio > 0.6) riskLevel = 'aggressive';
    else if (volatileRatio > 0.3) riskLevel = 'moderate';

    // 交易频率评估
    const monthlyTxCount = recentTxs.length;
    let tradingFrequency: InvestmentProfile['tradingFrequency'] = 'low';
    if (monthlyTxCount > 50) tradingFrequency = 'high';
    else if (monthlyTxCount > 15) tradingFrequency = 'medium';

    // 偏好资产分析
    const tokenCounts: Record<string, number> = {};
    walletData.forEach(wallet => {
      wallet.tokens.forEach(token => {
        tokenCounts[token.symbol] = (tokenCounts[token.symbol] || 0) + 1;
      });
    });
    const preferredAssets = Object.entries(tokenCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([symbol]) => symbol);

    // 多样化评分
    const uniqueTokens = new Set(walletData.flatMap(wallet => wallet.tokens.map(token => token.symbol))).size;
    const diversificationScore = Math.min(100, uniqueTokens * 10);

    // 流动性偏好
    const stableCoins = ['USDC', 'USDT', 'BUSD', 'DAI'];
    const stableCoinValue = walletData.reduce((sum, wallet) => 
      sum + wallet.tokens
        .filter(token => stableCoins.includes(token.symbol))
        .reduce((tokenSum, token) => tokenSum + token.value, 0), 0
    );
    const stableCoinRatio = totalValue > 0 ? stableCoinValue / totalValue : 0;

    let liquidityPreference: InvestmentProfile['liquidityPreference'] = 'low';
    if (stableCoinRatio > 0.4) liquidityPreference = 'high';
    else if (stableCoinRatio > 0.2) liquidityPreference = 'medium';

    // 时间偏好（基于交易模式）
    const avgHoldingPeriod = this.calculateAvgHoldingPeriod(transactions);
    let timeHorizon: InvestmentProfile['timeHorizon'] = 'long';
    if (avgHoldingPeriod < 7) timeHorizon = 'short';
    else if (avgHoldingPeriod < 30) timeHorizon = 'medium';

    return {
      riskLevel,
      tradingFrequency,
      preferredAssets,
      diversificationScore,
      liquidityPreference,
      timeHorizon
    };
  }

  // 计算平均持有期
  private calculateAvgHoldingPeriod(transactions: Transaction[]): number {
    // 简化计算，基于交易频率估算
    if (transactions.length < 2) return 30;
    
    const timeSpan = transactions[0].timestamp - transactions[transactions.length - 1].timestamp;
    const avgInterval = timeSpan / transactions.length;
    return avgInterval / (24 * 60 * 60 * 1000); // 转换为天数
  }

  // 自然语言查询处理
  async processNaturalLanguageQuery(query: string, walletData: WalletBalance[], transactions: Transaction[]): Promise<NLQueryResult> {
    const lowerQuery = query.toLowerCase();
    
    // 余额查询
    if (lowerQuery.includes('余额') || lowerQuery.includes('balance')) {
      return this.handleBalanceQuery(query, walletData);
    }
    
    // 交易查询
    if (lowerQuery.includes('交易') || lowerQuery.includes('转账') || lowerQuery.includes('花费')) {
      return this.handleTransactionQuery(query, transactions);
    }
    
    // 收益查询
    if (lowerQuery.includes('收益') || lowerQuery.includes('盈亏') || lowerQuery.includes('profit')) {
      return this.handleProfitQuery(query, walletData);
    }
    
    // 风险查询
    if (lowerQuery.includes('风险') || lowerQuery.includes('risk')) {
      return this.handleRiskQuery(query, walletData, transactions);
    }

    // 默认回复
    return {
      query,
      answer: '抱歉，我还不能理解这个问题。请尝试询问关于余额、交易、收益或风险的问题。',
      confidence: 0
    };
  }

  // 处理余额查询
  private handleBalanceQuery(query: string, walletData: WalletBalance[]): NLQueryResult {
    const totalValue = walletData.reduce((sum, wallet) => sum + wallet.totalValue, 0);
    const totalChange = walletData.reduce((sum, wallet) => sum + wallet.change24h * wallet.totalValue, 0) / totalValue;

    const answer = `您的总资产价值为 $${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}，24小时变化 ${totalChange >= 0 ? '+' : ''}${totalChange.toFixed(2)}%。`;

    return {
      query,
      answer,
      confidence: 95,
      data: { totalValue, totalChange, walletCount: walletData.length },
      visualizations: [{
        type: 'chart',
        config: {
          type: 'pie',
          data: walletData.map(wallet => ({
            name: wallet.chain,
            value: wallet.totalValue
          }))
        }
      }]
    };
  }

  // 处理交易查询
  private handleTransactionQuery(query: string, transactions: Transaction[]): NLQueryResult {
    const timeMatch = query.match(/(\d+)\s*(天|日|day)/);
    const days = timeMatch ? parseInt(timeMatch[1]) : 7;
    
    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;
    const recentTxs = transactions.filter(tx => tx.timestamp > cutoffTime);
    
    const totalSpent = recentTxs
      .filter(tx => tx.type === 'send')
      .reduce((sum, tx) => sum + parseFloat(tx.value), 0);
    
    const totalReceived = recentTxs
      .filter(tx => tx.type === 'receive')
      .reduce((sum, tx) => sum + parseFloat(tx.value), 0);

    const answer = `过去${days}天内，您共进行了${recentTxs.length}笔交易，支出 ${totalSpent.toFixed(4)} ETH，收入 ${totalReceived.toFixed(4)} ETH。`;

    return {
      query,
      answer,
      confidence: 90,
      data: { days, txCount: recentTxs.length, totalSpent, totalReceived },
      visualizations: [{
        type: 'chart',
        config: {
          type: 'line',
          data: recentTxs.map(tx => ({
            time: new Date(tx.timestamp).toLocaleDateString(),
            value: parseFloat(tx.value),
            type: tx.type
          }))
        }
      }]
    };
  }

  // 处理收益查询
  private handleProfitQuery(query: string, walletData: WalletBalance[]): NLQueryResult {
    const totalValue = walletData.reduce((sum, wallet) => sum + wallet.totalValue, 0);
    const totalChange24h = walletData.reduce((sum, wallet) => 
      sum + (wallet.change24h / 100) * wallet.totalValue, 0
    );

    const profitLoss = totalChange24h >= 0 ? '盈利' : '亏损';
    const answer = `根据24小时价格变化，您当前${profitLoss} $${Math.abs(totalChange24h).toFixed(2)}，收益率为 ${(totalChange24h / totalValue * 100).toFixed(2)}%。`;

    return {
      query,
      answer,
      confidence: 85,
      data: { totalValue, totalChange24h, profitLossRatio: totalChange24h / totalValue },
      visualizations: [{
        type: 'metric',
        config: {
          title: '24小时盈亏',
          value: totalChange24h,
          format: 'currency'
        }
      }]
    };
  }

  // 处理风险查询
  private handleRiskQuery(query: string, walletData: WalletBalance[], transactions: Transaction[]): NLQueryResult {
    const riskAssessment = this.assessRisk(walletData, transactions);
    
    const answer = `您的投资风险等级为：${riskAssessment.overallRisk}。主要风险因素包括：${riskAssessment.recommendations.slice(0, 2).join('、')}。`;

    return {
      query,
      answer,
      confidence: 80,
      data: riskAssessment
    };
  }

  // 风险评估
  private assessRisk(walletData: WalletBalance[], transactions: Transaction[]): RiskAssessment {
    // 计算各种风险因子
    const concentration = this.calculateConcentrationRisk(walletData);
    const volatility = this.calculateVolatilityRisk(walletData);
    const liquidity = this.calculateLiquidityRisk(walletData);
    const counterparty = this.calculateCounterpartyRisk(transactions);
    const smart_contract = this.calculateSmartContractRisk(transactions);

    const avgRisk = (concentration + volatility + liquidity + counterparty + smart_contract) / 5;
    
    let overallRisk: RiskAssessment['overallRisk'] = 'low';
    if (avgRisk > 70) overallRisk = 'high';
    else if (avgRisk > 40) overallRisk = 'medium';

    const recommendations = [];
    if (concentration > 60) recommendations.push('建议分散资产配置');
    if (volatility > 70) recommendations.push('考虑降低高波动性资产比例');
    if (liquidity < 30) recommendations.push('增加流动性资产配置');
    if (counterparty > 50) recommendations.push('注意交易对手方风险');
    if (smart_contract > 60) recommendations.push('谨慎参与复杂DeFi协议');

    return {
      overallRisk,
      factors: {
        concentration,
        volatility,
        liquidity,
        counterparty,
        smart_contract
      },
      recommendations
    };
  }

  // 计算各种风险因子的辅助方法
  private calculateConcentrationRisk(walletData: WalletBalance[]): number {
    const totalValue = walletData.reduce((sum, wallet) => sum + wallet.totalValue, 0);
    if (totalValue === 0) return 0;
    
    const maxWalletRatio = Math.max(...walletData.map(wallet => wallet.totalValue / totalValue));
    return maxWalletRatio * 100;
  }

  private calculateVolatilityRisk(walletData: WalletBalance[]): number {
    const allTokens = walletData.flatMap(wallet => wallet.tokens);
    if (allTokens.length === 0) return 0;
    
    const avgVolatility = allTokens.reduce((sum, token) => sum + Math.abs(token.change24h), 0) / allTokens.length;
    return Math.min(100, avgVolatility * 5);
  }

  private calculateLiquidityRisk(walletData: WalletBalance[]): number {
    const stableCoins = ['USDC', 'USDT', 'BUSD', 'DAI'];
    const totalValue = walletData.reduce((sum, wallet) => sum + wallet.totalValue, 0);
    const stableValue = walletData.reduce((sum, wallet) => 
      sum + wallet.tokens
        .filter(token => stableCoins.includes(token.symbol))
        .reduce((tokenSum, token) => tokenSum + token.value, 0), 0
    );
    
    const liquidityRatio = totalValue > 0 ? stableValue / totalValue : 0;
    return (1 - liquidityRatio) * 100;
  }

  private calculateCounterpartyRisk(transactions: Transaction[]): number {
    const failedTxRatio = transactions.filter(tx => tx.status === 'failed').length / Math.max(transactions.length, 1);
    return failedTxRatio * 100;
  }

  private calculateSmartContractRisk(transactions: Transaction[]): number {
    const contractTxRatio = transactions.filter(tx => tx.type === 'contract').length / Math.max(transactions.length, 1);
    return contractTxRatio * 80; // 合约交易有一定风险
  }

  // 获取所有洞察
  getInsights(): AIInsight[] {
    return this.insights;
  }

  // 清除缓存
  clearCache() {
    this.analysisCache.clear();
  }
}

// 导出单例实例
export const aiService = new AIService();

// 导出类型和服务
export default AIService;