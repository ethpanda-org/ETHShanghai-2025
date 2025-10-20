// SPDX-License-Identifier: MIT // 许可证声明
pragma solidity ^0.8.20; // 使用 Solidity 0.8.20 版本

// 最小化 ERC20 接口 //
interface IERC20 { // ERC20 接口
    function balanceOf(address account) external view returns (uint256); // 查询余额
    function transfer(address to, uint256 amount) external returns (bool); // 转账
    function transferFrom(address from, address to, uint256 amount) external returns (bool); // 代转账
    function approve(address spender, uint256 amount) external returns (bool); // 授权
} // 接口结束

// 与 BufferPool 对接的策略接口 //
interface IStrategy { // 策略接口
    function asset() external view returns (IERC20); // 返回资产
    function totalAssets() external view returns (uint256); // 返回资产总额
    function deposit(uint256 amount) external; // 存入资产
    function withdraw(uint256 amount) external; // 取回资产
} // 接口结束

// 简化的演示策略，用内部账本模拟收益与资产托管 //
contract MockStrategy is IStrategy { // 策略合约实现
    IERC20 public override asset; // 资产（稳定币）
    uint256 public override totalAssets; // 内部托管总额（账本）

    event Deposited(address indexed from, uint256 amount); // 存入事件
    event Withdrawn(address indexed to, uint256 amount); // 取回事件

    constructor(IERC20 _asset) { // 构造函数
        asset = _asset; // 设置资产
        totalAssets = 0; // 初始账本为 0
    } // 构造结束

    function deposit(uint256 amount) external override { // 存入资产
        require(amount > 0, "ZERO_AMOUNT"); // 金额必须为正
        require(asset.transferFrom(msg.sender, address(this), amount), "TRANSFER_FROM_FAIL"); // 从调用者转入
        totalAssets += amount; // 更新账本
        emit Deposited(msg.sender, amount); // 记录事件
    } // 函数结束

    function withdraw(uint256 amount) external override { // 取回资产
        require(amount > 0, "ZERO_AMOUNT"); // 金额必须为正
        require(totalAssets >= amount, "INSUFFICIENT"); // 账本余额充足
        totalAssets -= amount; // 更新账本
        require(asset.transfer(msg.sender, amount), "TRANSFER_FAIL"); // 向调用者转出
        emit Withdrawn(msg.sender, amount); // 记录事件
    } // 函数结束
} // 合约结束