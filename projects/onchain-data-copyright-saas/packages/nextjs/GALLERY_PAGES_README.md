# Bodhi Gallery Pages 使用说明

## 📋 概述

本项目包含两个画廊页面，用于展示 Bodhi 系统中的 License 和 Dataset NFT：

1. **License Gallery** (`/license-gallery`) - 展示所有许可证模板
2. **Dataset Gallery** (`/dataset-gallery`) - 展示所有数据集 NFT

## 🎨 页面功能

### License Gallery (`/license-gallery`)

**功能特性：**
- ✅ 显示所有已创建的许可证模板
- ✅ 展示许可证类型（禁止衍生、完全开放、5% 回流）
- ✅ 显示许可证状态（活跃/未激活）
- ✅ 显示创建时间和 URI
- ✅ 响应式卡片布局
- ✅ 许可证类型说明

**数据来源：**
- 使用 `useScaffoldContractRead` 从 `DataLicense` 合约读取数据
- 读取 `licenseIndex` 获取总数
- 遍历所有许可证 ID 获取详细信息

### Dataset Gallery (`/dataset-gallery`)

**功能特性：**
- ✅ 显示所有已注册的数据集
- ✅ 展示数据集所有者、Arweave ID
- ✅ 显示绑定的许可证类型
- ✅ 显示总供应量（份额）
- ✅ 筛选功能（全部/我的数据集）
- ✅ 统计信息展示
- ✅ 购买份额按钮（针对非所有者）

**数据来源：**
- 使用 `useScaffoldContractRead` 从 `DatasetRegistry` 合约读取数据
- 读取 `datasetIndex` 获取总数
- 遍历所有数据集 ID 获取详细信息

## 🔧 技术栈

- **React** - UI 框架
- **Next.js** - 页面路由
- **Wagmi** - 以太坊钱包连接
- **Scaffold-ETH Hooks** - 合约交互
- **TailwindCSS** - 样式设计
- **TypeScript** - 类型安全

## 📦 合约集成

### 需要的合约：

1. **DatasetRegistry** - 数据集注册合约
   - `datasetIndex()` - 获取数据集总数
   - `datasets(uint256)` - 获取数据集详情
   - `getDatasetOwner(uint256)` - 获取所有者
   - `getDatasetArTxId(uint256)` - 获取 Arweave ID

2. **DataLicense** - 许可证管理合约
   - `licenseIndex()` - 获取许可证总数
   - `licenses(uint256)` - 获取许可证详情
   - `datasetLicense(uint256)` - 获取数据集绑定的许可证

3. **Bodhi1155** - ERC1155 份额合约
   - `totalSupply(uint256)` - 获取总供应量
   - `balanceOf(address, uint256)` - 获取用户余额

### 配置合约地址：

在 `packages/nextjs/generated/deployedContracts.ts` 中添加合约配置：

```typescript
{
  chainId: "31337", // 或其他链 ID
  name: "Hardhat",
  contracts: {
    DatasetRegistry: {
      address: "0x...",
      abi: [...],
    },
    DataLicense: {
      address: "0x...",
      abi: [...],
    },
    Bodhi1155: {
      address: "0x...",
      abi: [...],
    },
  },
}
```

## 🚀 启动项目

```bash
# 进入前端目录
cd packages/nextjs

# 安装依赖
yarn install

# 启动开发服务器
yarn dev
```

访问：
- License Gallery: http://localhost:3000/license-gallery
- Dataset Gallery: http://localhost:3000/dataset-gallery

## 📝 待完成功能

### 当前状态：
- ✅ UI 界面完成
- ✅ 基础数据结构定义
- ✅ 响应式布局
- ⚠️ 使用模拟数据（需要连接真实合约）

### 需要集成：

1. **真实合约数据读取**
   ```typescript
   // 示例：读取许可证数据
   const { data: license } = useScaffoldContractRead({
     contractName: "DataLicense",
     functionName: "licenses",
     args: [BigInt(licenseId)],
   });
   ```

2. **事件监听**
   ```typescript
   // 监听新数据集创建事件
   useScaffoldEventHistory({
     contractName: "DatasetRegistry",
     eventName: "DatasetCreated",
     fromBlock: 0n,
   });
   ```

3. **交互功能**
   - 购买数据集份额
   - 出售数据集份额
   - 创建新数据集
   - 绑定许可证

## 🎯 使用示例

### 读取所有数据集

```typescript
const { data: datasetIndex } = useScaffoldContractRead({
  contractName: "DatasetRegistry",
  functionName: "datasetIndex",
});

// 遍历所有数据集
for (let i = 1; i <= Number(datasetIndex); i++) {
  const { data: dataset } = useScaffoldContractRead({
    contractName: "DatasetRegistry",
    functionName: "datasets",
    args: [BigInt(i)],
  });
  // 处理数据集数据
}
```

### 筛选用户的数据集

```typescript
const { address } = useAccount();
const myDatasets = datasets.filter(
  d => d.owner.toLowerCase() === address?.toLowerCase()
);
```

## 🔍 调试

如果页面显示"暂无数据"：

1. 检查合约地址是否正确配置
2. 检查钱包是否连接
3. 检查网络是否正确
4. 打开浏览器控制台查看错误信息
5. 确认合约已部署并有数据

## 📚 相关文档

- [Scaffold-ETH 2 文档](https://docs.scaffoldeth.io/)
- [Wagmi 文档](https://wagmi.sh/)
- [TailwindCSS 文档](https://tailwindcss.com/)

## 🤝 贡献

欢迎提交 PR 改进这些页面！

## 📄 许可证

MIT

