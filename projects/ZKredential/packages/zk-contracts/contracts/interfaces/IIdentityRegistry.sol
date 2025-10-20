// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IIdentityRegistry
 * @dev 身份注册表标准接口
 */
interface IIdentityRegistry {
    
    /**
     * @dev 检查用户是否已验证
     * @param user 用户地址
     * @return 是否已验证
     */
    function isVerified(address user) external view returns (bool);
    
    /**
     * @dev 获取用户身份合约地址
     * @param user 用户地址
     * @return 身份合约地址
     */
    function identity(address user) external view returns (address);
    
    /**
     * @dev 获取用户国家代码
     * @param user 用户地址
     * @return 国家代码 (ISO 3166-1 numeric)
     */
    function investorCountry(address user) external view returns (uint16);
    
    /**
     * @dev 获取发行者注册表地址
     * @return 发行者注册表地址
     */
    function issuersRegistry() external view returns (address);
}