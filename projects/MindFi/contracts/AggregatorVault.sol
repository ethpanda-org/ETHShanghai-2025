// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IStrategy.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AggregatorVault is Ownable {
    IERC20 public stakingToken; // 质押的代币（例如：ETH）
    uint256 public minDeposit = 5 * 10 ** 13; // 0.005 token (5e-3)

    struct StrategyInfo {
        string name;
        address contractAddr;
        bool active;  // 是否激活
        string logoUrl; // 平台 Logo URL
        string description; // 平台介绍
        uint256 addedAt; // 添加时间
        uint256 apy; // 年化收益率 (APY)
    }

    // 将策略合约地址作为索引
    mapping(address => StrategyInfo) public strategies;

    // 用来追踪策略数量
    address[] public strategyAddresses;  // 新增一个数组用于存储策略地址

    mapping(address => uint256) public userBalance;
    mapping(address => mapping(address => uint256)) public userStakeRecord; // 用户在各平台的质押记录

    event Deposit(address indexed user, uint256 amount);
    event DelegatedStake(address indexed user, address indexed strategyAddr, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event Claim(address indexed user, uint256 reward);
    event FundRewards(address indexed from, uint256 amount);
    event Withdrawal(address indexed user, uint256 amount); // 新增提现事件

    // 构造函数，传递 msg.sender 作为初始拥有者
    constructor(IERC20 _token) Ownable(msg.sender) {
        stakingToken = _token;
    }
    
    // ====== 用户充值 ======
    function deposit() external payable {
        require(msg.value >= minDeposit, "Deposit below minimum");
        // require(stakingToken.transferFrom(msg.sender, address(this), msg.value), "Transfer failed");
        
        userBalance[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    // ====== 添加/激活/停用质押平台 ======
    function addStrategy(
        string memory name,
        address strategyAddr,
        string memory logoUrl,
        string memory description
    ) external onlyOwner {
        require(strategyAddr != address(0), "Invalid strategy address");
        strategies[strategyAddr] = StrategyInfo({
            name: name,
            contractAddr: strategyAddr,
            active: true,
            logoUrl: logoUrl,
            description: description,
            addedAt: block.timestamp,
            apy: IStrategy(strategyAddr).getAPY()  // 获取年化收益率
        });
        strategyAddresses.push(strategyAddr);  // 将策略地址添加到数组中
    }

    function toggleStrategyActivation(address strategyAddr) external onlyOwner {
        StrategyInfo storage s = strategies[strategyAddr];
        require(s.contractAddr != address(0), "Strategy not found");
        s.active = !s.active;
    }

    // ====== 查询平台信息 ======
    function getStrategyInfo(address strategyAddr)
        external
        view
        returns (
            string memory name,
            address contractAddr,
            bool active,
            string memory logoUrl,
            string memory description,
            uint256 addedAt
        )
    {
        StrategyInfo storage s = strategies[strategyAddr];
        require(s.contractAddr != address(0), "Strategy not found");

        return (s.name, s.contractAddr, s.active, s.logoUrl, s.description, s.addedAt);
    }

    // ====== 查询所有平台信息 ======
    function getAllStrategies()
        external
        view
        returns (
            string[] memory names,
            address[] memory contractAddrs,
            bool[] memory actives,
            string[] memory logoUrls,
            string[] memory descriptions,
            uint256[] memory addedAts
        )
    {
        uint256 n = strategyAddresses.length;
        names = new string[](n);
        contractAddrs = new address[](n);
        actives = new bool[](n);
        logoUrls = new string[](n);
        descriptions = new string[](n);
        addedAts = new uint256[](n);

        for (uint i = 0; i < n; i++) {
            address strategyAddr = strategyAddresses[i];
            StrategyInfo storage s = strategies[strategyAddr];
            names[i] = s.name;
            contractAddrs[i] = s.contractAddr;
            actives[i] = s.active;
            logoUrls[i] = s.logoUrl;
            descriptions[i] = s.description;
            addedAts[i] = s.addedAt;
        }
    }

    // ====== 质押分发：将用户资金分发到各个平台 ======
    function delegateStake(address user, address strategyAddr, uint256 amount) external onlyOwner {
        StrategyInfo storage s = strategies[strategyAddr];
        require(s.active, "Strategy is not active");
        require(userBalance[user] >= amount, "Insufficient balance");

        // 调用外部平台的 `deposit()` 函数进行质押
        IStrategy(s.contractAddr).deposit(user, amount);

        // 更新用户余额
        userBalance[user] -= amount;
        userStakeRecord[user][strategyAddr] += amount;

        emit DelegatedStake(user, strategyAddr, amount);
    }

    // ====== 提取资金：从外部平台提取资金 ======
    function withdraw(address strategyAddr, uint256 amount) external {
        StrategyInfo storage s = strategies[strategyAddr];
        require(s.active, "Strategy is not active");
        require(userStakeRecord[msg.sender][strategyAddr] >= amount, "Insufficient staked amount");

        // 调用外部平台的 `withdraw()` 函数进行提取
        IStrategy(s.contractAddr).withdraw(msg.sender, amount);

        // 更新用户余额
        userStakeRecord[msg.sender][strategyAddr] -= amount;
        userBalance[msg.sender] += amount;

        emit Withdraw(msg.sender, amount);
    }

    // ====== 领取奖励：领取在平台上的收益 ======
    function claim(address strategyAddr) external {
        StrategyInfo storage s = strategies[strategyAddr];
        require(s.active, "Strategy is not active");

        // 调用外部平台的 `claimReward()` 函数进行收益领取
        uint256 reward = IStrategy(s.contractAddr).claimReward(msg.sender);

        emit Claim(msg.sender, reward);
    }

    // ====== 用户查询余额 ======
    function getUserBalance(address user) external view returns (uint256) {
        return userBalance[user];
    }

    // ====== 从池子中提现到钱包 ======
// ====== 从池子中提现到钱包（以太币） ======
    function withdrawToWallet(uint256 amount) external {
    // 确保用户有足够的余额
    require(amount <= userBalance[msg.sender], "Insufficient balance");

    // 检查合约是否有足够的 ETH 余额
    uint256 contractBalance = address(this).balance;
    require(contractBalance >= amount, "Contract has insufficient balance");

    // 更新用户余额
    userBalance[msg.sender] -= amount;

    // 从合约转账 ETH 到用户钱包
    payable(msg.sender).transfer(amount);

    // 触发提现事件
    emit Withdrawal(msg.sender, amount);
}

    // ====== 奖励池注资 ======
    function fundRewards() external payable {
        require(msg.value > 0, "NO_VALUE");
        emit FundRewards(msg.sender, msg.value);
    }

    // ====== 获取奖励池可用金额 ======
    function availableRewardsPool() public view returns (uint256) {
        return address(this).balance;
    }
}
