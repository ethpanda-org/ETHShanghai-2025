# Scaffold-ETH 2 架构指南

## 概述

Scaffold-ETH 2 是一个现代化的以太坊 dApp 开发框架，采用 TypeScript 构建，集成了最新的 Web3 开发工具栈。本指南将深入分析其架构设计、核心组件和最佳实践。

## 技术栈

### 前端技术栈
- **NextJS 14+**: React 框架，支持 App Router
- **TypeScript**: 类型安全的 JavaScript 超集
- **Tailwind CSS**: 实用优先的 CSS 框架
- **daisyUI**: 基于 Tailwind CSS 的组件库
- **Wagmi**: React Hooks for Ethereum
- **Viem**: TypeScript 接口的以太坊库
- **RainbowKit**: 钱包连接组件库
- **TanStack Query**: 数据获取和缓存

### 智能合约技术栈
- **Hardhat/Foundry**: 智能合约开发环境
- **Solidity**: 智能合约编程语言
- **TypeChain**: 为智能合约生成 TypeScript 类型
- **Ethers.js**: 以太坊库

## 项目架构

### 整体结构

```
scaffold-eth-2/
├── packages/
│   ├── hardhat/          # 智能合约开发环境
│   └── nextjs/           # 前端应用
├── package.json          # 根级依赖管理
├── yarn.lock            # 依赖锁定文件
└── README.md            # 项目文档
```

### Monorepo 架构

Scaffold-ETH 2 采用 Yarn Workspaces 管理的 monorepo 架构：

- **根级 package.json**: 定义工作空间和全局脚本
- **packages/hardhat**: 智能合约开发包
- **packages/nextjs**: 前端应用包

#### 关键脚本命令

```json
{
  "scripts": {
    "chain": "yarn hardhat:chain",      // 启动本地区块链
    "deploy": "yarn hardhat:deploy",    // 部署智能合约
    "start": "yarn workspace @se-2/nextjs dev",  // 启动前端开发服务器
    "compile": "yarn hardhat:compile",  // 编译智能合约
    "test": "yarn hardhat:test"         // 运行测试
  }
}
```

## 前端架构 (NextJS)

### 目录结构

```
packages/nextjs/
├── app/                  # Next.js App Router 页面
│   ├── page.tsx         # 首页
│   ├── layout.tsx       # 根布局
│   ├── debug/           # 调试页面
│   └── blockexplorer/   # 区块浏览器页面
├── components/          # React 组件
│   ├── scaffold-eth/    # Scaffold-ETH 专用组件
│   ├── Header.tsx       # 头部组件
│   └── Footer.tsx       # 底部组件
├── hooks/               # 自定义 React Hooks
│   └── scaffold-eth/    # Scaffold-ETH 专用 hooks
├── contracts/           # 合约 ABI 和地址
├── services/            # 服务层
├── utils/               # 工具函数
├── styles/              # 样式文件
└── scaffold.config.ts   # Scaffold 配置
```

### 核心配置

#### scaffold.config.ts

```typescript
export type ScaffoldConfig = {
  targetNetworks: readonly chains.Chain[];  // 目标网络
  pollingInterval: number;                  // 轮询间隔
  alchemyApiKey: string;                   // Alchemy API 密钥
  walletConnectProjectId: string;          // WalletConnect 项目 ID
  onlyLocalBurnerWallet: boolean;          // 仅本地燃烧钱包
};
```

### 组件架构

#### Scaffold-ETH 组件库

位于 `components/scaffold-eth/`，提供常用的 Web3 组件：

1. **Address**: 地址显示组件，支持 ENS 解析
2. **Balance**: 余额显示组件，支持 ETH/USD 转换
3. **BlockieAvatar**: 基于地址生成的头像
4. **Input 系列**: 各种输入组件
   - AddressInput: 地址输入
   - EtherInput: ETH 数量输入
   - IntegerInput: 整数输入
5. **RainbowKitCustomConnectButton**: 自定义钱包连接按钮

#### 组件设计原则

- **类型安全**: 所有组件都有完整的 TypeScript 类型定义
- **可复用性**: 组件设计遵循单一职责原则
- **样式一致性**: 使用 Tailwind CSS 和 daisyUI 保持设计一致性

### Hooks 架构

#### 核心 Hooks

位于 `hooks/scaffold-eth/`，提供与智能合约交互的抽象层：

1. **useScaffoldReadContract**: 读取合约数据
2. **useScaffoldWriteContract**: 写入合约数据
3. **useScaffoldEventHistory**: 获取历史事件
4. **useScaffoldWatchContractEvent**: 监听合约事件
5. **useDeployedContractInfo**: 获取已部署合约信息
6. **useTransactor**: 交易处理和 UI 反馈

#### Hook 设计模式

```typescript
// 示例：useScaffoldReadContract
export const useScaffoldReadContract = <
  TContractName extends ContractName,
  TFunctionName extends ExtractAbiFunctionNames<ContractAbi<TContractName>, "pure" | "view">,
>({
  contractName,
  functionName,
  args,
  chainId,
  ...readConfig
}: UseScaffoldReadConfig<TContractName, TFunctionName>) => {
  // 自动获取合约信息
  const { data: deployedContract } = useDeployedContractInfo({
    contractName,
    chainId: selectedNetwork.id as AllowedChainIds,
  });

  // 调用 wagmi 的 useReadContract
  const readContractHookRes = useReadContract({
    chainId: selectedNetwork.id,
    functionName,
    address: deployedContract?.address,
    abi: deployedContract?.abi,
    args,
    // ...其他配置
  });

  return readContractHookRes;
};
```

### 状态管理

#### Zustand Store

使用 Zustand 进行全局状态管理：

```typescript
// services/store/store.ts
export const useGlobalState = create<GlobalState>(() => ({
  nativeCurrency: {
    price: 0,
    isFetching: true,
  },
  targetNetwork: chains.hardhat,
  setTargetNetwork: (newTargetNetwork: Chain) => {
    // 状态更新逻辑
  },
}));
```

### 网络配置

#### 多链支持

通过 `scaffold.config.ts` 配置支持的网络：

```typescript
const scaffoldConfig = {
  targetNetworks: [chains.hardhat, chains.sepolia, chains.mainnet],
  // 其他配置...
};
```

#### RPC 配置

支持自定义 RPC 端点：

```typescript
rpcOverrides: {
  [chains.mainnet.id]: "https://mainnet.rpc.buidlguidl.com",
}
```

## 智能合约架构 (Hardhat)

### 目录结构

```
packages/hardhat/
├── contracts/           # 智能合约源码
│   └── YourContract.sol
├── deploy/             # 部署脚本
│   └── 00_deploy_your_contract.ts
├── test/               # 测试文件
│   └── YourContract.ts
├── scripts/            # 工具脚本
├── hardhat.config.ts   # Hardhat 配置
└── package.json        # 依赖管理
```

### 配置架构

#### hardhat.config.ts

```typescript
const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  defaultNetwork: "localhost",
  networks: {
    // 支持多个网络配置
    hardhat: { /* 本地网络配置 */ },
    sepolia: { /* 测试网配置 */ },
    mainnet: { /* 主网配置 */ },
    // 更多网络...
  },
  namedAccounts: {
    deployer: {
      default: 0, // 默认使用第一个账户作为部署者
    },
  },
};
```

### 部署架构

#### 部署脚本模式

使用 `hardhat-deploy` 插件管理部署：

```typescript
// deploy/00_deploy_your_contract.ts
const deployYourContract: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  await deploy("YourContract", {
    from: deployer,
    args: [deployer], // 构造函数参数
    log: true,
    autoMine: true, // 本地网络自动挖矿
  });
};

export default deployYourContract;
deployYourContract.tags = ["YourContract"];
```

### 测试架构

#### 测试模式

```typescript
// test/YourContract.ts
describe("YourContract", function () {
  let yourContract: YourContract;
  
  before(async () => {
    const [owner] = await ethers.getSigners();
    const yourContractFactory = await ethers.getContractFactory("YourContract");
    yourContract = (await yourContractFactory.deploy(owner.address)) as YourContract;
    await yourContract.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should have the right message on deploy", async function () {
      expect(await yourContract.greeting()).to.equal("Building Unstoppable Apps!!!");
    });
  });
});
```

## 数据流架构

### 合约到前端的数据流

```
Smart Contract → Hardhat Deploy → deployedContracts.ts → Hooks → Components
```

1. **智能合约部署**: 通过 Hardhat 部署脚本部署合约
2. **ABI 生成**: 自动生成 TypeScript 类型和 ABI
3. **合约信息**: 存储在 `deployedContracts.ts` 中
4. **Hooks 抽象**: 通过 Scaffold hooks 提供类型安全的接口
5. **组件使用**: React 组件通过 hooks 与合约交互

### 类型安全流程

```typescript
// 1. 合约定义
contract YourContract {
    function setGreeting(string memory _newGreeting) public payable;
    function greeting() public view returns (string memory);
}

// 2. 自动生成的类型
type YourContractFunctions = {
  setGreeting: (args: [string]) => Promise<TransactionResponse>;
  greeting: () => Promise<string>;
};

// 3. Hook 使用
const { data: greeting } = useScaffoldReadContract({
  contractName: "YourContract",
  functionName: "greeting", // 类型安全
});

const { writeContractAsync } = useScaffoldWriteContract("YourContract");
await writeContractAsync({
  functionName: "setGreeting", // 类型安全
  args: ["Hello World!"],      // 参数类型检查
});
```

## 开发工作流

### 本地开发流程

1. **启动本地链**: `yarn chain`
2. **部署合约**: `yarn deploy`
3. **启动前端**: `yarn start`
4. **开发调试**: 使用 Debug Contracts 页面

### 生产部署流程

1. **配置网络**: 在 `hardhat.config.ts` 中添加目标网络
2. **设置环境变量**: 配置私钥和 API 密钥
3. **部署合约**: `yarn deploy --network <network-name>`
4. **验证合约**: `yarn verify --network <network-name>`
5. **部署前端**: 配置 `scaffold.config.ts` 并部署到 Vercel

## 扩展性设计

### 添加新合约

1. 在 `contracts/` 中创建新合约
2. 在 `deploy/` 中添加部署脚本
3. 运行 `yarn deploy` 自动更新类型
4. 在前端中使用新的 hooks

### 添加新网络

1. 在 `hardhat.config.ts` 中添加网络配置
2. 在 `scaffold.config.ts` 中添加到 `targetNetworks`
3. 配置相应的 RPC 端点

### 自定义组件

1. 创建新组件在 `components/` 目录
2. 使用 Scaffold hooks 进行合约交互
3. 遵循 Tailwind CSS 样式规范

## 最佳实践

### 代码组织

1. **分层架构**: 清晰的分层，合约层、服务层、组件层
2. **类型安全**: 充分利用 TypeScript 的类型系统
3. **模块化**: 组件和 hooks 的模块化设计
4. **配置集中**: 所有配置集中在配置文件中

### 性能优化

1. **缓存策略**: 使用 TanStack Query 进行数据缓存
2. **轮询优化**: 合理设置轮询间隔
3. **懒加载**: 页面和组件的懒加载
4. **Bundle 优化**: 代码分割和 tree shaking

### 安全考虑

1. **私钥管理**: 使用环境变量管理私钥
2. **网络验证**: 验证网络配置的正确性
3. **输入验证**: 前端和合约的输入验证
4. **权限控制**: 合约的访问控制机制

## 总结

Scaffold-ETH 2 提供了一个完整的、类型安全的、现代化的 dApp 开发框架。其架构设计注重：

- **开发体验**: 热重载、类型安全、丰富的工具链
- **可扩展性**: 模块化设计、插件系统、多链支持
- **生产就绪**: 完整的部署流程、性能优化、安全考虑
- **社区驱动**: 开源、文档完善、活跃的社区支持

通过理解这些架构原理和设计模式，开发者可以更好地利用 Scaffold-ETH 2 构建高质量的去中心化应用。