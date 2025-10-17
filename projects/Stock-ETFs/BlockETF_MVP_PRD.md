# BlockETF - MVP产品需求文档

## 1. MVP目标
快速验证链上ETF的核心价值：让用户能够通过单一稳定币投资加密市场Top5代币组合。

## 2. MVP核心功能（第一版）

### 2.1 单一ETF产品 - "TOP5 Index"
- **固定组合**：加密市场Top5代币（均衡配置）
  - 20% BTC (BTCB on BSC)
  - 20% ETH (Binance-Peg ETH)
  - 20% BNB (原生代币)
  - 20% XRP (Binance-Peg XRP)
  - 20% SOL (Binance-Peg SOL)
- **无需再平衡**：MVP阶段不做自动再平衡，接受一定偏离
- **费率结构**：
  - 申购费：0%（免费申购）
  - 赎回费：0.3%
  - 管理费：年化0.8%（按日计提）

### 2.2 申购功能
- **输入**：用户存入USDT（BSC上的主流稳定币）
- **过程**：
  1. 接收用户USDT（无申购费）
  2. 通过PancakeSwap将USDT换成5种代币（BTCB、ETH、BNB、XRP、SOL）
  3. 按比例铸造ETF代币给用户
- **输出**：用户获得TOP5份额代币

### 2.3 赎回功能
- **输入**：用户销毁TOP5代币
- **过程**：
  1. 计算用户应得的5种代币数量（扣除累积管理费）
  2. 将5种代币通过PancakeSwap换回USDT
  3. 扣除0.3%赎回费
  4. 将USDT返还给用户
- **输出**：用户获得USDT（已扣费）

### 2.4 资产管理功能（管理员权限）
- **配置资产组合**：
  - 添加/移除支持的资产
  - 设置每个资产的代币地址
  - 限制：最少2个资产（避免单一资产），最多10个（控制Gas成本）
- **调整权重**：
  - 修改各资产目标权重
  - 权重总和必须等于100%
  - 单个资产权重范围：5%-50%
- **手动再平衡**：
  - 触发资产配置调整
  - 执行交易以达到目标权重
- **紧急控制**：
  - 暂停/恢复申购
  - 暂停/恢复赎回

### 2.5 基础查询
- 查看ETF当前总锁仓价值（TVL）
- 查看ETF份额总供应量
- 查看用户持有的份额和价值
- 查看当前资产配置比例
- 查看累积管理费
- 查看实时NAV（已扣除管理费）

## 3. MVP不包含的功能
- ❌ 多个ETF产品
- ❌ 自动再平衡（仅支持手动）
- ❌ 复杂的费率结构
- ❌ DAO治理功能
- ❌ 多链支持
- ❌ 历史数据统计
- ❌ 复杂收益率计算
- ❌ 多种稳定币支持（仅支持USDT）

## 4. 技术实现要点

### 4.1 智能合约（最简版）
```solidity
contract BlockETF {
    // 核心功能
    function deposit(uint256 usdtAmount) external returns (uint256 shares)
    function withdraw(uint256 shares) external returns (uint256 usdtAmount)

    // 资产管理（仅管理员）
    function setAssets(address[] assets, uint256[] weights) external onlyOwner
    function rebalance() external onlyOwner
    function pause() external onlyOwner
    function unpause() external onlyOwner

    // 查询功能
    function getTotalValue() external view returns (uint256)
    function getUserShares(address user) external view returns (uint256)
    function getAssetList() external view returns (address[], uint256[])
}
```

### 4.2 依赖集成
- **DEX**：集成PancakeSwap V2/V3（BSC上最大的DEX）
- **价格源**：使用PancakeSwap Pool价格（MVP阶段）
- **代币标准**：ETF份额为BEP-20代币（BSC的ERC20标准）
- **代币地址（BSC主网）**：
  - BTCB: 0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c
  - ETH: 0x2170Ed0880ac9A755fd29B2688956BD959F933F8
  - BNB: 原生代币
  - XRP: 0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE
  - SOL: 0x570A5D26f7765Ecb712C0924E4De545B89fD43dF
  - USDT: 0x55d398326f99059fF775485246999027B3197955

### 4.3 前端界面（极简版）
- **首页**：显示TOP5 Index信息（TVL、5个代币权重、当前价格）
- **申购页**：输入USDT金额 → 显示预估份额 → 确认按钮
- **赎回页**：输入份额数量 → 显示预估USDT → 确认按钮
- **我的持仓**：显示份额数量和价值

## 5. 开发计划

### 第1周：合约开发
- [ ] BEP-20份额代币合约
- [ ] 主合约deposit/withdraw函数
- [ ] PancakeSwap集成（5个交易对）
- [ ] BSC测试网测试

### 第2周：前端开发
- [ ] Web3连接（RainbowKit）
- [ ] 申购/赎回界面
- [ ] 基础数据展示

### 第3周：测试与部署
- [ ] BSC测试网部署
- [ ] 端到端测试（5种代币完整流程）
- [ ] Gas优化（BSC上Gas较低但仍需优化）

## 6. 成功标准
- 能够成功完成申购和赎回流程
- Gas费用可接受（BSC上预计<$5 per transaction）
- 无重大安全漏洞
- 10个测试用户成功使用

## 7. 下一版本规划
MVP验证成功后，V2可以考虑添加：
- 支持多个ETF产品
- 简单的再平衡机制
- 更多稳定币支持
- 基础数据统计

## 8. 风险提示
- **价格滑点**：大额交易可能产生较大滑点
- **无再平衡**：资产比例会随价格波动偏离目标
- **单点依赖**：完全依赖PancakeSwap的流动性
- **跨链资产**：部分资产是跨链映射代币，可能存在脱锚风险

## 9. 测试场景
1. 小额申购（100 USDT）
2. 中等金额申购（1000 USDT）
3. 部分赎回（50%份额）
4. 全部赎回（100%份额）
5. 连续申赎测试

## 10. 部署配置
- **网络**：BSC测试网（MVP阶段）→ BSC主网
- **初始资产权重**：
  - BTCB: 20%
  - ETH: 20%
  - BNB: 20%
  - XRP: 20%
  - SOL: 20%
- **最小申购**：10 USDT
- **费率设置**：
  - 申购费：0%
  - 赎回费：0.3%
  - 管理费：0.8%年化（每日计提）
- **滑点保护**：最大3%