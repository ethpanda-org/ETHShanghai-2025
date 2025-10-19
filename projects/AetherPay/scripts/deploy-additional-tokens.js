const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * 🚀 部署额外的Mock代币 (SOL, ADA, BNB, MATIC, AVAX)
 * 让预览代币变成真实可用的测试网代币
 */
async function main() {
    console.log("===========================================");
    console.log("🚀 部署额外的Mock代币");
    console.log("===========================================\n");

    const [deployer] = await ethers.getSigners();
    console.log("部署账户:", deployer.address);

    const balance = await deployer.getBalance();
    console.log("账户余额:", ethers.utils.formatEther(balance), "ETH\n");

    // 获取MockERC20工厂
    const MockERC20 = await ethers.getContractFactory("MockERC20");

    // 定义要部署的代币
    const tokensToDeeploy = [
        { name: "Mock Solana", symbol: "SOL", decimals: 9 },
        { name: "Mock Cardano", symbol: "ADA", decimals: 6 },
        { name: "Mock Binance Coin", symbol: "BNB", decimals: 18 },
        { name: "Mock Polygon", symbol: "MATIC", decimals: 18 },
        { name: "Mock Avalanche", symbol: "AVAX", decimals: 18 }
    ];

    const deployedTokens = {};

    // 部署每个代币
    for (let i = 0; i < tokensToDeeploy.length; i++) {
        const token = tokensToDeeploy[i];
        console.log(`${i + 1}️⃣ 部署 ${token.name} (${token.symbol})...`);

        try {
            const mockToken = await MockERC20.deploy(
                token.name,
                token.symbol,
                token.decimals
            );
            await mockToken.deployed();

            console.log(`   ✅ ${token.symbol} 部署成功: ${mockToken.address}`);

            // 使用faucet功能获取初始代币
            const tx = await mockToken.faucet(ethers.utils.parseUnits("10000", token.decimals));
            await tx.wait();
            console.log(`   💰 已获取 10,000 ${token.symbol}\n`);

            deployedTokens[token.symbol] = {
                address: mockToken.address,
                name: token.name,
                symbol: token.symbol,
                decimals: token.decimals
            };
        } catch (error) {
            console.error(`   ❌ 部署 ${token.symbol} 失败:`, error.message);
        }
    }

    // 保存部署地址到JSON文件
    const deployment = {
        network: "optimism-sepolia",
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        tokens: deployedTokens
    };

    const deploymentPath = path.join(__dirname, "../deployment-additional-tokens.json");
    fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
    console.log("✅ 部署信息已保存到:", deploymentPath, "\n");

    // 尝试添加到PaymentGateway
    console.log("===========================================");
    console.log("📝 添加代币到PaymentGateway...");
    console.log("===========================================\n");

    // 从deployment文件读取PaymentGateway地址
    let gatewayAddress;
    try {
        const deploymentFile = path.join(__dirname, "../deployment-gateway-v2-public-goods.json");
        const deploymentData = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
        gatewayAddress = deploymentData.PaymentGatewayV2;
    } catch (error) {
        console.log("⚠️ 无法读取PaymentGateway地址，使用默认地址");
        gatewayAddress = "0x26Fea37ec7D0Fe6858C9209044F715b549bAD343";
    }

    console.log("PaymentGateway地址:", gatewayAddress, "\n");

    try {
        const gateway = await ethers.getContractAt(
            ["function addSupportedToken(address)", "function supportedTokens(address) view returns (bool)", "function owner() view returns (address)"],
            gatewayAddress
        );

        // 检查是否是owner
        const owner = await gateway.owner();
        console.log("Gateway Owner:", owner);
        console.log("当前账户:", deployer.address);
        console.log("是否是Owner:", owner.toLowerCase() === deployer.address.toLowerCase(), "\n");

        if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
            console.log("⚠️ 警告: 当前账户不是PaymentGateway的Owner");
            console.log("   需要使用Owner账户运行此脚本才能添加代币\n");
        } else {
            // 添加每个代币到支持列表
            for (const [symbol, tokenInfo] of Object.entries(deployedTokens)) {
                console.log(`添加 ${symbol} 到支持列表...`);

                const tx = await gateway.addSupportedToken(tokenInfo.address);
                await tx.wait();

                // 验证是否添加成功
                const isSupported = await gateway.supportedTokens(tokenInfo.address);
                console.log(`   ${isSupported ? '✅' : '❌'} ${symbol} 添加${isSupported ? '成功' : '失败'}\n`);
            }
        }
    } catch (error) {
        console.log("⚠️ 添加到PaymentGateway失败:", error.message);
        console.log("   请手动使用Owner账户添加代币\n");
    }

    // 打印更新frontend配置的说明
    console.log("===========================================");
    console.log("✅ 部署完成！");
    console.log("===========================================\n");

    console.log("📝 请更新 frontend/lib/contracts.ts:\n");
    console.log("export const CONTRACTS = {");
    console.log("  // ... 现有合约地址 ...");
    for (const [symbol, tokenInfo] of Object.entries(deployedTokens)) {
        console.log(`  MOCK_${symbol}: '${tokenInfo.address}', // ${tokenInfo.name}`);
    }
    console.log("  // ...");
    console.log("};\n");

    console.log("📝 请更新 frontend/lib/tokens.ts:\n");
    console.log("将以下代币的 isTestnetDeployed 改为 true:\n");
    for (const [symbol, tokenInfo] of Object.entries(deployedTokens)) {
        console.log(`{`);
        console.log(`  address: CONTRACTS.MOCK_${symbol},`);
        console.log(`  symbol: '${symbol}',`);
        console.log(`  name: '${tokenInfo.name}',`);
        console.log(`  decimals: ${tokenInfo.decimals},`);
        console.log(`  type: 'crypto',`);
        console.log(`  isTestnetDeployed: true // 🆕 改为 true`);
        console.log(`},\n`);
    }

    console.log("💡 使用Faucet获取代币:");
    console.log("   任何人都可以在Etherscan上调用 faucet() 函数获取测试代币");
    console.log("   或调用 faucet(amount) 函数获取指定数量的代币\n");

    // 打印1inch API集成提示
    console.log("🔄 1inch API 集成:");
    console.log("   这些代币部署后，1inch API将自动为它们提供实时交易路径");
    console.log("   无需额外配置，系统会自动识别已部署的代币\n");

    console.log("🎉 完成! 现在可以在前端使用这些代币了");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
