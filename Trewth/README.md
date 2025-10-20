# The Trewth - ETHShanghai 2025


## 一、提交物清单 (Deliverables)

- [x] GitHub 仓库（公开或临时私有）：包含完整代码与本 README
- [x] Demo 视频（≤ 3 分钟，中文）：展示核心功能与流程
- [x] 在线演示链接（如有）：前端 Demo 或后端 API 文档
- [ ] 合约部署信息（如有）：网络、地址、验证链接、最小复现脚本
- [ ] 可选材料：Pitch Deck（不计入评分权重）

## 二、参赛队伍填写区 (Fill-in Template)

### 1) 项目概述 (Overview)

- **项目名称**：The Trewth
- **一句话介绍**：将信息代币化的 Layer 1
- **目标用户**：信息发布者 价值投资者 AI Agent开发者
- **核心问题与动机（Pain Points）**：
- 1. 信息过载与低质信息干扰。
- 2. 信息真实性难以验证。 
- 3. 用现有信息做预测市场。
- **解决方案（Solution）**：
- 1. 信息代币化赋予信息价值，先投入注意力的人能够有极大激励。 
- 2. 使用多个Agent来标准一个数据以防止Prompt Injection Attack。 
- 3. 构建去中心化AI Agent让多AI Agent来做预测市场结果检验。

### 2) 架构与实现 (Architecture & Implementation)

- **总览图（可贴图/链接）**
![TokenLaunch.png](TheTrewth%2Fdocs%2FTokenLaunch.png)
![Swap.png](TheTrewth%2Fdocs%2FSwap.png)
![CoinMonitor.png](TheTrewth%2Fdocs%2FCoinMonitor.png)
![Agent.png](TheTrewth%2Fdocs%2FAgent.png)

- **关键模块**：
  - 前端：React
  - 后端：Flask
  - 合约：Solidity
  - 其他：Avalanche（用于快捷搭建L1），RisingWave（用作Oracle的数据存储）
- **依赖与技术栈**：
  - 前端：React
  - 后端：Flask
  - 合约：Solidity, Foundry
  - 部署：Avalanche L1（本地链）

### 3) 合约与部署 (Contracts & Deployment)（如有）

- **此处比较复杂，需要先部署本地链，后安装Foundry框架，然后分别部署PoolManager等多个合约，如果需要demo请联系我: telgram: @EugeneWill Twitter: @_CryptoSift**

### 4) 运行与复现 (Run & Reproduce)

- **前置要求**：Node 18+, pnpm, Git
  - 前端：Node.js >= 14.0.0, npm >= 6.0.0
  - 后端：Python 3.8+, pip，Flask


- **环境变量样例**：

```bash
# 此处需要先部署RisingWave和本地Avalanche链
# 如果需要demo请联系我: telgram: @EugeneWill Twitter: @_CryptoSift
rw_url = ""
RPC_URL = ''
POOL_MANAGER_ADDRESS = ""
SWAP_ROUTER = ''
ENENT_ROUTER_ADDRESS = ""
```

- **一键启动（本地示例）**：

**对于前端**

```bash
npm install
```

### 启动开发服务器

```bash
npm start
```
******
**对于后端**
```bash
pip3 install -r ./TheTrewth/backend/requirements.txt
```

```bash
python3 ./TheTrewth/backend/app.py
```


- **在线 Demo（如有）**：https://drive.google.com/file/d/1Jm_ZG1mBSICealRmsfBk5ZK5aK2P4v9w/view
- **账号与测试说明（如需要）**：[测试账号信息]

### 5) Demo 与关键用例 (Demo & Key Flows)

- **视频链接（≤3 分钟，中文）**：https://drive.google.com/file/d/1Jm_ZG1mBSICealRmsfBk5ZK5aK2P4v9w/view
- **关键用例步骤（2-4 个要点）**：
  - 用例 1：用户在 Event Token Launch页面填写事件代币的基本信息并进行签名并少量转账TRTH代币即可一键创建事件代币。
  - 用例 2：用户在 Event Token Trading 选择页面选择想要交易的token即可观察起详细信息并交易。
  - 用例 3：用户在发射或交易某个代币后，随着代币池中的TRTH的数量变多，该事件代币会出现在 Event Coin Pool Monitor 页面的排行中。
  - 用例 4：用户可以在AI Agent页面查看代币分析，并可进行一键交易。


### 6) 可验证边界 (Verifiable Scope)

- **如未完全开源，请在此明确**：
  - 哪些模块可复现/可验证：前端交互部分以及后端oracle数据处理模块部分
  - 哪些模块暂不公开及原因：合约部分，如果暴露ABI用户将能够自定义调用合约设置一个超大的初始池，会导致买个代币的市场注意力突然拉高

### 7) 路线图与影响 (Roadmap & Impact)

- **赛后 1-3 周**：完善项目主要feature，并制作deck
- **赛后 1-3 个月**：尝试推广项目
- **预期对以太坊生态的价值**：
  - 1. 提供一个新的信息发布与验证的范式，提升信息质量。
  - 2. 促进去中心化AI Agent的发展与应用。
  - 3. 丰富以太坊生态中的信息经济与预测市场。

### 8) 团队与联系 (Team & Contacts)

- **团队名**：The Trewth Team
- **成员与分工**：
  - 蟹一丹 - 产品 - 负责整体需求分析与用例分析
  - Eugene - 技术负责人 - 后端、合约开发与架构设计、与Oracle搭建
  - Hayden - 前端工程师 - 前端开发与UI设计
- **联系方式（Email/TG/X）**：telgram: @EugeneWill Twitter: @_CryptoSift
- **可演示时段（时区）**：10:00 - 22:00 CST

## 三、快速自检清单 (Submission Checklist)

- [x] README 按模板填写完整（概述、架构、复现、Demo、边界）
- [ ] 本地可一键运行，关键用例可复现
- [ ] （如有）测试网合约地址与验证链接已提供
- [x] Demo 视频（≤3 分钟，中文）链接可访问
- [x] 如未完全开源，已在"可验证边界"清晰说明
- [x] 联系方式与可演示时段已填写

---

