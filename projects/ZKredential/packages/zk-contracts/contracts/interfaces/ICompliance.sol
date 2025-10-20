// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ICompliance
 * @dev 合规模块标准接口
 */
interface ICompliance {
    
    /**
     * @dev 检查转账是否符合合规要求
     * @param from 发送方地址
     * @param to 接收方地址
     * @param amount 转账金额
     * @return 是否符合合规要求
     */
    function canTransfer(address from, address to, uint256 amount) external view returns (bool);
    
    /**
     * @dev 转账后的合规处理
     * @param from 发送方地址
     * @param to 接收方地址
     * @param amount 转账金额
     */
    function transferred(address from, address to, uint256 amount) external;
    
    /**
     * @dev 代币创建后的合规处理
     * @param to 接收方地址
     * @param amount 创建金额
     */
    function created(address to, uint256 amount) external;
    
    /**
     * @dev 代币销毁后的合规处理
     * @param from 发送方地址
     * @param amount 销毁金额
     */
    function destroyed(address from, uint256 amount) external;
}