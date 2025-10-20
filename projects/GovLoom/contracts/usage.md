## 使用说明

### 1. 安装依赖
- 运行 `npm install` 安装 Hardhat 与相关依赖。

### 2. 配置环境变量
- 将 `.env.example` 复制为 `.env`，填写：
  - `BSC_TESTNET_RPC_URL`：BSC Testnet RPC 节点地址。
  - `PRIVATE_KEY`：用于部署的测试网私钥（`0x` 开头）。
  - `BSCSCAN_API_KEY`：BscScan Testnet API Key，用于自动验证。
  - `BLOCK_CONFIRMATIONS`（可选）：部署后等待的区块确认数，默认为 5。
  - `STAKE_TOKEN_NAME`、`STAKE_TOKEN_SYMBOL`、`STAKE_TOKEN_SUPPLY`：质押代币参数。
  - `STAKE_REQUIREMENT`、`GATE_NFT_ADDRESS`：投票系统参数；`STAKE_TOKEN_ADDRESS`、`VOTING_SYSTEM_ADDRESS` 在部署后回填。
  - `PROPOSAL_METADATA_HASH`、`PROPOSAL_PRIVILEGED_ONLY`：创建提案脚本所需的元数据哈希及投票模式。

### 3. 合约编译与测试
- 编译：`npm run build`
- 测试：`npm test`
- 清理缓存：`npm run clean`

### 4. 部署流程
1. 确认 `.env` 中的代币/投票参数已填写。
2. 运行 `npm run deploy:stake -- --network bsctestnet`，部署完成后控制台会展示合约地址，同时提示等待确认与（若已配置 API Key）自动验证。
3. 将输出地址填入 `.env` 的 `STAKE_TOKEN_ADDRESS`。
4. 运行 `npm run deploy:voting -- --network bsctestnet`，部署完成后同样会输出地址与自动验证结果。
5. 将输出地址填入 `.env` 的 `VOTING_SYSTEM_ADDRESS`。

### 5. 手动验证（可选）
- 如果自动验证失败或稍后再验证，可在 `.env` 中确保 `STAKE_TOKEN_ADDRESS` / `VOTING_SYSTEM_ADDRESS` 已填入，然后运行：
  - `npm run verify:stake -- --network bsctestnet`
  - `npm run verify:voting -- --network bsctestnet`
  - `npm run verify:voting`
- 也可以通过 `--address 0x...` 传参覆盖 `.env` 中的地址。

### 6. 日常操作示例
- 创建提案：调用 `createProposal(metadataHash, privilegedOnly)`。
- 公共提案投票：`vote(proposalId, option)`。
- 特权提案投票：先在质押代币合约 `approve`，再 `stake` 满足阈值或使用 NFT，之后调用 `privilegedVote(proposalId, option)`。
- 查询投票占比：`getVoteDistribution(proposalId)` 返回票数及 `1e18` 缩放的比例，可换算为百分比。
- 管理员创建提案：在 `.env` 设置 `PROPOSAL_METADATA_HASH`、`PROPOSAL_PRIVILEGED_ONLY`，运行 `npm run create:proposal -- --network bsctestnet`。控制台会输出交易哈希与新提案 ID。
