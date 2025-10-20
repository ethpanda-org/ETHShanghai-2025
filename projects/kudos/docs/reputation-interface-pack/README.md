# 链上声誉系统 ABI 交付包

本目录提供《docs/foundry-reputation-system.md》中涉及的关键合约 ABI 及说明，方便前端、脚本和集成团队快速落地。若后续 Solidity 实现与此差异，请在编译产物生成后用实际 ABI 覆盖并同步更新本文档。

## 文件清单
- `IdentityToken.abi.json`：EIP-4973 身份合约入口。
- `ReputationBadge.abi.json`：EIP-5114 徽章合约。
- `BadgeRuleRegistry.abi.json`：徽章规则仓库。
- `Marketplace.abi.json`：作品交易与声誉逻辑主合约。
- `ReputationDataFeed.abi.json`：聚合数据喂价合约。

## 接口摘要

### IdentityToken
- `mintSelf(string metadataURI)`：用户自助铸造身份 NFT，返回 `tokenId`。
- `attest(address account, string metadataURI)`：市场或运营合约代为铸造；需具备授权角色。
- 查询接口：`hasIdentity`, `tokenIdOf`, `tokenURI`, `ownerOf`, `balanceOf`, `supportsInterface`。
- 事件：`IdentityMinted`, `IdentityRevoked`。

### ReputationBadge
- 发放徽章：`issueBadge(account, ruleId)`, `issueBatch(ruleId, accounts)`。
- 查询：`hasBadge`, `badgesOf(account)`（返回 `ruleIds` 与 `badgeIds`，便于前端展示），`badgeURI`, `ruleIdOf`, `totalSupply`, `balanceOf`, `supportsInterface`。
- 事件：`BadgeMinted`, `BadgeRevoked`。

### BadgeRuleRegistry
- 管理：`createRule(BadgeRuleInput)`, `updateRule(ruleId, metadataURI)`, `setRuleStatus(ruleId, enabled)`。
- 查询：`getRule`, `getRules(offset, limit)`, `ruleCount`, `ruleExists`。
- 事件：`BadgeRuleCreated`, `BadgeRuleUpdated`。

### Marketplace
- 交易流程：`listWork(workId, price)`, `deactivateWork(workId)`, `purchase(workId)`（首次购买会为空投 `buyerWelcomeAmount` 数量的结算代币，再执行转账，同一买家对同一作品仅能成功一次）。
- 徽章评估：`getEligibleRules(account, target)`, 后续阶段预留 `issueMonthlyBadges`。
- 数据读取：`getWork`, `getBuyerStat`, `getCreatorStat`, `creatorRegistryLength`, `creatorAt`。
- 配置：`setBadgeContract`, `setBadgeRuleRegistry`, `setDataFeed`, `setIdentityMetadataURI`, `setBuyerWelcomeAmount`。
- 权限：采用标准 `Ownable` 模式，部署者（operator）可进行上述配置并规划后续主动徽章发放。
- 事件：`WorkListed`, `WorkDeactivated`, `PurchaseCompleted`, `BadgeAwarded`。

### ReputationDataFeed
- 写入：`syncBuyerStat(account, BuyerStat)`, `syncCreatorStat(account, CreatorStat)`。
- 查询：`getBuyerStat`, `getCreatorStat`, `marketplace`。
- 管理：`setMarketplace` 设置唯一写入方。
- 事件：`MarketplaceUpdated`, `BuyerStatSynced`, `CreatorStatSynced`。

## 使用建议
- **ABI 导入**：复制对应 JSON 到前端或脚本项目，以 `ethers.js` / `viem` / `web3.py` 等工具生成类型定义。
- **运营权限**：部署者地址即为唯一 `operator`，请妥善保管私钥或通过脚本托管执行敏感调用。
- **规则变更**：`updateRule` 仅允许修改 `metadataURI`；若需调整阈值或触发条件，请创建新规则并通过 `setRuleStatus` 禁用旧规则。
- **签名与安全**：当前 `listWork` 为直接调用版本，后续切换到 EIP-712 验签时请同步更新前端与脚本。
- **对齐实现**：当 Solidity 实现确定后，应以编译得到的 ABI 取代占位版本，防止参数或返回值不匹配。
- **欢迎空投**：默认脚本部署会创建具备 `mint` 能力的测试稳定币，运营可通过 `setBuyerWelcomeAmount` 调整首次购买空投额度。

如需扩展（例如 Merkle 领取、更多统计字段），请在更新合约同时扩充相应 ABI 条目，并在文档中补充描述。*** End Patch
