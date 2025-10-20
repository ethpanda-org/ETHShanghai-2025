// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IStrategy.sol";

/**
 * @title TieredETHStaking
 * @notice 活期质押 ETH：由主合约调用
 * 用户不直接与该合约交互
 */
contract TieredETHStaking is IStrategy {
    uint256 public constant APR_TIER1_NUM = 5; // 5% 年化
    uint256 public constant APR_TIER2_NUM = 3; // 3% 年化
    uint256 public constant TIER_BORDER = 0.2 ether;
    uint256 public constant YEAR = 365 days;
    uint256 public constant APR_DEN = 100;

    address public vault; // 主合约地址（仅允许它调用）
    uint256 private _locked;

    modifier onlyVault() {
        require(msg.sender == vault, "ONLY_VAULT");
        _;
    }

    modifier nonReentrant() {
        require(_locked == 0, "REENTRANCY");
        _locked = 1;
        _;
        _locked = 0;
    }

    struct Account {
        uint256 principal;
        uint256 accRewards;
        uint64 lastAccrued;
    }

    mapping(address => Account) public accounts;
    uint256 public totalStaked;

    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event Claim(address indexed user, uint256 reward);
    event FundRewards(address indexed from, uint256 amount);

    constructor(address _vault) {
        vault = _vault;
    }

    // ====== IStrategy 接口实现 ======

    function deposit(address user, uint256 amount) external payable override onlyVault nonReentrant {
        require(msg.value == amount && amount > 0, "INVALID_AMOUNT");
        Account storage a = accounts[user];

        _accrue(a);

        a.principal += amount;
        totalStaked += amount;
        a.lastAccrued = uint64(block.timestamp);

        emit Deposit(user, amount);
    }

    function withdraw(address user, uint256 amount) external override onlyVault nonReentrant {
        Account storage a = accounts[user];
        require(amount > 0, "ZERO_AMOUNT");
        require(a.principal >= amount, "INSUFFICIENT_PRINCIPAL");

        _accrue(a);

        a.principal -= amount;
        totalStaked -= amount;
        a.lastAccrued = uint64(block.timestamp);

        _safeTransferETH(payable(vault), amount); // 提回主合约
        emit Withdraw(user, amount);
    }

    function claimReward(address user) external override onlyVault nonReentrant returns (uint256) {
        Account storage a = accounts[user];
        _accrue(a);

        uint256 rewards = a.accRewards;
        require(rewards > 0, "NO_REWARDS");

        uint256 pool = availableRewardsPool();
        require(pool >= rewards, "INSUFFICIENT_POOL");

        a.accRewards = 0;
        _safeTransferETH(payable(vault), rewards);

        emit Claim(user, rewards);
        return rewards;
    }

    // ====== 查询接口 ======

    function getUserStake(address user) external view override returns (uint256) {
        return accounts[user].principal;
    }

    function getAPY() external pure override returns (uint256) {
        return 5e16; // 平均年化5%
    }

    function getLockTime() external pure override returns (uint256) {
        return 0; // 活期无锁仓
    }

    function pendingReward(address user) public view override returns (uint256) {
        Account memory a = accounts[user];
        if (a.principal == 0 || a.lastAccrued == 0) {
            return a.accRewards;
        }
        uint256 dt = block.timestamp - a.lastAccrued;
        return a.accRewards + _calcRewards(a.principal, dt);
    }

    function isFlexible() external pure override returns (bool) {
        return true;
    }

    // ====== 奖励池 ======

    function availableRewardsPool() public view returns (uint256) {
        return address(this).balance - totalStaked;
    }

    function fundRewards() external payable {
        require(msg.value > 0, "NO_VALUE");
        emit FundRewards(msg.sender, msg.value);
    }

    // ====== 内部函数 ======

    function _accrue(Account storage a) internal {
        if (a.principal == 0) {
            a.lastAccrued = uint64(block.timestamp);
            return;
        }
        if (a.lastAccrued == 0) {
            a.lastAccrued = uint64(block.timestamp);
            return;
        }

        uint256 dt = block.timestamp - a.lastAccrued;
        if (dt == 0) return;

        uint256 add = _calcRewards(a.principal, dt);
        if (add > 0) a.accRewards += add;
        a.lastAccrued = uint64(block.timestamp);
    }

    function _calcRewards(uint256 principal, uint256 dt) internal pure returns (uint256) {
        uint256 base = principal <= TIER_BORDER ? principal : TIER_BORDER;
        uint256 extra = principal > TIER_BORDER ? principal - TIER_BORDER : 0;

        uint256 r1 = (base * APR_TIER1_NUM * dt) / (APR_DEN * YEAR);
        uint256 r2 = (extra * APR_TIER2_NUM * dt) / (APR_DEN * YEAR);
        return r1 + r2;
    }

    function _safeTransferETH(address payable to, uint256 amount) internal {
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "ETH_TRANSFER_FAIL");
    }

    receive() external payable {
        emit FundRewards(msg.sender, msg.value);
    }
}
