pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/comparators.circom";

/**
 * @title PrivacyAMMSwapCircuit
 * @notice 隐私 AMM 交换电路 - 验证恒定乘积公式
 * @dev 核心约束：
 *      1. 承诺验证：commitmentOld == Poseidon(reserveOld0, reserveOld1, nonceOld, feeOld)
 *      2. 承诺生成：commitmentNew == Poseidon(reserveNew0, reserveNew1, nonceNew, feeNew)
 *      3. 恒定乘积：(reserveOld0 + amountIn) * (reserveOld1 - amountOut) >= reserveOld0 * reserveOld1
 *      4. 储备更新：reserveNew0 = reserveOld0 + amountIn, reserveNew1 = reserveOld1 - amountOut
 *      5. Nonce 递增：nonceNew = nonceOld + 1
 *      6. 手续费：feeNew >= feeOld (链下正确计算 0.3%)
 * 
 * 隐私保证：
 *   - 储备量完全隐藏（只有承诺值暴露）
 *   - 交换金额完全隐藏
 *   - 手续费累计完全隐藏
 *   - 只有承诺值的变化暴露在链上
 */
template PrivacyAMMSwapCircuit() {
    // ============ Private Inputs (隐私输入 - 不会暴露) ============
    
    signal input reserveOld0;    // 旧储备量 0 (WETH) - 隐藏
    signal input reserveOld1;    // 旧储备量 1 (USDC) - 隐藏
    signal input nonceOld;       // 旧 nonce - 防重放
    signal input feeOld;         // 旧累计手续费 - 隐藏
    signal input feeNew;         // 新累计手续费 - 隐藏（链下计算）
    signal input amountIn;       // 输入金额 - 隐藏
    signal input amountOut;      // 输出金额 - 隐藏

    // ============ Public Inputs (公开输入 - 链上可见) ============
    
    signal input commitmentOld;  // 旧承诺（链上已知）
    signal output commitmentNew; // 新承诺（输出到链上）

    // ============ Internal Signals ============
    
    signal reserveNew0;          // 新储备量 0
    signal reserveNew1;          // 新储备量 1
    signal nonceNew;             // 新 nonce

    // 中间计算信号
    signal productOld;           // 旧储备乘积 = r0 * r1
    signal productNew;           // 新储备乘积 = (r0 + amountIn) * (r1 - amountOut)

    // ============ Constraint 1: 验证旧承诺 ============
    // commitmentOld 必须等于 Poseidon(reserveOld0, reserveOld1, nonceOld, feeOld)
    
    component poseidonOld = Poseidon(4);
    poseidonOld.inputs[0] <== reserveOld0;
    poseidonOld.inputs[1] <== reserveOld1;
    poseidonOld.inputs[2] <== nonceOld;
    poseidonOld.inputs[3] <== feeOld;
    
    // 约束：输入的 commitmentOld 必须匹配
    commitmentOld === poseidonOld.out;

    // ============ Constraint 2: 计算新储备量 ============
    
    reserveNew0 <== reserveOld0 + amountIn;   // WETH 增加
    reserveNew1 <== reserveOld1 - amountOut;  // USDC 减少

    // ============ Constraint 3: 恒定乘积公式验证 ============
    // (r0 + amountIn) * (r1 - amountOut) >= r0 * r1
    // 为了避免除法，我们验证新乘积不小于旧乘积
    
    productOld <== reserveOld0 * reserveOld1;
    productNew <== reserveNew0 * reserveNew1;
    
    // 使用比较器验证 productNew >= productOld
    component gte = GreaterEqThan(252);  // 252 bits 足够容纳大数
    gte.in[0] <== productNew;
    gte.in[1] <== productOld;
    gte.out === 1;  // 必须满足 productNew >= productOld

    // ============ Constraint 4: Nonce 递增 ============
    
    nonceNew <== nonceOld + 1;

    // ============ Constraint 5: 手续费验证 ============
    // 验证 feeNew >= feeOld (链下正确计算 0.3% 手续费)
    
    component feeGte = GreaterEqThan(252);
    feeGte.in[0] <== feeNew;
    feeGte.in[1] <== feeOld;
    feeGte.out === 1;  // feeNew >= feeOld

    // ============ Constraint 6: 生成新承诺 ============
    // commitmentNew = Poseidon(reserveNew0, reserveNew1, nonceNew, feeNew)
    
    component poseidonNew = Poseidon(4);
    poseidonNew.inputs[0] <== reserveNew0;
    poseidonNew.inputs[1] <== reserveNew1;
    poseidonNew.inputs[2] <== nonceNew;
    poseidonNew.inputs[3] <== feeNew;
    
    commitmentNew <== poseidonNew.out;

    // ============ 额外约束：范围检查 ============
    // 确保金额为正数（防止溢出攻击）
    
    component amountInPositive = GreaterThan(252);
    amountInPositive.in[0] <== amountIn;
    amountInPositive.in[1] <== 0;
    amountInPositive.out === 1;
    
    component amountOutPositive = GreaterThan(252);
    amountOutPositive.in[0] <== amountOut;
    amountOutPositive.in[1] <== 0;
    amountOutPositive.out === 1;
    
    // 确保新储备量大于 0（防止耗尽攻击）
    component reserveNew0Positive = GreaterThan(252);
    reserveNew0Positive.in[0] <== reserveNew0;
    reserveNew0Positive.in[1] <== 0;
    reserveNew0Positive.out === 1;
    
    component reserveNew1Positive = GreaterThan(252);
    reserveNew1Positive.in[0] <== reserveNew1;
    reserveNew1Positive.in[1] <== 0;
    reserveNew1Positive.out === 1;
}

// ============ Main Component ============

component main {public [commitmentOld]} = PrivacyAMMSwapCircuit();
