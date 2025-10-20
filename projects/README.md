# ETHcli - ETHShanghai 2025

[![ETHShanghai 2025](https://img.shields.io/badge/ETHShanghai-2025-blue)](https://github.com/ethpanda-org/ETHShanghai-2025)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 一、提交物清单 (Deliverables)

- ✅ **GitHub 仓库**：https://github.com/xyl2004/ETHShanghai-2025
- 📹 **Demo 视频**：https://youtu.be/gdHK_l8bFFA
- 🌐 **在线演示链接**：N/A（本地CLI应用）
- 📜 **合约部署信息**：N/A（无需部署智能合约）
- 📊 **可选材料**：完整技术架构图见下文

---

## 二、参赛队伍填写区 (Fill-in Template)

### 1) 项目概述 (Overview)

**项目名称**：ETHcli

**一句话介绍**：基于 AI 和 MCP 协议的智能以太坊命令行工具，通过自然语言实现与区块链的无缝交互。

**目标用户**：
- 区块链开发者：快速查询链上数据、调试合约、监控Gas费用
- DeFi 用户：查询代币余额、价格、转账记录
- NFT 收藏者：查看持有的NFT资产和元数据
- Web3 研究人员：批量分析链上数据和交易模式

**核心问题与动机（Pain Points）**：
1. **学习曲线陡峭**：传统区块链交互需要掌握复杂的命令行工具（如 `cast`、`ethers-cli`）和 JSON-RPC API
2. **多链切换繁琐**：不同链之间的切换需要修改配置文件或记忆不同的网络参数
3. **数据查询困难**：查询代币价格、NFT元数据、历史交易等需要访问多个不同的平台和API
4. **缺乏智能化**：现有工具无法理解自然语言意图，用户需要记忆精确的命令格式

**解决方案（Solution）**：
ETHcli 是一个革命性的 AI 驱动的区块链命令行工具，具有以下特点：
- 🤖 **自然语言交互**：用户只需输入"查询 ETH 价格"或"我的钱包有多少 USDC"，AI 自动理解意图并执行
- 🔗 **多链统一接口**：支持 Ethereum、Polygon、Base、Arbitrum、Optimism 等多条链，一个命令搞定所有网络
- 🎨 **丰富功能集成**：代币价格、余额查询、交易历史、NFT查看、Gas监控、合约交互等一站式解决
- 🏗️ **创新架构**：首个将 MCP（Model Context Protocol）应用于区块链领域的项目，采用 Rust + Python + Node.js 三层架构

### 2) 架构与实现 (Architecture & Implementation)

**总览图**：

```
┌─────────────────────────────────────────────────────────────┐
│                        ETHcli 架构                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │         Layer 1: Terminal UI (Rust)                 │    │
│  │  • ratatui: 终端UI框架                              │    │
│  │  • crossterm: 跨平台终端控制                        │    │
│  │  • gRPC Client: 与AI Agent通信                      │    │
│  └──────────────────┬─────────────────────────────────┘    │
│                     │ gRPC Protocol                         │
│                     ↓                                        │
│  ┌────────────────────────────────────────────────────┐    │
│  │       Layer 2: AI Agent (Python)                    │    │
│  │  • Google Gemini 2.5: 自然语言理解                  │    │
│  │  • MCP Client: 调用MCP工具                          │    │
│  │  • gRPC Server: 接收CLI请求                         │    │
│  └──────────────────┬─────────────────────────────────┘    │
│                     │ MCP Protocol (stdio)                  │
│                     ↓                                        │
│  ┌────────────────────────────────────────────────────┐    │
│  │      Layer 3: MCP Server (Node.js/TypeScript)       │    │
│  │  • Alchemy SDK: 区块链数据API                       │    │
│  │  • 代币价格、余额、交易历史                         │    │
│  │  • NFT查询、Gas费用、合约数据                       │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**关键模块**：

1. **前端 CLI (evm-cli/)**：
   - 语言：Rust
   - UI 框架：ratatui (终端用户界面)
   - 网络：tonic (gRPC 客户端)
   - 功能：实时聊天界面、流式响应展示、历史记录管理

2. **AI Agent (agent-evm/)**：
   - 语言：Python 3.12+
   - AI 模型：Google Gemini 2.5
   - MCP 集成：mcp、google-genai 库
   - 功能：自然语言理解、工具调用、智能响应生成

3. **MCP Server (evm-mcp/)**：
   - 语言：TypeScript/Node.js
   - 区块链 SDK：Alchemy SDK
   - 功能：提供 17+ MCP 工具（代币价格、余额、交易、NFT等）

**依赖与技术栈**：

- **CLI 层**：
  - Rust 1.75+
  - ratatui 0.29+, crossterm 0.28+
  - tonic (gRPC), tokio (异步运行时)

- **AI Agent 层**：
  - Python 3.12+
  - google-genai, mcp
  - grpcio, asyncio

- **MCP Server 层**：
  - Node.js 18+, TypeScript
  - Alchemy SDK
  - MCP Protocol

- **部署**：
  - 本地运行，无需云服务器
  - 支持 macOS、Linux、Windows

### 3) 合约与部署 (Contracts & Deployment)

**说明**：ETHcli 是一个纯客户端工具，不涉及智能合约部署。所有区块链交互通过 Alchemy API 完成。

### 4) 运行与复现 (Run & Reproduce)

**前置要求**：
- Rust 1.75+ (安装：`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`)
- Python 3.12+ (推荐使用 pyenv)
- Node.js 18+ 和 npm
- Git

**环境变量样例**：

在 `projects/ETHcli/agent-evm` 目录下创建 `.env` 文件：

```bash
# .env
GOOGLE_API_KEY=your_google_gemini_api_key
ALCHEMY_API_KEY=9FIy7L0mx0c7ZhSAOmpWwrUKPAaKADjm  # 已提供测试密钥
ETHERSCAN_API_KEY=4YRX5THU4G82CC561PDEFN9IRWIYPVTI72  # 已提供测试密钥
```

**一键启动（本地示例）**：

```bash
# 克隆仓库
git clone https://github.com/xyl2004/ETHShanghai-2025.git
cd ETHShanghai-2025

# 进入项目目录
cd projects/ETHcli

# 步骤 1: 配置环境变量
cd agent-evm
cat > .env << EOF
GOOGLE_API_KEY=your_google_api_key
ALCHEMY_API_KEY=9FIy7L0mx0c7ZhSAOmpWwrUKPAaKADjm
ETHERSCAN_API_KEY=4YRX5THU4G82CC561PDEFN9IRWIYPVTI72
EOF

# 步骤 2: 安装 MCP Server 依赖并构建
cd ../evm-mcp
npm install
npm run build

# 步骤 3: 安装 Python Agent 依赖
cd ../agent-evm
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# 步骤 4: 启动 CLI（会自动启动 AI Agent）
cd ../evm-cli
cargo run --release

# 或使用已编译的二进制（如提供）
# ./evm-cli
```

**快速测试命令**：

启动后，在 CLI 中输入以下命令测试功能：
```
> 查询 BTC 和 ETH 的当前价格
> 查看地址 vitalik.eth 的余额
> 查询最近的 ETH 转账记录
> 查看我的 NFT 收藏
```

**在线 Demo**：N/A（本地应用）

**账号与测试说明**：
- 无需注册账号
- 可使用任意以太坊地址进行查询
- 推荐测试地址：`vitalik.eth` 或 `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045`

### 5) Demo 与关键用例 (Demo & Key Flows)

**视频链接（≤3 分钟，中文）**：[待上传]

**关键用例步骤**：

1. **用例 1：代币价格查询**
   - 输入："查询 BTC、ETH、USDT 的价格"
   - AI 理解意图 → 调用 `fetchTokenPriceBySymbol` MCP 工具
   - 返回实时价格数据（含市值、24h涨跌幅）

2. **用例 2：多链钱包余额查询**
   - 输入："查看 vitalik.eth 在以太坊和 Polygon 上的代币余额"
   - AI 识别地址和网络 → 调用 `fetchTokensOwnedByMultichainAddresses` 工具
   - 展示所有代币余额和美元价值

3. **用例 3：NFT 收藏查看**
   - 输入："我想看看地址 0xd8dA6BF... 持有哪些 NFT"
   - AI 调用 `fetchNftsOwnedByMultichainAddresses` 工具
   - 显示 NFT 列表（含名称、图片、属性）

4. **用例 4：交易历史分析**
   - 输入："查询这个地址最近 10 笔交易"
   - AI 调用 `fetchAddressTransactionHistory` 工具
   - 展示交易详情（时间、金额、对手方、状态）

### 6) 可验证边界 (Verifiable Scope)

**完全开源**：本项目所有代码均已开源，无商业保密内容。

**可复现/可验证的模块**：
- ✅ Rust CLI：完整源码在 `projects/ETHcli/evm-cli/`
- ✅ Python AI Agent：完整源码在 `projects/ETHcli/agent-evm/`
- ✅ Node.js MCP Server：完整源码在 `projects/ETHcli/evm-mcp/`
- ✅ 所有依赖均为公开可用的库
-

**暂不公开的模块**：无

**验证方法**：
1. 按照"运行与复现"步骤执行
2. 所有功能均可在本地环境中测试
3. 可通过修改源码验证架构和实现逻辑

### 7) 路线图与影响 (Roadmap & Impact)

**赛后 1-3 周**：
- [ ] 优化 AI 响应速度和准确性
- [ ] 添加更多 MCP 工具（DeFi 协议集成、Gas优化建议）
- [ ] 完善文档和使用指南

**赛后 1-3 个月**：
- [ ] 支持本地钱包管理（私钥签名、交易发送）
- [ ] 集成更多 AI 模型（Claude、GPT-4）
- [ ] 开发 Web 版本（基于 WebAssembly）
- [ ] 社区驱动的插件系统（让开发者贡献自定义 MCP 工具）
- [ ] 多语言支持（英文、日文等）

**预期对以太坊生态的价值**：
1. **降低入门门槛**：新用户无需学习复杂命令即可使用区块链
2. **提升开发效率**：开发者可快速查询链上数据，无需切换多个工具
3. **推广 MCP 协议**：首个区块链领域的 MCP 应用，为社区提供参考实现
4. **促进 AI × Web3 融合**：展示 AI 在区块链工具中的实际价值
5. **开源贡献**：作为教学案例帮助更多开发者学习 Rust、AI 和区块链集成

### 8) 团队与联系 (Team & Contacts)

**团队名**：xyl2004

**成员与分工**：
- **xyl2004** - 后端开发 - MCP Server 开发、AI Agent 集成、区块链 API 对接、项目架构设计
- **GUxxxx** - 前端开发 - Rust CLI 图形化界面设计与实现、用户体验优化

**联系方式**：
- **Email**: xyl17710192416@outlook.com
- **GitHub**: https://github.com/xyl2004 

**可演示时段（时区）**：
- 工作日：UTC+8 18:00-22:00
- 周末：UTC+8 10:00-22:00
- 可根据评审需求灵活调整

---

## 三、快速自检清单 (Submission Checklist)

- ✅ README 按模板填写完整（概述、架构、复现、Demo、边界）
- ✅ 本地可一键运行，关键用例可复现
- ✅ 无需测试网合约（纯客户端应用）
- ⏳ Demo 视频（≤3 分钟，中文）待录制上传
- ✅ 完全开源，已在"可验证边界"清晰说明
- ✅ 联系方式与可演示时段已填写

---

## 🎯 技术亮点总结

1. **创新性**：首个将 MCP 协议应用于区块链交互的 AI Agent 系统
2. **架构创新**：Rust + Python + Node.js 三层解耦设计，各层可独立演进
3. **用户体验**：自然语言交互，零学习成本
4. **技术深度**：涉及 AI、区块链、分布式协议、异步编程等多个领域
5. **社区价值**：完整开源，可作为 AI × Web3 项目的参考实现

---

**Built with ❤️ for ETHShanghai 2025**

**License**: MIT
