# ZK-RWA 智能合约

## 📁 目录结构

```
contracts/
├── core/               # 🎯 核心基础设施合约（可独立使用）
│   ├── ZKRWARegistryMultiPlatform.sol    # 多平台身份注册
│   ├── ComplianceGateway.sol             # 合规网关
│   ├── CompositeProofVerifier.sol        # 组合验证器
│   └── ZKRWARegistry.sol                 # 基础注册合约
├── demo/               # 🎨 演示应用合约（参考实现）
│   ├── ZKRWAAssetFactory.sol             # RWA资产工厂
│   └── ZKRWATokenERC3643.sol             # RWA代币示例
├── adapters/           # 🔌 适配器层
│   ├── ZKComplianceModule.sol            # ERC-3643合规适配器
│   └── ZKToERC3643Adapter.sol            # ZK到ERC-3643适配
├── interfaces/         # 📋 接口定义
│   ├── IZKRWARegistry.sol
│   ├── ICompliance.sol
│   ├── IERC3643.sol
│   └── IIdentityRegistry.sol
├── verifiers/          # 🔐 ZK验证器合约
│   ├── PropertyFyVerifier.sol            # PropertyFy平台验证器
│   ├── RealTVerifier.sol                 # RealT平台验证器
│   └── RealestateVerifier.sol            # Realestate.io平台验证器
└── mocks/              # 🧪 测试模拟合约
    └── MockGroth16Verifier.sol
```

---

## 🎯 核心合约（Core Contracts）

这些合约构成ZK-RWA合规基础设施的核心，可以被任何RWA项目集成使用。

### ZKRWARegistryMultiPlatform.sol
- **功能**：支持多平台的零知识身份注册
- **平台支持**：PropertyFy, RealT, RealestateIO
- **用途**：RWA项目集成此合约以验证用户合规性

### ComplianceGateway.sol
- **功能**：统一的合规验证网关
- **特性**：支持一步式证明验证和操作执行
- **集成**：可作为任何RWA代币的合规检查器

### CompositeProofVerifier.sol
- **功能**：组合多个ZK证明的验证器
- **用途**：支持复杂的合规要求

### ZKRWARegistry.sol
- **功能**：基础的ZK身份注册合约
- **用途**：单一平台的简化版本

---

## 🎨 演示合约（Demo Contracts）

这些合约展示如何使用核心基础设施构建完整的RWA应用。**仅用于参考和学习。**

### ZKRWAAssetFactory.sol
- **功能**：创建和管理RWA资产代币
- **用途**：演示如何创建RWA资产
- **状态**：参考实现，不建议直接用于生产

### ZKRWATokenERC3643.sol
- **功能**：符合ERC-3643标准的RWA代币
- **集成**：使用ZKComplianceModule进行合规验证
- **用途**：演示代币如何集成ZK合规

---

## 🔌 适配器（Adapters）

将ZK合规能力无缝集成到现有ERC-3643生态。

### ZKComplianceModule.sol
- **实现**：ERC-3643 ICompliance接口
- **功能**：插拔式合规模块
- **集成**：可直接插入任何支持ERC-3643的RWA项目

### ZKToERC3643Adapter.sol
- **功能**：桥接ZK验证和ERC-3643身份注册
- **用途**：简化集成过程

---

## 📋 接口（Interfaces）

标准化的合约接口定义。

- **IZKRWARegistry.sol**：ZK注册合约接口
- **ICompliance.sol**：ERC-3643合规接口
- **IERC3643.sol**：ERC-3643代币标准
- **IIdentityRegistry.sol**：身份注册接口

---

## 🔐 验证器（Verifiers）

每个平台的Groth16零知识证明验证器合约。

- **PropertyFyVerifier.sol**：12个公共信号
- **RealTVerifier.sol**：12个公共信号
- **RealestateVerifier.sol**：16个公共信号



---

## 🚀 使用指南

### 集成核心基础设施

```solidity
// 1. 导入核心合约
import "./core/ZKRWARegistryMultiPlatform.sol";
import "./adapters/ZKComplianceModule.sol";

// 2. 在您的RWA代币中使用
contract MyRWAToken is ERC20, IERC3643 {
    ZKComplianceModule public compliance;
    
    constructor(address _complianceModule) {
        compliance = ZKComplianceModule(_complianceModule);
    }
    
    function transfer(address to, uint256 amount) public override {
        require(compliance.canTransfer(msg.sender, to, amount), "Not compliant");
        super.transfer(to, amount);
    }
}
```

### 参考演示合约

查看 `demo/` 目录下的合约，了解完整的实现示例。

---

## 📚 部署脚本

```bash
# 仅部署核心合约
pnpm deploy:core

# 部署演示应用（包括核心）
pnpm deploy:demo

# 部署全部
pnpm deploy:all
```

---

## ⚠️ 重要说明

1. **生产使用**：仅使用 `core/` 和 `adapters/` 目录下的合约
2. **演示合约**：`demo/` 目录下的合约仅供学习参考
3. **验证器**：由Circom电路自动生成，请勿手动编辑
4. **审计**：在生产环境使用前，请进行安全审计

---



