# SBT 和代币支付集成指南

## 概述

本项目实现了两个核心区块链功能：
1. **SBT（Soulbound Token）账号绑定** - 用户身份认证
2. **ERC20 代币支付** - 产品购买系统

## 1. SBT 账号绑定

### 功能说明
- SBT 是不可转移的 NFT，用于永久绑定用户身份
- 每个钱包地址只能铸造一个 SBT
- SBT 包含用户名和元数据信息

### 合约接口

\`\`\`solidity
// 铸造 SBT
function mint(address to, string memory username, string memory metadataURI) external returns (uint256)

// 检查是否拥有 SBT
function hasSBT(address owner) external view returns (bool)

// 获取用户信息
function getUserInfo(address owner) external view returns (UserInfo memory)
