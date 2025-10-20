# GovLoom Governance Accelerator

## 项目概述

**名称**  
GovLoom – AI 驱动的链上治理加速器

**项目介绍**  

GovLoom 旨在打造一个链上治理优化平台，使用AI动态分析项目状况和历史提案，结合本身项目分类，全自动提出治理提案并交由用户投票，且最终在源项目上发起，帮助协议重新激活社区治理活力。这不仅解决了以太坊各项目提案缺少、治理思路缺乏的困境，也提高了质押用户参与投票治理的积极性，并为以太坊生态活跃度的提升做出贡献。

**目标用户**  
- DeFi / DAO 项目方：希望持续获得优质提案、保持治理热度  
- 链上社区成员与质押用户：需要透明、可信、易参与的治理流程  
- 研究者 / 运营团队：希望洞察治理与协议指标的关系  

**问题提出与解决方案**

对于当前的以太坊生态来说，我们可以发现各项目的治理提案数量正随着时间减少，投票用户也面临缩减和从散户向大户的转变。我们以某协议为例，可以看到国库资金、tvl与提案数量有着明显的正相关关系。因此，激励项目方产生优质的提案内容，和激励用户积极参与提案投票治理，对于整个项目的可持续发展以及以太坊生态的活跃度都有极大的帮助。同时，该项目的一个历史提案就旨在奖励优秀提案者并给予赏金和NFT奖励，可见项目本身对于契合协议发展的提议是有需求的，有动力的。

![alt text](img/situation.png)

| 当前痛点 | GovLoom 方案 |
| --- | --- |
| 提案数量下降、治理乏力 | 使用多智能体 AI 主动生成候选治理方案 |
| 投票集中、用户积极性不足 | 披露风险与缓解措施，配合质押 / NFT 权限设计，鼓励真实贡献者参与 |
| 缺乏执行落地 | VotingSystem 合约直接承接投票结果，带冷静期与执行权限 |
| 信息割裂 | 前端整合提案描述、链上票数、投票者列表、多智能体流程可视化 |

---

## 架构与实现

### 工作流

![alt text](img/workflow.png)

### 关键模块
- **proposalGenerator/**  
  LangGraph 多智能体流水线：Generator → Ranker → Validator → Monitor → Reporter，输出 `ranked_proposals.md` 与 `final_governance_report.md`。
- **contracts/**  
  Hardhat 项目，核心合约 `VotingSystem.sol` 支持公共/特权投票、质押门槛、NFT gating、票数占比统计；附部署/验证脚本。
- **frontend/**  
  Vite + React + TypeScript + Wagmi + Web3Modal；主要页面：
  - `/` 着陆页（双语、AI 流程、价值主张）
  - `/explore` DAO 列表（搜索、排序、视图切换）
  - `/dao/:slug` DAO 首页（提案列表、概览）
  - `/dao/:slug/proposal/:proposalId` 提案详情（Markdown、链上票数、投票操作、投票者列表）
  - `/dao/:slug/new-proposal` 多智能体提案流程可视化

### 技术栈
- **前端**：React 18、TypeScript、Vite、Wagmi、Web3Modal、React Router、React Markdown  
- **链上**：Solidity、Hardhat、ethers.js/viem  
- **AI 自动化**：LangChain、LangGraph、OpenAI API  
- **数据脚本**：Python、Pandas、DeFiLlama / DexScreener / CoinGecko API

---

## 合约与部署信息

| 合约 | 网络 | 地址 | 功能 |
| --- | --- | --- | --- |
| VotingSystem | BSC Testnet (`chainId 97`) | `0xb6f2d30b6c49C135935C4E67F822f1Cd8b51f80b` | 投票合约（公共与特权投票、质押管理） |
| VotingStakeToken | BSC Testnet | `0x22e6Cb737cB988c9554BF721250260c5F6ce201D` | 质押代币示例（VSTT） |

**部署与验证脚本**
```bash
cd contracts
npm install
npm run deploy:stake -- --network bsctestnet
npm run deploy:voting -- --network bsctestnet
npm run verify:stake -- --network bsctestnet
npm run verify:voting -- --network bsctestnet
```

---

## 运行与复现

### 环境要求
- Node.js ≥ 20.19（Vite 7 要求）
- npm ≥ 10
- Python 3.10+（运行数据/AI 脚本）
- Hardhat 依赖（本地或全局）

### 前端
```bash
cd frontend
npm install
npm run dev
# http://localhost:5173
```

### 合约
```bash
cd contracts
npm install
npm run build      # 编译
npm test           # 单元测试
npm run deploy:voting -- --network bsctestnet
```
示例 `.env` 位于 `contracts/.env`，包含 RPC、私钥、合约地址等。

### 多智能体提案生成（可选）
```bash
cd proposalGenerator/generator
python main.py                   # 生成 ranked_proposals.md 与 final_governance_report.md
```

### 部署之后用到的网站

``` 
http://localhost:5173/workflow
http://localhost:5173/explore
http://localhost:5173/dao/FRAX
http://localhost:5173/dao/FRAX/proposal/101
```

---

## 团队与联系信息
0xLeap：yue22217@ruc.edu.cn
Wind：liujinming@dp.tech
Arya：yanyusucs@outlook.com
0xWz：1013674124@qq.com
