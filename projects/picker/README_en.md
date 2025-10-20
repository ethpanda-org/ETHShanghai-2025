# Overview
 
## Project Name

Picker - AI Smart System

## One sentence introduction

Next-generation Web3 decentralized internet-based AI reliability and availability smart system.

Picker aims to provide local PC work, entertainment, and life management functions without a backend server for all internet users (ready-to-use out of the box). It leverages artificial intelligence technology to enhance system intelligence and user experience. Meanwhile, it offers dual payment agent storage that supports Web3 wallets and point transactions, as well as a download market for all types of task Agents in multiple languages (Python, NodeJS, Shellscript...). Additionally, it provides high-performance on-chain operations (Transfer, Balance, Token, NFT, any contract call, etc.) and is fully compatible with the MCP protocol (different from Eliza Plugins).

## Target Users

All internet users on desktop computers who need to work, live, or entertain themselves (including Web2 and Web3 users)

## Core Problems and Motivations (Pain Points):

1. Data privacy issues: Many backend services on the current internet collect users' personal data, and they operate on the cloud, which raises concerns about privacy leakage and data security.
   
2. Task execution issues: Users need to rely on third - party services to execute tasks, which increases the uncertainty and risk of task execution.
   
3. Ready - to - use issues: Various independent AI services require users to deploy complex backend servers or configure client environments (such as eliza, dify, n8n, etc.), which brings inconvenience to users.

## Solutions

1. Reliable data privacy with fully transparent agents. There is no backend privacy server, and users have complete control of their data locally. Transactions are recorded on the blockchain, with a fully transparent process and no potential commercial costs.
   
2. The entire task lifecycle is controllable. Users can upload custom agent tasks or download agent tasks from the market. There is no hallucination during task execution, and users can fully trust the task execution results.
   
3. Ready-to-use. Users don't need to install any software. They only need to download the Picker application to start using it.

# Architecture & Implementation

## Overview Diagram (Images/Links can be pasted):

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

## Key Modules

- Frontend: Tauri2.0 + React19 + TypeScript + Vite, desktop application, providing user interfaces, interaction logic, etc.
- Backend: Rust Axum + Sqlite3, implementing a dual transaction system (Web3 wallet, point transactions), user authentication, and functions such as downloading and uploading from the agents cloud storage market.
- Smart Contracts: Solidity + Hardhat3, implementing second - level authorization payment contracts, agents data verification, fund management, etc.
- AI Agent Framework: Rust + Tokio + OpenAI Compatible API, implementing a high - performance Web3 AI Agent framework, tool calling (MCP protocol), ReAct (Reasoning and Acting), conversation memory, and integration of large language model interfaces.
- Example Apps: Example applications in Node.js, Python, PowerShell, Bash shell, etc., demonstrating framework usage and providing development templates.
- On-chain Capability MCP Server: Implementing on-chain operations (Transfer Token, Check Balance, Issue Token, Issue NFT, Cross-chain Swap, etc.), fully compatible with the MCP protocol.

## For ETHShanghai 2025 hackathon

Rust Backend Server, User data flow, Web3 and Point payment, market cloud storage hosting, Integration:

[Code location](./server)

Second level authorization payment contract, and ERC Factory contract:

[Code location](./contract)

Customize AI Agent for Web3:

[Code location](./rust-agent-crate)

Desktop client, Local tasks, Chatbot, Market entrance, user page, contract call entrance:

[Code location](./desktop)

Chain capability mcp server, transfer, balance, publish token, issue nft, cross chain swap:

[Code location](./chain-capability-mcp-server)

Example apps, agent task template:

[Code location](./apps)

## Dependencies and Technology Stack

- Frontend: Windows, MacOS, Linux desktop systems, etc.
- Backend: Any web server or run locally
- Smart Contracts: Sepolia test network
- AI Agent: Fully adapted and compatible, no need to enable separately
- On-chain Capability MCP Server: Run locally, communicate with the frontend ChatBot via JSON-RPC 2.0
- Example Apps: Tasks can be created directly on the client side and are ready to use

## Contracts & Deployment

- Network: Sepolia test network
- Authorized Second-level Transaction Contract: 0x1B0b2ef32Eba0Aa15B123633e2145D708eD2C5E9
- ERC20 Factory Contract: 0x9712C7792fF62373f4ddBeE53DBf9BeCB63D80dB
- ERC721 Factory Contract: 0xDc49Fe683D54Ee2E37459b4615DebA8dbee3cB9A

## Verification Links (Etherscan/BlockScout)

- Authorized Second-level Transaction Contract: https://sepolia.etherscan.io/address/0x1B0b2ef32Eba0Aa15B123633e2145D708eD2C5E9#code
- ERC20 Factory Contract: https://sepolia.etherscan.io/address/0x9712C7792fF62373f4ddBeE53DBf9BeCB63D80dB#code
- ERC721 Factory Contract: https://sepolia.etherscan.io/address/0xDc49Fe683D54Ee2E37459b4615DebA8dbee3cB9A#code

## Minimum Reproduction Script

```Solidity
# deploy contract
npx hardhat ignition deploy --network customize ignition/modules/PickerPayment.ts
npx hardhat ignition deploy --network customize ignition/modules/ERC20Factory.ts
npx hardhat ignition deploy --network customize ignition/modules/ERC721Factory.ts

# running and testing
npx hardhat test solidity
npx hardhat test nodejs
```

## Run & Reproduce

- Prerequisites: Node 22+, npm, Git, Cargo Rust 1.89+, Tauri2.0, Hardhat 3.0, OpenAI compatible API URL and Key
- Environment Variables Sample:

backend: ./server/config.toml

frontend: Default values are already built into the code

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

- One-click Start (Local Example):

```PowerShell
# Start the backend service
cd server
cargo run

# Start the mcp server
cd chain-capability-mcp-server
cargo run

# Start the client application
cd desktop
npx tauri dev
```

- Account and Test Instructions:

Username: testdata@openpick.org

Password: testpassword

# Demo & Key Flows
                                                                                                                                        
- Video link (≤ 3 minutes, in Chinese): [Video Link]
- Key use case steps (2-4 points):
    - Create and run local tasks: Observe the running status and the output of task log levels
    - Interact with agents using Chatbot: Run local and default tasks, and perform on-chain operations (such as Transfer, Balance check, Token issuance, NFT minting, cross-chain Swap, etc.)
    - Agent task market operations: Users register and log in to the server, upload and download agent tasks, and call smart contracts for authorization

# Verifiable Scope

The frontend, backend, Rust Agent framework, on-chain capability MCP Server, etc. are all open-source.

# Roadmap & Impact

- 1-3 weeks after the hackathon: The PC store can be launched immediately or a self-built official website can be set up. The official website has been completed at https://www.openpick.org/
- 1-3 months after the hackathon: Improve the registration mechanism of the task market, optimize the AI Agent framework, complete more example applications of agent tasks, and provide more on-chain contract capability interfaces
- Expected value to the Ethereum ecosystem: Make Ethereum truly integrate into the daily work, life, and entertainment of ordinary internet users

# Team & Contacts

- Team name: Picker
- Team members and their responsibilities:
    - Deporter - Technology - Project architecture, technical implementation, product optimization, and implementation of the AI Smart system
    - DBSAN    - Marketing - Product commercialization, market planning, and promotion
- Contact information (Email/TG/X): aiqubit@hotmail.com/aiqubits/ai_qubit
- Available demonstration time slots (time zone): 10:00 - 18:00 UTC+8
