# 链上声誉系统开发说明（Foundry）

本文档描述基于 Foundry 开发的创作者社区链上声誉系统。系统以 EIP-4973 账户绑定 NFT 作为身份凭证，并结合 EIP-5114 Soulbound Token (SBT) 颁发不可转让的声誉徽章，满足公开透明、不可篡改的需求。

## 1. 设计目标
- 去信任化：所有身份、徽章与颁发规则在链上公开存证。
- 成本可控：仅真实交易写入链上，避免无意义的 gas 消耗。
- 扩展友好：便于新增徽章规则、调整触发逻辑与对接前端。
- 可审计：严格基于 EIP-4973/EIP-5114 标准，利于安全审计与生态整合。

## 2. 技术栈与依赖
- Foundry (`forge`, `cast`, `anvil`)：Solidity 开发、测试与脚本工具链。
- Solidity ^0.8. ⚙（建议 0.8.20+ 以获得最新安全特性）。
- OpenZeppelin Contracts (可选)：复用访问控制、枚举等工具。
- Chain ID：可先部署到测试网（如 Sepolia），主网部署需通过多签或 timelock。

### 标准引用
- **EIP-4973**：账户绑定 NFT，提供 `balanceOf(address)`、`tokenURI(uint256)` 等接口，禁止转移。
- **EIP-5114**：Soulbound Token 标准，用于定义不可转让的徽章以及 `Badge` 结构。

## 3. 系统角色
- **用户 (Buyer)**：在平台上购买作品，可按交易次数获得徽章。
- **创作者 (Creator)**：发布作品并完成交易，可获得销量相关徽章。
- **协议合约**：负责身份 NFT/SBT 铸造、徽章规则存储与状态变更。
- **运营者 (Operator)**：由合约部署者承担，对应合约中的 `owner` 地址，可通过脚本定期统计交易并主动调用合约颁发徽章。

## 4. 合约模块划分
| 合约 | 职责说明 |
| --- | --- |
| `IdentityToken` (EIP-4973) | 为每个地址铸造唯一身份 NFT，标识社区成员。 |
| `ReputationBadge` (EIP-5114) | 维护徽章元数据、颁发记录，禁止转移/销毁。 |
| `BadgeRuleRegistry` | 链上存储徽章规则（阈值、触发类型、权重等）。部署时写入，可后续扩展。 |
| `ReputationController` (abstract) | 提供 `_ensureIdentity`、`_awardBadge` 等内部工具函数，供继承合约封装身份铸造与徽章颁发流程。 |
| `Marketplace` | 作品上架、购买与结算的入口合约，是唯一暴露 `external` 接口的模块。内部维护累计统计、限制买家重复购买，并负责写入 `ReputationDataFeed` 及向新买家空投初始结算代币。 |
| `ReputationDataFeed` | 接收 `Marketplace` 写入的累计数据，为主动徽章或外部查询提供聚合接口。 |

> 说明：若交易功能由既有市场合约承担，可通过接口回调或事件监听调用 `ReputationController`。

## 5. 状态与存储模型
- `IdentityToken` 按地址记录 `tokenId`，确保一人一证。
- `BadgeRuleRegistry` 储存结构体：
  ```solidity
  struct BadgeRule {
      uint256 ruleId;
      TriggerType trigger; // Passive / Active
      BadgeTarget target;  // Buyer / Creator
      uint256 threshold;   // 次数或金额
      string metadataURI;  // 链下 JSON，含徽章描述、图像
      bool enabled;
  }
  ```
- `ReputationBadge` 存储 `badgeId => ruleId`、`account => badgeIds`。
- 使用位图或 `mapping(address => mapping(uint256 => bool))` 避免重复颁发。
- `Marketplace` 维护 `mapping(bytes32 => Work)`（作品基元）、`mapping(address => BuyerStat)`、`mapping(address => CreatorStat)`（买家/创作者累计数据）、`mapping(bytes32 => mapping(address => bool))`（买家是否已购买对应作品）、`uint256 buyerWelcomeAmount`（新用户空投额度）等状态，并作为唯一写入 `ReputationDataFeed` 的合约。同时维护 `address[] creatorRegistry`（可分页枚举），便于链上遍历。`Work` 采用懒发布（Lazy Listing）模式：创作者离线签名作品数据，链上验签登记。
- 事件：`IdentityMinted`, `BadgeRuleCreated`, `BadgeIssued(account, ruleId, badgeId)`。
- 规则一经创建仅允许更新 `metadataURI` 或启用状态，如需调整阈值或触发对象应通过新规则替代。

## 6. 徽章规则
| 规则 ID | 触发类型 | 对象 | 条件 | 描述 |
| --- | --- | --- | --- | --- |
| 1 | Passive | 用户 | 完成 1 次作品购买 | `Buyer One Purchase` |
| 2 | Passive | 用户 | 完成 3 次作品购买 | `Buyer Three Purchases` |
| 3 | Passive | 创作者 | 售出 1 份作品 | `Creator One Sale` |
| 4 | Passive | 创作者 | 售出 3 份作品 | `Creator Three Sales` |
| 5 | Passive | 创作者 | 成交额 ≥ 10 USDT | `Creator 10 USDT Volume` |
| 6 | Active | 创作者 | 月度运营脚本筛选 | `2025-11 Sora 板块成交量最高创作者` |

部署时将规则编码在 `BadgeRuleRegistry` 中，确保链上可审计。新增规则通过治理流程执行。

## 7. 流程设计
### 7.1 身份注册
1. 用户首次交互时可主动调用 `IdentityToken.mintSelf()`。
2. 若在 `Marketplace.purchase` 前尚未铸造身份 NFT，合约会自动代表买家调用 `IdentityToken.attest(buyer, metadataURI)`（或等价封装函数）完成铸造。
3. 身份 `tokenId` 一经生成即与地址绑定，无法转移。

### 7.2 被动徽章（交易触发）
1. 买家调用 `Marketplace.purchase(workId)`，合约首先校验该地址是否已购买过此 `workId`，若已购买则直接 `revert`。
2. 若买家尚无身份 NFT，流程开始会自动通过 `IdentityToken.attest` 铸造；首次消费且配置了 `buyerWelcomeAmount` 时，会先调用结算代币的 `mint` 接口为空投初始余额。
3. 合约随后执行 USDT `transferFrom` 完成结算，更新 `listing.sold` 及买家/创作者的累计次数与成交额，并同步给 `ReputationDataFeed`。
4. `_evaluatePassiveRules` 基于最新累计数据判断是否满足规则 ID 1-5，合格时铸造徽章并记录状态，同时触发 `BadgeIssued` 与 `PurchaseCompleted` 事件。

### 7.3 主动徽章（批处理触发）
**第一阶段（链上列表迭代）**
1. 每月脚本读取 `ReputationDataFeed` 或链上累计数据，确定本期徽章规则 ID。
2. 脚本分页调用 `Marketplace.issueMonthlyBadges(ruleId, startIndex, batchSize)`，合约在函数内部遍历 `creatorRegistry[startIndex:startIndex+batchSize)`，基于链上数据判断是否满足规则（如月度冠军）。
3. 函数执行过程中直接调用 `_issueBadges`，只对满足条件的创作者铸造徽章。调用返回已处理的末尾索引，脚本据此继续下一批直至遍历完成。

**第二阶段（链下计算 + Merkle 证明，推荐升级）**
1. 运营脚本离线统计并生成获奖名单，同时构建 Merkle Tree，上传根值。
2. 治理地址更新合约中的 `ruleMerkleRoot[ruleId][period]`。
3. 获奖创作者（或代理脚本）调用 `claimBadgeWithProof(ruleId, period, account, proof)`，合约验证 Merkle 证明后颁发徽章。

## 8. Foundry 项目结构建议
```
chaoc-contract/
├─ src/
│  ├─ IdentityToken.sol
│  ├─ ReputationBadge.sol
│  ├─ BadgeRuleRegistry.sol
│  ├─ ReputationController.sol
│  └─ Marketplace.sol
├─ script/
│  ├─ DeployReputation.s.sol
│  └─ IssueMonthlyBadge.s.sol
├─ test/
│  ├─ IdentityToken.t.sol
│  ├─ ReputationBadge.t.sol
│  ├─ ReputationController.t.sol
│  └─ Marketplace.t.sol
└─ docs/
   └─ foundry-reputation-system.md
```

## 9. 核心接口示例
```solidity
abstract contract ReputationController {
    function _ensureIdentity(address account, string memory metadataURI) internal;
    function _awardBadge(address account, BadgeRuleRegistry.BadgeRule memory rule) internal;
    function _setBadgeContract(ReputationBadge newBadge) internal;
    function _setBadgeRuleRegistry(BadgeRuleRegistry newRegistry) internal;
}

contract Marketplace is ReputationController, Ownable {
    function listWork(bytes32 workId, uint256 price) external;
    function deactivateWork(bytes32 workId) external;
    function purchase(bytes32 workId) external;
    function getEligibleRules(address account, BadgeTarget target) external view returns (uint256[] memory);
    function setBadgeContract(ReputationBadge newBadge) external onlyOwner;
    function setBadgeRuleRegistry(BadgeRuleRegistry newRegistry) external onlyOwner;
    function setDataFeed(ReputationDataFeed newFeed) external onlyOwner;
    function setIdentityMetadataURI(string calldata uri) external onlyOwner;
    function setBuyerWelcomeAmount(uint256 newAmount) external onlyOwner;
    function issueMonthlyBadges(uint256 ruleId, uint256 startIndex, uint256 batchSize) external onlyOwner;
    // 第二阶段推荐新增：
    // function claimBadgeWithProof(uint256 ruleId, uint256 period, address account, bytes32[] calldata proof) external;
}
```

- `listWork` 现阶段直接由创作者调用登记作品（后续可替换为 EIP-712 验签流程），记录 `creator`、`price`、`active`、累计销量等字段。
- `deactivateWork` 由创作者或运营者（合约 `owner`）调用，将 `Work.active` 置为 `false`，禁止后续购买；同时可选择从 `creatorRegistry` 中保留记录以便统计历史绩效。
- `purchase` 内部使用 `_hasPurchased[workId][buyer]` 限制同一买家对同一作品仅能成交一次。
- `purchase` 仅支持 USDT 结算，在入场时自动调用 `IdentityToken.attest` 为买家铸造身份 NFT（若尚未存在），随后更新 `BuyerStat`/`CreatorStat`、同步 `ReputationDataFeed`，并基于 `_evaluatePassiveRules` 铸造被动徽章。合约直接使用 `Work` 中登记的价格执行结算。
- `getEligibleRules` 对外提供只读查询，返回满足阈值且尚未领取的规则 ID。
- `issueMonthlyBadges` 采用链上分页遍历，消除对外部 `accounts[]` 名单的依赖；第二阶段可切换到 Merkle 证明接口。

## 10. 上链与费用策略
- 仅真实购买交易触发写入，覆盖 `mint` 和状态更新的 gas 消耗。
- 月度批处理应控制批次大小（可按 50~100 个地址分批），避免超出块 gas 限制。
- 可引入手续费或由平台赞助 gas。

## 11. 元数据管理
- `metadataURI` 指向存放于 IPFS/Arweave 的 JSON，包含徽章名称、描述、图片、发行日期等。
- 对于时间敏感的徽章（如月度最佳创作者），建议预生成模板并在脚本发放前更新 URI。

## 12. 安全与治理
- `Marketplace` 暂采用单一运营者（`owner`）控制关键入口：`attest`、`issueBadge`、`issueMonthlyBadges`、配置更新等均由部署者脚本发起。后续若需要细分权限，可再引入多角色模块。
- 防止重复颁发：使用 `badgeClaimed[account][ruleId]` 校验。
- 防女巫：可加白名单或二次身份验证流程后再铸造身份 NFT。
- 治理由多签钱包管理规则新增/禁用。

## 13. 测试计划（Foundry）
- 单元测试：
  - `IdentityToken`：确保不可转移、自铸约束。
  - `ReputationBadge`：重复铸造、事件、权限。
  - `ReputationController`：被动/主动触发路径，冲突与去重。
  - `Marketplace`：作品上架、购买结算、权限与累计统计、写入 `ReputationDataFeed`。
- 集成测试：
  - 模拟 `Marketplace` 处理购买并触发被动徽章发放。
  - 月度脚本模拟：分页调用 `Marketplace.issueMonthlyBadges` 完成链上遍历。
  - （第二阶段）Merkle 证明验证：为 `claimBadgeWithProof` 构造有效/无效证明。
- 运行命令：
  ```bash
  forge test
  forge test --match-path test/ReputationController.t.sol
  forge coverage
  ```

## 14. 部署流程
1. 使用 `forge script script/DeployReputation.s.sol --rpc-url <RPC> --broadcast` 部署 `IdentityToken`、`ReputationBadge`、`BadgeRuleRegistry` 与 `Marketplace`。
2. 部署脚本在 `Marketplace` 中设置规则仓库地址、徽章合约地址，授予 `DATA_WRITER` 角色，并创建初始徽章规则。
3. 前端集成 `IdentityToken` 与 `ReputationBadge` 查询接口。
4. 配置运营脚本的部署私钥（或多签）用于主动颁发。

## 15. 运营脚本要点
- 脚本读取链上事件或子图数据，统计交易次数/金额。
- 第一阶段：根据 `creatorRegistry` 大小，循环调用 `cast send <marketplace> "issueMonthlyBadges(uint256,uint256,uint256)" <ruleId> <start> <batch>`，直至遍历完成。
- 第二阶段：生成 Merkle 根并通过治理更新；随后脚本逐一调用 `claimBadgeWithProof` 或引导创作者自助领取。

## 16. 未来扩展
- 增加徽章分级或有效期机制。
- 引入链下信誉（如社交数据）通过预言机上链。
- 支持跨链身份：通过 LayerZero 等桥接身份状态。
- 对接子图（The Graph）以便前端实时展示徽章与规则。
- 升级主动徽章为 Merkle 证明领取模式，减少链上遍历成本并提升去信任化程度。

---

通过上述设计，Foundry 项目能够实现一个基于 EIP-4973 身份与 EIP-5114 徽章的链上声誉系统，确保创作者与用户的荣誉透明可信，并便于后续扩展与治理。
