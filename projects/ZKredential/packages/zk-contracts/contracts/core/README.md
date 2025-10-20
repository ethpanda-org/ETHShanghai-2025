# 🎯 核心合约（Core Contracts）

这些合约构成ZK-RWA合规基础设施的核心，可以被任何RWA项目独立集成使用。

---

## 📦 包含的合约

### 1. ZKRWARegistryMultiPlatform.sol
**多平台零知识身份注册合约**

```solidity
// 支持三个平台的ZK验证
- PropertyFy (12个公共信号)
- RealT (12个公共信号)  
- RealestateIO (16个公共信号)
```

**核心功能**：
- ✅ 用户提交ZK证明进行身份注册
- ✅ 平台验证用户合规性（无需暴露隐私）
- ✅ 支持身份撤销和更新
- ✅ 审计日志记录

**使用场景**：
任何需要隐私保护KYC的RWA平台

---

### 2. ComplianceGateway.sol
**统一合规验证网关**

```solidity
// 一步式验证和执行
verifyAndExecute(proof, action, params)
```

**核心功能**：
- ✅ 整合多平台验证器
- ✅ 防重放攻击
- ✅ 支持铸造和转移操作
- ✅ 完全匿名操作

**使用场景**：
作为RWA代币的合规检查器

---

### 3. CompositeProofVerifier.sol
**组合证明验证器**

```solidity
// 组合多个ZK证明
verifyComposite(proofs[])
```

**核心功能**：
- ✅ 支持多重验证要求
- ✅ 灵活的验证逻辑组合
- ✅ 降低gas成本

**使用场景**：
复杂合规要求（如：多个属性验证）

---

### 4. ZKRWARegistry.sol
**基础ZK注册合约**

```solidity
// 单一平台的简化版本
registerIdentity(proof)
```

**核心功能**：
- ✅ 简化的单平台注册
- ✅ 更低的部署和使用成本
- ✅ 适合小型项目

**使用场景**：
只需要单一平台支持的项目

---

## 🔗 依赖关系

```
ZKRWARegistryMultiPlatform
    ├── IGroth16Verifier12 (验证器接口)
    ├── IGroth16Verifier16 (验证器接口)
    └── OpenZeppelin (Ownable, ReentrancyGuard)

ComplianceGateway
    ├── IGroth16Verifier12
    ├── IGroth16Verifier16
    └── OpenZeppelin

CompositeProofVerifier
    └── 各平台验证器合约

ZKRWARegistry
    └── IGroth16Verifier (单一验证器)
```

---

## 💡 集成示例

### 示例1：作为身份注册表

```solidity
import "./core/ZKRWARegistryMultiPlatform.sol";

contract MyRWAPlatform {
    ZKRWARegistryMultiPlatform public registry;
    
    function checkUserCompliance(address user) public view returns (bool) {
        return registry.isUserRegistered("propertyfy", user);
    }
}
```

### 示例2：作为合规网关

```solidity
import "./core/ComplianceGateway.sol";

contract MyRWAToken {
    ComplianceGateway public gateway;
    
    function mint(address to, uint256 amount, bytes memory proof) public {
        gateway.verifyAndExecute(
            proof,
            ComplianceGateway.Action.MINT_RWA_TOKEN,
            abi.encode(to, amount)
        );
        _mint(to, amount);
    }
}
```

---


## 🔒 安全特性

1. **防重放攻击**：证明哈希记录，防止重复使用
2. **访问控制**：仅owner可以更新验证器和撤销身份
3. **暂停机制**：紧急情况下可暂停合约
4. **重入保护**：所有状态修改函数都有ReentrancyGuard

---

## 🧪 测试覆盖

- ✅ 单元测试：100%覆盖
- ✅ 集成测试：多平台场景
- ✅ Gas优化测试
- ✅ 安全审计（建议）

---

## 📖 更多文档

- [完整API文档](../../docs/CONTRACTS_API.md)
- [集成指南](../../../../docs/INTEGRATION.md)
- [安全最佳实践](../../../../docs/SECURITY.md)

---

**这些合约是ZK-RWA基础设施的核心，建议在生产环境使用前进行专业安全审计。**

