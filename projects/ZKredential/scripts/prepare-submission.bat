@echo off
REM ZKredential - ETH Shanghai 2025 Hackathon 提交准备脚本 (Windows版本)
REM 使用方法: prepare-submission.bat <官方仓库URL> <您的GitHub用户名>

setlocal enabledelayedexpansion

REM 参数检查
if "%~2"=="" (
    echo 错误: 请提供官方仓库URL和您的GitHub用户名
    echo 使用方法: %0 ^<官方仓库URL^> ^<您的GitHub用户名^>
    echo 示例: %0 https://github.com/ETHShanghai/hackathon-2025.git your-username
    pause
    exit /b 1
)

set OFFICIAL_REPO=%1
set GITHUB_USERNAME=%2
set PROJECT_NAME=zkredential
set BRANCH_NAME=zkredential-submission

echo 🚀 开始准备ZKredential项目提交...

REM 步骤1: 检查当前目录
echo 📁 检查当前目录...
if not exist "package.json" (
    echo 错误: 请在ZKredential项目根目录运行此脚本
    pause
    exit /b 1
)

if not exist "packages" (
    echo 错误: 请在ZKredential项目根目录运行此脚本
    pause
    exit /b 1
)

REM 步骤2: 创建临时目录
set TEMP_DIR=..\hackathon-submission-temp
echo 📂 创建临时工作目录: %TEMP_DIR%
if exist "%TEMP_DIR%" rmdir /s /q "%TEMP_DIR%"
mkdir "%TEMP_DIR%"
cd "%TEMP_DIR%"

REM 步骤3: 克隆您Fork的仓库
echo 📥 克隆您Fork的仓库...
for %%f in (%OFFICIAL_REPO%) do set REPO_NAME=%%~nf
set FORK_URL=https://github.com/%GITHUB_USERNAME%/%REPO_NAME%.git
echo Fork URL: !FORK_URL!
git clone "!FORK_URL!" hackathon-repo
cd hackathon-repo

REM 步骤4: 创建新分支
echo 🌿 创建提交分支: %BRANCH_NAME%
git checkout -b "%BRANCH_NAME%"

REM 步骤5: 创建项目目录
echo 📁 创建项目目录...
mkdir "projects\%PROJECT_NAME%"

REM 步骤6: 复制项目文件
echo 📋 复制项目文件...
set SOURCE_DIR=..\..\ZKredential

REM 复制主要文件
copy "%SOURCE_DIR%\README.md" "projects\%PROJECT_NAME%\"
copy "%SOURCE_DIR%\package.json" "projects\%PROJECT_NAME%\"
copy "%SOURCE_DIR%\pnpm-workspace.yaml" "projects\%PROJECT_NAME%\"

REM 复制文档
mkdir "projects\%PROJECT_NAME%\docs"
xcopy "%SOURCE_DIR%\docs\*" "projects\%PROJECT_NAME%\docs\" /E /I /Y

REM 复制源代码
mkdir "projects\%PROJECT_NAME%\packages"

REM 复制前端
echo   📱 复制前端代码...
xcopy "%SOURCE_DIR%\packages\frontend\*" "projects\%PROJECT_NAME%\packages\frontend\" /E /I /Y /EXCLUDE:exclude_list.txt

REM 复制智能合约
echo   📜 复制智能合约...
xcopy "%SOURCE_DIR%\packages\zk-contracts\*" "projects\%PROJECT_NAME%\packages\zk-contracts\" /E /I /Y /EXCLUDE:exclude_list.txt

REM 复制ZK证明服务器
echo   ⚙️ 复制ZK证明服务器...
xcopy "%SOURCE_DIR%\packages\zk-proof-server\*" "projects\%PROJECT_NAME%\packages\zk-proof-server\" /E /I /Y /EXCLUDE:exclude_list.txt

REM 复制脚本
if exist "%SOURCE_DIR%\scripts" (
    echo   🔧 复制脚本文件...
    xcopy "%SOURCE_DIR%\scripts\*" "projects\%PROJECT_NAME%\scripts\" /E /I /Y
)

REM 步骤7: 创建项目特定的README
echo 📝 创建提交README...
(
echo # ZKredential - ETH Shanghai 2025 Hackathon Submission
echo.
echo ## 🎯 项目信息
echo - **项目名称**: ZKredential
echo - **赛道**: Infrastructure / Privacy
echo - **团队**: ZKredential Team
echo - **提交日期**: %date%
echo.
echo ## 🔗 重要链接
echo - **技术白皮书**: [docs/ZKredential_Whitepaper_CN.md](docs/ZKredential_Whitepaper_CN.md^)
echo - **部署指南**: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md^)
echo - **集成指南**: [docs/INTEGRATION.md](docs/INTEGRATION.md^)
echo - **测试指南**: [docs/TESTING.md](docs/TESTING.md^)
echo.
echo ## 🌐 部署信息
echo - **网络**: Sepolia测试网
echo - **ZKRWARegistryMultiPlatform**: `0x2dF31b4814dff5c99084FD93580FE90011EE92b2`
echo - **ZKComplianceModule**: `0x4512387c0381c59D0097574bAAd7BF67A8Cc7B81`
echo.
echo ## 🚀 快速开始
echo ```bash
echo # 安装依赖
echo pnpm install
echo.
echo # 启动ZK证明服务器
echo cd packages/zk-proof-server ^&^& node server.js
echo.
echo # 启动前端应用
echo cd packages/frontend ^&^& pnpm dev
echo ```
echo.
echo ## 📞 联系方式
echo - **Email**: smartisanr3@gmail.com
) > "projects\%PROJECT_NAME%\HACKATHON_SUBMISSION.md"

REM 步骤8: 添加文件到Git
echo 📦 添加文件到Git...
git add .

REM 步骤9: 提交更改
echo 💾 提交更改...
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

REM 步骤10: 推送到GitHub
echo 🚀 推送到GitHub...
git push origin "%BRANCH_NAME%"

REM 步骤11: 提供后续指导
echo ✅ 项目文件准备完成！
echo.
echo 📋 接下来的步骤:
echo 1. 访问您的GitHub仓库: !FORK_URL!
echo 2. 点击 'Pull requests' 标签
echo 3. 点击 'New pull request'
echo 4. 选择分支: %BRANCH_NAME%
echo 5. 填写PR标题: [ETH Shanghai 2025] ZKredential - Privacy-First RWA Compliance Infrastructure
echo 6. 复制PR描述模板到PR中
echo.
echo 🎉 准备工作完成！请按照上述步骤创建Pull Request。
echo.
echo 💡 提示: 临时文件保留在 %TEMP_DIR% 中，您可以检查后手动删除。

pause

