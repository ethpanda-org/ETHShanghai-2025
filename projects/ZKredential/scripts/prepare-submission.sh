#!/bin/bash

# ZKredential - ETH Shanghai 2025 Hackathon 提交准备脚本
# 使用方法: ./scripts/prepare-submission.sh <官方仓库URL> <您的GitHub用户名>

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 参数检查
if [ $# -ne 2 ]; then
    echo -e "${RED}错误: 请提供官方仓库URL和您的GitHub用户名${NC}"
    echo "使用方法: $0 <官方仓库URL> <您的GitHub用户名>"
    echo "示例: $0 https://github.com/ETHShanghai/hackathon-2025.git your-username"
    exit 1
fi

OFFICIAL_REPO=$1
GITHUB_USERNAME=$2
PROJECT_NAME="zkredential"
BRANCH_NAME="zkredential-submission"

echo -e "${BLUE}🚀 开始准备ZKredential项目提交...${NC}"

# 步骤1: 检查当前目录
echo -e "${YELLOW}📁 检查当前目录...${NC}"
if [ ! -f "package.json" ] || [ ! -d "packages" ]; then
    echo -e "${RED}错误: 请在ZKredential项目根目录运行此脚本${NC}"
    exit 1
fi

# 步骤2: 创建临时目录
TEMP_DIR="../hackathon-submission-temp"
echo -e "${YELLOW}📂 创建临时工作目录: $TEMP_DIR${NC}"
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"
cd "$TEMP_DIR"

# 步骤3: 克隆您Fork的仓库
echo -e "${YELLOW}📥 克隆您Fork的仓库...${NC}"
FORK_URL="https://github.com/$GITHUB_USERNAME/$(basename $OFFICIAL_REPO .git).git"
echo "Fork URL: $FORK_URL"
git clone "$FORK_URL" hackathon-repo
cd hackathon-repo

# 步骤4: 创建新分支
echo -e "${YELLOW}🌿 创建提交分支: $BRANCH_NAME${NC}"
git checkout -b "$BRANCH_NAME"

# 步骤5: 创建项目目录
echo -e "${YELLOW}📁 创建项目目录...${NC}"
mkdir -p "projects/$PROJECT_NAME"

# 步骤6: 复制项目文件
echo -e "${YELLOW}📋 复制项目文件...${NC}"
SOURCE_DIR="../../ZKredential"

# 复制主要文件
cp "$SOURCE_DIR/README.md" "projects/$PROJECT_NAME/"
cp "$SOURCE_DIR/package.json" "projects/$PROJECT_NAME/"
cp "$SOURCE_DIR/pnpm-workspace.yaml" "projects/$PROJECT_NAME/"

# 复制文档
mkdir -p "projects/$PROJECT_NAME/docs"
cp -r "$SOURCE_DIR/docs/"* "projects/$PROJECT_NAME/docs/"

# 复制源代码（排除node_modules和构建文件）
mkdir -p "projects/$PROJECT_NAME/packages"

# 复制前端
echo -e "${BLUE}  📱 复制前端代码...${NC}"
rsync -av --exclude='node_modules' --exclude='.next' --exclude='dist' \
    "$SOURCE_DIR/packages/frontend/" "projects/$PROJECT_NAME/packages/frontend/"

# 复制智能合约
echo -e "${BLUE}  📜 复制智能合约...${NC}"
rsync -av --exclude='node_modules' --exclude='artifacts' --exclude='cache' \
    "$SOURCE_DIR/packages/zk-contracts/" "projects/$PROJECT_NAME/packages/zk-contracts/"

# 复制ZK证明服务器
echo -e "${BLUE}  ⚙️ 复制ZK证明服务器...${NC}"
rsync -av --exclude='node_modules' \
    "$SOURCE_DIR/packages/zk-proof-server/" "projects/$PROJECT_NAME/packages/zk-proof-server/"

# 复制脚本
if [ -d "$SOURCE_DIR/scripts" ]; then
    echo -e "${BLUE}  🔧 复制脚本文件...${NC}"
    cp -r "$SOURCE_DIR/scripts" "projects/$PROJECT_NAME/"
fi

# 步骤7: 创建项目特定的README
echo -e "${YELLOW}📝 创建提交README...${NC}"
cat > "projects/$PROJECT_NAME/HACKATHON_SUBMISSION.md" << EOF
# ZKredential - ETH Shanghai 2025 Hackathon Submission

## 🎯 项目信息
- **项目名称**: ZKredential
- **赛道**: Infrastructure / Privacy
- **团队**: ZKredential Team
- **提交日期**: $(date +"%Y-%m-%d")

## 🔗 重要链接
- **技术白皮书**: [docs/ZKredential_Whitepaper_CN.md](docs/ZKredential_Whitepaper_CN.md)
- **部署指南**: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- **集成指南**: [docs/INTEGRATION.md](docs/INTEGRATION.md)
- **测试指南**: [docs/TESTING.md](docs/TESTING.md)

## 🌐 部署信息
- **网络**: Sepolia测试网
- **ZKRWARegistryMultiPlatform**: \`0x2dF31b4814dff5c99084FD93580FE90011EE92b2\`
- **ZKComplianceModule**: \`0x4512387c0381c59D0097574bAAd7BF67A8Cc7B81\`

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
EOF

# 步骤8: 添加文件到Git
echo -e "${YELLOW}📦 添加文件到Git...${NC}"
git add .

# 步骤9: 提交更改
echo -e "${YELLOW}💾 提交更改...${NC}"
git commit -m "feat: Add ZKredential - Privacy-First RWA Compliance Infrastructure

🎯 Project Overview:
ZKredential is a zero-knowledge privacy compliance infrastructure for RWA (Real World Assets) 
that provides privacy-preserving compliance solutions through innovative composite ZK circuits.

🔧 Core Technologies:
- Composite ZK Circuits: Multi-dimensional verification (KYC + Asset + AML)
- Multi-Platform Architecture: Unified identity management for PropertyFy, RealT, RealestateIO
- ERC-3643 Integration: Plug-and-play compliance module
- Privacy-First Design: Sensitive data never goes on-chain

🌐 Deployment:
- Network: Sepolia Testnet
- ZKRWARegistryMultiPlatform: 0x2dF31b4814dff5c99084FD93580FE90011EE92b2
- ZKComplianceModule: 0x4512387c0381c59D0097574bAAd7BF67A8Cc7B81

📋 Submission Contents:
✅ Complete source code
✅ Technical whitepaper
✅ Deployment and integration docs
✅ Testnet contract deployment
✅ Demo application

👥 Team: ZKredential Team
📧 Contact: smartisanr3@gmail.com"

# 步骤10: 推送到GitHub
echo -e "${YELLOW}🚀 推送到GitHub...${NC}"
git push origin "$BRANCH_NAME"

# 步骤11: 提供后续指导
echo -e "${GREEN}✅ 项目文件准备完成！${NC}"
echo ""
echo -e "${BLUE}📋 接下来的步骤:${NC}"
echo "1. 访问您的GitHub仓库: $FORK_URL"
echo "2. 点击 'Pull requests' 标签"
echo "3. 点击 'New pull request'"
echo "4. 选择分支: $BRANCH_NAME"
echo "5. 填写PR标题: [ETH Shanghai 2025] ZKredential - Privacy-First RWA Compliance Infrastructure"
echo "6. 复制以下描述到PR中:"
echo ""
echo -e "${YELLOW}=== PR描述模板 ===${NC}"
cat << 'EOF'
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

## 📋 提交内容
- [x] 完整源代码
- [x] 技术白皮书
- [x] 部署和集成文档
- [x] 测试网合约部署
- [x] Demo应用

## 👥 团队
ZKredential Team

## 📞 联系方式
smartisanr3@gmail.com
EOF

echo ""
echo -e "${GREEN}🎉 准备工作完成！请按照上述步骤创建Pull Request。${NC}"

# 清理
cd ../../
echo -e "${BLUE}🧹 清理临时文件...${NC}"
# rm -rf "$TEMP_DIR"  # 注释掉，让用户可以检查文件

echo -e "${YELLOW}💡 提示: 临时文件保留在 $TEMP_DIR 中，您可以检查后手动删除。${NC}"

