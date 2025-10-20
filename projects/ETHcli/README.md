# ETHShanghai 2025 - ETHcli 项目

[![ETHShanghai 2025](https://img.shields.io/badge/ETHShanghai-2025-blue)](https://github.com/ethpanda-org/ETHShanghai-2025)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🎯 项目简介

**ETHcli** 是一个基于AI和MCP协议的智能以太坊命令行工具，通过自然语言实现与区块链的交互。

本项目参加 **ETHShanghai 2025 黑客松 - AI × ETH 赛道**

## 📁 项目结构

```
ETHShanghai-2025/
├── projects/ETHcli/          # 项目主目录（符合比赛要求）
│   ├── README.md             # 详细项目文档
│   ├── evm-cli/              # Rust CLI（符号链接）
│   ├── agent-evm/            # Python AI Agent（符号链接）
│   └── evm-mcp/              # Node.js MCP Server（符号链接）
├── evm-cli/                  # Rust终端UI实现
├── agent-evm/                # AI代理实现
├── evm-mcp/                  # MCP服务器实现
└── README.md                 # 本文件
```

## 🚀 快速开始

详细的安装和使用说明请查看：**[projects/ETHcli/README.md](projects/ETHcli/README.md)**

### 一键启动

```bash
# 1. 配置环境变量（在agent-evm目录）
cd agent-evm
cat > .env << EOF
GOOGLE_API_KEY=your_google_api_key
ALCHEMY_API_KEY=9FIy7L0mx0c7ZhSAOmpWwrUKPAaKADjm
ETHERSCAN_API_KEY=4YRX5THU4G82CC561PDEFN9IRWIYPVTI72
EOF

# 2. 构建和运行
cd ../evm-mcp && npm install && npm run build && cd ..
cd agent-evm && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && cd ..
cd evm-cli && cargo run --release
```

## ✨ 核心功能

- 🤖 **AI驱动**：使用Google Gemini 2.5，自然语言交互
- 🔗 **多链支持**：Ethereum、Polygon、Base、Arbitrum、Optimism
- 💰 **代币查询**：价格、余额、历史数据
- 📊 **交易记录**：支持主网和测试网
- 📜 **合约交互**：ABI查询、源码查看、方法调用
- 🎨 **NFT查询**：查看持有的NFT及收藏
- ⛽ **Gas监控**：实时Gas价格和费用历史

## 🏆 技术亮点

1. **首个MCP + 区块链的AI代理系统**
2. **三层架构设计**：Rust UI + Python AI + Node.js Tools
3. **智能响应优化**：纯文本输出，用户友好
4. **完整的开源实现**：可作为社区参考

## 📺 Demo视频

**视频链接**：[待上传]

## 👥 团队

- **开发者**：xyl2004
- **GitHub**：https://github.com/xyl2004
- **联系方式**：可通过GitHub Issues联系

## 📄 License

MIT License

---

**Built with ❤️ for ETHShanghai 2025**

