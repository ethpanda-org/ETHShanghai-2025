# BlockETF MVP 全面测试计划文档

## 1. 测试概述

### 1.1 测试目标
- 验证BlockETF所有核心功能的正确性
- 确保合约安全性，防范常见攻击
- 验证集成流程的完整性
- 测试极端场景下的系统稳定性
- 评估Gas消耗和性能表现

### 1.2 测试范围
- **BlockETFCore**: ETF核心功能合约
- **ETFRebalancerV1**: 重新平衡执行合约
- **ETFRouterV1**: USDT便捷操作路由合约
- **PriceOracle**: 价格预言机合约

### 1.3 测试环境
- Foundry测试框架
- BSC测试网 (testnet)
- Mock合约模拟外部依赖
- Fork主网进行集成测试

---

## 2. BlockETFCore 合约测试用例

### 2.1 初始化测试

| 测试ID | 测试用例 | 输入 | 预期结果 | 优先级 |
|--------|---------|------|----------|--------|
| **基础验证** | | | | |
| CORE-INIT-001 | 正常初始化 | 有效的资产数组、权重、目标价值 | 合约初始化成功，状态正确设置 | P0 |
| CORE-INIT-002 | 重复初始化防护 | 尝试二次调用initialize | 交易回滚，抛出AlreadyInitialized错误 | P0 |
| **Oracle相关** | | | | |
| CORE-INIT-003 | 构造时Oracle为零 | _priceOracle=address(0) | 构造失败，抛出InvalidOracle错误 | P0 |
| CORE-INIT-004 | 构造时Oracle无效合约 | _priceOracle非Oracle合约 | 构造失败，接口验证失败 | P0 |
| CORE-INIT-005 | Oracle返回零价格 | 某资产价格返回0 | 交易回滚，抛出InvalidPrice错误 | P0 |
| CORE-INIT-006 | Oracle返回异常价格 | Oracle revert或异常 | 交易回滚，传播Oracle错误 | P0 |
| **数组验证** | | | | |
| CORE-INIT-007 | 空资产数组 | assets为空数组 | 交易回滚，抛出NoAssets错误 | P0 |
| CORE-INIT-008 | 数组长度不匹配 | assets.length ≠ weights.length | 交易回滚，抛出InvalidLength错误 | P0 |
| CORE-INIT-009 | 单个资产 | 只有一个资产 | 正常初始化（边界测试） | P1 |
| CORE-INIT-010 | 大量资产 | 50+个资产 | 测试gas限制和性能 | P2 |
| **资产验证** | | | | |
| CORE-INIT-011 | 零地址资产 | 资产地址包含0x0 | 交易回滚，抛出InvalidAsset错误 | P0 |
| CORE-INIT-012 | 重复资产 | 资产数组包含重复地址 | 交易回滚，抛出DuplicateAsset错误 | P0 |
| CORE-INIT-013 | 非ERC20合约 | 资产地址不是ERC20 | 交易回滚，调用decimals()失败 | P0 |
| CORE-INIT-014 | 恶意代币 | 使用恶意ERC20合约 | 交易回滚或安全处理 | P1 |
| CORE-INIT-015 | 无小数位代币 | decimals()返回0 | 正确处理0小数位代币 | P1 |
| CORE-INIT-016 | 高精度代币 | decimals()返回>18 | 正确处理高精度代币 | P1 |
| **权重验证** | | | | |
| CORE-INIT-017 | 权重总和不等于10000 | sum(weights) ≠ 10000 | 交易回滚，抛出InvalidTotalWeight错误 | P0 |
| CORE-INIT-018 | 单个权重为0 | 某个weight = 0 | 交易回滚，抛出InvalidWeight错误 | P0 |
| CORE-INIT-019 | 权重溢出 | 单个权重>10000 | 总和检查失败 | P1 |
| CORE-INIT-020 | 权重总和溢出 | uint32溢出 | Solidity 0.8自动revert | P2 |
| **目标价值验证** | | | | |
| CORE-INIT-021 | 目标价值过小 | targetValue ≤ MINIMUM_LIQUIDITY | 交易回滚，抛出InsufficientInitialSupply | P0 |
| CORE-INIT-022 | 目标价值为0 | targetValue = 0 | 交易回滚，抛出InsufficientInitialSupply | P0 |
| CORE-INIT-023 | 目标价值极大 | targetValue = type(uint256).max | 测试溢出和精度问题 | P1 |
| **转账和余额验证** | | | | |
| CORE-INIT-024 | 用户余额不足 | 某资产余额<所需数量 | transferFrom失败 | P0 |
| CORE-INIT-025 | 未授权转账 | allowance不足 | transferFrom失败 | P0 |
| CORE-INIT-026 | 转账后余额验证 | 检查合约收到正确金额 | 余额匹配预期 | P0 |
| CORE-INIT-027 | 转账钩子攻击 | 代币有恶意转账钩子 | 重入保护（初始化无重入保护需注意） | P1 |
| **计算验证** | | | | |
| CORE-INIT-028 | 计算的资产数量为0 | 价格极高导致amount=0 | 交易回滚，抛出InvalidAmount | P0 |
| CORE-INIT-029 | 精度损失测试 | 小额初始化 | 验证精度损失在可接受范围 | P1 |
| CORE-INIT-030 | 舍入误差累积 | 多资产舍入 | 总价值偏差<0.1% | P1 |
| CORE-INIT-031 | 价格精度转换 | 不同精度价格源 | 正确转换到18位精度 | P0 |
| **份额铸造验证** | | | | |
| CORE-INIT-032 | 初始份额分配 | 检查铸造的份额 | sender获得正确份额，address(1)获得最小流动性 | P0 |
| CORE-INIT-033 | 总供应量验证 | 检查totalSupply | 等于targetValue | P0 |
| CORE-INIT-034 | 1:1比例验证 | 1 share ≈ 1 USD | 验证初始比例正确 | P0 |
| **状态更新验证** | | | | |
| CORE-INIT-035 | assets数组更新 | 检查assets数组 | 正确保存所有资产地址 | P0 |
| CORE-INIT-036 | assetInfo映射更新 | 检查每个资产信息 | token、weight、reserve正确设置 | P0 |
| CORE-INIT-037 | isAsset映射更新 | 检查isAsset标记 | 所有资产标记为true | P0 |
| CORE-INIT-038 | feeInfo时间戳 | 检查lastCollectTime | 设置为当前区块时间 | P1 |
| CORE-INIT-039 | initialized标志 | 检查initialized | 设置为true | P0 |
| **权限验证** | | | | |
| CORE-INIT-040 | 非owner调用 | 普通用户调用 | 交易回滚，onlyOwner修饰符 | P0 |
| CORE-INIT-041 | owner权限验证 | owner调用 | 成功执行 | P0 |
| **边界和极端情况** | | | | |
| CORE-INIT-042 | 资产价格极端差异 | BTC vs SHIB价格差异 | 正确处理大数值差异 | P1 |
| CORE-INIT-043 | 权重极端分布 | 99%/1%权重分配 | 正确计算各资产数量 | P1 |
| CORE-INIT-044 | Gas限制测试 | 大量资产初始化 | 不超过区块gas限制 | P1 |
| CORE-INIT-045 | 并发初始化 | 多个交易同时尝试 | 只有第一个成功 | P2 |
| **集成场景** | | | | |
| CORE-INIT-046 | 真实代币测试 | 使用WBTC/WETH/USDT | 完整初始化流程 | P0 |
| CORE-INIT-047 | 税收代币 | 有转账税的代币 | 正确处理或拒绝 | P1 |
| CORE-INIT-048 | 可暂停代币 | 代币被暂停 | transferFrom失败 | P2 |
| CORE-INIT-049 | 可升级代币 | 使用代理合约的代币 | 正常处理 | P2 |
| **事件验证** | | | | |
| CORE-INIT-050 | Initialized事件 | 检查事件参数 | 所有参数正确emit | P1 |
| CORE-INIT-051 | Transfer事件 | 检查铸造事件 | 正确的Transfer事件 | P1 |

### 2.2 铸造(Mint)功能测试 - mint()函数

| 测试ID | 测试用例 | 输入 | 预期结果 | 优先级 |
|--------|---------|------|----------|--------|
| **基础功能** | | | | |
| CORE-MINT-001 | 正常铸造 | 预先转入资产，调用mint | 按比例铸造正确份额 | P0 |
| CORE-MINT-002 | 多资产按比例铸造 | 不同比例的多个资产 | 按最小比例铸造 | P0 |
| CORE-MINT-003 | 单资产过多 | 某资产超过比例 | 按最小比例铸造，多余资产返还给用户 | P0 |
| **参数验证** | | | | |
| CORE-MINT-004 | 零地址接收者 | to = address(0) | 交易回滚，InvalidRecipient | P0 |
| CORE-MINT-005 | 自己作为接收者 | to = msg.sender | 正常铸造 | P1 |
| CORE-MINT-006 | 合约作为接收者 | to = 合约地址 | 正常铸造（如果合约可接收） | P1 |
| **资产检查** | | | | |
| CORE-MINT-007 | 无新资产 | balance <= reserve | 交易回滚，NoNewAssets | P0 |
| CORE-MINT-008 | 部分资产无新增 | 某些资产无新增 | 交易回滚，NoNewAssets | P0 |
| CORE-MINT-009 | 资产刚好匹配 | 完美比例的资产 | 正常铸造，无多余资产返还 | P1 |
| CORE-MINT-036 | 多余资产返还验证 | 多个资产都有多余 | 所有多余资产正确返还给用户 | P0 |
| CORE-MINT-037 | 用户余额验证 | 铸造后检查用户余额 | 用户收到正确的多余资产 | P0 |
| CORE-MINT-038 | 合约余额验证 | 铸造后检查合约余额 | 合约仅保留实际使用的资产 | P0 |
| **比例计算** | | | | |
| CORE-MINT-010 | 零储备初始铸造 | reserve = 0时铸造 | 交易回滚，InvalidRatio | P0 |
| CORE-MINT-011 | 极小比例 | 微量资产铸造 | 正常铸造微量份额 | P1 |
| CORE-MINT-012 | 比例计算溢出 | 大额资产计算 | 正确处理大数 | P1 |
| CORE-MINT-013 | 比例为零 | minRatio = 0 | 交易回滚，InvalidRatio | P0 |
| **铸造份额验证** | | | | |
| CORE-MINT-014 | 零份额铸造 | 计算结果shares = 0 | 交易回滚，InvalidAmount | P0 |
| CORE-MINT-015 | 微量份额铸造 | 极小份额数量 | 正常铸造 | P1 |
| CORE-MINT-016 | 大额铸造 | 大份额数量 | 正常铸造 | P0 |
| **费用相关** | | | | |
| CORE-MINT-017 | 管理费累积 | 时间流逝后铸造 | 正确累积管理费 | P0 |
| CORE-MINT-018 | 首次铸造无费用 | 初始化后立即铸造 | 无管理费 | P1 |
| CORE-MINT-019 | 长时间后铸造 | 1年后铸造 | 累积完整年费 | P1 |
| **状态检查** | | | | |
| CORE-MINT-020 | 未初始化铸造 | initialized = false | 交易回滚，NotInitialized | P0 |
| CORE-MINT-021 | 暂停状态铸造 | paused = true | 交易回滚，Pausable | P0 |
| CORE-MINT-022 | 恢复后铸造 | unpause后铸造 | 正常铸造 | P1 |
| **重入攻击** | | | | |
| CORE-MINT-023 | 铸造中重入 | 恶意合约尝试重入 | ReentrancyGuard阻止 | P0 |
| CORE-MINT-024 | 跨函数重入 | mint调用burn | ReentrancyGuard阻止 | P0 |
| **储备更新** | | | | |
| CORE-MINT-025 | 储备正确更新 | 铸造后检查reserve | reserve增加正确数量 | P0 |
| CORE-MINT-026 | 储备溢出检查 | reserve接近uint224.max | 安全处理或回滚 | P1 |
| CORE-MINT-027 | 多次铸造累积 | 连续多次铸造 | 储备正确累积 | P0 |
| **事件和日志** | | | | |
| CORE-MINT-028 | Mint事件 | 检查事件参数 | 正确的to、shares、amounts | P1 |
| CORE-MINT-029 | Transfer事件 | 检查ERC20事件 | 从0地址转账事件 | P1 |
| **边界测试** | | | | |
| CORE-MINT-030 | 最大uint256铸造 | 极大量资产 | 正确处理或合理失败 | P2 |
| CORE-MINT-031 | 单wei铸造 | 1 wei资产 | 低于最小量失败 | P1 |
| CORE-MINT-032 | 总供应量影响 | 大量铸造后 | totalSupply正确增加 | P0 |
| **特殊场景** | | | | |
| CORE-MINT-033 | 价格变化中铸造 | Oracle价格更新时 | 使用当前储备计算 | P1 |
| CORE-MINT-034 | 重新平衡后铸造 | 刚重新平衡完 | 正常铸造 | P1 |
| CORE-MINT-035 | 费用收取后铸造 | 管理费刚收取 | 正常铸造 | P1 |

### 2.3 铸造(MintExactShares)功能测试

| 测试ID | 测试用例 | 输入 | 预期结果 | 优先级 |
|--------|---------|------|----------|--------|
| **基础功能** | | | | |
| CORE-MEXACT-001 | 正常精确铸造 | 指定份额数量 | 铸造精确份额 | P0 |
| CORE-MEXACT-002 | 计算所需资产 | 份额数量 | 正确计算各资产数量 | P0 |
| CORE-MEXACT-003 | 转账和铸造 | 从用户转入资产 | 成功转账并铸造 | P0 |
| **参数验证** | | | | |
| CORE-MEXACT-004 | 零份额 | shares = 0 | 交易回滚，InvalidShares | P0 |
| CORE-MEXACT-005 | 零地址接收 | to = address(0) | 交易回滚，InvalidRecipient | P0 |
| CORE-MEXACT-006 | 微量份额铸造 | 极小份额数量 | 正常铸造 | P1 |
| **资产计算** | | | | |
| CORE-MEXACT-007 | 计算结果为零 | 极小份额导致amount=0 | 交易回滚，ZeroAmount | P0 |
| CORE-MEXACT-008 | 精度损失 | 除法精度损失 | 可接受范围内 | P1 |
| CORE-MEXACT-009 | 大额计算 | 大份额数量 | 正确计算不溢出 | P1 |
| **转账验证** | | | | |
| CORE-MEXACT-010 | 余额不足 | 用户余额<所需 | transferFrom失败 | P0 |
| CORE-MEXACT-011 | 授权不足 | allowance<所需 | transferFrom失败 | P0 |
| CORE-MEXACT-012 | 恶意代币 | 转账有副作用 | 安全处理 | P1 |
| CORE-MEXACT-013 | 税收代币 | 有转账税 | 实际收到<预期 | P1 |
| **状态更新** | | | | |
| CORE-MEXACT-014 | 储备更新 | 检查reserve增加 | 正确增加金额 | P0 |
| CORE-MEXACT-015 | 总供应量 | 检查totalSupply | 增加指定份额 | P0 |
| CORE-MEXACT-016 | 用户余额 | 检查接收者余额 | 获得正确份额 | P0 |
| **费用处理** | | | | |
| CORE-MEXACT-017 | 管理费收取 | 铸造前收取费用 | 正确收取累积费用 | P0 |
| CORE-MEXACT-018 | 费用后计算 | 费用影响计算 | 基于新totalSupply计算 | P1 |
| **边界和异常** | | | | |
| CORE-MEXACT-019 | 总供应为零 | totalSupply = 0 | 除零错误处理 | P0 |
| CORE-MEXACT-020 | 接近最大供应 | 接近uint256.max | 正确处理或失败 | P2 |
| CORE-MEXACT-021 | 并发铸造 | 多用户同时 | 状态一致性 | P1 |
| **集成测试** | | | | |
| CORE-MEXACT-022 | 与mint()对比 | 相同结果验证 | 两种方式结果一致 | P1 |
| CORE-MEXACT-023 | 连续铸造 | 多次调用 | 累积效果正确 | P1 |

### 2.4 赎回(Burn)功能测试

| 测试ID | 测试用例 | 输入 | 预期结果 | 优先级 |
|--------|---------|------|----------|--------|
| **基础功能** | | | | |
| CORE-BURN-001 | 正常赎回 | 有效份额数量 | 按比例返还资产 | P0 |
| CORE-BURN-002 | 全部赎回 | 用户全部份额 | 返还所有对应资产 | P0 |
| CORE-BURN-003 | 部分赎回 | 部分份额 | 按比例返还部分资产 | P0 |
| **参数验证** | | | | |
| CORE-BURN-004 | 零份额 | shares = 0 | 交易回滚，InvalidShares | P0 |
| CORE-BURN-005 | 零地址接收 | to = address(0) | 交易回滚，InvalidRecipient | P0 |
| CORE-BURN-006 | 余额不足 | shares > 用户余额 | 交易回滚，InsufficientBalance | P0 |
| **费用计算** | | | | |
| CORE-BURN-007 | 赎回费扣除 | 有赎回费设置 | 正确扣除费用 | P0 |
| CORE-BURN-008 | 零费率 | withdrawFee = 0 | 无费用扣除 | P1 |
| CORE-BURN-009 | 最大费率 | 高费率 | 正确计算，用户收到减少 | P1 |
| CORE-BURN-010 | 费用转账 | 费用份额转移 | feeCollector收到费用 | P0 |
| CORE-BURN-011 | 费用向上取整 | _ceilDiv计算 | 确保费用不会为0 | P1 |
| **资产计算** | | | | |
| CORE-BURN-012 | 按比例分配 | 多资产分配 | 各资产按权重分配 | P0 |
| CORE-BURN-013 | 计算为零 | 极小份额 | 交易回滚，ZeroAmount | P0 |
| CORE-BURN-014 | 精度损失 | 除法舍入 | 损失在可接受范围 | P1 |
| CORE-BURN-015 | 大额赎回 | 大量份额 | 正确计算不溢出 | P1 |
| **储备更新** | | | | |
| CORE-BURN-016 | 储备减少 | 赎回后reserve | 正确减少对应数量 | P0 |
| CORE-BURN-017 | 储备不足 | reserve < amount | 不应发生(需验证) | P0 |
| CORE-BURN-018 | 储备下溢 | uint224下溢 | Solidity 0.8保护 | P1 |
| **转账操作** | | | | |
| CORE-BURN-019 | 资产转账成功 | 转账给用户 | 用户收到资产 | P0 |
| CORE-BURN-020 | 转账失败处理 | 某资产转账失败 | 整体回滚 | P0 |
| CORE-BURN-021 | 恶意接收地址 | 接收地址有回调 | 重入保护 | P0 |
| CORE-BURN-022 | 合约接收者 | to是合约地址 | 正常转账（如可接收） | P1 |
| **状态检查** | | | | |
| CORE-BURN-023 | 未初始化 | initialized = false | 交易回滚，NotInitialized | P0 |
| CORE-BURN-024 | 暂停状态 | paused = true | 交易回滚，Pausable | P0 |
| CORE-BURN-025 | 重入保护 | 尝试重入 | ReentrancyGuard阻止 | P0 |
| **管理费** | | | | |
| CORE-BURN-026 | 赎回前收费 | 累积的管理费 | 先收取管理费 | P0 |
| CORE-BURN-027 | 费用后计算 | 基于新总供应量 | 正确计算资产数量 | P1 |
| **份额销毁** | | | | |
| CORE-BURN-028 | 份额正确销毁 | _burn执行 | totalSupply减少 | P0 |
| CORE-BURN-029 | 用户余额更新 | 检查用户余额 | 减少正确数量 | P0 |
| CORE-BURN-030 | 费用份额不销毁 | 费用转给collector | 只销毁净份额 | P0 |
| **事件验证** | | | | |
| CORE-BURN-031 | Burn事件 | 检查事件参数 | 正确的参数 | P1 |
| CORE-BURN-032 | Transfer事件 | ERC20事件 | 转到0地址事件 | P1 |
| **边界测试** | | | | |
| CORE-BURN-033 | 最后一个用户 | 赎回所有流通份额 | 保留最小流动性 | P1 |
| CORE-BURN-034 | 单wei赎回 | 1 wei份额 | 可能得到0资产 | P2 |
| CORE-BURN-035 | 最大份额赎回 | uint256.max | 处理或合理失败 | P2 |
| **特殊场景** | | | | |
| CORE-BURN-036 | 重新平衡中赎回 | 重新平衡期间 | 基于当前储备 | P1 |
| CORE-BURN-037 | 价格剧变时赎回 | Oracle价格变化 | 不影响计算 | P1 |
| CORE-BURN-038 | 连续赎回 | 多次赎回 | 状态正确更新 | P1 |
| CORE-BURN-039 | 不同用户赎回 | 多用户操作 | 各自正确处理 | P0 |

### 2.5 重新平衡检查(flashRebalance)测试

| 测试ID | 测试用例 | 输入 | 预期结果 | 优先级 |
|--------|---------|------|----------|--------|
| **触发条件** | | | | |
| CORE-REBAL-001 | 权重偏离超阈值 | 偏离>threshold | 需要重新平衡 | P0 |
| CORE-REBAL-002 | 权重偏离未超阈值 | 偏离<threshold | 不需要重新平衡 | P0 |
| CORE-REBAL-003 | 精确阈值边界 | 偏离=threshold | 需要重新平衡 | P1 |
| CORE-REBAL-004 | 多资产偏离 | 多个资产偏离 | 任一超阈值则需要 | P0 |
| **冷却期验证** | | | | |
| CORE-REBAL-005 | 冷却期内 | 距上次<cooldown | 交易回滚，CooldownNotMet | P0 |
| CORE-REBAL-006 | 冷却期满 | 距上次>=cooldown | 可以执行 | P0 |
| CORE-REBAL-007 | 首次重新平衡 | lastRebalanceTime=0 | 可以执行 | P1 |
| CORE-REBAL-008 | 冷却期边界 | 刚好到期 | 可以执行 | P1 |
| **权限检查** | | | | |
| CORE-REBAL-009 | rebalancer调用 | 授权地址调用 | 成功执行 | P0 |
| CORE-REBAL-010 | owner调用 | owner地址调用 | 成功执行 | P0 |
| CORE-REBAL-011 | 未授权调用 | 普通地址调用 | 交易回滚，Unauthorized | P0 |
| CORE-REBAL-012 | rebalancer更换 | 更换后调用 | 新地址可调用 | P1 |
| **Oracle验证** | | | | |
| CORE-REBAL-013 | Oracle未设置 | oracle为0地址 | 交易回滚，OracleNotSet | P0 |
| CORE-REBAL-014 | Oracle价格异常 | 价格获取失败 | 交易回滚 | P0 |
| CORE-REBAL-015 | 价格为零 | 某资产价格=0 | 交易回滚 | P0 |
| CORE-REBAL-016 | 价格过期 | stale价格 | Oracle层面处理 | P1 |
| **Rebalancer验证** | | | | |
| CORE-REBAL-017 | Rebalancer未设置 | rebalancer为0 | 交易回滚，RebalanceNotImplemented | P0 |
| CORE-REBAL-018 | Rebalancer失效 | 合约不可用 | 交易失败 | P1 |
| **回调执行** | | | | |
| CORE-REBAL-019 | 正常回调 | 调用callback | 成功执行重新平衡 | P0 |
| CORE-REBAL-020 | 回调失败 | callback revert | 整体回滚 | P0 |
| CORE-REBAL-021 | 回调重入 | 回调中重入 | ReentrancyGuard阻止 | P0 |
| CORE-REBAL-022 | 数据传递 | 传递rebalance数据 | 正确传递给callback | P0 |
| **资产转移** | | | | |
| CORE-REBAL-023 | 发送超额资产 | 需要减少的资产 | 成功转出 | P0 |
| CORE-REBAL-024 | 接收不足资产 | 需要增加的资产 | 成功接收 | P0 |
| CORE-REBAL-025 | 净零转移 | 某资产不需调整 | 不转移 | P1 |
| CORE-REBAL-026 | 转账失败 | 资产转账失败 | 整体回滚 | P0 |
| **价值保护** | | | | |
| CORE-REBAL-027 | 价值损失检查 | 重新平衡后价值 | 损失<0.5% | P0 |
| CORE-REBAL-028 | 过度损失 | 损失>阈值 | 交易回滚，ExcessiveLoss | P0 |
| CORE-REBAL-029 | 价值增加 | 套利收益 | 允许增值 | P1 |
| CORE-REBAL-030 | 精确价值保持 | 理想情况 | 价值不变 | P1 |
| **状态更新** | | | | |
| CORE-REBAL-031 | 储备更新 | 重新平衡后reserve | 正确更新各资产储备 | P0 |
| CORE-REBAL-032 | 时间戳更新 | lastRebalanceTime | 更新为当前时间 | P0 |
| CORE-REBAL-033 | 权重保持 | 目标权重不变 | 权重配置不变 | P0 |
| **边界测试** | | | | |
| CORE-REBAL-034 | 极端偏离 | 99%偏离 | 能够处理 | P1 |
| CORE-REBAL-035 | 微小偏离 | 0.01%偏离 | 不触发 | P1 |
| CORE-REBAL-036 | 单资产ETF | 只有一个资产 | 无需重新平衡 | P2 |
| CORE-REBAL-037 | 大量资产 | 50+资产 | Gas限制内完成 | P2 |
| **异常场景** | | | | |
| CORE-REBAL-038 | 流动性不足 | DEX流动性低 | Rebalancer处理 | P0 |
| CORE-REBAL-039 | 价格操纵 | 异常价格波动 | 检测并防护 | P0 |
| CORE-REBAL-040 | 部分成功 | 部分资产失败 | 全部回滚 | P0 |
| CORE-REBAL-041 | Gas耗尽 | Gas不足 | 交易失败 | P1 |
| **集成测试** | | | | |
| CORE-REBAL-042 | 完整流程 | 触发到完成 | 端到端成功 | P0 |
| CORE-REBAL-043 | 连续重新平衡 | 多次执行 | 每次正确 | P1 |
| CORE-REBAL-044 | 与铸造赎回交互 | 混合操作 | 互不干扰 | P1 |

### 2.6 费用管理测试

| 测试ID | 测试用例 | 输入 | 预期结果 | 优先级 |
|--------|---------|------|----------|--------|
| **管理费累积** | | | | |
| CORE-FEE-001 | 时间流逝累积 | 等待1天 | 按日累积费用 | P0 |
| CORE-FEE-002 | 年化费率计算 | 1年时间 | 累积完整年费 | P0 |
| CORE-FEE-003 | 零费率 | managementFee=0 | 无费用累积 | P1 |
| CORE-FEE-004 | 最大费率 | 高费率设置 | 正确累积 | P1 |
| CORE-FEE-005 | 精度测试 | 小数点费率 | 精确计算 | P1 |
| **费用收取** | | | | |
| CORE-FEE-006 | 正常收取 | 调用_collectManagementFee | 铸造费用份额 | P0 |
| CORE-FEE-007 | 首次收取 | 初始化后首次 | 从lastCollectTime开始 | P0 |
| CORE-FEE-008 | 连续收取 | 短时间内多次 | 只收取增量 | P0 |
| CORE-FEE-009 | 长期未收取 | 1年未收取 | 累积全部费用 | P1 |
| CORE-FEE-010 | 零间隔收取 | 同块收取 | 无新费用 | P1 |
| **费用接收者** | | | | |
| CORE-FEE-011 | 正确接收 | feeCollector地址 | collector收到份额 | P0 |
| CORE-FEE-012 | 更换接收者 | 设置新collector | 新地址收费 | P1 |
| CORE-FEE-013 | 零地址拒绝 | collector=0地址 | 设置失败 | P0 |
| CORE-FEE-014 | 合约接收者 | collector是合约 | 正常接收 | P1 |
| **时间戳更新** | | | | |
| CORE-FEE-015 | 收取后更新 | lastCollectTime | 更新为当前时间 | P0 |
| CORE-FEE-016 | 时间不倒退 | 检查时间戳 | 始终递增 | P0 |
| **费率设置** | | | | |
| CORE-FEE-017 | owner设置费率 | 更新费率 | 成功更新 | P0 |
| CORE-FEE-018 | 非owner设置 | 普通用户 | 交易失败 | P0 |
| CORE-FEE-019 | 费率上限 | 超过MAX_FEE | 交易回滚，FeeTooHigh | P0 |
| CORE-FEE-020 | 费率下限 | 设为0 | 允许零费率 | P1 |
| **赎回费设置** | | | | |
| CORE-FEE-021 | 设置赎回费 | withdrawFee | 成功设置 | P0 |
| CORE-FEE-022 | 赎回费上限 | 超过限制 | 交易失败 | P0 |
| CORE-FEE-023 | 零赎回费 | withdrawFee=0 | 允许设置 | P1 |
| **影响测试** | | | | |
| CORE-FEE-024 | 对铸造影响 | 费用后铸造 | 基于新供应量 | P0 |
| CORE-FEE-025 | 对赎回影响 | 费用后赎回 | 基于新供应量 | P0 |
| CORE-FEE-026 | 对重新平衡影响 | 费用后重新平衡 | 不影响权重计算 | P1 |
| **边界和异常** | | | | |
| CORE-FEE-027 | 供应量为零 | totalSupply=0 | 无费用产生 | P1 |
| CORE-FEE-028 | 溢出保护 | 大额费用计算 | 安全处理 | P1 |
| CORE-FEE-029 | 并发收取 | 多交易同时 | 状态一致 | P1 |
| CORE-FEE-030 | 费用份额极大 | 接近总供应量 | 合理限制 | P2 |

### 2.7 查询函数测试

| 测试ID | 测试用例 | 输入 | 预期结果 | 优先级 |
|--------|---------|------|----------|--------|
| **calculateMintShares基础功能** | | | | |
| CORE-CALC-001 | 正常比例计算 | 标准资产数量数组 | 正确计算份额 | P0 |
| CORE-CALC-002 | 最小比例原则 | 不同比例资产 | 使用最小比例 | P0 |
| CORE-CALC-003 | 完美比例 | 精确比例资产 | 最大化份额 | P1 |
| CORE-CALC-004 | 单资产计算 | 只有一种资产 | 基于该资产计算 | P1 |
| **calculateMintShares参数验证** | | | | |
| CORE-CALC-005 | 数组长度不匹配 | amounts.length != assets.length | InvalidLength错误 | P0 |
| CORE-CALC-006 | 零数量输入 | amounts = [0,0] | 返回0份额 | P1 |
| CORE-CALC-007 | 部分零数量 | amounts = [100,0] | 基于非零资产计算 | P1 |
| CORE-CALC-008 | 空数组 | amounts = [] | InvalidLength错误 | P0 |
| **calculateMintShares边界测试** | | | | |
| CORE-CALC-009 | 极小数量 | 微量资产 | 正确处理精度 | P1 |
| CORE-CALC-010 | 极大数量 | 巨额资产 | 无溢出计算 | P1 |
| CORE-CALC-011 | 储备为零 | reserve = 0 | 返回0或合理处理 | P1 |
| CORE-CALC-012 | 总供应为零 | 初始化前调用 | 返回0 | P1 |
| **calculateBurnAmounts基础功能** | | | | |
| CORE-CALC-013 | 正常赎回计算 | 标准份额数量 | 正确计算资产数量 | P0 |
| CORE-CALC-014 | 费用扣除计算 | 有赎回费设置 | 正确扣除费用后计算 | P0 |
| CORE-CALC-015 | 零费用计算 | withdrawFee = 0 | 无费用扣除 | P1 |
| CORE-CALC-016 | 全部份额赎回 | 用户全部份额 | 按比例返还 | P1 |
| **calculateBurnAmounts参数验证** | | | | |
| CORE-CALC-017 | 零份额输入 | shares = 0 | 返回零数组 | P1 |
| CORE-CALC-018 | 超大份额 | shares > totalSupply | 正常计算不校验 | P1 |
| CORE-CALC-019 | 微小份额 | 1 wei份额 | 可能返回0资产 | P1 |
| **calculateBurnAmounts费用测试** | | | | |
| CORE-CALC-020 | 高费率影响 | 10%赎回费 | 显著减少资产 | P1 |
| CORE-CALC-021 | 费用向上取整 | 产生小数费用 | 费用向上取整 | P1 |
| CORE-CALC-022 | 费用等于份额 | 100%费用 | 返回零数组 | P2 |
| **calculateRequiredAmounts基础功能** | | | | |
| CORE-CALC-023 | 正常需求计算 | 标准份额数量 | 正确计算所需资产 | P0 |
| CORE-CALC-024 | 比例准确性 | 各种份额 | 严格按储备比例 | P0 |
| CORE-CALC-025 | 大额份额 | 巨量份额 | 正确按比例计算 | P1 |
| CORE-CALC-026 | 微量份额 | 极小份额 | 精度处理正确 | P1 |
| **calculateRequiredAmounts参数验证** | | | | |
| CORE-CALC-027 | 零份额输入 | shares = 0 | 返回零数组 | P1 |
| CORE-CALC-028 | 储备为零情况 | 某资产reserve=0 | 返回0需求 | P1 |
| CORE-CALC-029 | 总供应为零 | 未初始化状态 | 除零保护 | P0 |
| **精度和数学测试** | | | | |
| CORE-CALC-030 | 计算精度损失 | 除法精度损失 | 可接受误差范围 | P1 |
| CORE-CALC-031 | 大数计算 | 接近uint256.max | 无溢出 | P1 |
| CORE-CALC-032 | 舍入一致性 | 多次计算 | 结果稳定 | P1 |
| CORE-CALC-033 | 比例对称性 | 正反向计算 | 近似对称 | P1 |
| **集成测试 - calculateMintShares** | | | | |
| CORE-CALC-034 | 与mint()对比 | 相同输入 | 预测值与实际一致 | P0 |
| CORE-CALC-035 | 多余资产处理 | 超出比例资产 | 预测最小比例份额 | P0 |
| CORE-CALC-036 | 时间一致性 | 同块调用 | 结果完全一致 | P0 |
| CORE-CALC-037 | 状态变化影响 | mint后再计算 | 基于新状态计算 | P1 |
| **集成测试 - calculateBurnAmounts** | | | | |
| CORE-CALC-038 | 与burn()对比 | 相同输入 | 预测值与实际一致 | P0 |
| CORE-CALC-039 | 费用设置影响 | 更改费率后 | 计算反映新费率 | P0 |
| CORE-CALC-040 | 管理费影响 | 累积管理费时 | 不影响计算 | P1 |
| CORE-CALC-041 | 连续调用稳定性 | 多次相同调用 | 结果一致 | P1 |
| **集成测试 - calculateRequiredAmounts** | | | | |
| CORE-CALC-042 | 与mintExactShares对比 | 相同份额 | 预测值与实际一致 | P0 |
| CORE-CALC-043 | 储备变化影响 | mint/burn后 | 基于新储备计算 | P0 |
| CORE-CALC-044 | 多资产一致性 | 各资产检查 | 比例严格正确 | P0 |
| CORE-CALC-045 | 时序敏感性 | 不同时间点 | 反映当前状态 | P1 |
| **跨函数集成测试** | | | | |
| CORE-CALC-046 | 铸造-赎回循环 | mint->calculate->burn | 资产回到初始状态 | P0 |
| CORE-CALC-047 | 计算链一致性 | calculateMint->Required->Burn | 逻辑链条正确 | P0 |
| CORE-CALC-048 | 批量操作预测 | 多次操作预测 | 累积效果正确 | P1 |
| CORE-CALC-049 | 费用影响对比 | 有无费用对比 | 费用影响准确 | P1 |
| **极端场景测试** | | | | |
| CORE-CALC-050 | 单wei操作 | 1wei计算 | 合理处理或失败 | P2 |
| CORE-CALC-051 | 最大值操作 | uint256.max计算 | 溢出保护 | P2 |
| CORE-CALC-052 | 空池状态 | 所有储备为0 | 合理返回值 | P2 |
| CORE-CALC-053 | 重新平衡后 | rebalance后计算 | 基于新权重 | P1 |
| **状态依赖测试** | | | | |
| CORE-CALC-054 | 暂停状态计算 | paused=true时 | 仍可正常计算 | P1 |
| CORE-CALC-055 | 未初始化计算 | 初始化前 | 返回0或合理值 | P1 |
| CORE-CALC-056 | 价格变化影响 | Oracle价格变 | 不影响计算 | P1 |
| CORE-CALC-057 | 并发计算 | 多用户同时 | 结果独立正确 | P1 |
| **管理费差异性测试** | | | | |
| CORE-CALC-058 | calculateMintShares vs mint差异 | 累积管理费时 | 预测值偏低 | P0 |
| CORE-CALC-059 | calculateBurnAmounts vs burn差异 | 累积管理费时 | 预测值偏高 | P0 |
| CORE-CALC-060 | calculateRequiredAmounts vs mintExactShares差异 | 累积管理费时 | 预测值偏低 | P0 |
| CORE-CALC-061 | 零管理费完全一致性 | 无管理费设置 | 预测值与实际完全一致 | P0 |
| CORE-CALC-062 | 时间累积影响 | 不同时间段后 | 差异随时间增大 | P1 |
| CORE-CALC-063 | 不同费率影响 | 不同管理费率 | 差异与费率正相关 | P1 |
| CORE-CALC-064 | 管理费收取时机 | _collectManagementFee调用前后 | totalSupply变化影响 | P0 |
| CORE-CALC-065 | 稀释效应验证 | 管理费导致股权稀释 | 计算基准变化 | P0 |

### 2.8 权限和安全测试

| 测试ID | 测试用例 | 输入 | 预期结果 | 优先级 |
|--------|---------|------|----------|--------|
| **Owner权限** | | | | |
| CORE-AUTH-001 | owner设置Oracle | setPriceOracle | 成功设置 | P0 |
| CORE-AUTH-002 | owner设置Rebalancer | setRebalancer | 成功设置 | P0 |
| CORE-AUTH-003 | owner设置费率 | setFees | 成功设置 | P0 |
| CORE-AUTH-004 | owner暂停合约 | pause() | 成功暂停 | P0 |
| CORE-AUTH-005 | owner恢复合约 | unpause() | 成功恢复 | P0 |
| CORE-AUTH-006 | owner转移所有权 | transferOwnership | 成功转移 | P1 |
| CORE-AUTH-007 | owner放弃所有权 | renounceOwnership | 成功放弃 | P2 |
| **非Owner拒绝** | | | | |
| CORE-AUTH-008 | 普通用户设置Oracle | setPriceOracle | 交易失败 | P0 |
| CORE-AUTH-009 | 普通用户设置费率 | setFees | 交易失败 | P0 |
| CORE-AUTH-010 | 普通用户暂停 | pause() | 交易失败 | P0 |
| CORE-AUTH-011 | 普通用户初始化 | initialize | 交易失败 | P0 |
| **Rebalancer权限** | | | | |
| CORE-AUTH-012 | rebalancer执行重新平衡 | flashRebalance | 成功执行 | P0 |
| CORE-AUTH-013 | 非rebalancer执行 | flashRebalance | 交易失败 | P0 |
| CORE-AUTH-014 | owner作为rebalancer | owner调用 | 成功执行 | P0 |
| **暂停机制** | | | | |
| CORE-AUTH-015 | 暂停后铸造 | mint | 交易失败 | P0 |
| CORE-AUTH-016 | 暂停后赎回 | burn | 交易失败 | P0 |
| CORE-AUTH-017 | 暂停后重新平衡 | 可以执行 | 根据设计决定 | P1 |
| CORE-AUTH-018 | 恢复后操作 | 各功能 | 恢复正常 | P0 |
| **重入保护** | | | | |
| CORE-AUTH-019 | mint重入攻击 | 恶意合约 | ReentrancyGuard阻止 | P0 |
| CORE-AUTH-020 | burn重入攻击 | 恶意合约 | ReentrancyGuard阻止 | P0 |
| CORE-AUTH-021 | rebalance重入 | 恶意回调 | ReentrancyGuard阻止 | P0 |
| CORE-AUTH-022 | 跨函数重入 | A调B调A | 全部阻止 | P0 |
| **参数验证** | | | | |
| CORE-AUTH-023 | 设置零地址Oracle | address(0) | 交易失败或警告 | P0 |
| CORE-AUTH-024 | 设置零地址Rebalancer | address(0) | 允许（禁用功能） | P1 |
| CORE-AUTH-025 | 设置零地址FeeCollector | address(0) | 交易失败 | P0 |
| **紧急机制** | | | | |
| CORE-AUTH-026 | 紧急暂停 | 异常情况 | 快速暂停 | P0 |
| CORE-AUTH-027 | 分级权限 | 不同角色 | 权限分离 | P2 |
| CORE-AUTH-028 | 时间锁 | 重要操作延迟 | 如有实现 | P2 |

### 2.9 权重调整测试

| 测试ID | 测试用例 | 输入 | 预期结果 | 优先级 |
|--------|---------|------|----------|--------|
| **基础权重调整** | | | | |
| CORE-WEIGHT-001 | 正常权重调整 | 有效的新权重数组 | 权重更新成功，emit事件 | P0 |
| CORE-WEIGHT-002 | 权重总和验证 | 总和不等于10000 | 交易回滚，InvalidWeights错误 | P0 |
| CORE-WEIGHT-003 | 单个权重为0 | 包含0权重 | 交易回滚，InvalidWeights错误 | P0 |
| CORE-WEIGHT-004 | 权重数组长度错误 | 与资产数量不匹配 | 交易回滚，InvalidLength错误 | P0 |
| **权限控制** | | | | |
| CORE-WEIGHT-005 | owner调用 | 仅owner执行 | 调用成功 | P0 |
| CORE-WEIGHT-006 | 非owner调用 | 普通用户调用 | 交易回滚，Unauthorized错误 | P0 |
| CORE-WEIGHT-007 | rebalancer调用 | rebalancer执行 | 交易回滚，仅owner可调用 | P0 |
| **状态检查** | | | | |
| CORE-WEIGHT-008 | 未初始化状态 | 合约未初始化时调用 | 交易回滚，NotInitialized错误 | P0 |
| CORE-WEIGHT-009 | 暂停状态调用 | 合约暂停时调用 | 交易回滚，Paused错误 | P0 |
| CORE-WEIGHT-010 | 正常状态调用 | 合约正常运行时 | 调用成功 | P0 |
| **边界测试** | | | | |
| CORE-WEIGHT-011 | 最小权重 | 权重为1 | 正确处理 | P1 |
| CORE-WEIGHT-012 | 最大权重 | 单个权重为9999 | 正确处理 | P1 |
| CORE-WEIGHT-013 | 平均权重 | 所有权重相等 | 正确分配 | P1 |
| CORE-WEIGHT-014 | 极端分配 | 一个资产99%权重 | 正确处理 | P1 |
| **事件验证** | | | | |
| CORE-WEIGHT-015 | WeightsAdjusted事件 | 权重调整成功 | 正确emit事件和参数 | P1 |
| CORE-WEIGHT-016 | 权重变化记录 | 旧权重vs新权重 | 事件记录完整 | P1 |

### 2.10 重新平衡执行(executeRebalance)测试

| 测试ID | 测试用例 | 输入 | 预期结果 | 优先级 |
|--------|---------|------|----------|--------|
| **基础重新平衡** | | | | |
| CORE-EXEC-001 | 正常执行重新平衡 | 需要重新平衡状态 | 执行成功，更新储备 | P0 |
| CORE-EXEC-002 | 不需要重新平衡 | 权重已平衡 | 交易回滚或跳过 | P0 |
| CORE-EXEC-003 | 重新平衡冷却期 | 冷却期内调用 | 交易回滚，CooldownNotMet错误 | P0 |
| CORE-EXEC-004 | 冷却期后执行 | 冷却期结束后 | 执行成功 | P0 |
| **权限控制** | | | | |
| CORE-EXEC-005 | rebalancer调用 | rebalancer角色执行 | 调用成功 | P0 |
| CORE-EXEC-006 | owner调用 | owner执行 | 调用成功 | P0 |
| CORE-EXEC-007 | 普通用户调用 | 非授权用户 | 交易回滚，Unauthorized错误 | P0 |
| **状态检查** | | | | |
| CORE-EXEC-008 | 未初始化状态 | 合约未初始化 | 交易回滚，NotInitialized错误 | P0 |
| CORE-EXEC-009 | 暂停状态 | 合约暂停时 | 交易回滚，Paused错误 | P0 |
| CORE-EXEC-010 | 正常状态 | 合约正常运行 | 可以执行 | P0 |

### 2.11 权重调整与重新平衡集成测试

| 测试ID | 测试用例 | 场景描述 | 验证点 | 优先级 |
|--------|---------|----------|---------|--------|
| **调整后重新平衡** | | | | |
| CORE-INTEG-001 | 权重调整触发重新平衡 | adjustWeights后executeRebalance | 权重调整→重新平衡需求→执行成功 | P0 |
| CORE-INTEG-002 | 多次权重调整 | 连续调整权重 | 每次都正确更新目标权重 | P1 |
| CORE-INTEG-003 | 权重调整后状态 | 调整后检查重新平衡信息 | getRebalanceInfo返回正确状态 | P0 |
| **冷却期交互** | | | | |
| CORE-INTEG-004 | 权重调整不影响冷却期 | 调整权重后立即重新平衡 | 如果在冷却期仍然失败 | P1 |
| CORE-INTEG-005 | 重新平衡后权重调整 | 重新平衡后立即调整权重 | 权重调整成功，不受冷却期影响 | P1 |

---

## 3. ETFRebalancerV1 合约测试用例

### 3.1 回调执行测试

| 测试ID | 测试用例 | 输入 | 预期结果 | 优先级 |
|--------|---------|------|----------|--------|
| **权限验证** | | | | |
| REBAL-CB-001 | ETFCore调用 | 来自ETFCore | 成功执行 | P0 |
| REBAL-CB-002 | 非ETFCore调用 | 其他地址 | 交易回滚，NotETFCore | P0 |
| REBAL-CB-003 | 伪造ETFCore | 恶意合约冒充 | 地址验证失败 | P0 |
| **数据解析** | | | | |
| REBAL-CB-004 | 正确解析数据 | encoded数据 | 成功解析参数 | P0 |
| REBAL-CB-005 | 错误数据格式 | 格式错误 | 解析失败回滚 | P0 |
| REBAL-CB-006 | 空数据 | data为空 | 处理或失败 | P1 |
| REBAL-CB-007 | 超长数据 | 大量数据 | Gas限制内处理 | P1 |
| **资产验证** | | | | |
| REBAL-CB-008 | 验证资产数组 | 检查资产列表 | 匹配ETFCore资产 | P0 |
| REBAL-CB-009 | 验证金额数组 | 检查调整金额 | 正负金额正确 | P0 |
| REBAL-CB-010 | 数组长度匹配 | assets和amounts | 长度一致 | P0 |

### 3.2 交换执行测试

| 测试ID | 测试用例 | 输入 | 预期结果 | 优先级 |
|--------|---------|------|----------|--------|
| **USDT中介交换** | | | | |
| REBAL-SWAP-001 | 资产换USDT | 多余资产 | 成功换成USDT | P0 |
| REBAL-SWAP-002 | USDT换资产 | 需要资产 | 成功换成目标资产 | P0 |
| REBAL-SWAP-003 | 直接交换路径 | A→B有直接池 | 优化路径 | P1 |
| REBAL-SWAP-004 | 多跳交换 | A→USDT→B | 两步交换成功 | P0 |
| **V3交换** | | | | |
| REBAL-SWAP-005 | V3池存在 | 配置的V3池 | 使用V3交换 | P0 |
| REBAL-SWAP-006 | V3池不存在 | 无V3池 | 回退到V2 | P0 |
| REBAL-SWAP-007 | V3流动性不足 | 低流动性 | 部分或回退V2 | P0 |
| REBAL-SWAP-008 | V3费用层级 | 不同fee tier | 选择最优 | P1 |
| **V2交换** | | | | |
| REBAL-SWAP-009 | V2路由交换 | 使用V2 | 成功交换 | P0 |
| REBAL-SWAP-010 | V2路径计算 | 最优路径 | 自动选择路径 | P1 |
| REBAL-SWAP-011 | V2滑点保护 | 设置minOut | 保护生效 | P0 |
| **滑点控制** | | | | |
| REBAL-SWAP-012 | 正常滑点 | 滑点<3% | 交换成功 | P0 |
| REBAL-SWAP-013 | 超出滑点 | 滑点>maxSlippage | 交易回滚 | P0 |
| REBAL-SWAP-014 | 边界滑点 | 滑点=maxSlippage | 刚好成功 | P1 |
| REBAL-SWAP-015 | 滑点设置 | 更新maxSlippage | 新设置生效 | P1 |
| **最小输出** | | | | |
| REBAL-SWAP-016 | 计算最小输出 | 基于Oracle价格 | 正确计算 | P0 |
| REBAL-SWAP-017 | 输出不足 | 实际<最小 | 交易回滚 | P0 |
| REBAL-SWAP-018 | 输出刚好 | 实际=最小 | 交换成功 | P1 |
| **特殊代币处理** | | | | |
| REBAL-SWAP-019 | WBNB处理 | 涉及WBNB | 正确处理 | P0 |
| REBAL-SWAP-020 | 税收代币 | 有转账税 | 考虑税收影响 | P1 |
| REBAL-SWAP-021 | 可暂停代币 | 代币暂停 | 交换失败 | P1 |
| **异常处理** | | | | |
| REBAL-SWAP-022 | 交换失败 | swap revert | 捕获并处理 | P0 |
| REBAL-SWAP-023 | 部分成功 | 某些交换失败 | 全部回滚 | P0 |
| REBAL-SWAP-024 | Gas耗尽 | Gas不足 | 交易失败 | P1 |
| REBAL-SWAP-025 | 价格操纵 | 检测异常价格 | 防护机制 | P0 |

### 3.3 池配置测试

| 测试ID | 测试用例 | 输入 | 预期结果 | 优先级 |
|--------|---------|------|----------|--------|
| **池地址配置** | | | | |
| REBAL-POOL-001 | 设置V3池 | 资产和池地址 | 成功配置 | P0 |
| REBAL-POOL-002 | 更新池地址 | 新池地址 | 覆盖旧配置 | P1 |
| REBAL-POOL-003 | 删除池配置 | 设为0地址 | 删除配置 | P1 |
| REBAL-POOL-004 | 批量设置 | 多个池 | 批量成功 | P1 |
| **费用层级配置** | | | | |
| REBAL-POOL-005 | 设置低费用池 | 500(0.05%) | 成功设置 | P0 |
| REBAL-POOL-006 | 设置中费用池 | 2500(0.25%) | 成功设置 | P0 |
| REBAL-POOL-007 | 设置高费用池 | 10000(1%) | 成功设置 | P0 |
| REBAL-POOL-008 | 无效费用层级 | 非标准值 | 验证或拒绝 | P1 |
| **池验证** | | | | |
| REBAL-POOL-009 | 验证池存在 | 检查池合约 | 确认是有效池 | P0 |
| REBAL-POOL-010 | 验证池流动性 | 检查流动性 | 有足够流动性 | P0 |
| REBAL-POOL-011 | 验证池代币对 | 匹配资产/USDT | 代币对正确 | P0 |
| REBAL-POOL-012 | 无效池地址 | 非池合约 | 设置失败或警告 | P1 |
| **权限控制** | | | | |
| REBAL-POOL-013 | owner设置池 | owner调用 | 成功设置 | P0 |
| REBAL-POOL-014 | 非owner设置 | 普通用户 | 交易失败 | P0 |
| **事件验证** | | | | |
| REBAL-POOL-015 | PoolConfigured事件 | 设置池时 | 正确emit事件 | P1 |

### 3.4 参数管理测试

| 测试ID | 测试用例 | 输入 | 预期结果 | 优先级 |
|--------|---------|------|----------|--------|
| **滑点设置** | | | | |
| REBAL-PARAM-001 | 设置最大滑点 | 新滑点值 | 成功更新 | P0 |
| REBAL-PARAM-002 | 滑点上限 | >MAX_SLIPPAGE | 交易失败 | P0 |
| REBAL-PARAM-003 | 零滑点 | slippage=0 | 允许或警告 | P1 |
| **冷却期设置** | | | | |
| REBAL-PARAM-004 | 设置冷却期 | 新冷却时间 | 成功更新 | P1 |
| REBAL-PARAM-005 | 零冷却期 | cooldown=0 | 允许连续重新平衡 | P1 |
| REBAL-PARAM-006 | 超长冷却期 | >1周 | 验证合理性 | P2 |
| **最小金额设置** | | | | |
| REBAL-PARAM-007 | 设置最小重新平衡额 | 新最小值 | 成功更新 | P1 |
| REBAL-PARAM-008 | 零最小额 | min=0 | 允许任意额度 | P2 |

### 3.5 紧急控制测试

| 测试ID | 测试用例 | 输入 | 预期结果 | 优先级 |
|--------|---------|------|----------|--------|
| **暂停机制** | | | | |
| REBAL-EMRG-001 | 暂停重新平衡 | pause() | 拒绝新重新平衡 | P0 |
| REBAL-EMRG-002 | 恢复重新平衡 | unpause() | 恢复正常 | P0 |
| REBAL-EMRG-003 | 暂停中调用 | 暂停时回调 | 交易失败 | P0 |
| **资产救援** | | | | |
| REBAL-EMRG-004 | 提取ETH | 合约有ETH | owner提取成功 | P1 |
| REBAL-EMRG-005 | 提取ERC20 | 困住的代币 | owner提取成功 | P1 |
| REBAL-EMRG-006 | 非owner提取 | 普通用户 | 交易失败 | P0 |
| REBAL-EMRG-007 | 提取零余额 | 无资产 | 交易成功但无转账 | P2 |

---

## 4. ETFRouterV1 合约测试用例

**测试用例总数**: 370个（原有76个 + 新增294个）

**测试覆盖范围**:
- **4.1 USDT铸造ETF测试**: 38个测试用例
- **4.2 ETF赎回为USDT测试**: 27个测试用例
- **4.3 辅助功能测试**: 11个测试用例
- **4.4 状态管理和存储测试**: 16个测试用例（新增）
- **4.5 多步事务原子性测试**: 18个测试用例（新增）
- **4.6 DEX集成和路由测试**: 20个测试用例（新增）
- **4.7 精确计算和精度测试**: 16个测试用例（新增）
- **4.8 并发和竞争条件测试**: 14个测试用例（新增）
- **4.9 安全和攻击向量测试**: 20个测试用例（新增）
- **4.10 性能和Gas优化测试**: 12个测试用例（新增）
- **4.11 错误恢复和回滚测试**: 18个测试用例（新增）
- **4.12 事件和日志测试**: 10个测试用例（新增）
- **4.13 高级管理功能测试**: 10个测试用例（新增）
- **4.14 预估计算专项测试**: 60个测试用例（新增）
- **4.15 铸造功能100%覆盖率测试**: 40个测试用例（新增）
- **4.16 赎回功能100%覆盖率测试**: 40个测试用例（新增）

**优先级分布**:
- P0 (高优先级): 主要覆盖核心功能和安全关键场景
- P1 (中优先级): 覆盖重要功能和常见边界情况
- P2 (低优先级): 覆盖优化和高级特性

### 4.1 USDT铸造ETF测试

| 测试ID | 测试用例 | 输入 | 预期结果 | 优先级 |
|--------|---------|------|----------|--------|
| **基础铸造流程** | | | | |
| ROUTE-MINT-001 | 正常USDT铸造 | USDT金额 | 成功铸造ETF | P0 |
| ROUTE-MINT-002 | 计算份额 | 基于当前价格 | 正确计算预期份额 | P0 |
| ROUTE-MINT-003 | 分配USDT | 按权重分配 | 正确分配到各资产 | P0 |
| **参数验证** | | | | |
| ROUTE-MINT-004 | 零金额 | amount=0 | 交易回滚，ZeroAmount | P0 |
| ROUTE-MINT-005 | 零地址接收 | to=address(0) | 交易回滚 | P0 |
| ROUTE-MINT-006 | 超时检查 | deadline已过 | 交易回滚，TransactionExpired | P0 |
| ROUTE-MINT-007 | 未来deadline | 远期时间 | 正常执行 | P1 |
| **USDT处理** | | | | |
| ROUTE-MINT-008 | USDT余额不足 | 余额<amount | transferFrom失败 | P0 |
| ROUTE-MINT-009 | USDT授权不足 | allowance<amount | transferFrom失败 | P0 |
| ROUTE-MINT-010 | USDT转入 | 从用户转入 | 成功接收USDT | P0 |
| **资产交换** | | | | |
| ROUTE-MINT-011 | USDT→资产1 | 交换第一个资产 | 成功获得资产 | P0 |
| ROUTE-MINT-012 | USDT→资产2 | 交换第二个资产 | 成功获得资产 | P0 |
| ROUTE-MINT-013 | 批量交换 | 所有资产 | 全部成功 | P0 |
| ROUTE-MINT-014 | 交换失败处理 | 某个交换失败 | 全部回滚 | P0 |
| **路径选择** | | | | |
| ROUTE-MINT-015 | V3直接路径 | 有V3池 | 使用V3交换 | P0 |
| ROUTE-MINT-016 | V2备用路径 | 无V3池 | 使用V2交换 | P0 |
| ROUTE-MINT-017 | 混合路径 | 部分V3部分V2 | 灵活选择 | P1 |
| ROUTE-MINT-018 | WBNB中转 | 无直接池 | 通过WBNB | P1 |
| **滑点保护** | | | | |
| ROUTE-MINT-019 | 设置滑点 | slippage参数 | 应用滑点保护 | P0 |
| ROUTE-MINT-020 | 默认滑点 | 不设置 | 使用默认值 | P0 |
| ROUTE-MINT-021 | 超出滑点 | 实际>设置 | 交易回滚 | P0 |
| ROUTE-MINT-022 | 累积滑点 | 多步交换 | 总滑点控制 | P1 |
| **ETF铸造** | | | | |
| ROUTE-MINT-023 | 授权ETFCore | approve资产 | 成功授权 | P0 |
| ROUTE-MINT-024 | 调用mintExactShares | 指定份额 | 成功铸造 | P0 |
| ROUTE-MINT-025 | 份额验证 | 实际vs预期 | 符合预期 | P0 |
| ROUTE-MINT-026 | 最小份额保护 | minShares参数 | 低于最小回滚 | P0 |
| **剩余处理** | | | | |
| ROUTE-MINT-027 | USDT剩余 | 未用完USDT | 返还给用户 | P0 |
| ROUTE-MINT-028 | 资产剩余 | 多余资产 | 返还或保留 | P1 |
| ROUTE-MINT-029 | 无剩余 | 完全使用 | 无需返还 | P1 |
| **事件和返回值** | | | | |
| ROUTE-MINT-030 | 返回份额数 | 函数返回值 | 正确的份额数 | P0 |
| ROUTE-MINT-031 | 事件记录 | emit事件 | 完整记录 | P1 |
| **异常场景** | | | | |
| ROUTE-MINT-032 | Oracle失效 | 价格不可用 | 交易失败 | P0 |
| ROUTE-MINT-033 | 池不存在 | 未配置池 | PoolNotFound | P0 |
| ROUTE-MINT-034 | 流动性不足 | DEX流动性低 | 交换失败 | P0 |
| ROUTE-MINT-035 | Gas耗尽 | Gas不足 | 交易失败 | P1 |
| **边界测试** | | | | |
| ROUTE-MINT-036 | 最小金额 | 1 USDT | 可能失败 | P1 |
| ROUTE-MINT-037 | 巨额金额 | 1M USDT | 测试限制 | P1 |
| ROUTE-MINT-038 | 精度测试 | 小数金额 | 正确处理 | P1 |

### 4.2 ETF赎回为USDT测试

| 测试ID | 测试用例 | 输入 | 预期结果 | 优先级 |
|--------|---------|------|----------|--------|
| **基础赎回流程** | | | | |
| ROUTE-BURN-001 | 正常赎回 | ETF份额 | 成功获得USDT | P0 |
| ROUTE-BURN-002 | 计算USDT | 基于当前价值 | 正确计算USDT数量 | P0 |
| ROUTE-BURN-003 | 全部赎回 | 用户全部份额 | 赎回所有 | P0 |
| ROUTE-BURN-004 | 部分赎回 | 部分份额 | 按比例赎回 | P0 |
| **参数验证** | | | | |
| ROUTE-BURN-005 | 零份额 | shares=0 | 交易回滚 | P0 |
| ROUTE-BURN-006 | 超出余额 | shares>余额 | 交易失败 | P0 |
| ROUTE-BURN-007 | 零地址接收 | to=address(0) | 交易回滚 | P0 |
| ROUTE-BURN-008 | 超时检查 | deadline已过 | 交易回滚 | P0 |
| **ETF赎回** | | | | |
| ROUTE-BURN-009 | 授权Router | approve份额 | 成功授权 | P0 |
| ROUTE-BURN-010 | 调用burn | Router代理赎回 | 成功赎回 | P0 |
| ROUTE-BURN-011 | 接收资产 | 获得底层资产 | 正确接收 | P0 |
| **资产→USDT交换** | | | | |
| ROUTE-BURN-012 | 资产1→USDT | 交换第一个 | 成功换USDT | P0 |
| ROUTE-BURN-013 | 资产2→USDT | 交换第二个 | 成功换USDT | P0 |
| ROUTE-BURN-014 | 批量交换 | 所有资产 | 全部换成USDT | P0 |
| ROUTE-BURN-015 | 聚合USDT | 汇总所有 | 总额正确 | P0 |
| **最小输出保护** | | | | |
| ROUTE-BURN-016 | 设置minUSDT | 最小USDT数量 | 保护生效 | P0 |
| ROUTE-BURN-017 | 低于最小 | 实际<minUSDT | 交易回滚 | P0 |
| ROUTE-BURN-018 | 刚好最小 | 实际=minUSDT | 成功完成 | P1 |
| **USDT转账** | | | | |
| ROUTE-BURN-019 | 转给用户 | USDT到接收地址 | 成功转账 | P0 |
| ROUTE-BURN-020 | 转给合约 | to是合约 | 如可接收则成功 | P1 |
| ROUTE-BURN-021 | 扣除费用后 | 有赎回费 | 用户收到净额 | P0 |
| **异常处理** | | | | |
| ROUTE-BURN-022 | 交换失败 | swap失败 | 全部回滚 | P0 |
| ROUTE-BURN-023 | 部分失败 | 某些失败 | 全部回滚 | P0 |
| ROUTE-BURN-024 | 滑点过大 | 超出容忍 | 交易失败 | P0 |
| **特殊场景** | | | | |
| ROUTE-BURN-025 | 价格波动 | 赎回时价格变化 | 基于实时价格 | P1 |
| ROUTE-BURN-026 | 低流动性 | DEX流动性不足 | 影响价格 | P1 |
| ROUTE-BURN-027 | 连续赎回 | 多次赎回 | 每次独立 | P1 |

### 4.3 辅助功能测试

| 测试ID | 测试用例 | 输入 | 预期结果 | 优先级 |
|--------|---------|------|----------|--------|
| **池配置** | | | | |
| ROUTE-AUX-001 | 设置资产池 | 资产和池地址 | 成功配置 | P0 |
| ROUTE-AUX-002 | 更新池 | 新池地址 | 覆盖旧池 | P1 |
| ROUTE-AUX-003 | 批量设置池 | 多个池 | 批量成功 | P1 |
| **参数设置** | | | | |
| ROUTE-AUX-004 | 设置默认滑点 | 新滑点值 | 成功更新 | P1 |
| ROUTE-AUX-005 | 设置默认费用层级 | 新fee tier | 成功更新 | P1 |
| **查询功能** | | | | |
| ROUTE-AUX-006 | 预估铸造 | USDT数量 | 返回预期份额 | P0 |
| ROUTE-AUX-007 | 预估赎回 | ETF份额 | 返回预期USDT | P0 |
| ROUTE-AUX-008 | 获取最优路径 | 交换对 | 返回最优路径 | P1 |
| **紧急功能** | | | | |
| ROUTE-AUX-009 | 暂停Router | pause() | 停止新交易 | P0 |
| ROUTE-AUX-010 | 恢复Router | unpause() | 恢复服务 | P0 |
| ROUTE-AUX-011 | 提取困住资产 | 有剩余资产 | owner提取 | P1 |

### 4.4 状态管理和存储测试

| 测试ID | 测试用例 | 输入 | 预期结果 | 优先级 |
|--------|---------|------|----------|--------|
| **状态一致性** | | | | |
| ROUTE-STATE-001 | 多步操作原子性 | 复杂铸造流程 | 全部成功或全部回滚 | P0 |
| ROUTE-STATE-002 | 中间状态清理 | 操作失败时 | 无中间状态残留 | P0 |
| ROUTE-STATE-003 | 状态变量同步 | 并发操作 | 状态一致性 | P0 |
| ROUTE-STATE-004 | 存储槽冲突检测 | 升级时 | 无存储冲突 | P1 |
| **配置状态** | | | | |
| ROUTE-STATE-005 | 池配置持久化 | 设置后重启 | 配置保持 | P0 |
| ROUTE-STATE-006 | 滑点配置生效 | 修改默认滑点 | 新交易使用新值 | P0 |
| ROUTE-STATE-007 | 费用层级更新 | 变更fee tier | 路由使用新层级 | P1 |
| ROUTE-STATE-008 | 配置版本管理 | 多次更新 | 使用最新配置 | P1 |
| **缓存状态** | | | | |
| ROUTE-STATE-009 | 价格缓存失效 | 超时后 | 重新获取价格 | P1 |
| ROUTE-STATE-010 | 路径缓存更新 | 池状态变化 | 路径重新计算 | P1 |
| ROUTE-STATE-011 | 估算缓存清理 | 价格波动时 | 缓存及时更新 | P1 |
| **错误状态** | | | | |
| ROUTE-STATE-012 | 失败状态恢复 | 从错误中恢复 | 状态正确重置 | P0 |
| ROUTE-STATE-013 | 紧急状态设置 | 暂停状态 | 阻止新操作 | P0 |
| ROUTE-STATE-014 | 状态迁移 | 升级时 | 平滑迁移 | P1 |
| **内存管理** | | | | |
| ROUTE-STATE-015 | 内存使用优化 | 大量操作 | 无内存泄露 | P1 |
| ROUTE-STATE-016 | 临时变量清理 | 函数结束 | 内存释放 | P1 |

### 4.5 多步事务原子性测试

| 测试ID | 测试用例 | 输入 | 预期结果 | 优先级 |
|--------|---------|------|----------|--------|
| **铸造原子性** | | | | |
| ROUTE-ATOM-001 | USDT转入失败 | 余额不足 | 整个铸造回滚 | P0 |
| ROUTE-ATOM-002 | 第一次交换失败 | 流动性不足 | 已转入USDT退回 | P0 |
| ROUTE-ATOM-003 | 中间交换失败 | 某个资产交换失败 | 前面交换回滚 | P0 |
| ROUTE-ATOM-004 | ETF铸造失败 | Core合约问题 | 所有交换回滚 | P0 |
| ROUTE-ATOM-005 | 份额检查失败 | 低于预期 | 完整回滚 | P0 |
| **赎回原子性** | | | | |
| ROUTE-ATOM-006 | 份额转移失败 | 授权不足 | 赎回不开始 | P0 |
| ROUTE-ATOM-007 | ETF燃烧失败 | Core问题 | 无资产损失 | P0 |
| ROUTE-ATOM-008 | 资产交换失败 | 某个交换失败 | 资产退回用户 | P0 |
| ROUTE-ATOM-009 | USDT聚合失败 | 计算错误 | 资产退回 | P0 |
| ROUTE-ATOM-010 | 最终转账失败 | 接收地址问题 | USDT留在合约 | P0 |
| **复杂场景** | | | | |
| ROUTE-ATOM-011 | 多资产部分失败 | 3个中1个失败 | 所有操作回滚 | P0 |
| ROUTE-ATOM-012 | 批量操作失败 | 批量中某个失败 | 全批次回滚 | P1 |
| ROUTE-ATOM-013 | 嵌套调用失败 | 深层调用失败 | 顶层调用回滚 | P1 |
| ROUTE-ATOM-014 | 外部依赖失败 | DEX服务中断 | 优雅降级 | P1 |
| **Gas相关** | | | | |
| ROUTE-ATOM-015 | Gas不足中断 | 中途Gas用完 | 已执行部分回滚 | P0 |
| ROUTE-ATOM-016 | Gas估算错误 | 预估不准 | 交易失败但安全 | P1 |
| **时间相关** | | | | |
| ROUTE-ATOM-017 | 超时回滚 | deadline期间失败 | 完整回滚 | P0 |
| ROUTE-ATOM-018 | 时间窗口原子性 | 跨区块操作 | 保持原子性 | P1 |

### 4.6 DEX集成和路由测试

| 测试ID | 测试用例 | 输入 | 预期结果 | 优先级 |
|--------|---------|------|----------|--------|
| **V3路由测试** | | | | |
| ROUTE-DEX-001 | V3单跳交换 | 直接池 | 使用V3路由 | P0 |
| ROUTE-DEX-002 | V3多跳交换 | 需要中转 | 多跳路径 | P0 |
| ROUTE-DEX-003 | V3费用层级选择 | 不同fee tier | 选择最优层级 | P0 |
| ROUTE-DEX-004 | V3集中流动性 | 价格区间内外 | 正确处理 | P1 |
| **V2路由测试** | | | | |
| ROUTE-DEX-005 | V2单跳交换 | 标准池 | 使用V2路由 | P0 |
| ROUTE-DEX-006 | V2多跳交换 | 通过WBNB | 多跳成功 | P0 |
| ROUTE-DEX-007 | V2恒定乘积 | AMM公式 | 价格计算正确 | P1 |
| **混合路由** | | | | |
| ROUTE-DEX-008 | V3优先策略 | V3有池时 | 优先使用V3 | P0 |
| ROUTE-DEX-009 | V2备用策略 | V3无池时 | 自动用V2 | P0 |
| ROUTE-DEX-010 | 动态路由选择 | 实时比较 | 选择最优路径 | P1 |
| ROUTE-DEX-011 | 路由切换 | 池状态变化 | 动态切换 | P1 |
| **流动性测试** | | | | |
| ROUTE-DEX-012 | 低流动性处理 | 流动性不足 | 价格影响大 | P0 |
| ROUTE-DEX-013 | 高流动性优化 | 充足流动性 | 价格影响小 | P1 |
| ROUTE-DEX-014 | 流动性枯竭 | 池流动性为0 | 交换失败 | P0 |
| **价格影响** | | | | |
| ROUTE-DEX-015 | 大额交易影响 | 大量资金 | 价格冲击大 | P0 |
| ROUTE-DEX-016 | 分批交易优化 | 拆分大单 | 减少冲击 | P1 |
| ROUTE-DEX-017 | 价格恢复时间 | 交易后 | 价格逐步恢复 | P1 |
| **错误处理** | | | | |
| ROUTE-DEX-018 | 池不存在错误 | 无效池地址 | 正确错误信息 | P0 |
| ROUTE-DEX-019 | 路由计算失败 | 无可行路径 | 友好错误提示 | P0 |
| ROUTE-DEX-020 | DEX服务中断 | 外部服务问题 | 降级处理 | P1 |

### 4.7 精确计算和精度测试

| 测试ID | 测试用例 | 输入 | 预期结果 | 优先级 |
|--------|---------|------|----------|--------|
| **数值精度** | | | | |
| ROUTE-CALC-001 | 18位精度计算 | 标准精度 | 无精度损失 | P0 |
| ROUTE-CALC-002 | 不同精度转换 | 6位→18位 | 正确转换 | P0 |
| ROUTE-CALC-003 | 精度截断处理 | 超高精度 | 安全截断 | P1 |
| ROUTE-CALC-004 | 舍入误差控制 | 除法运算 | 误差在可接受范围 | P0 |
| **份额计算** | | | | |
| ROUTE-CALC-005 | 份额精确计算 | USDT→份额 | 计算精确 | P0 |
| ROUTE-CALC-006 | 反向份额计算 | 份额→USDT | 双向一致 | P0 |
| ROUTE-CALC-007 | 权重计算精度 | 资产权重分配 | 总和为100% | P0 |
| ROUTE-CALC-008 | 比例分配精度 | 按比例分配 | 无分配损失 | P0 |
| **价格计算** | | | | |
| ROUTE-CALC-009 | 滑点计算精度 | 滑点保护 | 计算精确 | P0 |
| ROUTE-CALC-010 | 汇率计算 | 资产汇率 | 双向汇率一致 | P0 |
| ROUTE-CALC-011 | 累积价格计算 | 多步交换 | 价格链式计算 | P1 |
| **边界值测试** | | | | |
| ROUTE-CALC-012 | 最小值计算 | 1 wei | 正确处理 | P1 |
| ROUTE-CALC-013 | 最大值计算 | 接近uint256最大 | 无溢出 | P1 |
| ROUTE-CALC-014 | 零值计算 | 零金额 | 正确处理 | P0 |
| **溢出保护** | | | | |
| ROUTE-CALC-015 | 乘法溢出检查 | 大数乘法 | 安全检查 | P0 |
| ROUTE-CALC-016 | 加法溢出检查 | 累积计算 | 防止溢出 | P0 |

### 4.8 并发和竞争条件测试

| 测试ID | 测试用例 | 输入 | 预期结果 | 优先级 |
|--------|---------|------|----------|--------|
| **同时操作** | | | | |
| ROUTE-RACE-001 | 同时铸造 | 多用户同时铸造 | 各自独立成功 | P0 |
| ROUTE-RACE-002 | 同时赎回 | 多用户同时赎回 | 各自独立成功 | P0 |
| ROUTE-RACE-003 | 铸造赎回并发 | 同时铸造和赎回 | 不互相影响 | P0 |
| **配置竞争** | | | | |
| ROUTE-RACE-004 | 配置修改竞争 | 同时修改配置 | 最后一个生效 | P1 |
| ROUTE-RACE-005 | 读写竞争 | 读配置时修改 | 读到一致状态 | P1 |
| **资源竞争** | | | | |
| ROUTE-RACE-006 | 池资源竞争 | 同时使用相同池 | 资源正确分配 | P0 |
| ROUTE-RACE-007 | 价格竞争 | 同时读取价格 | 一致价格视图 | P0 |
| ROUTE-RACE-008 | 流动性竞争 | 争夺流动性 | 公平处理 | P1 |
| **状态竞争** | | | | |
| ROUTE-RACE-009 | 状态读写竞争 | 修改时读取 | 状态一致 | P0 |
| ROUTE-RACE-010 | 批量操作竞争 | 批量vs单个 | 操作隔离 | P1 |
| **MEV竞争** | | | | |
| ROUTE-RACE-011 | 前置交易攻击 | MEV机器人 | 滑点保护生效 | P0 |
| ROUTE-RACE-012 | 夹层攻击 | 三明治攻击 | 损失控制 | P0 |
| ROUTE-RACE-013 | 价格操纵攻击 | 操纵预言机 | 检测并防护 | P0 |
| ROUTE-RACE-014 | 延迟攻击 | 故意延迟交易 | 超时保护 | P1 |

### 4.9 安全和攻击向量测试

| 测试ID | 测试用例 | 输入 | 预期结果 | 优先级 |
|--------|---------|------|----------|--------|
| **重入攻击** | | | | |
| ROUTE-SEC-001 | 单一重入攻击 | 回调中重入 | 重入保护生效 | P0 |
| ROUTE-SEC-002 | 跨函数重入 | 不同函数重入 | 全局保护 | P0 |
| ROUTE-SEC-003 | 跨合约重入 | 通过其他合约 | 检测并阻止 | P0 |
| **闪电贷攻击** | | | | |
| ROUTE-SEC-004 | 价格操纵 | 用闪电贷操纵 | 价格保护机制 | P0 |
| ROUTE-SEC-005 | 流动性抽取 | 抽取DEX流动性 | 滑点保护 | P0 |
| ROUTE-SEC-006 | 套利攻击 | 跨DEX套利 | 合理价差 | P1 |
| **权限攻击** | | | | |
| ROUTE-SEC-007 | 权限绕过 | 绕过owner检查 | 权限验证有效 | P0 |
| ROUTE-SEC-008 | 伪造调用者 | 伪造msg.sender | 身份验证 | P0 |
| ROUTE-SEC-009 | 代理调用攻击 | 恶意代理 | 调用验证 | P1 |
| **数据攻击** | | | | |
| ROUTE-SEC-010 | 恶意参数 | 极端参数值 | 参数验证 | P0 |
| ROUTE-SEC-011 | 数据污染 | 污染输入数据 | 数据清洗 | P1 |
| ROUTE-SEC-012 | 编码攻击 | 恶意编码数据 | 解码验证 | P1 |
| **经济攻击** | | | | |
| ROUTE-SEC-013 | 经济激励攻击 | 操纵激励机制 | 激励设计合理 | P1 |
| ROUTE-SEC-014 | 费用攻击 | 极端费用设置 | 费用限制 | P1 |
| ROUTE-SEC-015 | 价值提取攻击 | MEV价值提取 | 最小化MEV | P1 |
| **DoS攻击** | | | | |
| ROUTE-SEC-016 | Gas DoS | 消耗大量Gas | Gas限制保护 | P0 |
| ROUTE-SEC-017 | 存储DoS | 大量存储写入 | 存储限制 | P1 |
| ROUTE-SEC-018 | 计算DoS | 复杂计算攻击 | 计算限制 | P1 |
| **其他攻击** | | | | |
| ROUTE-SEC-019 | 时间戳操纵 | 矿工操纵时间 | 时间验证 | P1 |
| ROUTE-SEC-020 | 区块重组攻击 | 链重组 | 重组抵抗 | P1 |

### 4.10 性能和Gas优化测试

| 测试ID | 测试用例 | 输入 | 预期结果 | 优先级 |
|--------|---------|------|----------|--------|
| **Gas消耗** | | | | |
| ROUTE-GAS-001 | 基础铸造Gas | 单次铸造 | Gas<200k | P1 |
| ROUTE-GAS-002 | 复杂铸造Gas | 多资产铸造 | Gas<500k | P1 |
| ROUTE-GAS-003 | 基础赎回Gas | 单次赎回 | Gas<300k | P1 |
| ROUTE-GAS-004 | 批量操作Gas | 批量vs单个 | 批量更高效 | P1 |
| **优化效果** | | | | |
| ROUTE-GAS-005 | 路径优化 | 最优vs次优路径 | Gas差异<20% | P1 |
| ROUTE-GAS-006 | 缓存效果 | 有缓存vs无缓存 | 缓存节省Gas | P2 |
| ROUTE-GAS-007 | 批量优化 | 批量配置 | 比单个配置省Gas | P2 |
| **极限测试** | | | | |
| ROUTE-GAS-008 | 最大资产数 | 支持的最大数量 | 不超Gas限制 | P1 |
| ROUTE-GAS-009 | 最大用户数 | 大量用户操作 | 单个操作Gas稳定 | P2 |
| ROUTE-GAS-010 | 复杂路径 | 最复杂路径 | Gas在可接受范围 | P1 |
| **Gas预估** | | | | |
| ROUTE-GAS-011 | 预估准确性 | 预估vs实际 | 误差<10% | P1 |
| ROUTE-GAS-012 | 动态预估 | 不同条件下 | 预估实时调整 | P2 |

### 4.11 错误恢复和回滚测试

| 测试ID | 测试用例 | 输入 | 预期结果 | 优先级 |
|--------|---------|------|----------|--------|
| **自动恢复** | | | | |
| ROUTE-ERR-001 | 交换失败恢复 | DEX临时故障 | 自动重试成功 | P0 |
| ROUTE-ERR-002 | 价格刷新恢复 | Oracle临时失效 | 等待后恢复 | P0 |
| ROUTE-ERR-003 | 网络恢复 | 网络中断后 | 状态正确恢复 | P1 |
| **手动恢复** | | | | |
| ROUTE-ERR-004 | 紧急暂停恢复 | 暂停后恢复 | 功能正常 | P0 |
| ROUTE-ERR-005 | 配置重置恢复 | 错误配置后 | 重置到正确状态 | P0 |
| ROUTE-ERR-006 | 资产救援 | 困住资产 | owner救援成功 | P1 |
| **状态回滚** | | | | |
| ROUTE-ERR-007 | 完整事务回滚 | 多步操作失败 | 完全回滚 | P0 |
| ROUTE-ERR-008 | 部分回滚 | 可部分成功时 | 部分保留 | P1 |
| ROUTE-ERR-009 | 嵌套回滚 | 深层调用失败 | 层层回滚 | P1 |
| **数据一致性** | | | | |
| ROUTE-ERR-010 | 数据修复 | 不一致数据 | 自动修复 | P1 |
| ROUTE-ERR-011 | 状态同步 | 状态不同步 | 强制同步 | P1 |
| **错误分类处理** | | | | |
| ROUTE-ERR-012 | 临时错误处理 | 可重试错误 | 自动重试 | P0 |
| ROUTE-ERR-013 | 永久错误处理 | 不可恢复错误 | 正确终止 | P0 |
| ROUTE-ERR-014 | 未知错误处理 | 未预期错误 | 安全模式 | P1 |
| **恢复验证** | | | | |
| ROUTE-ERR-015 | 恢复完整性验证 | 恢复后 | 状态完整正确 | P0 |
| ROUTE-ERR-016 | 恢复性能测试 | 恢复时间 | 在可接受范围 | P1 |
| **用户体验** | | | | |
| ROUTE-ERR-017 | 错误信息友好性 | 错误发生时 | 友好错误提示 | P1 |
| ROUTE-ERR-018 | 恢复进度提示 | 恢复过程中 | 进度可见 | P2 |

### 4.12 事件和日志测试

| 测试ID | 测试用例 | 输入 | 预期结果 | 优先级 |
|--------|---------|------|----------|--------|
| **事件完整性** | | | | |
| ROUTE-LOG-001 | 铸造事件记录 | 完整铸造流程 | 所有关键事件 | P1 |
| ROUTE-LOG-002 | 赎回事件记录 | 完整赎回流程 | 所有关键事件 | P1 |
| ROUTE-LOG-003 | 配置变更事件 | 参数修改 | 变更事件记录 | P1 |
| **事件数据** | | | | |
| ROUTE-LOG-004 | 事件参数完整 | 所有事件 | 参数完整准确 | P1 |
| ROUTE-LOG-005 | 事件索引正确 | 检索事件 | 索引可用 | P1 |
| ROUTE-LOG-006 | 事件时序正确 | 事件顺序 | 按时间排序 | P1 |
| **错误事件** | | | | |
| ROUTE-LOG-007 | 错误事件记录 | 操作失败 | 错误原因记录 | P1 |
| ROUTE-LOG-008 | 异常事件记录 | 异常情况 | 异常详情记录 | P1 |
| **性能监控** | | | | |
| ROUTE-LOG-009 | 性能指标记录 | Gas消耗等 | 性能数据记录 | P2 |
| ROUTE-LOG-010 | 操作统计 | 操作计数 | 统计数据准确 | P2 |

### 4.13 高级管理功能测试

| 测试ID | 测试用例 | 输入 | 预期结果 | 优先级 |
|--------|---------|------|----------|--------|
| **升级管理** | | | | |
| ROUTE-MGT-001 | 合约升级 | 新版本部署 | 平滑升级 | P1 |
| ROUTE-MGT-002 | 存储迁移 | 数据迁移 | 数据完整 | P1 |
| ROUTE-MGT-003 | 版本兼容性 | 向后兼容 | 旧版本可用 | P1 |
| **监控管理** | | | | |
| ROUTE-MGT-004 | 健康检查 | 系统状态 | 状态报告 | P1 |
| ROUTE-MGT-005 | 性能监控 | 性能指标 | 实时监控 | P2 |
| ROUTE-MGT-006 | 告警系统 | 异常检测 | 及时告警 | P1 |
| **运营管理** | | | | |
| ROUTE-MGT-007 | 容量管理 | 使用量监控 | 容量规划 | P2 |
| ROUTE-MGT-008 | 费用管理 | 费用收取 | 费用分配 | P1 |
| ROUTE-MGT-009 | 用户管理 | 用户权限 | 权限控制 | P1 |
| ROUTE-MGT-010 | 数据备份 | 关键数据 | 备份恢复 | P1 |

### 4.14 预估计算专项测试

| 测试ID | 测试用例 | 输入 | 预期结果 | 优先级 |
|--------|---------|------|----------|--------|
| **estimateUSDTForMint函数测试** | | | | |
| ROUTE-EST-001 | 基础铸造预估 | 100份额 | 返回所需USDT数量 | P0 |
| ROUTE-EST-002 | 零份额预估 | 0份额 | 返回0 | P0 |
| ROUTE-EST-003 | 大额份额预估 | 1M份额 | 正确计算不溢出 | P1 |
| ROUTE-EST-004 | 微量份额预估 | 1 wei份额 | 正确处理精度 | P1 |
| ROUTE-EST-005 | 包含USDT资产 | ETF含USDT | USDT部分直接累加 | P0 |
| ROUTE-EST-006 | 不含USDT资产 | ETF无USDT | 全部通过Oracle转换 | P0 |
| ROUTE-EST-007 | 混合资产预估 | 部分USDT部分其他 | 正确区分处理 | P0 |
| ROUTE-EST-008 | 滑点缓冲计算 | 默认滑点设置 | 正确添加滑点缓冲 | P0 |
| ROUTE-EST-009 | 自定义滑点影响 | 修改默认滑点 | 预估值相应调整 | P1 |
| ROUTE-EST-010 | 最大滑点预估 | 5%最大滑点 | 添加最大缓冲 | P1 |
| **estimateUSDTFromBurn函数测试** | | | | |
| ROUTE-EST-011 | 基础赎回预估 | 100份额 | 返回可得USDT数量 | P0 |
| ROUTE-EST-012 | 零份额赎回预估 | 0份额 | 返回0 | P0 |
| ROUTE-EST-013 | 全部份额赎回预估 | 用户全部份额 | 按比例计算 | P1 |
| ROUTE-EST-014 | 赎回费用影响 | 有赎回费设置 | 基于净份额计算 | P0 |
| ROUTE-EST-015 | 无赎回费预估 | 赎回费为0 | 全额预估 | P1 |
| ROUTE-EST-016 | 包含USDT赎回 | 含USDT资产 | USDT部分直接累加 | P0 |
| ROUTE-EST-017 | 滑点扣除计算 | 默认滑点 | 正确扣除滑点 | P0 |
| ROUTE-EST-018 | V3 Oracle回退 | V3报价失败 | 使用Oracle价格 | P1 |
| **estimateSharesFromUSDT函数测试** | | | | |
| ROUTE-EST-019 | 基础份额预估 | 1000 USDT | 返回可得份额数 | P0 |
| ROUTE-EST-020 | 零USDT预估 | 0 USDT | 返回0份额 | P0 |
| ROUTE-EST-021 | 总供应为零 | ETF未初始化 | 返回0份额 | P0 |
| ROUTE-EST-022 | 总价值为零 | ETF价值为0 | 返回0份额 | P0 |
| ROUTE-EST-023 | USDT价格变化 | Oracle价格波动 | 预估相应调整 | P0 |
| ROUTE-EST-024 | 精度损失控制 | 除法计算 | 精度在可接受范围 | P1 |
| ROUTE-EST-025 | 滑点扣除影响 | 不同滑点设置 | 预估份额相应减少 | P0 |
| ROUTE-EST-026 | 极大USDT金额 | 接近uint256最大 | 无溢出错误 | P1 |
| **_estimateUSDTForAsset内部函数测试** | | | | |
| ROUTE-EST-027 | 资产为USDT | asset=USDT | 直接返回金额 | P0 |
| ROUTE-EST-028 | 非USDT资产 | 其他代币 | 通过Oracle转换 | P0 |
| ROUTE-EST-029 | Oracle价格为0 | 价格异常 | 合理错误处理 | P0 |
| ROUTE-EST-030 | USDT价格异常 | USDT价格≠1 | 正确汇率计算 | P1 |
| ROUTE-EST-031 | 滑点缓冲应用 | 加滑点保护 | 预估值增加 | P0 |
| ROUTE-EST-032 | 精度转换 | 不同decimal资产 | 正确精度处理 | P1 |
| **_estimateUSDTFromAsset内部函数测试** | | | | |
| ROUTE-EST-033 | 资产为USDT | asset=USDT | 直接返回金额 | P0 |
| ROUTE-EST-034 | 非USDT资产转换 | 其他代币卖出 | 通过Oracle转换 | P0 |
| ROUTE-EST-035 | 无滑点扣除 | 赎回预估 | 不添加滑点缓冲 | P0 |
| ROUTE-EST-036 | Oracle调用失败 | Oracle服务异常 | 错误传播处理 | P1 |
| **预估准确性验证** | | | | |
| ROUTE-EST-037 | 铸造预估vs实际 | 相同输入对比 | 偏差<5% | P0 |
| ROUTE-EST-038 | 赎回预估vs实际 | 相同输入对比 | 偏差<5% | P0 |
| ROUTE-EST-039 | 份额预估vs实际 | 相同输入对比 | 偏差<5% | P0 |
| ROUTE-EST-040 | 反向预估一致性 | A→B→A计算 | 接近原始值 | P0 |
| **边界条件覆盖** | | | | |
| ROUTE-EST-041 | 所有资产amount=0 | 计算结果全为0 | 返回0预估 | P1 |
| ROUTE-EST-042 | 单个资产amount=0 | 部分为0 | 跳过0资产 | P1 |
| ROUTE-EST-043 | 除零保护 | shareValue=0 | 安全处理 | P0 |
| ROUTE-EST-044 | 溢出保护 | 大数乘法 | 无溢出错误 | P1 |
| **状态依赖测试** | | | | |
| ROUTE-EST-045 | 暂停状态预估 | 合约暂停时 | 预估仍可用 | P1 |
| ROUTE-EST-046 | ETF重新平衡后 | 权重调整后 | 基于新权重预估 | P1 |
| ROUTE-EST-047 | 管理费累积后 | 费用影响totalValue | 预估反映变化 | P1 |
| ROUTE-EST-048 | 多用户并发预估 | 同时查询 | 各自结果正确 | P1 |
| **集成测试** | | | | |
| ROUTE-EST-049 | 完整流程预估 | 铸造→赎回预估链 | 逻辑链条正确 | P0 |
| ROUTE-EST-050 | 批量预估测试 | 多个金额同时预估 | 单个预估一致 | P1 |
| ROUTE-EST-051 | 时间窗口一致性 | 同块多次调用 | 结果完全一致 | P0 |
| ROUTE-EST-052 | 跨区块稳定性 | 不同区块调用 | 状态未变时一致 | P1 |
| **错误处理覆盖** | | | | |
| ROUTE-EST-053 | Oracle完全失效 | 所有价格调用失败 | 适当错误处理 | P0 |
| ROUTE-EST-054 | ETFCore调用失败 | Core合约异常 | 错误传播 | P1 |
| ROUTE-EST-055 | 资产数组为空 | ETF无资产 | 返回0或错误 | P1 |
| ROUTE-EST-056 | 内存不足场景 | 大量资产处理 | 优雅处理 | P2 |
| **性能和Gas测试** | | | | |
| ROUTE-EST-057 | 单资产预估Gas | 最简场景 | Gas消耗合理 | P2 |
| ROUTE-EST-058 | 多资产预估Gas | 复杂ETF | Gas线性增长 | P2 |
| ROUTE-EST-059 | 预估调用频率 | 高频调用 | 性能稳定 | P2 |
| ROUTE-EST-060 | 预估缓存效果 | 重复预估 | 响应时间稳定 | P2 |

### 4.15 铸造功能100%覆盖率测试

| 测试ID | 测试用例 | 输入 | 预期结果 | 优先级 |
|--------|---------|------|----------|--------|
| **mintWithUSDT函数入口验证** | | | | |
| ROUTE-MINT-101 | 未暂停状态铸造 | 正常状态 | 铸造成功 | P0 |
| ROUTE-MINT-102 | 暂停状态铸造 | 合约已暂停 | 交易回滚 | P0 |
| ROUTE-MINT-103 | 重入保护测试 | 尝试重入调用 | 重入保护生效 | P0 |
| ROUTE-MINT-104 | deadline验证通过 | deadline > now | 正常执行 | P0 |
| ROUTE-MINT-105 | deadline验证失败 | deadline < now | TransactionExpired | P0 |
| ROUTE-MINT-106 | 零金额检查 | usdtAmount = 0 | ZeroAmount错误 | P0 |
| **USDT转账分支** | | | | |
| ROUTE-MINT-107 | USDT转账成功 | 足够余额和授权 | 成功转入 | P0 |
| ROUTE-MINT-108 | USDT余额不足 | 余额 < amount | transferFrom失败 | P0 |
| ROUTE-MINT-109 | USDT授权不足 | allowance < amount | transferFrom失败 | P0 |
| ROUTE-MINT-110 | USDT转账异常 | 恶意代币合约 | 异常处理 | P1 |
| **份额预估和验证** | | | | |
| ROUTE-MINT-111 | 预估份额充足 | estimatedShares >= minShares | 通过验证 | P0 |
| ROUTE-MINT-112 | 预估份额不足 | estimatedShares < minShares | InsufficientOutput | P0 |
| ROUTE-MINT-113 | 预估份额为零 | 极小金额导致0份额 | InsufficientOutput | P0 |
| ROUTE-MINT-114 | minShares为零 | 不设最小份额要求 | 正常执行 | P1 |
| **资产交换循环覆盖** | | | | |
| ROUTE-MINT-115 | 单个USDT资产 | ETF只包含USDT | 跳过交换 | P0 |
| ROUTE-MINT-116 | 单个非USDT资产 | ETF只包含BTC | 执行一次交换 | P0 |
| ROUTE-MINT-117 | 混合资产类型 | 包含USDT+BTC+ETH | 跳过USDT，交换其他 | P0 |
| ROUTE-MINT-118 | 全非USDT资产 | 不包含USDT | 全部需要交换 | P0 |
| ROUTE-MINT-119 | requiredAmount为零 | 某资产需求为0 | 跳过该资产交换 | P1 |
| **_swapUSDTForAsset分支覆盖** | | | | |
| ROUTE-MINT-120 | WBNB特殊处理 | asset = WBNB | 使用V2路由 | P0 |
| ROUTE-MINT-121 | 配置池存在 | 有专用V3池 | 使用配置池 | P0 |
| ROUTE-MINT-122 | 配置池不存在 | 无专用池 | 使用默认fee | P0 |
| ROUTE-MINT-123 | V3交换成功 | 正常流动性 | 返回正确amountOut | P0 |
| ROUTE-MINT-124 | V3交换失败 | 滑点过大 | 交换失败回滚 | P0 |
| ROUTE-MINT-125 | V2交换成功 | WBNB交换 | V2路由成功 | P0 |
| ROUTE-MINT-126 | V2交换失败 | V2流动性不足 | 交换失败回滚 | P0 |
| **授权循环覆盖** | | | | |
| ROUTE-MINT-127 | 单资产授权 | 一个资产 | 成功授权 | P0 |
| ROUTE-MINT-128 | 多资产授权 | 多个资产 | 全部授权成功 | P0 |
| ROUTE-MINT-129 | 授权异常处理 | 代币授权失败 | 异常处理 | P1 |
| ROUTE-MINT-130 | 零金额授权 | amount = 0 | 处理零金额 | P1 |
| **ETF Core交互** | | | | |
| ROUTE-MINT-131 | mintExactShares成功 | 正常铸造 | 返回份额数 | P0 |
| ROUTE-MINT-132 | mintExactShares失败 | Core合约问题 | 交易回滚 | P0 |
| ROUTE-MINT-133 | 份额铸造给用户 | 指定接收者 | 用户收到份额 | P0 |
| **USDT退款逻辑** | | | | |
| ROUTE-MINT-134 | 有剩余USDT | 交换有余额 | 退款给用户 | P0 |
| ROUTE-MINT-135 | 无剩余USDT | 完全使用 | 无退款 | P0 |
| ROUTE-MINT-136 | 大额剩余USDT | 大量余额 | 全额退款 | P1 |
| ROUTE-MINT-137 | 微量剩余USDT | 极小余额 | 正确退款 | P1 |
| **错误路径覆盖** | | | | |
| ROUTE-MINT-138 | calculateRequiredAmounts失败 | Core计算异常 | 错误传播 | P1 |
| ROUTE-MINT-139 | _getETFAssets失败 | 获取资产失败 | 错误处理 | P1 |
| ROUTE-MINT-140 | _estimateUSDTForAsset失败 | 预估计算失败 | 错误传播 | P1 |

### 4.16 赎回功能100%覆盖率测试

| 测试ID | 测试用例 | 输入 | 预期结果 | 优先级 |
|--------|---------|------|----------|--------|
| **burnToUSDT函数入口验证** | | | | |
| ROUTE-BURN-101 | 未暂停状态赎回 | 正常状态 | 赎回成功 | P0 |
| ROUTE-BURN-102 | 暂停状态赎回 | 合约已暂停 | 交易回滚 | P0 |
| ROUTE-BURN-103 | 重入保护测试 | 尝试重入调用 | 重入保护生效 | P0 |
| ROUTE-BURN-104 | deadline验证通过 | deadline > now | 正常执行 | P0 |
| ROUTE-BURN-105 | deadline验证失败 | deadline < now | TransactionExpired | P0 |
| ROUTE-BURN-106 | 零份额检查 | shares = 0 | ZeroAmount错误 | P0 |
| **ETF份额转账分支** | | | | |
| ROUTE-BURN-107 | 份额转账成功 | 足够余额和授权 | 成功转入 | P0 |
| ROUTE-BURN-108 | 份额余额不足 | 余额 < shares | transferFrom失败 | P0 |
| ROUTE-BURN-109 | 份额授权不足 | allowance < shares | transferFrom失败 | P0 |
| ROUTE-BURN-110 | 份额转账异常 | 转账钩子异常 | 异常处理 | P1 |
| **ETF Core燃烧** | | | | |
| ROUTE-BURN-111 | burn成功 | 正常燃烧 | 返回资产数组 | P0 |
| ROUTE-BURN-112 | burn失败 | Core合约问题 | 交易回滚 | P0 |
| ROUTE-BURN-113 | burn到Router地址 | 指定接收者 | Router收到资产 | P0 |
| **资产交换循环覆盖** | | | | |
| ROUTE-BURN-114 | 单个USDT资产 | 只有USDT | 跳过交换 | P0 |
| ROUTE-BURN-115 | 单个非USDT资产 | 只有BTC | 执行一次交换 | P0 |
| ROUTE-BURN-116 | 混合资产类型 | USDT+BTC+ETH | 跳过USDT，交换其他 | P0 |
| ROUTE-BURN-117 | 全非USDT资产 | 不包含USDT | 全部需要交换 | P0 |
| ROUTE-BURN-118 | 零数量资产 | amount = 0 | 跳过交换 | P0 |
| ROUTE-BURN-119 | USDT且零数量 | USDT amount=0 | 双重跳过条件 | P1 |
| **_swapAssetToUSDT分支覆盖** | | | | |
| ROUTE-BURN-120 | WBNB特殊处理 | asset = WBNB | 使用V2路由 | P0 |
| ROUTE-BURN-121 | 配置池存在 | 有专用V3池 | 使用配置池 | P0 |
| ROUTE-BURN-122 | 配置池不存在 | 无专用池 | 使用默认fee | P0 |
| ROUTE-BURN-123 | V3交换成功 | 正常流动性 | 返回USDT | P0 |
| ROUTE-BURN-124 | V3交换失败 | 流动性不足 | 交换失败 | P0 |
| ROUTE-BURN-125 | V2交换成功 | WBNB交换 | V2路由成功 | P0 |
| ROUTE-BURN-126 | V2交换失败 | V2路由问题 | 交换失败 | P0 |
| ROUTE-BURN-127 | 无最小输出限制 | amountOutMinimum=0 | 接受任何输出 | P0 |
| **USDT聚合和验证** | | | | |
| ROUTE-BURN-128 | USDT总额充足 | 总额 >= minUSDT | 通过验证 | P0 |
| ROUTE-BURN-129 | USDT总额不足 | 总额 < minUSDT | InsufficientOutput | P0 |
| ROUTE-BURN-130 | USDT总额为零 | 没有获得USDT | InsufficientOutput | P0 |
| ROUTE-BURN-131 | minUSDT为零 | 不设最小要求 | 正常执行 | P1 |
| **USDT转账给用户** | | | | |
| ROUTE-BURN-132 | USDT转账成功 | 正常转账 | 用户收到USDT | P0 |
| ROUTE-BURN-133 | 大额USDT转账 | 大量USDT | 成功转账 | P1 |
| ROUTE-BURN-134 | 微量USDT转账 | 极小USDT | 成功转账 | P1 |
| **事件发射** | | | | |
| ROUTE-BURN-135 | BurnToUSDT事件 | 成功赎回 | 正确emit事件 | P1 |
| ROUTE-BURN-136 | 事件参数正确 | 检查事件数据 | 参数完整准确 | P1 |
| **错误路径覆盖** | | | | |
| ROUTE-BURN-137 | burn返回空数组 | 异常情况 | 处理空数组 | P1 |
| ROUTE-BURN-138 | _getETFAssets失败 | 获取资产失败 | 错误处理 | P1 |
| ROUTE-BURN-139 | balanceOf调用失败 | USDT合约异常 | 错误处理 | P1 |
| ROUTE-BURN-140 | 合约余额异常 | 余额计算错误 | 异常处理 | P1 |

---

## 5. PriceOracle 合约测试用例

### 5.1 价格获取测试

| 测试ID | 测试用例 | 输入 | 预期结果 | 优先级 |
|--------|---------|------|----------|--------|
| **基础价格获取** | | | | |
| ORACLE-GET-001 | 获取BTC价格 | BTC地址 | 返回当前价格 | P0 |
| ORACLE-GET-002 | 获取ETH价格 | ETH地址 | 返回当前价格 | P0 |
| ORACLE-GET-003 | 获取稳定币价格 | USDT地址 | 接近1美元 | P0 |
| **精度转换** | | | | |
| ORACLE-GET-004 | 8位→18位 | Chainlink 8位 | 正确转换 | P0 |
| ORACLE-GET-005 | 18位→18位 | 原生18位 | 保持不变 | P0 |
| ORACLE-GET-006 | 6位→18位 | USDC价格 | 正确转换 | P0 |
| ORACLE-GET-007 | 高精度→18位 | >18位精度 | 正确缩减 | P1 |
| **批量获取** | | | | |
| ORACLE-GET-008 | 批量价格 | 多个代币 | 返回价格数组 | P1 |
| ORACLE-GET-009 | 混合精度批量 | 不同精度 | 统一到18位 | P1 |
| **异常处理** | | | | |
| ORACLE-GET-010 | 未配置代币 | 无feed地址 | InvalidPrice错误 | P0 |
| ORACLE-GET-011 | Feed返回0 | 价格为0 | InvalidPrice错误 | P0 |
| ORACLE-GET-012 | Feed返回负数 | 负价格 | InvalidPrice错误 | P0 |
| ORACLE-GET-013 | Feed无响应 | revert | 捕获错误 | P0 |
| **边界测试** | | | | |
| ORACLE-GET-014 | 极小价格 | 接近0 | 正确处理 | P1 |
| ORACLE-GET-015 | 极大价格 | 接近max | 不溢出 | P1 |
| ORACLE-GET-016 | 价格为1 | 正好1美元 | 返回1e18 | P1 |

### 5.2 数据新鲜度测试

| 测试ID | 测试用例 | 输入 | 预期结果 | 优先级 |
|--------|---------|------|----------|--------|
| **时间验证** | | | | |
| ORACLE-FRESH-001 | 新鲜数据 | <1小时 | 正常返回 | P0 |
| ORACLE-FRESH-002 | 过期数据 | >1小时 | StalePrice错误 | P0 |
| ORACLE-FRESH-003 | 边界时间 | 正好1小时 | 正常返回 | P1 |
| ORACLE-FRESH-004 | 刚更新 | <1分钟 | 正常返回 | P0 |
| **时间戳检查** | | | | |
| ORACLE-FRESH-005 | 未来时间戳 | 时间>now | 异常处理 | P1 |
| ORACLE-FRESH-006 | 零时间戳 | timestamp=0 | 视为过期 | P1 |
| ORACLE-FRESH-007 | 时间戳回退 | 新<旧 | 检测异常 | P1 |
| **阈值设置** | | | | |
| ORACLE-FRESH-008 | 默认阈值 | 3600秒 | 正确应用 | P0 |
| ORACLE-FRESH-009 | 自定义阈值 | 如可配置 | 新阈值生效 | P2 |

### 5.3 Feed配置测试

| 测试ID | 测试用例 | 输入 | 预期结果 | 优先级 |
|--------|---------|------|----------|--------|
| **设置Feed** | | | | |
| ORACLE-CONF-001 | 设置BTC feed | BTC和feed地址 | 成功设置 | P0 |
| ORACLE-CONF-002 | 设置ETH feed | ETH和feed地址 | 成功设置 | P0 |
| ORACLE-CONF-003 | 批量设置 | 多个feed | 批量成功 | P1 |
| **更新Feed** | | | | |
| ORACLE-CONF-004 | 更换feed | 新feed地址 | 覆盖旧feed | P0 |
| ORACLE-CONF-005 | 删除feed | 设为0地址 | 删除映射 | P1 |
| **验证Feed** | | | | |
| ORACLE-CONF-006 | 验证feed合约 | 检查接口 | 确认是Chainlink | P0 |
| ORACLE-CONF-007 | 验证feed活跃 | 检查更新 | 确认在更新 | P0 |
| ORACLE-CONF-008 | 错误feed地址 | 非feed合约 | 设置时验证 | P1 |
| **权限控制** | | | | |
| ORACLE-CONF-009 | owner设置 | owner调用 | 成功 | P0 |
| ORACLE-CONF-010 | 非owner设置 | 普通用户 | 失败 | P0 |
| **事件记录** | | | | |
| ORACLE-CONF-011 | PriceFeedSet事件 | 设置时 | 正确emit | P1 |

### 5.4 Chainlink集成测试

| 测试ID | 测试用例 | 输入 | 预期结果 | 优先级 |
|--------|---------|------|----------|--------|
| **接口调用** | | | | |
| ORACLE-LINK-001 | latestRoundData | 调用Chainlink | 获得数据 | P0 |
| ORACLE-LINK-002 | decimals | 获取精度 | 返回正确精度 | P0 |
| ORACLE-LINK-003 | description | 获取描述 | 返回feed描述 | P2 |
| **数据解析** | | | | |
| ORACLE-LINK-004 | 解析价格 | int256价格 | 转为uint256 | P0 |
| ORACLE-LINK-005 | 解析时间戳 | 更新时间 | 获得时间戳 | P0 |
| ORACLE-LINK-006 | 解析轮次 | roundId | 获得轮次ID | P2 |
| **异常数据** | | | | |
| ORACLE-LINK-007 | 无效轮次 | roundId=0 | 处理异常 | P1 |
| ORACLE-LINK-008 | 答案为0 | answer=0 | 拒绝使用 | P0 |
| ORACLE-LINK-009 | 未开始轮次 | startedAt=0 | 处理异常 | P1 |

---

## 6. 集成测试用例

### 6.1 端到端流程测试

| 测试ID | 测试用例 | 场景描述 | 验证点 | 优先级 |
|--------|---------|----------|---------|--------|
| E2E-001 | USDT铸造ETF完整流程 | 用户用USDT通过Router铸造 | USDT扣除→交换资产→铸造ETF→用户获得份额 | P0 |
| E2E-002 | ETF赎回USDT完整流程 | 用户赎回ETF获得USDT | ETF销毁→获得资产→交换USDT→用户收到USDT | P0 |
| E2E-003 | 重新平衡完整流程 | 触发并执行重新平衡 | 检测偏离→触发重新平衡→交换资产→更新储备 | P0 |
| E2E-004 | 费用累积和收取 | 时间流逝费用处理 | 累积管理费→收取到collector→影响份额计算 | P0 |
| E2E-005 | 初始化到首次铸造 | 新ETF创建和使用 | 初始化→设置Oracle→首次铸造→价格稳定 | P0 |

### 6.2 多用户交互测试

| 测试ID | 测试用例 | 场景描述 | 验证点 | 优先级 |
|--------|---------|----------|---------|--------|
| MULTI-001 | 10用户并发铸造 | 同时铸造ETF | 所有成功→份额正确→总量一致 | P0 |
| MULTI-002 | 多用户交替操作 | 铸造/赎回交替 | 状态一致→价格稳定→无干扰 | P0 |
| MULTI-003 | 大户vs散户 | 不同规模操作 | 公平定价→滑点合理→小户不受损 | P0 |
| MULTI-004 | 套利者参与 | 价格偏离时套利 | 套利空间有限→价格回归→系统稳定 | P1 |

### 6.3 极端市场测试

| 测试ID | 测试用例 | 场景描述 | 验证点 | 优先级 |
|--------|---------|----------|---------|--------|
| EXTREME-001 | 黑天鹅事件 | 某资产暴跌90% | 系统存活→赎回正常→重新平衡成功 | P0 |
| EXTREME-002 | 流动性危机 | DEX流动性枯竭 | 交易失败优雅→备用路径→资产可提取 | P0 |
| EXTREME-003 | Oracle全部失效 | 所有价格源故障 | 紧急模式→关键功能暂停→资产安全 | P0 |
| EXTREME-004 | Gas价格1000 gwei | 极高gas环境 | 批量优化有效→紧急通道可用 | P1 |
| EXTREME-005 | 闪电贷攻击模拟 | 使用闪电贷操纵 | 攻击无利可图→保护机制生效 | P0 |

### 6.4 长期运行测试

| 测试ID | 测试用例 | 场景描述 | 验证点 | 优先级 |
|--------|---------|----------|---------|--------|
| LONG-001 | 7天连续运行 | 模拟一周运营 | 无内存泄漏→状态稳定→性能稳定 | P1 |
| LONG-002 | 1000次重新平衡 | 高频重新平衡 | 每次成功→gas消耗稳定→无累积误差 | P1 |
| LONG-003 | 10000用户持仓 | 大规模用户 | 查询性能→状态管理→升级能力 | P2 |
| LONG-004 | 365天费用累积 | 一年运行 | 费用正确→无溢出→精度保持 | P1 |

---

## 7. 安全审计测试

### 7.1 重入攻击测试

| 测试ID | 测试用例 | 攻击向量 | 防护验证 | 优先级 |
|--------|---------|----------|----------|--------|
| SEC-RE-001 | ERC777回调重入 | 代币回调中重入mint | ReentrancyGuard阻止 | P0 |
| SEC-RE-002 | 赎回接收重入 | 接收ETH时重入 | 状态检查阻止 | P0 |
| SEC-RE-003 | 跨合约重入 | A→B→A调用链 | 全局锁保护 | P0 |
| SEC-RE-004 | 只读重入 | 重入读取状态 | 状态一致性保证 | P1 |

### 7.2 权限提升测试

| 测试ID | 测试用例 | 攻击方式 | 防护验证 | 优先级 |
|--------|---------|----------|----------|--------|
| SEC-AUTH-001 | 伪造owner | 各种绕过尝试 | 所有失败 | P0 |
| SEC-AUTH-002 | 提权到rebalancer | 尝试获得权限 | 访问控制有效 | P0 |
| SEC-AUTH-003 | delegatecall注入 | 通过委托调用 | 无delegatecall | P1 |
| SEC-AUTH-004 | 初始化抢跑 | 抢先初始化 | initializer保护 | P0 |

### 7.3 经济攻击测试

| 测试ID | 测试用例 | 攻击方式 | 防护验证 | 优先级 |
|--------|---------|----------|----------|--------|
| SEC-ECON-001 | 三明治攻击 | 夹击大额交易 | 滑点限制利润 | P0 |
| SEC-ECON-002 | 价格操纵 | 操纵DEX价格 | Oracle验证价格 | P0 |
| SEC-ECON-003 | 抢先交易 | 监听mempool | 影响有限 | P1 |
| SEC-ECON-004 | 份额通胀攻击 | 操纵总供应量 | 最小流动性防护 | P0 |

---

## 8. 性能基准测试

### 8.1 Gas消耗基准

| 操作 | 预期Gas | 最大Gas | 优化目标 |
|------|---------|---------|----------|
| 初始化(3资产) | <500,000 | 800,000 | -20% |
| 铸造 | <300,000 | 400,000 | -15% |
| 赎回 | <250,000 | 350,000 | -15% |
| 重新平衡(3资产) | <500,000 | 700,000 | -20% |
| USDT铸造(Router) | <450,000 | 600,000 | -15% |
| USDT赎回(Router) | <400,000 | 550,000 | -15% |

### 8.2 压力测试指标

| 指标 | 目标 | 测试方法 |
|------|------|----------|
| TPS | >50 | 并发交易测试 |
| 响应时间 | <2秒 | 各操作计时 |
| 内存使用 | <1GB | 长时间监控 |
| 状态大小 | <100MB | 10000用户测试 |

---

## 9. 测试数据准备

### 9.1 测试账户

```solidity
address owner = 0x1111111111111111111111111111111111111111;
address alice = 0x2222222222222222222222222222222222222222;
address bob = 0x3333333333333333333333333333333333333333;
address charlie = 0x4444444444444444444444444444444444444444;
address attacker = 0x6666666666666666666666666666666666666666;
address feeCollector = 0x7777777777777777777777777777777777777777;
```

### 9.2 测试资产

```solidity
// 主网Fork测试资产
address WBTC = 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599;
address WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
address WBNB = 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c;
address USDT = 0x55d398326f99059fF775485246999027B3197955;

// 测试权重
uint32[] weights = [5000, 3000, 2000]; // 50%, 30%, 20%
```

### 9.3 测试金额

```solidity
uint256 SMALL_AMOUNT = 100 * 1e18;      // $100
uint256 NORMAL_AMOUNT = 10000 * 1e18;   // $10,000
uint256 LARGE_AMOUNT = 1000000 * 1e18;  // $1,000,000
uint256 MIN_AMOUNT = 1e15;              // 0.001
uint256 DUST_AMOUNT = 1e10;             // dust
```

---

## 10. 测试执行计划

### 阶段1：单元测试（第1-2周）
- 各合约独立功能测试
- Mock外部依赖
- 覆盖率>95%

### 阶段2：集成测试（第3周）
- 合约间交互测试
- 真实环境Fork测试
- 端到端流程验证

### 阶段3：安全测试（第4周）
- 安全漏洞扫描
- 攻击向量测试
- 权限和访问控制

### 阶段4：性能测试（第5周）
- Gas优化
- 压力测试
- 长期运行测试

### 阶段5：测试网部署（第6周）
- BSC测试网部署
- 真实用户测试
- 问题修复和回归测试

---

**文档版本**: v2.0.0
**最后更新**: 2024-09-23
**状态**: 完整版待执行