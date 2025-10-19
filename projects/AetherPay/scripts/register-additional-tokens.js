const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * 🔐 注册新部署的代币到PaymentGateway
 * 需要使用Gateway Owner账户运行
 */
async function main() {
    console.log("===========================================");
    console.log("🔐 注册额外代币到PaymentGateway");
    console.log("===========================================\n");

    const [deployer] = await ethers.getSigners();
    console.log("当前账户:", deployer.address);

    const balance = await deployer.getBalance();
    console.log("账户余额:", ethers.utils.formatEther(balance), "ETH\n");

    // 读取PaymentGateway地址
    const PAYMENT_GATEWAY = "0x119122157f5988d65D2D8B1A8b327C2eD27E9417";
    console.log("PaymentGateway地址:", PAYMENT_GATEWAY, "\n");

    // 读取已部署的代币地址
    const deploymentPath = path.join(__dirname, "../deployment-additional-tokens.json");
    const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    const tokens = deploymentData.tokens;

    console.log("准备注册以下代币:");
    for (const [symbol, tokenInfo] of Object.entries(tokens)) {
        console.log(`  - ${symbol}: ${tokenInfo.address}`);
    }
    console.log("");

    // 获取PaymentGateway合约实例
    const gateway = await ethers.getContractAt(
        [
            "function addSupportedToken(address) external",
            "function supportedTokens(address) view returns (bool)",
            "function owner() view returns (address)"
        ],
        PAYMENT_GATEWAY
    );

    // 检查权限
    const owner = await gateway.owner();
    console.log("Gateway Owner:", owner);
    console.log("当前账户:", deployer.address);

    const isOwner = owner.toLowerCase() === deployer.address.toLowerCase();
    console.log("是否是Owner:", isOwner ? "✅ 是" : "❌ 否", "\n");

    if (!isOwner) {
        console.log("❌ 错误: 当前账户不是PaymentGateway的Owner");
        console.log("   请使用Owner账户运行此脚本");
        console.log("   Owner地址:", owner);
        process.exit(1);
    }

    // 注册每个代币
    let successCount = 0;
    let skipCount = 0;
    let failCount = 0;

    for (const [symbol, tokenInfo] of Object.entries(tokens)) {
        console.log(`📝 处理 ${symbol} (${tokenInfo.address})...`);

        try {
            // 检查是否已经注册
            const isSupported = await gateway.supportedTokens(tokenInfo.address);

            if (isSupported) {
                console.log(`   ⚠️ ${symbol} 已经注册，跳过\n`);
                skipCount++;
                continue;
            }

            // 注册代币
            const tx = await gateway.addSupportedToken(tokenInfo.address);
            console.log(`   ⏳ 交易已提交: ${tx.hash}`);

            await tx.wait();
            console.log(`   ✅ 交易已确认`);

            // 验证注册结果
            const isSupportedNow = await gateway.supportedTokens(tokenInfo.address);

            if (isSupportedNow) {
                console.log(`   ✅ ${symbol} 注册成功\n`);
                successCount++;
            } else {
                console.log(`   ❌ ${symbol} 注册失败（验证失败）\n`);
                failCount++;
            }

        } catch (error) {
            console.error(`   ❌ ${symbol} 注册失败:`, error.message);
            console.error(`   错误详情:`, error.reason || error.code || 'Unknown error');
            failCount++;
            console.log("");
        }
    }

    // 打印总结
    console.log("===========================================");
    console.log("✅ 注册完成");
    console.log("===========================================\n");
    console.log(`成功注册: ${successCount} 个代币`);
    console.log(`已存在跳过: ${skipCount} 个代币`);
    console.log(`注册失败: ${failCount} 个代币`);
    console.log("");

    // 验证所有代币的注册状态
    console.log("📊 最终验证结果:");
    for (const [symbol, tokenInfo] of Object.entries(tokens)) {
        const isSupported = await gateway.supportedTokens(tokenInfo.address);
        console.log(`  ${symbol}: ${isSupported ? '✅ 已注册' : '❌ 未注册'}`);
    }
    console.log("");

    if (failCount === 0 && (successCount + skipCount) === Object.keys(tokens).length) {
        console.log("🎉 所有代币已成功注册到PaymentGateway!");
        console.log("");
        console.log("📝 下一步:");
        console.log("   1. 在前端选择这些代币创建订单");
        console.log("   2. 1inch API将自动为它们提供实时交易路径");
        console.log("   3. 用户可以使用faucet()函数获取测试代币");
    } else {
        console.log("⚠️ 部分代币注册失败，请检查错误信息");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
