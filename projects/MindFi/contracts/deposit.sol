// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DepositPool {
    // 定义一个映射，用于记录每个地址的存款金额
    mapping(address => uint256) public deposits;

    // 事件，用于在存款时通知前端
    event Deposited(address indexed user, uint256 amount);
    
    // 事件，用于在取款时通知前端
    event Withdrawn(address indexed user, uint256 amount);

    // 存钱到合约池
    function deposit() external payable {
        require(msg.value > 0, "Deposit amount must be greater than zero");
        // require(msg.value == amount, "Amount must match the sent Ether");

        // 更新存款记录
        deposits[msg.sender] += msg.value;

        // 触发存款事件
        emit Deposited(msg.sender, msg.value);
    }

    // 从合约池中取钱
    function withdraw(uint256 amount) external {
        require(amount > 0, "Amount must be greater than zero");
        // require(deposits[msg.sender] >= amount, "Insufficient balance");

        // 减少用户存款余额
        deposits[msg.sender] -= amount;

        // 发送 Ether 给用户
        payable(msg.sender).transfer(amount);

        // 触发取款事件
        emit Withdrawn(msg.sender, amount);
    }

    // 查询指定地址的存款余额
    function getDepositBalance(address user) external view returns (uint256) {
        return deposits[user];
    }

    // 查询合约池余额
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
