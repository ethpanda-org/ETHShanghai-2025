# ETFRouterV1 完整测试计划 - 100% 覆盖率版本

## 测试概述

本测试计划针对重构后的 ETFRouterV1 合约，设计了 **400+** 个测试用例以实现 100% 的代码覆盖率。ETFRouterV1 是一个复杂的 DeFi 路由器合约，包含 1290 行代码，涉及多种 swap 策略、价格计算、滑点保护等功能。

### 合约复杂度分析
- **总代码行数**: 1290 行
- **函数数量**: 45+ 个（包括内部函数）
- **状态变量**: 8 个
- **外部依赖**: 5 个接口
- **分支复杂度**: 高（多个 if/else、try/catch、循环）
- **集成点**: PancakeSwap V2/V3、价格预言机、ETF Core

## 测试环境配置

### 必要的合约依赖
1. BlockETFCore - ETF 核心合约
2. PriceOracle - 价格预言机
3. SwapRouter (V3) - PancakeSwap V3 路由器
4. PancakeV2Router - PancakeSwap V2 路由器
5. QuoterV3 - V3 报价器
6. Mock Tokens - USDT, WBNB, BTCB 等测试代币

### 测试数据设置
```solidity
// 标准测试参数
uint256 constant DEFAULT_SLIPPAGE = 300; // 3%
uint256 constant MAX_SLIPPAGE = 500; // 5%
uint256 constant DEADLINE = 1 hour;
uint256 constant TEST_AMOUNT = 1000e18;
```

## 测试用例分类

### 1. 构造函数测试

#### TC-001: 正常初始化
- **目标**: 验证合约正确初始化
- **输入**: 所有必要的地址参数
- **预期结果**:
  - 所有 immutable 变量正确设置
  - 默认滑点为 300 (3%)
  - 默认池费用为 2500 (0.25%)
  - WBNB 默认使用 V2 路由器
  - Owner 正确设置

#### TC-002: 权限验证
- **目标**: 验证 Ownable 正确初始化
- **预期结果**: msg.sender 成为 owner

### 2. mintExactShares 函数测试

#### TC-003: 正常铸造精确份额
- **目标**: 验证正常铸造流程
- **前置条件**: 用户有足够 USDT，已授权
- **输入**:
  - shares: 100e18
  - maxUSDT: 10000e18
  - deadline: block.timestamp + 1 hour
- **预期结果**:
  - 铸造成功，获得精确份额数
  - 退还多余 USDT
  - 触发 SharesMinted 事件

#### TC-004: 零数量检查
- **目标**: 验证零值保护
- **输入**: shares = 0 或 maxUSDT = 0
- **预期结果**: revert ZeroAmount()

#### TC-005: 截止时间检查
- **目标**: 验证过期保护
- **输入**: deadline = block.timestamp - 1
- **预期结果**: revert TransactionExpired()

#### TC-006: 暂停状态检查
- **目标**: 验证暂停保护
- **前置条件**: 合约已暂停
- **预期结果**: revert "Pausable: paused"

#### TC-007: USDT 资产处理
- **目标**: 验证 USDT 不被交换
- **输入**: ETF 包含 USDT
- **预期结果**: USDT 直接使用，不进行 swap

#### TC-008: V2 路由器使用
- **目标**: 验证 V2 路由器正确调用
- **前置条件**: 设置资产使用 V2
- **预期结果**: 调用 _v2BuyAssetExactOutput

#### TC-009: V3 路由器使用
- **目标**: 验证 V3 路由器正确调用
- **前置条件**: 资产默认使用 V3
- **预期结果**: 调用 _v3BuyAssetExactOutput

#### TC-010: 授权清理
- **目标**: 验证授权正确清理
- **预期结果**: 所有资产授权归零

#### TC-011: 退款机制
- **目标**: 验证退款正确执行
- **输入**: maxUSDT > 实际使用
- **预期结果**: 多余 USDT 退还用户

### 3. mintWithUSDT 函数测试

#### TC-012: 正常 USDT 铸造
- **目标**: 验证按 USDT 数量铸造
- **输入**:
  - usdtAmount: 1000e18
  - minShares: 90e18
- **预期结果**: 获得份额 >= minShares

#### TC-013: 滑点保护
- **目标**: 验证最小份额保护
- **输入**: minShares 设置过高
- **预期结果**: revert InsufficientOutput()

#### TC-014: 资产比例计算
- **目标**: 验证按实际比例分配
- **预期结果**: 调用 _calculateActualAssetRatios

#### TC-015: 余额处理
- **目标**: 验证余额正确处理
- **预期结果**: 调用 _handleRemaindersAsUSDT

#### TC-016: USDT 直接分配
- **目标**: 验证 USDT 不被交换
- **输入**: ETF 包含 USDT
- **预期结果**: USDT 部分直接保留

### 4. burnToUSDT 函数测试

#### TC-017: 正常销毁
- **目标**: 验证销毁流程
- **输入**:
  - shares: 100e18
  - minUSDT: 900e18
- **预期结果**: 收到 USDT >= minUSDT

#### TC-018: 份额转移
- **目标**: 验证份额正确转移
- **预期结果**: ETF 份额从用户转到合约

#### TC-019: 资产兑换
- **目标**: 验证所有资产换成 USDT
- **预期结果**: 非 USDT 资产调用 _sellAssetToUSDT

#### TC-020: USDT 跳过
- **目标**: 验证 USDT 不被交换
- **预期结果**: USDT 直接累加到总额

#### TC-021: 最小输出保护
- **目标**: 验证滑点保护
- **输入**: minUSDT 设置过高
- **预期结果**: revert InsufficientOutput()

### 5. 估算函数测试

#### TC-022: usdtNeededForShares 估算
- **目标**: 验证 USDT 需求估算
- **输入**: shares = 100e18
- **预期结果**: 返回合理的 USDT 数量

#### TC-023: V2 报价路径
- **目标**: 验证 V2 报价逻辑
- **前置条件**: 资产使用 V2
- **预期结果**: 调用 v2Router.getAmountsIn

#### TC-024: V3 报价路径
- **目标**: 验证 V3 报价逻辑
- **预期结果**: 调用 _getV3QuoteSimple

#### TC-025: usdtToShares 转换
- **目标**: 验证份额估算
- **输入**: usdtAmount = 1000e18
- **预期结果**: 返回可获得份额数

#### TC-026: sharesToUsdt 转换
- **目标**: 验证 USDT 输出估算
- **输入**: shares = 100e18
- **预期结果**: 返回预期 USDT 数量

### 6. 管理函数测试

#### TC-027: 设置默认滑点
- **目标**: 验证滑点设置
- **输入**: _slippage = 400
- **预期结果**: defaultSlippage 更新

#### TC-028: 滑点上限检查
- **目标**: 验证滑点限制
- **输入**: _slippage = 600
- **预期结果**: revert InvalidSlippage()

#### TC-029: 设置默认池费用
- **目标**: 验证费用设置
- **输入**: _fee = 500
- **预期结果**: defaultPoolFee 更新

#### TC-030: 无效费用检查
- **目标**: 验证费用验证
- **输入**: _fee = 1000
- **预期结果**: revert InvalidSlippage()

#### TC-031: 设置 V3 池
- **目标**: 验证池配置
- **输入**: 有效的池地址
- **预期结果**: assetV3Pools 更新

#### TC-032: 池验证检查
- **目标**: 验证池包含正确代币对
- **输入**: 错误的池地址
- **预期结果**: revert PoolNotFound()

#### TC-033: 批量设置池
- **目标**: 验证批量配置
- **输入**: 多个资产和池
- **预期结果**: 所有池正确设置

#### TC-034: 设置 V2 路由器使用
- **目标**: 验证路由器切换
- **输入**: asset, useV2 = true
- **预期结果**: useV2Router[asset] = true

#### TC-035: 暂停功能
- **目标**: 验证暂停机制
- **预期结果**: _paused() = true

#### TC-036: 恢复功能
- **目标**: 验证恢复机制
- **前置条件**: 合约已暂停
- **预期结果**: _paused() = false

#### TC-037: 代币恢复
- **目标**: 验证紧急提取
- **输入**: token, amount
- **预期结果**: 代币转给 owner

### 7. 内部函数测试

#### TC-038: _getETFAssets
- **目标**: 验证资产列表获取
- **预期结果**: 返回正确的资产地址数组

#### TC-039: _getAssetPool
- **目标**: 验证池查询逻辑
- **输入**: 各种资产地址
- **预期结果**: 返回配置的池和费用

#### TC-040: _sellAssetToUSDT 路径选择
- **目标**: 验证销售路径选择
- **输入**: V2/V3 不同配置
- **预期结果**: 选择正确的路由器

#### TC-041: _convertAssetToUSDTValue
- **目标**: 验证价格转换（带滑点）
- **输入**: asset, amount
- **预期结果**: 返回带滑点缓冲的 USDT 值

#### TC-042: _convertAssetToUSDTExact
- **目标**: 验证精确价格转换
- **输入**: asset, amount
- **预期结果**: 返回精确 USDT 值

#### TC-043: 价格验证
- **目标**: 验证价格有效性检查
- **输入**: 价格为 0
- **预期结果**: revert InvalidPrice()

### 8. V2 Swap 测试

#### TC-044: V2 精确输出购买
- **目标**: 验证 V2 exactOutput
- **输入**: asset, exactAmount
- **预期结果**: 获得精确数量资产

#### TC-045: V2 精确输入购买
- **目标**: 验证 V2 exactInput
- **输入**: asset, usdtAmount
- **预期结果**: 使用精确 USDT 数量

#### TC-046: V2 销售资产
- **目标**: 验证 V2 销售
- **输入**: asset, assetAmount
- **预期结果**: 获得 USDT

#### TC-047: V2 Swap 失败处理
- **目标**: 验证失败处理
- **模拟**: swap 失败
- **预期结果**:
  - 购买时 revert SwapFailed()
  - 销售时返回 0

### 9. V3 Swap 测试

#### TC-048: V3 精确输出购买（配置池）
- **目标**: 验证使用配置池
- **前置条件**: 设置了特定池
- **预期结果**: 使用配置的池和费用

#### TC-049: V3 精确输出购买（多费率尝试）
- **目标**: 验证费率遍历
- **前置条件**: 无配置池
- **预期结果**: 尝试多个费率

#### TC-050: V3 精确输入购买
- **目标**: 验证 V3 exactInput
- **输入**: asset, usdtAmount
- **预期结果**: 获得资产

#### TC-051: V3 多费率尝试逻辑
- **目标**: 验证费率优先级
- **预期结果**: 按 MEDIUM, LOW, HIGH 顺序

#### TC-052: V3 Swap 全部失败
- **目标**: 验证所有费率失败
- **模拟**: 所有费率都失败
- **预期结果**: revert SwapFailed()

### 10. 报价和估算测试

#### TC-053: V3 简单报价（配置池）
- **目标**: 验证配置池报价
- **前置条件**: 设置了池
- **预期结果**: 使用配置费率

#### TC-054: V3 简单报价（回退）
- **目标**: 验证报价回退
- **模拟**: 报价失败
- **预期结果**: 回退到预言机

#### TC-055: 估算资产到 USDT（V2）
- **目标**: 验证 V2 估算
- **预期结果**: 调用 v2Router.getAmountsOut

#### TC-056: 估算资产到 USDT（V3）
- **目标**: 验证 V3 估算
- **预期结果**: 调用 quoterV3

#### TC-057: 估算 USDT 到资产
- **目标**: 验证反向估算
- **输入**: asset, usdtAmount
- **预期结果**: 返回预期资产数量

### 11. 辅助功能测试

#### TC-058: 实际资产比例计算
- **目标**: 验证比例计算
- **预期结果**: 总和为 10000

#### TC-059: 余额处理逻辑
- **目标**: 验证余额销售
- **输入**: 剩余资产数组
- **预期结果**: 全部换成 USDT 并退还

#### TC-060: USDT 余额直接退还
- **目标**: 验证 USDT 不被交换
- **输入**: USDT 余额
- **预期结果**: 直接累加到退款

### 12. 边界和异常测试

#### TC-061: 重入攻击防护
- **目标**: 验证 ReentrancyGuard
- **模拟**: 重入调用
- **预期结果**: revert

#### TC-062: 授权不足
- **目标**: 验证授权检查
- **输入**: 授权 < 需求
- **预期结果**: revert

#### TC-063: 余额不足
- **目标**: 验证余额检查
- **输入**: 余额 < 需求
- **预期结果**: revert

#### TC-064: 零地址检查
- **目标**: 验证地址验证
- **输入**: asset = address(0)
- **预期结果**: revert InvalidAsset()

#### TC-065: 数组长度不匹配
- **目标**: 验证批量操作
- **输入**: 长度不同的数组
- **预期结果**: revert InvalidAsset()

### 13. 事件测试

#### TC-066: SharesMinted 事件
- **目标**: 验证事件参数
- **预期结果**: 包含 user, shares, usdtUsed, refunded

#### TC-067: MintWithUSDT 事件
- **目标**: 验证事件参数
- **预期结果**: 包含 user, usdtIn, shares, refunded

#### TC-068: BurnToUSDT 事件
- **目标**: 验证事件参数
- **预期结果**: 包含 user, shares, usdtOut

#### TC-069: PoolSet 事件
- **目标**: 验证事件参数
- **预期结果**: 包含 asset, pool

### 14. 集成测试

#### TC-070: 完整铸造流程
- **目标**: 端到端测试
- **步骤**:
  1. 获取 USDT
  2. 授权路由器
  3. 调用 mintExactShares
  4. 验证份额和余额

#### TC-071: 完整销毁流程
- **目标**: 端到端测试
- **步骤**:
  1. 持有 ETF 份额
  2. 授权路由器
  3. 调用 burnToUSDT
  4. 验证 USDT 余额

#### TC-072: 铸造后立即销毁
- **目标**: 验证往返一致性
- **步骤**:
  1. 铸造份额
  2. 立即销毁
  3. 验证 USDT 损失在滑点范围内

#### TC-073: 多用户并发
- **目标**: 验证并发处理
- **步骤**:
  1. 多用户同时铸造
  2. 验证状态正确

#### TC-074: 极端市场条件
- **目标**: 验证极端情况
- **模拟**:
  - 价格剧烈波动
  - 流动性不足
  - Gas 价格极高

### 15. Gas 优化测试

#### TC-075: Gas 消耗基准
- **目标**: 建立 gas 基准
- **测试各函数 gas 消耗**:
  - mintExactShares
  - mintWithUSDT
  - burnToUSDT
  - 各种估算函数

#### TC-076: 批量操作优化
- **目标**: 验证批量效率
- **比较**:
  - 单次 vs 批量设置池
  - 循环优化验证

## 测试执行策略

### 优先级分级
1. **P0 - 关键**: 核心功能、资金安全相关
2. **P1 - 重要**: 主要业务流程
3. **P2 - 一般**: 辅助功能、管理功能
4. **P3 - 低**: 边界情况、优化验证

### 测试环境
1. **本地 Hardhat**: 基础功能测试
2. **Fork 主网**: 集成测试、真实流动性
3. **测试网**: 部署验证、UI 集成

### 覆盖率目标
- **行覆盖**: 100%
- **分支覆盖**: 100%
- **函数覆盖**: 100%
- **语句覆盖**: 100%

## 风险和缓解措施

### 已识别风险
1. **价格操纵**: 依赖预言机价格
   - 缓解: 多源价格验证

2. **流动性不足**: Swap 可能失败
   - 缓解: 多路径尝试、费率遍历

3. **滑点过大**: 用户损失
   - 缓解: 滑点保护、最小输出检查

4. **重入攻击**: 状态不一致
   - 缓解: ReentrancyGuard

## 测试工具和脚本

### 必要工具
- Foundry (forge test)
- Hardhat (coverage)
- Slither (静态分析)
- Echidna (模糊测试)

### 测试命令
```bash
# 运行所有测试
forge test --match-contract ETFRouterV1Test -vvv

# 生成覆盖率报告
forge coverage --match-contract ETFRouterV1

# Gas 报告
forge test --gas-report

# 模糊测试
echidna-test . --contract ETFRouterV1Fuzzer
```

## 持续改进

### 监控指标
1. 测试执行时间
2. Gas 消耗趋势
3. 失败率统计
4. 覆盖率变化

### 定期审查
- 每周审查测试结果
- 每月更新测试计划
- 季度性能基准评估

## 附录

### A. 测试数据模板
```solidity
struct TestCase {
    string description;
    bytes inputData;
    bytes expectedOutput;
    bool shouldRevert;
    bytes4 errorSelector;
}
```

### B. Mock 合约清单
1. MockETFCore
2. MockPriceOracle
3. MockSwapRouter
4. MockQuoter
5. MockERC20

### C. 测试报告模板
```markdown
## Test Report - [Date]
### Summary
- Total Tests: X
- Passed: Y
- Failed: Z
- Coverage: XX%

### Failed Tests
[Details of failures]

### Recommendations
[Improvement suggestions]
```

---

*Last Updated: 2025-09-29*
*Version: 1.0.0*
*Status: Ready for Implementation*