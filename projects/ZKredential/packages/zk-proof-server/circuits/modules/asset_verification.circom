pragma circom 2.0.0;

include "circomlib/circuits/comparators.circom";

/**
 * @title Asset Verification Module
 * @dev 独立的资产验证电路模块
 * @notice 验证用户的资产和投资者资格
 */
template AssetVerification() {
    // Private inputs (用户隐私数据)
    signal input actualNetWorth;         // 实际净资产 (USD)
    signal input actualLiquidAssets;     // 实际流动资产 (USD)
    signal input isAccreditedInvestor;   // 是否合格投资者 (0/1)
    signal input incomeLast12Months;     // 过去12个月收入
    
    // Public inputs (平台要求)
    signal input minNetWorth;            // 最小净资产要求
    signal input minLiquidAssets;        // 最小流动资产要求
    signal input requireAccredited;      // 是否要求合格投资者 (0/1)
    signal input minIncome;              // 最小收入要求
    
    // Output signal
    signal output isAssetCompliant;
    
    // 净资产检查: actualNetWorth >= minNetWorth
    component netWorthCheck = GreaterEqThan(64);
    netWorthCheck.in[0] <== actualNetWorth;
    netWorthCheck.in[1] <== minNetWorth;
    
    // 流动资产检查: actualLiquidAssets >= minLiquidAssets
    component liquidAssetsCheck = GreaterEqThan(64);
    liquidAssetsCheck.in[0] <== actualLiquidAssets;
    liquidAssetsCheck.in[1] <== minLiquidAssets;
    
    // 合格投资者检查
    // 如果平台要求合格投资者(requireAccredited=1)，则用户必须是合格投资者
    // 如果平台不要求(requireAccredited=0)，则自动通过
    component accreditedCheck = IsEqual();
    accreditedCheck.in[0] <== isAccreditedInvestor;
    accreditedCheck.in[1] <== 1;
    
    signal accreditedPass;
    // 如果requireAccredited=0，则accreditedPass=1；否则取决于accreditedCheck
    accreditedPass <== 1 - requireAccredited + requireAccredited * accreditedCheck.out;
    
    // 收入检查: incomeLast12Months >= minIncome
    component incomeCheck = GreaterEqThan(64);
    incomeCheck.in[0] <== incomeLast12Months;
    incomeCheck.in[1] <== minIncome;
    
    // 所有资产检查必须通过
    signal netWorthAndLiquid;
    netWorthAndLiquid <== netWorthCheck.out * liquidAssetsCheck.out;
    signal assetsAndAccredited;
    assetsAndAccredited <== netWorthAndLiquid * accreditedPass;
    isAssetCompliant <== assetsAndAccredited * incomeCheck.out;
}



