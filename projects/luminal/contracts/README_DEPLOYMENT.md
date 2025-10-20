# Privacy AMM 部署指南

## 快速开始

### 本地部署 (Anvil)

```bash
# 1. 启动 Anvil
anvil

# 2. 部署合约
./script/DeployLocal.sh

# 或使用 forge 命令
forge script script/Deploy.s.sol:DeployScript \
    --rpc-url http://localhost:8545 \
    --broadcast \
    -vvv
```

### 测试网部署 (Sepolia)

```bash
# 1. 配置环境变量
cp .env.example .env
# 编辑 .env 设置 PRIVATE_KEY 和 SEPOLIA_RPC_URL

# 2. 部署
source .env
forge script script/Deploy.s.sol:DeployScript \
    --rpc-url $SEPOLIA_RPC_URL \
    --broadcast \
    --verify \
    -vvv
```

## 部署内容

部署脚本会按顺序部署：

1. MockWETH - Mock Wrapped Ether (18 decimals)
2. MockUSDC - Mock USD Coin (6 decimals)
3. Groth16Verifier - ZK 证明验证器
4. GlobalVault - 隐私金库 (基于 Merkle 树)
5. PrivacyAMM - 隐私 AMM

然后执行：
- 配置 Vault 的 AMM 地址
- 初始化池子 (10 WETH + 20,000 USDC)
- 铸造测试代币 (100 WETH + 100,000 USDC)

## 验证部署

```bash
# 检查代币
cast call $WETH_ADDRESS "name()(string)" --rpc-url $RPC_URL

# 检查 Vault 状态
cast call $VAULT_ADDRESS "currentRoot()(bytes32)" --rpc-url $RPC_URL

# 检查 AMM 配置
cast call $AMM_ADDRESS "vault()(address)" --rpc-url $RPC_URL
```

## 环境变量

部署后保存合约地址到 `.env`:

```bash
WETH_ADDRESS=0x...
USDC_ADDRESS=0x...
VERIFIER_ADDRESS=0x...
VAULT_ADDRESS=0x...
AMM_ADDRESS=0x...
```
