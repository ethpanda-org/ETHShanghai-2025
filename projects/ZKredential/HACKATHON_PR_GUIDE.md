# 🚀 ETH Shanghai 2025 Hackathon PR提交指南

## 📋 快速操作步骤

### 第一步：Fork官方仓库
1. 访问 [ETH Shanghai 2025 Hackathon](https://spiritual-muskox-049.notion.site/ETHShanghai-2025-Hackathon-2733411d11e28015bb0bddfe362f57c8) 找到官方GitHub仓库链接
2. 点击仓库页面右上角的 **"Fork"** 按钮
3. 选择Fork到您的个人GitHub账户

### 第二步：准备本地环境
```bash
# 克隆您Fork的仓库
git clone https://github.com/YOUR_USERNAME/OFFICIAL_REPO_NAME.git
cd OFFICIAL_REPO_NAME

# 创建新分支
git checkout -b zkredential-submission
```

### 第三步：添加项目文件
在仓库中创建项目目录：
```bash
mkdir projects/zkredential
```

将以下ZKredential项目文件复制到 `projects/zkredential/` 目录：

#### 📁 必需文件清单
```
projects/zkredential/
├── README.md                           # ✅ 项目主文档
├── HACKATHON_SUBMISSION.md             # ✅ 黑客松提交说明
├── package.json                        # ✅ 项目配置
├── pnpm-workspace.yaml                 # ✅ Monorepo配置
├── docs/
│   ├── ZKredential_Whitepaper_CN.md   # ✅ 技术白皮书
│   ├── DEPLOYMENT.md                   # ✅ 部署指南
│   ├── INTEGRATION.md                  # ✅ 集成指南
│   └── TESTING.md                      # ✅ 测试指南
└── packages/
    ├── frontend/                       # ✅ 前端应用（排除node_modules）
    ├── zk-contracts/                   # ✅ 智能合约（排除artifacts, cache）
    └── zk-proof-server/                # ✅ ZK证明服务器（排除node_modules）
```

### 第四步：创建黑客松提交说明
创建 `projects/zkredential/HACKATHON_SUBMISSION.md`：

```markdown
# ZKredential - ETH Shanghai 2025 Hackathon Submission

## 🎯 项目信息
- **项目名称**: ZKredential
- **赛道**: Infrastructure / Privacy
- **团队**: ZKredential Team
- **提交日期**: 2025年10月

## 🔗 重要链接
- **技术白皮书**: [docs/ZKredential_Whitepaper_CN.md](docs/ZKredential_Whitepaper_CN.md)
- **部署指南**: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- **集成指南**: [docs/INTEGRATION.md](docs/INTEGRATION.md)
- **测试指南**: [docs/TESTING.md](docs/TESTING.md)

## 🌐 部署信息
- **网络**: Sepolia测试网
- **ZKRWARegistryMultiPlatform**: `0x2dF31b4814dff5c99084FD93580FE90011EE92b2`
- **ZKComplianceModule**: `0x4512387c0381c59D0097574bAAd7BF67A8Cc7B81`
- **验证链接**: [Sepolia Etherscan](https://sepolia.etherscan.io/address/0x2dF31b4814dff5c99084FD93580FE90011EE92b2)

## 🚀 快速开始
\`\`\`bash
# 安装依赖
pnpm install

# 启动ZK证明服务器
cd packages/zk-proof-server && node server.js

# 启动前端应用
cd packages/frontend && pnpm dev
\`\`\`

## 📞 联系方式
- **Email**: smartisanr3@gmail.com
```

### 第五步：提交到GitHub
```bash
# 添加所有文件
git add .

# 提交更改
git commit -m "feat: Add ZKredential - Privacy-First RWA Compliance Infrastructure

🎯 Project Overview:
ZKredential is a zero-knowledge privacy compliance infrastructure for RWA that provides 
privacy-preserving compliance solutions through innovative composite ZK circuits.

🔧 Core Technologies:
- Composite ZK Circuits: Multi-dimensional verification (KYC + Asset + AML)
- Multi-Platform Architecture: Unified identity management
- ERC-3643 Integration: Plug-and-play compliance module
- Privacy-First Design: Sensitive data never goes on-chain

🌐 Deployment: Sepolia Testnet with verified contracts
📋 Complete submission with source code, whitepaper, and documentation"

# 推送到GitHub
git push origin zkredential-submission
```

### 第六步：创建Pull Request
1. 访问您Fork的GitHub仓库
2. 点击 **"Pull requests"** 标签
3. 点击 **"New pull request"**
4. 选择分支：`zkredential-submission`
5. 填写PR信息：

#### 📝 PR标题
```
[ETH Shanghai 2025] ZKredential - Privacy-First RWA Compliance Infrastructure
```

#### 📄 PR描述模板
```markdown
## 🎯 项目概述
ZKredential是面向RWA（现实世界资产）的零知识隐私合规基础设施，通过创新的复合ZK电路技术为RWA项目提供隐私保护的合规解决方案。

## 🔧 核心技术
- **复合ZK电路**: 支持KYC+资产+AML多维度验证
- **多平台架构**: 统一管理PropertyFy、RealT、RealestateIO等平台身份
- **ERC-3643集成**: 即插即用的合规模块，一行代码完成集成
- **隐私优先**: 用户敏感数据永不上链，满足GDPR等法规

## 🌐 部署信息
**网络**: Sepolia测试网  
**合约地址**: 
- ZKRWARegistryMultiPlatform: `0x2dF31b4814dff5c99084FD93580FE90011EE92b2`
- ZKComplianceModule: `0x4512387c0381c59D0097574bAAd7BF67A8Cc7B81`
- PropertyFyVerifier: `0xe0c16bDE095DD8C2794881b4a7261e2C0Fc9d2dc`
- RealTVerifier: `0x71dE2f8cD0b5483DAB7dc7064e82156DFd966257`
- RealestateVerifier: `0xaa276B0729fEAa83530e5CC1Cd387B634A6c45d6`

**验证链接**: [查看合约](https://sepolia.etherscan.io/address/0x2dF31b4814dff5c99084FD93580FE90011EE92b2)

## 📋 提交内容
- [x] 完整源代码（前端 + 智能合约 + ZK证明服务器）
- [x] 技术白皮书（中文版，详细阐述技术架构）
- [x] 部署和集成文档
- [x] 测试网合约部署（已验证）
- [x] Demo应用（可本地运行）
- [x] ZK电路实现（Circom 2.0）

## 🎥 Demo信息
- **前端地址**: http://localhost:3000
- **ZK服务器**: http://localhost:8080
- **主要功能**: 
  - 多平台ZK证明生成
  - 链上身份注册
  - RWA投资演示
  - 合规验证流程

## 🏆 技术亮点
1. **首创复合ZK电路**: 支持多维度合规条件组合验证
2. **多平台统一架构**: 一套系统支持多个RWA平台
3. **标准化集成**: 与ERC-3643标准完全兼容
4. **隐私保护**: 零知识证明确保用户数据隐私
5. **性能优化**: 保持传统白名单模式的Gas效率

## 👥 团队
- **Lewis** - Product Manager
- **Kieran** - Developer

## 📞 联系方式
- **Email**: smartisanr3@gmail.com
- **项目文档**: 详见 `docs/` 目录

## 🔍 评审要点
- 所有合约已部署到Sepolia测试网并完成验证
- 提供完整的本地运行指南
- 包含详细的技术白皮书和集成文档
- 开源项目，代码完全可复现
- 解决RWA行业真实痛点，具有实际应用价值
```

---

## 🔧 自动化脚本（可选）

如果您希望使用自动化脚本，可以运行：

### Windows用户
```cmd
cd ZKredential
scripts\prepare-submission.bat <官方仓库URL> <您的GitHub用户名>
```

### Linux/Mac用户
```bash
cd ZKredential
./scripts/prepare-submission.sh <官方仓库URL> <您的GitHub用户名>
```

---

## ⚠️ 重要提醒

1. **确保Fork最新版本**: 提交前确保Fork的是官方仓库的最新版本
2. **文件完整性**: 确保所有必需文件都已包含，特别是技术白皮书
3. **排除不必要文件**: 不要包含 `node_modules`、`artifacts`、`cache` 等构建文件
4. **测试验证**: 确保提供的合约地址和文档信息准确无误
5. **联系信息**: 确保联系方式正确，便于评审沟通

---

## 📞 需要帮助？

如果在提交过程中遇到任何问题，请：
1. 检查GitHub仓库的贡献指南
2. 确认官方仓库的提交要求
3. 联系项目团队：smartisanr3@gmail.com

**祝您提交顺利！🚀**

