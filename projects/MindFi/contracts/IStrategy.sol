// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IStrategy
 * @notice 定义所有外部质押平台必须实现的标准接口
 */
interface IStrategy {
    function deposit(address user, uint256 amount) external payable;
    function withdraw(address user, uint256 amount) external;
    function claimReward(address user) external returns (uint256);
    function getUserStake(address user) external view returns (uint256);
    function getAPY() external view returns (uint256);
    function getLockTime() external view returns (uint256);
    function pendingReward(address user) external view returns (uint256);
    function isFlexible() external view returns (bool);
}
