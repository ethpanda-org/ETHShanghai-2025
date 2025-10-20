# 🔌 RWA 项目集成指南

## ZKredential 集成说明

**本文档说明如何将 ZKredential 集成到 ERC-3643 RWA 代币中**

---

## 🎯 集成步骤

### 步骤 1: 获取 ZKComplianceModule 地址

**Sepolia**: `0x4512387c0381c59D0097574bAAd7BF67A8Cc7B81`

或部署自己的实例：

```typescript
const ZKComplianceModule = await ethers.getContractFactory("ZKComplianceModule");
const zkModule = await ZKComplianceModule.deploy(
  "0x2dF31b4814dff5c99084FD93580FE90011EE92b2",  // ZKRWARegistry
  ethers.ZeroAddress,                             
  "propertyfy"                                     // 默认平台
);
```

---

### 步骤 2: 集成到 RWA 代币

```typescript
// 您的 ERC-3643 RWA 代币
const rwaToken = await ethers.getContractAt(
  "YourRWAToken",
  "0xYourTokenAddress"
);

// 设置 ZK 合规模块
await rwaToken.setComplianceModule(
  "0x4512387c0381c59D0097574bAAd7BF67A8Cc7B81"
);

// ✅ 完成！
```

---

### 步骤 3: 测试

```typescript
// 用户转账（会自动检查 ZK 验证）
await rwaToken.transfer(recipient, amount);

// 如果双方都通过 ZK 验证 → ✅ 成功
// 如果任一方未验证 → ❌ 拒绝，提示: "Transfer not compliant"
```

---

## 💡 工作原理

```solidity
// ERC-3643 RWA Token
function _transfer(address from, address to, uint256 amount) internal {
    // 自动调用合规检查
    require(
        complianceModule.canTransfer(from, to, amount),
        "Transfer not compliant"
    );
    super._transfer(from, to, amount);
}

// ZKComplianceModule
function canTransfer(address from, address to, uint256) external view returns (bool) {
    // 检查双方是否通过 ZK 验证
    return zkRegistry.hasValidIdentity(from) && 
           zkRegistry.hasValidIdentity(to);
}
```

---

## ✨ 技术特性

- **标准接口**: 通过 `token.setCompliance(zkModule)` 完成集成
- **向后兼容**: 无需修改现有代币合约代码
- **隐私保护**: 用户真实数据不上链
- **性能维持**: 保持白名单模式的 gas 成本（~5k gas）
- **多平台支持**: 用户注册可在多个 RWA 平台复用

---

## 📚 更多信息

查看主文档: [README.md](../README.md)
