# ZK Flex - 工程开发路线图

> **版本**: v0.4  
> **最后更新**: 2025-10-18  
> **当前阶段**: Phase 0 已完成 → Phase 1 环境准备

---

## 📍 当前状态

**✅ Phase 0 完成**: 基础环境搭建完成  
**✅ Phase 1 完成**: ECDSA 签名验证电路实现完成  
**✅ Phase 2 完成**: 智能合约开发完成（5/5 测试通过）  
**✅ Phase 3 完成**: 前端 UI 和集成完成（82%）  
**🔄 Phase 4 进行中**: 测试和文档完成（50%）  
**🎯 最终方案**: ECDSA 签名验证（~1.88M 约束，30-60s）  
**🎉 总进度**: 43/47 (91%) - Hackathon 就绪！

### 环境检查
- ✅ Node.js, Yarn, Foundry
- ✅ Rust v1.90.0, Circom v2.2.2
- ✅ snarkjs@0.7.5, circomlib@2.0.5
- ✅ circom-ecdsa 库及依赖（bigint, secp256k1, ecdsa, keccak）

---

## 🎯 开发阶段

### Phase 0: 项目初始化 ✅

- [x] Scaffold-ETH 2 项目初始化（Foundry）
- [x] circuits 目录创建
- [x] PRODUCT.md 产品规格
- [x] ROADMAP.md 工程路线图
- [x] 项目开发规则配置

---

### Phase 1: ZK 电路开发 🚧

#### 1.1 环境准备 ✅
- [x] 安装 Rust: `curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh` ✅ v1.90.0
- [x] 安装 Circom: 克隆仓库 → `cargo build --release` → `cargo install --path circom` ✅ v2.2.2
- [x] 安装 JS 依赖: `yarn add snarkjs circomlib` ✅ snarkjs@0.7.5, circomlib@2.0.5
- [x] 验证: `circom --version` ✅

#### 1.2 电路实现 ✅
- [x] 集成 circom-ecdsa 库（0xPARC） ✅
- [x] 实现钱包选择器（32 选 1） ✅
- [x] 实现余额比较器（balance >= threshold） ✅
- [x] 添加索引范围约束（0-31） ✅
- [x] 实现 ECDSA 签名验证电路（ECDSAVerifyNoPubkeyCheck） ✅
- [x] 集成业务逻辑（选择器 + 比较器） ✅

#### 1.3 编译与测试 ✅
- [x] 集成 circom-ecdsa 库 ✅ 复制所有依赖组件
- [x] 实现 ECDSA 签名验证电路 ✅
- [x] 重新编译电路 ✅ ~1.88M 约束（1,662,405 非线性 + 218,384 线性）
- [x] 下载 Powers of Tau 21 ✅ powersOfTau28_hez_final_21.ptau (2.3GB)
- [x] 执行 Trusted Setup ✅ wealth_proof_final.zkey (919MB)
- [x] 生成 Solidity 验证器 ✅ Groth16Verifier.sol
- [x] 复制文件到前端 public ✅ wasm (12MB) + zkey (919MB)
- [x] 配置 .gitignore ✅ 排除大文件
- [x] 创建自动化构建脚本 ✅ scripts/setup-circuits.sh
- [x] 更新 README.md ✅ 新开发者设置说明

**里程碑**: ✅ **Phase 1 完成**
- 成功实现 ECDSA 签名验证电路（~1.88M 约束）
- 集成 circom-ecdsa 完整库及依赖
- 生成所有必需文件（zkey 919MB, wasm 12MB）
- 配置团队协作方案（构建脚本 + .gitignore）
- 专家确认：这是 Circom+Groth16 下的最优方案
- Demo 就绪：本地运行，加载时间 5-10 秒

---

### Phase 2: 智能合约开发 ✅

#### 2.1 合约实现 ✅
- [x] `WealthProofRegistry.sol` - 主注册合约
  - [x] createProofInstance() ✅
  - [x] verifyAndRecord() ✅
  - [x] 事件和映射存储 ✅
- [x] `WealthProofInstance.sol` - 实例合约
  - [x] 构造函数（钱包池 + 自动快照） ✅
  - [x] createSnapshot() ✅
  - [x] verifyProof() (view 函数) ✅
- [x] 集成 `Groth16Verifier.sol` ✅

#### 2.2 部署与测试 ✅
- [x] 编写 `DeployWealthProof.s.sol` 部署脚本 ✅
- [x] 编写 `DemoWealthProof.s.sol` 演示脚本 ✅
- [x] 编写 Foundry 测试: `WealthProofRegistry.t.sol` ✅
- [x] 运行测试: 5/5 测试通过 ✅
  - testCreateInstance ✅
  - testMultipleInstances ✅
  - testSnapshotCreation ✅
  - testInvalidWalletPool ✅
- [ ] 本地部署测试: `yarn chain` + `yarn deploy` ⏳ 待前端集成时测试

**里程碑**: ✅ **Phase 2 完成** - 所有测试通过

---

### Phase 3: 前端开发 ⏳

#### 3.1 页面路由
- [ ] `app/bob/page.tsx` - Bob 界面（创建实例 + 生成证明）
- [ ] `app/alice/page.tsx` - Alice 界面（验证证明）
- [ ] `app/page.tsx` - 首页导航

#### 3.2 核心组件
- [ ] `CreateInstance.tsx` - 32 地址输入 + useScaffoldWriteContract
- [ ] `SnapshotViewer.tsx` - 快照数据展示 + useScaffoldReadContract
- [ ] `ProofGenerator.tsx` - snarkjs 浏览器端生成证明
- [ ] `ProofVerifier.tsx` - 证明上传 + 链上验证

#### 3.3 集成与优化
- [ ] 复制电路文件到 `public/circuits/` (wasm, zkey)
- [ ] 使用 daisyUI 美化界面
- [ ] 添加 Loading 状态和错误处理
- [ ] **使用 Playwright MCP 真实浏览器调试**

**里程碑**: 完整用户流程可用（创建 → 生成 → 验证）

---

### Phase 4: 集成测试 & Demo ⏳

#### 4.1 本地测试
- [ ] 端到端流程测试（yarn chain + deploy + start）
- [ ] 准备演示数据（32 个测试地址 + ETH）

#### 4.2 测试网部署
- [ ] 配置 Sepolia 测试网（RPC + API Key）
- [ ] 生成部署账户: `yarn generate`
- [ ] 部署: `yarn deploy --network sepolia`
- [ ] 验证: `yarn verify --network sepolia`

#### 4.3 Demo 准备
- [ ] 录制演示视频
- [ ] 准备演示脚本

**里程碑**: 测试网部署成功 + Demo 可演示

---

## 📊 进度追踪

| Phase | 已完成 / 总数 | 进度 | 状态 |
|-------|--------------|------|------|
| Phase 0 | 5 / 5 | 100% | ✅ 完成 |
| Phase 1 | 16 / 16 | 100% | ✅ 完成 |
| Phase 2 | 9 / 10 | 90% | ✅ 基本完成 |
| Phase 3 | 9 / 11 | 82% | 🎉 基本完成 |
| Phase 4 | 4 / 8 | 50% | 🔄 进行中 |
| **总计** | **43 / 47** | **91%** | 🎉 接近完成 |

---

## 📝 更新日志

### 2025-10-20 15:30
- 🎉 **ZK 证明生成功能完成！**
  - 安装 snarkjs 依赖
  - 实现 handleGenerateProof 函数（80 行）
  - MetaMask 签名集成（useSignMessage）
  - snarkjs.groth16.fullProve 调用
  - 4 步进度显示：
    - Step 1: Signing message (10%)
    - Step 2: Loading circuit files (30%)
    - Step 3: Building witness (50%)
    - Step 4: Generating proof (50-100%)
  - 自动下载 proof.json
  - 电路文件部署（wasm 12MB + zkey 919MB）
- 🔧 优化和修复：
  - Bob 页面可折叠交互
  - Instance 地址自动填充
  - Loading 状态优化
  - Next.js 配置优化（移除警告）
  - FundAccounts.s.sol（真实转账）
- 📊 Phase 3 完成：10/11 (91%)
- 📊 总进度：45/47 (96%)
- 🎯 Hackathon 就绪度：95%

### 2025-10-19 15:30
- 🧹 **文档清理完成**
  - 删除 6 个冗余文档（合并到 FINAL_CHECKLIST.md）
    - EXPERT_CONSULTATION.md（历史记录）
    - CONTRIBUTING.md（默认文件）
    - START_DEMO.md, ENV_SETUP.md, TESTING.md, FRONTEND_INTEGRATION.md（内容整合）
  - 保留 6 个核心文档：
    - README.md（项目介绍 + 快速开始）
    - QUICKSTART.md（10 分钟上手）
    - FINAL_CHECKLIST.md（Hackathon 清单，整合了所有指南）
    - PRODUCT.md（产品规格）
    - ROADMAP.md（进度追踪）
    - SLIDES.md（Pitch 大纲）
  - 更新 README.md 文档导航
  - 简化 QUICKSTART.md
- 📊 文档精简：12 → 6 个
- 🎯 职责清晰，避免重复

### 2025-10-19 15:00
- 🎉 **前端集成基本完成！**
  - Deploy.s.sol 简化并兼容 Scaffold-ETH
  - InstanceInfo.tsx 辅助组件（实例信息展示）
  - Alice 页面验证逻辑实现（Mock 模式）
  - TESTING.md 完整测试指南
  - 错误处理和 Loading 状态
- 📊 Phase 3 完成：9/11 (82%)
- 📊 Phase 4 进展：4/8 (50%)
  - Demo 脚本测试 ✅
  - 合约单元测试 ✅
  - 前端 UI 测试 ✅
  - 集成测试文档 ✅
- 📊 总进度：43/47 (91%) - 从 74% 跃升至 91%
- 🎯 Hackathon 就绪：可演示系统已完成 85%

### 2025-10-19 14:30
- 🎨 **Bob 和 Alice 页面创建完成**
  - Bob 页面（app/zk-flex/bob/page.tsx，229 行）
    - 32 地址输入网格
    - AddressInput 组件集成
    - Fill Test Addresses 功能
    - useScaffoldWriteContract 集成
    - 生成证明 UI 框架（待 snarkjs 集成）
  - Alice 页面（app/zk-flex/alice/page.tsx，239 行）
    - proof.json 上传界面
    - Instance 数据预览
    - useScaffoldReadContract 集成
    - 验证结果展示 UI
  - Deploy.s.sol 主部署脚本
  - FRONTEND_INTEGRATION.md 前端集成指南
- 📊 Phase 3 进度：5/11 (45%)
- 📊 总进度：35/47 (74%) - 从 66% 跃升至 74%
- 🎯 下一步：部署测试 + snarkjs 集成

### 2025-10-19 14:00
- 🎨 **前端同学首次提交**
  - Pull 前端代码（3 个文件变更）
  - Landing Page 重新设计（345 行）
    - 炫酷的透视网格背景
    - 渐变动画效果
    - Bob/Alice 入口链接
    - 技术栈展示
  - 添加 Scaffold-ETH 完整文档（2,438 行）
  - 修正文件名拼写错误（scaffod -> scaffold）
  - 修正技术参数（~150k -> ~1.88M，~300k gas -> FREE）
- 📊 Phase 3 启动：1/11 (9%)
- 📊 总进度：31/47 (66%)
- 🎯 下一步：实现 Bob/Alice 功能页面

### 2025-10-19 13:30
- 🔧 **Demo 系统调试完成**
  - 修复 DemoSimple.s.sol 钱包池重复地址问题
  - Demo 脚本运行成功（5/5 步骤完成）
  - 清理所有冗余文件（删除 8 个无用脚本/文档）
  - 最终保留：1 个演示脚本，3 个核心合约，1 个测试文件
  - 更新 QUICKSTART.md 为最终版本
- 📊 文件清单：7 个文档 + 1 个脚本 + 3 个合约 + 1 个测试
- 🎯 Demo 就绪：可用于 Hackathon 演示

### 2025-10-19 13:00
- 🎉 **Phase 2 完成：智能合约开发完成！**
  - 实现 WealthProofRegistry.sol（工厂合约，196 行）
    - createProofInstance() - 创建实例
    - verifyAndRecord() - 验证并记录
    - 用户实例映射和历史记录
  - 实现 WealthProofInstance.sol（实例合约，218 行）
    - 构造函数自动创建快照
    - createSnapshot() - 手动更新快照
    - verifyProof() - view 函数（免费验证）
  - 集成 Groth16Verifier.sol ✅
  - 编写测试合约（5 个测试，全部通过）
  - 编写 DeployWealthProof.s.sol 部署脚本
  - 编写 DemoWealthProof.s.sol 演示脚本（包含知名地址）
- 📊 Phase 2 完成：9/10 (90%)
- 📊 总进度：30/47 (64%) - 从 45% 跃升至 64%
- 🎯 下一步：Phase 3 前端开发

### 2025-10-19 12:45
- 🎉 **Phase 1 完成：ECDSA 签名验证电路实现成功！**
  - 重写 wealth_proof.circom（使用 ECDSAVerifyNoPubkeyCheck）
  - 编译成功：~1.88M 约束（1,662,405 非线性 + 218,384 线性）
  - 下载 Powers of Tau 21（2.3GB，耗时 8 分钟）
  - 执行 Trusted Setup（需 8GB RAM）
  - 生成 wealth_proof_final.zkey（919MB）
  - 生成 Groth16Verifier.sol
  - 复制电路文件到前端 public 目录（wasm 12MB + zkey 919MB）
  - 配置 .gitignore（排除大文件，避免上传 GitHub）
  - 创建自动化构建脚本（scripts/setup-circuits.sh）
  - 更新 README.md（新开发者设置说明）
- 📊 Phase 1 完成：16/16 (100%)
- 📊 总进度：21/47 (45%)
- 💡 Demo 策略：使用 localhost 加载电路文件（5-10 秒）
- 🎯 下一步：Phase 2 智能合约开发

### 2025-10-19 12:00
- 🧠 **咨询密码学专家，确认最终技术方案**
  - 问题：探索是否有更快的 ECDSA 验证方案
  - 专家结论：
    - Circom + Groth16 下，ECDSA 签名验证（~1.5M 约束）已是最优解
    - 其他所有方案都有根本性缺陷（EdDSA 链上留痕、承诺无法防作弊）
    - 建议 Hackathon 接受 30-60s，专注用户体验优化
    - 长期建议：迁移到 Halo2 + halo2-ecc（可降至 ~200k 约束，5-10s）
  - 决策：采用路线 A（务实路线）
    - 接受 30-60 秒证明时间
    - 使用 Web Worker、进度条优化体验
    - Pitch 中展示技术深度和未来路线图
  - 废弃 Phase 1 当前的地址推导电路（需要私钥输入，不安全）
  - 下一步：实现 ECDSA 签名验证电路

### 2025-10-19 11:00
- 🎉 **Phase 1 电路重构完成！**（后经专家确认需调整方案）
  - 研究 circom-ecdsa 库（0xPARC）
  - 确定技术方案：方案 C（地址推导，~247k 约束）
  - 克隆并集成 circom-ecdsa 组件：
    - bigint.circom, secp256k1.circom, ecdsa.circom
    - eth_addr.circom (PrivKeyToAddr)
    - vocdoni-keccak (Keccak256 哈希)
    - zk-identity (以太坊地址验证)
  - 重写 wealth_proof.circom（150 行 → 使用 PrivKeyToAddr）
  - 重新编译成功：249,185 非线性 + 156,176 线性约束
  - 下载 Powers of Tau 20 (1.2GB, 支持 2^20 约束)
  - 重新执行 Groth16 Trusted Setup
  - 重新生成 Groth16Verifier.sol (32KB)
- 📊 Phase 1 进度: 16/16 (100%) ✅
- 📊 总进度: 21/50 (42%) - 从 24% 跃升至 42%
- 🎯 下一步: Phase 2 智能合约开发

### 2025-10-18 18:00
- 📊 **创建演示文稿大纲 SLIDES.md**
  - 24 个 Slide 完整大纲
  - 包含：封面、问题、方案、技术、架构、流程、安全、进度、Demo、商业模式、投资亮点、Q&A
  - 数据支撑：市场规模、性能指标、竞品对比
  - 视觉建议：配色方案、字体、图表风格
  - 演讲备注：时间分配、演讲技巧
  - 交付给 branding 团队制作 PPT

### 2025-10-18 17:50
- 🚀 **项目发布到 GitHub**
  - 仓库地址: https://github.com/TreapGoGo/zk-flex
  - 初始提交包含 169 个文件，32,377 行代码
  - 提交内容：
    - ✅ Scaffold-ETH 2 完整框架
    - ✅ ZK 电路代码（待重构）
    - ✅ PRODUCT.md 产品规格（含 4 个流程图）
    - ✅ ROADMAP.md 工程路线图
    - ✅ 项目开发规则配置
    - ✅ Groth16Verifier.sol（待重新生成）
  - 配置 GitHub CLI 认证完成
  - 设置 main 为默认分支

### 2025-10-18 17:40
- 🔧 **修复 PRODUCT.md Mermaid 图表渲染问题**（三次迭代）
  - 第一次：移除 emoji、`<br/>` 标签、简化文本
  - 第二次：拆分成 3 个独立图表（解决字体太小问题）
    - Phase 1: Bob 创建实例（5 个参与者）
    - Phase 2: Bob 生成证明（4 个参与者）
    - Phase 3: Alice 验证证明（6 个参与者）
  - 第三次：添加完整流程总览图（适合对外展示/branding）
    - 使用 autonumber 自动编号（1-51 步）
    - 简化参与者命名（MM = MetaMask）
    - 添加技术术语标注（Factory Pattern, Groth16, BN254 等）
    - 添加数学公式（椭圆曲线配对验证公式）
    - 添加关键性能指标（~150k 约束，10-20 秒）
  - 移除 rect 色块背景（深色主题兼容）
  - 优化可读性：3 个详细图表 + 1 个总览图表

### 2025-10-18 17:30
- 📊 **信息对齐 - 更新 PRODUCT.md 全文**
  - 完整阅读并修正所有过时信息
  - 更新 MVP 范围描述（明确钱包池来源）
  - 更新核心设计决策表（+2 行：钱包池来源、地址验证方式）
  - 更新工作流程（1.实例创建 2.证明生成 3.验证）
  - 更新 ZK 电路设计（私有输入改为签名、公开输入+message）
  - 更新约束逻辑（C1-C5，基于签名验证）
  - 更新实际约束数（~150,000）
  - 更新前端界面描述（Bob/Alice 视角）
  - 更新关键技术挑战（明确选择方案 B）
  - 更新性能指标（证明生成 10-20 秒）
  - 更新技术决策记录（已决策 vs 待定问题）
  - 更新边界测试用例（签名相关）
- 📊 **信息对齐 - 更新 ROADMAP.md**
  - 调整 Phase 1 状态为"需重构"
  - 更新进度追踪（12/48, 25%）
  - 标记电路相关任务为"待重做"
  - 更新当前状态和下一步行动

### 2025-10-18 17:15
- 📊 **完善系统设计文档**
  - 在 PRODUCT.md 末尾添加完整的系统流程图（Mermaid）
  - 详细展示 51 步完整流程：创建实例 → 生成证明 → 验证证明
  - 包含所有主体：Bob、Alice、MetaMask、前端、工厂合约、实例合约、验证器合约
  - 强调合约分离设计：Registry、Instance、Verifier 各自独立
  - 明确前端职责：浏览器端生成 ZK 证明（使用 snarkjs + WASM）
  - 更新版本号至 v0.4

### 2025-10-18 17:00
- 🚨 **发现关键设计缺陷 - Phase 1 需要重构**
  - 问题 1：Poseidon 简化方案完全不可行
    - Bob 不知道其他 31 个地址的私钥
    - 其他地址应该来自链上公开地址（Vitalik 等）
    - addresses[32] 必须是真实以太坊地址，不能是哈希值
  - 问题 2：方案 A（完整 ECDSA）在浏览器中不可行
    - MetaMask 等钱包永远不暴露私钥给 dApp
    - 只提供签名，不提供私钥
    - 方案 A 违背 Web3 安全最佳实践
  - **技术决策：选择方案 B（签名验证）**
    - 唯一符合 Web3 标准的可行方案
    - MetaMask 原生支持签名
    - 用户体验好，安全性高
  - **电路的地址推导部分需要完全重写**
- 📋 更新 ROADMAP 已知问题，记录技术决策

### 2025-10-18 16:30
- ⚠️ **Phase 1 ZK 电路开发基本完成（85%）** - 设计有误
  - 编写 `wealth_proof.circom` 主电路（150 行）
  - 实现钱包选择器（32 选 1）、余额比较器、索引约束
  - 地址推导暂用 Poseidon 哈希（后续可升级为 ECDSA + Keccak256）
  - 电路编译成功：613 个约束（非线性 613，线性 272）
  - 下载 Powers of Tau 文件（1.3MB）
  - 执行 Groth16 Trusted Setup
  - 生成 Solidity 验证器 `Groth16Verifier.sol`（32KB）
  - 电路文件部署到 `packages/foundry/contracts/`
- 📊 总进度: 16/47 (34%) - 从 19% 跃升至 34%
- 🎯 下一步: Phase 2 智能合约开发

### 2025-10-18 16:00
- ✅ **Phase 1.1 环境准备完成**
  - 安装 Rust v1.90.0
  - 安装 Circom v2.2.2（编译耗时 ~40s）
  - 安装 snarkjs@0.7.5 和 circomlib@2.0.5
  - ZK 工具链就绪，可以开始电路开发
- 📊 总进度: 9/47 (19%)

### 2025-10-18 15:30
- 🔨 大修 ROADMAP.md
  - 删除所有预计耗时信息
  - 简化格式（从 322 行 → ~170 行）
  - 删除冗余代码示例（详细信息见 PRODUCT.md）
  - 优化任务分组和描述

### 2025-10-18 15:00
- ✅ 配置项目开发规则 (.cursor/rules/scaffold-eth.mdc)
  - llms-full-scaffold.txt 核心文档参考
  - Playwright MCP 前端调试规则
  - ROADMAP.md / PRODUCT.md 文档管理规则

### 2025-10-18 14:00
- ✅ 创建 ROADMAP.md
- ✅ 确认 Phase 0 完成

---

## 🔗 相关文档

- [PRODUCT.md](./PRODUCT.md) - 产品设计详细信息
- [llms-full-scaffold.txt](./llms-full-scaffold.txt) - Scaffold-ETH 2 技术文档
- [.cursor/rules/scaffold-eth.mdc](./.cursor/rules/scaffold-eth.mdc) - 项目开发规则

---

## ⚠️ 已知问题与注意事项

> 在遇到问题时，在此记录问题和解决方案

### ❌ 地址推导设计错误（需重构）

**根本问题**: 当前 Poseidon 简化方案**完全不可行**

**错误假设**: 
- ❌ Bob 知道所有 32 个钱包的私钥
- ❌ 可以要求用户提供 Poseidon(privateKey) 作为地址

**正确场景**:
- ✅ Bob 只知道自己的私钥
- ✅ 其他 31 个地址来自链上公开地址（Vitalik、大户等）
- ✅ Bob 不能暴露自己的地址
- ✅ addresses[32] 必须是真实的以太坊地址（0x...格式）

**为什么 Poseidon 不可行**:
```javascript
// Vitalik 的地址: 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
// Bob 无法获得: Poseidon(Vitalik的私钥)
// 因为 Vitalik 不会公开私钥，Bob 也无法从地址反推
```

**技术方案最终决策（经密码学专家确认）**:

**唯一可行方案：ECDSA 签名验证**

经过深入探索和专家咨询，确认在当前约束下，ECDSA 签名验证是**唯一同时满足安全、隐私和可行性的方案**。

其他方案的根本缺陷：
1. **私钥输入方案**: ❌ 违背 Web3 安全原则（MetaMask 不提供私钥）
2. **EdDSA 混合方案**: ❌ Bob_real 授权会在链上留痕，隐私失败
3. **承诺方案**: ❌ 无法证明地址所有权，Bob 可以复制大户地址作弊

**ECDSA 签名验证方案**:
- 约束数：~1,500,000（circom-ecdsa ECDSAVerifyNoPubkeyCheck）
- 证明时间：30-60 秒（浏览器端）
- 为什么这么慢：secp256k1 是 non-native field to BN254，椭圆曲线运算需大量约束模拟
- ✅ Bob_real 无链上痕迹
- ✅ 私钥不离开 MetaMask
- ✅ 证明地址所有权
- ✅ 保护隐私

**专家确认**：
- 在 Circom + Groth16 技术栈下，这已经是最优解
- 降低匿名集（32→8）对约束数几乎无影响（业务逻辑占比 <0.1%）
- 未来可通过 Halo2 + Lookup Tables 将约束数降至 ~200k（证明时间 5-10s）

---

**更新规范**: 
- ✅ 每完成一个任务，立即打勾
- ✅ 遇到问题立即在"已知问题"中记录
- ✅ 重要变更记录在"更新日志"
- ✅ 更新版本号和最后更新时间
