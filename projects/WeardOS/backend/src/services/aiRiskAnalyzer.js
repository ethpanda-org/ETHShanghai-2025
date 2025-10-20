const EventEmitter = require('events');

class AIRiskAnalyzer extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.historicalData = new Map();
    this.patterns = new Map();
    this.anomalyDetectors = new Map();
    this.riskModels = new Map();
    this.learningEnabled = true;
    
    this.initializeModels();
  }

  // 初始化AI模型
  initializeModels() {
    // 初始化异常检测器
    this.anomalyDetectors.set('transaction_value', new TransactionValueDetector());
    this.anomalyDetectors.set('gas_price', new GasPriceDetector());
    this.anomalyDetectors.set('time_pattern', new TimePatternDetector());
    this.anomalyDetectors.set('address_behavior', new AddressBehaviorDetector());
    this.anomalyDetectors.set('contract_interaction', new ContractInteractionDetector());

    // 初始化风险评估模型
    this.riskModels.set('composite', new CompositeRiskModel(this.config.aiModel.weights));
    this.riskModels.set('ml_classifier', new MLClassifier());
    
    console.log('AI风险分析模型已初始化');
  }

  // 主要风险分析入口
  async analyzeTransaction(transaction, context = {}) {
    try {
      const analysisResult = {
        transactionHash: transaction.hash,
        timestamp: Date.now(),
        riskScore: 0,
        riskLevel: 'low',
        anomalies: [],
        riskFactors: [],
        predictions: {},
        recommendations: [],
        confidence: 0
      };

      // 1. 异常检测
      const anomalies = await this.detectAnomalies(transaction, context);
      analysisResult.anomalies = anomalies;

      // 2. 风险因子分析
      const riskFactors = await this.analyzeRiskFactors(transaction, context);
      analysisResult.riskFactors = riskFactors;

      // 3. 综合风险评分
      const riskScore = await this.calculateCompositeRisk(transaction, anomalies, riskFactors);
      analysisResult.riskScore = riskScore.score;
      analysisResult.confidence = riskScore.confidence;

      // 4. 风险等级分类
      analysisResult.riskLevel = this.classifyRiskLevel(riskScore.score);

      // 5. 预测分析
      analysisResult.predictions = await this.makePredictions(transaction, context);

      // 6. 生成建议
      analysisResult.recommendations = this.generateRecommendations(analysisResult);

      // 7. 学习和更新模型
      if (this.learningEnabled) {
        await this.updateModels(transaction, analysisResult);
      }

      // 发出分析完成事件
      this.emit('analysisComplete', analysisResult);

      return analysisResult;
    } catch (error) {
      console.error('风险分析失败:', error);
      throw error;
    }
  }

  // 异常检测
  async detectAnomalies(transaction, context) {
    const anomalies = [];

    for (const [type, detector] of this.anomalyDetectors) {
      try {
        const result = await detector.detect(transaction, context, this.historicalData);
        if (result.isAnomalous) {
          anomalies.push({
            type: type,
            severity: result.severity,
            description: result.description,
            score: result.score,
            evidence: result.evidence
          });
        }
      } catch (error) {
        console.error(`异常检测失败 (${type}):`, error);
      }
    }

    return anomalies;
  }

  // 风险因子分析
  async analyzeRiskFactors(transaction, context) {
    const factors = [];

    // 交易金额风险
    const valueRisk = this.analyzeValueRisk(transaction);
    if (valueRisk.score > 0) {
      factors.push(valueRisk);
    }

    // 地址风险
    const addressRisk = await this.analyzeAddressRisk(transaction, context);
    factors.push(...addressRisk);

    // 时间风险
    const timeRisk = this.analyzeTimeRisk(transaction);
    if (timeRisk.score > 0) {
      factors.push(timeRisk);
    }

    // 网络风险
    const networkRisk = this.analyzeNetworkRisk(transaction, context);
    if (networkRisk.score > 0) {
      factors.push(networkRisk);
    }

    return factors;
  }

  // 交易金额风险分析
  analyzeValueRisk(transaction) {
    const value = parseFloat(transaction.value || 0);
    const valueEth = value / Math.pow(10, 18);
    
    let score = 0;
    let description = '';

    if (valueEth > 1000) {
      score = 40;
      description = `超大额交易: ${valueEth.toFixed(2)} ETH`;
    } else if (valueEth > 100) {
      score = 25;
      description = `大额交易: ${valueEth.toFixed(2)} ETH`;
    } else if (valueEth > 10) {
      score = 10;
      description = `中等金额交易: ${valueEth.toFixed(2)} ETH`;
    }

    return {
      type: 'transaction_value',
      score: score,
      description: description,
      details: { valueEth: valueEth }
    };
  }

  // 地址风险分析
  async analyzeAddressRisk(transaction, context) {
    const risks = [];

    // 发送方风险
    if (context.fromAddressInfo) {
      const fromRisk = this.evaluateAddressRisk(transaction.from, context.fromAddressInfo, 'sender');
      if (fromRisk.score > 0) {
        risks.push(fromRisk);
      }
    }

    // 接收方风险
    if (transaction.to && context.toAddressInfo) {
      const toRisk = this.evaluateAddressRisk(transaction.to, context.toAddressInfo, 'receiver');
      if (toRisk.score > 0) {
        risks.push(toRisk);
      }
    }

    return risks;
  }

  // 评估单个地址风险
  evaluateAddressRisk(address, addressInfo, role) {
    let score = 0;
    const factors = [];

    // 新地址风险
    if (addressInfo.transactionCount < 5) {
      score += 15;
      factors.push('新地址');
    }

    // 合约地址风险
    if (addressInfo.isContract) {
      score += 10;
      factors.push('智能合约');
    }

    // 余额异常
    const balanceEth = parseFloat(addressInfo.balanceEth);
    if (balanceEth > 10000) {
      score += 20;
      factors.push('高余额地址');
    } else if (balanceEth < 0.001 && addressInfo.transactionCount > 100) {
      score += 15;
      factors.push('低余额高活跃地址');
    }

    return {
      type: `address_risk_${role}`,
      score: score,
      description: `${role === 'sender' ? '发送方' : '接收方'}地址风险: ${factors.join(', ')}`,
      details: { address: address, factors: factors }
    };
  }

  // 时间风险分析
  analyzeTimeRisk(transaction) {
    const timestamp = transaction.timestamp || transaction.blockTimestamp || Date.now() / 1000;
    const date = new Date(timestamp * 1000);
    const hour = date.getHours();
    const dayOfWeek = date.getDay();

    let score = 0;
    const factors = [];

    // 深夜交易
    if (hour >= 2 && hour <= 5) {
      score += 15;
      factors.push('深夜时段');
    }

    // 周末交易
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      score += 5;
      factors.push('周末');
    }

    return {
      type: 'time_pattern',
      score: score,
      description: `时间模式风险: ${factors.join(', ')}`,
      details: { hour: hour, dayOfWeek: dayOfWeek }
    };
  }

  // 网络风险分析
  analyzeNetworkRisk(transaction, context) {
    let score = 0;
    const factors = [];

    // Gas价格异常
    if (context.networkStats) {
      const gasPrice = parseInt(transaction.gasPrice || 0);
      const avgGasPrice = parseInt(context.networkStats.gasPrice || 0);
      
      if (gasPrice > avgGasPrice * 5) {
        score += 20;
        factors.push('异常高Gas价格');
      } else if (gasPrice < avgGasPrice * 0.1) {
        score += 10;
        factors.push('异常低Gas价格');
      }
    }

    return {
      type: 'network_risk',
      score: score,
      description: `网络风险: ${factors.join(', ')}`,
      details: { factors: factors }
    };
  }

  // 综合风险评分计算
  async calculateCompositeRisk(transaction, anomalies, riskFactors) {
    const compositeModel = this.riskModels.get('composite');
    const mlModel = this.riskModels.get('ml_classifier');

    // 基础评分（基于规则）
    let baseScore = 0;
    anomalies.forEach(anomaly => {
      baseScore += anomaly.score * 0.6; // 异常权重
    });
    
    riskFactors.forEach(factor => {
      baseScore += factor.score * 0.4; // 风险因子权重
    });

    // ML模型评分
    let mlScore = 0;
    let mlConfidence = 0;
    
    try {
      const mlResult = await mlModel.predict(transaction, anomalies, riskFactors);
      mlScore = mlResult.score;
      mlConfidence = mlResult.confidence;
    } catch (error) {
      console.error('ML模型预测失败:', error);
      mlConfidence = 0.5; // 默认置信度
    }

    // 综合评分
    const finalScore = Math.min(100, Math.max(0, 
      baseScore * 0.7 + mlScore * 0.3
    ));

    // 计算置信度
    const confidence = Math.min(1, Math.max(0.1,
      mlConfidence * 0.6 + (anomalies.length > 0 ? 0.8 : 0.4) * 0.4
    ));

    return {
      score: Math.round(finalScore),
      confidence: Math.round(confidence * 100) / 100,
      baseScore: Math.round(baseScore),
      mlScore: Math.round(mlScore)
    };
  }

  // 风险等级分类
  classifyRiskLevel(score) {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    if (score >= 20) return 'low';
    return 'minimal';
  }

  // 预测分析
  async makePredictions(transaction, context) {
    const predictions = {};

    try {
      // 预测交易成功概率
      predictions.successProbability = await this.predictTransactionSuccess(transaction, context);
      
      // 预测后续风险行为
      predictions.futureRiskProbability = await this.predictFutureRisk(transaction, context);
      
      // 预测相关地址风险
      predictions.relatedAddressRisk = await this.predictRelatedAddressRisk(transaction, context);
    } catch (error) {
      console.error('预测分析失败:', error);
    }

    return predictions;
  }

  // 预测交易成功概率
  async predictTransactionSuccess(transaction, context) {
    // 基于历史数据和当前网络状态预测
    let probability = 0.95; // 基础成功率

    // Gas价格影响
    if (context.networkStats) {
      const gasPrice = parseInt(transaction.gasPrice || 0);
      const avgGasPrice = parseInt(context.networkStats.gasPrice || 0);
      
      if (gasPrice < avgGasPrice * 0.5) {
        probability -= 0.2; // 低Gas价格降低成功率
      }
    }

    // 余额检查
    if (context.fromAddressInfo) {
      const balance = parseFloat(context.fromAddressInfo.balance || 0);
      const value = parseFloat(transaction.value || 0);
      const estimatedGasCost = parseInt(transaction.gas || 21000) * parseInt(transaction.gasPrice || 0);
      
      if (balance < value + estimatedGasCost) {
        probability = 0.1; // 余额不足
      }
    }

    return Math.max(0, Math.min(1, probability));
  }

  // 预测未来风险
  async predictFutureRisk(transaction, context) {
    // 基于当前交易模式预测未来24小时内的风险概率
    let riskProbability = 0.1; // 基础风险概率

    // 大额交易增加未来风险
    const valueEth = parseFloat(transaction.value || 0) / Math.pow(10, 18);
    if (valueEth > 100) {
      riskProbability += 0.3;
    }

    // 新地址增加风险
    if (context.fromAddressInfo && context.fromAddressInfo.transactionCount < 10) {
      riskProbability += 0.2;
    }

    return Math.max(0, Math.min(1, riskProbability));
  }

  // 预测相关地址风险
  async predictRelatedAddressRisk(transaction, context) {
    const relatedRisks = {};

    // 分析发送方相关风险
    if (transaction.from) {
      relatedRisks.sender = await this.analyzeAddressNetwork(transaction.from, context);
    }

    // 分析接收方相关风险
    if (transaction.to) {
      relatedRisks.receiver = await this.analyzeAddressNetwork(transaction.to, context);
    }

    return relatedRisks;
  }

  // 分析地址网络风险
  async analyzeAddressNetwork(address, context) {
    // 这里可以实现更复杂的地址关联分析
    return {
      riskScore: 0.1,
      relatedAddresses: [],
      suspiciousPatterns: []
    };
  }

  // 生成安全建议
  generateRecommendations(analysisResult) {
    const recommendations = [];

    if (analysisResult.riskLevel === 'critical') {
      recommendations.push('立即停止交易并进行人工审核');
      recommendations.push('联系安全团队进行详细调查');
      recommendations.push('考虑冻结相关账户');
    } else if (analysisResult.riskLevel === 'high') {
      recommendations.push('需要额外验证步骤');
      recommendations.push('增加监控频率');
      recommendations.push('记录详细日志用于后续分析');
    } else if (analysisResult.riskLevel === 'medium') {
      recommendations.push('建议谨慎处理');
      recommendations.push('监控后续交易活动');
    } else {
      recommendations.push('风险较低，可正常处理');
    }

    // 基于具体异常添加建议
    analysisResult.anomalies.forEach(anomaly => {
      switch (anomaly.type) {
        case 'transaction_value':
          recommendations.push('验证大额交易的合理性');
          break;
        case 'gas_price':
          recommendations.push('检查Gas价格设置是否合理');
          break;
        case 'time_pattern':
          recommendations.push('关注非常规时间的交易活动');
          break;
      }
    });

    return [...new Set(recommendations)]; // 去重
  }

  // 更新模型（机器学习）
  async updateModels(transaction, analysisResult) {
    try {
      // 更新历史数据
      this.updateHistoricalData(transaction, analysisResult);
      
      // 更新异常检测器
      for (const [type, detector] of this.anomalyDetectors) {
        if (detector.learn) {
          await detector.learn(transaction, analysisResult);
        }
      }

      // 更新ML模型
      const mlModel = this.riskModels.get('ml_classifier');
      if (mlModel.learn) {
        await mlModel.learn(transaction, analysisResult);
      }
    } catch (error) {
      console.error('模型更新失败:', error);
    }
  }

  // 更新历史数据
  updateHistoricalData(transaction, analysisResult) {
    const key = `${transaction.from}_${transaction.to}`;
    
    if (!this.historicalData.has(key)) {
      this.historicalData.set(key, []);
    }
    
    const history = this.historicalData.get(key);
    history.push({
      transaction: transaction,
      analysis: analysisResult,
      timestamp: Date.now()
    });

    // 保持历史数据在合理范围内
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
  }

  // 获取分析统计
  getAnalysisStats() {
    return {
      historicalDataSize: this.historicalData.size,
      detectorCount: this.anomalyDetectors.size,
      modelCount: this.riskModels.size,
      learningEnabled: this.learningEnabled
    };
  }
}

// 异常检测器基类
class AnomalyDetector {
  constructor() {
    this.threshold = 0.5;
    this.historicalStats = new Map();
  }

  async detect(transaction, context, historicalData) {
    throw new Error('detect方法需要被子类实现');
  }

  async learn(transaction, analysisResult) {
    // 可选的学习方法
  }
}

// 交易金额异常检测器
class TransactionValueDetector extends AnomalyDetector {
  async detect(transaction, context, historicalData) {
    const value = parseFloat(transaction.value || 0) / Math.pow(10, 18);
    
    // 简单的阈值检测
    const isAnomalous = value > 1000;
    
    return {
      isAnomalous: isAnomalous,
      severity: isAnomalous ? (value > 10000 ? 'high' : 'medium') : 'low',
      description: isAnomalous ? `异常大额交易: ${value.toFixed(2)} ETH` : '正常交易金额',
      score: isAnomalous ? Math.min(50, value / 100) : 0,
      evidence: { value: value, threshold: 1000 }
    };
  }
}

// Gas价格异常检测器
class GasPriceDetector extends AnomalyDetector {
  async detect(transaction, context, historicalData) {
    const gasPrice = parseInt(transaction.gasPrice || 0);
    const normalGasPrice = 20000000000; // 20 Gwei
    
    const ratio = gasPrice / normalGasPrice;
    const isAnomalous = ratio > 5 || ratio < 0.1;
    
    return {
      isAnomalous: isAnomalous,
      severity: ratio > 10 || ratio < 0.05 ? 'high' : 'medium',
      description: isAnomalous ? `异常Gas价格: ${ratio.toFixed(2)}x 正常值` : '正常Gas价格',
      score: isAnomalous ? Math.min(30, Math.abs(Math.log10(ratio)) * 10) : 0,
      evidence: { gasPrice: gasPrice, normalGasPrice: normalGasPrice, ratio: ratio }
    };
  }
}

// 时间模式异常检测器
class TimePatternDetector extends AnomalyDetector {
  async detect(transaction, context, historicalData) {
    const timestamp = transaction.timestamp || transaction.blockTimestamp || Date.now() / 1000;
    const date = new Date(timestamp * 1000);
    const hour = date.getHours();
    
    const isAnomalous = hour >= 2 && hour <= 5;
    
    return {
      isAnomalous: isAnomalous,
      severity: 'medium',
      description: isAnomalous ? `深夜交易: ${hour}:00` : '正常时间交易',
      score: isAnomalous ? 15 : 0,
      evidence: { hour: hour, timestamp: timestamp }
    };
  }
}

// 地址行为异常检测器
class AddressBehaviorDetector extends AnomalyDetector {
  async detect(transaction, context, historicalData) {
    let isAnomalous = false;
    let score = 0;
    const factors = [];

    if (context.fromAddressInfo && context.fromAddressInfo.transactionCount < 5) {
      isAnomalous = true;
      score += 15;
      factors.push('发送方为新地址');
    }

    if (context.toAddressInfo && context.toAddressInfo.transactionCount < 5) {
      isAnomalous = true;
      score += 10;
      factors.push('接收方为新地址');
    }

    return {
      isAnomalous: isAnomalous,
      severity: score > 20 ? 'high' : 'medium',
      description: isAnomalous ? `地址行为异常: ${factors.join(', ')}` : '正常地址行为',
      score: score,
      evidence: { factors: factors }
    };
  }
}

// 合约交互异常检测器
class ContractInteractionDetector extends AnomalyDetector {
  async detect(transaction, context, historicalData) {
    const isContractInteraction = context.toAddressInfo && context.toAddressInfo.isContract;
    
    if (!isContractInteraction) {
      return {
        isAnomalous: false,
        severity: 'low',
        description: '普通转账交易',
        score: 0,
        evidence: {}
      };
    }

    let score = 10; // 基础合约交互分数
    const factors = ['智能合约交互'];

    // 分析输入数据复杂度
    if (transaction.input && transaction.input.length > 1000) {
      score += 15;
      factors.push('复杂合约调用');
    }

    return {
      isAnomalous: score > 15,
      severity: score > 25 ? 'high' : 'medium',
      description: `合约交互: ${factors.join(', ')}`,
      score: score,
      evidence: { factors: factors, inputLength: transaction.input ? transaction.input.length : 0 }
    };
  }
}

// 综合风险模型
class CompositeRiskModel {
  constructor(weights) {
    this.weights = weights || {
      transactionValue: 0.3,
      gasPrice: 0.2,
      addressBehavior: 0.25,
      contractInteraction: 0.15,
      timePattern: 0.1
    };
  }

  calculateScore(anomalies, riskFactors) {
    let totalScore = 0;
    
    // 基于异常计算分数
    anomalies.forEach(anomaly => {
      const weight = this.weights[anomaly.type] || 0.1;
      totalScore += anomaly.score * weight;
    });

    // 基于风险因子计算分数
    riskFactors.forEach(factor => {
      const weight = this.weights[factor.type] || 0.1;
      totalScore += factor.score * weight;
    });

    return Math.min(100, Math.max(0, totalScore));
  }
}

// 机器学习分类器（简化版本）
class MLClassifier {
  constructor() {
    this.model = null;
    this.trainingData = [];
  }

  async predict(transaction, anomalies, riskFactors) {
    // 简化的预测逻辑
    // 在实际应用中，这里会使用真正的ML模型
    
    const features = this.extractFeatures(transaction, anomalies, riskFactors);
    const score = this.simpleClassify(features);
    
    return {
      score: score,
      confidence: 0.7 // 简化的置信度
    };
  }

  extractFeatures(transaction, anomalies, riskFactors) {
    return {
      valueLog: Math.log10(parseFloat(transaction.value || 1) / Math.pow(10, 18) + 1),
      gasPriceLog: Math.log10(parseInt(transaction.gasPrice || 1)),
      anomalyCount: anomalies.length,
      riskFactorCount: riskFactors.length,
      hasContractInteraction: anomalies.some(a => a.type === 'contract_interaction')
    };
  }

  simpleClassify(features) {
    // 简化的分类逻辑
    let score = 0;
    
    score += features.valueLog * 10;
    score += features.anomalyCount * 15;
    score += features.riskFactorCount * 10;
    score += features.hasContractInteraction ? 20 : 0;
    
    return Math.min(100, Math.max(0, score));
  }

  async learn(transaction, analysisResult) {
    // 简化的学习逻辑
    this.trainingData.push({
      transaction: transaction,
      result: analysisResult
    });

    // 保持训练数据在合理范围内
    if (this.trainingData.length > 1000) {
      this.trainingData.splice(0, this.trainingData.length - 1000);
    }
  }
}

module.exports = AIRiskAnalyzer;