# 项目概述 (Overview)
 
## 项目名称

Picker - AI Smart System

## 一句话介绍

下一代 Web3 去中心化互联网中基于 AI 的可靠性和可用性智能系统

Picker 旨在为所有互联网用户提供无后台服务器的本地 PC 工作、娱乐和生活管理功能（开盒即用）。它利用人工智能技术增强系统智能和用户体验，同时提供支持 Web3 钱包和积分交易的双支付代理存储以及多语言（Python, NodeJS, Shellscript...）全类型的任务 Agents 下载市场，并且提供高性能的链上操作（Transfer, Balance, Token, NFT, 任一合约调用等），完全兼容 MCP 协议（区别于Eliza Plugins）

## 目标用户

所有电脑端前，需要工作、生活、娱乐的互联网用户（包括 Web2 和 Web3 用户）

## 核心问题与动机（Pain Points）：

1. 数据隐私问题：当前互联网上的许多后台服务都收集用户个人数据，以及服务运行所在云端，这引发了隐私泄露和数据安全问题。
   
2. 任务执行问题：用户需要依赖第三方服务执行任务，这增加了任务执行的不确定性和风险。
   
3. 开盒即用问题：各种独立 AI 服务需要用户部署复杂的后台服务器或客户端配置环境等（比如 eliza, dify, n8n 等），这给用户带来了不便。

## 解决方案（Solution）

1. 数据隐私可靠，全透明 agents，无后台隐私服务器，用户数据完全掌握在本地。交易上链，过程全透明，无潜在商业成本。
   
2. 任务全周期可控，用户可以上传自定义 agent 任务，也可以从市场下载 agent 任务，任务执行过程不存在幻觉，用户可以完全信任任务执行结果。
   
3. 开盒即用，用户无需安装任何软件，只需下载 Picker 应用即可开始使用。

# 架构与实现 (Architecture & Implementation)

## 总览图（可贴图/链接）：

![picker-arch.png](demo%2Fpicker-arch.png)

![picker-userflow.png](demo%2Fpicker-userflow.png)

## Demo 视频

<video width="100%" controls>
    <source src="https://cloud.video.taobao.com/vod/EIhjrymGnXkr9GlSm38TMuYD41QzzUIt4LEM5vIXn84.mp4" type="video/mp4">
    您的浏览器不支持HTML5视频标签
</video>

[Picker Demo Video](https://cloud.video.taobao.com/vod/EIhjrymGnXkr9GlSm38TMuYD41QzzUIt4LEM5vIXn84.mp4)

## PPT

https://picker-eth-ppt.vercel.app/1

## 关键模块

- 前端：Tauri2.0 + React19 + TypeScript + Vite, desktop application，提供用户界面、交互逻辑等。
- 后端：Rust Axum + Sqlite3，实现双交易系统（Web3钱包、积分交易）、用户认证、agents 网盘市场下载上传等功能。
- 智能合约：Solidity + Hardhat3，实现二级授权支付合约，agents 数据验证，资金管理等。
- AI Agent 框架：Rust + Tokio + OpenAI Compatible API，实现 Web3 高性能 AI Agent 框架、工具调用（MCP 协议）、ReAct（Reasoning and Acting）、会话记忆（Memory），大语言模型接口集成等功能。
- Example Apps：Nodejs, Python, Powershell, Bashshell 等示例应用，演示框架用法，提供开发模板。
- 链上能力 MCP Server：实现链上操作（Transfer Token, Check Balance, 发布 Token, 发行 NFT, 跨链交易 Swap 等），完全兼容 MCP 协议。

## ETHShanghai 2025 hackathon

Rust 后端服务器、用户数据流、Web3 和积分支付、市场云存储托管等集成：

[Code location](./server)

二级授权支付合约、ERC20 721 工厂合约：

[Code location](./contract)

为 Web3 实现的下一代 AI Agent框架：

[Code location](./rust-agent-crate)

桌面客户端、本地任务、Chatbot、agent 市场入口、用户页面、智能合约调用入口：

[Code location](./desktop)

链能力 MCP 服务器，transfer, balance, publish token, issue nft, cross chain swap:

[Code location](./chain-capability-mcp-server)

示例应用程序，代理任务模板：

[Code location](./apps)

## 依赖与技术栈

- 前端：Windows，MacOS，Linux桌面系统等
- 后端：任意 Web 服务器，或本地运行
- 智能合约：Sepolia 测试网络
- AI Agent：已经实现完全适配与兼容，无需单独启用
- 链上能力 MCP Server：本地运行，与前端 ChatBot 通过 JSON-RPC 2.0 通信
- Example Apps：客户端创建任务，直接可用

## 合约与部署 (Contracts & Deployment)

- 网络：Sepolia 测试网络
- 授权二级交易合约：0x1B0b2ef32Eba0Aa15B123633e2145D708eD2C5E9
- ERC20工厂合约：0x9712C7792fF62373f4ddBeE53DBf9BeCB63D80dB
- ERC721工厂合约：0xDc49Fe683D54Ee2E37459b4615DebA8dbee3cB9A

## 验证链接（Etherscan/BlockScout）

- 授权二级交易合约：https://sepolia.etherscan.io/address/0x1B0b2ef32Eba0Aa15B123633e2145D708eD2C5E9#code
- ERC20工厂合约：https://sepolia.etherscan.io/address/0x9712C7792fF62373f4ddBeE53DBf9BeCB63D80dB#code
- ERC721工厂合约：https://sepolia.etherscan.io/address/0xDc49Fe683D54Ee2E37459b4615DebA8dbee3cB9A#code

## 最小复现脚本

```Solidity
# 部署合约
npx hardhat ignition deploy --network customize ignition/modules/PickerPayment.ts
npx hardhat ignition deploy --network customize ignition/modules/ERC20Factory.ts
npx hardhat ignition deploy --network customize ignition/modules/ERC721Factory.ts

# 运行测试
npx hardhat test solidity
npx hardhat test nodejs
```

## 运行与复现 (Run & Reproduce)

- 前置要求：Node 22+, npm, Git, Cargo Rust 1.89+, Tauri2.0, Hardhat 3.0, 
- 环境变量样例：

backend: ./server/config.toml

frontend: 已在代码中内置默认值

```
api_base_url = "http://127.0.0.1:3000"
request_timeout_ms = 30000
max_retries = 3
ai_api_url = "https://api.deepseek.com/v1"
ai_api_key = ""
ai_model = "deepseek-chat"

[blockchain]
rpc_url = "https://sepolia.infura.io/v3/7cb673f9a1324974899fc4cd4429b450"
explorer_url = "https://sepolia.etherscan.io"
wallet_private = ""
token_usdt_url = "https://www.okx.com/api/v5/market/ticker?instId=ETH-USDT"
# sepolia cross chain pay
usdt_contract_address = "0xd53e9530107a8d8856099d7d80126478d48e06dA"
meson_contract_address = "0x0d12d15b26a32e72A3330B2ac9016A22b1410CB6"
erc20_factory_address = "0x9712C7792fF62373f4ddBeE53DBf9BeCB63D80dB"
erc721_factory_address = "0xDc49Fe683D54Ee2E37459b4615DebA8dbee3cB9A"
```

- 一键启动（本地示例）：

```PowerShell
# 启动后端服务
cd server
cargo run

# 启动 mcp server
cd chain-capability-mcp-server
cargo run

# 启动客户端应用
cd desktop
npx tauri dev
```

- 账号与测试说明：

Username: testdata@openpick.org

Password: testpassword

# Demo 与关键用例 (Demo & Key Flows)

- 视频链接（≤3 分钟，中文）：[视频链接]
- 关键用例步骤（2-4 个要点）：
    - 创建并运行本地任务：观察运行状态，任务日志等级输出
    - 使用 Chatbot 与智能体交互：运行本地与默认任务，执行链上能力操作（如跨Transfer, Balance, 发布 Token, 发行 NFT, 跨链交易 Swap 等）
    - Agent任务市场操作：用户注册登录服务端，上传下载智能体任务，调用智能合约进行授权

# 可验证边界 (Verifiable Scope)

前端，后端，Rust Agent框架，链上能力 MCP Server等全部开源

# 路线图与影响 (Roadmap & Impact)

- 赛后 1-3 周：可立即上线 PC 商店或者自建官网，已完成官网搭建 https://www.openpick.org/
- 赛后 1-3 个月：完善任务市场注册机制，优化 AI Agent框架，完善更多智能体任务示例应用，提供更多链上合约能力接口
- 预期对以太坊生态的价值：让以太坊真正走进普通互联网用户的日常工作，生活，娱乐之中

# 团队与联系 (Team & Contacts)

- 团队名：Picker
- 成员与分工：
    - Deporter - 技术 - 项目架构，技术实现，产品优化，AI Smart 系统落地
    - DBSAN    - 市场 - 产品商业化，市场策划推广
- 联系方式（Email/TG/X）：aiqubit@hotmail.com/aiqubits/ai_qubit
- 可演示时段（时区）：UTC+8 10:00-18:00
