# 开仓交易测试报告

## 测试日期
2025-10-09

## 测试环境
- **网络**: Anvil Fork (Localhost)
- **RPC**: http://127.0.0.1:8545
- **Chain ID**: 31337
- **PoolManager**: `0x66713e76897CdC363dF358C853df5eE5831c3E5a`

## 测试结果总结

### ✅ 成功项

1. **合约部署验证**
   - ✅ PoolManager 代理合约部署成功
   - ✅ PoolManager 可访问并响应调用
   - ✅ fxUSD 地址正确配置 (`0x085780639CC2cACd35E474e71f4d000e2405d8f6`)

2. **合约接口识别**
   - ✅ 识别出 `operate()` 函数为开仓主要接口
   - ✅ 理解开仓参数：`operate(pool, positionId, newColl, newDebt)`
   - ✅ 确认开仓流程和逻辑

### ❌ 限制和问题

1. **配置缺失**
   - ❌ PoolConfiguration 未部署（地址为 `0x0000...0000`）
   - ❌ 没有注册的池子（如 wstETH pool）
   - ❌ 缺少价格预言机配置

2. **测试限制**
   - 无法在当前部署上执行实际的开仓交易
   - 需要完整的池子部署才能测试

## 开仓交易流程说明

### 合约调用接口

```solidity
function operate(
    address pool,        // 池子地址（如 wstETH 池）
    uint256 positionId,  // 仓位ID（0 = 新仓位）
    int256 newColl,      // 抵押品变化（正数=存入，负数=取出）
    int256 newDebt       // 债务变化（正数=借入，负数=偿还）
) external returns (uint256 actualPositionId);
```

### 开仓步骤

#### 1. 准备阶段
```javascript
// 用户拥有抵押品代币（如 wstETH）
const collateralAmount = parseEther("1"); // 1 wstETH

// 批准 PoolManager 使用抵押品
await collateralToken.approve(poolManagerAddress, collateralAmount);
```

#### 2. 开仓调用
```javascript
// 开启新仓位
const tx = await poolManager.operate(
    poolAddress,              // wstETH 池地址
    0,                        // positionId = 0 (新仓位)
    parseEther("1"),          // 存入 1 wstETH
    parseEther("2000")        // 借出 2000 fxUSD
);

const receipt = await tx.wait();
```

#### 3. 合约执行流程

**PoolManager 内部操作**:
1. 验证池子已注册 (`onlyRegisteredPool` modifier)
2. 检查系统未暂停 (`whenNotPaused` modifier)
3. 从用户转移抵押品到池子
4. 计算并收取费用
5. 铸造 fxUSD 债务代币
6. 将 fxUSD 转给用户
7. 为用户铸造代表仓位的 NFT
8. 触发 `Operate` 事件

**关键验证**:
- 抵押率检查（Collateral Ratio）
- 池子容量限制
- 价格预言机调用
- 费用计算

#### 4. 结果

用户获得：
- **fxUSD 代币**: 借出的金额（如 2000 fxUSD）
- **仓位 NFT**: 代表该仓位的 ERC721 代币
- **债务义务**: 需要偿还的债务（2000 fxUSD + 利息）

合约状态：
- **抵押品**: 锁定在池子中（1 wstETH）
- **债务记录**: 记录在 PoolManager 中
- **仓位数据**: 包含抵押品、债务、所有者等信息

## 开仓参数示例

### 示例 1: 开启 wstETH 仓位

```javascript
// 存入 1 wstETH，借出 2000 fxUSD
await poolManager.operate(
    wstETHPoolAddress,
    0,                    // 新仓位
    parseEther("1"),      // +1 wstETH
    parseEther("2000")    // +2000 fxUSD debt
);

// 假设 wstETH = $3000
// LTV = 2000 / 3000 = 66.67%
```

### 示例 2: 增加抵押品

```javascript
// 向现有仓位添加 0.5 wstETH
await poolManager.operate(
    wstETHPoolAddress,
    1,                    // 仓位 #1
    parseEther("0.5"),    // +0.5 wstETH
    0                     // 不改变债务
);
```

### 示例 3: 增加借款

```javascript
// 从现有仓位借出更多 fxUSD
await poolManager.operate(
    wstETHPoolAddress,
    1,                    // 仓位 #1
    0,                    // 不改变抵押品
    parseEther("500")     // +500 fxUSD debt
);
```

### 示例 4: 偿还债务

```javascript
// 偿还部分债务
// 注意：需要先批准 fxUSD
await fxUSD.approve(poolManagerAddress, parseEther("1000"));

await poolManager.operate(
    wstETHPoolAddress,
    1,                      // 仓位 #1
    0,                      // 不改变抵押品
    parseEther("-1000")     // -1000 fxUSD (偿还)
);
```

### 示例 5: 取出抵押品

```javascript
// 取出部分抵押品（在保持安全抵押率的前提下）
await poolManager.operate(
    wstETHPoolAddress,
    1,                        // 仓位 #1
    parseEther("-0.2"),       // -0.2 wstETH (取出)
    0                         // 不改变债务
);
```

### 示例 6: 关闭仓位

```javascript
// 完全偿还债务并取出所有抵押品
await fxUSD.approve(poolManagerAddress, parseEther("2000"));

await poolManager.operate(
    wstETHPoolAddress,
    1,                          // 仓位 #1
    parseEther(type(int256).min), // 取出所有抵押品
    parseEther(type(int256).min)  // 偿还所有债务
);
```

## 事件监听

### Operate 事件

```solidity
event Operate(
    address indexed pool,
    uint256 indexed position,
    int256 deltaColls,
    int256 deltaDebts,
    uint256 protocolFees
);
```

监听示例：
```javascript
poolManager.on("Operate", (pool, position, deltaColls, deltaDebts, protocolFees) => {
    console.log(`Position ${position} operated on pool ${pool}`);
    console.log(`Collateral change: ${ethers.formatEther(deltaColls)}`);
    console.log(`Debt change: ${ethers.formatEther(deltaDebts)}`);
    console.log(`Protocol fees: ${ethers.formatEther(protocolFees)}`);
});
```

## 风险和注意事项

### 1. 抵押率管理
- **安全区域**: 通常需要维持 > 150% 抵押率
- **清算风险**: 抵押率 < 清算阈值时会被清算
- **建议**: 保持充足的安全边际

### 2. 价格波动
- **抵押品价格下跌**: 可能导致抵押率降低
- **建议**: 监控价格，及时补充抵押品

### 3. 费用
- **开仓费用**: Supply fee (存入抵押品)
- **借款费用**: Borrow fee (借出 fxUSD)
- **偿还费用**: Repay fee (偿还债务)
- **取款费用**: Withdraw fee (取出抵押品)

### 4. Gas 费用
- 开仓交易 gas 消耗：约 200,000 - 400,000 gas
- 建议在 gas 价格较低时操作

## 所需前置条件

要在当前部署上测试开仓，需要：

1. **部署 PoolConfiguration**
   ```bash
   npx hardhat run scripts/deploy-pool-config.ts --network localhost
   ```

2. **部署 Long Pool (如 wstETH pool)**
   ```bash
   npx hardhat run scripts/deploy-wsteth-pool.ts --network localhost
   ```

3. **注册池子**
   ```javascript
   await poolManager.registerPool(wstETHPoolAddress);
   ```

4. **配置池子参数**
   - 设置费率
   - 设置容量限制
   - 设置抵押率要求
   - 配置价格预言机

5. **准备抵押品代币**
   - 获取测试用的 wstETH
   - 批准 PoolManager 使用

## 替代测试方案

### 方案 1: 使用现有测试套件

```bash
# 运行 PoolManager 单元测试
npx hardhat test test/core/PoolManager.spec.ts

# 运行特定测试
npx hardhat test test/core/PoolManager.spec.ts --grep "operate"
```

### 方案 2: 部署完整测试环境

参考 `ignition/modules/FxSaveAndWBTCPool.ts` 部署完整的池子设置。

### 方案 3: 使用主网 Fork 的现有池子

如果主网上已有部署的池子，可以直接与之交互：

```javascript
// 连接到主网现有的 PoolManager
const mainnetPoolManager = "0x[MainnetPoolManagerAddress]";
const pm = await ethers.getContractAt("PoolManager", mainnetPoolManager);

// 使用现有池子
const wstETHPool = await pm.poolRegistry(wstETHAddress);
```

## 测试脚本

已创建以下测试脚本：

1. **test-open-position.ts** - 完整的开仓测试流程
2. **test-open-position-simple.ts** - 简化的诊断脚本

运行：
```bash
npx hardhat run test-open-position-simple.ts --network localhost
```

## 结论

**当前状态**:
- ✅ PoolManager 已部署并可访问
- ✅ 核心基础设施已就绪
- ❌ 缺少池子配置和注册
- ❌ 无法执行实际的开仓交易

**建议**:
1. 完成池子配置的部署
2. 部署并注册至少一个 Long Pool
3. 配置价格预言机
4. 然后可以进行完整的开仓测试

**开仓功能验证**:
虽然无法在当前环境执行实际交易，但我们已经：
- ✅ 识别并理解了开仓接口
- ✅ 明确了开仓流程和参数
- ✅ 创建了测试脚本框架
- ✅ 提供了完整的使用示例

一旦部署了完整的池子配置，就可以使用提供的脚本进行实际测试。

## 相关文档

- **合约源码**: `contracts/core/PoolManager.sol:345`
- **接口定义**: `contracts/interfaces/IPoolManager.sol:98`
- **测试用例**: `test/core/PoolManager.spec.ts:624`
- **部署脚本**: `deploy-fork.ts`

## 附录：完整代码示例

### 完整的开仓交易代码

```typescript
import { ethers } from "hardhat";
import { parseEther } from "ethers";

async function openPosition() {
  const [user] = await ethers.getSigners();

  // 合约地址
  const poolManagerAddr = "0x66713e76897CdC363dF358C853df5eE5831c3E5a";
  const wstETHPoolAddr = "0x..."; // wstETH 池地址
  const wstETHAddr = "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0";

  // 获取合约实例
  const poolManager = await ethers.getContractAt("PoolManager", poolManagerAddr);
  const wstETH = await ethers.getContractAt("IERC20", wstETHAddr);

  // 参数
  const collateral = parseEther("1");    // 1 wstETH
  const debt = parseEther("2000");       // 2000 fxUSD

  // 1. 批准
  console.log("Approving collateral...");
  const approveTx = await wstETH.approve(poolManagerAddr, collateral);
  await approveTx.wait();

  // 2. 开仓
  console.log("Opening position...");
  const tx = await poolManager.operate(
    wstETHPoolAddr,
    0,           // 新仓位
    collateral,  // 存入抵押品
    debt         // 借出 fxUSD
  );

  const receipt = await tx.wait();
  console.log("Position opened!");
  console.log("Transaction hash:", tx.hash);
  console.log("Gas used:", receipt.gasUsed.toString());

  // 3. 检查结果
  const fxUSD = await ethers.getContractAt("IERC20", await poolManager.fxUSD());
  const balance = await fxUSD.balanceOf(user.address);
  console.log("fxUSD balance:", ethers.formatEther(balance));
}

openPosition().catch(console.error);
```

---

**生成时间**: 2025-10-09
**版本**: 1.0
