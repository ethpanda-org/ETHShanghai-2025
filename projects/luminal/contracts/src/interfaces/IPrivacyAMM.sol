// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IPrivacyAMM
 * @notice 隐私 AMM 接口
 * @dev 核心功能：验证 ZK 证明并更新池子状态
 */
interface IPrivacyAMM {
    // ============ Events ============
    
    /// @notice 交易执行事件（仅承诺值，不含金额）
    event SwapExecuted(
        bytes32 indexed commitmentOld,
        bytes32 indexed commitmentNew,
        uint256 indexed nonce,
        address trader
    );

    // ============ Core Functions ============
    
    /**
     * @notice 执行隐私交换
     * @dev 验证 ZK 证明并更新承诺
     * @param pA 证明点 A
     * @param pB 证明点 B
     * @param pC 证明点 C
     * @param commitmentNew 新的承诺值
     * @param nonce 防重放 nonce
     */
    function swap(
        uint[2] calldata pA,
        uint[2][2] calldata pB,
        uint[2] calldata pC,
        bytes32 commitmentNew,
        uint256 nonce
    ) external;

    // ============ View Functions ============
    
    /// @notice 获取 Vault 合约地址
    function vault() external view returns (address);
    
    /// @notice 获取 Verifier 合约地址
    function verifier() external view returns (address);
}
