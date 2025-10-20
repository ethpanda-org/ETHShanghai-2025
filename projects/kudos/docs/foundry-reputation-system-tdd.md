# 链上声誉系统合约 TDD 测试指南

本文档为《docs/foundry-reputation-system.md》的配套测试手册，指导团队以测试驱动开发（TDD）方式实现身份、徽章与声誉控制合约。目标是在编写合约逻辑前先明确验证目标，确保核心交易与徽章流程可审计、可回归。

## 1. 测试目标与原则
- **验证合规性**：所有合约遵循 EIP-4973 / EIP-5114 接口约束。
- **防回归**：核心流程（身份铸造、购买结算、徽章发放）始终保持预期行为。
- **可扩展**：新增徽章规则、脚本流程或前端集成时，旧用例无需大幅修改。
- **高可读性**：测试用例命名体现 Given/When/Then，并标注与业务需求对应的规则 ID 或交易场景。

> 建议在 PR 中先提交失败的测试（Red），再补充最小实现（Green），最终重构（Refactor）。

## 2. 测试环境准备
- **工具链**：Foundry（推荐 `forge >= 0.2.0`）、`solc` 与 `anvil`。
- **目录结构**（建议）：
  ```
  packages/
    contracts/
      src/
        IdentityToken.sol
        ReputationBadge.sol
        BadgeRuleRegistry.sol
        Marketplace.sol
        ReputationDataFeed.sol
      test/
        identity/
          IdentityToken.t.sol
        badge/
          ReputationBadge.t.sol
        rules/
          BadgeRuleRegistry.t.sol
        marketplace/
          Marketplace_Purchase.t.sol
      script/
      lib/
    shared/
  apps/
    web/
    api/
  tooling/
  ```
- **配置文件**：在 `foundry.toml` 中开启 `ffi = true`（如需外部脚本）、`gas_reports = ["Marketplace", "IdentityToken"]` 帮助监测成本。
- **测试账户**：统一使用 `setUp()` 中的地址别名：`buyer`, `creator`, `operator` 等，便于阅读（如需新增权限可再扩展）。

## 3. TDD 工作流
1. **需求转测试**：从业务文档提炼单一职责（例如“首购用户自动获得身份 NFT”），写出 Given/When/Then。
2. **约束声明**：明确预期事件、状态字段和值变化；必要时写成自定义断言函数。
3. **编写测试骨架**：生成失败的测试函数，使用 `vm.expectRevert`、`vm.expectEmit` 定义行为。
4. **最小实现**：在合约中实现通过测试所需的最小逻辑，保持原子提交。
5. **重构与覆盖**：验证 `forge test` 通过后，回顾重复代码或边界条件，补充 fuzz / invariant 测试。

## 4. 单元测试矩阵

| 合约 | 核心场景 | 断言重点 | 推荐测试文件 |
| --- | --- | --- | --- |
| `IdentityToken` | `mintSelf` 自铸、`attest` 代铸、重复铸造禁止、不可转移 | `balanceOf`、`tokenIdOf`、事件 `IdentityMinted`、`transferFrom` 失败 | `test/identity/IdentityToken.t.sol` |
| `ReputationBadge` | `issueBadge`、批量发放、重复领取拒绝、`badgeURI` 与规则映射 | `hasBadge` 状态、`BadgeMinted` 事件、权限控制 | `test/badge/ReputationBadge.t.sol` |
| `BadgeRuleRegistry` | 创建/更新/禁用规则、分页查询 | `getRule` 返回值、`ruleCount`、启用标记（`updateRule` 仅改 `metadataURI`） | `test/rules/BadgeRuleRegistry.t.sol` |
| `ReputationController` | `_ensureIdentity` 自动铸造、`_awardBadge` 发放徽章、防止重复颁发 | 身份存在校验、`badgeClaimed` 标记 | `test/controller/ReputationController.t.sol` |
| `Marketplace` | `listWork` 验签与上架、`purchase` 结算、身份自动铸造、欢迎空投、规则触发、事件顺序 | `PurchaseCompleted`、USDT 余额变化、空投一次性执行、数据写入 `ReputationDataFeed`、重复购买拒绝 | `test/marketplace/Marketplace_Purchase.t.sol` |
| `ReputationDataFeed` | 同步买家/创作者数据、唯一写入方限制 | 仅允许 `Marketplace` 写入、查询保持一致 | `test/integration/Marketplace_IssueBadges.t.sol`（或独立单元测试） |

> 若 `Marketplace` 依赖外部 USDT，请在测试中使用 `ERC20Mock` 并注入初始余额。

## 5. 行为驱动用例（示例）

### 5.1 被动徽章触发（规则 1 & 2）
```solidity
function test_BuyerCompletesFirstPurchase_MintsIdentityAndBadge() public {
    givenListedWorkAndPrefundedBuyer();
    vm.expectEmit(true, true, true, true);
    emit PurchaseCompleted(buyer, workId, price);

    vm.expectEmit(true, true, false, true);
    emit BadgeIssued(buyer, RULE_BUYER_ONE_PURCHASE, /*badgeId*/ 1);

    vm.prank(buyer);
    marketplace.purchase(workId);

    assertEq(identityToken.hasIdentity(buyer), true, "should mint identity");
    assertTrue(reputationBadge.hasBadge(buyer, RULE_BUYER_ONE_PURCHASE), "first badge");
    assertEq(reputationBadge.hasBadge(buyer, RULE_BUYER_THREE_PURCHASES), false, "no extra badge yet");
}
```
- **Given**：作品已上架、买家余额充足。
- **When**：买家首次购买。
- **Then**：自动铸造身份 NFT、发放规则 1 徽章、规则 2 未触发。

### 5.2 主动徽章颁发（规则 6）
- 模拟运营脚本分页调用 `issueMonthlyBadges(ruleId, start, batch)`。
- 断言：仅符合阈值的创作者获得 `BadgeIssued`；遍历完成后 `start` 索引推进。

### 5.3 防御性场景
- 重复购买拒绝：`vm.expectRevert(Marketplace.AlreadyPurchased.selector)`。
- 未授予角色的账户调用 `setBadgeContract` 失败。
- `deploy` 后变更 `BadgeRuleRegistry` 地址需触发 `RoleGranted` 事件。

## 6. 集成与端到端测试
- **交易到徽章链路**：通过 `marketplace.purchase` → `_evaluatePassiveRules` → `reputationBadge.issueBadge` 的完整链路，验证事件顺序与数据写入。
- **数据同步**：调用 `ReputationDataFeed.syncBuyerStat` 后，从 `getBuyerStat` 读取并与 `Marketplace` 内部状态一致。
- **CI 场景**：在 GitHub Actions / GitLab CI 中运行 `forge test --ffi`（如有脚本）与 `forge coverage`，覆盖率下降触发失败。

> 可使用 Foundry 的 `fork` 模式模拟主网上的 USDT、Role 管理等交互，测试真实合约部署场景。

## 7. Fuzz、Invariant 与属性测试
- **Fuzz**：对 `purchase` 输入多种 `workId`、价格、买家地址，验证总销量与阈值触发逻辑保持一致。
- **Invariant**：借助 `StdInvariant` 确保 `badgeClaimed[account][ruleId]` 与 `hasBadge` 恒等、`creatorRegistry` 不重复。
- **时间相关属性**：使用 `vm.warp` 模拟月度窗口，验证主动徽章仅在限定时间内发放。

## 8. 测试数据与 Fixture 策略
- 在 `BaseReputationTest` 基类中构建通用 Fixture：部署合约、创建默认规则、预铸 USDT、上架样品作品。
- 使用 `struct Scenario` 存储测试初始状态，便于在多个测试间复用。
- 常用断言封装为辅助函数（如 `assertBadgeIssued(address account, uint256 ruleId)`），减少重复。

## 9. 命令速查
```bash
# 初始化/同步依赖
make deps

# 快速执行当前阶段的基础测试
make test-unit

# 仅运行 Marketplace 测试
make test-marketplace

# 全量测试与 gas 报告
forge test --gas-report

# 检查覆盖率并输出 lcov
forge coverage --report lcov

# 在本地 anvil 上跑端到端冒烟
make anvil-smoke
```

## 10. 持续交付建议
- 推送前必须通过 `forge test`；若引入侵入式修改需附带新的测试。
- 对关键合约的公共函数新增或修改时，更新上方矩阵并在 PR 描述中链接对应测试。
- 与运营脚本联动的变更，应同时提供脚本级别的集成测试描述或演示命令。

---

按照以上 TDD 流程与测试矩阵实施开发，可确保链上声誉系统的每个功能迭代都以测试覆盖为前提，实现可审计、可扩展的合约交付。
