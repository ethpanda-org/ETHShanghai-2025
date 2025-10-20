pragma circom 2.0.0;

include "modules/kyc_verification.circom";
include "modules/aml_verification.circom";
include "circomlib/circuits/comparators.circom";

/**
 * @title RealT Circuit
 * @dev KYC + 反洗钱验证（加密资产平台）
 */
template RealTCircuit() {
    // 私密输入 - KYC
    signal input actualAge;
    signal input actualCountry;
    signal input kycLevel;
    
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
    
    // 组合结果: KYC AND AML
    isCompliant <== kycVerification.isKYCCompliant * amlVerification.isAMLCompliant;
    
    // 生成commitment和nullifier
    commitment <== credentialHash + secret + walletAddress;
    nullifierHash <== credentialHash + secret;
}

component main {public [
    minAge, allowedCountry, minKycLevel,
    maxAMLRiskScore, allowPEP, requireFundsVerification, minTransactionScore,
    walletAddress, timestamp
]} = RealTCircuit();

