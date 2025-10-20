// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IPrivacyAMM.sol";
import "./interfaces/IGlobalVault.sol";
import "./interfaces/IGroth16Verifier.sol";

/**
 * @title PrivacyAMM
 * @notice 隐私自动做市商 - 基于 ZK 证明的 AMM
 * @dev 核心功能：
 *      1. 验证交换证明（proof = 证明了 x*y=k 恒定乘积公式）
 *      2. 更新池子承诺（不泄露储备量）
 *      3. 防重放攻击（nonce 管理）
 *      4. 手续费计算（隐藏在 ZK 电路中）
 * 
 * 工作流程：
 *   Client: 
 *     1. 获取当前承诺 commitmentOld
 *     2. 计算交换后新状态 (r0', r1', nonce', fee')
 *     3. 计算新承诺 commitmentNew = Poseidon(r0', r1', nonce', fee')
 *     4. 生成 ZK 证明：
 *        - Private inputs: r0, r1, nonce, fee, amountIn, amountOut
 *        - Public inputs: commitmentOld, commitmentNew
 *        - Constraints: 
 *          * commitmentOld == Poseidon(r0, r1, nonce, fee)
 *          * commitmentNew == Poseidon(r0', r1', nonce+1, fee')
 *          * (r0 + amountIn) * (r1 - amountOut) >= r0 * r1  (恒定乘积)
 *          * fee' >= fee + 0.3% * amountIn  (手续费累积)
 *   
 *   Contract:
 *     1. 验证 ZK 证明
 *     2. 检查 nonce 未使用
 *     3. 更新承诺到 commitmentNew
 *     4. 标记 nonce 已使用
 */
contract PrivacyAMM is IPrivacyAMM {
    // ============ 状态变量 ============
    
    /// @notice GlobalVault 合约
    IGlobalVault public immutable VAULT;
    
    /// @notice Groth16 验证器合约
    IGroth16Verifier public immutable VERIFIER;
    
    /// @notice 已使用的 nonce 集合
    mapping(uint256 => bool) private _usedNonces;
    
    /// @notice 合约所有者
    address public owner;

    // ============ 修饰符 ============
    
    modifier onlyOwner() {
        require(msg.sender == owner, "PrivacyAMM: not owner");
        _;
    }

    // ============ 构造函数 ============
    
    /**
     * @notice 构造函数
     * @param _vault GlobalVault 合约地址
     * @param _verifier Groth16 验证器合约地址
     */
    constructor(address _vault, address _verifier) {
        require(_vault != address(0), "PrivacyAMM: zero vault address");
        require(_verifier != address(0), "PrivacyAMM: zero verifier address");
        
        VAULT = IGlobalVault(_vault);
        VERIFIER = IGroth16Verifier(_verifier);
        owner = msg.sender;
    }

    // ============ 核心功能 ============
    
    /**
     * @notice 执行隐私交换
     * @dev 验证 ZK 证明并更新池子承诺
     * @param pA 证明点 A [x, y]
     * @param pB 证明点 B [[x1, y1], [x2, y2]]
     * @param pC 证明点 C [x, y]
     * @param commitmentNew 新的池子承诺
     * @param nonce 防重放 nonce
     */
    function swap(
        uint[2] calldata pA,
        uint[2][2] calldata pB,
        uint[2] calldata pC,
        bytes32 commitmentNew,
        uint256 nonce
    ) external override {
        // 1. 检查 nonce 未使用
        require(!_usedNonces[nonce], "PrivacyAMM: nonce already used");
        require(commitmentNew != bytes32(0), "PrivacyAMM: zero commitment");
        
        // 2. 获取旧承诺
        bytes32 commitmentOld = VAULT.currentCommitment();
        require(commitmentOld != bytes32(0), "PrivacyAMM: pool not initialized");
        
        // 3. 验证 ZK 证明
        uint[2] memory pubSignals = [
            uint256(commitmentNew),
            uint256(commitmentOld)
        ];
        
        bool isValid = VERIFIER.verifyProof(pA, pB, pC, pubSignals);
        require(isValid, "PrivacyAMM: invalid proof");
        
        // 4. 更新状态
        VAULT.updateCommitment(commitmentNew);
        VAULT.markNonceUsed(nonce);
        _usedNonces[nonce] = true;
        
        // 5. 发出事件
        emit SwapExecuted(commitmentOld, commitmentNew, nonce, msg.sender);
    }

    // ============ 视图函数 ============
    
    /// @inheritdoc IPrivacyAMM
    function vault() external view override returns (address) {
        return address(VAULT);
    }
    
    /// @inheritdoc IPrivacyAMM
    function verifier() external view override returns (address) {
        return address(VERIFIER);
    }
    
    /**
     * @notice 检查 nonce 是否已使用
     * @param nonce 要检查的 nonce
     * @return 是否已使用
     */
    function isNonceUsed(uint256 nonce) external view returns (bool) {
        return _usedNonces[nonce];
    }
    
    /**
     * @notice 获取当前池子承诺
     * @return 当前承诺
     */
    function getCurrentCommitment() external view returns (bytes32) {
        return VAULT.currentCommitment();
    }

    // ============ 管理函数 ============
    
    /**
     * @notice 初始化池子
     * @dev 仅所有者可调用，设置初始流动性和承诺
     * @param initialCommitment 初始承诺 = Poseidon(r0, r1, 0, 0)
     * @param amount0 WETH 初始数量
     * @param amount1 USDC 初始数量
     */
    function initializePool(
        bytes32 initialCommitment,
        uint256 amount0,
        uint256 amount1
    ) external onlyOwner {
        VAULT.initializePool(initialCommitment, amount0, amount1);
    }

    /**
     * @notice 授权 Vault 拉取指定代币
     * @param token 需要授权的代币地址
     * @param amount 授权数量
     */
    function approveVault(address token, uint256 amount) external onlyOwner {
        require(token != address(0), "PrivacyAMM: zero token address");
        IERC20(token).approve(address(VAULT), amount);
    }
    
    /**
     * @notice 转移所有权
     * @param newOwner 新所有者地址
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "PrivacyAMM: zero address");
        owner = newOwner;
    }
}
