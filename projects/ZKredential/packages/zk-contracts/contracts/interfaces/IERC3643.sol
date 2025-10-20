// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IERC3643
 * @dev ERC-3643标准接口定义
 */
interface IERC3643 {
    
    // ============ ERC-20基础接口 ============
    // Note: ERC-20 functions are inherited from OpenZeppelin's ERC20 contract

    // ============ ERC-3643核心接口 ============
    
    /**
     * @dev 检查转账是否被允许
     * @param from 发送方地址
     * @param to 接收方地址
     * @param amount 转账金额
     * @return 是否允许转账
     */
    function canTransfer(address from, address to, uint256 amount) external view returns (bool);
    
    /**
     * @dev 获取身份注册表合约地址
     * @return 身份注册表地址
     */
    function identityRegistry() external view returns (address);
    
    /**
     * @dev 获取合规模块合约地址
     * @return 合规模块地址
     */
    function compliance() external view returns (address);
    
    // ============ 地址冻结接口 ============
    
    /**
     * @dev 检查地址是否被冻结
     * @param addr 要检查的地址
     * @return 是否被冻结
     */
    function isFrozen(address addr) external view returns (bool);
    
    /**
     * @dev 冻结地址
     * @param addr 要冻结的地址
     */
    function freezeAddress(address addr) external;
    
    /**
     * @dev 解冻地址
     * @param addr 要解冻的地址
     */
    function unfreezeAddress(address addr) external;
    
    /**
     * @dev 批量冻结地址
     * @param addresses 要冻结的地址数组
     */
    function batchFreezeAddresses(address[] memory addresses) external;
    
    /**
     * @dev 批量解冻地址
     * @param addresses 要解冻的地址数组
     */
    function batchUnfreezeAddresses(address[] memory addresses) external;
    
    // ============ 强制转账接口 ============
    
    /**
     * @dev 强制转账（监管需要）
     * @param from 发送方地址
     * @param to 接收方地址
     * @param amount 转账金额
     * @return 是否成功
     */
    function forcedTransfer(address from, address to, uint256 amount) external returns (bool);
    
    // ============ 事件 ============
    
    // Note: Transfer and Approval events are inherited from ERC20
    event AddressFrozen(address indexed addr, bool indexed isFrozen);
    event ComplianceAdded(address indexed compliance);
    event IdentityRegistryAdded(address indexed identityRegistry);
}