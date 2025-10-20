// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CoreVault

 */
contract CoreVault {
    // 所有者与管理参数
    address public owner;
    bool public paused;
    uint16 public feeBps; // 例如 30 = 0.30%
    uint256 public maxWithdrawPerTx; // 单笔提现上限（0 表示不限制）

    // 账本与统计
    mapping(address => uint256) public balances;
    uint256 public totalDeposited;
    uint256 public totalWithdrawn;

    // 事件
    event Deposited(address indexed from, address indexed beneficiary, uint256 amount);
    event Withdrawn(address indexed to, uint256 amount, uint256 fee);
    event Transferred(address indexed from, address indexed to, uint256 amount);
    event OwnerChanged(address indexed oldOwner, address indexed newOwner);
    event PausedChanged(bool paused);
    event FeeBpsChanged(uint16 feeBps);
    event MaxWithdrawPerTxChanged(uint256 maxAmount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier notPaused() {
        require(!paused, "Paused");
        _;
    }

    constructor() {
        owner = msg.sender;
        feeBps = 30; // 默认 0.30%
        paused = false;
        maxWithdrawPerTx = 0; // 不限制
    }

    // 管理函数
    function setOwner(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        emit OwnerChanged(owner, newOwner);
        owner = newOwner;
    }

    function setPaused(bool p) external onlyOwner {
        paused = p;
        emit PausedChanged(p);
    }

    function setFeeBps(uint16 bps) external onlyOwner {
        require(bps <= 10_000, "Fee too large");
        feeBps = bps;
        emit FeeBpsChanged(bps);
    }

    function setMaxWithdrawPerTx(uint256 maxAmount) external onlyOwner {
        maxWithdrawPerTx = maxAmount;
        emit MaxWithdrawPerTxChanged(maxAmount);
    }

    // 基础充值：记账 + 增加统计
    function deposit() external payable notPaused {
        balances[msg.sender] += msg.value;
        totalDeposited += msg.value;
        emit Deposited(msg.sender, msg.sender, msg.value);
    }

    // 代充值到指定受益人
    function depositFor(address beneficiary) external payable notPaused {
        require(beneficiary != address(0), "Invalid beneficiary");
        balances[beneficiary] += msg.value;
        totalDeposited += msg.value;
        emit Deposited(msg.sender, beneficiary, msg.value);
    }

    // 账本内转账（不发生 ETH 转移），仅变更内部余额
    function transfer(address to, uint256 amount) external notPaused {
        require(to != address(0), "Invalid to");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        unchecked {
            balances[msg.sender] -= amount;
            balances[to] += amount;
        }
        emit Transferred(msg.sender, to, amount);
    }

    // 提现：支持费率与单笔上限；核心功能不变，任何人可以取钱
    function withdraw(uint256 amount) external notPaused {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        if (maxWithdrawPerTx != 0) {
            require(amount <= maxWithdrawPerTx, "Exceeds per-tx limit");
        }
        uint256 fee = (amount * feeBps) / 10_000;
        uint256 sendAmount = amount - fee;
        unchecked {
            balances[msg.sender] -= amount;
            totalWithdrawn += amount;
        }
        (bool ok1, ) = msg.sender.call{value: sendAmount}("");
        require(ok1, "Transfer failed");
        if (fee > 0) {
            (bool ok2, ) = owner.call{value: fee}("");
            require(ok2, "Fee transfer failed");
        }
        emit Withdrawn(msg.sender, amount, fee);
    }

    // 只读辅助函数
    function getBalance(address user) external view returns (uint256) {
        return balances[user];
    }

    function vaultEthBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // 允许直接向合约转账 ETH（会统计为 totalDeposited，但不改变余额）
    receive() external payable {
        totalDeposited += msg.value;
    }

    fallback() external payable {
        totalDeposited += msg.value;
    }
}