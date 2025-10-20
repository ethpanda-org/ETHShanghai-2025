/**
 * 根据平台验证输入字段
 */

// 各平台所需字段定义
const platformFields = {
  propertyfy: {
    required: [
      // KYC
      'actualAge', 'actualCountry', 'kycLevel',
      // Asset
      'actualNetWorth', 'actualLiquidAssets', 'isAccreditedInvestor', 'incomeLast12Months',
      // Common
      'credentialHash', 'secret',
      'minAge', 'allowedCountry', 'minKycLevel',
      'minNetWorth', 'minLiquidAssets', 'requireAccredited', 'minIncome',
      'walletAddress', 'timestamp'
    ],
    unnecessary: ['amlRiskScore', 'isOnSanctionsList', 'isPEP', 'sourceOfFundsVerified', 'transactionPatternScore', 'maxAMLRiskScore', 'allowPEP', 'requireFundsVerification', 'minTransactionScore']
  },
  
  realt: {
    required: [
      // KYC
      'actualAge', 'actualCountry', 'kycLevel',
      // AML
      'amlRiskScore', 'isOnSanctionsList', 'isPEP', 'sourceOfFundsVerified', 'transactionPatternScore',
      // Common
      'credentialHash', 'secret',
      'minAge', 'allowedCountry', 'minKycLevel',
      'maxAMLRiskScore', 'allowPEP', 'requireFundsVerification', 'minTransactionScore',
      'walletAddress', 'timestamp'
    ],
    unnecessary: ['actualNetWorth', 'actualLiquidAssets', 'isAccreditedInvestor', 'incomeLast12Months', 'minNetWorth', 'minLiquidAssets', 'requireAccredited', 'minIncome']
  },
  
  realestate: {
    required: [
      // KYC
      'actualAge', 'actualCountry', 'kycLevel',
      // Asset
      'actualNetWorth', 'actualLiquidAssets', 'isAccreditedInvestor', 'incomeLast12Months',
      // AML
      'amlRiskScore', 'isOnSanctionsList', 'isPEP', 'sourceOfFundsVerified', 'transactionPatternScore',
      // Common
      'credentialHash', 'secret',
      'minAge', 'allowedCountry', 'minKycLevel',
      'minNetWorth', 'minLiquidAssets', 'requireAccredited', 'minIncome',
      'maxAMLRiskScore', 'allowPEP', 'requireFundsVerification', 'minTransactionScore',
      'walletAddress', 'timestamp'
    ],
    unnecessary: []
  }
};

/**
 * 验证并清理输入字段
 */
export function validateAndCleanFields(platform, zkInput) {
  const config = platformFields[platform];
  if (!config) {
    throw new Error(`不支持的平台: ${platform}`);
  }

  // 移除不必要的字段
  config.unnecessary.forEach(field => {
    if (zkInput[field] !== undefined) {
      console.log(`⚠️ 移除 ${platform} 不需要的字段: ${field}`);
      delete zkInput[field];
    }
  });

  // 检查缺失的字段
  const missingFields = [];
  for (const field of config.required) {
    if (zkInput[field] === undefined || zkInput[field] === null) {
      missingFields.push(field);
    }
  }

  if (missingFields.length > 0) {
    return {
      valid: false,
      missingFields,
      receivedFields: Object.keys(zkInput)
    };
  }

  return {
    valid: true,
    cleanedInput: zkInput
  };
}

/**
 * 获取平台所需字段列表
 */
export function getPlatformFields(platform) {
  return platformFields[platform] || null;
}

