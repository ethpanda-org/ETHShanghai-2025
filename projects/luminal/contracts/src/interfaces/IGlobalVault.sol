// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IGlobalVault
 * @notice 全局隐藏金库接口
 * @dev 托管所有 ERC20 代币，管理池子承诺状态
 */
interface IGlobalVault {
    // ============ Events ============
    
    /// @notice 池子初始化事件
    event PoolInitialized(
        bytes32 indexed initialCommitment,
        uint256 amount0,
        uint256 amount1
    );
    
    /// @notice 用户充值事件
    event Deposit(
        address indexed user,
        uint8 indexed tokenId,
        uint256 amount
    );
    
    /// @notice 用户提现事件
    event Withdraw(
        address indexed user,
        uint8 indexed tokenId,
        uint256 amount
    );
    
    /// @notice 承诺更新事件
    event CommitmentUpdated(
        bytes32 indexed oldCommitment,
        bytes32 indexed newCommitment
    );

    // ============ State Queries ============
    
    /// @notice 获取当前池子承诺
    function currentCommitment() external view returns (bytes32);
    
    /// @notice 检查 nonce 是否已使用
    function isNonceUsed(uint256 nonce) external view returns (bool);
    
    /// @notice 获取用户余额
    /// @param user 用户地址
    /// @param tokenId 代币 ID (0=WETH, 1=USDC)
    function getUserBalance(address user, uint8 tokenId) external view returns (uint256);

    // ============ State Mutations ============
    
    /// @notice 初始化池子（仅一次）
    /// @param initialCommitment 初始承诺值
    /// @param amount0 WETH 初始数量
    /// @param amount1 USDC 初始数量
    function initializePool(
        bytes32 initialCommitment,
        uint256 amount0,
        uint256 amount1
    ) external;
    
    /// @notice 更新承诺（仅 AMM 合约可调用）
    /// @param newCommitment 新的承诺值
    function updateCommitment(bytes32 newCommitment) external;
    
    /// @notice 标记 nonce 已使用（仅 AMM 合约可调用）
    /// @param nonce 要标记的 nonce
    function markNonceUsed(uint256 nonce) external;
    
    /// @notice 用户充值代币
    /// @param tokenId 代币 ID (0=WETH, 1=USDC)
    /// @param amount 充值数量
    function deposit(uint8 tokenId, uint256 amount) external payable;
    
    /// @notice 用户提现代币
    /// @param tokenId 代币 ID (0=WETH, 1=USDC)
    /// @param amount 提现数量
    function withdraw(uint8 tokenId, uint256 amount) external;
}
