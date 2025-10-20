pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/bitify.circom";
include "./ecdsa.circom";
include "./zk-identity/eth.circom";

/**
 * WealthProof - 零知识财富证明电路
 * 
 * 基于 ECDSA 签名验证方案（经密码学专家确认的唯一可行方案）
 * 
 * 核心理念：
 * - Bob_real 在 MetaMask 中签名（私钥不离开钱包）
 * - ZK 电路验证签名有效性
 * - 证明：签名对应的地址在钱包池中，且余额 >= 阈值
 * - 隐私：不暴露具体是哪个地址（walletIndex 是私有输入）
 * 
 * 技术参数：
 * - 约束数：~1,500,000（主要来自 ECDSA 签名验证）
 * - 证明时间：30-60 秒（浏览器端）
 * - 瓶颈：secp256k1 non-native field arithmetic on BN254
 * 
 * 私有输入：
 *   - r[k], s[k]: ECDSA 签名 (来自 MetaMask)
 *   - pubkey[2][k]: Bob 的公钥坐标
 *   - walletIndex: Bob 在钱包池中的位置（0-31）
 * 
 * 公开输入：
 *   - msghash[k]: 签名的消息哈希
 *   - addresses[32]: 钱包池地址数组（以太坊地址）
 *   - balances[32]: 对应的余额数组
 *   - threshold: 最低余额阈值
 * 
 * 参考：circom-ecdsa (0xPARC)
 * Hackathon 策略：接受 30-60s，优化用户体验
 * 长期路线：迁移到 Halo2 降至 ~200k 约束
 */

template WealthProof(n, k) {
    assert(n == 64);
    assert(k == 4);
    
    // 常量定义
    var POOL_SIZE = 32;  // 钱包池大小
    
    // ========== 输入定义 ==========
    
    // 私有输入：ECDSA 签名组件
    signal input r[k];           // 签名 r 分量（4 x 64-bit limbs）
    signal input s[k];           // 签名 s 分量（4 x 64-bit limbs）
    signal input pubkey[2][k];   // 公钥坐标 (x, y)，各 4 x 64-bit limbs
    signal input walletIndex;    // Bob 在池中的位置（0-31）
    
    // 公开输入
    signal input msghash[k];            // 消息哈希（4 x 64-bit limbs）
    signal input addresses[POOL_SIZE];  // 钱包池地址数组（以太坊地址，160-bit）
    signal input balances[POOL_SIZE];   // 余额数组
    signal input threshold;             // 最低余额阈值
    
    // ========== 约束 1: ECDSA 签名验证 ==========
    // 验证签名 (r, s) 对消息 msghash 和公钥 pubkey 有效
    // 使用 circom-ecdsa 的 ECDSAVerifyNoPubkeyCheck
    // 约束数：~1,500,000（主要瓶颈）
    
    component sigVerifier = ECDSAVerifyNoPubkeyCheck(n, k);
    for (var i = 0; i < k; i++) {
        sigVerifier.r[i] <== r[i];
        sigVerifier.s[i] <== s[i];
        sigVerifier.msghash[i] <== msghash[i];
        sigVerifier.pubkey[0][i] <== pubkey[0][i];
        sigVerifier.pubkey[1][i] <== pubkey[1][i];
    }
    
    // 签名必须有效
    sigVerifier.result === 1;
    
    // ========== 约束 2: 公钥转以太坊地址 ==========
    // pubkey → keccak256 → address
    // 约束数：~150,000（Keccak256 哈希）
    
    // 将分块的公钥展平为 512-bit 数组
    component flattenPubkey = FlattenPubkey(n, k);
    for (var i = 0; i < k; i++) {
        flattenPubkey.chunkedPubkey[0][i] <== pubkey[0][i];
        flattenPubkey.chunkedPubkey[1][i] <== pubkey[1][i];
    }
    
    // 将公钥转为以太坊地址
    component pubkeyToAddr = PubkeyToAddress();
    for (var i = 0; i < 512; i++) {
        pubkeyToAddr.pubkeyBits[i] <== flattenPubkey.pubkeyBits[i];
    }
    
    signal myAddress;
    myAddress <== pubkeyToAddr.address;
    
    // ========== 约束 3: 索引范围检查 ==========
    // walletIndex 必须在 [0, 31] 范围内
    // 约束数：~100
    
    component indexBits = Num2Bits(5);
    indexBits.in <== walletIndex;
    
    component indexCheck = LessThan(8);
    indexCheck.in[0] <== walletIndex;
    indexCheck.in[1] <== POOL_SIZE;
    indexCheck.out === 1;
    
    // ========== 约束 4: 地址选择器（32 选 1）==========
    // 从 addresses 数组中选择 walletIndex 对应的地址和余额
    // 约束数：~500
    
    signal selectedAddress;
    signal selectedBalance;
    
    // 生成 32 个选择器信号，只有 walletIndex 位置为 1
    signal selector[POOL_SIZE];
    
    component isEqual[POOL_SIZE];
    for (var i = 0; i < POOL_SIZE; i++) {
        isEqual[i] = IsEqual();
        isEqual[i].in[0] <== i;
        isEqual[i].in[1] <== walletIndex;
        selector[i] <== isEqual[i].out;
    }
    
    // 验证恰好有一个选择器为 1
    signal selectorSum[POOL_SIZE];
    selectorSum[0] <== selector[0];
    for (var i = 1; i < POOL_SIZE; i++) {
        selectorSum[i] <== selectorSum[i-1] + selector[i];
    }
    selectorSum[POOL_SIZE-1] === 1;
    
    // 选择对应的地址和余额
    signal addressAcc[POOL_SIZE];
    signal balanceAcc[POOL_SIZE];
    
    addressAcc[0] <== selector[0] * addresses[0];
    balanceAcc[0] <== selector[0] * balances[0];
    
    for (var i = 1; i < POOL_SIZE; i++) {
        addressAcc[i] <== addressAcc[i-1] + selector[i] * addresses[i];
        balanceAcc[i] <== balanceAcc[i-1] + selector[i] * balances[i];
    }
    
    selectedAddress <== addressAcc[POOL_SIZE-1];
    selectedBalance <== balanceAcc[POOL_SIZE-1];
    
    // ========== 约束 5: 地址匹配验证 ==========
    // myAddress（从签名的公钥推导） == selectedAddress（从池中选择）
    // 约束数：~10
    
    component addressMatch = IsEqual();
    addressMatch.in[0] <== myAddress;
    addressMatch.in[1] <== selectedAddress;
    addressMatch.out === 1;
    
    // ========== 约束 6: 余额阈值检查 ==========
    // selectedBalance >= threshold
    // 约束数：~300
    
    component balanceCheck = GreaterEqThan(252);
    balanceCheck.in[0] <== selectedBalance;
    balanceCheck.in[1] <== threshold;
    balanceCheck.out === 1;
}

// 主组件
// 私有输入：r, s, pubkey, walletIndex
// 公开输入：msghash, addresses, balances, threshold
component main {public [msghash, addresses, balances, threshold]} = WealthProof(64, 4);
