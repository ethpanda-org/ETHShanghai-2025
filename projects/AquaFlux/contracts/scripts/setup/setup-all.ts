import { execSync } from "child_process";
import { displayAddresses } from "./utils";

/**
 * 运行单个配置脚本
 */
function runScript(scriptName: string, network: string = "hardhat") {
    console.log(`\n${"=".repeat(70)}`);
    console.log(`🚀 Running: ${scriptName}`);
    console.log("=".repeat(70));

    try {
        execSync(
            `npx hardhat run scripts/setup/${scriptName} --network ${network}`,
            { stdio: "inherit" }
        );
    } catch (error) {
        console.error(`\n❌ Failed to run ${scriptName}`);
        process.exit(1);
    }
}

async function main() {
    console.log("🔧 AquaFlux Complete Setup Script");
    console.log("=".repeat(70));

    // 从命令行参数获取网络名称
    const network = process.env.HARDHAT_NETWORK || "hardhat";
    console.log(`📡 Setting up on network: ${network}\n`);

    // 显示将要使用的合约地址
    displayAddresses();

    console.log("\n⚠️  Please ensure all contracts are deployed before running setup!");
    console.log("   If not, run: npx hardhat run scripts/deploy/deploy-all.ts --network " + network);

    // 等待用户确认
    console.log("\n⏳ Starting setup in 3 seconds... (Press Ctrl+C to cancel)");
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 按顺序执行所有配置脚本
    const scripts = [
        "1-tokenFactorySetImplementation.ts",
        "2-tokenFactoryGrantRoleDeployerRole.ts",
        "3-aquaFluxCoreSetGlobalFeeRate.ts",
    ];

    for (const script of scripts) {
        runScript(script, network);
    }

    console.log("\n" + "=".repeat(70));
    console.log("🎉 All setup completed successfully!");
    console.log("=".repeat(70));
    console.log("\n✅ AquaFlux protocol is now fully configured and ready to use!");
    console.log("\nNext steps:");
    console.log("  1. Verify contract settings on block explorer");
    console.log("  2. Test basic operations (wrap, split, merge, unwrap)");
    console.log("  3. Try the demo scripts in scripts/demo/ (if available)");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
