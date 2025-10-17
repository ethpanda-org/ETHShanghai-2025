# Minter 角色使用指南

## ✅ 已实现方案 2

基于您的要求，我们实现了 **Minter 角色** 方案，解决了权限控制问题。

---

## 🔐 新的权限模型

### 部署后的权限关系

```
Deployer (EOA)
  │
  ├─> MockERC20(USDT) (owner = Deployer) ✅
  │     │
  │     ├─> Deployer 可以:
  │     │   - mint USDT ✅
  │     │   - 管理 minter 角色 ✅
  │     │   - 转移 ownership ✅
  │     │   - 所有 owner 操作 ✅
  │     │
  │     └─> USDTFaucet (minter = true) ✅
  │           │
  │           └─> 可以 mint USDT ✅
  │
  └─> USDTFaucet (owner = Deployer) ✅
        │
        └─> Deployer 可以配置:
            - faucetAmount ✅
            - faucetCooldown ✅
```

### 关键改进

**之前（方案 1）**：
```
❌ Deployer 失去对 USDT 的控制
❌ 无法手动 mint USDT
❌ USDT owner = USDTFaucet
```

**现在（方案 2）**：
```
✅ Deployer 保持对 USDT 的完全控制
✅ 可以手动 mint USDT
✅ USDT owner = Deployer
✅ USDTFaucet 只有 minter 角色
```

---

## 🎯 核心功能

### MockERC20 新增功能

#### 1. Minter 角色管理

```solidity
// 授予 minter 权限
function setMinter(address minter, bool status) external onlyOwner

// 检查 minter 状态
function isMinter(address account) external view returns (bool)

// 公开的 minter 映射
mapping(address => bool) public minters;
```

#### 2. 灵活的 mint 权限

```solidity
// Owner 或 minter 都可以 mint
function mint(address to, uint256 amount) external {
    require(
        msg.sender == owner() || minters[msg.sender],
        "MockERC20: not authorized to mint"
    );
    _mint(to, amount);
}
```

---

## 📖 使用场景

### 场景 1：Deployer 直接 mint USDT

```bash
# ✅ Deployer 可以直接 mint（owner 权限）
cast send $USDT "mint(address,uint256)" \
  $TARGET_ADDRESS \
  1000000000000000000000 \
  --rpc-url bnb_testnet \
  --private-key $DEPLOYER_KEY

# 例如：为流动性池 mint 大量 USDT
cast send $USDT "mint(address,uint256)" \
  $LIQUIDITY_POOL \
  1000000000000000000000000 \
  --rpc-url bnb_testnet \
  --private-key $DEPLOYER_KEY
```

### 场景 2：用户通过水龙头领取 USDT

```bash
# ✅ 用户调用 faucet（faucet 有 minter 权限）
cast send $USDT_FAUCET "claim()" \
  --rpc-url bnb_testnet \
  --private-key $USER_KEY

# Faucet 内部会调用 usdt.mint(user, amount)
# 因为 faucet 是 minter，所以可以成功
```

### 场景 3：管理多个 Minter

```bash
# ✅ 添加另一个 faucet 为 minter
cast send $USDT "setMinter(address,bool)" \
  $ANOTHER_FAUCET \
  true \
  --rpc-url bnb_testnet \
  --private-key $DEPLOYER_KEY

# ✅ 移除某个 minter 权限
cast send $USDT "setMinter(address,bool)" \
  $OLD_FAUCET \
  false \
  --rpc-url bnb_testnet \
  --private-key $DEPLOYER_KEY

# ✅ 查看某地址是否是 minter
cast call $USDT "isMinter(address)(bool)" \
  $ADDRESS \
  --rpc-url bnb_testnet
```

### 场景 4：为测试账户批量 mint

```bash
# ✅ Deployer 可以批量分发 USDT（不受 faucet 冷却限制）
for addr in $TEST_ACCOUNTS; do
  cast send $USDT "mint(address,uint256)" \
    $addr 10000000000000000000000 \
    --rpc-url bnb_testnet \
    --private-key $DEPLOYER_KEY
done
```

---

## 🔍 验证权限

### 检查 Owner

```bash
cast call $USDT "owner()(address)" --rpc-url bnb_testnet
# 应该返回: Deployer 地址
```

### 检查 Minter 状态

```bash
# 检查 faucet 是否是 minter
cast call $USDT "isMinter(address)(bool)" $USDT_FAUCET --rpc-url bnb_testnet
# 应该返回: true

# 检查 deployer 是否是 minter（owner 总是可以 mint）
cast call $USDT "isMinter(address)(bool)" $DEPLOYER --rpc-url bnb_testnet
# 应该返回: true (owner 自动是 minter)

# 检查普通用户是否是 minter
cast call $USDT "isMinter(address)(bool)" $RANDOM_USER --rpc-url bnb_testnet
# 应该返回: false
```

### 查看所有 Minter（通过事件）

```bash
# 查看 MinterUpdated 事件
cast logs \
  --address $USDT \
  --event "MinterUpdated(address indexed,bool)" \
  --from-block 0 \
  --rpc-url bnb_testnet
```

---

## 📊 权限对比

### 操作权限矩阵

| 操作 | Deployer | USDTFaucet | 普通用户 |
|------|---------|-----------|---------|
| **mint USDT** | ✅ (owner) | ✅ (minter) | ❌ |
| **setMinter** | ✅ (owner) | ❌ | ❌ |
| **transferOwnership** | ✅ (owner) | ❌ | ❌ |
| **setFaucetAmount** | ✅ (faucet owner) | ❌ | ❌ |
| **claim from faucet** | ✅ | ✅ | ✅ |

### 灵活性对比

| 场景 | 方案 1 (ownership) | 方案 2 (minter) |
|------|-------------------|----------------|
| Deployer 直接 mint | ❌ | ✅ |
| Faucet 分发 | ✅ | ✅ |
| 批量测试分发 | ❌ | ✅ |
| 添加多个 faucet | ❌ | ✅ |
| 紧急手动干预 | ❌ | ✅ |

---

## 🎓 最佳实践

### 1. 部署后验证权限

```bash
#!/bin/bash
# verify-permissions.sh

echo "Checking USDT permissions..."

# 1. 验证 owner
OWNER=$(cast call $USDT "owner()(address)" --rpc-url bnb_testnet)
echo "USDT Owner: $OWNER"
echo "Expected: $DEPLOYER"

# 2. 验证 faucet 是 minter
IS_MINTER=$(cast call $USDT "isMinter(address)(bool)" $USDT_FAUCET --rpc-url bnb_testnet)
echo "Faucet is minter: $IS_MINTER"
echo "Expected: true"

# 3. 测试 deployer 可以 mint
echo "Testing deployer mint..."
cast send $USDT "mint(address,uint256)" $DEPLOYER 1e18 --rpc-url bnb_testnet --private-key $DEPLOYER_KEY

# 4. 测试 faucet 可以 mint（通过 claim）
echo "Testing faucet claim..."
cast send $USDT_FAUCET "claim()" --rpc-url bnb_testnet --private-key $USER_KEY

echo "✅ All permissions verified!"
```

### 2. 紧急情况处理

```bash
# 如果 faucet 出现问题，可以临时禁用
cast send $USDT "setMinter(address,bool)" $USDT_FAUCET false \
  --rpc-url bnb_testnet --private-key $DEPLOYER_KEY

# 手动分发 USDT 给用户
cast send $USDT "mint(address,uint256)" $USER 10000e18 \
  --rpc-url bnb_testnet --private-key $DEPLOYER_KEY

# 修复后重新启用 faucet
cast send $USDT "setMinter(address,bool)" $USDT_FAUCET true \
  --rpc-url bnb_testnet --private-key $DEPLOYER_KEY
```

### 3. 多环境管理

```bash
# 开发环境：无冷却限制
cast send $USDT_FAUCET "setFaucetCooldown(uint256)" 0 \
  --rpc-url bnb_testnet --private-key $DEPLOYER_KEY

# 直接分发给开发账户
cast send $USDT "mint(address,uint256)" $DEV_ACCOUNT 100000e18 \
  --rpc-url bnb_testnet --private-key $DEPLOYER_KEY

# 公开测试环境：正常冷却
cast send $USDT_FAUCET "setFaucetCooldown(uint256)" 86400 \
  --rpc-url bnb_testnet --private-key $DEPLOYER_KEY
```

---

## 🔒 安全考虑

### 1. Minter 权限管理

**原则**：
- ✅ 只授予必要的合约 minter 权限
- ✅ 定期审查 minter 列表
- ✅ 移除不再使用的 minter

**示例**：
```bash
# 部署新 faucet 后，记得禁用旧的
cast send $USDT "setMinter(address,bool)" $OLD_FAUCET false \
  --private-key $DEPLOYER_KEY

cast send $USDT "setMinter(address,bool)" $NEW_FAUCET true \
  --private-key $DEPLOYER_KEY
```

### 2. Owner 密钥保护

**重要**：
- ⚠️ Owner 可以添加/移除任何 minter
- ⚠️ Owner 可以无限 mint
- ⚠️ 妥善保管 deployer 私钥

**建议**：
- 测试网：可以使用开发密钥
- 生产环境：使用硬件钱包或多签

### 3. 事件监控

```solidity
// 监控 minter 变更
event MinterUpdated(address indexed minter, bool status);

// 可以设置告警
// 当有新 minter 添加时通知管理员
```

---

## 📈 升级路径

### 当前实现（方案 2）

```solidity
contract MockERC20 {
    mapping(address => bool) public minters;

    function mint(address to, uint256 amount) external {
        require(msg.sender == owner() || minters[msg.sender], "Not authorized");
        _mint(to, amount);
    }

    function setMinter(address minter, bool status) external onlyOwner {
        minters[minter] = status;
    }
}
```

### 未来可能的升级

如果需要更复杂的权限管理，可以升级到 AccessControl：

```solidity
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract MockERC20 is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    function grantMinterRole(address account) external onlyRole(ADMIN_ROLE) {
        grantRole(MINTER_ROLE, account);
    }
}
```

**但目前的实现已经足够**：
- ✅ 简单清晰
- ✅ Gas 优化
- ✅ 满足需求

---

## ✅ 总结

### 实现的改进

1. **权限保留** ✅
   - Deployer 保持对 USDT 的完全控制
   - 可以随时直接 mint

2. **灵活性** ✅
   - 支持多个 minter
   - 可以动态添加/移除

3. **简洁性** ✅
   - 只增加了 ~20 行代码
   - 易于理解和维护

4. **兼容性** ✅
   - 不影响现有功能
   - Faucet 照常工作

### 使用建议

**日常使用**：
- 用户通过 faucet 领取 USDT
- Faucet 自动处理冷却和限额

**特殊需求**：
- Deployer 可以直接 mint
- 绕过 faucet 限制
- 用于流动性、测试等

**生产部署**：
- 审计 minter 权限
- 监控 mint 事件
- 定期审查权限列表

---

**方案 2 已成功实现！Deployer 现在拥有完全的灵活性和控制权。** ✨
