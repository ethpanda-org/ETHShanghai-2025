# 🎨 前端集成指南 - CINA Protocol (Sepolia)

> **版本**: v1.0  
> **网络**: Sepolia Testnet  
> **更新时间**: 2025-10-15  
> **状态**: Router 系统已部署，可开始集成

---

## 📋 目录

1. [快速开始](#快速开始)
2. [核心合约地址](#核心合约地址)
3. [功能模块](#功能模块)
4. [API 接口](#api-接口)
5. [代码示例](#代码示例)
6. [UI 组件规范](#ui-组件规范)
7. [测试指南](#测试指南)
8. [常见问题](#常见问题)

---

## 🚀 快速开始

### 环境要求

```json
{
  "dependencies": {
    "ethers": "^6.13.3",
    "wagmi": "^2.0.0",
    "viem": "^2.0.0",
    "@rainbow-me/rainbowkit": "^2.0.0"
  }
}
```

### 网络配置

```typescript
// config/chains.ts
import { defineChain } from 'viem'

export const sepolia = defineChain({
  id: 11155111,
  name: 'Sepolia',
  network: 'sepolia',
  nativeCurrency: {
    decimals: 18,
    name: 'Sepolia Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc2.sepolia.org'],
    },
    public: {
      http: ['https://rpc2.sepolia.org'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Etherscan',
      url: 'https://sepolia.etherscan.io',
    },
  },
  testnet: true,
})
```

---

## 📍 核心合约地址

### 主要合约

```typescript
// config/contracts.ts
export const CONTRACTS = {
  // Router 系统 (推荐使用)
  Router: '0xB8B3e6C7D0f0A9754F383107A6CCEDD8F19343Ec',
  
  // 核心协议
  PoolManager: '0xBb644076500Ea106d9029B382C4d49f56225cB82',
  FxUSD: '0x085a1b6da46aE375b35Dea9920a276Ef571E209c',
  FxUSDBasePool: '0x420D6b8546F14C394A703F5ac167619760A721A9',
  
  // 流动性池
  AaveFundingPool: '0xAb20B978021333091CA307BB09E022Cec26E8608',
  
  // 测试代币
  USDC: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  
  // 工具
  MockPriceOracle: '0x81bdd1Ec9D7850411D0d50a7080A704a69d3b9F4',
} as const;
```

### Router Facets

```typescript
export const ROUTER_FACETS = {
  DiamondCut: '0x1adb1d517f0fAd6695Ac5907CB16276FaC1C3e8B',
  DiamondLoupe: '0x28909aA9fA21e06649F0E9A0a67E7CcabAAef947',
  Ownership: '0xf662BA47BE8d10a9573afb2553EDA46db3854715',
  RouterManagement: '0xD3A63FfBE2EDa3D0E07426346189000f39fDa1C0',
  MorphoFlashLoan: '0x7DfE7037d407af7d5B84f0aeE56f8466ce0AC150',
  PositionOperate: '0x6403A2D1A99e15369A1f5C46fA2983C619D0B410',
  FxUSDBasePool: '0x08aD9003331FFDbe727354711bE1E8a67646C460',
} as const;
```

---

## 🎯 功能模块

### 模块 1: 查询池子信息

**优先级**: 🔥🔥🔥 最高  
**预计时间**: 2-3 天

**功能**:
- 显示可用的流动性池列表
- 显示每个池的 TVL、APY、抵押品类型
- 显示池子容量和使用率

**接口**:
```typescript
interface PoolInfo {
  address: string;
  name: string;
  collateralToken: string;
  collateralCapacity: bigint;
  debtCapacity: bigint;
  totalCollateral: bigint;
  totalDebt: bigint;
  apy: number;
}
```

### 模块 2: 用户钱包连接

**优先级**: 🔥🔥🔥 最高  
**预计时间**: 1-2 天

**功能**:
- 连接 MetaMask/WalletConnect
- 显示用户余额 (ETH, USDC, fxUSD)
- 切换到 Sepolia 网络

### 模块 3: 开仓/增加抵押品

**优先级**: 🔥🔥 高  
**预计时间**: 3-4 天

**功能**:
- 输入抵押品数量
- 计算可借 fxUSD 数量
- 显示预估手续费
- 显示健康度/清算价格
- 执行开仓交易

**关键参数**:
```typescript
interface OpenPositionParams {
  poolAddress: string;
  collateralAmount: bigint;
  debtAmount: bigint;
  slippage?: number; // 默认 0.5%
}
```

### 模块 4: 查询仓位

**优先级**: 🔥🔥 高  
**预计时间**: 2-3 天

**功能**:
- 显示用户所有仓位
- 显示每个仓位的抵押品、债务、健康度
- 实时价格更新
- 显示盈亏

### 模块 5: 关仓/减少抵押品

**优先级**: 🔥 中  
**预计时间**: 2-3 天

**功能**:
- 部分或全部关闭仓位
- 计算需要归还的 fxUSD
- 显示可提取的抵押品
- 执行关仓交易

### 模块 6: fxUSD Savings (fxBASE)

**优先级**: 🔥 中  
**预计时间**: 2-3 天

**功能**:
- 存入 fxUSD 到 fxBASE
- 显示 APY 和收益
- 取出 fxUSD

### 模块 7: 价格图表

**优先级**: 💡 低  
**预计时间**: 3-5 天

**功能**:
- 显示抵押品价格趋势
- 显示 fxUSD 价格
- TVL 历史图表

---

## 🔌 API 接口

### 1. 查询池子信息

```typescript
// hooks/usePoolInfo.ts
import { useContractRead } from 'wagmi';
import { CONTRACTS } from '@/config/contracts';
import PoolManagerABI from '@/abi/PoolManager.json';

export function usePoolInfo(poolAddress: string) {
  return useContractRead({
    address: CONTRACTS.PoolManager,
    abi: PoolManagerABI,
    functionName: 'getPoolInfo',
    args: [poolAddress],
    watch: true,
  });
}

// 返回值
interface PoolInfoResult {
  rewarder: string;
  gauge: string;
  collateralCapacity: bigint;
  debtCapacity: bigint;
}
```

### 2. 查询用户余额

```typescript
// hooks/useBalances.ts
import { useBalance, useContractRead } from 'wagmi';
import { CONTRACTS } from '@/config/contracts';

export function useUserBalances(userAddress: string) {
  // ETH 余额
  const { data: ethBalance } = useBalance({
    address: userAddress,
  });
  
  // USDC 余额
  const { data: usdcBalance } = useContractRead({
    address: CONTRACTS.USDC,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [userAddress],
  });
  
  // fxUSD 余额
  const { data: fxUSDBalance } = useContractRead({
    address: CONTRACTS.FxUSD,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [userAddress],
  });
  
  return {
    eth: ethBalance?.value || 0n,
    usdc: usdcBalance || 0n,
    fxUSD: fxUSDBalance || 0n,
  };
}
```

### 3. 开仓操作

```typescript
// hooks/useOpenPosition.ts
import { useContractWrite, usePrepareContractWrite } from 'wagmi';
import { CONTRACTS } from '@/config/contracts';
import PoolManagerABI from '@/abi/PoolManager.json';

export function useOpenPosition(
  poolAddress: string,
  positionId: bigint,
  collateralAmount: bigint,
  debtAmount: bigint
) {
  // 准备交易
  const { config } = usePrepareContractWrite({
    address: CONTRACTS.PoolManager,
    abi: PoolManagerABI,
    functionName: 'operate',
    args: [
      poolAddress,
      positionId,
      collateralAmount,
      debtAmount,
    ],
  });
  
  // 执行交易
  const { write, data, isLoading, isSuccess } = useContractWrite(config);
  
  return {
    openPosition: write,
    txHash: data?.hash,
    isLoading,
    isSuccess,
  };
}
```

### 4. 授权 USDC

```typescript
// hooks/useApproveUSDC.ts
import { useContractWrite, usePrepareContractWrite } from 'wagmi';
import { CONTRACTS } from '@/config/contracts';
import { maxUint256 } from 'viem';

export function useApproveUSDC() {
  const { config } = usePrepareContractWrite({
    address: CONTRACTS.USDC,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [CONTRACTS.PoolManager, maxUint256],
  });
  
  const { write, isLoading, isSuccess } = useContractWrite(config);
  
  return {
    approve: write,
    isLoading,
    isSuccess,
  };
}
```

### 5. 查询仓位

```typescript
// hooks/usePosition.ts
import { useContractRead } from 'wagmi';
import { CONTRACTS } from '@/config/contracts';

export function usePosition(
  poolAddress: string,
  positionId: bigint
) {
  return useContractRead({
    address: CONTRACTS.PoolManager,
    abi: PoolManagerABI,
    functionName: 'getPosition',
    args: [poolAddress, positionId],
    watch: true,
  });
}

// 返回值
interface PositionResult {
  collateral: bigint;
  debt: bigint;
}
```

### 6. 计算健康度

```typescript
// utils/calculateHealth.ts
export function calculateHealthFactor(
  collateralAmount: bigint,
  collateralPrice: bigint,
  debtAmount: bigint,
  liquidationThreshold: number = 0.8
): number {
  // 健康度 = (抵押品价值 * 清算阈值) / 债务
  const collateralValue = (collateralAmount * collateralPrice) / 10n**18n;
  const threshold = BigInt(Math.floor(liquidationThreshold * 1e18));
  const health = (collateralValue * threshold) / debtAmount;
  
  return Number(health) / 1e18;
}

// 使用示例
const health = calculateHealthFactor(
  1000000n,  // 1 USDC (6 decimals)
  1e18,      // $1 price (18 decimals)
  500000000000000000n, // 0.5 fxUSD (18 decimals)
  0.8        // 80% threshold
);
// health = 1.6 (健康)
```

---

## 💻 代码示例

### 示例 1: 完整的开仓组件

```typescript
// components/OpenPosition.tsx
import { useState } from 'react';
import { parseUnits, formatUnits } from 'viem';
import { useAccount } from 'wagmi';
import { useOpenPosition, useApproveUSDC, useBalances } from '@/hooks';
import { CONTRACTS } from '@/config/contracts';

export function OpenPositionModal() {
  const { address } = useAccount();
  const [collateralAmount, setCollateralAmount] = useState('');
  const [debtAmount, setDebtAmount] = useState('');
  
  const { usdc } = useBalances(address!);
  const { approve, isLoading: isApproving } = useApproveUSDC();
  const { openPosition, isLoading: isOpening, txHash } = useOpenPosition(
    CONTRACTS.AaveFundingPool,
    1n, // positionId
    parseUnits(collateralAmount || '0', 6),
    parseUnits(debtAmount || '0', 18)
  );
  
  const handleMaxCollateral = () => {
    setCollateralAmount(formatUnits(usdc, 6));
  };
  
  const calculateMaxDebt = () => {
    // 假设 50% LTV
    const maxDebt = parseUnits(collateralAmount || '0', 6) * 50n / 100n;
    setDebtAmount(formatUnits(maxDebt, 6));
  };
  
  return (
    <div className="modal">
      <h2>开仓</h2>
      
      {/* 抵押品输入 */}
      <div className="input-group">
        <label>抵押品 (USDC)</label>
        <input
          type="number"
          value={collateralAmount}
          onChange={(e) => setCollateralAmount(e.target.value)}
          placeholder="0.00"
        />
        <button onClick={handleMaxCollateral}>MAX</button>
        <span className="balance">
          余额: {formatUnits(usdc, 6)} USDC
        </span>
      </div>
      
      {/* 借款输入 */}
      <div className="input-group">
        <label>借款 (fxUSD)</label>
        <input
          type="number"
          value={debtAmount}
          onChange={(e) => setDebtAmount(e.target.value)}
          placeholder="0.00"
        />
        <button onClick={calculateMaxDebt}>MAX SAFE</button>
      </div>
      
      {/* 健康度显示 */}
      <div className="health-factor">
        <span>健康度:</span>
        <span className="value">
          {calculateHealthFactor(
            parseUnits(collateralAmount || '0', 6),
            1e18,
            parseUnits(debtAmount || '0', 18)
          ).toFixed(2)}
        </span>
      </div>
      
      {/* 操作按钮 */}
      <div className="actions">
        <button onClick={approve} disabled={isApproving}>
          {isApproving ? '授权中...' : '1. 授权 USDC'}
        </button>
        <button onClick={openPosition} disabled={isOpening}>
          {isOpening ? '开仓中...' : '2. 开仓'}
        </button>
      </div>
      
      {/* 交易状态 */}
      {txHash && (
        <div className="tx-status">
          <a
            href={`https://sepolia.etherscan.io/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            查看交易 →
          </a>
        </div>
      )}
    </div>
  );
}
```

### 示例 2: 池子列表组件

```typescript
// components/PoolList.tsx
import { usePoolInfo } from '@/hooks';
import { CONTRACTS } from '@/config/contracts';
import { formatUnits } from 'viem';

const POOLS = [
  {
    address: CONTRACTS.AaveFundingPool,
    name: 'USDC Pool',
    collateral: 'USDC',
    icon: '/icons/usdc.svg',
  },
];

export function PoolList() {
  return (
    <div className="pool-list">
      <h2>流动性池</h2>
      
      {POOLS.map((pool) => (
        <PoolCard key={pool.address} {...pool} />
      ))}
    </div>
  );
}

function PoolCard({ address, name, collateral, icon }) {
  const { data: poolInfo } = usePoolInfo(address);
  
  if (!poolInfo) return <div>Loading...</div>;
  
  const utilizationRate = poolInfo.totalDebt * 100n / poolInfo.debtCapacity;
  
  return (
    <div className="pool-card">
      <div className="pool-header">
        <img src={icon} alt={collateral} />
        <h3>{name}</h3>
      </div>
      
      <div className="pool-stats">
        <div className="stat">
          <span className="label">抵押品容量</span>
          <span className="value">
            {formatUnits(poolInfo.collateralCapacity, 6)} {collateral}
          </span>
        </div>
        
        <div className="stat">
          <span className="label">债务容量</span>
          <span className="value">
            {formatUnits(poolInfo.debtCapacity, 18)} fxUSD
          </span>
        </div>
        
        <div className="stat">
          <span className="label">使用率</span>
          <span className="value">{utilizationRate.toString()}%</span>
        </div>
      </div>
      
      <button className="btn-primary">开仓</button>
    </div>
  );
}
```

### 示例 3: 仓位列表

```typescript
// components/PositionList.tsx
import { useAccount } from 'wagmi';
import { usePosition } from '@/hooks';
import { formatUnits } from 'viem';

export function PositionList() {
  const { address } = useAccount();
  
  // 假设我们知道用户的 positionIds
  const positionIds = [1n, 2n, 3n];
  
  return (
    <div className="position-list">
      <h2>我的仓位</h2>
      
      {positionIds.map((id) => (
        <PositionCard
          key={id.toString()}
          poolAddress={CONTRACTS.AaveFundingPool}
          positionId={id}
        />
      ))}
    </div>
  );
}

function PositionCard({ poolAddress, positionId }) {
  const { data: position } = usePosition(poolAddress, positionId);
  
  if (!position) return null;
  if (position.collateral === 0n) return null; // 空仓位
  
  const health = calculateHealthFactor(
    position.collateral,
    1e18, // USDC price
    position.debt
  );
  
  return (
    <div className="position-card">
      <div className="position-header">
        <h3>Position #{positionId.toString()}</h3>
        <span className={`health ${health > 1.5 ? 'safe' : health > 1.2 ? 'warning' : 'danger'}`}>
          {health.toFixed(2)}
        </span>
      </div>
      
      <div className="position-details">
        <div className="detail">
          <span>抵押品</span>
          <span>{formatUnits(position.collateral, 6)} USDC</span>
        </div>
        
        <div className="detail">
          <span>债务</span>
          <span>{formatUnits(position.debt, 18)} fxUSD</span>
        </div>
      </div>
      
      <div className="position-actions">
        <button>增加抵押</button>
        <button>关闭</button>
      </div>
    </div>
  );
}
```

---

## 🎨 UI 组件规范

### 颜色主题

```scss
// styles/theme.scss
$colors: (
  // 主色
  primary: #3B82F6,
  primary-dark: #2563EB,
  primary-light: #60A5FA,
  
  // 状态
  success: #10B981,
  warning: #F59E0B,
  danger: #EF4444,
  
  // 中性
  bg-primary: #FFFFFF,
  bg-secondary: #F3F4F6,
  text-primary: #111827,
  text-secondary: #6B7280,
  border: #E5E7EB,
);
```

### 布局规范

```typescript
// 响应式断点
const breakpoints = {
  mobile: '640px',
  tablet: '768px',
  desktop: '1024px',
  wide: '1280px',
};

// 间距系统
const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
};
```

### 组件库推荐

建议使用：
- **shadcn/ui** - 现代化组件库
- **Tailwind CSS** - 快速样式
- **Framer Motion** - 动画效果

---

## 🧪 测试指南

### 测试账户

```typescript
// 测试用 USDC 地址
export const TEST_USDC = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';

// Sepolia 水龙头
// https://sepoliafaucet.com/
```

### 测试流程

1. **获取测试 ETH**
   - 访问 https://sepoliafaucet.com/
   - 获取 0.5 Sepolia ETH

2. **获取测试 USDC**
   - 需要从 Sepolia USDC 合约获取
   - 或使用已有的测试 USDC

3. **测试开仓**
   ```typescript
   // 最小开仓金额
   const MIN_COLLATERAL = parseUnits('1', 6); // 1 USDC
   const MIN_DEBT = parseUnits('0.1', 18);    // 0.1 fxUSD
   ```

4. **验证交易**
   - 检查 Etherscan 交易状态
   - 确认余额变化
   - 验证仓位创建

---

## ❓ 常见问题

### Q1: 为什么交易失败？

**A**: 可能的原因：
1. **USDC 未授权** - 先调用 `approve()`
2. **余额不足** - 检查 USDC 余额
3. **健康度过低** - 减少借款金额
4. **Pool 容量已满** - 选择其他池子

### Q2: 如何计算最大借款金额？

**A**: 
```typescript
// 公式: maxDebt = collateral * price * LTV
const maxDebt = (collateralAmount * collateralPrice * LTV) / 1e18;

// 示例: 1 USDC, price=$1, LTV=80%
const maxDebt = (1e6 * 1e18 * 0.8) / 1e18 = 0.8 fxUSD
```

### Q3: Router 和 PoolManager 有什么区别？

**A**:
- **PoolManager**: 核心合约，直接调用
- **Router**: 聚合器，提供更多功能（闪电贷等）
- **建议**: 优先使用 PoolManager（更简单）

### Q4: 如何处理 Gas 费用？

**A**:
```typescript
// 设置 Gas 限制
const gasLimit = 500000n;

// 获取 Gas 价格
const gasPrice = await publicClient.getGasPrice();

// 估算成本
const gasCost = gasLimit * gasPrice;
```

### Q5: 测试网代币如何获取？

**A**:
- **Sepolia ETH**: https://sepoliafaucet.com/
- **Sepolia USDC**: 联系团队或使用 Mock USDC

---

## 📞 技术支持

### 联系方式

- **GitHub Issues**: [项目仓库]
- **Discord**: [社区链接]
- **文档**: 见仓库 `/docs` 目录

### 有用的链接

- **Sepolia Etherscan**: https://sepolia.etherscan.io/
- **Router 合约**: https://sepolia.etherscan.io/address/0xB8B3e6C7D0f0A9754F383107A6CCEDD8F19343Ec
- **测试水龙头**: https://sepoliafaucet.com/

---

## 📦 ABI 文件

ABI 文件位置：
```
/artifacts-hardhat/contracts/
├── interfaces/
│   └── IPoolManager.sol/IPoolManager.json
├── core/
│   ├── PoolManager.sol/PoolManager.json
│   └── FxUSDRegeneracy.sol/FxUSDRegeneracy.json
├── periphery/
│   └── facets/RouterManagementFacet.sol/RouterManagementFacet.json
```

关键 ABI：
- `PoolManager.json` - 核心池管理
- `FxUSDRegeneracy.json` - fxUSD 代币
- `RouterManagementFacet.json` - Router 管理

---

**文档版本**: v1.0  
**最后更新**: 2025-10-15  
**状态**: ✅ 可用于集成

