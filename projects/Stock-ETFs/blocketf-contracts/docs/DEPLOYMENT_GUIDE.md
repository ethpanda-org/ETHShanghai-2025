# BlockETF 部署指南 - BNB Testnet

本指南将帮助你将 BlockETF 系统部署到 BNB Testnet。

## 前置要求

### 1. 环境准备

- ✅ 已安装 Foundry (forge, cast, anvil)
- ✅ Node.js 和 npm (可选，用于额外工具)
- ✅ Git

### 2. 获取 BNB Testnet 测试币

你需要 tBNB 来支付 gas 费用：

**官方水龙头**
- 访问: https://www.bnbchain.org/en/testnet-faucet
- 连接你的钱包
- 请求测试 BNB (每24小时可领取 0.5 tBNB)

### 3. 获取 BscScan API Key

用于合约验证：

1. 访问 https://bscscan.com/myapikey
2. 注册/登录账号
3. 创建新的 API Key
4. 保存 API Key 用于后续配置

## 部署步骤

### Step 1: 配置环境变量

1. 复制环境变量模板：
```bash
cp .env.example .env
```

2. 编辑 `.env` 文件，填入以下信息：

```bash
# 你的部署私钥 (不要包含 0x 前缀)
PRIVATE_KEY=your_private_key_here

# BNB Testnet RPC (默认已配置)
BNB_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545/

# BscScan API Key
BSCSCAN_API_KEY=your_bscscan_api_key_here
```

⚠️ **安全提示**:
- 永远不要提交 `.env` 文件到 Git
- 使用专门的测试钱包，不要使用主网钱包
- 确保私钥安全

### Step 2: 验证配置

检查你的部署地址余额：

```bash
# 检查余额
cast balance <YOUR_ADDRESS> --rpc-url $BNB_TESTNET_RPC

# 应该显示大于 0 的值 (单位: wei)
# 建议至少有 0.1 tBNB (100000000000000000 wei)
```

### Step 3: 测试部署脚本

在实际部署前，先在本地模拟：

```bash
# 模拟部署 (不会实际发送交易)
forge script script/DeployBlockETF.s.sol --rpc-url bnb_testnet
```

检查输出，确保没有错误。

### Step 4: 执行部署

**重要**: 这将消耗真实的 tBNB 并部署合约到测试网。

```bash
# 执行部署
forge script script/DeployBlockETF.s.sol \
  --rpc-url bnb_testnet \
  --broadcast \
  --verify \
  -vvvv
```

参数说明：
- `--rpc-url bnb_testnet`: 使用 foundry.toml 中配置的 BNB Testnet RPC
- `--broadcast`: 实际广播交易到网络
- `--verify`: 自动验证合约 (需要 BSCSCAN_API_KEY)
- `-vvvv`: 显示详细日志

### Step 5: 保存部署地址

部署成功后，你会看到类似输出：

```
========================================
Deployment Summary
========================================
Network: BNB Testnet (Chain ID 97)
Deployer: 0x...

Core Contracts:
  BlockETFCore: 0x...
  ETFRebalancerV1: 0x...
  ETFRouterV1: 0x...
  PriceOracle: 0x...

Tokens:
  WBNB: 0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd
  BTCB: 0x...
  ETH: 0x...
  USDT: 0x...
========================================
```

**立即保存这些地址！** 将它们添加到你的 `.env` 文件：

```bash
# 部署的合约地址
BLOCK_ETF_CORE=0x...
ETF_REBALANCER_V1=0x...
ETF_ROUTER_V1=0x...
PRICE_ORACLE=0x...

# Token 地址
BTCB=0x...
ETH=0x...
USDT=0x...
```

### Step 6: 验证合约 (如果自动验证失败)

如果 `--verify` 标志没有成功验证合约，手动验证：

```bash
# 生成验证命令
forge script script/VerifyContracts.s.sol

# 然后按照输出的命令逐个验证合约
```

或者手动验证每个合约：

```bash
# 验证 BlockETFCore
forge verify-contract \
  --chain-id 97 \
  --watch \
  --etherscan-api-key $BSCSCAN_API_KEY \
  --verifier-url https://api-testnet.bscscan.com/api \
  $BLOCK_ETF_CORE \
  src/BlockETFCore.sol:BlockETFCore

# 验证 PriceOracle
forge verify-contract \
  --chain-id 97 \
  --watch \
  --etherscan-api-key $BSCSCAN_API_KEY \
  --verifier-url https://api-testnet.bscscan.com/api \
  $PRICE_ORACLE \
  src/PriceOracle.sol:PriceOracle

# 其他合约类似...
```

## 部署后验证

### 1. 在 BscScan 上查看

访问 BNB Testnet BscScan: https://testnet.bscscan.com

搜索你的合约地址，验证：
- ✅ 合约代码已验证 (绿色勾选标记)
- ✅ 合约余额正确
- ✅ 交易历史可见

### 2. 测试基本功能

使用 `cast` 命令测试合约：

```bash
# 检查 ETF 名称
cast call $BLOCK_ETF_CORE "name()(string)" --rpc-url bnb_testnet

# 检查 ETF 符号
cast call $BLOCK_ETF_CORE "symbol()(string)" --rpc-url bnb_testnet

# 检查资产数量
cast call $BLOCK_ETF_CORE "getAssetCount()(uint256)" --rpc-url bnb_testnet

# 检查总价值
cast call $BLOCK_ETF_CORE "getTotalValue()(uint256)" --rpc-url bnb_testnet
```

### 3. 测试 Mint 功能

准备一些测试 token，然后尝试 mint：

```bash
# 1. 授权 mock tokens 给 Router
cast send $USDT "approve(address,uint256)" $ETF_ROUTER_V1 1000000000000000000000 \
  --rpc-url bnb_testnet \
  --private-key $PRIVATE_KEY

# 2. 使用 Router mint ETF shares
cast send $ETF_ROUTER_V1 "mintWithUSDT(uint256,uint256,uint256)" \
  1000000000000000000000 \
  0 \
  <DEADLINE_TIMESTAMP> \
  --rpc-url bnb_testnet \
  --private-key $PRIVATE_KEY
```

### 4. 监控部署

- 检查 gas 使用情况
- 验证所有交易成功
- 确认合约状态正确

## 部署后配置检查清单

- [ ] 所有合约已部署并验证
- [ ] 合约地址已保存到 `.env`
- [ ] BlockETFCore 已正确初始化
- [ ] Rebalancer 已设置
- [ ] Price Oracle 价格已设置
- [ ] 权限配置正确
- [ ] 基本功能测试通过
- [ ] BscScan 上合约代码已验证

## 故障排除

### 问题 1: Gas 不足

```
Error: insufficient funds for gas * price + value
```

**解决方案**: 从水龙头获取更多 tBNB

### 问题 2: Nonce 太低

```
Error: nonce too low
```

**解决方案**:
```bash
# 重置 nonce
cast nonce <YOUR_ADDRESS> --rpc-url bnb_testnet
```

### 问题 3: 合约验证失败

```
Error: Failed to verify contract
```

**解决方案**:
1. 等待几分钟后重试
2. 检查 BSCSCAN_API_KEY 是否正确
3. 使用手动验证命令

### 问题 4: RPC 连接超时

**解决方案**:
尝试其他 RPC endpoints:
- https://data-seed-prebsc-2-s1.binance.org:8545/
- https://data-seed-prebsc-1-s2.binance.org:8545/

## 下一步

部署成功后：

1. **功能测试**: 执行完整的功能测试
2. **集成测试**: 测试与 PancakeSwap 的集成
3. **前端集成**: 将合约地址配置到前端应用
4. **监控设置**: 设置监控和告警
5. **文档更新**: 更新相关文档

## 重要链接

- BNB Testnet Explorer: https://testnet.bscscan.com
- BNB Testnet Faucet: https://www.bnbchain.org/en/testnet-faucet
- PancakeSwap Testnet: https://pancakeswap.finance/?chainId=97
- BscScan API: https://docs.bscscan.com/

## 支持

如遇到问题：
1. 检查日志和错误信息
2. 查看 BscScan 上的交易详情
3. 参考 Foundry 文档: https://book.getfoundry.sh/
4. 参考 BNB Chain 文档: https://docs.bnbchain.org/

---

**最后更新**: 2025-10-02
