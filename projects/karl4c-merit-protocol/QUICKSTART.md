# Merit Protocol - 快速开始

## 🚀 一键启动

### 前提条件
- Node.js >= 18
- Yarn
- Alchemy API Key

### 启动步骤

```bash
# 1. 克隆完整仓库
git clone https://github.com/KarlLeen/subgraph-package.git
cd subgraph-package

# 2. 安装依赖
yarn install

# 3. 配置环境变量
echo "PORT=3002
ALCHEMY_API_KEY=你的_ALCHEMY_KEY
ORACLE_ADDRESS=0x48f2A3f3bF5fa7fbe7cfB6B36D3f335c0F7197a7
DEPLOYER_PRIVATE_KEY=你的私钥" > packages/oracle-service/.env

echo "NEXT_PUBLIC_ALCHEMY_API_KEY=你的_ALCHEMY_KEY" > packages/nextjs/.env.local

# 4. 启动 Oracle Service（终端1）
cd packages/oracle-service
yarn install
yarn start

# 5. 启动 Frontend（终端2）
cd packages/nextjs
yarn install
yarn dev
```

### 访问应用
- Frontend: http://localhost:3000
- Oracle API: http://localhost:3002

## 📝 快速演示

### 查询分数
```bash
# 查询 vitalik.eth 的分数
curl http://localhost:3002/score/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
```

### 更新分数
```bash
# 更新地址分数到链上
curl -X POST http://localhost:3002/update/0x059F40f2F70fEA8D5391F11D05672E0043C2fF51
```

## 🎬 完整演示流程

详见 [DEMO_GUIDE.md](./docs/DEMO_GUIDE.md)

## 📦 合约地址（Sepolia）

- **MeritScoreOracle**: `0x48f2A3f3bF5fa7fbe7cfB6B36D3f335c0F7197a7`
- **SponsoredLendingPool**: `0x0471a65da5c08e0e2dc573992691df54b65b3487`
- **MockUSDC**: `0xabc530ff98db0649ec7c098662a446701f5b5e90`

## 🔗 相关链接

- [完整文档](./README.md)
- [演示指南](./docs/DEMO_GUIDE.md)
- [源代码仓库](https://github.com/KarlLeen/subgraph-package)
- [Etherscan](https://sepolia.etherscan.io/address/0x48f2A3f3bF5fa7fbe7cfB6B36D3f335c0F7197a7)

## ❓ 常见问题

### Q: 如何获取 Alchemy API Key？
A: 访问 https://dashboard.alchemy.com 注册并创建应用

### Q: 前端显示分数为 0？
A: 刷新浏览器并清除缓存（Cmd+Shift+R）

### Q: 无法借款？
A: 确保你的 Merit Score >= 100 且 Pool 有足够流动性

## 📧 联系我们

- GitHub: [@KarlLeen](https://github.com/KarlLeen)
- 问题反馈: [GitHub Issues](https://github.com/KarlLeen/subgraph-package/issues)
