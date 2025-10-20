pragma circom 2.0.0;

include "circomlib/circuits/comparators.circom";

/**
 * @title Anti-Money Laundering (AML) Verification Module
 * @dev 独立的反洗钱验证电路模块
 * @notice 验证用户的AML状态和风险评分
 */
template AMLVerification() {
    // Private inputs (用户隐私数据)
    signal input amlRiskScore;           // AML风险评分 (0-100, 越低越好)
    signal input isOnSanctionsList;      // 是否在制裁名单 (0/1)
    signal input isPEP;                  // 是否政治公众人物 (0/1)
    signal input sourceOfFundsVerified;  // 资金来源是否验证 (0/1)
    signal input transactionPatternScore; // 交易模式评分 (0-100)
    
    // Public inputs (平台要求)
    signal input maxAMLRiskScore;        // 最大允许AML风险评分
    signal input allowPEP;               // 是否允许PEP (0/1)
    signal input requireFundsVerification; // 是否要求资金来源验证 (0/1)
    signal input minTransactionScore;    // 最小交易模式评分
    
    // Output signal
    signal output isAMLCompliant;
    
    // AML风险评分检查: amlRiskScore <= maxAMLRiskScore
    component riskScoreCheck = LessEqThan(8);
    riskScoreCheck.in[0] <== amlRiskScore;
    riskScoreCheck.in[1] <== maxAMLRiskScore;
    
    // 制裁名单检查: isOnSanctionsList == 0 (必须不在名单上)
    component sanctionsCheck = IsEqual();
    sanctionsCheck.in[0] <== isOnSanctionsList;
    sanctionsCheck.in[1] <== 0;
    
    // PEP检查
    // 如果平台不允许PEP(allowPEP=0)，则用户不能是PEP
    // 如果平台允许PEP(allowPEP=1)，则自动通过
    component pepCheck = IsEqual();
    pepCheck.in[0] <== isPEP;
    pepCheck.in[1] <== 0;
    
    signal pepPass;
    // 如果allowPEP=1，则pepPass=1；否则取决于pepCheck
    pepPass <== allowPEP + (1 - allowPEP) * pepCheck.out;
    
    // 资金来源验证检查
    // 如果平台要求验证(requireFundsVerification=1)，则必须已验证
    component fundsCheck = IsEqual();
    fundsCheck.in[0] <== sourceOfFundsVerified;
    fundsCheck.in[1] <== 1;
    
    signal fundsPass;
    fundsPass <== 1 - requireFundsVerification + requireFundsVerification * fundsCheck.out;
    
    // 交易模式评分检查: transactionPatternScore >= minTransactionScore
    component transactionCheck = GreaterEqThan(8);
    transactionCheck.in[0] <== transactionPatternScore;
    transactionCheck.in[1] <== minTransactionScore;
    
    // 所有AML检查必须通过
    signal riskAndSanctions;
    riskAndSanctions <== riskScoreCheck.out * sanctionsCheck.out;
    signal amlAndPEP;
    amlAndPEP <== riskAndSanctions * pepPass;
    signal amlFundsAndPattern;
    amlFundsAndPattern <== amlAndPEP * fundsPass;
    isAMLCompliant <== amlFundsAndPattern * transactionCheck.out;
}



