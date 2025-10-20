# 🎨 演示合约（Demo Contracts）

这些合约展示如何使用ZK-RWA核心基础设施构建完整的RWA应用。

> **⚠️ 重要提示**：这些合约仅供参考和学习使用，**不建议直接用于生产环境**。

---

## 📦 包含的合约

### 1. ZKRWAAssetFactory.sol
**RWA资产代币工厂合约**

```solidity
// 创建新的RWA资产代币
createAsset(
    name,
    symbol,
    description,
    totalValue,
    minInvestment,
    maxSupply,
    platformName
)
```

**功能演示**：
- ✅ 批量创建RWA代币
- ✅ 资产元数据管理
- ✅ 创建者追踪
- ✅ 平台分类
- ✅ 创建费用机制

**使用场景**：
演示如何构建RWA资产发行平台

**限制**：
- 简化的权限管理
- 基础的费用模型
- 无复杂的资产验证

---

### 2. ZKRWATokenERC3643.sol
**符合ERC-3643标准的RWA代币示例**

```solidity
// ERC-3643合规代币
- transfer() with compliance check
- invest() with ZK verification
- compliance integration
```

**功能演示**：
- ✅ ERC-3643标准实现
- ✅ 集成ZKComplianceModule
- ✅ 投资统计
- ✅ 地址冻结机制
- ✅ 资产信息管理

**使用场景**：
演示RWA代币如何集成ZK合规

**限制**：
- 简化的投资逻辑
- 基础的治理功能
- 无复杂的分红机制

---

## 🔗 依赖关系

```
ZKRWAAssetFactory
    ├── ZKRWATokenERC3643 (创建代币实例)
    ├── IZKRWARegistry (合规验证)
    └── OpenZeppelin

ZKRWATokenERC3643
    ├── IIdentityRegistry (身份验证)
    ├── ICompliance (合规检查)
    ├── IZKRWARegistry (ZK验证)
    └── ERC20 (代币标准)
```

---

## 💡 学习示例

### 示例1：创建RWA资产

```solidity
// 1. 部署工厂合约
ZKRWAAssetFactory factory = new ZKRWAAssetFactory(
    zkRegistryAddress,
    identityAdapterAddress,
    complianceAdapterAddress
);

// 2. 创建资产
address newAsset = factory.createAsset(
    "Shanghai Office Building",
    "SOB",
    "Premium office space in Pudong",
    5000000 * 10**6,  // 500万美元
    10000 * 10**6,    // 最小投资1万美元
    1000000 * 10**18, // 100万代币供应量
    "propertyfy"
);
```

### 示例2：投资RWA资产

```solidity
// 用户投资流程
ZKRWATokenERC3643 token = ZKRWATokenERC3643(assetAddress);

// 1. 用户已在ZKRWARegistry注册
// 2. 直接投资
token.invest{value: 10000 * 10**6}(investorAddress);

// 3. 代币自动铸造并分配
```

---

## 🎯 参考实现说明

### ✅ 演示了哪些最佳实践

1. **合规集成**
   ```solidity
   modifier onlyVerified(address addr) {
       require(_identityRegistry.isVerified(addr), "Not verified");
       _;
   }
   ```

2. **重入保护**
   ```solidity
   function invest() external payable nonReentrant {
       // 安全的投资逻辑
   }
   ```

3. **事件记录**
   ```solidity
   event AssetCreated(address indexed asset, ...);
   event Investment(address indexed investor, ...);
   ```

4. **访问控制**
   ```solidity
   function updateAssetInfo() external onlyOwner {
       // 仅owner可操作
   }
   ```

### ⚠️ 生产环境需要增强的部分

1. **更复杂的治理**
   - 持有人投票机制
   - 多签管理
   - 时间锁

2. **资产验证**
   - 链下资产验证流程
   - 审计报告链上存储
   - 估值更新机制

3. **分红机制**
   - 收益分配逻辑
   - 自动化分红
   - 税务合规

4. **流动性管理**
   - 二级市场集成
   - 赎回机制
   - 价格发现

5. **监管合规**
   - 更严格的KYC/AML
   - 地域限制
   - 投资者认证等级

---

## 📊 与实际RWA项目的差异

| 功能 | 演示合约 | 生产级项目 |
|------|---------|-----------|
| 资产验证 | ❌ 简化 | ✅ 完整流程 |
| 投资限制 | ⚠️ 基础 | ✅ 复杂规则 |
| 分红机制 | ❌ 无 | ✅ 自动化 |
| 治理功能 | ❌ 无 | ✅ DAO治理 |
| 审计报告 | ❌ 无 | ✅ 链上存储 |
| 流动性 | ❌ 无 | ✅ DEX集成 |
| 监管合规 | ⚠️ 基础 | ✅ 完整合规 |

---

## 🚀 如何使用这些演示合约

### 1. 作为学习资源
```bash
# 阅读代码，理解RWA代币结构
cat ZKRWATokenERC3643.sol

# 理解工厂模式应用
cat ZKRWAAssetFactory.sol
```

### 2. 作为测试环境
```bash
# 部署演示合约进行集成测试
pnpm deploy:demo

# 测试完整的用户流程
pnpm test:demo
```

### 3. 作为快速原型
```bash
# fork这些合约作为起点
# 根据实际需求扩展功能
```

---

## 📝 修改建议

如果要基于这些合约开发生产级应用：

1. **增强安全性**
   - 添加更多的输入验证
   - 增加紧急暂停机制
   - 实施速率限制

2. **添加业务逻辑**
   - 实现完整的分红系统
   - 添加赎回机制
   - 集成二级市场

3. **改进治理**
   - 实施DAO治理
   - 添加提案系统
   - 实现时间锁

4. **监管合规**
   - 严格的KYC流程
   - 地域限制
   - 投资者分级

5. **进行审计**
   - 聘请专业审计公司
   - 修复所有发现的问题
   - 实施bug赏金计划

---

## 📖 相关资源

- [ERC-3643标准](https://github.com/TokenySolutions/ERC3643)
- [RWA代币最佳实践](https://docs.tokenscript.org/)
- [核心合约文档](../core/README.md)
- [集成指南](../../../../docs/INTEGRATION.md)

---

**记住：这些是演示合约！在生产环境使用前，务必进行彻底的安全审计和功能增强。** 🔒

