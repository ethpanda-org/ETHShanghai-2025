# 链上声誉系统 TDD 分阶段任务清单

本清单遵循测试驱动开发（TDD）原则，将声誉系统拆分为四个阶段。每个阶段都以“先写测试/验证，再交付实现”为核心，并在最早可行阶段完成测试网部署，为前后端联调提供稳定目标。

## 阶段 1：测试基座与最小合约骨架
- **目标**：搭建 Foundry 测试环境与基础 Fixture，用失败测试明确身份与徽章的核心约束。
- **关键任务**：初始化 `foundry.toml`、`ForgeStd` 依赖与 `BaseReputationTest`；为 `IdentityToken`、`ReputationBadge`、`BadgeRuleRegistry` 编写首批 Red 测试（身份自铸、不可转移、徽章去重等）；实现最小合约骨架使测试转为 Green，并持续重构保持可读性；编写基础 `Makefile`（如 `make test-unit`、`make fmt`）封装常用命令。
- **验证方式**：`forge test --match-path test/identity --match-path test/badge` 通过，生成首份 gas report；评审测试命名与断言是否覆盖业务需求。
- **可交付物**：基础合约与测试文件、Fixture 文档、Makefile 基础目标、CI 中的 Foundry 测试步骤草案。

## 阶段 2：纵向切片与 Testnet 最小部署
- **目标**：实现并验证单次购买→徽章颁发的纵向链路，并将最小功能部署到测试网（建议 Sepolia）。
- **关键任务**：为 `Marketplace.purchase` 写出失败用例（含首购自动铸造、重复购买拒绝、欢迎空投、事件顺序）并补齐 `ReputationController` 相关断言；实现对应逻辑并补充自定义结算代币；完成 `forge script` 部署脚本用于在本地与测试网生成同构环境；将仅包含身份铸造与首枚徽章的版本部署至 Sepolia，记录地址与验证命令；在 `Makefile` 中增加 `make test-marketplace` 等目标简化测试与部署。
- **验证方式**：`make test-marketplace` 通过；部署脚本在本地 `anvil` 和 Sepolia 均成功执行，部署记录写入 README 或发布说明；前端/脚本可调用测试网合约完成最小交互。
- **可交付物**：纵向功能测试集、部署脚本与参数清单、测试网（或本地）部署演示、`Marketplace`/`ReputationDataFeed` ABI 与操作说明。

## 阶段 3：主动徽章与运营闭环
- **目标**：扩展主动徽章流程并确保批量发放、防重复等复杂逻辑可测可回归。
- **关键任务**：编写主动徽章触发（`issueMonthlyBadges`）的失败用例，包括分页遍历、权限校验、重复发放防护；实现运营脚本伪代码或 Foundry `script/` 模板；引入 fuzz / invariant 测试验证阈值与状态一致性；在测试网升级合约或重新部署，并保留先前接口供联调；扩展 `Makefile` 以支持 `make script-issue-badges` 等运营演示目标。
- **验证方式**：相关测试套件在 CI 中通过并附带覆盖率报告；脚本演示在测试网上完成一批徽章发放，输出日志与事件捕获。
- **可交付物**：主动徽章测试与实现、运营脚本说明、最新测试网部署记录及兼容性提示。

## 阶段 4：全面集成、监控与发布准备
- **目标**：巩固 CI/CD、覆盖率、监控与文档，使系统具备上线前的可验证性。
- **关键任务**：在 CI 中固定执行 `forge test --gas-report`、`forge coverage --report lcov` 并设阈值；补充端到端测试（前端/脚本调用测试网合约）与回滚策略；整理治理流程与运营权限说明、ABI 包与操作手册；预演正式部署流程并输出验收清单；让 CI 统一调用 `Makefile`（如 `make ci`、`make deploy-preview`）减少脚本重复；在本地通过 `make anvil-smoke` 或等效脚本回归核心交易链路。
- **验证方式**：CI 全绿且附带 gas/覆盖率报告；端到端脚本在测试网上重放核心业务；验收清单逐项对照完成。
- **可交付物**：CI 配置与报告、Makefile 目标说明、监控与回滚方案、完整文档包、发布前审查记录。

---

依照上述阶段推进，可在每个里程碑前以测试驱动的方式验证功能与假设，同时通过提前的测试网部署降低联调与上线风险。
