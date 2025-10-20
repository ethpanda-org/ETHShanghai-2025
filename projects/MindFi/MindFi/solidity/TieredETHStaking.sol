// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title TieredETHStaking
 * @notice 活期质押 ETH：每个账户的前 0.2 ETH 按 5% 年化、超出部分按 3% 年化计息。
 *         - 随时质押/取回
 *         - 利息按秒线性累积
 *         - 奖励从合约余额中支付（需提前注资奖励池）
 *
 * 计息规则（对单个地址）：
 *   base = min(principal, 0.2 ether)     -> 5% APR
 *   extra = principal - base (若 >0)     -> 3% APR
 *   rewards += (base * 5/100 + extra * 3/100) * dt / YEAR
 *
 * 注意：
 *   - 奖励支付需要合约中有足够的“奖励池”余额：availableRewardsPool = balance - totalStaked
 *   - 任何人都可往合约转 ETH 作为奖励池（fundRewards）
 */

contract TieredETHStaking {
    // ===== 常量 & 配置 =====
    uint256 public constant YEAR = 365 days;
    uint256 public constant TIER_BORDER = 0.2 ether; // 阶梯分界：0.2 ETH
    uint256 public constant APR_TIER1_NUM = 5;       // 5%
    uint256 public constant APR_TIER2_NUM = 3;       // 3%
    uint256 public constant APR_DEN = 100;

    // ===== 简易 ReentrancyGuard =====
    uint256 private _locked;
    modifier nonReentrant() {
        require(_locked == 0, "REENTRANCY");
        _locked = 1;
        _;
        _locked = 0;
    }

    // ===== 账户数据 =====
    struct Account {
        uint256 principal;     // 当前质押本金
        uint256 accRewards;    // 已结算但未领取的利息
        uint64  lastAccrued;   // 上次结算时间戳
    }

    mapping(address => Account) public accounts;
    uint256 public totalStaked; // 全局统计：总质押

    // ===== 事件 =====
    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event Claim(address indexed user, uint256 amount);
    event FundRewards(address indexed from, uint256 amount);

    // ===== 外部可视函数 =====

    /// @notice 预览某地址当前未领取（含未结算）的奖励
    function pendingRewards(address user) public view returns (uint256) {
        Account memory a = accounts[user];
        if (a.principal == 0 || a.lastAccrued == 0) {
            return a.accRewards;
        }
        uint256 dt = block.timestamp - a.lastAccrued;
        return a.accRewards + _calcRewards(a.principal, dt);
    }

    /// @notice 当前奖励池可用余额（不包含质押本金）
    function availableRewardsPool() public view returns (uint256) {
        return address(this).balance - totalStaked;
    }

    /// @notice 查看账户总收益（本金 + 已结算奖励 + 未结算奖励）
    /// @param user 要查询的地址
    /// @return principal 当前本金
    /// @return accRewards 已结算奖励
    /// @return pending 奖励池中尚未结算的利息
    /// @return total 总资产（本金 + 所有奖励）
    function getAccountSummary(address user)
        external
        view
        returns (
            uint256 principal,
            uint256 accRewards,
            uint256 pending,
            uint256 total
        )
    {
        Account memory a = accounts[user];
        principal = a.principal;
        accRewards = a.accRewards;

        // 计算尚未结算的奖励部分
        if (a.principal > 0 && a.lastAccrued > 0) {
            uint256 dt = block.timestamp - a.lastAccrued;
            pending = _calcRewards(a.principal, dt);
        }

        total = principal + accRewards + pending;
    }

    // ===== 质押/解押/领取 =====

    /// @notice 质押（活期，随存随计息）
    function deposit() external payable nonReentrant {
        require(msg.value > 0, "NO_VALUE");
        Account storage a = accounts[msg.sender];

        // 先结算之前的利息
        _accrue(a);

        // 增加本金和总质押
        a.principal += msg.value;
        totalStaked += msg.value;

        // 更新最后结算时间
        a.lastAccrued = uint64(block.timestamp);

        emit Deposit(msg.sender, msg.value);
    }

    /// @notice 提取部分或全部本金（不影响已结算利息；提取会先结算）
    /// @param amount 期望提取的本金（wei）
    function withdraw(uint256 amount) public nonReentrant {  // ✅ 改为 public
        Account storage a = accounts[msg.sender];
        require(amount > 0, "ZERO_AMOUNT");
        require(a.principal >= amount, "INSUFFICIENT_PRINCIPAL");

        // 先结算利息
        _accrue(a);

        // 扣减本金与全局统计
        a.principal -= amount;
        totalStaked -= amount;

        // 更新最后结算时间
        a.lastAccrued = uint64(block.timestamp);

        // 转出本金
        _safeTransferETH(payable(msg.sender), amount);
        emit Withdraw(msg.sender, amount);
    }

    /// @notice 领取已结算（含此刻结算）的利息
    function claim() public nonReentrant {
        Account storage a = accounts[msg.sender];

        // 先结算
        _accrue(a);

        uint256 rewards = a.accRewards;
        require(rewards > 0, "NO_REWARDS");

        // 必须保证奖励池足够
        uint256 pool = availableRewardsPool();
        require(pool >= rewards, "INSUFFICIENT_REWARD_POOL");

        a.accRewards = 0;
        _safeTransferETH(payable(msg.sender), rewards);
        emit Claim(msg.sender, rewards);
    }

    /// @notice 一键全部退出：提取全部本金并领取所有利息
    function exit() external {
        // ✅ withdraw 改为 public，可直接内部调用
        withdraw(accounts[msg.sender].principal);

        // withdraw 已经结算过利息，接着领取
        if (accounts[msg.sender].accRewards > 0) {
            claim();
        }
    }

    // ===== 奖励池注资 =====

    /// @notice 向合约注入奖励资金（任何人可注资）
    function fundRewards() external payable {
        require(msg.value > 0, "NO_VALUE");
        emit FundRewards(msg.sender, msg.value);
        // 不需要额外逻辑：资金进入合约即成为奖励池的一部分
    }

    // ===== 内部逻辑 =====

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
        if (add > 0) {
            a.accRewards += add;
        }
        a.lastAccrued = uint64(block.timestamp);
    }

    function _calcRewards(uint256 principal, uint256 dt) internal pure returns (uint256) {
        uint256 base = principal <= TIER_BORDER ? principal : TIER_BORDER;
        uint256 extra = principal > TIER_BORDER ? (principal - TIER_BORDER) : 0;

        // base * 5% * dt / YEAR + extra * 3% * dt / YEAR
        uint256 r1 = (base * APR_TIER1_NUM * dt) / (APR_DEN * YEAR);
        uint256 r2 = (extra * APR_TIER2_NUM * dt) / (APR_DEN * YEAR);
        return r1 + r2;
    }

    function _safeTransferETH(address payable to, uint256 amount) internal {
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "ETH_TRANSFER_FAIL");
    }

    // 接收裸转（也可作为奖励池注资）
    receive() external payable {
        emit FundRewards(msg.sender, msg.value);
    }
}
