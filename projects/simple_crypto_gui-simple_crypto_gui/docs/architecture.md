# 系统架构设计 / System Architecture Design

## 核心架构原则 / Core Architecture Principles

本项目采用完全去中心化的架构设计，用户仅需访问一次网站获取所需的可执行代码，后续所有操作都直接连接区块链节点进行。
This project adopts a completely decentralized architecture design. Users only need to visit the website once to obtain the required executable code, and all subsequent operations are performed by directly connecting to blockchain nodes.

## 去中心化特点 / Decentralization Features

- **代码分发一次性**：用户首次访问网站时下载完整的前端应用代码 / **One-time Code Distribution**: Users download the complete frontend application code when first visiting the website
- **直接区块链交互**：应用在本地运行时直接与区块链节点建立连接 / **Direct Blockchain Interaction**: The application establishes connections directly with blockchain nodes when running locally
- **无中心化服务器依赖**：不依赖中心化后端服务处理用户请求 / **No Centralized Server Dependency**: Does not rely on centralized backend services to process user requests
- **数据存储在链上**：所有关键数据存储在区块链上，确保匿名性，透明性和不可篡改性 / **On-chain Data Storage**: All critical data is stored on the blockchain, ensuring anonymity, transparency and immutability