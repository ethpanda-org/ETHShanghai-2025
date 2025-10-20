pragma circom 2.0.0;

include "modules/kyc_verification.circom";
include "modules/asset_verification.circom";
include "modules/aml_verification.circom";
include "circomlib/circuits/comparators.circom";

/**
 * @title RealestateIO Circuit
 * @dev KYC + 资产 + 反洗钱验证（完整合规）
 */
template RealestateIOCircuit() {
    // 私密输入 - KYC
    signal input actualAge;
    signal input actualCountry;
    signal input kycLevel;
    
    // 私密输入 - 资产
    signal input actualNetWorth;
    signal input actualLiquidAssets;
    signal input isAccreditedInvestor;
    signal input incomeLast12Months;
    
    // 私密输入 - AML
    signal input amlRiskScore;
    signal input isOnSanctionsList;
    signal input isPEP;
    signal input sourceOfFundsVerified;
    signal input transactionPatternScore;
    
    // 私密输入 - 身份凭证
    signal input credentialHash;
    signal input secret;
    
    // 公共输入 - KYC要求
    signal input minAge;
    signal input allowedCountry;
    signal input minKycLevel;
    
    // 公共输入 - 资产要求
    signal input minNetWorth;
    signal input minLiquidAssets;
    signal input requireAccredited;
    signal input minIncome;
    
    // 公共输入 - AML要求
    signal input maxAMLRiskScore;
    signal input allowPEP;
    signal input requireFundsVerification;
    signal input minTransactionScore;
    
    // 公共输入 - 通用
    signal input walletAddress;
    signal input timestamp;
    
    // 输出
    signal output commitment;
    signal output nullifierHash;
    signal output isCompliant;
    
    // KYC验证
    component kycVerification = KYCVerification();
    kycVerification.actualAge <== actualAge;
    kycVerification.actualCountry <== actualCountry;
    kycVerification.kycLevel <== kycLevel;
    kycVerification.minAge <== minAge;
    kycVerification.allowedCountry <== allowedCountry;
    kycVerification.minKycLevel <== minKycLevel;
    
    // 资产验证
    component assetVerification = AssetVerification();
    assetVerification.actualNetWorth <== actualNetWorth;
    assetVerification.actualLiquidAssets <== actualLiquidAssets;
    assetVerification.isAccreditedInvestor <== isAccreditedInvestor;
    assetVerification.incomeLast12Months <== incomeLast12Months;
    assetVerification.minNetWorth <== minNetWorth;
    assetVerification.minLiquidAssets <== minLiquidAssets;
    assetVerification.requireAccredited <== requireAccredited;
    assetVerification.minIncome <== minIncome;
    
    // AML验证
    component amlVerification = AMLVerification();
    amlVerification.amlRiskScore <== amlRiskScore;
    amlVerification.isOnSanctionsList <== isOnSanctionsList;
    amlVerification.isPEP <== isPEP;
    amlVerification.sourceOfFundsVerified <== sourceOfFundsVerified;
    amlVerification.transactionPatternScore <== transactionPatternScore;
    amlVerification.maxAMLRiskScore <== maxAMLRiskScore;
    amlVerification.allowPEP <== allowPEP;
    amlVerification.requireFundsVerification <== requireFundsVerification;
    amlVerification.minTransactionScore <== minTransactionScore;
    
    // 组合结果: KYC AND Asset AND AML
    signal kycAndAsset;
    kycAndAsset <== kycVerification.isKYCCompliant * assetVerification.isAssetCompliant;
    isCompliant <== kycAndAsset * amlVerification.isAMLCompliant;
    
    // 生成commitment和nullifier
    commitment <== credentialHash + secret + walletAddress;
    nullifierHash <== credentialHash + secret;
}

component main {public [
    minAge, allowedCountry, minKycLevel,
    minNetWorth, minLiquidAssets, requireAccredited, minIncome,
    maxAMLRiskScore, allowPEP, requireFundsVerification, minTransactionScore,
    walletAddress, timestamp
]} = RealestateIOCircuit();

