# EchoVote 项目部署指南

## 项目概述
EchoVote 是一个基于AI的去中心化治理平台，允许用户通过定制的AI代理参与投票决策。项目包含前端React应用和多个智能合约。

## 技术栈
- **前端**: React + TypeScript + Vite
- **认证**: Privy
- **智能合约**: Solidity
- **网络**: BSC Testnet (已部署合约地址见下方)

## 已部署的合约地址 (BSC Testnet)
- **VotingContract**: `0xa23640ad42f1cd50f165e8d62c3fcc670840ec20`
- **EchoVote**: `0x5b0ae5f714ece588065c16184271a975e8353713`
- **Proposal**: `0x84aca3e7353f6057a671a1dd7a137368709dfaac`

---

## 需要填写的配置信息

### 1. 前端环境变量
在 `frontend/` 目录下创建 `.env.local` 文件：

```bash
# Privy 应用配置
VITE_PRIVY_APP_ID=your_privy_app_id_here

# 合约地址配置
VITE_VOTE_CONTRACT_ADDRESS=0xa23640ad42f1cd50f165e8d62c3fcc670840ec20
VITE_ECHO_VOTE_ADDRESS=0x5b0ae5f714ece588065c16184271a975e8353713
VITE_PROPOSAL_CONTRACT_ADDRESS=0x84aca3e7353f6057a671a1dd7a137368709dfaac

# BSC Testnet RPC
VITE_BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545/
```

### 2. Privy 配置
1. 访问 [Privy Dashboard](https://dashboard.privy.io/)
2. 创建新应用或使用现有应用
3. 获取 `App ID`
4. 配置支持的登录方法：邮箱、钱包
5. 设置重定向URL（本地开发：`http://localhost:5173`）

### 3. 钱包配置
- 确保钱包已连接到 BSC Testnet
- 获取测试BNB用于支付gas费用
- 可以从 [BSC Testnet Faucet](https://testnet.bnbchain.org/faucet-smart) 获取测试币

---

## 部署顺序

### 阶段1: 环境准备
1. **安装Node.js** (推荐版本 18+)
2. **安装依赖**
   ```bash
   # 安装前端依赖
   cd frontend
   npm install
   ```

### 阶段2: 智能合约部署 (如果需要重新部署)

#### 2.1 安装Hardhat (如果项目中没有)
```bash
cd contracts
npm init -y
npm install --save-dev hardhat
npm install @nomiclabs/hardhat-ethers ethers
npx hardhat init
```

#### 2.2 配置Hardhat
创建 `hardhat.config.js`:
```javascript
require("@nomiclabs/hardhat-ethers");

module.exports = {
  solidity: "0.8.0",
  networks: {
    bscTestnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545/",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 97
    }
  }
};
```

#### 2.3 部署合约顺序
1. **UserlessService** (基础服务合约)
2. **VoteResultsIPFS** (投票结果存储)
3. **ProposalStorage** (提案存储)
4. **Votecontract** (主投票合约)

#### 2.4 部署脚本示例
```javascript
// deploy.js
const { ethers } = require("hardhat");

async function main() {
  // 1. 部署 UserlessService
  const UserlessService = await ethers.getContractFactory("UserlessService");
  const userlessService = await UserlessService.deploy();
  await userlessService.deployed();
  console.log("UserlessService deployed to:", userlessService.address);

  // 2. 部署 VoteResultsIPFS
  const VoteResultsIPFS = await ethers.getContractFactory("VoteResultsIPFS");
  const voteResults = await VoteResultsIPFS.deploy();
  await voteResults.deployed();
  console.log("VoteResultsIPFS deployed to:", voteResults.address);

  // 3. 部署 ProposalStorage
  const ProposalStorage = await ethers.getContractFactory("ProposalStorage");
  const proposalStorage = await ProposalStorage.deploy();
  await proposalStorage.deployed();
  console.log("ProposalStorage deployed to:", proposalStorage.address);

  // 4. 部署 Votecontract
  const endTime = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60); // 7天后结束
  const quorum = 10; // 最低参与人数
  const Votecontract = await ethers.getContractFactory("Votecontract");
  const voteContract = await Votecontract.deploy(endTime, quorum);
  await voteContract.deployed();
  console.log("Votecontract deployed to:", voteContract.address);

  // 5. 设置 UserlessService 地址
  await voteContract.setUserlessServiceAddr(userlessService.address);
  console.log("UserlessService address set");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

### 阶段3: 前端部署

#### 3.1 配置环境变量
```bash
cd frontend
cp .env.example .env.local
# 编辑 .env.local 文件，填入上述配置信息
```

#### 3.2 启动开发服务器
```bash
npm run dev
```

#### 3.3 构建生产版本
```bash
npm run build
```

### 阶段4: 测试验证

#### 4.1 更新测试文件
编辑 `contracts/usertest.js`:
```javascript
const VOTE_CONTRACT_ADDRESS = "0xa23640ad42f1cd50f165e8d62c3fcc670840ec20";
const USERLESS_AGENT_ADDRESS = "0x5b0ae5f714ece588065c16184271a975e8353713";
```

#### 4.2 运行测试
```bash
cd contracts
npx hardhat test
```

---

## 快速启动 (使用已部署合约)

如果你只想运行前端应用，可以跳过合约部署：

1. **配置环境变量**
   ```bash
   cd frontend
   # 创建 .env.local 文件并填入上述配置
   ```

2. **安装依赖并启动**
   ```bash
   npm install
   npm run dev
   ```

3. **访问应用**
   打开浏览器访问 `http://localhost:5173`

---

## 常见问题

### Q: 如何获取BSC测试网BNB？
A: 访问 [BSC Testnet Faucet](https://testnet.bnbchain.org/faucet-smart) 获取测试币

### Q: Privy配置失败怎么办？
A: 确保在Privy Dashboard中正确配置了域名和重定向URL

### Q: 合约调用失败？
A: 检查网络配置，确保钱包连接到BSC Testnet

### Q: 前端无法连接钱包？
A: 检查Privy App ID配置和网络设置

---

## 项目结构说明

```
EchoVote/
├── frontend/                 # React前端应用
│   ├── src/
│   │   ├── components/      # React组件
│   │   ├── assets/         # 静态资源
│   │   └── styles/         # CSS样式
│   └── package.json
├── contracts/               # 智能合约
│   ├── VoteContract.sol    # 主投票合约
│   ├── EchoVoter.sol       # 投票结果存储
│   ├── proposal.sol        # 提案存储
│   └── usertest.js         # 测试文件
├── agents/                  # AI代理相关文件
│   ├── characters/         # 角色配置
│   ├── proposals/          # 提案数据
│   └── response/           # 响应数据
└── media/                   # 媒体文件
```

---

## 下一步
1. 完成环境配置
2. 启动前端应用
3. 测试钱包连接
4. 测试投票功能
5. 根据需要调整AI代理配置

如有问题，请查看项目README或提交Issue。
