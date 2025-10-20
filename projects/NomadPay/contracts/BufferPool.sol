// SPDX-License-Identifier: MIT // 许可证声明
pragma solidity ^0.8.20; // 使用 Solidity 0.8.20 版本

// 最小化 ERC20 接口，供稳定币资产交互 //
interface IERC20 { // 声明 ERC20 接口
    function balanceOf(address account) external view returns (uint256); // 查询账户余额
    function transfer(address to, uint256 amount) external returns (bool); // 从合约向地址转账
    function transferFrom(address from, address to, uint256 amount) external returns (bool); // 从地址代转账
    function approve(address spender, uint256 amount) external returns (bool); // 授权支出额度
} // 接口结束

// 策略接口，适配外部 DeFi 协议 //
interface IStrategy { // 声明策略接口
    function asset() external view returns (IERC20); // 返回该策略使用的资产（稳定币）
    function totalAssets() external view returns (uint256); // 返回策略管理的资产总额
    function deposit(uint256 amount) external; // 存入资产到策略
    function withdraw(uint256 amount) external; // 从策略取回资产
} // 接口结束

// 缓冲池核心合约 //
contract BufferPool { // 声明合约
    // -------------------- 管理与基础参数 -------------------- //
    address public owner; // 合约管理员地址
    IERC20 public asset; // 缓冲池使用的稳定币资产
    uint16 public targetBufferBps; // 目标缓冲比例（基点，10000=100%）
    address[] public strategies; // 已注册的策略列表
    mapping(address => bool) public isStrategy; // 快速判断是否为已注册策略

    // -------------------- 操作事件 -------------------- //
    event PaymentExecuted(address indexed to, uint256 amount); // 支付执行事件
    event BufferRebalanced(uint256 bufferAfter, uint256 targetAmount); // 重平衡事件
    event StrategyRegistered(address indexed strategy); // 策略注册事件
    event StrategyRemoved(address indexed strategy); // 策略移除事件

    // -------------------- 访问控制 -------------------- //
    modifier onlyOwner() { // 仅管理员修饰器
        require(msg.sender == owner, "NOT_OWNER"); // 必须由管理员调用
        _; // 继续执行主体
    } // 修饰器结束

    // -------------------- 初始化 -------------------- //
    constructor(IERC20 _asset, uint16 _targetBps) { // 构造函数，设置资产与目标比例
        owner = msg.sender; // 记录部署者为管理员
        asset = _asset; // 设置缓冲池资产
        targetBufferBps = _targetBps == 0 ? 1000 : _targetBps; // 默认 10%（1000bps）
    } // 构造函数结束

    // -------------------- 管理接口 -------------------- //
    function setTargetBufferBps(uint16 _bps) external onlyOwner { // 设置目标缓冲比例
        require(_bps <= 10000, "BPS_TOO_HIGH"); // 比例不能超过 100%
        targetBufferBps = _bps; // 更新目标比例
    } // 函数结束

    function registerStrategy(address strategy) external onlyOwner { // 注册策略
        require(strategy != address(0), "ZERO_ADDR"); // 地址不可为零
        require(!isStrategy[strategy], "ALREADY"); // 不可重复注册
        require(address(IStrategy(strategy).asset()) == address(asset), "ASSET_MISMATCH"); // 资产需一致
        strategies.push(strategy); // 添加到策略列表
        isStrategy[strategy] = true; // 标记为有效策略
        emit StrategyRegistered(strategy); // 触发事件
    } // 函数结束

    function removeStrategy(address strategy) external onlyOwner { // 移除策略
        require(isStrategy[strategy], "NOT_FOUND"); // 必须是已注册策略
        isStrategy[strategy] = false; // 取消标记
        // 压缩数组：将最后一个移至当前位置并弹出 //
        for (uint256 i = 0; i < strategies.length; i++) { // 遍历列表
            if (strategies[i] == strategy) { // 找到目标
                strategies[i] = strategies[strategies.length - 1]; // 覆盖为最后一个
                strategies.pop(); // 移除最后一个
                break; // 结束循环
            } // if 结束
        } // for 结束
        emit StrategyRemoved(strategy); // 触发事件
    } // 函数结束

    // -------------------- 视图函数 -------------------- //
    function bufferBalance() public view returns (uint256) { // 查询缓冲池余额
        return asset.balanceOf(address(this)); // 返回合约持有的稳定币余额
    } // 函数结束

    function totalManagedAssets() public view returns (uint256) { // 查询总管理资产
        uint256 total = bufferBalance(); // 先取缓冲池余额
        for (uint256 i = 0; i < strategies.length; i++) { // 遍历策略
            if (isStrategy[strategies[i]]) { // 仅统计有效策略
                total += IStrategy(strategies[i]).totalAssets(); // 累加策略资产
            } // if 结束
        } // for 结束
        return total; // 返回总额
    } // 函数结束

    // -------------------- 内部辅助 -------------------- //
    function _withdrawNeeded(uint256 needed) internal { // 从策略中取回指定数量
        uint256 remaining = needed; // 剩余需求额
        for (uint256 i = 0; i < strategies.length && remaining > 0; i++) { // 逐个策略取回
            address s = strategies[i]; // 当前策略地址
            if (!isStrategy[s]) continue; // 跳过无效策略
            uint256 stratBal = IStrategy(s).totalAssets(); // 查询策略资产
            uint256 toPull = stratBal >= remaining ? remaining : stratBal; // 计算可拉回金额
            if (toPull > 0) { // 若可拉回
                IStrategy(s).withdraw(toPull); // 调用策略取回
                remaining -= toPull; // 更新剩余需求
            } // if 结束
        } // for 结束
        require(remaining == 0, "INSUFFICIENT_IN_STRATEGIES"); // 要求成功拉回全部
    } // 函数结束

    // -------------------- 业务操作 -------------------- //
    function pay(address to, uint256 amount) external onlyOwner { // 使用缓冲池进行支付
        require(to != address(0), "BAD_TO"); // 目标地址不能为零
        require(amount > 0, "ZERO_AMOUNT"); // 支付金额必须为正
        uint256 buf = bufferBalance(); // 当前缓冲余额
        if (buf < amount) { // 若缓冲不足
            _withdrawNeeded(amount - buf); // 从策略取回差额
        } // if 结束
        require(asset.transfer(to, amount), "TRANSFER_FAIL"); // 向目标转账
        emit PaymentExecuted(to, amount); // 触发支付事件
        _rebalanceAfterPay(); // 支付后执行一次重平衡
    } // 函数结束

    function rebalance() external onlyOwner { // 手动触发重平衡
        _rebalance(); // 调用内部逻辑
    } // 函数结束

    function _rebalanceAfterPay() internal { // 支付后重平衡封装
        _rebalance(); // 直接复用
    } // 函数结束

    function _rebalance() internal { // 重平衡核心逻辑
        uint256 total = totalManagedAssets(); // 计算总资产
        uint256 target = (total * targetBufferBps) / 10000; // 计算目标缓冲金额
        uint256 buf = bufferBalance(); // 当前缓冲余额
        if (buf < target) { // 若缓冲不足
            uint256 need = target - buf; // 计算需要拉回的金额
            _withdrawNeeded(need); // 从策略拉回
        } else if (buf > target && strategies.length > 0) { // 若缓冲过多
            uint256 surplus = buf - target; // 计算多余金额
            address s0 = strategies[0]; // 简化：仅将多余资金存入第一个策略
            if (isStrategy[s0]) { // 确认策略有效
                require(asset.approve(s0, surplus), "APPROVE_FAIL"); // 授权策略支用资产
                IStrategy(s0).deposit(surplus); // 存入策略
            } // if 结束
        } // if-else 结束
        emit BufferRebalanced(bufferBalance(), target); // 记录重平衡结果
    } // 函数结束

    // -------------------- 使用与假设（文档注释） -------------------- //
    // 1) 该合约为机制演示，不包含收益计算、费率与安全检查的完整实现。
    // 2) IStrategy 可由真实 DeFi 适配器实现（例如 Aave/Compound/Lido），需遵循 asset()/deposit()/withdraw()/totalAssets() 接口。
    // 3) 支付流程：当 pay() 被调用时，缓冲不足会自动从策略拉回；支付后执行一次重平衡，使缓冲维持在 targetBufferBps。
    // 4) 重平衡策略：当前示例将多余资金统一存入 strategies[0]，实际可按权重或收益率分配。
    // 5) 风险与安全：真实环境需加入访问控制（角色管理）、重入防护、失败回滚、预言机价格校验与策略健康度检查。
    // 6) 依赖资产：建议将稳定币（如 USDC/USDT）作为缓冲资产，减少波动风险用于支付场景。
    // 7) owner 通常应为多签或模块化治理合约，避免单点风险。
}